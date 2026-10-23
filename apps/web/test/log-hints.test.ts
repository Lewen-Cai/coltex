import { test } from 'node:test'
import assert from 'node:assert/strict'
import hints from '../../../packages/log-parser/src/human-readable/hints.ts'
import { packageSuggestionsForCommands, packageSuggestionsForEnvironments } from '../../../packages/log-parser/src/human-readable/package-suggestions.ts'

// i18n.ts sets the page language when it loads.
Object.assign(globalThis, { document: { documentElement: {} } })
const { LOCALES, addMessages, setLocale, translateServerMessage } = await import('../src/lib/i18n.ts')

const texts = new Set<string>()
for (const hint of Object.values(hints)) {
  texts.add(hint.text())
  for (const command of packageSuggestionsForCommands.keys()) texts.add(hint.text([command]))
  for (const environment of packageSuggestionsForEnvironments.keys()) texts.add(hint.text([environment]))
}

for (const { id } of LOCALES.filter(l => l.id !== 'en')) {
  test(`every compile log hint has a translation (${id})`, async () => {
    addMessages(id, (await import(`../src/locales/${id}/index.ts`)).default)
    await setLocale(id)
    for (const text of texts) assert.notEqual(translateServerMessage(text), text, `no ${id} translation for: ${text}`)
  })
}

test('compile log hints in Chinese', async () => {
  await setLocale('zh-CN')
  for (const text of texts) assert.match(translateServerMessage(text), /[一-鿿]/)
  assert.equal(
    translateServerMessage(hints.hint_undefined_control_sequence!.text(['\\includegraphics'])),
    '可能缺少宏包：需要在导言区加入 \\usepackage{graphicx}，\\includegraphics 命令才能使用。',
  )
})
