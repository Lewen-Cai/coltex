import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AiStreamEvent } from '@coltex/shared'

/** Server-sent events for an AI conversation: a snapshot first, then live updates. */
export function streamAiEvents(req: FastifyRequest, reply: FastifyReply, subscribe: (send: (e: AiStreamEvent) => void) => () => void): void {
  reply.hijack()
  const res = reply.raw
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    // Tell reverse proxies (nginx) not to buffer the stream.
    'x-accel-buffering': 'no',
  })
  const unsubscribe = subscribe(e => res.write(`data: ${JSON.stringify(e)}\n\n`))
  const ping = setInterval(() => res.write(': ping\n\n'), 15_000)
  req.raw.on('close', () => {
    clearInterval(ping)
    unsubscribe()
  })
}
