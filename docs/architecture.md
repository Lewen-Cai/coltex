# Architecture

## Decisions

| Area | Choice | Notes |
|---|---|---|
| Language | TypeScript everywhere | Node runs `.ts` directly via type stripping (erasable syntax only) |
| Monorepo | pnpm workspaces + Turborepo | |
| Web | React 19, Vite, Tailwind 4, shadcn/ui (Radix), motion, CodeMirror 6, PDF.js | LaTeX/BibTeX language support ported from Overleaf (`packages/latex-language`); provider logos from LobeHub (`@lobehub/icons-static-svg`, MIT) |
| API | Fastify 5 + Zod (OpenAPI at `/api/openapi.json`) | |
| Realtime | Yjs + Hocuspocus 4 (in the API process, `/api/collab`), y-codemirror.next | One WebSocket per page multiplexes the project doc and the open file |
| Database | PostgreSQL 18 + Drizzle (migrations in `apps/server/drizzle`, applied at startup) | |
| Queue | Valkey + BullMQ | |
| Auth | better-auth 1.7, email+password, sign-up disabled, admin plugin | argon2id hashing; first-run setup + single-use invites; telemetry off; OIDC later |
| Storage | Local disk (default) or S3-compatible | `ProjectStore` interface in `apps/server/src/storage` |
| Backup | WebDAV target (DB dump + project files + history bundles) | `apps/server/src/backup`, restore via `src/cli.ts` |
| History / Git bridge | One bare git repo per project, `git http-backend` | |
| AI | Pi (`@earendil-works/pi-ai`, `pi-agent-core`; formerly `@mariozechner/*`) behind our own harness | API keys, subscription sign-in and OpenAI-compatible endpoints, admin-managed |
| Proxy | Caddy (optional compose profile) | |
| License | AGPL-3.0 | Ported Overleaf code tracked in `NOTICE` |

## Accounts and permissions

- **First run**: `GET /api/setup` reports `needsSetup` while there are no
  users. `POST /api/setup` creates the first admin, guarded by a Postgres
  advisory lock.
- **Invites**: admins create single-use links (`/#/invite/<token>`),
  optionally bound to one email. Only the SHA-256 of the token is stored.
  Redeeming claims the invite atomically before the account is created.
- **Sessions**: better-auth cookie sessions. The session secret comes from
  `COLTEX_SECRET`, or is generated once into `DATA_DIR/.secret`.
- **Project roles**: `owner` > `editor` > `reviewer` > `viewer`
  (`project_members`, as in Overleaf). Viewers can read, compile, ask the
  assistant and take part in comment threads. Reviewers can also type, but
  only as tracked suggestions (enforced by the server, see below). Editors can
  change files and settings, accept or reject suggestions, switch track
  changes, and apply the assistant's drafts. Only owners can share, transfer
  ownership, or delete. Non-members get 404. Changing or removing someone's
  role closes their open collaboration connections, so they reconnect with
  the new rights.
- **Sharing is with accounts only** (no email is ever sent, no share links).
  Owners add people who have an account on the server, found by name or email
  (`GET /api/users/search`, suspended accounts left out). New accounts come
  from single-use invitation links created by admins or by inviters (members
  who may invite members only); admins also pick the new account's role and
  AI group.
- **How Overleaf CE does it** (for comparison): admins create accounts at
  `/admin/register` and get a set-password link to pass on. Project invites go
  by email (an existing user also sees an in-app notification). Link sharing
  (read-only / read-and-write token links) works without email.
- **User deletion** cascades in the DB; a better-auth `user.delete` hook also
  removes the files of projects the user owned.
- **The project list** works like Overleaf's. Archive and trash are each
  member's own (`project_members.archived_at` / `trashed_at`, at most one is
  set). Archived and trashed projects only appear in their own views, and the
  trash is the only place to delete for good: owners delete for everyone,
  other members leave. Tags (`tags`, `project_tags`) are per user and never
  shown to others; leaving a project drops your tags on it. Copying a project
  (`POST /projects/:id/copy`, any member) gives the copier a new project with
  the files and settings, but not the members, history or comments.

## Files

`ProjectStore` exposes files plus folders (empty folders included). Every
mutation goes through a typed path API:

- `PUT files/*` writes a file. `?create=true` refuses to overwrite it (409).
- `POST folders` and `DELETE folders/*` create and delete folders. Delete is recursive.
- `POST move {from, to}` moves or renames a file or folder. It never
  overwrites (409), refuses to move a folder into itself (400), and allows
  case-only renames on case-insensitive filesystems. The project's main
  document follows the move.

