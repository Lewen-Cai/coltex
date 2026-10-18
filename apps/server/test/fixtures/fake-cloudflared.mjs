#!/usr/bin/env node
// Stands in for cloudflared in tests: `--version`, or a tunnel whose metrics server reports it connected.
import http from 'node:http'
const args = process.argv.slice(2)
if (args.includes('--version')) {
  console.log('cloudflared version 0.0.0-fake')
  process.exit(0)
}
const metrics = args[args.indexOf('--metrics') + 1]
const [host, port] = metrics.split(':')
const quick = args.includes('--url')
let secret = ''
try {
  secret = JSON.parse(Buffer.from(process.env.TUNNEL_TOKEN ?? '', 'base64').toString()).s ?? ''
} catch {}
if (!quick && !secret.startsWith('good')) {
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
server.listen(Number(port), host)
process.on('SIGTERM', () => server.close(() => process.exit(0)))
