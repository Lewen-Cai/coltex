import { Check } from 'lucide-react'
import { PASSWORD_RULES, PASSWORD_SCORE_MAX, passwordScore, passwordStrength, type PasswordRule } from '@coltex/shared'
import { t, tk } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const RULES: { id: PasswordRule; label: string }[] = [
  { id: 'length', label: tk('8 or more characters') },
  { id: 'upper', label: tk('An uppercase letter') },
  { id: 'lower', label: tk('A lowercase letter') },
  { id: 'digit', label: tk('A number') },
]

const LEVELS = [
  { label: '', bar: '', text: '' },
  { label: tk('Weak'), bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  { label: tk('Fair'), bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  { label: tk('Good'), bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { label: tk('Strong'), bar: 'bg-emerald-600', text: 'text-emerald-700 dark:text-emerald-400' },
]

/** The strength rating and the rules a new password must meet (the server checks the same, `@coltex/shared`). */
export function PasswordStrength({ password }: { password: string }) {
  const level = passwordStrength(password)
  const score = passwordScore(password)
  const { label, bar, text } = LEVELS[level]!
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        {/* One segment per point, so it fills as each rule is met. */}
        <div className="grid flex-1 grid-cols-6 gap-1" aria-hidden>
          {Array.from({ length: PASSWORD_SCORE_MAX }, (_, i) => (
            <span key={i} className={cn('h-1 rounded-full bg-muted transition-colors duration-200', i < score && bar)} />
          ))}
        </div>
        <span className={cn('min-w-10 text-right text-xs font-medium', text)} aria-live="polite">
          {label && t(label)}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {RULES.map(rule => {
          const met = PASSWORD_RULES[rule.id](password)
          return (
            <li key={rule.id} className={cn('flex items-center gap-1.5 transition-colors', met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
              <Check className={cn('size-3.5 shrink-0', !met && 'opacity-30')} />
              {t(rule.label)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
