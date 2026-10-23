// Spanish messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': 'Sugerencias ortográficas',
  'Looking for suggestions…': 'Buscando sugerencias…',
  'No suggestions': 'Sin sugerencias',
  'Add to dictionary': 'Añadir al diccionario',

  // Settings: dictionary
  Dictionary: 'Diccionario',
  'Your dictionary is empty': 'Tu diccionario está vacío',
  'Remove “{word}”': 'Quitar «{word}»',
  'Remove from dictionary': 'Quitar del diccionario',
  'One word, without spaces': 'Una sola palabra, sin espacios',
  Export: 'Exportar',
  'Remove all': 'Quitar todo',
  'Find or add a word': 'Buscar o añadir una palabra',
  'Import…': 'Importar…',
  '“{word}” isn’t in your dictionary.': '«{word}» no está en tu diccionario.',
  '{shown} of {total}': '{shown} de {total}',
  '{n} word': '{n} palabra',
  '{n} words': '{n} palabras',
  Letters: 'Letras',
  'Remove all words': 'Quitar todas las palabras',
  'Remove all words?': '¿Quitar todas las palabras?',
  '{n} word will be marked as misspelled again.': '{n} palabra volverá a marcarse como mal escrita.',
  '{n} words will be marked as misspelled again.': '{n} palabras volverán a marcarse como mal escritas.',
  'Added {n} word': 'Se añadió {n} palabra',
  'Added {n} words': 'Se añadieron {n} palabras',
  '{n} entry was skipped: not a single word': 'Se omitió {n} entrada: no es una sola palabra',
  '{n} entries were skipped: not single words': 'Se omitieron {n} entradas: no son palabras sueltas',
}

export default messages
