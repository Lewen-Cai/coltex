// Chinese (Simplified) messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': '拼写建议',
  'Looking for suggestions…': '正在查找建议…',
  'No suggestions': '没有建议',
  'Add to dictionary': '加入词典',

  // Settings: dictionary
  Dictionary: '词典',
  'Your dictionary is empty': '词典是空的',
  'Remove “{word}”': '移除“{word}”',
  'Remove from dictionary': '从词典中移除',
  'One word, without spaces': '只能是一个单词，不含空格',
  Export: '导出',
  'Remove all': '全部移除',
  'Find or add a word': '查找或添加单词',
  'Import…': '导入…',
  '“{word}” isn’t in your dictionary.': '词典里没有“{word}”。',
  '{shown} of {total}': '{shown} / {total}',
  '{n} word': '{n} 个单词',
  '{n} words': '{n} 个单词',
  Letters: '字母',
  'Remove all words': '移除全部单词',
  'Remove all words?': '移除全部单词？',
  '{n} word will be marked as misspelled again.': '{n} 个单词会重新被标记为拼写错误。',
  '{n} words will be marked as misspelled again.': '{n} 个单词会重新被标记为拼写错误。',
  'Added {n} word': '已添加 {n} 个单词',
  'Added {n} words': '已添加 {n} 个单词',
  '{n} entry was skipped: not a single word': '跳过了 {n} 项：不是单个单词',
  '{n} entries were skipped: not single words': '跳过了 {n} 项：不是单个单词',
}

export default messages
