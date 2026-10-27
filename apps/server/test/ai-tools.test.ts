import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProjectMeta } from '@coltex/shared'
import { systemPrompt } from '../src/ai/prompt.ts'
import { NO_WEB } from '../src/ai/service.ts'
import { PAGE_SEEN, createTools, withoutPageImages, type ToolContext } from '../src/ai/tools.ts'

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

test('page images: only for models that see images, from the latest build, and not kept in later requests', async () => {
  assert.ok(!names(ctx({})).includes('view_pdf_page'))
  const pages: { buildId: string; page: number }[] = []
  const queue = { renderPage: async (job: { buildId: string; page: number }) => (pages.push(job), { pages: 2, png: job.page <= 2 ? 'cG5n' : null }) }
  const tools = createTools(ctx({ vision: true, queue, authorBuild: () => 'b1-x' } as unknown as Partial<ToolContext>))
  const view = tools.find(t => t.name === 'view_pdf_page')!
  const shown = await view.execute('1', { page: 2 })
  assert.deepEqual(shown.content[1], { type: 'image', data: 'cG5n', mimeType: 'image/png' })
  assert.deepEqual(pages, [{ projectId: 'p', buildId: 'b1-x', page: 2 }])
  assert.match((await view.execute('2', { page: 5 })).content.map(c => (c.type === 'text' ? c.text : '')).join(''), /2 pages; there is no page 5/)
  const messages = [
    { role: 'user', content: 'Check the layout' },
    { role: 'toolResult', content: shown.content },
    { role: 'user', content: 'And now?' },
    { role: 'toolResult', content: shown.content },
  ]
  const trimmed = withoutPageImages(messages, 2)
  assert.deepEqual(trimmed[1]!.content, [shown.content[0], { type: 'text', text: PAGE_SEEN }], 'earlier messages lose their images')
  assert.equal(trimmed[3], messages[3], 'the current message keeps them')
})
