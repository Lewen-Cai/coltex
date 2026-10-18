// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/hunspell/HunspellManager.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

/* eslint-disable no-dupe-class-members */

type SpellMessage = {
  type: 'spell'
  words: string[]
}

type SuggestMessage = {
  type: 'suggest'
  word: string
}

type AddWordMessage = {
  type: 'add_word'
  word: string
}

type RemoveWordMessage = {
  type: 'remove_word'
  word: string
}

type DestroyMessage = {
  type: 'destroy'
}

type Message = { id?: string } & (
  | SpellMessage
  | SuggestMessage
  | AddWordMessage
  | RemoveWordMessage
  | DestroyMessage
)

type EmptyResult = Record<string, never>

type ErrorResult = {
  error: true
}

type SpellResult = {
  misspellings: { index: number }[]
}

type SuggestResult = {
  suggestions: string[]
}

type ResultCallback =
  | ((value: SpellResult | ErrorResult) => void)
  | ((value: SuggestResult | ErrorResult) => void)
  | ((value: EmptyResult | ErrorResult) => void)

// ColTex: message ids come from a counter (crypto.randomUUID needs a secure
// context, and ColTex is often served over plain http on a LAN).
let nextMessageId = 0

export class HunspellManager {
  baseAssetPath: string
  dictionariesRoot: string
  hunspellWorker!: Worker
  abortController: AbortController | undefined
  listening = false
  loaded = false
  loadingFailed = false
  pendingMessages: Message[] = []
  callbacks: Map<string, ResultCallback> = new Map()
  private readonly language: string
  private readonly learnedWords: string[]

  // ColTex: no constructor parameter properties (erasable syntax), and the
  // dictionaries root is passed in instead of read from a meta tag.
  constructor(language: string, learnedWords: string[], dictionariesRoot = '/dictionaries/') {
    this.language = language
    this.learnedWords = learnedWords
    this.baseAssetPath = window.location.href

    this.dictionariesRoot = dictionariesRoot

    this.hunspellWorker = new Worker(new URL('./hunspell.worker.ts', import.meta.url), { type: 'module' })

    this.hunspellWorker.addEventListener('message', this.receive.bind(this))
  }

  destroy() {
    this.send({ type: 'destroy' }, () => {
      this.hunspellWorker.terminate()
    })
  }

  send(
    message: AddWordMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: RemoveWordMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: DestroyMessage,
    callback: (value: EmptyResult | ErrorResult) => void
  ): void

  send(
    message: SuggestMessage,
    callback: (value: SuggestResult | ErrorResult) => void
  ): void

  send(
    message: SpellMessage,
    callback: (value: SpellResult | ErrorResult) => void
  ): void

  send(message: Message, callback: ResultCallback): void {
    if (this.loadingFailed) {
      // ColTex: a manager whose dictionary failed to load still terminates its worker.
      if (message.type === 'destroy') this.hunspellWorker.terminate()
      return // ignore the message
    }

    if (callback) {
      message.id = String(++nextMessageId)
      this.callbacks.set(message.id, callback)
    }

    if (this.listening) {
      this.hunspellWorker.postMessage(message)
    } else {
      this.pendingMessages.push(message)
    }
  }

  receive(event: MessageEvent) {
    const { id, ...rest } = event.data
    if (id) {
      const callback = this.callbacks.get(id)
      if (callback) {
        this.callbacks.delete(id)
        callback(rest)
      }
    } else if (rest.listening) {
      this.listening = true
      this.hunspellWorker.postMessage({
        type: 'init',
        lang: this.language,
        learnedWords: this.learnedWords,
        baseAssetPath: this.baseAssetPath,
        dictionariesRoot: this.dictionariesRoot,
      })
      for (const message of this.pendingMessages) {
        this.hunspellWorker.postMessage(message)
      }
      // ColTex: clear after sending all of them (upstream cleared inside the loop).
      this.pendingMessages.length = 0
    } else if (rest.loaded) {
      this.loaded = true
    } else if (rest.loadingFailed) {
      // ColTex: no error reporter; log instead.
      console.error(`Spell check: loading the ${this.language} dictionary failed`, rest.loadingFailed)
      this.loadingFailed = true
      this.pendingMessages.length = 0
    }
  }
}
