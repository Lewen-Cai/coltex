// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/extensions/spelling/spelling-suggestions.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.
//
// ColTex: the menu is drawn with ColTex's own tokens instead of Overleaf's
// Bootstrap dropdown, with the same items: suggestions, "Add to dictionary",
// and the spell-check language.

import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import { BookPlus, Languages } from 'lucide-react'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { spellLanguageName } from '../languages'
import type { SpellChecker, Word } from './spellchecker'

const ITEMS_TO_SHOW = 8

type SpellingSuggestionsProps = {
  word: Word
  spellCheckLanguage?: string
  spellChecker?: SpellChecker | null
  handleClose: (focus?: boolean) => void
  handleLearnWord: () => void
  handleCorrectWord: (text: string) => void
}

export const SpellingSuggestions: FC<SpellingSuggestionsProps> = ({
  word,
  spellCheckLanguage,
  spellChecker,
  handleClose,
  handleLearnWord,
  handleCorrectWord,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [waiting, setWaiting] = useState(true)
  const [active, setActive] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    spellChecker
      ?.suggest(word.text)
      .then(result => {
        if (cancelled) return
        setSuggestions(result.suggestions.slice(0, ITEMS_TO_SHOW))
        setWaiting(false)
      })
      .catch(error => {
        console.error(error)
        if (!cancelled) setWaiting(false)
      })
    return () => {
      cancelled = true
    }
  }, [word, spellChecker, spellCheckLanguage])

  // Focus the menu so the keyboard works right away.
  useEffect(() => {
    menuRef.current?.focus({ preventScroll: true })
  }, [])

  if (!spellCheckLanguage) {
    return null
  }

  // The actions, in keyboard order: suggestions, then "Add to dictionary".
  const actions = [...suggestions.map(s => () => handleCorrectWord(s)), handleLearnWord]
  const learnIndex = actions.length - 1

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      aria-label={t('Spelling suggestions')}
      className="min-w-48 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95"
      onMouseDown={event => event.preventDefault()}
      onBlur={event => {
        // Clicking elsewhere (outside the editor too) closes the menu.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) handleClose(false)
      }}
      onKeyDown={event => {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            setActive(i => (i + 1) % actions.length)
            break
          case 'ArrowUp':
            event.preventDefault()
            setActive(i => (i - 1 + actions.length) % actions.length)
            break
          case 'Home':
            event.preventDefault()
            setActive(0)
            break
          case 'End':
            event.preventDefault()
            setActive(learnIndex)
            break
          case 'Enter':
          case ' ':
            event.preventDefault()
            actions[Math.min(active, learnIndex)]?.()
            break
          case 'Escape':
          case 'Tab':
            event.preventDefault()
            handleClose()
            break
        }
      }}
    >
      {waiting ? (
        <div className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
          <Spinner className="size-3.5" /> {t('Looking for suggestions…')}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-2 py-1.5 text-muted-foreground">{t('No suggestions')}</div>
      ) : (
        suggestions.map((suggestion, i) => (
          <MenuItem key={suggestion} active={active === i} onHover={() => setActive(i)} onClick={() => handleCorrectWord(suggestion)}>
            <span className="font-medium">{suggestion}</span>
          </MenuItem>
        ))
      )}
      <div role="separator" className="-mx-1 my-1 h-px bg-border" />
      <MenuItem active={active === learnIndex} onHover={() => setActive(learnIndex)} onClick={handleLearnWord}>
        <BookPlus className="size-4 text-muted-foreground" />
        {t('Add to dictionary')}
      </MenuItem>
      <div className="mt-1 flex items-center gap-2 border-t px-2 pt-1.5 pb-0.5 text-xs text-muted-foreground">
        <Languages className="size-3.5" />
        {spellLanguageName(spellCheckLanguage)}
      </div>
    </div>
  )
}

const MenuItem: FC<{ active: boolean; onHover: () => void; onClick: () => void; children: ReactNode }> = ({
  active,
  onHover,
  onClick,
  children,
}) => (
  <button
    type="button"
    role="menuitem"
    tabIndex={-1}
    onMouseEnter={onHover}
    onClick={event => {
      event.preventDefault()
      onClick()
    }}
    className={cn(
      'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none select-none',
      active && 'bg-accent text-accent-foreground',
    )}
  >
    {children}
  </button>
)
