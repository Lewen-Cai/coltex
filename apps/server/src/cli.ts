/**
 * Maintenance commands, run with the server stopped:
 *
 *   node src/cli.ts restore <backup.zip | backup.zip.enc>
 *       Restore a backup into an empty instance (database, project files in
 *       the configured storage, history, and the instance secret when the
 *       backup has it). Encrypted backups read their password from
 *       COLTEX_BACKUP_PASSWORD or the file named by COLTEX_BACKUP_PASSWORD_FILE.
 *
 *   node src/cli.ts copy-storage
 *       Copy every project from DATA_DIR/projects into the S3 bucket set up
 *       with STORAGE=s3, for moving an existing instance to S3. Projects
 *       already in the bucket are skipped; local files are left as they are.
 *
 * With docker compose: docker compose run --rm server node src/cli.ts <command>
 *
 *   node src/cli.ts tailscale [status | up | down | off]
 *       The built-in Tailscale, for a server without a browser: `up` turns
 *       it on, prints the link to sign it in to a tailnet (open it on any
 *       device), waits, then serves ColTex there and prints the address.
 *       `down` leaves the tailnet, `off` stops it. Runs next to the server:
 *       docker compose exec server node src/cli.ts tailscale up
 *
 *   node src/cli.ts cloudflare [status | quick | token [TOKEN] | off]
 *       The built-in Cloudflare Tunnel: `quick` for a temporary
 *       trycloudflare.com address (no account), `token` with a tunnel made in
 *       the Cloudflare dashboard (the token from the argument,
 *       $CF_TUNNEL_TOKEN, or typed in). Runs next to the server, like tailscale.
 *
 *   node src/cli.ts system-admin <email>
 *       Make that account the system administrator (the previous one becomes
 *       an admin). Runs next to the server, like tailscale.
 *
 *   node src/cli.ts reset-password <email>
 *       Set a new password for that account (typed in twice, or from
 *       COLTEX_NEW_PASSWORD) and sign it out everywhere. For a system
 *       administrator who forgot theirs. Runs next to the server, like tailscale.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { hash } from '@node-rs/argon2'
import { and, eq, sql } from 'drizzle-orm'
import { passwordProblem } from '@coltex/shared'
import { renderUnicodeCompact } from 'uqr'
import { decryptArchive, isEncrypted, MANIFEST, readArchive, type BackupManifest } from './backup/archive.ts'
import { runSqlFile } from './backup/postgres.ts'
import { config } from './config.ts'
import { createDb } from './db/client.ts'
import { account, projects, session, user } from './db/schema.ts'
import { NotFoundError } from './errors.ts'
import { SnapshotService } from './history/snapshots.ts'
import { createStore } from './storage/index.ts'
import { LocalProjectStore } from './storage/local.ts'
import { TailscaleDaemon } from './network/daemon.ts'
import { NetworkService } from './network/service.ts'
import { CloudflareTunnel } from './network/cloudflare.ts'
import { SecretBox } from './ai/credentials.ts'
import { TailscaleClient } from './network/tailscale.ts'
import type { ProjectStore } from './storage/types.ts'

async function exists(store: ProjectStore, id: string): Promise<boolean> {
  return store.listTree(id).then(
    () => true,
    err => {
      if (err instanceof NotFoundError) return false
      throw err
    },
  )
}

async function backupPassword(): Promise<string | undefined> {
  if (process.env.COLTEX_BACKUP_PASSWORD) return process.env.COLTEX_BACKUP_PASSWORD
  if (process.env.COLTEX_BACKUP_PASSWORD_FILE) return (await fs.readFile(process.env.COLTEX_BACKUP_PASSWORD_FILE, 'utf8')).trim()
  return undefined
}

async function restore(file: string | undefined): Promise<void> {
  if (!file) throw new Error('Usage: node src/cli.ts restore <backup file>')
  await fs.mkdir(config.cacheDir, { recursive: true })
  const work = await fs.mkdtemp(path.join(config.cacheDir, 'restore-'))
  const db = createDb(config.databaseUrl)
  try {
    let zipPath = path.resolve(file)
    if (await isEncrypted(zipPath)) {
      const password = await backupPassword()
      if (!password) throw new Error('This backup is encrypted: set COLTEX_BACKUP_PASSWORD (or COLTEX_BACKUP_PASSWORD_FILE)')
      console.log('Decrypting…')
      await decryptArchive(zipPath, path.join(work, 'backup.zip'), password)
      zipPath = path.join(work, 'backup.zip')
    }
    const zip = await readArchive(zipPath)
    const manifest = JSON.parse((await zip.read(MANIFEST)).toString()) as BackupManifest
    if (manifest.format !== 1) throw new Error(`Unsupported backup format ${manifest.format}`)
    console.log(`Backup of ${manifest.createdAt} (ColTex ${manifest.version}), ${manifest.projects.length} projects`)

    // Only into an empty instance: a fresh install, before or after its first start (setup not done).
    const tables = (await db.execute<{ name: string }>(sql`select table_name as name from information_schema.tables where table_schema = 'public'`)).rows.map(r => r.name)
    if (tables.length) {
      const counts = await db.execute<{ users: number; projects: number }>(
        sql`select (select count(*) from "user")::int as users, (select count(*) from projects)::int as projects`,
      ).catch(() => null)
      const row = counts?.rows[0]
      if (!row || row.users > 0 || row.projects > 0) {
        throw new Error('The database already has data. Restore into a fresh install: an empty database, before anyone has signed up.')
      }
    }
    const store = await createStore(config)
    const snapshots = new SnapshotService(config.historyDir, store)
    const bridges = new SnapshotService(config.gitBridgeDir, store)
    for (const id of manifest.projects) {
      if (await exists(store, id)) throw new Error(`Project ${id} already has files in the storage; restore into an empty one`)
      const repo = path.join(config.historyDir, `${id}.git`)
      if (await fs.access(repo).then(() => true, () => false)) throw new Error(`${repo} already exists; restore into an empty data directory`)
    }

    console.log('Restoring the database…')
    if (tables.length) {
      // The server's first start created empty tables; the dump brings its own.
      await db.execute(sql`drop schema public cascade`)
      await db.execute(sql`create schema public`)
      await db.execute(sql`drop schema if exists drizzle cascade`)
    }
    const dump = path.join(work, 'database.sql')
    await zip.extract('database.sql', dump)
    await runSqlFile(config.databaseUrl, dump, config.psql)

    const restored = new Set((await db.select({ id: projects.id }).from(projects)).map(r => r.id))
    for (const id of manifest.projects) {
      if (!restored.has(id)) console.warn(`  ${id} is in the archive but not in the database; restoring its files anyway`)
      const prefix = `projects/${id}/`
      const files = new Map<string, Buffer>()
      const folders: string[] = []
      for (const name of zip.names.filter(n => n.startsWith(prefix) && n !== prefix)) {
        const rel = name.slice(prefix.length)
        if (zip.isFolder(name)) folders.push(rel.replace(/\/$/, ''))
        else files.set(rel, await zip.read(name))
      }
      await store.createProject(id, files, folders)
      const bundle = `history/${id}.bundle`
      if (zip.names.includes(bundle)) {
        const local = path.join(work, `${id}.bundle`)
        await zip.extract(bundle, local)
        await snapshots.restoreBundle(id, local)
        await fs.rm(local)
      }
      const bridge = `git-bridge/${id}.bundle`
      if (zip.names.includes(bridge)) {
        const local = path.join(work, `${id}.git-bridge.bundle`)
        await zip.extract(bridge, local)
        await bridges.restoreBundle(id, local)
        await fs.rm(local)
      }
      console.log(`  ${id}: ${files.size} files${zip.names.includes(bundle) ? ', history' : ''}${zip.names.includes(bridge) ? ', Git bridge' : ''}`)
    }

    if (zip.names.includes('secret')) {
      const secret = (await zip.read('secret')).toString()
      if (config.secretFromEnv) {
        if (secret !== config.secret) console.warn('COLTEX_SECRET differs from the secret in the backup: set it to the old value, or reconnect AI providers and sign in again.')
      } else {
        await fs.writeFile(path.join(config.dataDir, '.secret'), secret, { mode: 0o600 })
        console.log('Restored the instance secret.')
      }
    } else if (manifest.secret === 'environment') {
      console.warn('The backed-up server took its secret from COLTEX_SECRET: set the same value here.')
    } else {
      console.warn('The backup has no instance secret (it is only included in encrypted backups): everyone signs in again, and AI providers need reconnecting in Administration → AI services.')
    }
    zip.close()
    console.log('Done. Start the server.')
  } finally {
    await db.$client.end()
    await fs.rm(work, { recursive: true, force: true })
  }
}

async function copyStorage(): Promise<void> {
  if (config.storage.driver !== 's3') throw new Error('Set STORAGE=s3 and the S3_* variables first: copy-storage copies DATA_DIR/projects into that bucket')
  const from = new LocalProjectStore(config.projectsDir)
  const to = await createStore(config)
  const db = createDb(config.databaseUrl)
  try {
    const ids = (await db.select({ id: projects.id }).from(projects)).map(r => r.id)
    let copied = 0
    for (const id of ids) {
      if (!(await exists(from, id))) {
        console.warn(`  ${id}: no local files, skipped`)
        continue
      }
      if (await exists(to, id)) {
        console.log(`  ${id}: already in the bucket, skipped`)
        continue
      }
      const tree = await from.listTree(id)
      const files = new Map<string, Buffer>()
      for (const f of tree.files) files.set(f.path, await from.readFile(id, f.path))
      await to.createProject(id, files, tree.folders)
      const check = await to.listTree(id)
      if (check.files.length !== tree.files.length) throw new Error(`${id}: ${check.files.length} of ${tree.files.length} files arrived in the bucket`)
      console.log(`  ${id}: ${files.size} files`)
      copied++
    }
    console.log(`Copied ${copied} of ${ids.length} projects. Local files were left in ${config.projectsDir}; the compiler's copies will live there from now on.`)
  } finally {
    await db.$client.end()
  }
}

async function tailscale(action = 'status'): Promise<void> {
  const db = createDb(config.databaseUrl)
  const daemon = new TailscaleDaemon({ stateDir: config.tailscaleStateDir, binary: config.tailscaled })
  const ts = new TailscaleClient({ socket: daemon.socket, target: config.tailscaleTarget, hostname: config.tailscaleHostname })
  // Settings only; tailscaled itself is the server's child.
  const network = new NetworkService({ db, envPublicUrl: config.envPublicUrl, tailscale: ts })
  const show = (s: Awaited<ReturnType<TailscaleClient['state']>>) => {
    console.log(`Tailscale: ${s.state}${s.error ? ` (${s.error})` : ''}`)
    if (s.name) console.log(`  device:  ${s.name}${s.tailnet ? ` on ${s.tailnet}` : ''}`)
    if (s.addresses.length) console.log(`  address: ${s.addresses.join(', ')}`)
    if (s.servingUrl) console.log(`  ColTex:  ${s.servingUrl}`)
    if (s.authUrl) console.log(`  sign in: ${s.authUrl}`)
  }
  /** Tell the running server to start or stop tailscaled (it reads the setting on SIGUSR2). */
  const nudge = async () => {
    const pid = Number(await fs.readFile(path.join(config.cacheDir, 'server.pid'), 'utf8').catch(() => ''))
    if (!pid) throw new Error('The server is not running (no server.pid); start it first')
    process.kill(pid, 'SIGUSR2')
  }
  const waitFor = async (check: () => Promise<boolean>, what: string, ms: number) => {
    const until = Date.now() + ms
    while (!(await check())) {
      if (Date.now() > until) throw new Error(`Timed out waiting for ${what}`)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  try {
    if (action === 'status') return (await ts.available()) ? show(await ts.state()) : console.log('Tailscale: off')
    if (action === 'off') {
      await network.setTailscaleSetting(false)
      await nudge()
      return console.log('Tailscale: off')
    }
    if (action === 'down') {
      await ts.logout()
      return show(await ts.state())
    }
    if (action !== 'up') throw new Error('Usage: node src/cli.ts tailscale [status | up | down | off]')
    if (!daemon.installed()) throw new Error(`${config.tailscaled} is not installed here`)
    await network.setTailscaleSetting(true)
    await nudge()
    await waitFor(() => ts.available(), 'tailscaled to start', 30_000)
    let s = await ts.state()
    if (s.state !== 'running') {
      s = await ts.login()
      if (s.authUrl) console.log(`Open this link on any device (or scan the code) to add ColTex to your tailnet:\n\n  ${s.authUrl}\n\n${renderUnicodeCompact(s.authUrl)}\nWaiting…`)
      await waitFor(async () => (s = await ts.state()).state === 'running', 'the sign-in', 15 * 60_000)
    }
    show(await ts.serve(true))
  } finally {
    await db.$client.end()
  }
}

async function cloudflare(action = 'status', value?: string): Promise<void> {
  const db = createDb(config.databaseUrl)
  // Settings only; cloudflared itself is the server's child.
  const tunnel = new CloudflareTunnel({ binary: config.cloudflared, target: config.tailscaleTarget, metrics: config.cloudflaredMetrics })
  const network = new NetworkService({
    db,
    envPublicUrl: config.envPublicUrl,
    tailscale: new TailscaleClient({ socket: path.join(config.tailscaleStateDir, 'tailscaled.sock'), target: config.tailscaleTarget }),
    box: new SecretBox(config.secret),
  })
  const nudge = async () => {
    const pid = Number(await fs.readFile(path.join(config.cacheDir, 'server.pid'), 'utf8').catch(() => ''))
    if (!pid) throw new Error('The server is not running (no server.pid); start it first')
    process.kill(pid, 'SIGUSR2')
  }
  /** Ask the running server: its cloudflared is the one connected. */
  const status = async () => {
    const res = await fetch(`http://${config.cloudflaredMetrics}/ready`).catch(() => null)
    const ready = (await res?.json().catch(() => null)) as { readyConnections?: number } | null
    const quick = (await fetch(`http://${config.cloudflaredMetrics}/quicktunnel`)
      .then(r => r.json())
      .catch(() => null)) as { hostname?: string } | null
    return { connected: (ready?.readyConnections ?? 0) > 0, url: quick?.hostname ? `https://${quick.hostname}` : null }
  }
  try {
    if (action === 'status') {
      const s = await status()
      console.log(`Cloudflare Tunnel: ${s.connected ? 'connected' : 'not connected'}`)
      if (s.url) console.log(`  ColTex:  ${s.url}`)
      return
    }
    if (action === 'off') {
      await network.setCloudflareSetting({ enabled: false })
      await nudge()
      return console.log('Cloudflare Tunnel: off')
    }
    if (action !== 'quick' && action !== 'token') throw new Error('Usage: node src/cli.ts cloudflare [status | quick | token [TOKEN] | off]')
    if (!tunnel.installed()) throw new Error(`${config.cloudflared} is not installed here`)
    let token: string | undefined
    if (action === 'token') {
      // The token from the argument, $CF_TUNNEL_TOKEN, or typed in (kept out of the shell history).
      token = value ?? process.env.CF_TUNNEL_TOKEN
      if (!token) {
        process.stdout.write('Tunnel token (from the Cloudflare dashboard): ')
        token = await new Promise<string>(resolve => process.stdin.once('data', d => resolve(d.toString().trim())))
        process.stdin.pause()
      }
      if (!token) throw new Error('No token given')
    }
    await network.setCloudflareSetting({ enabled: true, mode: action, token })
    await nudge()
    console.log('Connecting…')
    const until = Date.now() + 60_000
    let s = await status()
    while (!s.connected || (action === 'quick' && !s.url)) {
      if (Date.now() > until) throw new Error('Not connected after a minute; see Settings → Network for what cloudflared reports')
      await new Promise(r => setTimeout(r, 1000))
      s = await status()
    }
    console.log(action === 'quick' ? `Cloudflare Tunnel: connected\n  ColTex:  ${s.url}  (changes every time it starts)` : 'Cloudflare Tunnel: connected (its hostnames are the ones set for the tunnel in the Cloudflare dashboard)')
  } finally {
    await db.$client.end()
  }
}

/**
 * Make an account the system administrator (there is one): the previous one
 * becomes an admin. For handing the instance over, or getting back in when
 * that account is lost. Works with the server running.
 */
async function systemAdmin(email: string | undefined): Promise<void> {
  if (!email) throw new Error('Usage: node src/cli.ts system-admin <email>')
  const db = createDb(config.databaseUrl)
  try {
    const [target] = await db.select({ id: user.id, name: user.name, role: user.role }).from(user).where(eq(user.email, email.trim().toLowerCase()))
    if (!target) throw new NotFoundError(`No account with the email ${email}`)
    if (target.role === 'admin') {
      console.log(`${target.name} is already the system administrator`)
      return
    }
    await db.transaction(async tx => {
      await tx.update(user).set({ role: 'manager' }).where(eq(user.role, 'admin'))
      await tx.update(user).set({ role: 'admin', banned: false }).where(eq(user.id, target.id))
    })
    console.log(`${target.name} is now the system administrator`)
  } finally {
    await db.$client.end()
  }
}

/** What was piped in beyond the line read so far. */
let piped = ''

/** A line typed in without showing it (a password); a plain line when stdin isn't a terminal. */
function askHidden(prompt: string): Promise<string> {
  process.stdout.write(prompt)
  const stdin = process.stdin
  if (!stdin.isTTY) {
    return new Promise(resolve => {
      const take = () => {
        const end = piped.indexOf('\n')
        if (end < 0) return false
        resolve(piped.slice(0, end).replace(/\r$/, ''))
        piped = piped.slice(end + 1)
        return true
      }
      if (take()) return
      const onData = (d: Buffer) => {
        piped += d.toString()
        if (!take()) return
        stdin.off('data', onData)
        stdin.pause()
      }
      stdin.on('data', onData)
      stdin.once('end', () => resolve(piped))
    })
  }
  return new Promise((resolve, reject) => {
    let text = ''
    stdin.setRawMode(true)
    stdin.resume()
    const onData = (d: Buffer) => {
      for (const ch of d.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.off('data', onData)
          stdin.setRawMode(false)
          stdin.pause()
          process.stdout.write('\n')
          return resolve(text)
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false)
          process.stdout.write('\n')
          return reject(new Error('Cancelled'))
        }
        if (ch === '\u007f' || ch === '\b') text = [...text].slice(0, -1).join('')
        else if (ch >= ' ') text += ch
      }
    }
    stdin.on('data', onData)
  })
}

