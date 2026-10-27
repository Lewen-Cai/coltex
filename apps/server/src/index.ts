import fs from 'node:fs/promises'
import path from 'node:path'
import { DbCredentialStore, SecretBox } from './ai/credentials.ts'
import { AiService } from './ai/service.ts'
import { AiSessionManager } from './ai/session.ts'
import { ConversationStore } from './ai/conversations.ts'
import { SkillStore } from './ai/skills.ts'
import { SkillChatStore, SkillWorkshops } from './ai/workshop.ts'
import { buildApp } from './app.ts'
import { dumpDatabase } from './backup/postgres.ts'
import { BackupService } from './backup/service.ts'
import { ReferenceService } from './references/service.ts'
import { GitBridgeService } from './gitbridge/service.ts'
import { TemplateService } from './projects/templates.ts'
import { LinkedFileService } from './projects/linked-files.ts'
import { CompileCoalescer, buildProject } from './routes/compile.ts'
import { AccountService } from './auth/accounts.ts'
import { createAuth } from './auth/auth.ts'
import { IpPlaces } from './auth/ip-place.ts'
import { RedisCounters, SignInGuard } from './auth/sign-in-guard.ts'
import { Redis } from 'ioredis'
import { CompileQueue } from './compile-queue.ts'
import { config } from './config.ts'
import { DocService } from './collab/docs.ts'
import { ConvertService } from './convert/service.ts'
import { WordExport } from './convert/word.ts'
import { GroupService } from './groups/service.ts'
import { CollabServer } from './collab/server.ts'
import { createDb, runMigrations } from './db/client.ts'
import { HistoryService } from './history/service.ts'
import { MonitorHistory } from './monitor-history.ts'
import { NetworkService } from './network/service.ts'
import { TailscaleClient } from './network/tailscale.ts'
import { TailscaleDaemon } from './network/daemon.ts'
import { CloudflareTunnel } from './network/cloudflare.ts'
import { NotificationService } from './notifications/service.ts'
import { SnapshotService } from './history/snapshots.ts'
import { ProjectService } from './projects/service.ts'
import { ReviewService } from './review/service.ts'
import { createStore, storageLocation } from './storage/index.ts'

const db = createDb(config.databaseUrl)
await runMigrations(db)