File downloads go out with their real image type and with
`Content-Security-Policy: sandbox` plus `nosniff`, because project files are
user content (an SVG must never run script on the app's origin).

## Import / export

`POST /api/projects/import?name=` takes a zip body (`application/zip`, up to
`MAX_IMPORT_MB`).

- **Limits**: entry count, per-file size, and total expanded size are checked
  against the bytes actually read.
- **Rejected**: unsafe paths (`..`, absolute) and encrypted entries reject the
  whole archive.
- **Skipped**: symlinks and clutter (`__MACOSX`, `.DS_Store`, `.git`). A single
  wrapping folder is stripped.
- **Main document**: the `.tex` file with an uncommented `\documentclass`
  (prefer `main.tex`, then the shallowest path).
- **Engine**: imported projects get `auto`, like new ones (see below).

### Engine detection

A project's compiler setting is `auto` (the default) or an engine. For
`auto`, `engineFor` (`apps/server/src/projects/engine.ts`) picks the engine
at each build, so it follows the document as it changes: `% !TEX program`,
then `latexmkrc` `$pdf_mode`, then what the preamble loads, following its
`\input`s and the project's own `.sty`/`.cls` files (fontspec/ctex/xeCJK/
unicode-math or a ctex class → XeLaTeX; luacode/luatexja → LuaLaTeX; else
pdfLaTeX). `CompileJob` always carries a concrete engine; the worker forces
a rebuild when it changes.

`GET /api/projects/:id/download.zip` streams the sources, including empty
folders, with an RFC 5987 filename so non-ASCII names survive.

## Editor language support

`packages/latex-language` ports Overleaf's source-editor language layer: the
Lezer LaTeX and BibTeX grammars, highlighting, folding, indentation, close
brackets, and completions. Completions cover commands, environments
(snippets), `\ref`, `\cite`, `\usepackage`, `\documentclass`, `\input`,
`\includegraphics`, and bibliography styles, plus commands and environments
defined in the open document.

Project-wide metadata (labels, bib keys, packages, the file tree) comes from
`useProjectMetadata` in the web app. It fetches the project's `.tex`/`.bib`
sources once, keeps the open document current, and rebuilds when an edit
touches `\label`/`\usepackage` (the editor emits `editor:metadata-outdated`).

**Editor toolbar** (`components/EditorToolbar.tsx`): undo/redo, heading level,
bold/italic, maths, the symbol palette, link, cross-reference, citation,
comment, figure, table (size picker) and lists with indentation, as in
Overleaf. The commands are Overleaf's (`packages/latex-language/src/extensions/toolbar`).
The symbol palette (about 230 symbols in five categories, searchable by
command or name, with recently used ones first) is ColTex's own, because
Overleaf's palette is not part of Overleaf CE.

**Visual editor** (`packages/latex-language/src/extensions/visual`): Overleaf's
visual mode, switched per browser from the toolbar (Code | Visual) without
rebuilding the editor. It decorates the LaTeX source (headings, title block,
lists, figures, footnotes, references, maths), so collaboration, track
changes, comments and spell checking keep working on the same text. Maths is
typeset with KaTeX (the preamble's \newcommand/\DeclareMathOperator become
macros) instead of MathJax; figures show project images and, through pdf.js,
PDF figures. Not ported yet: the table generator (tabulars stay as source) and
the figure editing dialog.

