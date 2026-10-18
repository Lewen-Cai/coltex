import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@coltex/shared'
import { api } from './api.ts'

const readKey = (projectId: string) => `coltex:chat-read:${projectId}`

function readMark(projectId: string): string {
  try {
    return localStorage.getItem(readKey(projectId)) ?? ''
  } catch {
    return ''
  }
}

/**
 * A project's chat: the latest messages (refetched whenever the server says
 * the chat changed), older pages on demand, and how many messages from others
 * arrived since this browser last had the chat open.
 */
export function useChat(projectId: string, chatVersion: number, userId: string, open: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>()
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string>()
  /** createdAt of the newest message seen with the chat open (ISO strings sort by time). */
  const [readUpTo, setReadUpTo] = useState(() => readMark(projectId))
  const older = useRef<ChatMessage[]>([])

  const refresh = useCallback(async () => {
    try {
      const page = await api.chat(projectId)
      // Keep older pages already loaded, minus anything deleted or edited since (the latest page wins).
      const latestIds = new Set(page.messages.map(m => m.id))
      const oldest = page.messages[0]?.createdAt ?? ''
      older.current = older.current.filter(m => !latestIds.has(m.id) && m.createdAt <= oldest)
      setMessages([...older.current, ...page.messages])
      if (older.current.length === 0) setHasMore(page.hasMore)
      setError(undefined)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh, chatVersion])

  const loadOlder = useCallback(async () => {
    const first = messages?.[0]
    if (!first) return
    const page = await api.chat(projectId, first.id)
    older.current = [...page.messages, ...older.current]
    setMessages(current => [...page.messages, ...(current ?? [])])
    setHasMore(page.hasMore)
  }, [messages, projectId])

  const newest = messages?.at(-1)?.createdAt ?? ''
  useEffect(() => {
    if (!open || !newest || newest <= readUpTo) return
    setReadUpTo(newest)
    try {
      localStorage.setItem(readKey(projectId), newest)
    } catch {}
  }, [open, newest, readUpTo, projectId])

  const unread = open ? 0 : (messages?.filter(m => m.userId !== userId && m.createdAt > readUpTo).length ?? 0)

  return { messages, hasMore, error, unread, refresh, loadOlder }
}