const store = await createStore(config)
const snapshots = new SnapshotService(config.historyDir, store)
// Everything a deleted project (or a deleted user's project) leaves behind.
const projects = new ProjectService(db, store, async id => {
  collab.closeProject(id)
  aiSessions.dropProject(id)
  history.dropProject(id)
  await snapshots.deleteProject(id)
  await gitBridge.deleteProject(id)
  await fs.rm(path.join(config.outputsDir, id), { recursive: true, force: true })
  // The compile directory is only visible to the compiler; it also removes
  // outputs of a build that was still running.
  await queue.forget(id).catch(err => console.error(`[cleanup] could not queue cleanup of ${id}:`, err))
})
const box = new SecretBox(config.secret)
const tailscaled = new TailscaleDaemon({ stateDir: config.tailscaleStateDir, binary: config.tailscaled })
const network = new NetworkService({
  db,
  envPublicUrl: config.envPublicUrl,
  tailscale: new TailscaleClient({ socket: tailscaled.socket, target: config.tailscaleTarget, hostname: config.tailscaleHostname }),
  daemon: tailscaled,
  cloudflare: new CloudflareTunnel({ binary: config.cloudflared, target: config.tailscaleTarget, metrics: config.cloudflaredMetrics }),
  box,
})
const notifications = new NotificationService(db)
const places = new IpPlaces(config.ip2regionDir)
const signIns = new SignInGuard({ db, counters: new RedisCounters(new Redis(config.redisUrl)), places, notifications, secret: config.secret })
setInterval(() => void signIns.prune().catch(err => console.error('[sign-ins] prune failed:', err)), 60 * 60 * 1000).unref()
const auth = createAuth({
  db,
  secret: config.secret,
  baseURL: config.publicUrl,
  trustedOrigins: config.trustedOrigins,
  extraOrigins: () => network.extraOrigins(),
  userDeletion: projects,
  rateLimitStorage: signIns.rateLimitStorage(),
})
const queue = new CompileQueue(config.redisUrl)
queue.beforeCompile = id => store.syncForCompile(id)
const history = new HistoryService({ db, snapshots, store, projects })
const collab = new CollabServer({
  auth,
  projects,
  store,
  docs: new DocService(db),
  onEdit: (projectId, userId) => history.noteChange(projectId, userId),
})
history.setCollab(collab)
const ai = new AiService(db, new DbCredentialStore(db, box))
await ai.init()
const monitor = new MonitorHistory(db, () => queue.stats().then(s => s.containers))
queue.onBuild = (ms, status) => void monitor.recordBuild(ms, status)
monitor.start()
const backup = new BackupService(
  { db, store, collab, snapshots, gitBridge: { bundle: (id, file) => gitBridge.bundle(id, file) }, box },
  {
    tmpDir: path.join(config.cacheDir, 'backup'),
    instanceSecret: config.secret,
    secretFromEnv: config.secretFromEnv,
    version: config.version,
    storage: storageLocation(config),
    dumpDatabase: file => dumpDatabase(config.databaseUrl, file, config.pgDump),
  },
)
backup.start()
const skills = new SkillStore(db)
const skillChats = new SkillWorkshops({ ai, skills, chats: new SkillChatStore(db) })
const accounts = new AccountService(db, auth, box)
const gitBridge = new GitBridgeService({ db, store, collab, history, projects, dir: config.gitBridgeDir })
const builds = new CompileCoalescer()
const linkedFiles = new LinkedFileService({
  db,
  store,
  collab,
  history,
  projects,
  outputsDir: config.outputsDir,
  compile: (projectId, userId) => buildProject({ projects, store, queue, collab, builds }, projectId, userId),
})
const references = new ReferenceService({ db, box, store, collab, history, projects })
const aiSessions = new AiSessionManager({ ai, store, queue, collab, history, projects, references, linkedFiles, outputsDir: config.outputsDir, conversations: new ConversationStore(db), skills })
const templates = new TemplateService(db, store, collab)
const app = await buildApp(
  { db, auth, accounts, projects, store, queue, collab, ai, aiSessions, skills, skillChats, history, review: new ReviewService({ db, collab, history, notifications }), convert: new ConvertService({ store, collab, projects, history, queue, templates }), word: new WordExport({ store, collab, queue, outputsDir: config.outputsDir }), groups: new GroupService(db, notifications, { closeUser: (projectId, userId) => collab.closeUser(projectId, userId) }), notifications, monitor, backup, references, gitBridge, templates, linkedFiles, builds, network, signIns, places },
  { handleUpgrade: (req, socket, head) => collab.handleUpgrade(req, socket, head) },
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    // Record pending edits as a version before going down.
    await history.flushAll()
    await network.dispose()
    await monitor.stop()
    backup.stop()
    await collab.close()
    await app.close()
    await queue.close()
    await db.$client.end()
    process.exit(0)
  })
}

await app.listen({ port: config.port, host: config.host })

// The built-in Tailscale, if it's turned on. `cli.ts tailscale` changes the setting and sends SIGUSR2.
await network.apply().catch(err => app.log.error(err, 'tailscale'))
process.on('SIGUSR2', () => void network.apply().catch(err => app.log.error(err, 'tailscale')))
await fs.mkdir(config.cacheDir, { recursive: true })
// Builds run as users of their projects' own in the compiler: the sources are closed to them
// (the compiler's worker copies them), the outputs only passable (each project's is shared
// with its own group). Owned by this server's user, so it may set them.
for (const [dir, mode] of [[config.projectsDir, 0o700], [config.outputsDir, 0o711]] as const) {
  await fs.mkdir(dir, { recursive: true })
  await fs.chmod(dir, mode).catch(err => app.log.warn(err, `could not restrict ${dir}`))
}
await fs.writeFile(path.join(config.cacheDir, 'server.pid'), String(process.pid))
