// Chinese (Traditional) messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': '拼字建議',
  'Looking for suggestions…': '正在尋找建議…',
  'No suggestions': '沒有建議',
  'Add to dictionary': '加入字典',

  // Settings: dictionary
  Dictionary: '字典',
  'Your dictionary is empty': '字典是空的',
  'Remove “{word}”': '移除「{word}」',
  'Remove from dictionary': '從字典中移除',
  'One word, without spaces': '只能是一個單字，不含空格',
  Export: '匯出',
  'Remove all': '全部移除',
  'Find or add a word': '尋找或新增單字',
  'Import…': '匯入…',
  '“{word}” isn’t in your dictionary.': '字典裡沒有「{word}」。',
  '{shown} of {total}': '{shown} / {total}',
  '{n} word': '{n} 個單字',
  '{n} words': '{n} 個單字',
  Letters: '字母',
  'Remove all words': '移除所有單字',
  'Remove all words?': '要移除所有單字嗎？',
  '{n} word will be marked as misspelled again.': '{n} 個單字會重新被標示為拼字錯誤。',
  '{n} words will be marked as misspelled again.': '{n} 個單字會重新被標示為拼字錯誤。',
  'Added {n} word': '已新增 {n} 個單字',
  'Added {n} words': '已新增 {n} 個單字',
  '{n} entry was skipped: not a single word': '已略過 {n} 個項目：不是單一單字',
  '{n} entries were skipped: not single words': '已略過 {n} 個項目：不是單一單字',
}

export default messages
