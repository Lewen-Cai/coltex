import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * An in-memory S3 server with just what S3Client uses (path-style, no
 * signature checks), so the S3 store's behaviour is tested on every run.
 * Real services are checked with S3_TEST_ENDPOINT (see storage.test.ts).
 */
export async function startFakeS3(bucket = 'test'): Promise<{ endpoint: string; objects: Map<string, Buffer>; close: () => Promise<void> }> {
  const objects = new Map<string, Buffer>()
  const etag = (b: Buffer) => `"${crypto.createHash('md5').update(b).digest('hex')}"`
  const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = Buffer.concat(chunks)
    const url = new URL(req.url!, 'http://x')
    const [, b, ...rest] = url.pathname.split('/')
    if (b !== bucket) return void res.writeHead(404).end('<Error><Code>NoSuchBucket</Code></Error>')
    const key = rest.map(decodeURIComponent).join('/')

    if (!key && req.method === 'GET') {
      const prefix = url.searchParams.get('prefix') ?? ''
      const max = Number(url.searchParams.get('max-keys') ?? 1000)
      const after = url.searchParams.get('continuation-token') ?? ''
      const keys = [...objects.keys()].filter(k => k.startsWith(prefix) && k > after).sort()
      const page = keys.slice(0, Math.min(max, 2)) // tiny pages, to exercise paging
      const truncated = keys.length > page.length
      res.writeHead(200, { 'content-type': 'application/xml' }).end(
        `<ListBucketResult>${page
          .map(k => `<Contents><Key>${xml(encodeURIComponent(k).replace(/%2F/g, '/'))}</Key><Size>${objects.get(k)!.length}</Size><ETag>${xml(etag(objects.get(k)!))}</ETag><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents>`)
          .join('')}<IsTruncated>${truncated}</IsTruncated>${truncated ? `<NextContinuationToken>${xml(page.at(-1)!)}</NextContinuationToken>` : ''}</ListBucketResult>`,
      )
      return
    }
    if (!key && req.method === 'POST' && url.searchParams.has('delete')) {
      for (const m of body.toString().matchAll(/<Key>([\s\S]*?)<\/Key>/g)) {
        objects.delete(m[1]!.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'))
      }
      return void res.writeHead(200).end('<DeleteResult></DeleteResult>')
    }
    const found = objects.get(key)
    switch (req.method) {
      case 'GET':
      case 'HEAD':
        if (!found) return void res.writeHead(404).end(req.method === 'GET' ? '<Error><Code>NoSuchKey</Code></Error>' : undefined)
        return void res.writeHead(200, { 'content-length': found.length, etag: etag(found) }).end(req.method === 'GET' ? found : undefined)
      case 'PUT': {
        const source = req.headers['x-amz-copy-source']
        if (typeof source === 'string') {
          const from = source.split('/').slice(2).map(decodeURIComponent).join('/')
          const data = objects.get(from)
          if (!data) return void res.writeHead(404).end('<Error><Code>NoSuchKey</Code></Error>')
          objects.set(key, data)
          return void res.writeHead(200).end('<CopyObjectResult></CopyObjectResult>')
        }
        objects.set(key, body)
        return void res.writeHead(200, { etag: etag(body) }).end()
      }
      case 'DELETE':
        objects.delete(key)
        return void res.writeHead(204).end()
    }
    res.writeHead(405).end()
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  return {
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    objects,
    close: () => new Promise(r => server.close(() => r())),
  }
}
