import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import pg from 'pg'
import { CompileJob, type CompileJobInput, type CompileResult, type SynctexJob, type SynctexResult, type TexLookupJob, type TexLookupResult } from '@coltex/shared'
import { DbCredentialStore, SecretBox } from '../src/ai/credentials.ts'
import { AiService } from '../src/ai/service.ts'
import { AiSessionManager } from '../src/ai/session.ts'
import { ConversationStore } from '../src/ai/conversations.ts'
import { SkillStore } from '../src/ai/skills.ts'
import { SkillChatStore, SkillWorkshops } from '../src/ai/workshop.ts'
import { buildApp } from '../src/app.ts'
import { NetworkService } from '../src/network/service.ts'
import { TailscaleClient } from '../src/network/tailscale.ts'
import { BackupService } from '../src/backup/service.ts'
import { ReferenceService } from '../src/references/service.ts'
import { LiteratureSearch } from '../src/references/search.ts'
import { ZoteroClient } from '../src/references/zotero.ts'
import { GitBridgeService } from '../src/gitbridge/service.ts'
import { TemplateService } from '../src/projects/templates.ts'
import { LinkedFileService } from '../src/projects/linked-files.ts'
import { CompileCoalescer, buildProject } from '../src/routes/compile.ts'
import { AccountService } from '../src/auth/accounts.ts'
import { createAuth } from '../src/auth/auth.ts'
import { DocService } from '../src/collab/docs.ts'
import { ConvertService } from '../src/convert/service.ts'
import { CollabServer } from '../src/collab/server.ts'
import { createDb, runMigrations } from '../src/db/client.ts'
import { HistoryService } from '../src/history/service.ts'
import { MonitorHistory } from '../src/monitor-history.ts'
import { NotificationService } from '../src/notifications/service.ts'
import { SnapshotService } from '../src/history/snapshots.ts'
import { ProjectService } from '../src/projects/service.ts'
import { ReviewService } from '../src/review/service.ts'
import { LocalProjectStore } from '../src/storage/local.ts'
import { S3ProjectStore } from '../src/storage/s3.ts'
import { S3Client } from '../src/storage/s3-client.ts'
import { startFakeS3 } from './fake-s3.ts'

const BASE_URL = process.env.DATABASE_URL ?? 'postgres://coltex:coltex@localhost:5432/coltex'
const TEST_DB = 'coltex_test'

/** Recreate an empty test database next to the development one. */
async function resetTestDatabase(): Promise<string> {
  const admin = new pg.Client({ connectionString: BASE_URL })
  await admin.connect()
  try {
    await admin.query(`drop database if exists ${TEST_DB} with (force)`)
    await admin.query(`create database ${TEST_DB}`)
  } finally {
    await admin.end()
  }
  const url = new URL(BASE_URL)
  url.pathname = `/${TEST_DB}`
  return url.toString()
}

async function s3TestStore(dataDir: string) {
  const fake = process.env.S3_TEST_ENDPOINT ? undefined : await startFakeS3()
  const client = new S3Client({
    endpoint: process.env.S3_TEST_ENDPOINT ?? fake!.endpoint,
    region: process.env.S3_TEST_REGION ?? 'us-east-1',
    bucket: process.env.S3_TEST_ENDPOINT ? (process.env.S3_TEST_BUCKET ?? 'coltex-test') : 'test',
    accessKeyId: process.env.S3_TEST_ACCESS_KEY_ID ?? 'k',
    secretAccessKey: process.env.S3_TEST_SECRET_ACCESS_KEY ?? 's',
    pathStyle: true,
  })
  const store = new S3ProjectStore({
    client,
    prefix: `test-${path.basename(dataDir)}`,
    mirrorDir: path.join(dataDir, 'projects'),
    manifestDir: path.join(dataDir, 'cache', 's3-mirror'),
  })
  return { store, close: async () => fake?.close() }
}

