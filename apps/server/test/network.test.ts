import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { SecretBox } from '../src/ai/credentials.ts'
import { CloudflareTunnel } from '../src/network/cloudflare.ts'
import { TailscaleDaemon } from '../src/network/daemon.ts'
import { NetworkService } from '../src/network/service.ts'
import { TailscaleClient } from '../src/network/tailscale.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

/** A stand-in for tailscaled's LocalAPI on the shared socket. */
function fakeTailscaled(socket: string) {
  const state = { backend: 'NeedsLogin', serve: {} as Record<string, unknown>, logins: 0, wantRunning: false, headerMissing: false }
  const server = http.createServer((req, res) => {
    if (req.headers['sec-tailscale'] !== 'localapi') state.headerMissing = true
    let body = ''
    req.on('data', c => (body += c))
    req.on('end', () => {
      const send = (code: number, json: unknown, headers: Record<string, string> = {}) => {
        res.writeHead(code, { 'content-type': 'application/json', ...headers })
        res.end(JSON.stringify(json))
      }
      if (req.url === '/localapi/v0/status') {
        const running = state.backend === 'Running'
        return send(200, {
          BackendState: state.backend,
          AuthURL: running ? '' : 'https://login.tailscale.com/a/abc123',
          Self: { DNSName: running ? 'coltex.tail1234.ts.net.' : '', TailscaleIPs: running ? ['100.64.0.7'] : null },
          CurrentTailnet: running ? { Name: 'lab@example.org' } : null,
          CertDomains: running ? ['coltex.tail1234.ts.net'] : null,
        })
      }
      if (req.url === '/localapi/v0/serve-config' && req.method === 'GET') return send(200, state.serve, { etag: '"e1"' })
      if (req.url === '/localapi/v0/serve-config' && req.method === 'POST') {
        state.serve = JSON.parse(body)
        return send(200, null)
      }
      if (req.url === '/localapi/v0/prefs' && req.method === 'PATCH') {
        state.wantRunning = JSON.parse(body).WantRunning === true
        return send(200, {})
      }
      if (req.url === '/localapi/v0/login-interactive') {
        state.logins++
        return send(204, null)
      }
      if (req.url === '/localapi/v0/logout') {
        state.backend = 'NeedsLogin'
        state.serve = {}
        return send(204, null)
      }
      send(404, { error: 'not found' })
    })
  })
  return { state, server, listen: () => new Promise<void>(r => server.listen(socket, r)) }
}

