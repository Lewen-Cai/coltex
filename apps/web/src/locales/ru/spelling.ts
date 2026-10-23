// Russian messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': 'Варианты написания',
  'Looking for suggestions…': 'Поиск вариантов…',
  'No suggestions': 'Нет вариантов',
  'Add to dictionary': 'Добавить в словарь',

  // Settings: dictionary
  Dictionary: 'Словарь',
  'Your dictionary is empty': 'Ваш словарь пуст',
  'Remove “{word}”': 'Удалить «{word}»',
  'Remove from dictionary': 'Удалить из словаря',
  'One word, without spaces': 'Одно слово без пробелов',
  Export: 'Экспорт',
  'Remove all': 'Удалить все',
  'Find or add a word': 'Найти или добавить слово',
  'Import…': 'Импорт…',
  '“{word}” isn’t in your dictionary.': 'Слова «{word}» нет в вашем словаре.',
  '{shown} of {total}': '{shown} из {total}',
  '{n} word': 'Слов: {n}',
  '{n} words': 'Слов: {n}',
  Letters: 'Буквы',
  'Remove all words': 'Удалить все слова',
  'Remove all words?': 'Удалить все слова?',
  '{n} word will be marked as misspelled again.': 'Слова снова будут помечаться как ошибочные (слов: {n}).',
  '{n} words will be marked as misspelled again.': 'Слова снова будут помечаться как ошибочные (слов: {n}).',
  'Added {n} word': 'Добавлено слов: {n}',
  'Added {n} words': 'Добавлено слов: {n}',
  '{n} entry was skipped: not a single word': 'Пропущено записей: {n} (не одно слово)',
  '{n} entries were skipped: not single words': 'Пропущено записей: {n} (не одно слово)',
}

export default messages