**Spell checking** (`apps/web/src/spelling`) is Overleaf's: Hunspell compiled
to WebAssembly runs in a Web Worker, and a CodeMirror extension checks the
plain-text parts of the visible LaTeX (the syntax tree's `Normal` nodes),
underlines misspellings and offers suggestions on right-click. CJK text is
never checked (Hangul only with the Korean dictionary). The language is a
project setting (`projects.spell_check_language`, '' = off) that editors
change from the project menu. Each user has a dictionary of learned words
(`learned_words`, `/api/me/dictionary`, managed under Settings →
Dictionary) that applies in all their projects. A correction is an ordinary
edit, so a reviewer's correction becomes a tracked suggestion. The 72
dictionaries (Overleaf's `overleaf/dictionaries`, about 270 MB) are fetched by
`apps/web/scripts/dictionaries.ts` (pinned SHA-256) into `apps/web/vendor`
and copied into the build; the browser downloads only the project's language.

**Word count** (`packages/latex-language/src/word-count`) is Overleaf's
client-side count: it parses the main file and the files it `\input`s or
`\include`s and counts words and characters in the text, headings, abstract,
captions, footnotes and the rest, plus inline and display maths, honouring
`%TC:ignore`. ColTex adds a count of CJK characters per part. The sources come
from `GET /api/projects/:id/sources`, which flushes live edits first.

## Real-time collaboration

```
browser ──ws /api/collab──▶ API process (Hocuspocus)
   ├─ <projectId>/~project   presence (who, which file) + meta.treeVersion
   └─ <projectId>/<docId>    one Y.Doc per text file, Y.Text "content"
                                │ debounced (2 s, max 10 s) under a per-project lock
                                ├─ write text to disk (canonical for compile/export)
                                └─ save Yjs state in project_docs.state
```

- **Identity**: `docId` (`project_docs`) is stable across renames and moves.
  The path is just a column.
- **Loading**: apply the saved Yjs state, then diff the on-disk text into it
  as edits. Files changed outside the editor (upload, import, AI) merge, and
  reconnecting clients never duplicate text.
- **API writes** to an open file are diffed into the live document, too.
- **Tree mutations** (move, delete, write) run in `collab.mutate()`, which
  flushes open documents first and excludes debounced writes. A store can't
  land on a moved path or resurrect a deleted file.
- **Compile and download** flush open documents to disk first.
- **Auth**: the session cookie on the upgrade request (or a cookie string as
  the provider token for non-browser clients). Viewers' connections are
  read-only on the server.

## Compile pipeline

```
web ──POST /api/projects/:id/compile──▶ server ──BullMQ job──▶ compiler worker
                                                               │ sync sources → /work/<id> (keeps aux files)
                                                               │ latexmk -jobname=output (timeout, nonstopmode)
                                                               │ copy output.{pdf,log,synctex.gz,blg} → /data/outputs/<id>/<build>
                                                               ▼ parse logs → diagnostics
web ◀──────────── CompileResult (status, files, diagnostics) ─ server
```

Compile options, as in Overleaf's compile menu, are kept per project in each
browser (`lib/compile-settings.ts`):

- **Auto compile**: the editor builds 2 s after the last edit (at most 8 s
  after the first while typing goes on). Anyone's edits count, so a reader's
  PDF follows the authors. The editor also builds once when a project opens.
- **Draft mode**: `latexmk -usepretex` passes `draft` to graphics/graphicx,
  so images become boxes.
- **Stop on first error**: `-halt-on-error`. Such a build has no PDF; the
  worker only reports a PDF that the run wrote (or when latexmk found
  everything up to date), and the editor keeps showing the last PDF.

latexmk doesn't notice when only its own options change, so the worker keeps
the last options in `.coltex-build-options` in the compile directory and adds
`-g` when they differ.

The server runs one build per project at a time (`CompileCoalescer` in
`routes/compile.ts`). Requests with the same options that arrive during a
build share the next one, which starts when the current one ends and so
includes every edit made until then. This keeps auto compile from several
collaborators to one build at a time per project.

SyncTeX lookups use a second queue (`synctex`), so they never wait behind
compiles. The worker runs `synctex view` (source → PDF boxes) or `synctex edit`
(PDF point → source) against a build's `output.pdf` and `output.synctex.gz`,
and returns paths relative to the project. Coordinates are big points from
the page's top-left; a box spans `v - height … v`.

The compiler container has no internet access (`backend` network is
`internal`), a read-only root filesystem, no capabilities, and memory/pid
limits. Shell escape stays at TeX Live's default restricted mode.

## AI harness principles

1. The agent never writes files directly; it proposes diffs the author reviews.
2. A git snapshot is taken before applying any AI change (one-click rollback).
3. Every applied change is verified by recompiling; more errors than before = failure.
4. Deterministic tools first (log rules, template adapters); the model handles the rest.

## AI assistant

The assistant is a general helper, not only a fixer: LaTeX and package
questions, questions about the project's own files, writing and translation,
compile errors, and conversions. Every member can use it. Editors get the
drafting tools (`edit_file`, `create_file`, `revert_file`, `compile`) and can
apply. Viewers and reviewers get a read-only toolset, and apply/undo answer 403.

**Reference library**: `texlive_source` and `texlive_doc` read or search the
installed TeX Live (package `.sty`/`.cls`/`.bst` sources via `kpsewhich`, and
package manuals via `texdoc` + `pdftotext`, cached in the work volume). The
lookups run in the compiler container on their own queue (`texlive`), with
validated names and no shell. The compiler image comes in two editions
(`COLTEX_EDITION`): `standard` (default, `texlive/texlive:latest`, the full
scheme without manuals and sources, about 9 GB) and `full`
(`latest-full-doc-src`, about 20 GB). Workers report which they are; without
manuals the assistant isn't offered `texlive_doc` and its prompt says so.

**Configuration** (`apps/server/src/ai/service.ts`, admin page): every Pi
built-in provider is registered. Admins connect providers with an API key or
a subscription sign-in (OAuth: Claude Pro/Max, ChatGPT, Copilot, …), or add
OpenAI-compatible endpoints (Ollama, vLLM, …). One credential per provider,
shared by the instance. Credentials live in `ai_credentials`, AES-256-GCM
encrypted with a key derived (HKDF) from the instance secret. Writes take a
Postgres advisory lock, so OAuth refreshes are serialized. Pi's interactive
login callbacks (prompts, auth URLs, device codes) are bridged to the admin
page by polling (`/api/admin/ai/logins/:id`). Settings (Auto's models,
default access, custom endpoints) are a JSON row in `app_settings`. There is
no default model: people start on Auto, or on the first model they may use
while Auto isn't set up. There is
no on/off switch: the assistant is available once a provider is connected.

**Access and choices**: an access policy is `all`, `none`, or `selected`
providers (every model of each, including ones added later) plus single
models. `defaultAccess` applies to everyone without a row in
`ai_user_access`; admins can always use every model. In the editor, people
pick a model from those they may use and a thinking level from the ones pi-ai
lists for that model (`getSupportedThinkingLevels`: some models only switch
thinking on or off, some have no `minimal`, some add `xhigh`/`max`). The pick
is saved in `ai_preferences` and also sent with each message; the server
checks it against the policy and clamps the level (`clampThinkingLevel`). A
saved pick that is no longer allowed falls back to the default model, then
to the first allowed one.

**Usage**: each model response is a row in `ai_usage`. The usage & access
page shows totals, a per-day series and a per-model breakdown for everyone or
one person (`/api/admin/ai/usage?userId=`), and everyone's usage with their
access rule (`/api/admin/ai/users`).

**Auto model choice and failing providers**: admins can set a judge, a
light and a strong model. People who choose "Auto" get each message
classified by the judge (`ai/routing.ts`, after PilotDeck's tier router;
short follow-ups keep the previous tier); light questions go to the light
model without thinking, the rest to the strong one. Every response feeds a
per-provider circuit breaker (`ai/health.ts`, ported from PilotDeck): after
three failures in a row a provider is skipped for a minute and messages go to
another model the person may use, with a notice; the AI services page shows
the state and the last error.

**Edits and turns**: `edit_file` matches old_text exactly, then with quotes
(curly and TeX) and whitespace normalised (`ai/match.ts`), never guessing
between several matches. Each turn ends with a card listing what it changed
in the draft (+/− lines); the review can show the latest turn's diff or the
whole draft.

**Replies** are rendered as Markdown (react-markdown with remark-gfm and
remark-math, no raw HTML) with maths through the same lazily loaded KaTeX as
the chat (`lib/katex.ts`). `\(…\)`, `\[…\]` and one-line `$$…$$` are rewritten
first so display maths is a block of its own.

**Sessions** (`ai/session.ts`): one conversation per user and project, in
server memory (lost on restart; idle sessions expire after 6 h). Every member
can ask; editors also get the drafting tools.
The client posts messages and follows a server-sent event stream that starts
with a full snapshot (so reconnecting resyncs), then item upserts, text
deltas, draft changes and the running flag.

**Tools** (`ai/tools.ts`): `list_files`, `read_file`, `search`, `read_log`
(raw log of the last trial or the author's build), and the draft tools
`edit_file` (exact unique-match replace), `create_file`, `revert_file`, and
`compile`. The draft (`ai/changeset.ts`) keeps each touched file's base and
proposed content. Reads see the draft. `compile` sends the draft as an
`overlay` on the compile job: the worker builds in a throwaway copy of the
project's compile directory (`/work/.trials/<buildId>`), so the project and
its cached build are never touched. Trial outputs are marked and pruned
separately from real builds. Limits: 60 tool calls and 12 compiles per message.

**Review and apply**: the web app splits each file's diff into hunks
(`lib/hunks.ts`). The author accepts any subset, and the client sends the
resulting file contents. Apply = flush → baseline compile → snapshot →
under `collab.mutate`, three-way merge (`git merge-file`) of the author's
accepted content with whatever collaborators changed since the draft was
made (overlap = 409, nothing written) → write through the collaboration
layer → compile. If the build got worse (more errors, or the PDF disappeared),
the change is reverted with the same three-way merge, which keeps others'
edits. "Undo" does the same on demand. The agent is told about applies,
partial applies, discards and undos at the start of its next turn.

**Snapshots**: applying takes a history checkpoint first (see Version history).

**Log hints**: Overleaf's human-readable log rules (the ones with hint text
in CE) are ported to `packages/log-parser/src/human-readable`. The compiler
attaches `hint`, `hintUrl`, `ruleId` and `command` to diagnostics. The log
panel shows the hints, and the agent sees them too.

## Version history

**Storage** (`apps/server/src/history/snapshots.ts`): one bare git repo per
project in `DATA_DIR/history/<projectId>.git`, outside the project directory
(compiles, exports and the file tree never see it). History is linear. A
version is a commit of the whole project, written with `git fast-import` from
files read through `ProjectStore`, so it works for any storage driver.
`coltex-index.json` in the repo maps each file's size and mtime to its blob
from the last version, so unchanged files (e.g. images) are referenced, not
re-read. Snapshots whose tree equals the parent's are dropped. Commit messages
carry trailers: `Coltex-Kind`, `Coltex-Author` (user ids, repeated), and
`Coltex-Restored-From`. Empty folders are not versioned.

**Recording** (`history/service.ts`): edits are noted with their author.
Collaborative keystrokes come from Hocuspocus `onChange` (connection
context), and file routes call `history.noteChange`. A version is recorded
after 60 s without edits, or at most 10 min after the first unrecorded one,
attributed to everyone who edited. Opening the history (first page),
labelling the current state, applying AI changes and restoring all
checkpoint first, so the timeline always ends with the current state.
Creating or importing a project records its first version. Pending edits
are recorded on shutdown (SIGTERM).

**Kinds**: initial (first version of a pre-existing project), create,
import, edit, ai (changes applied from the assistant), review (tracked
changes rejected), restore.

**Restore**: whole project (files added since are removed, deleted ones come
back) or selected files. The current state is checkpointed first. Writes go
through `collab.mutate` + `afterWrite`/`afterDelete`, so open editors update
live. The restore is recorded as its own version, which makes it undoable.

**Labels** (`history_labels` table) name versions ("Save version" labels the
current state). Viewers can browse, compare and download history. Editors
can label and restore.

**API**: `GET /projects/:id/history?before=&limit=`,
`/history/:v` (one version), `/history/:v/compare?from=`, `/history/:v/files`,
`/history/:v/file?path=` (JSON, text inline), `/history/:v/raw?path=&inline=`,
`/history/:v/download.zip`, `POST /history/:v/restore {paths?}`,
`POST /history/labels {name, versionId?}`, `DELETE /history/labels/:label`.

**UI** (`HistoryView.tsx`): the timeline (grouped by day, with authors, kind
and labels) sits on the right, changed files on the left, and the diff in the
middle. Two modes: "This version" (changes made in it) and "vs. current".
Binary images are shown before/after.

## Comments and track changes

**Where the data lives**: review data sits next to the text in each file's Yjs
document (`packages/review`), so it moves with concurrent edits, survives
renames (doc ids are stable) and syncs to every open editor for free.
- `changes` (Y.Map): tracked insertions `{start, end}` and deletions
  `{at, text}`, each with author and time. Positions are Yjs relative
  positions (JSON).
- `comments` (Y.Map): thread anchors `{start, end}`. The conversation is in
  Postgres (`comment_threads`, `comment_messages`); threads cascade with their
  file's `project_docs` row, so deleting a file deletes its threads.

**Semantics (as in Overleaf)**: the text holds the *proposal*. Tracked
insertions are part of it, tracked deletions are removed from it and kept as
records. Compiles, exports and the AI see the text with all suggestions
applied. Accept drops the record. Reject removes the insertion, or re-inserts
the deleted text at its anchor.

**Recording** happens in the browser, in a CodeMirror plugin placed after
`yCollab` (`apps/web/src/lib/review-extension.ts`). When the user's tracking is
on, each local edit (not ones arriving through ySync) goes through
`trackEdits`, using the review positions from *before* the edit:
- Deleted text that was someone's tracked insertion just vanishes; the rest
  becomes a deletion.
- Adjacent edits by the same person merge, so a typed word is one insertion
  and backspacing over a sentence is one deletion.
- Records are written with ySync's origin, so the per-user undo manager
  (scoped to the text and the `changes` map) undoes a record with its edit.

Server-side writes (AI apply, restore, uploads) are never tracked.

While tracking, the plugin claims the user's CodeMirror transaction (a
transaction extender adds ySync's annotation, so ySync skips it) and writes
the text change and its records in **one** Yjs transaction
(`applyTrackedEdits`), so each tracked edit reaches the server as one update.

**Deletion anchors** point at the tombstone of the first deleted character.
Rejecting re-inserts the text right before that tombstone (a Yjs `Item`
integrated with explicit neighbours), not by index: Yjs would place an
index insert after *every* tombstone at that spot, which scrambles
neighbouring deletions rejected one at a time.

**Reviewers** connect with write access, but Hocuspocus' `beforeSync` checks
each of their updates with `checkSuggestionUpdate`: applied to a copy, it must
leave the base text (all suggestions rejected) unchanged, keep comment
anchors, and only touch change records in the reviewer's own name. A refused
update closes the connection with the reason `coltex/suggestion-refused`; the
client then drops its local copy and reloads the file. Reviewers' tracking is
always on.

**Who is tracked**: `projects.track_changes` = `{everyone, users[]}`. Editors
switch it; for editors it is enforced in the client, as in Overleaf (an editor
could switch it off anyway). Reviewers are always tracked, enforced by the
server.

**Server** (`review/service.ts`): reads every doc that has review data, loading
it through Hocuspocus so positions match the reconciled text, and lists
threads with line, quote and messages, plus changes with line and author.
Mutations go through `collab.editDoc` (a direct connection, attributed to the
user), and each one bumps `reviewVersion` in the project doc's `meta` map so
clients refetch. Bulk reject checkpoints history first, and rejections are
recorded as the `review` kind. Comment anchors from clients are validated
(they must resolve in the document) and re-encoded before storing.

**API**: `GET /projects/:id/review`, `PUT /review/track-changes`,
`POST /review/threads {docId, start, end, content}`, `DELETE /review/threads/:t`,
`POST /review/threads/:t/resolve {resolved}`, `POST|PATCH|DELETE
/review/threads/:t/messages[/:m]`, `POST /review/changes/{accept,reject}
{docId?, ids?}` (no ids: the whole file or the whole project).

**UI** (`ReviewPanel.tsx`): a right-hand panel with "This file" (cards in
document order, using live positions from the editor; a deletion and an
insertion at the same spot read as one replacement) and "All files" (grouped
by file, from the server, polled every 10 s while visible), plus resolved
threads. In the editor, insertions are underlined in the author's colour,
deletions are red struck-through widgets, and comments are amber. Selecting
text shows a "Comment" button (also ⌘⌥M). The header shows "Tracking changes"
while your edits are tracked.

## Chat

Each project has a chat like Overleaf's (`chat_messages`, `routes/chat.ts`).
Every member can read and write, viewers included; authors edit and delete
their own messages. A change bumps `chatVersion` in the project document's
`meta` map (`collab.chatChanged`), so open editors refetch the latest page;
older messages load in pages of 50. The web app renders links and maths
(`$$…$$`, `$…$`, `\(…\)`, `\[…\]`) with KaTeX, loaded on first use with
`trust` off. Unread messages are counted against the newest message seen
with the chat open, kept in the browser.

## Mentions and notifications

- **Mentions** are stored in chat and comment text as `<@userId>`
  (`MENTION_PATTERN`, `mentionedIds` in `@coltex/shared`). People never see
  that form: the composers (`MentionTextarea` in `components/mentions.tsx`)
  offer the project's members after an `@` and insert `@Name `; before
  sending, `textToMentions` (`lib/mentions.ts`) turns each `@Name` of a member
  back into a token (longer names first; a Latin name must end a word, a CJK
  name needn't; the last pick decides between namesakes). Editing turns
  tokens back into `@Name`. Messages show mentions highlighted, your own in
  amber; people who are no longer members show as "@Someone".
- **Notifications** (`notifications` table, `NotificationService`,
  `routes/notifications.ts`) are in-app only (no email):
  - `mention`: a chat message or comment mentions you (members only, never
    the author). Editing a message notifies people it newly mentions and
    withdraws the notifications of people it no longer mentions.
  - `reply`: a reply in a thread you started or wrote in (unless the reply
    already mentions you).
  - `added` / `owner`: someone added you to a project by email, or made you
    its owner. Joining by a share link is your own doing and notifies no one.
  Foreign keys to the thread, the comment or chat message and the project
  delete notifications along with what they point at; leaving a project
  deletes yours about it, and listing only shows projects you still belong
  to. The file name of a comment is joined at read time, so renames show.
- **Read state**: opening a notification marks it read; opening a project's
  chat marks its chat mentions read, and replying in a thread (or opening it
  from a notification) marks that thread's. "Mark all as read" and per-item
  read/unread are on the Notifications page.
- **Live delivery**: `GET /me/notifications/events` (server-sent events)
  sends the unread count, then every change to it, with the new notification
  when there is one. The web app keeps one stream per tab
  (`useNotificationStream` in `lib/notifications.ts`), shows the count in the
  sidebar and a toast with "Open". The editor suppresses the toast (and marks
  the item seen) when it is already on screen: the open chat, or a comment in
  the open file with the review panel showing. Listeners live in the server
  process, which is fine for a single server instance.
- **Links**: `#/project/<id>?chat` opens the chat; `?thread=<id>` opens the
  review panel on that thread in its file. The editor drops the query once
  handled.

## Web app

- **Console**: a collapsible inset sidebar holds the workspace (dashboard, all
  projects, shared with me, archived, trash, tags). Settings open from the
  user menu at the bottom left and take over the sidebar: a way back, the
  personal pages (account, appearance, dictionary) and, for admins,
  administration (overview, users, invitations, AI services, AI usage &
  access). Nav items are text only. The top bar has breadcrumbs; theme and language live in
  Appearance only. New-project and import dialogs are global. The
  new-project dialog offers the built-in templates (the official journal
  and conference classes in TeX Live, the same set template conversion
  targets) and the shared ones.
- **Admin overview** is a monitoring page polling `GET /api/admin/stats`
  every 5 s: service health (web server, PostgreSQL and Valkey pings,
  compiler workers), users, projects, storage (summed through `ProjectStore`,
  cached for a minute), builds in the last 24 h, host load, memory and the
  data directory's disk (with percentages), the memory of each ColTex
  container, the compile queue, and the latest resource sample (`live`).
  Container memory and CPU are read from cgroups as `docker stats` counts
  them; compiler workers publish theirs to Valkey every 5 s, because the
  server has no Docker socket.
- **Storage & backups** (`/admin/backups`): which `ProjectStore` driver is in
  use, the WebDAV backup settings, and the latest runs (see below and
  `docs/operations.md`).
- **Monitoring history** (`MonitorHistory`, `src/monitor-history.ts`): the
  server samples itself and the compiler workers' reports every 10 s, from
  start-up, whether or not anyone has the page open, and writes one row a
  minute to `monitor_samples` (average CPU, peak memory, and `boot`, when
  that server process started); every finished build goes to `compile_runs`
  (`CompileQueue.onBuild`). Both are kept for 30 days, so the charts span
  restarts. CPU is a percentage of the CPUs each side may use (its container
  quota, else the cores); memory a percentage of its limit (else the
  machine's memory). `GET /api/admin/stats/history?range=1h|6h|24h|7d|30d`
  buckets them (1 min to 4 h) with `date_bin`, leaves buckets with no data
  null (the chart shows the server's downtime as a gap), adds the minute
  still in memory, and lists restarts, which the chart marks.
- **Type scale**: `text-xs`/`text-sm` are 13/15 px (Tailwind's defaults are
  12/14), set in `index.css`; the editor is 15 px.
- **Editor**: laid out like Overleaf. A slim header holds the project name,
  presence, History and Share. A labelled rail on the left switches the left
  panel between files, review, chat and the assistant (which widens while
  reviewing a diff); Settings at the bottom of the rail
  opens the project settings dialog (compiler, main document, spell check,
  downloads, copy, word count, template conversion). The PDF pane's bar has
  Recompile (with clean build and compile options), Logs, go-to-PDF and
  download. Toolbar groups that don't fit move into a "More" menu. History
  is a full-width mode.
- **Theme**: bright blue primary on cool neutrals (`index.css` tokens), Geist
  font with a CJK fallback, and CodeMirror themed from the same tokens.
- **Loading**: the editor and the admin pages are lazy chunks. The first load
  is about 830 KB; the editor chunk (CodeMirror + pdf.js) is about 1.4 MB.

## Journal template conversion

Deterministic, in `packages/convert` (no AI involved):

1. **Scan** (`scan.ts`): a small LaTeX scanner that finds commands and
   environments with their arguments, ignoring comments and verbatim text.
   Everything works on positions in the original source, so the body is
   copied verbatim (comments included) and only cut where needed.
2. **Extract** (`extract.ts`) the paper into an IR (`types.ts`): title, short
   title, authors (name, affiliations, email, ORCID, corresponding, notes),
   affiliations (free text plus best-effort department / institution / city /
   country), abstract, keywords, acknowledgments, packages, the rest of the
   preamble, the body, and the bibliography (BibTeX, biblatex, inline). It
   reads the author conventions of article/report, amsart, authblk, IEEEtran
   (conference blocks and journal style), acmart, elsarticle (labels and
   key=value affiliations), llncs (`\inst`, `\institute`) and REVTeX.
   Where acknowledgments and the bibliography were is marked, so the target
   puts its versions there. Front matter in an `\input` file is inlined.
3. **Render** (`render.ts`, `targets.ts`) for IEEE journal / conference, ACM
   sigconf / acmsmall, Elsevier, Springer LNCS, APS REVTeX and plain article:
   - front matter in the target's conventions;
   - packages that clash with the class are left out, and packages the class
     loads itself get their options through `\PassOptionsToPackage`;
   - packages the source class provided implicitly are added (ctex for
     ctexart, booktabs for acmart, …);
   - the bibliography goes to the target's style, with biblatex moved to
     BibTeX and the .bib made BibTeX-readable (year from date, journal from
     journaltitle; add-only);
   - acmart gets `\titlenote` for title `\thanks` and a "Country" placeholder.
4. **Transform** every .tex file (`transform.ts`): citation commands for the
   target (biblatex → natbib, natbib → `\cite` for numeric-only classes, with
   counts of what can't be expressed), `\textwidth` → `\columnwidth` in
   single-column floats for two-column targets, and leftovers of the source
   class (`\IEEEPARstart`, IEEE biographies, ACM `\Description`,
   `teaserfigure`, Elsevier highlights).

**Server** (`convert/service.ts`): `GET /projects/:id/convert` returns the
extracted metadata and the targets. `POST /projects/:id/convert {target, name,
metadata, options}` re-extracts the body from the source (only the reviewed
metadata comes from the client), writes a **new project** owned by the caller
(any member may convert), records a `convert` version, and builds both
projects so the report compares errors, undefined references/citations,
overfull boxes and warnings. The original project is never modified.

**UI** (`ConvertDialog.tsx`, opened from the editor toolbar or a project's
menu): pick a template → check and correct the metadata (authors, affiliation
fields, template fields such as the journal or venue, review mode) → result
with the build comparison and the converter's notes. "Open and fix with AI"
opens the new project, builds it and hands the remaining problems to the
assistant, which proposes diffs as usual.

**Verification**: `packages/convert/test` has the extractor and renderer
tests, including a round trip (convert to each template and read it back).
`scripts/matrix.ts` converts every fixture to every target for compiling with
the compiler image; all 48 combinations build without errors or undefined
references.

## Roadmap

1. **MVP**: projects, files, editor, compile, PDF preview, and log panel ✅.
   Accounts, invites, admin panel, and project sharing ✅.
   SyncTeX both ways ✅. File tree with folders, rename, drag-and-drop, and previews ✅.
   Zip import (Overleaf "Download Source") and export ✅.
   Overleaf's LaTeX/BibTeX syntax, highlighting, and completions ✅.
   Auto compile, draft mode, stop on first error, word count, and spell
   checking (72 languages, personal dictionary) ✅. Copy project, archive,
   trash and tags ✅. Project chat ✅. Editor toolbar, symbol palette, package
   command completions and the visual editor ✅, with the table editor,
   figure dialog, command tooltips and file outline ✅. Project-wide search
   and replace ✅.
4. **Collaboration (part 1)**: real-time co-editing, remote cursors, presence,
   live file-tree updates, and per-user undo ✅. Version history with labels,
   compare, restore and zip download of any version ✅. Comments (threads,
   replies, resolve) and track changes (per user or for everyone, accept and
   reject per change, per file or project-wide) ✅. UI redesign (shadcn/ui) ✅.
2. **AI debug** — log rules, "fix with AI", diff review, snapshot + recompile ✅.
3. **Template conversion** — IR, eight targets (IEEE ×2, ACM ×2, Elsevier, LNCS,
   REVTeX, article), build comparison, AI hand-off ✅. Later: more publishers
   (Springer Nature sn-jnl and MDPI, which aren't in TeX Live and would be
   uploaded as class files), and a CCS-concepts helper for ACM.
4. **Collaboration (part 2)**: reviewer role (server-enforced suggestions) ✅,
   link-first sharing with optional sign-up ✅, ownership transfer ✅.
   @mentions and in-app notifications ✅.
5. **Server Pro parity** — admin panel ✅, S3 storage and WebDAV backups ✅,
   Zotero import and refresh, entries by DOI, citation picker ✅, Git bridge
   ✅. No OIDC (decided: ColTex serves one person or a small group).

## Storage drivers

`ProjectStore` (`apps/server/src/storage/types.ts`) has two drivers, chosen
at startup with `STORAGE`:

- **local** (`local.ts`): `DATA_DIR/projects/<id>/…`, atomic writes through a
  `.coltex-tmp` file and rename.
- **s3** (`s3.ts`, client in `s3-client.ts` on aws4fetch): objects
  `<S3_PREFIX>/projects/<id>/<path>`. Folders are empty
  `<folder>/.coltex-folder` objects (`path/` markers are not listed by
  filesystem-backed servers such as SeaweedFS or rclone), and the project
  root has one so an empty project exists. S3 has no folders or rename, so
  removals first write the parent's marker, and moves copy then delete.
  `.coltex-folder` is a reserved name in `cleanPath`.

The compiler has no network access and reads `DATA_DIR/projects`, so
`CompileQueue.beforeCompile` calls `store.syncForCompile(id)` before every
build. The S3 driver keeps a local copy there, fetching objects whose ETag
changed (manifests in `DATA_DIR/cache/s3-mirror`). It only replaces or
removes files it wrote itself, so files left from local storage are never
deleted. History repos, build output and compile caches stay on local disk
with either driver.

Both drivers run the same contract tests (`test/storage.test.ts`): always
against an in-memory S3 server, and against a real one with
`S3_TEST_ENDPOINT`. `TEST_STORAGE=s3 pnpm test` runs the whole server suite
on the S3 driver.

## Backups

`BackupService` (`apps/server/src/backup/service.ts`) writes one zip per run
and uploads it to a WebDAV folder (`webdav.ts`: PROPFIND, MKCOL, PUT with a
known length, DELETE; Basic auth):

```
coltex-backup.json        format, date, version, project ids, secret status
database.sql              pg_dump --no-owner --no-privileges (all schemas)
projects/<id>/…           files read through ProjectStore (+ empty folders)
history/<id>.bundle       git bundle --all of the project's history
secret                    the instance secret, only in encrypted backups
```

- Encryption is optional and compatible with
  `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256`, so a backup
  opens without ColTex. The format has no MAC, so decrypting also checks
  for the zip signature (a wrong password passes the padding check about
  once in 256 tries).
- Settings live in `app_settings.backup`; the WebDAV and encryption passwords
  are sealed with `SecretBox`. Runs are rows in `backup_runs`.
- One backup at a time across processes (a Postgres advisory lock). On
  start, runs left `running` are marked interrupted.
- Schedule: daily or weekly at an hour in the admin's time zone
  (`scheduleSlot` walks 15-minute steps, so half-hour zones and DST work).
  A slot is missed only if it falls after the schedule was saved; a failed
  scheduled run is retried hourly, at most three times per slot.
- After a verified upload (the size on the server must match), backup files
  beyond `keep` are deleted; other files in the folder are never touched.
- Restore: `node src/cli.ts restore <file>` into an empty instance (psql,
  `ProjectStore.createProject`, `SnapshotService.restoreBundle`, secret).
  `node src/cli.ts copy-storage` copies local projects into S3.
- The server image installs `postgresql-client-18` from PGDG: pg_dump must be
  at least the server's version, and Debian trixie ships 17.
