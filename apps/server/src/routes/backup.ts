import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { BackupConfig, BackupConfigPatch, BackupRun, BackupState } from '@coltex/shared'
import { requireAdmin } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'

/** Admin: where files are stored, and WebDAV backups. */
export const backupRoutes: FastifyPluginAsyncZod<Deps> = async (app, { backup }) => {
  app.get('/admin/backup', { schema: { response: { 200: BackupState } } }, async req => {
    requireAdmin(req)
    return backup.state()
  })

  app.put('/admin/backup', { schema: { body: BackupConfigPatch, response: { 200: BackupConfig } } }, async req => {
    requireAdmin(req)
    return backup.save(req.body)
  })

  // Check the connection with the form's values before saving them.
  app.post('/admin/backup/test', { schema: { body: BackupConfigPatch, response: { 200: z.object({ ok: z.literal(true) }) } } }, async req => {
    requireAdmin(req)
    await backup.test(req.body)
    return { ok: true as const }
  })

  app.post('/admin/backup/run', { schema: { response: { 200: BackupRun } } }, async req => {
    requireAdmin(req)
    return backup.run('manual')
  })
}
