import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AiMessageBody, AiSaveProposedSkill, AiSessionState, AiSkill, AiSkillBody, AiSkillImportResult, AiSkillSummary } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.ts'
import { buildProjectZip, isJunk } from '../projects/zip.ts'
import { cleanPath } from '../storage/paths.ts'
import {
  UPLOAD_LIMITS,
  parseSkillMarkdown,
  readSkillFiles,
  readSkillZip,
  skillMarkdown,
  type ParsedSkill,
} from '../ai/skills.ts'
import { attachment } from './archive.ts'
import { streamAiEvents } from './sse.ts'

const Ok = z.object({ ok: z.literal(true) })
const NameParams = z.object({ name: z.string().min(1).max(64) })
const FileParams = NameParams.extend({ '*': z.string().min(1) })
const ImportQuery = z.object({
  /** Overwrite skills of the same name. */
  replace: z.enum(['0', '1']).default('0'),
  /** The uploaded file's name: the skill's name when its SKILL.md has none. */
  filename: z.string().max(200).default('skill'),
})
// Separate files come base64-encoded in JSON, a third larger than the same bytes in a zip.
const IMPORT_LIMIT = Math.ceil((UPLOAD_LIMITS.maxTotalBytes * 4) / 3) + 1024 * 1024
const UploadedFiles = z.object({
  files: z
    .array(z.object({ path: z.string().min(1).max(1024), data: z.string() }))
    .min(1)
    .max(UPLOAD_LIMITS.maxFiles),
})

/**
 * AI skills: each person's own, for all their projects (Settings → AI skills),
 * and the built-in ones. Only people who have the AI agent can see or change them.
 */
