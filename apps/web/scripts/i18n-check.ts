// Checks the Chinese dictionary against the messages used in the source.
//
//   node scripts/i18n-check.ts            errors: missing keys, placeholder mismatches
//   node scripts/i18n-check.ts --strict   also fails on likely untranslated UI text
//   node scripts/i18n-check.ts src/pages  limit the untranslated-text report to some paths
//
// A line containing `i18n-ignore` is skipped by the untranslated-text heuristic.
import fs from 'node:fs'
import path from 'node:path'
import zh from '../src/locales/zh/index.ts'
import serverMessages from '../src/locales/zh/server.ts'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const strict = args.includes('--strict')
const only = args.filter(a => !a.startsWith('--')).map(a => path.resolve(root, a))

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'locales' ? [] : walk(p)
    return /\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
}

const STR = String.raw`'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|\x60((?:[^\x60\\$]|\\.)*)\x60`
const unescape = (s: string) => s.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c))
const lit = (m: RegExpExecArray, at: number) => unescape(m[at] ?? m[at + 1] ?? m[at + 2] ?? '')
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

const errors: string[] = []
const warnings: string[] = []
const used = new Set<string>()

function need(key: string, where: string, optional = false) {
  used.add(key)
  const value = zh[key]
  if (value === undefined) {
    if (!optional) errors.push(`${where}: missing zh for ${JSON.stringify(key)}`)
    return
  }
  if (placeholders(value) !== placeholders(key)) errors.push(`${where}: placeholders differ for ${JSON.stringify(key)} → ${JSON.stringify(value)}`)
}

const callRe = new RegExp(String.raw`\b(t|tk|tr)\(\s*(?:${STR})`, 'g')
const pluralRe = new RegExp(String.raw`\bplural\(\s*[^,]+,\s*(?:${STR})\s*,\s*(?:${STR})`, 'g')

// Error messages stay in English in every interface language (they are what people search for and report).
// Exception: sign-in/sign-up and password errors go through authErrorText (lib/auth-errors.ts).
const TRANSLATED_ERROR = /\b(?:toast\.error|setError|setFailed)\(\s*(?:\w+\s*\?\s*)?(?:t|tr|plural|translateServerMessage)\(/

// Heuristics for user-visible English that isn't wrapped.
const SUSPECT: RegExp[] = [
  />\s*[A-Z][a-z]+(?:[ ,.'’?!:-]+[A-Za-z]+)*[.?!…]?\s*<\//, // <p>Some text</p>
  /^\s*[A-Z][a-z]+(?: [a-zA-Z,.'’?!:-]+){1,}\s*$/, // a JSX text line on its own
  /\b(?:placeholder|title|aria-label|label|description|tooltip)=["'][A-Z][a-z]+[^"']*["']/,
  /\btoast(?:\.\w+)?\(\s*['"\x60][A-Z]/,
  /\b(?:confirmLabel|title|description|label):\s*['"\x60][A-Z][a-z]+ [^'"\x60]*['"\x60]/,
]

for (const file of walk(path.join(root, 'src'))) {
  if (file.endsWith('lib/i18n.ts')) continue
  const rel = path.relative(root, file)
  const src = fs.readFileSync(file, 'utf8')
  src.split('\n').forEach((line, i) => {
    if (TRANSLATED_ERROR.test(line)) errors.push(`${rel}:${i + 1}: error messages are not translated: ${line.trim().slice(0, 100)}`)
  })
  const lineOf = (i: number) => src.slice(0, i).split('\n').length
  for (const m of src.matchAll(callRe)) need(lit(m as RegExpExecArray, 2), `${rel}:${lineOf(m.index)}`)
  for (const m of src.matchAll(pluralRe)) {
    const where = `${rel}:${lineOf(m.index)}`
    need(lit(m as RegExpExecArray, 1), where, true)
    need(lit(m as RegExpExecArray, 4), where)
  }
  // shadcn components: keys are checked, but their markup isn't scanned for unwrapped text.
  if (rel.startsWith('src/components/ui/')) continue
  if (only.length && !only.some(o => file.startsWith(o))) continue
  src.split('\n').forEach((line, i) => {
    // Error messages are English on purpose.
    if (/\b(?:toast\.error|setError|setFailed)\(/.test(line)) return
    if (line.includes('i18n-ignore') || /^\s*(\/\/|\*|\/\*)/.test(line) || /\b(t|tk|tr|plural)\(/.test(line)) return
    if (SUSPECT.some(re => re.test(line))) warnings.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`)
  })
}

// Server messages are looked up by exact match at run time (translateServerMessage).
// The same English text must read the same everywhere: flag keys defined differently in two area files.
const dir = path.join(root, 'src/locales/zh')
const seen = new Map<string, { file: string; value: string }>()
for (const f of fs.readdirSync(dir).filter(f => f !== 'index.ts')) {
  const area = (await import(path.join(dir, f))).default as Record<string, string>
  for (const [k, v] of Object.entries(area)) {
    const prev = seen.get(k)
    if (prev && prev.value !== v) errors.push(`locales/zh/${f}: ${JSON.stringify(k)} is ${JSON.stringify(v)} here but ${JSON.stringify(prev.value)} in ${prev.file}`)
    else if (!prev) seen.set(k, { file: f, value: v })
  }
}

const unused = Object.keys(zh).filter(k => !used.has(k) && !(k in serverMessages))

for (const w of warnings) console.log(`untranslated? ${w}`)
if (unused.length) console.log(`\n${unused.length} zh entries unused:\n  ${unused.map(k => JSON.stringify(k)).join('\n  ')}`)
for (const e of errors) console.error(`error: ${e}`)
console.log(`\n${used.size} keys used, ${Object.keys(zh).length} zh entries, ${errors.length} errors, ${warnings.length} possibly untranslated lines`)
if (errors.length || (strict && warnings.length)) process.exit(1)
