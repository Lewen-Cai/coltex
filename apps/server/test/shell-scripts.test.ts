import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// install.sh runs on its own (curl … | bash), before there is a checkout, so it can't load code
// from the repository: the download bar and the steps are one block that both scripts carry.
const root = path.resolve(import.meta.dirname, '../../..')
const scripts = ['install.sh', 'coltex'].map(name => ({ name, text: fs.readFileSync(path.join(root, name), 'utf8') }))

const between = (text: string, start: string, end: string) => {
  const from = text.indexOf(start)
  const to = text.indexOf(end, from)
  assert.ok(from >= 0 && to > from, `${start} … ${end}`)
  return text.slice(from, to)
}

/** Each language's message keys, from the msg_<lang> functions. */
function messageKeys(text: string) {
  const block = between(text, '# >>> messages', '# <<< messages')
  const keys = new Map<string, Set<string>>()
  for (const m of block.matchAll(/^msg_(\w+)\(\) \{\n([\s\S]*?)^\}/gm)) {
    keys.set(m[1]!, new Set([...m[2]!.matchAll(/^ {4}([a-z0-9_]+)\) M=/gm)].map(k => k[1]!)))
  }
  return keys
}

describe('install.sh and coltex', () => {
  test('parse with bash', () => {
    for (const { name } of scripts) execFileSync('bash', ['-n', path.join(root, name)])
  })

  test('carry the same shared block', () => {
    const [install, coltex] = scripts.map(s => between(s.text, '# >>> shared', '# <<< shared'))
    assert.equal(coltex, install)
  })

  test('have every message in all 14 languages', () => {
    for (const { name, text } of scripts) {
      const keys = messageKeys(text)
      assert.equal(keys.size, 14, name)
      const english = keys.get('en')!
      for (const [lang, set] of keys) {
        assert.deepEqual([...english].filter(k => !set.has(k)), [], `${name}: missing in ${lang}`)
        assert.deepEqual([...set].filter(k => !english.has(k)), [], `${name}: only in ${lang}`)
      }
    }
  })

  test('the shared block finds its messages in both', () => {
    const shared = between(scripts[0]!.text, '# >>> shared', '# <<< shared')
    const used = new Set([...shared.matchAll(/\$\(T ([a-z0-9_]+)/g)].map(m => m[1]!))
    for (const { name, text } of scripts) {
      const english = messageKeys(text).get('en')!
      for (const key of used) assert.ok(english.has(key), `${name}: ${key}`)
    }
  })
})
