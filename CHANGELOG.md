# Changelog

All notable changes to ColTex. Versions follow `vMAJOR.MINOR.PATCH`; while ColTex is at 0.0.x, any release may change things.

## v0.0.2

Prebuilt images, your own AI agents over MCP, skills for the built-in AI agent, literature search, AI usage limits, 14 interface languages and a new installer.

### Upgrade

Run `coltex update`. Coming from v0.0.1, this first update still builds the images on your machine (the v0.0.1 `coltex` doesn't know about prebuilt images); every later one downloads them. To download right away instead, run the install command again: settings and data stay.

### New

**Install and update**
- Prebuilt images on ghcr.io for x86-64 and ARM64: installs and updates download them instead of building (`--build` still builds from source). The previous version's images are removed after an update.
- A new installer: it asks for the language (14 of them), the TeX Live edition and how people will reach ColTex (arrow keys), shows each step with a progress line and the download with a bar (its full size known from the start, with the time it has taken), and keeps the full output in `install.log`. A download that fails for any reason but missing images stops with an error instead of building the images locally (also in `coltex update`). `--lang` (e.g. `--lang ja`) answers the language for the installer, `coltex` and the setup page; `--local` skips the access question.

**AI**
- Permissions for AI agents, in Settings → AI agent or in the panel's model picker: **Manual** (the AI agent's draft waits for your review, as before), **Auto** (its draft is applied when it finishes, still compiled first and rolled back if the build gets worse) or **Full access** (also delete, move and rename files).
- ColTex is an MCP server for your own agents (Claude Code, Codex, Cursor, …): one address for all your projects, signed in with a personal token. They list your projects, read and search files, edit, compile and read the log, see the history, and read, add and answer comments. Your permission applies to them too; with Manual their edits become your suggestions, word by word, for review. Settings → AI agent creates the token and shows the configuration for each agent.
- Settings → AI agent shows your AI usage over the last 7, 30 or 90 days (per day and per model) and what is left of your limit.
- Personal tokens say what they are for (Git, MCP or both), can be read only, limited to some projects, and expire (30 days, 90 days, a year, or never).
- Skills: instructions in the Agent Skills format that the AI agent follows, personal or per project, used with `/name` and imported from folders or files. Settings → AI skills lists them and has a skills chat that helps you write one (built on the skill-creator skill). The AI agent checks your skills before a task and follows the one that fits.
- Usage limits per AI group: tokens and/or cost per person per day, week or month. Members see their usage under the message box.
- Admins can give one person their own models or limits (AI usage & access), which replace the group's while set.
- Conversations with the AI agent fold several steps in a row into one line, which opens to list them.

**Writing**
- References: search Crossref and arXiv by title, authors or keywords and add a paper to a `.bib` file in one click (pasting a DOI or arXiv id still adds it directly).
- Git: clone, pull and push projects with git, using personal tokens (Settings → Sync services, together with Zotero).
- The spelling dictionary is in the editor's settings: find or add words, letter headings and an index, import and export; changes reach open editors at once.

**Interface**
- 14 interface languages: English, Simplified and Traditional Chinese, Japanese, Korean, Spanish, French, German, Portuguese (Brazil), Italian, Russian, Turkish, Vietnamese and Indonesian (Settings → Appearance, or the sign-in page). A new browser starts in its own language. The help documentation, the README, the installer and `coltex` are translated too (`--lang`).
- Themes in colour: Light and Dark (blue), Forest and Moss (green), Sepia and Espresso (warm). Light is the default.

### Fixed
- With S3 storage, a file rewritten with the same size could be missed by the history, so undoing a version could work on stale text.

## v0.0.1

The first public release of ColTex, a self-hosted collaborative LaTeX editor with a built-in AI agent. It is an early version: please [open an issue](https://github.com/Lewen-Cai/coltex/issues) for anything that breaks or is hard to use.

### Install

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Needs Docker on Linux or macOS, 2 CPU cores, 4 GB of memory and about 20 GB of free disk (the standard edition). See the [README](./README.md#install) for the options (`--domain`, `--tailscale`, `--cloudflare-token`, `--edition full`).

### What's in it

**Writing and compiling**
- Source and visual editing (Overleaf's visual editor, table editor and figure dialog), toolbar, symbol palette, outline, completions, code check, equation preview, spell checking, word count, project search and replace, Vim and Emacs keys.
- latexmk on a complete TeX Live, with the engine picked from the document (pdfLaTeX, XeLaTeX, LuaLaTeX; Chinese with ctex/xeCJK), PDF preview with SyncTeX, and compile errors marked in the source with hints.
- References from `.bib` files, by DOI or arXiv id, and from Zotero.

**Collaboration**
- Real-time editing, comments with @mentions, track changes (decisions can be undone; reviewers can withdraw their own suggestions), chat and notifications.
- Project roles: owner, editor, reviewer, viewer.
- Version history with saved versions and undoing one version's changes.

**AI agent**
- Reads the project and the compile log, drafts changes in a private copy, test-compiles them and shows a diff to apply in full or in part. Applying saves a version first and rolls back automatically if the build gets worse.
- API keys, subscription sign-in or your own OpenAI-compatible server; automatic choice between a light and a strong model; access per group; usage per person.
- Saved chats per project, the context window in view, and `/compact`.

**Projects and administration**
- Journal templates (IEEE, ACM, Springer LNCS, Elsevier, REVTeX, arXiv) and conversion between them; Overleaf zip import and export; linked files; tags, archive and trash.
- Invitation-only accounts, one system administrator, and admins who manage their own team.
- Monitoring, WebDAV backups (optionally encrypted), local or S3 storage, built-in Tailscale and Cloudflare Tunnel, English and Chinese interface.
- Two TeX Live editions: standard (default, about 9.6 GB) and full (with the package manuals, about 20 GB). `coltex update` moves to the latest release.

### Known limits
- Images are built on your machine on first install (about 10 to 30 minutes, mostly the TeX Live download); there are no prebuilt images yet.
- The compiler has no internet access by design, so packages outside TeX Live can't be installed at compile time. Put the files you need in the project.
