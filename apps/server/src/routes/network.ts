import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { CloudflareBody, CloudflareState, InstanceInfo, NetworkInfo, TailscaleEnableBody, TailscaleServeBody, TailscaleState } from '@coltex/shared'
import { requireAdmin, requireUser } from '../auth/fastify.ts'
import { config } from '../config.ts'
import type { Deps } from '../deps.ts'

/**
 * The public address and the built-in Tailscale (Settings → Network).
 * Ports and the server's own addresses stay in its environment: changing
 * them from here would need the Docker socket.
 */
export const networkRoutes: FastifyPluginAsyncZod<Deps> = async (app, { network }) => {
  // Everyone builds links (invitations, Git) from this.
  app.get('/instance', { schema: { response: { 200: InstanceInfo } } }, async req => {
    requireUser(req)
    return { addresses: await network.linkAddresses() }
  })

  app.get('/admin/network', { schema: { response: { 200: NetworkInfo } } }, async req => {
    requireAdmin(req)
    const [tailscale, cloudflare] = await Promise.all([network.tailscaleState(), network.cloudflareState()])
    return {
      envUrl: config.envPublicUrl ?? null,
      trustedOrigins: config.trustedOrigins.filter(o => o !== config.publicUrl),
      trustProxy: config.trustProxy === false ? null : String(config.trustProxy),
      clientIp: req.ip,
      // A proxy whose X-Forwarded-For isn't trusted: the client address stayed the proxy's.
      forwarded: req.headers['x-forwarded-for'] !== undefined && req.ip === req.socket.remoteAddress,
      tailscale,
      cloudflare,
    }
  })

  app.put('/admin/network/cloudflare', { schema: { body: CloudflareBody, response: { 200: CloudflareState } } }, async req => {
    requireAdmin(req)
    return network.setCloudflare(req.body)
  })

  app.put('/admin/network/tailscale', { schema: { body: TailscaleEnableBody, response: { 200: TailscaleState } } }, async req => {
    requireAdmin(req)
    return network.setTailscale(req.body.enabled)
  })

  app.post('/admin/network/tailscale/login', { schema: { response: { 200: TailscaleState } } }, async req => {
    requireAdmin(req)
    return network.tailscale.login()
  })

  app.post('/admin/network/tailscale/logout', async (req, reply) => {
    requireAdmin(req)
    await network.tailscale.logout()
    network.forget()
    return reply.code(204).send()
  })

  app.put('/admin/network/tailscale/serve', { schema: { body: TailscaleServeBody, response: { 200: TailscaleState } } }, async req => {
    requireAdmin(req)
    const state = await network.tailscale.serve(req.body.enabled)
    network.forget()
    return state
  })
}
