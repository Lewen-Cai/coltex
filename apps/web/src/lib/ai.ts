import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiApplyBody, AiItem, AiMessageBody, AiPreference, AiSaveProposedSkill, AiSessionState, AiStatus, AiStreamEvent, CompileResult } from '@coltex/shared'
import { toast } from 'sonner'
import { api } from './api.ts'

/**
 * Whether the assistant is set up for the current user (checked once per
 * page), the models they may use, and their pick. `choose` changes the pick
 * at once and saves it for next time.
 */
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus>()
  useEffect(() => {
    api.aiStatus().then(setStatus, () =>
      setStatus({ available: false, model: null, thinkingLevel: 'off', models: [], auto: { available: false, on: false, light: null, strong: null } }),
    )
  }, [])
  const choose = useCallback((pick: AiPreference) => {
    setStatus(prev => {
      const model = prev?.models.find(m => m.provider === pick.model.provider && m.id === pick.model.id)
      if (!prev || !model) return prev
      const thinkingLevel = model.thinkingLevels.includes(pick.thinkingLevel) ? pick.thinkingLevel : (model.thinkingLevels.at(-1) ?? 'off')
      return { ...prev, model, thinkingLevel, auto: { ...prev.auto, on: pick.auto && prev.auto.available } }
    })
    api.aiSetPreference(pick).then(setStatus, e => toast.error((e as Error).message))
  }, [])
  return { status, choose }
}

const availability = new Map<string, Promise<boolean>>()

/**
 * Whether this person has the AI agent: pages about it, such as the skills,
 * show only then. Asked again whenever `refresh` changes (the settings
 * sidebar passes the route), so connecting a provider shows them without a
 * reload; requests made at the same time share one.
 */
export function useAiAvailable(userId: string, refresh?: unknown): boolean | undefined {
  const [available, setAvailable] = useState<boolean>()
  useEffect(() => {
    let request = availability.get(userId)
    if (!request) {
      request = api.aiStatus().then(s => s.available, () => false)
      availability.set(userId, request)
      const settled = request
      void settled.finally(() => availability.get(userId) === settled && availability.delete(userId))
    }
    let live = true
    void request.then(a => live && setAvailable(a))
    return () => {
      live = false
    }
  }, [userId, refresh])
  return available
}

/** The pick to send with a message, so it applies even before saving it has finished. */
export function aiPick(status: AiStatus | undefined): AiPreference | undefined {
  return status?.model
    ? { model: { provider: status.model.provider, id: status.model.id }, thinkingLevel: status.thinkingLevel, auto: status.auto.on }
    : undefined
}

function upsert(items: AiItem[], item: AiItem): AiItem[] {
  const i = items.findIndex(x => x.id === item.id)
  if (i === -1) return [...items, item]
  const next = items.slice()
  next[i] = item
  return next
}

function reduce(prev: AiSessionState | undefined, e: AiStreamEvent): AiSessionState | undefined {
  if (e.type === 'snapshot') return e.state
  if (!prev) return prev
  switch (e.type) {
    case 'item':
      return { ...prev, items: upsert(prev.items, e.item) }
    case 'delta':
      return {
        ...prev,
        items: prev.items.map(i => (i.id === e.id && i.kind === 'assistant' ? { ...i, text: i.text + e.text } : i)),
      }
    case 'changes':
      return { ...prev, changes: e.changes }
    case 'running':
      return { ...prev, running: e.running }
    case 'built':
      return prev
  }
}

/**
 * The user's conversation with the assistant about this project. Updates
 * arrive over server-sent events; the first event is always a full snapshot,
 * so reconnecting (EventSource retries on its own) resynchronises.
 */
