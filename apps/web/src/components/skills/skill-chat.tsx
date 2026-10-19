import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, BookOpen, Loader2, PenLine, Sparkles, Square, SquarePen, Wand2 } from 'lucide-react'
import { aiPick, useAiStatus, useSkillChat } from '@/lib/ai'
import { t } from '@/lib/i18n'
import { Item, ModelPicker, SessionStatus } from '@/components/AiPanel'
import { Button } from '@/components/ui/button'

/**
 * The skills chat beside the library (Settings → AI skills): the agent,
 * guided by the built-in skill-creator, helps write and improve the
 * person's skills; drafts are saved to their skills from the cards.
 */
export function SkillChat({ onSaved }: { onSaved: () => void }) {
  const chat = useSkillChat()
  const { status, choose } = useAiStatus()
  const { state, error, busy } = chat
  const [text, setText] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const running = state?.running ?? false

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.items])

  const submit = (message = text) => {
    const trimmed = message.trim()
    if (!trimmed || running) return
    void chat.send({ text: trimmed, preference: aiPick(status) })
    setText('')
  }

  const suggestions = [
    { text: t('Help me write a skill for polishing my paper’s abstract.'), icon: PenLine },
    { text: t('Turn my target journal’s author guidelines into a skill.'), icon: BookOpen },
    { text: t('Look at my skills and suggest how to improve them.'), icon: Wand2 },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-center border-b px-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => void chat.reset()} disabled={busy || running || !state?.items.length}>
          <SquarePen /> {t('New chat')}
        </Button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {state && state.items.length === 0 && (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Sparkles className="size-5" />
              </span>
              <p className="font-semibold">{t('Create a skill with the AI agent')}</p>
            </div>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => submit(s.text)}
                  className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left text-sm text-foreground/85 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <s.icon className="size-3.5 shrink-0 text-primary/80" />
                  <span className="flex-1">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
        {state?.items.map(item => (
          <Item
            key={item.id}
            item={item}
            skillScopes={['personal']}
            onSaveSkill={async (body, scope, replace) => {
              await chat.saveSkill(item.id, { ...body, scope, replace })
              onSaved()
            }}
          />
        ))}
        {running && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> {t('Working…')}
          </div>
        )}
      </div>

      {error && <div className="border-t border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm break-words text-destructive">{error}</div>}

      <div className="shrink-0 border-t p-2">
        <div className="rounded-lg border bg-background transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            rows={Math.min(6, Math.max(2, text.split('\n').length))}
            placeholder={t('Describe the skill you want, or paste text to try a draft on…')}
            className="block min-h-0 w-full resize-none bg-transparent px-2.5 pt-2 text-sm outline-none"
          />
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            {status && <ModelPicker status={status} onChoose={choose} />}
            <span className="flex-1" />
            {running ? (
              <Button variant="secondary" size="icon-sm" onClick={() => void chat.abort()} aria-label={t('Stop')}>
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button size="icon-sm" onClick={() => submit()} disabled={!text.trim() || busy} aria-label={t('Send')}>
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
        {status && <SessionStatus status={status} state={state} />}
      </div>
    </div>
  )
}
