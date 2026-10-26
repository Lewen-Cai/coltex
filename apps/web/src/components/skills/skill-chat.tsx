import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, BookOpen, Loader2, PenLine, Sparkles, Square, SquarePen, Wand2 } from 'lucide-react'
import { aiPick, useAiStatus, useSkillChat } from '@/lib/ai'
import { useAiAllowance } from '@/lib/ai-limits'
import { t } from '@/lib/i18n'
import { Item, ModelPicker, SessionStatus, ToolGroup, groupItems } from '@/components/AiPanel'
import { Button } from '@/components/ui/button'
import { useComposerHeight } from '@/components/composer-height'

/**
 * The skills chat beside the library (Settings → AI skills): the agent,
 * guided by the built-in skill-creator, helps write and improve the
 * person's skills; drafts are saved to their skills from the cards.
 */
export function SkillChat({ onSaved, prefill }: { onSaved: () => void; prefill?: { text: string; key: number } }) {
  const chat = useSkillChat()
  const { status, choose } = useAiStatus()
  const { state, error, busy } = chat
  const [text, setText] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const box = useComposerHeight('skill-chat', text, input)
  const composer = useRef<HTMLDivElement>(null)
  // The composer floats over the end of the conversation: the list keeps room for it.
  const [composerHeight, setComposerHeight] = useState(0)
  const running = state?.running ?? false
  const allowance = useAiAllowance(running)

  // "Improve in chat" on a skill: start the message for them.
  useEffect(() => {
    if (!prefill) return
    setText(prefill.text)
    const el = input.current
    if (el) {
      el.focus()
      el.setSelectionRange(prefill.text.length, prefill.text.length)
    }
  }, [prefill])

  useLayoutEffect(() => {
    const el = composer.current
    if (!el) return
    const observer = new ResizeObserver(() => setComposerHeight(el.offsetHeight))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.items, composerHeight])

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
      <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
        <Sparkles className="size-4 text-primary" />
        <h2 className="flex-1 truncate text-sm font-semibold">{t('Create with AI')}</h2>
        <Button variant="ghost" size="sm" onClick={() => void chat.reset()} disabled={busy || running || !state?.items.length}>
          <SquarePen /> {t('New chat')}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} className="h-full overflow-y-auto px-4 pt-4 text-sm" style={{ paddingBottom: composerHeight + 16 }}>
          <div className="mx-auto max-w-3xl space-y-3">
            {state && state.items.length === 0 && (
              <div className="mx-auto max-w-md space-y-3 pt-10">
                <p className="text-center font-semibold">{t('Create a skill with the AI agent')}</p>
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
                      <s.icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
            {state &&
              groupItems(state.items).map(entry =>
                entry.kind === 'tools' ? (
                  <ToolGroup key={entry.id} items={entry.items} />
                ) : (
                  <Item
                    key={entry.item.id}
                    item={entry.item}
                    onSaveSkill={async (body, replace) => {
                      await chat.saveSkill(entry.item.id, { ...body, replace })
                      onSaved()
                    }}
                  />
                ),
              )}
            {running && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> {t('Working…')}
              </div>
            )}
          </div>
        </div>

        <div ref={composer} className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            {error && (
              <div className="mb-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-sm break-words text-destructive">{error}</div>
            )}
            <div className="relative rounded-xl border bg-card shadow-lg transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              {box.handle}
              <textarea
                ref={input}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    submit()
                  }
                }}
                rows={2}
                style={box.style}
                placeholder={t('Describe the skill you want, or paste text to try a draft on…')}
                className="block min-h-0 w-full bg-transparent px-3 pt-2.5 text-sm outline-none"
              />
              <div className="flex items-center gap-2 px-1.5 pb-1.5">
                {status && <ModelPicker status={status} onChoose={choose} />}
                <div className="min-w-0 flex-1">
                  {status && <SessionStatus status={status} state={state} allowance={allowance} className="pt-0" />}
                </div>
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
          </div>
        </div>
      </div>
    </div>
  )
}
