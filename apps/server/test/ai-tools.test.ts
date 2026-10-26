import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProjectMeta } from '@coltex/shared'
import { systemPrompt } from '../src/ai/prompt.ts'
import { NO_WEB } from '../src/ai/service.ts'
import { createTools, type ToolContext } from '../src/ai/tools.ts'

const project = { id: 'p', name: 'Paper', rootFile: 'main.tex', engine: 'auto' } as ProjectMeta
const ctx = (over: Partial<ToolContext>) =>
  ({ project, store: {}, changeset: {}, queue: {}, outputsDir: '', canEdit: true, authorBuild: () => undefined, onTrial: () => {}, web: NO_WEB, ...over }) as unknown as ToolContext
const names = (c: ToolContext) => createTools(c).map(t => t.name)

test('web tools follow the web access: search with a search service, reading whenever the web is allowed', () => {
  const web = (n: string[]) => n.filter(x => x === 'web_search' || x === 'read_web_page')
  assert.deepEqual(web(names(ctx({}))), [])
  assert.deepEqual(web(names(ctx({ web: { search: 'tavily', native: false, read: true } }))), ['web_search', 'read_web_page'])
  // The model's own search replaces web_search (Anthropic's would clash with its name).
  assert.deepEqual(web(names(ctx({ web: { search: null, native: true, read: true } }))), ['read_web_page'])
  assert.ok(names(ctx({ canEdit: false, web: { search: 'exa', native: false, read: true } })).includes('web_search'), 'readers may search too')
})

test('the package manual tool is offered only when the compiler has the manuals (full edition)', () => {
  assert.ok(names(ctx({ manuals: true })).includes('texlive_doc'))
  assert.ok(!names(ctx({ manuals: false })).includes('texlive_doc'))
  assert.ok(names(ctx({ manuals: false })).includes('texlive_source'), 'sources are in every edition')
  assert.ok(!names(ctx({ manuals: false, canEdit: false })).includes('edit_file'))
  assert.match(systemPrompt(project, true, true), /texlive_doc/)
  assert.doesNotMatch(systemPrompt(project, true, false), /texlive_doc/)
})
