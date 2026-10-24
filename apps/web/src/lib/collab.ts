import { useEffect, useState } from 'react'
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import { toast } from 'sonner'
import * as Y from 'yjs'
import { changesMap } from '@coltex/review'
import type { SessionUser } from './auth.ts'
import { avatarHue, hueColor } from './avatar-colors.ts'

/** Must match the server (apps/server/src/collab/server.ts). */
const COLLAB_PATH = '/api/collab'
const PROJECT_DOC = '~project'
export const TEXT_KEY = 'content'
/** Close reason prefix when the server refuses a reviewer's untracked edit (apps/server/src/collab/server.ts). */
const SUGGESTION_REFUSED = 'coltex/suggestion-refused'

export type CollabUser = { id: string; name: string; color: string; colorLight: string }

/** A person's colour: the one they chose, else a stable one made from their id (y-codemirror uses `color`/`colorLight` for cursors). */
export function userColor(userId: string): string {
  return hueColor(avatarHue(userId))
}

/**
 * The awareness as seen by the editor, without the person's other sessions
 * (another tab, another device): their cursors are the person's own and only
 * confuse them. Everything but `getStates` passes through, so the local cursor
 * still reaches everyone else.
 */
export function withoutOwnSessions<A extends { clientID: number; getStates(): Map<number, Record<string, any>>; getLocalState(): Record<string, any> | null }>(
  awareness: A,
): A {
  return new Proxy(awareness, {
    get(target, prop) {
      if (prop === 'getStates') {
        return () => {
          // Read at call time: the local user is set once the document connects.
          const me = (target.getLocalState()?.user as { id?: string } | undefined)?.id
          const states = new Map(target.getStates())
          if (me) {
            for (const [clientId, state] of states) {
              if (clientId !== target.clientID && (state.user as { id?: string } | undefined)?.id === me) states.delete(clientId)
            }
          }
          return states
        }
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

export function collabUser(user: SessionUser): CollabUser {
  const color = userColor(user.id)
  return { id: user.id, name: user.name, color, colorLight: color.replace(')', ' / 0.18)') }
}

/**
 * One WebSocket per editor page, multiplexing the project doc and the open file.
 * Created inside the effect (not memoised) so StrictMode's mount/unmount/mount
 * never reuses a destroyed socket.
 */
export function useCollabSocket(): HocuspocusProviderWebsocket | undefined {
  const [socket, setSocket] = useState<HocuspocusProviderWebsocket>()
  useEffect(() => {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const s = new HocuspocusProviderWebsocket({ url: `${scheme}://${window.location.host}${COLLAB_PATH}` })
    setSocket(s)
    return () => s.destroy()
  }, [])
  return socket
}

export type Peer = { clientId: number; user: CollabUser; path?: string }

/**
 * Presence for the whole project (who is here, which file they have open) and
 * change counters the server bumps whenever the file tree or the review data
 * (comments, tracked changes) or the chat changes.
 */
export function useProjectPresence(
  socket: HocuspocusProviderWebsocket | undefined,
  projectId: string,
  me: CollabUser,
  openPath?: string,
) {
  const [peers, setPeers] = useState<Peer[]>([])
  const [treeVersion, setTreeVersion] = useState(0)
  const [reviewVersion, setReviewVersion] = useState(0)
  const [chatVersion, setChatVersion] = useState(0)
  const [connected, setConnected] = useState(true)
  const [provider, setProvider] = useState<HocuspocusProvider>()

  useEffect(() => {
    if (!socket) return
    const provider = new HocuspocusProvider({
      websocketProvider: socket,
      name: `${projectId}/${PROJECT_DOC}`,
      // Auth uses the session cookie sent with the WebSocket upgrade.
      token: 'cookie',
    })
    setProvider(provider)
    provider.attach()
    const awareness = provider.awareness!
    const meta = provider.document.getMap('meta')
    const onAwareness = () => {
      const list: Peer[] = []
      awareness.getStates().forEach((state, clientId) => {
        // The person's other sessions aren't "people in this project".
        if (clientId !== awareness.clientID && state.user && state.user.id !== me.id) list.push({ clientId, user: state.user, path: state.path })
      })
      setPeers(list)
    }
    const onMeta = () => {
      setTreeVersion((meta.get('treeVersion') as number | undefined) ?? 0)
      setReviewVersion((meta.get('reviewVersion') as number | undefined) ?? 0)
      setChatVersion((meta.get('chatVersion') as number | undefined) ?? 0)
    }
    const onStatus = ({ status }: { status: string }) => setConnected(status === 'connected')
    awareness.on('change', onAwareness)
    meta.observe(onMeta)
    provider.on('status', onStatus)
    return () => {
      awareness.off('change', onAwareness)
      meta.unobserve(onMeta)
      provider.off('status', onStatus)
      provider.destroy()
    }
  }, [socket, projectId])

  useEffect(() => {
    provider?.awareness?.setLocalState({ user: me, path: openPath })
  }, [provider, me, openPath])

  return { peers, treeVersion, reviewVersion, chatVersion, connected }
}

export type CollabDoc = {
  ydoc: Y.Doc
  ytext: Y.Text
  provider: HocuspocusProvider
  undoManager: Y.UndoManager
}

/**
 * Join the collaborative session for one text file. Resolves to undefined
 * until the initial sync completes, so editors start from the shared content.
 */
export function useCollabDoc(
  socket: HocuspocusProviderWebsocket | undefined,
  projectId: string,
  docId: string | undefined,
  me: CollabUser,
) {
  const [doc, setDoc] = useState<CollabDoc>()
  const [unsynced, setUnsynced] = useState(0)
  const [failed, setFailed] = useState<string>()
  /** Bumped to start over from the server's copy (after a refused edit). */
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    setDoc(undefined)
    setFailed(undefined)
    if (!socket || !docId) return
    const ydoc = new Y.Doc()
    const ytext = ydoc.getText(TEXT_KEY)
    const provider = new HocuspocusProvider({
      websocketProvider: socket,
      name: `${projectId}/${docId}`,
      document: ydoc,
      token: 'cookie',
      // Undo covers tracked-change records too, so undoing a tracked edit also drops its record.
      onSynced: () => setDoc(prev => prev ?? { ydoc, ytext, provider, undoManager: new Y.UndoManager([ytext, changesMap(ydoc)]) }),
      onUnsyncedChanges: ({ number }) => setUnsynced(number),
      // Hocuspocus sends `permission-denied` unless the server gave a reason of its own.
      onAuthenticationFailed: ({ reason }) =>
        setFailed(!reason || reason === 'permission-denied' ? 'Access denied' : reason),
      onClose: ({ event }) => {
        // The refused edit lives on in this copy and would be re-sent: drop the copy.
        if (event.reason?.startsWith(SUGGESTION_REFUSED)) {
          toast.error('That edit was not saved: reviewers can only suggest tracked changes. The file was reloaded.')
          setGeneration(g => g + 1)
        }
      },
    })
    provider.attach()
    provider.awareness?.setLocalStateField('user', me)
    return () => {
      provider.destroy()
      ydoc.destroy()
    }
    // `me` only changes with the signed-in user, which remounts the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId, docId, generation])

  return { doc, unsynced, failed }
}
