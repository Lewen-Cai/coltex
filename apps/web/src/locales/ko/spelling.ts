// Korean messages, keyed by their English text. See lib/i18n.ts.
// Spell checking: the editor's suggestion menu, languages, and the dictionary.
const messages: Record<string, string> = {
  // Editor: suggestions menu
  'Spelling suggestions': '맞춤법 제안',
  'Looking for suggestions…': '제안을 찾는 중…',
  'No suggestions': '제안 없음',
  'Add to dictionary': '사전에 추가',

  // Settings: dictionary
  Dictionary: '사전',
  'Your dictionary is empty': '사전이 비어 있습니다',
  'Remove “{word}”': '“{word}” 제거',
  'Remove from dictionary': '사전에서 제거',
  'One word, without spaces': '공백 없이 한 단어만 입력하세요',
  Export: '내보내기',
  'Remove all': '모두 제거',
  'Find or add a word': '단어 찾기 또는 추가',
  'Import…': '가져오기…',
  '“{word}” isn’t in your dictionary.': '사전에 “{word}”이(가) 없습니다.',
  '{shown} of {total}': '{shown} / {total}',
  '{n} word': '단어 {n}개',
  '{n} words': '단어 {n}개',
  Letters: '글자',
  'Remove all words': '모든 단어 제거',
  'Remove all words?': '모든 단어를 제거할까요?',
  '{n} word will be marked as misspelled again.': '단어 {n}개가 다시 맞춤법 오류로 표시됩니다.',
  '{n} words will be marked as misspelled again.': '단어 {n}개가 다시 맞춤법 오류로 표시됩니다.',
  'Added {n} word': '단어 {n}개 추가됨',
  'Added {n} words': '단어 {n}개 추가됨',
  '{n} entry was skipped: not a single word': '항목 {n}개를 건너뛰었습니다: 한 단어가 아님',
  '{n} entries were skipped: not single words': '항목 {n}개를 건너뛰었습니다: 한 단어가 아님',
}

export default messages