export function useAiSession(projectId: string, enabled: boolean, onBuilt?: (compile: CompileResult) => void) {
  const [state, setState] = useState<AiSessionState>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  // Bumped after "new chat": the server replaced the session, so resubscribe.
  const [epoch, setEpoch] = useState(0)

  // The draft was applied on its own (auto, full access): its build goes to the PDF viewer.
  const built = useRef(onBuilt)
  built.current = onBuilt

  useEffect(() => {
    if (!enabled) return
    const source = new EventSource(api.aiEventsUrl(projectId))
    source.onmessage = ev => {
      const event = JSON.parse(ev.data) as AiStreamEvent
      if (event.type === 'built') built.current?.(event.compile)
      else setState(prev => reduce(prev, event))
    }
    return () => source.close()
  }, [projectId, enabled, epoch])

  const guard = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setError(undefined)
    setBusy(true)
    try {
      return await action()
    } catch (e) {
      setError((e as Error).message)
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])

  const send = useCallback((body: AiMessageBody) => guard(() => api.aiSend(projectId, body)), [guard, projectId])
  const abort = useCallback(() => guard(() => api.aiAbort(projectId)), [guard, projectId])
  const discard = useCallback(() => guard(() => api.aiDiscard(projectId)), [guard, projectId])
  const reset = useCallback(
    () =>
      guard(async () => {
        setState(await api.aiReset(projectId))
        setEpoch(n => n + 1)
      }),
    [guard, projectId],
  )
  /** Reopen a saved conversation (the server switches the session; resubscribe like a new chat). */
  const open = useCallback(
    (conversation: string) =>
      guard(async () => {
        setState(await api.aiOpenConversation(projectId, conversation))
        setEpoch(n => n + 1)
      }),
    [guard, projectId],
  )
  /** Delete a saved conversation; when it is the open one, the server starts a new one. */
  const remove = useCallback(
    (conversation: string) =>
      guard(async () => {
        await api.aiDeleteConversation(projectId, conversation)
        setEpoch(n => n + 1)
      }),
    [guard, projectId],
  )
  const conversations = useCallback(() => api.aiConversations(projectId), [projectId])
  const rename = useCallback((conversation: string, title: string) => api.aiRenameConversation(projectId, conversation, title), [projectId])
  const compact = useCallback((preference?: AiPreference) => guard(() => api.aiCompact(projectId, preference)), [guard, projectId])
  /** The skills for the "/" menu: the person's and the project's. */
  const skillMenu = useCallback(() => api.skillMenu(projectId), [projectId])
  /** Save a skill the agent drafted (errors go to the caller: the editor dialog shows them). */
  const saveSkill = useCallback((item: string, body: AiSaveProposedSkill) => api.aiSaveProposedSkill(projectId, item, body), [projectId])
  const apply = useCallback((body: AiApplyBody) => guard(() => api.aiApply(projectId, body)), [guard, projectId])
  const undo = useCallback(
    (): Promise<{ message: string; compile: CompileResult } | undefined> => guard(() => api.aiUndo(projectId)),
    [guard, projectId],
  )

  return { state, error, busy, setError, send, abort, discard, reset, open, remove, compact, conversations, rename, skillMenu, saveSkill, apply, undo }
}

export type AiSessionHandle = ReturnType<typeof useAiSession>

/**
 * The person's skills chat (Settings → AI skills): the agent that helps
 * write skills. Like `useAiSession`, without a project or a draft.
 */
export function useSkillChat() {
  const [state, setState] = useState<AiSessionState>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    const source = new EventSource(api.skillChatEventsUrl)
    source.onmessage = ev => setState(prev => reduce(prev, JSON.parse(ev.data) as AiStreamEvent))
    return () => source.close()
  }, [epoch])

  const guard = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setError(undefined)
    setBusy(true)
    try {
      return await action()
    } catch (e) {
      setError((e as Error).message)
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])

  const send = useCallback((body: AiMessageBody) => guard(() => api.skillChatSend(body)), [guard])
  const abort = useCallback(() => guard(() => api.skillChatAbort()), [guard])
  const reset = useCallback(
    () =>
      guard(async () => {
        setState(await api.skillChatReset())
        setEpoch(n => n + 1)
      }),
    [guard],
  )
  /** Save a drafted skill (errors go to the caller: a name clash asks whether to replace). */
  const saveSkill = useCallback((item: string, body: AiSaveProposedSkill) => api.skillChatSave(item, body), [])

  return { state, error, busy, send, abort, reset, saveSkill }
}
