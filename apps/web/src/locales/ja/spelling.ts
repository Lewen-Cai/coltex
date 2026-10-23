// Japanese messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': 'スペルの候補',
  'Looking for suggestions…': '候補を検索中…',
  'No suggestions': '候補はありません',
  'Add to dictionary': '辞書に追加',

  // Settings: dictionary
  Dictionary: '辞書',
  'Your dictionary is empty': '辞書は空です',
  'Remove “{word}”': '「{word}」を削除',
  'Remove from dictionary': '辞書から削除',
  'One word, without spaces': 'スペースを含まない 1 語にしてください',
  Export: 'エクスポート',
  'Remove all': 'すべて削除',
  'Find or add a word': '単語を検索または追加',
  'Import…': 'インポート…',
  '“{word}” isn’t in your dictionary.': '「{word}」は辞書にありません。',
  '{shown} of {total}': '{shown} / {total}',
  '{n} word': '{n} 語',
  '{n} words': '{n} 語',
  Letters: '文字',
  'Remove all words': 'すべての単語を削除',
  'Remove all words?': 'すべての単語を削除しますか？',
  '{n} word will be marked as misspelled again.': '{n} 語が再びスペルミスとして表示されます。',
  '{n} words will be marked as misspelled again.': '{n} 語が再びスペルミスとして表示されます。',
  'Added {n} word': '{n} 語を追加しました',
  'Added {n} words': '{n} 語を追加しました',
  '{n} entry was skipped: not a single word': '{n} 件をスキップしました：1 語ではありません',
  '{n} entries were skipped: not single words': '{n} 件をスキップしました：1 語ではありません',
}

export default messages
