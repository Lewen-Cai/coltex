import assert from 'node:assert/strict'
import { test } from 'node:test'
import { WebScope, WebSearch, htmlToText, nativeSearchTracker, normalizeUrl, pageText, urlsIn, withNativeSearch, type NativeSearchEvent } from '../src/ai/web.ts'

type Call = { url: string; init: RequestInit }

function service(reply: (call: Call) => unknown, status = 200) {
  const calls: Call[] = []
  const pages: string[] = []
  const web = new WebSearch(async s => (s === 'brave' ? undefined : `key-${s}`), {
    fetch: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(reply({ url, init })), { status })
    },
    fetchPage: async url => {
      pages.push(url)
      return { url, data: Buffer.from('<html><head><title>Direct</title></head><body><p>Read here</p></body></html>'), contentType: 'text/html' }
    },
  })
  return { web, calls, pages }
}

const body = (c: Call) => JSON.parse(String(c.init.body))

test('each search service is asked in its own format and answers in one', async () => {
  const deepseek = service(() => ({ results: [{ title: 'TUGboat', url: 'https://tug.org/tugboat', snippet: 'short', summary: 'long summary', date: '2026-01-02T00:00:00Z' }] }))
  assert.deepEqual(await deepseek.web.search('deepseek', 'tugboat'), [{ title: 'TUGboat', url: 'https://tug.org/tugboat', snippet: 'long summary', date: '2026-01-02T00:00:00Z' }])
  assert.equal(deepseek.calls[0]!.url, 'https://api.deepseek.com/v1/tools/search')
  assert.equal((deepseek.calls[0]!.init.headers as Record<string, string>).authorization, 'Bearer key-deepseek')
  assert.deepEqual(body(deepseek.calls[0]!), { query: 'tugboat', count: 8 })

  const tavily = service(() => ({ results: [{ title: 'A', url: 'https://a.example', content: 'text a', published_date: '2025' }] }))
  assert.deepEqual(await tavily.web.search('tavily', 'q'), [{ title: 'A', url: 'https://a.example', snippet: 'text a', date: '2025' }])
  assert.equal(tavily.calls[0]!.url, 'https://api.tavily.com/search')

  const exa = service(() => ({ results: [{ title: 'B', url: 'https://b.example', text: 'text b' }] }))
  assert.deepEqual(await exa.web.search('exa', 'q'), [{ title: 'B', url: 'https://b.example', snippet: 'text b' }])
  assert.equal((exa.calls[0]!.init.headers as Record<string, string>)['x-api-key'], 'key-exa')
})

test('a service without a key, an error answer and an overlong query are errors', async () => {
  const { web } = service(() => ({}))
  await assert.rejects(web.search('brave', 'q'), /No API key is set for Brave Search/)
  await assert.rejects(web.search('deepseek', 'x'.repeat(129)), /at most 128 characters/)
  const failing = service(() => ({ error: { message: 'Insufficient Balance' } }), 402)
  await assert.rejects(failing.web.search('deepseek', 'q'), /DeepSeek answered 402: Insufficient Balance/)
})

test("pages come through the service's reader, and from here when it has none or fails", async () => {
  const deepseek = service(c => (c.url.endsWith('/fetch') ? { title: 'T', content: '# Page\n\ntext' } : {}))
  assert.deepEqual(await deepseek.web.read('deepseek', 'https://x.example/p'), { url: 'https://x.example/p', title: 'T', text: '# Page\n\ntext' })
  assert.deepEqual(body(deepseek.calls[0]!), { url: 'https://x.example/p' })
  assert.equal(deepseek.pages.length, 0)

  const refused = service(() => ({ error: { message: 'rejected' } }), 403)
  assert.equal((await refused.web.read('deepseek', 'https://x.example/p')).text, 'Read here')
  const none = service(() => ({}))
  assert.deepEqual(await none.web.read(null, 'https://x.example/q'), { url: 'https://x.example/q', title: 'Direct', text: 'Read here' })
})