describe('network: public address, same-origin sign-in and Tailscale', () => {
  let t: TestApp
  let admin = ''
  let member = ''
  let fake: ReturnType<typeof fakeTailscaled>
  const get = (url: string, cookie = admin) => t.app.inject({ url: `/api${url}`, headers: { cookie } })
  const signIn = (host: string, origin: string) =>
    t.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { host, origin },
      payload: { email: 'admin@lab.test', password: 'Correct-horse-1' },
    })

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Ada', email: 'admin@lab.test', password: 'Correct-horse-1' } }),
    )
    const invite = await t.app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin }, payload: {} })
    member = cookieFrom(
      await t.app.inject({
        method: 'POST',
        url: `/api/invites/${invite.json().token}/accept`,
        payload: { name: 'Max', email: 'max@lab.test', password: 'Correct-horse-2' },
      }),
    )
  })

  after(async () => {
    fake?.server.close()
    await t?.close()
  })

  test('without COLTEX_URL or a tunnel, links offer nothing from the server (the browser adds its own)', async () => {
    assert.deepEqual((await get('/instance', member)).json(), { addresses: [] })
    assert.equal((await t.app.inject({ url: '/api/instance' })).statusCode, 401)
    const n = (await get('/admin/network')).json()
    assert.equal(n.envUrl, null)
    assert.equal(n.tailscale.state, 'unavailable')
    assert.equal(n.cloudflare.state, 'unavailable')
    assert.equal((await get('/admin/network', member)).statusCode, 403)
  })

  test('sign-in accepts the address it is made to, never another site', async () => {
    // A LAN or Tailscale address nobody listed: the page and the API are on the same origin.
    const lan = await signIn('192.168.1.20:3690', 'http://192.168.1.20:3690')
    assert.equal(lan.statusCode, 200, lan.body)
    // A page elsewhere posting to this server.
    const other = await signIn('192.168.1.20:3690', 'http://evil.example')
    assert.equal(other.statusCode, 403, other.body)
  })

  test('Tailscale over its LocalAPI: sign in, serve ColTex on the tailnet, and accept sign-ins from there', async () => {
    fake = fakeTailscaled(t.tailscaleSocket)
    await fake.listen()
    t.network.forget()

    let n = (await get('/admin/network')).json()
    assert.equal(n.tailscale.state, 'needs-login')
    assert.equal(n.tailscale.authUrl, 'https://login.tailscale.com/a/abc123')
    const login = await t.app.inject({ method: 'POST', url: '/api/admin/network/tailscale/login', headers: { cookie: admin } })
    assert.equal(login.statusCode, 200, login.body)
    assert.equal(login.json().authUrl, 'https://login.tailscale.com/a/abc123')
    assert.equal(fake.state.logins, 1)
    assert.equal(fake.state.wantRunning, true)
    const serveBefore = await t.app.inject({ method: 'PUT', url: '/api/admin/network/tailscale/serve', headers: { cookie: admin }, payload: { enabled: true } })
    assert.equal(serveBefore.statusCode, 400, 'not connected yet')

    fake.state.backend = 'Running' // the admin opened the link
    const serve = await t.app.inject({ method: 'PUT', url: '/api/admin/network/tailscale/serve', headers: { cookie: admin }, payload: { enabled: true } })
    assert.equal(serve.statusCode, 200, serve.body)
    assert.equal(serve.json().servingUrl, 'https://coltex.tail1234.ts.net')
    assert.deepEqual(fake.state.serve, {
      TCP: { '443': { HTTPS: true } },
      Web: { 'coltex.tail1234.ts.net:443': { Handlers: { '/': { Proxy: 'http://server:3690' } } } },
    })
    n = (await get('/admin/network')).json()
    assert.equal(n.tailscale.name, 'coltex.tail1234.ts.net')
    assert.deepEqual(n.tailscale.addresses, ['100.64.0.7'])
    assert.equal(n.tailscale.https, true)

    // Links offer the tailnet address while Tailscale serves ColTex, and drop it when it stops.
    assert.deepEqual((await get('/instance', member)).json().addresses, [{ kind: 'tailnet', url: 'https://coltex.tail1234.ts.net', label: 'Tailscale' }])

    // Behind serve (no TRUST_PROXY), the server sees plain http on the tailnet name; the browser says https.
    const viaTailnet = await signIn('coltex.tail1234.ts.net', 'https://coltex.tail1234.ts.net')
    assert.equal(viaTailnet.statusCode, 200, viaTailnet.body)

    const member403 = await t.app.inject({ method: 'POST', url: '/api/admin/network/tailscale/logout', headers: { cookie: member } })
    assert.equal(member403.statusCode, 403)
    const out = await t.app.inject({ method: 'POST', url: '/api/admin/network/tailscale/logout', headers: { cookie: admin } })
    assert.equal(out.statusCode, 204)
    assert.equal((await get('/admin/network')).json().tailscale.state, 'needs-login')
    assert.deepEqual((await get('/instance', member)).json().addresses, [])
    assert.equal(fake.state.headerMissing, false, 'every LocalAPI call carries Sec-Tailscale')
    await fs.rm(t.tailscaleSocket, { force: true })
  })

  test('the built-in Tailscale: the server runs tailscaled when it is turned on, and stops it when turned off', async () => {
    const stateDir = path.join(t.dataDir, 'ts')
    const daemon = new TailscaleDaemon({ stateDir, binary: path.join(import.meta.dirname, 'fixtures/fake-tailscaled.mjs') })
    const network = new NetworkService({
      db: t.db,
      envPublicUrl: undefined,
      tailscale: new TailscaleClient({ socket: daemon.socket, target: 'http://127.0.0.1:3690', hostname: 'coltex-test' }),
      daemon,
    })
    try {
      assert.equal((await network.tailscaleState()).state, 'off')
      const on = await network.setTailscale(true)
      assert.equal(daemon.running(), true)
      assert.equal(on.enabled, true)
      assert.equal(on.state, 'needs-login')
      assert.equal(on.authUrl, 'https://login.tailscale.com/a/fake', 'turning it on starts the sign-in')

      // The setting survives a restart of the server.
      await daemon.stop()
      await network.apply()
      assert.equal(daemon.running(), true)

      const off = await network.setTailscale(false)
      assert.equal(off.state, 'off')
      assert.equal(daemon.running(), false)
      const missing = new TailscaleDaemon({ stateDir, binary: path.join(stateDir, 'no-such-tailscaled') })
      assert.equal(missing.installed(), false)
    } finally {
      await network.dispose()
    }
  })

  test('the built-in Cloudflare Tunnel: quick and token tunnels, their addresses in links, the token sealed', async () => {
    const network = new NetworkService({
      db: t.db,
      envPublicUrl: undefined,
      tailscale: new TailscaleClient({ socket: path.join(t.dataDir, 'none.sock'), target: 'http://127.0.0.1:3690' }),
      cloudflare: new CloudflareTunnel({
        binary: path.join(import.meta.dirname, 'fixtures/fake-cloudflared.mjs'),
        target: 'http://127.0.0.1:3690',
        metrics: '127.0.0.1:20977',
      }),
      box: new SecretBox('test-secret'),
    })
    const until = async (check: (s: Awaited<ReturnType<NetworkService['cloudflareState']>>) => boolean) => {
      for (let i = 0; i < 100; i++) {
        const s = await network.cloudflareState()
        if (check(s)) return s
        await new Promise(r => setTimeout(r, 50))
      }
      throw new Error(`state stayed ${JSON.stringify(await network.cloudflareState())}`)
    }
    try {
      assert.equal((await network.cloudflareState()).state, 'off')
      await network.setCloudflare({ enabled: true, mode: 'quick' })
      const quick = await until(s => s.state === 'connected' && !!s.url)
      assert.equal(quick.url, 'https://calm-river-1234.trycloudflare.com')
      assert.ok((await network.linkAddresses()).some(a => a.kind === 'cloudflare' && a.url === quick.url))

      await assert.rejects(network.setCloudflare({ enabled: true, mode: 'token' }), /token is needed/)
      // Tokens as the dashboard gives them: base64 JSON of account, tunnel and secret.
      const token = (secret: string) =>
        Buffer.from(JSON.stringify({ a: 'f'.repeat(32), t: '6ff42ae2-765d-4adf-8112-31c55c1551ef', s: secret })).toString('base64')
      // The tunnel ID next to it in the dashboard is the usual mix-up.
      await assert.rejects(network.setCloudflare({ enabled: true, mode: 'token', token: '6ff42ae2-765d-4adf-8112-31c55c1551ef' }), /tunnel ID/)
      await assert.rejects(network.setCloudflare({ enabled: true, mode: 'token', token: 'not a token at all' }), /Not a tunnel token/)
      // The whole install command works too.
      await network.setCloudflare({ enabled: true, mode: 'token', token: `sudo cloudflared service install ${token('good-secret')}` })
      const named = await until(s => s.state === 'connected' && s.mode === 'token' && s.urls.length > 0)
      assert.deepEqual(named.urls, ['https://tex.example.org'])
      assert.equal(named.hasToken, true)
      assert.equal(named.tunnelId, '6ff42ae2-765d-4adf-8112-31c55c1551ef', 'the saved tunnel is shown by its ID')
      const [row] = await t.db.execute<{ value: { cloudflare: { token: string } } }>(`select value from app_settings where key = 'network'`).then(r => r.rows)
      assert.ok(!JSON.stringify(row!.value).includes(token('good-secret').slice(0, 30)), 'the token is sealed')

      await network.setCloudflare({ enabled: true, mode: 'token', token: token('revoked-secret') })
      const failed = await until(s => s.state === 'error')
      assert.match(failed.error ?? '', /not valid/)

      assert.equal((await network.setCloudflare({ enabled: false })).state, 'off')
      assert.ok(!(await network.linkAddresses()).some(a => a.kind === 'cloudflare'))
    } finally {
      await network.dispose()
    }
  })

  test('cloudflared: one at a time, HTTP/2 when QUIC is blocked, longer waits when rate-limited', async () => {
    const pids = await fs.mkdtemp(path.join(t.dataDir, 'cf-pids-'))
    process.env.FAKE_CLOUDFLARED_PIDS = pids
    const tunnel = new CloudflareTunnel({
      binary: path.join(import.meta.dirname, 'fixtures/fake-cloudflared.mjs'),
      target: 'http://127.0.0.1:3690',
      metrics: '127.0.0.1:20978',
      restartDelayMs: 300,
    })
    const network = new NetworkService({
      db: t.db,
      envPublicUrl: undefined,
      tailscale: new TailscaleClient({ socket: path.join(t.dataDir, 'none.sock'), target: 'http://127.0.0.1:3690' }),
      cloudflare: tunnel,
      box: new SecretBox('test-secret'),
    })
    const token = (secret: string) => Buffer.from(JSON.stringify({ a: 'f'.repeat(32), t: '6ff42ae2-765d-4adf-8112-31c55c1551ef', s: secret })).toString('base64')
    const until = async (check: (s: Awaited<ReturnType<NetworkService['cloudflareState']>>) => boolean) => {
      for (let i = 0; i < 100; i++) {
        const s = await network.cloudflareState()
        if (check(s)) return s
        await new Promise(r => setTimeout(r, 50))
      }
      throw new Error(`state stayed ${JSON.stringify(await network.cloudflareState())}`)
    }
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    try {
      // A refused token exits and waits to restart; switching meanwhile must not leave that restart behind.
      await network.setCloudflare({ enabled: true, mode: 'token', token: token('revoked') })
      await until(s => s.state === 'error')
      await network.setCloudflare({ enabled: true, mode: 'token', token: token('good') })
      await until(s => s.state === 'connected')
      await sleep(1000)
      assert.equal((await fs.readdir(pids)).length, 1, 'only one cloudflared runs')
      assert.equal((await network.cloudflareState()).state, 'connected')

      // QUIC times out (a proxy drops UDP): it goes on over HTTP/2.
      await network.setCloudflare({ enabled: true, mode: 'token', token: token('quic-blocked') })
      const connected = await until(s => s.state === 'connected')
      assert.deepEqual(connected.urls, ['https://tex.example.org'])
      assert.equal(tunnel.onHttp2(), true)
      assert.equal((await fs.readdir(pids)).length, 1)

      // A rate-limited temporary link is explained, and asked for less and less often.
      process.env.FAKE_CLOUDFLARED = '429'
      await network.setCloudflare({ enabled: true, mode: 'quick' })
      const limited = await until(s => s.state === 'error')
      assert.match(limited.error ?? '', /limiting temporary links/)
      await sleep(1500)
      assert.equal((await fs.readdir(pids)).length, 0, 'waiting (1.8 s, then 3.6 s) instead of retrying at once')
      // Asking again with the same choice keeps the wait.
      await network.setCloudflare({ enabled: true, mode: 'quick' })
      assert.equal((await fs.readdir(pids)).length, 0)
      delete process.env.FAKE_CLOUDFLARED
    } finally {
      delete process.env.FAKE_CLOUDFLARED
      delete process.env.FAKE_CLOUDFLARED_PIDS
      await network.dispose()
    }
  })
})
