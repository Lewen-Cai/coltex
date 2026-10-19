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
import { TemplateService } from './projects/templates.ts'
import { LinkedFileService } from './projects/linked-files.ts'
import { CompileCoalescer, buildProject } from './routes/compile.ts'
import { AccountService } from './auth/accounts.ts'
import { createAuth } from './auth/auth.ts'
import { CompileQueue } from './compile-queue.ts'
import { config } from './config.ts'
import { DocService } from './collab/docs.ts'
import { ConvertService } from './convert/service.ts'
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
const auth = createAuth({
  db,
  secret: config.secret,
  baseURL: config.publicUrl,
  trustedOrigins: config.trustedOrigins,
  extraOrigins: () => network.extraOrigins(),
  userDeletion: projects,
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
const notifications = new NotificationService(db)
const monitor = new MonitorHistory(db, () => queue.stats().then(s => s.containers))
queue.onBuild = (ms, status) => void monitor.recordBuild(ms, status)
monitor.start()
const backup = new BackupService(
  { db, store, collab, snapshots, box },
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
const aiSessions = new AiSessionManager({ ai, store, queue, collab, history, projects, outputsDir: config.outputsDir, conversations: new ConversationStore(db), skills })
const accounts = new AccountService(db, auth, box)
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
const app = await buildApp(
  { db, auth, accounts, projects, store, queue, collab, ai, aiSessions, skills, skillChats, history, review: new ReviewService({ db, collab, history, notifications }), convert: new ConvertService({ store, collab, projects, history, queue }), notifications, monitor, backup, references: new ReferenceService({ db, box, store, collab, history, projects }), templates: new TemplateService(db, store, collab), linkedFiles, builds, network },
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
await fs.writeFile(path.join(config.cacheDir, 'server.pid'), String(process.pid))
