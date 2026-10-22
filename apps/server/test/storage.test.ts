import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { ConflictError, NotFoundError, BadRequestError } from '../src/errors.ts'
import { LocalProjectStore } from '../src/storage/local.ts'
import { S3ProjectStore } from '../src/storage/s3.ts'
import { S3Client, type S3Config } from '../src/storage/s3-client.ts'
import type { ProjectStore } from '../src/storage/types.ts'
import { startFakeS3 } from './fake-s3.ts'

let n = 0
const newId = () => `storetest${Date.now().toString(36)}${n++}`

/** The behaviour every driver must share; routes rely on it. */
function contract(name: string, setup: () => Promise<{ store: ProjectStore; mirror: string; teardown: () => Promise<void> }>) {
  describe(name, () => {
    let store: ProjectStore
    let mirror: string
    let teardown: () => Promise<void>
    before(async () => ({ store, mirror, teardown } = await setup()))
    after(() => teardown())

    test('creates, lists and reads a project', async () => {
      const id = newId()
      await store.createProject(id, new Map<string, string | Buffer>([['main.tex', 'hello'], ['sec/a.tex', Buffer.from('A')], ['fig.png', Buffer.from([0, 1, 2])]]), ['empty'])
      const tree = await store.listTree(id)
      assert.deepEqual(tree.files.map(f => [f.path, f.size, f.binary]), [['fig.png', 3, true], ['main.tex', 5, false], ['sec/a.tex', 1, false]])
      assert.deepEqual(tree.folders, ['empty', 'sec'])
      assert.equal((await store.readFile(id, 'sec/a.tex')).toString(), 'A')
      await assert.rejects(store.readFile(id, 'nope.tex'), NotFoundError)
      await assert.rejects(store.readFile(id, 'sec'), BadRequestError)
      await store.deleteProject(id)
      await assert.rejects(store.listTree(id), NotFoundError)
    })

    test('handles names with spaces, CJK and URL characters', async () => {
      const id = newId()
      const names = ['图 1 & a+b.png', 'my file (1).tex', 'ä/100%=#?.tex', "it's~*!.bib"]
      await store.createProject(id, new Map(names.map(p => [p, p])))
      assert.deepEqual((await store.listTree(id)).files.map(f => f.path).sort(), [...names].sort())
      for (const p of names) assert.equal((await store.readFile(id, p)).toString(), p)
      await store.move(id, 'ä', 'ö ü')
      assert.equal((await store.readFile(id, 'ö ü/100%=#?.tex')).toString(), 'ä/100%=#?.tex')
      await store.deleteProject(id)
    })

    test('an empty project still exists', async () => {
      const id = newId()
      await store.createProject(id, new Map())
      assert.deepEqual(await store.listTree(id), { files: [], folders: [] })
      await store.deleteProject(id)
    })

    test('a rewrite of the same size still shows in the listing', async () => {
      // Snapshots and the editor skip files whose listing entry is unchanged.
      const id = newId()
      await store.createProject(id, new Map([['main.tex', 'five']]))
      const entry = async () => {
        const f = (await store.listTree(id)).files[0]!
        return [f.size, f.modifiedAt, f.version]
      }
      const first = await entry()
      await store.writeFile(id, 'main.tex', 'FIVE')
      assert.notDeepEqual(await entry(), first)
      await store.deleteProject(id)
    })

    test('writes files, with createOnly and clashes', async () => {
      const id = newId()
      await store.createProject(id, new Map([['main.tex', 'v1']]))
      await store.writeFile(id, 'main.tex', 'v2')
      assert.equal((await store.readFile(id, 'main.tex')).toString(), 'v2')
      await assert.rejects(store.writeFile(id, 'main.tex', 'x', { createOnly: true }), ConflictError)
      await store.writeFile(id, 'deep/er/new.tex', 'n', { createOnly: true })
      assert.deepEqual((await store.listTree(id)).folders, ['deep', 'deep/er'])
      await assert.rejects(store.writeFile(id, 'deep', 'x'), ConflictError)
      await assert.rejects(store.writeFile(id, 'main.tex/inner.tex', 'x'), ConflictError)
      await store.deleteProject(id)
    })

    test('deleting the last file keeps its folder', async () => {
      const id = newId()
      await store.createProject(id, new Map([['a/b/only.tex', 'x']]))
      await store.deleteFile(id, 'a/b/only.tex')
      await store.deleteFile(id, 'a/b/missing.tex') // no error, like rm -f
      assert.deepEqual(await store.listTree(id), { files: [], folders: ['a', 'a/b'] })
      await assert.rejects(store.deleteFile(id, 'a'), BadRequestError)
      await store.deleteProject(id)
    })

    test('creates and deletes folders', async () => {
      const id = newId()
      await store.createProject(id, new Map([['main.tex', 'x'], ['figs/a.png', 'a'], ['figs/sub/b.png', 'b']]))
      await store.createFolder(id, 'new/inner')
      await assert.rejects(store.createFolder(id, 'figs'), ConflictError)
      await assert.rejects(store.createFolder(id, 'main.tex'), ConflictError)
      await assert.rejects(store.createFolder(id, 'main.tex/x'), ConflictError)
      await store.deleteFolder(id, 'figs')
      await assert.rejects(store.deleteFolder(id, 'figs'), NotFoundError)
      await assert.rejects(store.deleteFolder(id, 'main.tex'), BadRequestError)
      assert.deepEqual(await store.listTree(id).then(t => [t.files.map(f => f.path), t.folders]), [['main.tex'], ['new', 'new/inner']])
      await store.deleteProject(id)
    })

    test('moves files and folders without overwriting', async () => {
      const id = newId()
      await store.createProject(id, new Map([['main.tex', 'm'], ['ch/one.tex', '1'], ['ch/sub/two.tex', '2'], ['other.tex', 'o']]), ['ch/empty'])
      await store.move(id, 'other.tex', 'renamed/other.tex')
      await assert.rejects(store.move(id, 'main.tex', 'renamed/other.tex'), ConflictError)
      await assert.rejects(store.move(id, 'ch', 'ch/sub/x'), BadRequestError)
      await assert.rejects(store.move(id, 'missing', 'x'), NotFoundError)
      await store.move(id, 'ch', 'chapters')
      const tree = await store.listTree(id)
      assert.deepEqual(tree.files.map(f => f.path), ['chapters/one.tex', 'chapters/sub/two.tex', 'main.tex', 'renamed/other.tex'])
      assert.deepEqual(tree.folders, ['chapters', 'chapters/empty', 'chapters/sub', 'renamed'])
      assert.equal((await store.readFile(id, 'chapters/sub/two.tex')).toString(), '2')
      await store.deleteProject(id)
    })

    test('keeps the compiler’s copy in step', async () => {
      const id = newId()
      await store.createProject(id, new Map([['main.tex', 'v1'], ['old.tex', 'o'], ['d/x.tex', 'x']]))
      // Something the driver didn't write must survive.
      await fs.mkdir(path.join(mirror, id), { recursive: true })
      await fs.writeFile(path.join(mirror, id, 'stray.txt'), 'keep')
      await store.syncForCompile(id)
      await store.writeFile(id, 'main.tex', 'v2')
      await store.deleteFile(id, 'old.tex')
      await store.deleteFolder(id, 'd')
      await store.syncForCompile(id)
      const read = (p: string) => fs.readFile(path.join(mirror, id, p), 'utf8').catch(() => null)
      assert.equal(await read('main.tex'), 'v2')
      assert.equal(await read('old.tex'), null)
      assert.equal(await read('d/x.tex'), null)
      assert.equal(await read('stray.txt'), 'keep')
      await store.deleteProject(id)
    })
  })
}

