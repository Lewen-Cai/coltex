// French messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': 'Suggestions orthographiques',
  'Looking for suggestions…': 'Recherche de suggestions…',
  'No suggestions': 'Aucune suggestion',
  'Add to dictionary': 'Ajouter au dictionnaire',

  // Settings: dictionary
  Dictionary: 'Dictionnaire',
  'Your dictionary is empty': 'Votre dictionnaire est vide',
  'Remove “{word}”': 'Retirer « {word} »',
  'Remove from dictionary': 'Retirer du dictionnaire',
  'One word, without spaces': 'Un seul mot, sans espaces',
  Export: 'Exporter',
  'Remove all': 'Tout retirer',
  'Find or add a word': 'Rechercher ou ajouter un mot',
  'Import…': 'Importer…',
  '“{word}” isn’t in your dictionary.': '« {word} » n’est pas dans votre dictionnaire.',
  '{shown} of {total}': '{shown} sur {total}',
  '{n} word': '{n} mot',
  '{n} words': '{n} mots',
  Letters: 'Lettres',
  'Remove all words': 'Retirer tous les mots',
  'Remove all words?': 'Retirer tous les mots ?',
  '{n} word will be marked as misspelled again.': '{n} mot sera de nouveau signalé comme mal orthographié.',
  '{n} words will be marked as misspelled again.': '{n} mots seront de nouveau signalés comme mal orthographiés.',
  'Added {n} word': '{n} mot ajouté',
  'Added {n} words': '{n} mots ajoutés',
  '{n} entry was skipped: not a single word': '{n} entrée ignorée : ce n’est pas un mot unique',
  '{n} entries were skipped: not single words': '{n} entrées ignorées : ce ne sont pas des mots uniques',
}

export default messages
