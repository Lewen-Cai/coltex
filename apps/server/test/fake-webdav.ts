import http from 'node:http'
import type { AddressInfo } from 'node:net'

/**
 * An in-memory WebDAV server with Basic auth and what backups use (PROPFIND,
 * MKCOL, PUT, GET, DELETE). Collections are paths ending in '/'.
 */
export async function startFakeWebDav(opts: { username: string; password: string }) {
  const files = new Map<string, Buffer>()
  const folders = new Set<string>(['/'])
  const requests: string[] = []
  const expected = `Basic ${Buffer.from(`${opts.username}:${opts.password}`).toString('base64')}`

  const server = http.createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = Buffer.concat(chunks)
    const p = decodeURIComponent(new URL(req.url!, 'http://x').pathname)
    requests.push(`${req.method} ${p}`)
    if (req.headers.authorization !== expected) return void res.writeHead(401, { 'www-authenticate': 'Basic realm="dav"' }).end()
    const parent = p.replace(/\/$/, '').replace(/[^/]*$/, '')
    switch (req.method) {
      case 'PROPFIND': {
        const folder = p.endsWith('/') ? p : `${p}/`
        if (!folders.has(folder) && !files.has(p)) return void res.writeHead(404).end()
        const entry = (href: string, size?: number) =>
          `<D:response><D:href>${encodeURI(href)}</D:href><D:propstat><D:prop>${
            size === undefined ? '<D:resourcetype><D:collection/></D:resourcetype>' : `<D:resourcetype/><D:getcontentlength>${size}</D:getcontentlength>`
          }</D:prop></D:propstat></D:response>`
        let xml = files.has(p) ? entry(p, files.get(p)!.length) : entry(folder)
        if (req.headers.depth === '1' && folders.has(folder)) {
          for (const [name, data] of files) if (name.startsWith(folder) && !name.slice(folder.length).includes('/')) xml += entry(name, data.length)
          for (const f of folders) if (f !== folder && f.startsWith(folder) && !f.slice(folder.length, -1).includes('/')) xml += entry(f)
        }
        return void res.writeHead(207, { 'content-type': 'application/xml' }).end(`<?xml version="1.0"?><D:multistatus xmlns:D="DAV:">${xml}</D:multistatus>`)
      }
      case 'MKCOL': {
        const folder = p.endsWith('/') ? p : `${p}/`
        if (folders.has(folder)) return void res.writeHead(405).end()
        if (!folders.has(parent)) return void res.writeHead(409).end()
        folders.add(folder)
        return void res.writeHead(201).end()
      }
      case 'PUT':
        if (!folders.has(parent)) return void res.writeHead(409).end()
        files.set(p, body)
        return void res.writeHead(201).end()
      case 'GET':
        return files.has(p) ? void res.writeHead(200).end(files.get(p)) : void res.writeHead(404).end()
      case 'DELETE':
        return files.delete(p) ? void res.writeHead(204).end() : void res.writeHead(404).end()
    }
    res.writeHead(405).end()
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    files,
    folders,
    requests,
    close: () => new Promise<void>(r => server.close(() => r())),
  }
}