contract('local store', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-store-'))
  return { store: new LocalProjectStore(root), mirror: root, teardown: () => fs.rm(root, { recursive: true, force: true }) }
})

async function s3Store(cfg: S3Config, prefix: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-s3mirror-'))
  const client = new S3Client(cfg)
  await client.checkBucket()
  const store = new S3ProjectStore({ client, prefix, mirrorDir: path.join(root, 'projects'), manifestDir: path.join(root, 'manifests') })
  return { store, mirror: path.join(root, 'projects'), root }
}

contract('S3 store (fake server)', async () => {
  const fake = await startFakeS3()
  const { store, mirror, root } = await s3Store(
    { endpoint: fake.endpoint, region: 'us-east-1', bucket: 'test', accessKeyId: 'k', secretAccessKey: 's', pathStyle: true },
    'coltex',
  )
  return {
    store,
    mirror,
    teardown: async () => {
      assert.deepEqual([...fake.objects.keys()], [], 'every test deletes its project')
      await fake.close()
      await fs.rm(root, { recursive: true, force: true })
    },
  }
})

// A real service: S3_TEST_ENDPOINT=http://localhost:8333 S3_TEST_BUCKET=… S3_TEST_ACCESS_KEY_ID=… S3_TEST_SECRET_ACCESS_KEY=…
if (process.env.S3_TEST_ENDPOINT) {
  contract(`S3 store (${process.env.S3_TEST_ENDPOINT})`, async () => {
    const { store, mirror, root } = await s3Store(
      {
        endpoint: process.env.S3_TEST_ENDPOINT!,
        region: process.env.S3_TEST_REGION ?? 'us-east-1',
        bucket: process.env.S3_TEST_BUCKET ?? 'coltex-test',
        accessKeyId: process.env.S3_TEST_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.S3_TEST_SECRET_ACCESS_KEY ?? '',
        pathStyle: process.env.S3_TEST_PATH_STYLE !== 'false',
      },
      `test-${Date.now().toString(36)}`,
    )
    return { store, mirror, teardown: () => fs.rm(root, { recursive: true, force: true }) }
  })
}
