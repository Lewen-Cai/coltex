/**
 * A server-sent event stream that keeps coming back. The browser reconnects an
 * EventSource by itself only after a network error; an error answer (a proxy's
 * 502 while the server restarts) closes it for good, and the page would wait
 * for events that never come. Every stream starts with what it needs to catch
 * up (a snapshot, the unread count), so reconnecting is enough.
 */
export function openEventStream(url: string, onMessage: (data: string) => void): () => void {
  let source: EventSource | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let delay = 1000
  let closed = false
  const connect = () => {
    source = new EventSource(url)
    source.onopen = () => {
      delay = 1000
    }
    source.onmessage = ev => onMessage(ev.data as string)
    source.onerror = () => {
      if (closed || source?.readyState !== EventSource.CLOSED) return
      timer = setTimeout(connect, delay)
      delay = Math.min(delay * 2, 30_000)
    }
  }
  connect()
  return () => {
    closed = true
    clearTimeout(timer)
    source?.close()
  }
}
