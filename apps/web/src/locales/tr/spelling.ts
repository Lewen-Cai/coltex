// Turkish messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': 'Yazım önerileri',
  'Looking for suggestions…': 'Öneriler aranıyor…',
  'No suggestions': 'Öneri yok',
  'Add to dictionary': 'Sözlüğe ekle',

  // Settings: dictionary
  Dictionary: 'Sözlük',
  'Your dictionary is empty': 'Sözlüğünüz boş',
  'Remove “{word}”': '“{word}” sözcüğünü kaldır',
  'Remove from dictionary': 'Sözlükten kaldır',
  'One word, without spaces': 'Boşluksuz tek bir sözcük',
  Export: 'Dışa aktar',
  'Remove all': 'Tümünü kaldır',
  'Find or add a word': 'Sözcük bulun veya ekleyin',
  'Import…': 'İçe aktar…',
  '“{word}” isn’t in your dictionary.': '“{word}” sözcüğü sözlüğünüzde yok.',
  '{shown} of {total}': '{shown} / {total}',
  '{n} word': '{n} sözcük',
  '{n} words': '{n} sözcük',
  Letters: 'Harfler',
  'Remove all words': 'Tüm sözcükleri kaldır',
  'Remove all words?': 'Tüm sözcükler kaldırılsın mı?',
  '{n} word will be marked as misspelled again.': '{n} sözcük yeniden yazım hatası olarak işaretlenecek.',
  '{n} words will be marked as misspelled again.': '{n} sözcük yeniden yazım hatası olarak işaretlenecek.',
  'Added {n} word': '{n} sözcük eklendi',
  'Added {n} words': '{n} sözcük eklendi',
  '{n} entry was skipped: not a single word': '{n} girdi atlandı: tek bir sözcük değil',
  '{n} entries were skipped: not single words': '{n} girdi atlandı: tek bir sözcük değil',
}

export default messages
