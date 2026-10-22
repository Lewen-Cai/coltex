import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import { decryptArchive, readArchive, writeArchive, type BackupManifest } from '../src/backup/archive.ts'
import { scheduleSlot } from '../src/backup/service.ts'
import { backupRuns } from '../src/db/schema.ts'
import { cookieFrom, createTestApp } from './helpers.ts'
import { startFakeWebDav } from './fake-webdav.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('backup schedule', () => {
  const at = (s: string) => new Date(s)

  test('daily: the latest slot before, and the next one after', () => {
    const cfg = { schedule: 'daily' as const, hour: 3, weekday: 0, timeZone: 'Asia/Shanghai' }
    // 03:00 in Shanghai is 19:00 UTC the day before.
    assert.equal(scheduleSlot(cfg, at('2026-10-17T12:00:00Z'), -1)?.toISOString(), '2026-10-16T19:00:00.000Z')
    assert.equal(scheduleSlot(cfg, at('2026-10-17T12:00:00Z'), 1)?.toISOString(), '2026-10-17T19:00:00.000Z')
    assert.equal(scheduleSlot(cfg, at('2026-10-16T19:00:00Z'), -1)?.toISOString(), '2026-10-16T19:00:00.000Z', 'a slot counts from its first moment')
  })

  test('weekly, half-hour zones and off', () => {
    const weekly = { schedule: 'weekly' as const, hour: 23, weekday: 0, timeZone: 'Asia/Kolkata' }
    // Sunday 23:00 in India (UTC+5:30) is Sunday 17:30 UTC.
    assert.equal(scheduleSlot(weekly, at('2026-10-17T00:00:00Z'), 1)?.toISOString(), '2026-10-18T17:30:00.000Z')
    assert.equal(scheduleSlot(weekly, at('2026-10-17T00:00:00Z'), -1)?.toISOString(), '2026-10-11T17:30:00.000Z')
    assert.equal(scheduleSlot({ ...weekly, schedule: 'off' }, at('2026-10-17T00:00:00Z'), 1), null)
  })

  test('follows daylight saving time', () => {
    const cfg = { schedule: 'daily' as const, hour: 2, weekday: 0, timeZone: 'Europe/Berlin' }
    assert.equal(scheduleSlot(cfg, at('2026-10-25T12:00:00Z'), 1)?.toISOString(), '2026-10-26T01:00:00.000Z', 'CET after the change')
    assert.equal(scheduleSlot(cfg, at('2026-10-24T12:00:00Z'), 1)?.toISOString(), '2026-10-25T00:00:00.000Z', 'the first of the two 02:00s')
    assert.equal(scheduleSlot(cfg, at('2026-10-20T12:00:00Z'), 1)?.toISOString(), '2026-10-21T00:00:00.000Z', 'CEST before it')
  })
})

