import { and, asc, count, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { LearnedWord, LearnedWords, LearnedWordsImport, LearnedWordsImported } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { learnedWords } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError } from '../errors.ts'

/** Generous for a personal dictionary; it is sent to the browser whenever the editor opens. */
const MAX_LEARNED_WORDS = 10_000

/** The signed-in user's own settings: the spelling dictionary. */
export const meRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db }) => {
  app.get('/me/dictionary', { schema: { response: { 200: LearnedWords } } }, async req => {
    const rows = await db
      .select({ word: learnedWords.word })
      .from(learnedWords)
      .where(eq(learnedWords.userId, requireUser(req).id))
      .orderBy(asc(learnedWords.word))
    return { words: rows.map(r => r.word) }
  })

  app.post('/me/dictionary', { schema: { body: LearnedWord } }, async (req, reply) => {
    const userId = requireUser(req).id
    const [{ n }] = await db.select({ n: count() }).from(learnedWords).where(eq(learnedWords.userId, userId))
    if (n >= MAX_LEARNED_WORDS) throw new BadRequestError('Your dictionary is full')
    await db.insert(learnedWords).values({ userId, word: req.body.word }).onConflictDoNothing()
    return reply.code(204).send()
  })

  app.post('/me/dictionary/import', { schema: { body: LearnedWordsImport, response: { 200: LearnedWordsImported } } }, async req => {
    const userId = requireUser(req).id
    const ok = req.body.words.map(w => w.trim()).filter(w => LearnedWord.safeParse({ word: w }).success)
    const valid = new Set(ok)
    const existing = new Set(
      (await db.select({ word: learnedWords.word }).from(learnedWords).where(eq(learnedWords.userId, userId))).map(r => r.word),
    )
    const fresh = [...valid].filter(w => !existing.has(w))
    if (existing.size + fresh.length > MAX_LEARNED_WORDS) throw new BadRequestError('Your dictionary is full')
    if (fresh.length) await db.insert(learnedWords).values(fresh.map(word => ({ userId, word }))).onConflictDoNothing()
    return { added: fresh.length, skipped: req.body.words.length - ok.length }
  })

  app.delete('/me/dictionary/all', async (req, reply) => {
    await db.delete(learnedWords).where(eq(learnedWords.userId, requireUser(req).id))
    return reply.code(204).send()
  })

  app.delete('/me/dictionary', { schema: { body: LearnedWord } }, async (req, reply) => {
    await db
      .delete(learnedWords)
      .where(and(eq(learnedWords.userId, requireUser(req).id), eq(learnedWords.word, req.body.word)))
    return reply.code(204).send()
  })
}