test('HTML becomes readable text; PDFs and other binaries are refused', () => {
  const { title, text } = htmlToText(
    '<html><head><title>Guide &amp; notes</title><style>p{}</style></head><body><nav>Menu</nav><h2>Submission</h2><p>Use <b>Times</b>,&nbsp;12&#8239;pt.</p><ul><li>One</li><li>Two</li></ul><script>alert(1)</script><table><tr><td>a</td><td>b</td></tr></table></body></html>',
  )
  assert.equal(title, 'Guide & notes')
  assert.equal(text, '## Submission\nUse Times, 12 pt.\n\n- One\n- Two\n| a | b')
  assert.throws(() => pageText({ url: 'https://a.example/x.pdf', data: Buffer.from('%PDF'), contentType: 'application/pdf' }), /look for an HTML version/)
  const gbk = pageText({ url: 'https://a.example/', data: Buffer.from([0xc4, 0xe3, 0xba, 0xc3]), contentType: 'text/plain; charset=gbk' })
  assert.equal(gbk.text, '你好')
})

test('only addresses the author wrote or searches returned can be read', () => {
  assert.deepEqual(urlsIn('See https://journals.example/guide.html, and (https://en.wikipedia.org/wiki/TeX_(software)).'), [
    'https://journals.example/guide.html',
    'https://en.wikipedia.org/wiki/TeX_(software)',
  ])
  assert.deepEqual(urlsIn('看看https://a.example/x，然后[链接](https://b.example/y/)'), ['https://a.example/x', 'https://b.example/y'])
  assert.equal(normalizeUrl('https://a.example/x/#part'), 'https://a.example/x')
  assert.equal(normalizeUrl('ftp://a.example'), undefined)
  const scope = new WebScope()
  scope.add(['https://a.example/x'])
  assert.ok(scope.allows('https://a.example/x/'))
  assert.ok(scope.allows('https://a.example/x#top'))
  assert.ok(!scope.allows('https://a.example/x?secret=abstract'), 'the model cannot add to an address')
  assert.ok(!scope.allows('https://evil.example/'))
})

test("the model's own search: added to the request, and its searches and sources read from the stream", () => {
  assert.deepEqual(withNativeSearch({ model: 'm', tools: [{ name: 'read_file' }] }, 'anthropic-messages'), {
    model: 'm',
    tools: [{ name: 'read_file' }, { type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
  })
  assert.deepEqual(withNativeSearch({ model: 'm' }, 'openai-responses'), { model: 'm', tools: [{ type: 'web_search' }] })

  const events: NativeSearchEvent[] = []
  const anthropic = nativeSearchTracker(e => events.push(e))
  anthropic({ type: 'content_block_start', index: 1, content_block: { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: {} } })
  anthropic({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"query": "IEEE ' } })
  anthropic({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: 'template"}' } })
  anthropic({ type: 'content_block_stop', index: 1 })
  anthropic({ type: 'content_block_start', index: 2, content_block: { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: [{ type: 'web_search_result', url: 'https://ieee.example/t' }] } })
  const openai = nativeSearchTracker(e => events.push(e))
  openai({ type: 'response.output_item.done', item: { type: 'web_search_call', id: 'ws_1', action: { type: 'search', query: 'ACM format' } } })
  openai({ type: 'response.output_item.done', item: { type: 'web_search_call', id: 'ws_2', action: { type: 'open_page', url: 'https://acm.example/p' } } })
  openai({ type: 'response.output_item.done', item: { type: 'message', content: [{ type: 'output_text', annotations: [{ type: 'url_citation', url: 'https://acm.example/c' }] }] } })
  assert.deepEqual(events, [
    { kind: 'search', id: 'srv_1', query: 'IEEE template' },
    { kind: 'urls', urls: ['https://ieee.example/t'] },
    { kind: 'search', id: 'ws_1', query: 'ACM format' },
    { kind: 'open', id: 'ws_2', url: 'https://acm.example/p' },
    { kind: 'urls', urls: ['https://acm.example/c'] },
  ])
})