describe('backups', () => {
  let t: TestApp
  let dav: Awaited<ReturnType<typeof startFakeWebDav>>
  let admin = ''
  let member = ''
  let projectId = ''

  before(async () => {
    t = await createTestApp()
    dav = await startFakeWebDav({ username: 'alice', password: 'app-password' })
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: { email: 'm@lab.test' } })
    member = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'Member', email: 'm@lab.test', password: 'Correct-horse-2' },
      }),
    )
    projectId = (await t.app.inject({ method: 'POST', url: '/api/projects', headers: { cookie: admin }, payload: { name: 'Thesis' } })).json().id
    await t.store.writeFile(projectId, 'chapters/图 1.tex', 'Chapter one')
    await t.store.createFolder(projectId, 'empty')
    await t.snapshots.snapshot(projectId, { kind: 'edit', authors: [], message: 'First version' })
  })

  after(async () => {
    await t?.close()
    await dav?.close()
  })

  const put = (payload: object) => t.app.inject({ method: 'PUT', url: '/api/admin/backup', headers: { cookie: admin }, payload })
  const state = async () => (await t.app.inject({ url: '/api/admin/backup', headers: { cookie: admin } })).json()
  const runBackup = async () => {
    const res = await t.app.inject({ method: 'POST', url: '/api/admin/backup/run', headers: { cookie: admin } })
    assert.equal(res.statusCode, 200, res.body)
    await t.backup.idle()
    return (await state()).runs[0]
  }
  const download = async (name: string) => {
    const file = path.join(t.dataDir, name)
    await fs.writeFile(file, dav.files.get(`/backups/coltex/${name}`)!)
    return file
  }

  test('only admins see or change backups', async () => {
    for (const [method, url] of [['GET', '/api/admin/backup'], ['PUT', '/api/admin/backup'], ['POST', '/api/admin/backup/run'], ['POST', '/api/admin/backup/test']] as const) {
      const res = await t.app.inject({ method, url, headers: { cookie: member }, ...(method === 'GET' ? {} : { payload: {} }) })
      assert.equal(res.statusCode, 403, `${method} ${url}`)
    }
  })

  test('starts unconfigured, with the storage location', async () => {
    const s = await state()
    assert.equal(s.config.url, '')
    assert.equal(s.config.schedule, 'off')
    assert.equal(s.storage.driver, process.env.TEST_STORAGE === 's3' ? 's3' : 'local')
    assert.equal(s.nextRun, null)
    const res = await t.app.inject({ method: 'POST', url: '/api/admin/backup/run', headers: { cookie: admin } })
    assert.equal(res.statusCode, 400)
  })

  test('validates and saves settings without sending passwords back', async () => {
    assert.equal((await put({ schedule: 'daily' })).statusCode, 400, 'no folder yet')
    assert.equal((await put({ url: 'ftp://x' })).statusCode, 400)
    assert.equal((await put({ timeZone: 'Mars/Olympus' })).statusCode, 400)
    const res = await put({ url: `${dav.url}/backups/coltex/`, username: 'alice', password: 'app-password', schedule: 'daily', hour: 4, timeZone: 'Asia/Shanghai', keep: 2 })
    assert.equal(res.statusCode, 200, res.body)
    assert.equal(res.json().hasPassword, true)
    assert.equal(res.json().encrypted, false)
    assert.ok(!res.body.includes('app-password'))
    const s = await state()
    assert.ok(!JSON.stringify(s).includes('app-password'))
    assert.ok(s.nextRun, 'scheduled')
  })

  test('tests the connection with unsaved values', async () => {
    const wrong = await t.app.inject({ method: 'POST', url: '/api/admin/backup/test', headers: { cookie: admin }, payload: { password: 'nope' } })
    assert.equal(wrong.statusCode, 400)
    assert.match(wrong.json().error ?? wrong.json().message, /401/)
    const ok = await t.app.inject({ method: 'POST', url: '/api/admin/backup/test', headers: { cookie: admin }, payload: {} })
    assert.equal(ok.statusCode, 200, ok.body)
    assert.ok(dav.folders.has('/backups/coltex/'), 'missing parent folders are created')
    assert.equal([...dav.files.keys()].length, 0, 'the test file is removed again')
  })

  test('backs up the database, files and history to the folder', async () => {
    // A clone made the project's Git bridge repository; it goes into the backup too.
    const token = (await t.app.inject({ method: 'POST', url: '/api/me/git-tokens', headers: { cookie: admin }, payload: { name: 'ci' } })).json().token
    const refs = await t.app.inject({
      method: 'GET',
      url: `/api/git/${projectId}.git/info/refs?service=git-upload-pack`,
      headers: { authorization: `Basic ${Buffer.from(`git:${token}`).toString('base64')}` },
    })
    assert.equal(refs.statusCode, 200, refs.body)
    assert.match(refs.body, /refs\/heads\/main/)
    const run = await runBackup()
    assert.equal(run.status, 'success', run.error)
    assert.match(run.file, /^coltex-backup-\d{8}-\d{6}\.zip$/)
    assert.equal(run.projects, 1)
    const remote = dav.files.get(`/backups/coltex/${run.file}`)
    assert.ok(remote)
    assert.equal(remote.length, run.bytes)

    const zip = await readArchive(await download(run.file))
    const manifest = JSON.parse((await zip.read('coltex-backup.json')).toString()) as BackupManifest
    assert.deepEqual([manifest.format, manifest.projects, manifest.secret], [1, [projectId], 'omitted'])
    assert.equal((await zip.read('database.sql')).toString(), '-- test dump\n')
    assert.equal((await zip.read(`projects/${projectId}/chapters/图 1.tex`)).toString(), 'Chapter one')
    assert.ok(zip.names.includes(`projects/${projectId}/empty/`))
    assert.ok(zip.names.includes(`projects/${projectId}/main.tex`))
    assert.ok(!zip.names.includes('secret'), 'no instance secret in an unencrypted backup')
    const bundle = path.join(t.dataDir, 'h.bundle')
    await zip.extract(`history/${projectId}.bundle`, bundle)
    zip.close()
    const log = execFileSync('git', ['bundle', 'list-heads', bundle]).toString()
    assert.match(log, /refs\/heads\/main/)
    const bridge = await readArchive(await download(run.file))
    assert.ok(bridge.names.includes(`git-bridge/${projectId}.bundle`), 'the Git bridge repository is backed up')
    bridge.close()
  })

  test('encrypts archives so openssl can open them, and then includes the secret', async () => {
    assert.equal((await put({ encryptionPassword: 'short' })).statusCode, 400)
    assert.equal((await put({ encryptionPassword: 'a long passphrase' })).json().encrypted, true)
    // Distinct file names: they have a one-second resolution.
    await new Promise(r => setTimeout(r, 1100))
    const run = await runBackup()
    assert.equal(run.status, 'success', run.error)
    assert.match(run.file, /\.zip\.enc$/)
    const file = await download(run.file)
    const plain = path.join(t.dataDir, 'plain.zip')
    await assert.rejects(decryptArchive(file, plain, 'wrong passphrase'), /Wrong password/)
    // Some wrong passwords end in valid padding (no MAC in this format); they must be caught too.
    const quick = path.join(t.dataDir, 'quick.zip.enc')
    await writeArchive(quick, [{ name: 'a.txt', buffer: Buffer.from('a') }], { password: 'right', iterations: 1 })
    for (let i = 0; i < 1000; i++) await assert.rejects(decryptArchive(quick, plain, `wrong ${i}`, 1), /Wrong password/)
    await decryptArchive(quick, plain, 'right', 1)
    await decryptArchive(file, plain, 'a long passphrase')
    const zip = await readArchive(plain)
    assert.equal((await zip.read('secret')).toString(), 'test-secret')
    zip.close()
    try {
      execFileSync('openssl', ['version'])
    } catch {
      return // no openssl here
    }
    const viaOpenssl = path.join(t.dataDir, 'openssl.zip')
    execFileSync('openssl', ['enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '600000', '-md', 'sha256', '-in', file, '-out', viaOpenssl, '-pass', 'pass:a long passphrase'])
    assert.deepEqual(await fs.readFile(viaOpenssl), await fs.readFile(plain))
  })

  test('keeps only the latest backups and leaves other files alone', async () => {
    dav.files.set('/backups/coltex/coltex-backup-20200101-000000.zip', Buffer.from('old'))
    dav.files.set('/backups/coltex/notes.txt', Buffer.from('mine'))
    await new Promise(r => setTimeout(r, 1100))
    const run = await runBackup()
    assert.equal(run.status, 'success', run.error)
    const names = [...dav.files.keys()].map(k => k.split('/').pop()!).sort()
    assert.equal(names.filter(n => n.startsWith('coltex-backup-')).length, 2)
    assert.ok(!names.includes('coltex-backup-20200101-000000.zip'))
    assert.ok(names.includes('notes.txt'))
  })

  test('records failures with their reason', async () => {
    const dump = t.dumps.dump
    t.dumps.dump = async () => {
      throw new Error('pg_dump failed: connection refused')
    }
    try {
      const run = await runBackup()
      assert.equal(run.status, 'failed')
      assert.equal(run.error, 'pg_dump failed: connection refused')
    } finally {
      t.dumps.dump = dump
    }
  })

  test('one backup at a time', async () => {
    let finish!: () => void
    const dump = t.dumps.dump
    t.dumps.dump = file => new Promise<void>(r => (finish = r)).then(() => fs.writeFile(file, ''))
    try {
      const first = await t.app.inject({ method: 'POST', url: '/api/admin/backup/run', headers: { cookie: admin } })
      assert.equal(first.json().status, 'running')
      const second = await t.app.inject({ method: 'POST', url: '/api/admin/backup/run', headers: { cookie: admin } })
      assert.equal(second.statusCode, 409)
      while (!finish) await new Promise(r => setTimeout(r, 10))
      finish()
      await t.backup.idle()
    } finally {
      t.dumps.dump = dump
    }
  })

  test('scheduled backups run once per slot and retry failures', async () => {
    await t.db.delete(backupRuns)
    // Daily at 04:00 in Shanghai = 20:00 UTC; schedule saved well before that slot.
    await t.backup.save({ schedule: 'off' }, new Date('2026-10-16T00:00:00Z'))
    await t.backup.save({ schedule: 'daily', hour: 4, timeZone: 'Asia/Shanghai' }, new Date('2026-10-16T00:00:00Z'))
    const settings = await t.backup.state()
    assert.equal(settings.config.schedule, 'daily')

    const dump = t.dumps.dump
    t.dumps.dump = async () => {
      throw new Error('flaky')
    }
    try {
      assert.equal(await t.backup.tick(new Date('2026-10-16T19:59:00Z')), false, 'before the slot')
      // Runs are stamped with the real clock; move them to the simulated time.
      const ran = async (at: string) => {
        assert.equal(await t.backup.tick(new Date(at)), true, `runs at ${at}`)
        await t.backup.idle()
        const [latest] = (await t.backup.state()).runs
        await t.db.update(backupRuns).set({ startedAt: new Date(at) }).where(eq(backupRuns.id, latest.id))
      }
      await ran('2026-10-16T20:05:00Z')
      assert.equal(await t.backup.tick(new Date('2026-10-16T20:30:00Z')), false, 'waits an hour after a failure')
      await ran('2026-10-16T21:10:00Z')
      await ran('2026-10-16T22:20:00Z')
      assert.equal(await t.backup.tick(new Date('2026-10-17T12:00:00Z')), false, 'three attempts per slot')
      t.dumps.dump = dump
      await ran('2026-10-17T20:01:00Z')
      assert.equal(await t.backup.tick(new Date('2026-10-17T23:00:00Z')), false, 'done for this slot')
    } finally {
      t.dumps.dump = dump
    }
  })
})
