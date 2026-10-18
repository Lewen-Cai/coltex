// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/languages/latex/linter/latex-linter.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { EditorView } from '@codemirror/view'
import { Diagnostic } from '@codemirror/lint'
import { errorsToDiagnostics, LintError } from './errors-to-diagnostics'
import { mergeCompatibleOverlappingDiagnostics } from './merge-overlapping-diagnostics'

// ColTex: the worker starts on first use, not when the module loads (tests and
// editors without code check never start it).
let worker: Worker | null = null
const lintWorker = () => {
  if (!worker) {
    worker = new Worker(new URL('./latex-linter.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', onMessage)
  }
  return worker
}

class Deferred {
  public promise: Promise<readonly Diagnostic[]>
  public resolve?: (value: PromiseLike<Diagnostic[]> | Diagnostic[]) => void
  public reject?: (reason?: any) => void

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

let linterPromise: Promise<any> | null = null // promise which will resolve to results of the current linting
let queuedRequest: Deferred | null = null // deferred promise for incoming linting requests while the current one is running
let currentView: EditorView | null = null

let currentResolver: ((value: Diagnostic[]) => void) | null = null

const runLinter = () => {
  lintWorker().postMessage({ text: currentView!.state.doc.toString() })
  return new Promise<Diagnostic[]>(resolve => {
    currentResolver = resolve
  })
}

function onMessage(event: MessageEvent) {
  if (event.data && event.data.errors && currentView) {
    const errors = event.data.errors as LintError[]
    const editorState = currentView.state
    const doc = editorState.doc
    const cursorPosition = editorState.selection.main.head
    const diagnostics = errorsToDiagnostics(errors, cursorPosition, doc.length)
    const mergedDiagnostics = mergeCompatibleOverlappingDiagnostics(diagnostics)
    currentResolver!(mergedDiagnostics)
    // make compile controller aware of lint errors via editor:lint event
    const hasLintingError = errors.some(e => e.type !== 'info')
    window.dispatchEvent(
      new CustomEvent('editor:lint', {
        detail: { hasLintingError },
      })
    )
  }
}

const executeQueuedAction = (deferred: Deferred) => {
  runLinter().then(result => deferred.resolve!(result))
  return deferred.promise
}

const processQueue = () => {
  if (queuedRequest) {
    linterPromise = executeQueuedAction(queuedRequest).then(processQueue)
    queuedRequest = null
  } else {
    linterPromise = null
  }
}

export const latexLinter = (view: EditorView) => {
  // always update the view, we use it to filter the results to the current buffer
  currentView = view
  // if a linting request isn't already running, start it running
  if (!linterPromise) {
    linterPromise = runLinter()
    linterPromise.then(processQueue)
    return linterPromise
  } else {
    // otherwise create a single deferred promise which we will return to all subsequent requests
    if (!queuedRequest) {
      queuedRequest = new Deferred()
    }
    return queuedRequest.promise
  }
}
