#!/usr/bin/env node
// Stands in for tailscaled in tests: `--version`, or a LocalAPI on --socket=… that wants a sign-in.
import http from 'node:http'
if (process.argv.includes('--version')) {
  console.log('1.0.0-fake')
  process.exit(0)
}
const socket = process.argv.find(a => a.startsWith('--socket='))?.slice('--socket='.length)
const state = { prefs: {}, logins: 0 }
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => (body += c))
  req.on('end', () => {
    const send = (code, json) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(json))
    }
    if (req.url === '/localapi/v0/status')
      return send(200, { BackendState: 'NeedsLogin', AuthURL: state.logins ? 'https://login.tailscale.com/a/fake' : '', Self: { HostName: state.prefs.Hostname ?? '' } })
    if (req.url === '/localapi/v0/prefs') {
      Object.assign(state.prefs, JSON.parse(body))
      return send(200, state.prefs)
    }
    if (req.url === '/localapi/v0/login-interactive') {
      state.logins++
      return send(204, null)
    }
    if (req.url === '/localapi/v0/serve-config') return send(200, {})
    send(404, { error: 'not found' })
  })
})
server.listen(socket)
process.on('SIGTERM', () => server.close(() => process.exit(0)))
