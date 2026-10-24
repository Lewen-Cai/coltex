import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { PAGE_CSP, securityHeaders } from '../src/security-headers.ts'
import { cookieFrom, createTestApp } from './helpers.ts'

type TestApp = Awaited<ReturnType<typeof createTestApp>>

describe('security headers', () => {
  let t: TestApp
  let admin = ''

  before(async () => {
    t = await createTestApp()
    admin = cookieFrom(
      await t.app.inject({ method: 'POST', url: '/api/setup', payload: { name: 'Admin', email: 'admin@example.com', password: 'Long-password-1' } }),
    )
  })
  after(() => t.close())

  test('every response forbids framing and sniffing, and keeps the referrer on this site', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/health' })
    assert.equal(res.headers['x-content-type-options'], 'nosniff')
    assert.equal(res.headers['x-frame-options'], 'DENY')
    assert.equal(res.headers['referrer-policy'], 'same-origin')
  })

  test('HTML pages get the CSP; responses with their own keep it', async () => {
    const app = Fastify()
    securityHeaders(app)
    app.get('/page', (_req, reply) => reply.type('text/html; charset=utf-8').send('<!doctype html>'))
    app.get('/preview', (_req, reply) => reply.type('text/html').header('content-security-policy', 'sandbox').send('<p>'))
    app.get('/data', () => ({ ok: true }))
    assert.equal((await app.inject('/page')).headers['content-security-policy'], PAGE_CSP)
    assert.equal((await app.inject('/preview')).headers['content-security-policy'], 'sandbox')
    assert.equal((await app.inject('/data')).headers['content-security-policy'], undefined)
    assert.match(PAGE_CSP, /frame-ancestors 'none'/)
    assert.doesNotMatch(PAGE_CSP, /'unsafe-eval'|script-src[^;]*'unsafe-inline'/)
  })

  test('the API description is only for people signed in', async () => {
    assert.equal((await t.app.inject({ method: 'GET', url: '/api/openapi.json' })).statusCode, 401)
    const res = await t.app.inject({ method: 'GET', url: '/api/openapi.json', headers: { cookie: admin } })
    assert.equal(res.statusCode, 200)
    assert.ok(res.json().paths['/api/projects'])
  })
})
