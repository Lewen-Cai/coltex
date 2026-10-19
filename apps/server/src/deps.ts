import type { NetworkService } from './network/service.ts'
import type { AiService } from './ai/service.ts'
import type { AiSessionManager } from './ai/session.ts'
import type { SkillStore } from './ai/skills.ts'
import type { SkillWorkshops } from './ai/workshop.ts'
import type { AccountService } from './auth/accounts.ts'
import type { Auth } from './auth/auth.ts'
import type { BackupService } from './backup/service.ts'
import type { CollabHooks } from './collab/server.ts'
import type { CompileQueue } from './compile-queue.ts'
import type { ConvertService } from './convert/service.ts'
import type { Db } from './db/client.ts'
import type { HistoryService } from './history/service.ts'
import type { MonitorHistory } from './monitor-history.ts'
import type { NotificationService } from './notifications/service.ts'
import type { ProjectService } from './projects/service.ts'
import type { TemplateService } from './projects/templates.ts'
import type { LinkedFileService } from './projects/linked-files.ts'
import type { CompileCoalescer } from './routes/compile.ts'
import type { ReferenceService } from './references/service.ts'
import type { ReviewService } from './review/service.ts'
import type { ProjectStore } from './storage/types.ts'

/** Services shared by all route plugins. */
export type Deps = {
  db: Db
  auth: Auth
  accounts: AccountService
  projects: ProjectService
  store: ProjectStore
  queue: Pick<CompileQueue, 'compile' | 'synctex' | 'stats' | 'texLookup'>
  collab: CollabHooks
  ai: AiService
  aiSessions: AiSessionManager
  /** AI skills, personal and per project. */
  skills: SkillStore
  /** The skills chat in Settings → AI skills, one per person. */
  skillChats: SkillWorkshops
  history: HistoryService
  review: ReviewService
  convert: ConvertService
  notifications: NotificationService
  monitor: MonitorHistory
  backup: BackupService
  references: ReferenceService
  templates: TemplateService
  linkedFiles: LinkedFileService
  /** One build per project at a time, shared by everything that builds for a person. */
  builds: CompileCoalescer
  /** The public address and the Tailscale container. */
  network: NetworkService
}