/**
 * A new password for an account, checked by the same rules as everywhere
 * else, and every session of it ended (whoever knew the old one is out).
 * Works with the server running.
 */
async function resetPassword(email: string | undefined): Promise<void> {
  if (!email) throw new Error('Usage: node src/cli.ts reset-password <email>')
  const db = createDb(config.databaseUrl)
  try {
    const [target] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, email.trim().toLowerCase()))
    if (!target) throw new NotFoundError(`No account with the email ${email}`)
    let password = process.env.COLTEX_NEW_PASSWORD
    if (!password) {
      password = await askHidden(`New password for ${target.name}: `)
      const problem = passwordProblem(password)
      if (problem) throw new Error(problem)
      if ((await askHidden('Again: ')) !== password) throw new Error('The two passwords differ')
    }
    const problem = passwordProblem(password)
    if (problem) throw new Error(problem)
    const hashed = await hash(password)
    await db.transaction(async tx => {
      const updated = await tx
        .update(account)
        .set({ password: hashed, updatedAt: new Date() })
        .where(and(eq(account.userId, target.id), eq(account.providerId, 'credential')))
        .returning({ id: account.id })
      // Not expected (every account here signs in with a password), but then it can from now on.
      if (!updated.length) await tx.insert(account).values({ id: crypto.randomUUID(), accountId: target.id, providerId: 'credential', userId: target.id, password: hashed })
      await tx.delete(session).where(eq(session.userId, target.id))
    })
    console.log(`New password set for ${target.name}; signed out everywhere.`)
  } finally {
    await db.$client.end()
  }
}

const [command, ...args] = process.argv.slice(2)
try {
  if (command === 'restore') await restore(args[0])
  else if (command === 'copy-storage') await copyStorage()
  else if (command === 'tailscale') await tailscale(args[0])
  else if (command === 'cloudflare') await cloudflare(args[0], args[1])
  else if (command === 'system-admin') await systemAdmin(args[0])
  else if (command === 'reset-password') await resetPassword(args[0])
  else {
    console.error('Commands: restore <backup file>, copy-storage, tailscale [status | up | down | off], cloudflare [status | quick | token [TOKEN] | off], system-admin <email>, reset-password <email>')
    process.exitCode = 2
  }
} catch (err) {
  console.error(`Error: ${(err as Error).message}`)
  process.exitCode = 1
}