/** `builtinSkills`: a folder of built-in skills (none by default, so tests see only what they create). */
export async function createTestApp(options: { builtinSkills?: string } = {}) {
  const db = createDb(await resetTestDatabase())
  await runMigrations(db)
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coltex-test-'))
  const projectsDir = path.join(dataDir, 'projects')
  const outputsDir = path.join(dataDir, 'outputs')
  // TEST_STORAGE=s3 runs everything on the S3 driver (an in-memory server, or S3_TEST_ENDPOINT).
  const s3 = process.env.TEST_STORAGE === 's3' ? await s3TestStore(dataDir) : undefined
  const store = s3?.store ?? new LocalProjectStore(projectsDir)
  const snapshots = new SnapshotService(path.join(dataDir, 'history'), store)
  const forgotten: string[] = []
  // As in src/index.ts.
  const projects = new ProjectService(db, store, async id => {
    collab.closeProject(id)
    aiSessions.dropProject(id)
    history.dropProject(id)
    await snapshots.deleteProject(id)
    await gitBridge.deleteProject(id)
    await fs.rm(path.join(outputsDir, id), { recursive: true, force: true })
    await queue.forget(id)
  })
  // Tests may run a fake tailscaled LocalAPI on this socket.
  const tailscaleSocket = path.join(dataDir, 'tailscaled.sock')
  const network = new NetworkService({
    db,
    envPublicUrl: undefined,
    tailscale: new TailscaleClient({ socket: tailscaleSocket, target: 'http://server:3690' }),
  })
  const auth = createAuth({
    db,
    secret: 'test-secret-test-secret-test-secret',
    baseURL: 'http://localhost:3000',
    trustedOrigins: ['http://localhost:3000'],
    extraOrigins: () => network.extraOrigins(),
    userDeletion: projects,
  })
  const compiled: string[] = []
  const compileJobs: CompileJob[] = []
  /** Tests may replace this to simulate compile results (e.g. errors). */
  const compiler = {
    result: (_job: CompileJob): CompileResult => ({ buildId: 'b-1', status: 'success', outputFiles: ['output.pdf'], diagnostics: [], durationMs: 1 }),
  }
  const queue = {
    async compile(job: Omit<CompileJobInput, 'buildId'>): Promise<CompileResult> {
      compiled.push(job.projectId)
      const full = CompileJob.parse({ ...job, buildId: `b-${compileJobs.length + 1}` })
      compileJobs.push(full)
      return compiler.result(full)
    },
    async forget(projectId: string) {
      forgotten.push(projectId)
    },
    async stats() {
      return { workers: 1, waiting: 0, active: 0, failed: 0, valkeyMs: 1, containers: [{ name: 'compiler-1', used: 1e9, limit: 4e9, cpu: 25, cpus: 2 }] }
    },
    async texLookup(job: TexLookupJob): Promise<TexLookupResult> {
      return job.name === 'booktabs'
        ? { found: true, file: `tex/latex/booktabs/booktabs.${job.kind === 'doc' ? 'pdf' : 'sty'}`, totalLines: 3, text: '1: \\newcommand\\toprule' }
        : { found: false, text: `“${job.name}” is not installed in this TeX Live.` }
    },
    async synctex(job: SynctexJob): Promise<SynctexResult> {
      return job.kind === 'code'
        ? { pdf: [{ page: 1, h: 10, v: 20, width: 30, height: 5 }] }
        : { code: { file: 'main.tex', line: 3, column: 0 } }
    },
  }
  const history = new HistoryService({ db, snapshots, store, projects }, { idleMs: 150, maxMs: 1000 })
  const collab = new CollabServer({
    auth,
    projects,
    store,
    docs: new DocService(db),
    debounceMs: 50,
    maxDebounceMs: 200,
    onEdit: (projectId, userId) => history.noteChange(projectId, userId),
  })
  history.setCollab(collab)
  const box = new SecretBox('test-secret')
  const ai = new AiService(db, new DbCredentialStore(db, box))
  await ai.init()
  const notifications = new NotificationService(db)
  // Not started: tests feed it samples themselves.
  const monitor = new MonitorHistory(db, () => queue.stats().then(s => s.containers))
  const skills = new SkillStore(db, options.builtinSkills ?? path.join(dataDir, 'no-builtin-skills'))
  const skillChats = new SkillWorkshops({ ai, skills, chats: new SkillChatStore(db) })
  const aiSessions = new AiSessionManager({ ai, store, queue, collab, history, projects, outputsDir, conversations: new ConversationStore(db), skills })
  // Not started either; there is no pg_dump here, so the dump is a stand-in tests can replace.
  const dumps = { dump: async (file: string) => fs.writeFile(file, '-- test dump\n') }
  const backup = new BackupService(
    { db, store, collab, snapshots, gitBridge: { bundle: (id, file) => gitBridge.bundle(id, file) }, box },
    {
      tmpDir: path.join(dataDir, 'cache', 'backup'),
      instanceSecret: 'test-secret',
      secretFromEnv: false,
      version: 'test',
      storage: s3 ? { driver: 's3', location: 's3://test' } : { driver: 'local', location: projectsDir },
      dumpDatabase: file => dumps.dump(file),
    },
  )
  // Zotero and doi.org stand-ins that tests replace (no network in tests).
  const referenceFakes = {
    zotero: async (_url: string, _init: RequestInit): Promise<Response> => new Response('not faked', { status: 500 }),
    doi: async (_doi: string): Promise<string> => {
      throw new Error('not faked')
    },
    /** Crossref and arXiv for the literature search. */
    search: async (_url: string, _init: RequestInit): Promise<Response> => new Response('not faked', { status: 500 }),
  }
  const references = new ReferenceService({
    db,
    box,
    store,
    collab,
    history,
    projects,
    zotero: new ZoteroClient({ base: 'http://zotero.test', fetch: (url, init) => referenceFakes.zotero(url, init) }),
    fetchDoi: doi => referenceFakes.doi(doi),
    literature: new LiteratureSearch({ fetch: (url, init) => referenceFakes.search(url, init) }),
  })
  const gitBridge = new GitBridgeService({ db, store, collab, history, projects, dir: path.join(dataDir, 'git-bridge') })
  const builds = new CompileCoalescer()
  /** Tests replace this to serve linked-file URLs (the real fetcher refuses local addresses). */
  const linkedFakes = {
    url: async (url: string): Promise<{ data: Buffer; url: string }> => {
      throw new Error(`No fake for ${url}`)
    },
  }
  const linkedFiles = new LinkedFileService({
    db,
    store,
    collab,
    history,
    projects,
    outputsDir,
    compile: (projectId, userId) => buildProject({ projects, store, queue, collab, builds }, projectId, userId),
    fetchUrl: url => linkedFakes.url(url),
  })
  const accounts = new AccountService(db, auth, box)
  const app = await buildApp(
    { db, auth, accounts, projects, store, queue, collab, ai, aiSessions, skills, skillChats, history, review: new ReviewService({ db, collab, history, notifications }), convert: new ConvertService({ store, collab, projects, history, queue }), notifications, monitor, backup, references, gitBridge, templates: new TemplateService(db, store, collab), linkedFiles, builds, network },
    { logger: false, handleUpgrade: (req, socket, head) => collab.handleUpgrade(req, socket, head) },
  )
  return {
    app,
    network,
    tailscaleSocket,
    collab,
    ai,
    db,
    monitor,
    backup,
    referenceFakes,
    linkedFakes,
    outputsDir,
    gitBridge,
    dumps,
    store,
    snapshots,
    history,
    compiled,
    compileJobs,
    compiler,
    forgotten,
    projectsDir,
    dataDir,
    async close() {
      await s3?.close()
      await history.dispose()
      await collab.close()
      await app.close()
      await db.$client.end()
      await fs.rm(dataDir, { recursive: true, force: true })
    },
  }
}

/** Extract the session cookie(s) from a response so later requests can authenticate. */
export function cookieFrom(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie']
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : []
  return list.map(c => String(c).split(';')[0]).join('; ')
}
