import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ProjectMeta } from '@coltex/shared'
import { systemPrompt } from '../src/ai/prompt.ts'
import { createTools, type ToolContext } from '../src/ai/tools.ts'

const project = { id: 'p', name: 'Paper', rootFile: 'main.tex', engine: 'auto' } as ProjectMeta
const ctx = (over: Partial<ToolContext>) =>
  ({ project, store: {}, changeset: {}, queue: {}, outputsDir: '', canEdit: true, authorBuild: () => undefined, onTrial: () => {}, ...over }) as unknown as ToolContext
const names = (c: ToolContext) => createTools(c).map(t => t.name)

test('the package manual tool is offered only when the compiler has the manuals (full edition)', () => {
  assert.ok(names(ctx({ manuals: true })).includes('texlive_doc'))
  assert.ok(!names(ctx({ manuals: false })).includes('texlive_doc'))
  assert.ok(names(ctx({ manuals: false })).includes('texlive_source'), 'sources are in every edition')
  assert.ok(!names(ctx({ manuals: false, canEdit: false })).includes('edit_file'))
  assert.match(systemPrompt(project, true, true), /texlive_doc/)
  assert.doesNotMatch(systemPrompt(project, true, false), /texlive_doc/)
})
