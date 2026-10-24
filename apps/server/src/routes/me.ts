import { and, asc, count, eq, isNotNull } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { LearnedWord, LearnedWords, LearnedWordsImport, LearnedWordsImported, AvatarHues, ThemeChoice, UserPreferences, UserPreferencesPatch } from '@coltex/shared'
import { requireUser } from '../auth/fastify.ts'
import { learnedWords, userPreferences } from '../db/schema.ts'
import type { Deps } from '../deps.ts'
import { BadRequestError } from '../errors.ts'

/** Generous for a personal dictionary; it is sent to the browser whenever the editor opens. */
const MAX_LEARNED_WORDS = 10_000

/** The signed-in user's own settings: interface preferences and the spelling dictionary. */
export const meRoutes: FastifyPluginAsyncZod<Deps> = async (app, { db }) => {
  const preferences = async (userId: string): Promise<UserPreferences> => {
    const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
    const theme = ThemeChoice.safeParse(row?.theme)
    // A theme that no longer exists reads as never chosen.
    return { theme: theme.success ? theme.data : null, avatarHue: row?.avatarHue ?? null }
  }

  app.get('/me/preferences', { schema: { response: { 200: UserPreferences } } }, async req => preferences(requireUser(req).id))

  app.put('/me/preferences', { schema: { body: UserPreferencesPatch, response: { 200: UserPreferences } } }, async req => {
    const userId = requireUser(req).id
    const set = Object.fromEntries(Object.entries(req.body).filter(([, v]) => v !== undefined))
    if (Object.keys(set).length) {
      await db
        .insert(userPreferences)
        .values({ userId, ...set })
        .onConflictDoUpdate({ target: userPreferences.userId, set: { ...set, updatedAt: new Date() } })
    }
    return preferences(userId)
  })

  // Everyone's chosen avatar colour, for drawing anyone's avatar and cursor (ids and hues only).
  app.get('/users/avatar-hues', { schema: { response: { 200: AvatarHues } } }, async req => {
    requireUser(req)
    const rows = await db
      .select({ userId: userPreferences.userId, hue: userPreferences.avatarHue })
      .from(userPreferences)
      .where(isNotNull(userPreferences.avatarHue))
    return Object.fromEntries(rows.map(r => [r.userId, r.hue!]))
  })

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
