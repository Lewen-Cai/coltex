#!/usr/bin/env node
// Stands in for cloudflared in tests: `--version`, or a tunnel whose metrics server reports it connected.
// Token secrets pick what happens: good… connects, quic… connects only over HTTP/2 (`--protocol
// http2`), anything else is refused. FAKE_CLOUDFLARED=429 makes quick tunnels rate-limited.
// FAKE_CLOUDFLARED_PIDS names a folder where each running one keeps a file.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('cloudflared version 0.0.0-fake')
  process.exit(0)
}
const pids = process.env.FAKE_CLOUDFLARED_PIDS
if (pids) {
  fs.writeFileSync(path.join(pids, String(process.pid)), '')
  process.on('exit', () => fs.rmSync(path.join(pids, String(process.pid)), { force: true }))
}
const metrics = args[args.indexOf('--metrics') + 1]
const [host, port] = metrics.split(':')
const quick = args.includes('--url')
const http2 = args[args.indexOf('--protocol') + 1] === 'http2'
let secret = ''
try {
  secret = JSON.parse(Buffer.from(process.env.TUNNEL_TOKEN ?? '', 'base64').toString()).s ?? ''
} catch {}
if (quick && process.env.FAKE_CLOUDFLARED === '429') {
  console.error('2026-10-18T00:00:00Z ERR failed to request quick Tunnel: Error unmarshaling QuickTunnel response: error code: 1015 status_code="429 Too Many Requests"')
  process.exit(1)
}
if (!quick && secret.startsWith('quic') && !http2) {
  // Like QUIC through a proxy that drops UDP: it never connects.
  const fail = () => console.error('2026-10-18T00:00:00Z ERR Failed to dial a quic connection error="failed to dial to edge with quic: timeout: no recent network activity" connIndex=0')
  fail()
  setInterval(fail, 30)
} else {
  if (!quick && !secret.startsWith('good') && !secret.startsWith('quic')) {
    console.error('2026-10-18T00:00:00Z ERR Provided Tunnel token is not valid.')
    process.exit(1)
  }
  if (!quick) console.error('2026-10-18T00:00:00Z INF Updated to new configuration config="{\\"ingress\\":[{\\"hostname\\":\\"tex.example.org\\", \\"service\\":\\"http://localhost:3690\\"}, {\\"service\\":\\"http_status:404\\"}]}" version=1')
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url === '/ready') return res.end(JSON.stringify({ status: 200, readyConnections: 2 }))
    if (req.url === '/quicktunnel') return res.end(JSON.stringify({ hostname: quick ? 'calm-river-1234.trycloudflare.com' : '' }))
    res.statusCode = 404
    res.end('{}')
  })
  server.on('error', err => {
    console.error(`2026-10-18T00:00:00Z ERR failed to bind to address (${metrics}): ${err.code === 'EADDRINUSE' ? 'address already in use' : err.message}`)
    process.exit(1)
  })
  server.listen(Number(port), host)
}
process.on('SIGTERM', () => process.exit(0))
