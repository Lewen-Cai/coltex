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
  'Learned words': '已加入的单词',
  'Filter words': '筛选单词',
  'Your dictionary is empty': '词典是空的',
  'No words match “{query}”.': '没有与“{query}”匹配的单词。',
  '{n} word matches': '{n} 个单词匹配',
  '{n} words match': '{n} 个单词匹配',
  'Remove “{word}”': '移除“{word}”',
  'Remove from dictionary': '从词典中移除',
  'Removed “{word}” from your dictionary': '已从词典中移除“{word}”',
}

export default messages
