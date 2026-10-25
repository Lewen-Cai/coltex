import type { TemplateField } from '@coltex/shared'
import { tk } from './i18n.ts'

/** The fields templates are listed under, in the order of the new-project dialog's filter. */
export const TEMPLATE_FIELDS: { id: TemplateField; label: string }[] = [
  { id: 'general', label: tk('General') },
  { id: 'cs', label: tk('Computing & electrical engineering') },
  { id: 'engineering', label: tk('Engineering') },
  { id: 'physics', label: tk('Physics') },
  { id: 'astronomy', label: tk('Astronomy') },
  { id: 'chemistry', label: tk('Chemistry') },
  { id: 'biology', label: tk('Life sciences') },
  { id: 'medicine', label: tk('Medicine') },
  { id: 'math', label: tk('Mathematics & statistics') },
  { id: 'economics', label: tk('Economics') },
  { id: 'social', label: tk('Social sciences & humanities') },
  { id: 'earth', label: tk('Earth & environment') },
]
