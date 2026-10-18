import { and, asc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { customAlphabet } from 'nanoid'
import { z } from 'zod'
import { ProjectStateBody, Tag, TagBody, TagPatch, TagProjectsBody } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { projectMembers, projectTags, tags } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { ConflictError, NotFoundError } from '../errors.ts'

const tagId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)
const TagParams = z.object({ id: z.string().min(1).max(32) })
/** Plenty for sorting a project list. */
const MAX_TAGS = 200

/** Postgres unique violation (a tag with that name already exists). */
const isUniqueViolation = (err: unknown) => (err as { cause?: { code?: string }; code?: string })?.cause?.code === '23505' || (err as { code?: string })?.code === '23505'

/**
 * Each user's own organisation of their project list, as in Overleaf:
 * archive, trash and tags. None of it is visible to other members.
 */
export const projectListRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db, projects }) => {
  app.patch('/me/projects', { schema: { body: ProjectStateBody } }, async (req, reply) => {
    const { projectIds, archived, trashed } = req.body
    await projects.setListState(requireUser(req).id, projectIds, archived !== undefined ? { archived } : { trashed })
    return reply.code(204).send()
  })

  const listTags = async (userId: string): Promise<Tag[]> => {
    const rows = await db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name))
    const links = rows.length
      ? await db
          .select({ tagId: projectTags.tagId, projectId: projectTags.projectId })
          .from(projectTags)
          .where(inArray(projectTags.tagId, rows.map(r => r.id)))
      : []
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      projectIds: links.filter(l => l.tagId === r.id).map(l => l.projectId),
    }))
  }

  /** The tag, if it is the user's; otherwise 404. */
  const ownTag = async (userId: string, id: string) => {
    const [row] = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)))
    if (!row) throw new NotFoundError('Tag not found')
    return row
  }

  /** Projects can only be tagged by their members. */
  const requireMember = async (userId: string, projectIds: string[]) => {
    const ids = [...new Set(projectIds)]
    const rows = await db
      .select({ id: projectMembers.projectId })
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, userId), inArray(projectMembers.projectId, ids)))
    if (rows.length !== ids.length) throw new NotFoundError('Project not found')
    return ids
  }

  app.get('/me/tags', { schema: { response: { 200: z.array(Tag) } } }, req => listTags(requireUser(req).id))

  app.post('/me/tags', { schema: { body: TagBody, response: { 201: Tag } } }, async (req, reply) => {
    const userId = requireUser(req).id
    if ((await db.$count(tags, eq(tags.userId, userId))) >= MAX_TAGS) throw new ConflictError('You have too many tags')
    try {
      const [row] = await db.insert(tags).values({ id: tagId(), userId, ...req.body }).returning()
      return reply.code(201).send({ id: row!.id, name: row!.name, color: row!.color, projectIds: [] })
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('A tag with that name already exists')
      throw err
    }
  })

  app.patch('/me/tags/:id', { schema: { params: TagParams, body: TagPatch } }, async (req, reply) => {
    const userId = requireUser(req).id
    await ownTag(userId, req.params.id)
    try {
      if (req.body.name !== undefined || req.body.color !== undefined) {
        await db.update(tags).set(req.body).where(eq(tags.id, req.params.id))
      }
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('A tag with that name already exists')
      throw err
    }
    return reply.code(204).send()
  })

  app.delete('/me/tags/:id', { schema: { params: TagParams } }, async (req, reply) => {
    const userId = requireUser(req).id
    await ownTag(userId, req.params.id)
    // The projects stay; only the label goes.
    await db.delete(tags).where(eq(tags.id, req.params.id))
    return reply.code(204).send()
  })

  app.post('/me/tags/:id/projects', { schema: { params: TagParams, body: TagProjectsBody } }, async (req, reply) => {
    const userId = requireUser(req).id
    await ownTag(userId, req.params.id)
    const ids = await requireMember(userId, req.body.projectIds)
    await db
      .insert(projectTags)
      .values(ids.map(projectId => ({ tagId: req.params.id, projectId })))
      .onConflictDoNothing()
    return reply.code(204).send()
  })

  app.delete('/me/tags/:id/projects', { schema: { params: TagParams, body: TagProjectsBody } }, async (req, reply) => {
    const userId = requireUser(req).id
    await ownTag(userId, req.params.id)
    await db
      .delete(projectTags)
      .where(and(eq(projectTags.tagId, req.params.id), inArray(projectTags.projectId, req.body.projectIds)))
    return reply.code(204).send()
  })
}