export const skillRoutes: FastifyPluginAsyncZod<Deps> = async (app, { ai, skills, skillChats }) => {
  async function withAi(req: FastifyRequest) {
    const user = requireUser(req)
    const status = await ai.statusFor(user)
    if (!status.available) throw new ForbiddenError(status.reason ?? 'The AI agent is unavailable')
    return user
  }

  const personal = async (req: FastifyRequest): Promise<string> => (await withAi(req)).id

  /** A zip of one or more skill folders, files picked one by one or a folder (base64 in JSON), or a SKILL.md's text. */
  async function parseUpload(req: FastifyRequest<{ Querystring: z.infer<typeof ImportQuery> }>): Promise<{ skills: ParsedSkill[]; warnings: string[] }> {
    const fallback = req.query.filename.replace(/\.(zip|md|markdown)$/i, '').replace(/^skill$/i, '') || 'skill'
    if (Buffer.isBuffer(req.body)) return readSkillZip(req.body, fallback)
    const uploaded = UploadedFiles.safeParse(req.body)
    if (uploaded.success) {
      const files = new Map<string, Buffer>()
      let total = 0
      for (const f of uploaded.data.files) {
        const p = cleanPath(f.path)
        if (isJunk(p)) continue
        const data = Buffer.from(f.data, 'base64')
        total += data.length
        if (total > UPLOAD_LIMITS.maxTotalBytes) throw new BadRequestError(`The files add up to more than ${UPLOAD_LIMITS.maxTotalBytes / 1048576} MB`)
        files.set(p, data)
      }
      const warnings: string[] = []
      return { skills: readSkillFiles(files, fallback, warnings, true), warnings }
    }
    const markdown = (req.body as { markdown?: unknown } | undefined)?.markdown
    if (typeof markdown !== 'string' || !markdown.trim()) throw new BadRequestError('Expected a SKILL.md or a zip file')
    if (markdown.length > 200_000) throw new BadRequestError('The file is too large for a skill')
    const warnings: string[] = []
    return { skills: [parseSkillMarkdown(markdown, fallback, warnings)], warnings }
  }

  async function download(userId: string, name: string, reply: FastifyReply) {
    const skill = await skills.full(userId, name)
    const md = skillMarkdown(skill)
    reply.header('cache-control', 'no-store')
    if (!Object.keys(skill.files).length) {
      return reply.type('text/markdown; charset=utf-8').header('content-disposition', attachment(`${skill.name}.md`)).send(md)
    }
    const files = [{ path: `${skill.name}/SKILL.md`, data: Buffer.from(md) }]
    for (const [p, text] of Object.entries(skill.files)) files.push({ path: `${skill.name}/${p}`, data: Buffer.from(text) })
    return reply.type('application/zip').header('content-disposition', attachment(`${skill.name}.zip`)).send(buildProjectZip(files, []))
  }

  /** One reference file's text, for reading it on the skills page. */
  async function referenceFile(userId: string, name: string, file: string, reply: FastifyReply) {
    const text = (await skills.full(userId, name)).files[cleanPath(file)]
    if (text === undefined) throw new NotFoundError('File not found')
    return reply.header('cache-control', 'no-store').type('text/plain; charset=utf-8').send(text)
  }

  // Their own skills and the built-in ones (read-only).
  app.get('/me/ai/skills', { schema: { response: { 200: z.array(AiSkill) } } }, async req => skills.listWithBuiltins((await withAi(req)).id))

  // The AI panel's "/" menu: the built-in skills and their own (one of theirs hides a built-in one).
  app.get('/me/ai/skill-menu', { schema: { response: { 200: z.array(AiSkillSummary) } } }, async req =>
    skills.menu((await withAi(req)).id),
  )

  app.post('/me/ai/skills', { schema: { body: AiSkillBody, response: { 201: AiSkill } } }, async (req, reply) =>
    reply.code(201).send(await skills.create(await personal(req), req.body)),
  )

  app.put('/me/ai/skills/:name', { schema: { params: NameParams, body: AiSkillBody, response: { 200: AiSkill } } }, async req =>
    skills.update(await personal(req), req.params.name, req.body),
  )

  app.delete('/me/ai/skills/:name', { schema: { params: NameParams, response: { 200: Ok } } }, async req => {
    await skills.remove(await personal(req), req.params.name)
    return { ok: true as const }
  })

  app.get('/me/ai/skills/:name/download', { schema: { params: NameParams } }, async (req, reply) =>
    download(await personal(req), req.params.name, reply),
  )

  app.get('/me/ai/skills/:name/files/*', { schema: { params: FileParams } }, async (req, reply) =>
    referenceFile(await personal(req), req.params.name, req.params['*'], reply),
  )

  app.post(
    '/me/ai/skills/import',
    { bodyLimit: IMPORT_LIMIT, schema: { querystring: ImportQuery, response: { 201: AiSkillImportResult } } },
    async (req, reply) => {
      const userId = await personal(req)
      const { skills: parsed, warnings } = await parseUpload(req)
      return reply.code(201).send({ skills: await skills.import(userId, parsed, req.query.replace === '1'), warnings })
    },
  )

  // ---- The skills chat (Settings → AI skills) --------------------------------------

  app.get('/me/ai/skill-chat', { schema: { response: { 200: AiSessionState } } }, async req =>
    (await skillChats.get((await withAi(req)).id)).state(),
  )

  app.get('/me/ai/skill-chat/events', async (req, reply) => {
    const chat = await skillChats.get((await withAi(req)).id)
    streamAiEvents(req, reply, send => chat.subscribe(send))
  })

  app.post('/me/ai/skill-chat/messages', { schema: { body: AiMessageBody, response: { 202: Ok } } }, async (req, reply) => {
    const user = await withAi(req)
    await (await skillChats.get(user.id)).send(req.body, user)
    return reply.code(202).send({ ok: true })
  })

  app.post('/me/ai/skill-chat/abort', { schema: { response: { 200: Ok } } }, async req => {
    const chat = await skillChats.get((await withAi(req)).id)
    chat.abort()
    return { ok: true as const }
  })

  app.post('/me/ai/skill-chat/reset', { schema: { response: { 200: AiSessionState } } }, async req =>
    (await skillChats.reset((await withAi(req)).id)).state(),
  )

  app.post(
    '/me/ai/skill-chat/skills/:item',
    { schema: { params: z.object({ item: z.string().min(1).max(64) }), body: AiSaveProposedSkill, response: { 201: AiSkill } } },
    async (req, reply) => {
      const user = await withAi(req)
      return reply.code(201).send(await (await skillChats.get(user.id)).saveProposedSkill(req.params.item, req.body, user))
    },
  )
}
