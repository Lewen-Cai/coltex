# Changelog

All notable changes to ColTex. Versions follow `vMAJOR.MINOR.PATCH`; while ColTex is at 0.0.x, any release may change things.

## v0.0.6

Export to Word, the AI agent on the web, 60 templates across twelve fields, groups, templates shared with groups, conversion into any template with an AI agent Skill to finish it for the venue, a compiler that keeps up when several people build at once and keeps each project's builds apart. ColTex also moves to the coltexeditor organization on GitHub.

### New

- **Export to Word**: a project's menu and the project settings have Export to Word…, which turns the paper into a .docx with pandoc. The title page comes from the document (title, authors, affiliations, corresponding author, abstract, keywords) for the journal classes the converter reads; maths become Word equations; figures, tables and equations are numbered; PDF and EPS figures become pictures (also those in `\graphicspath`'s folders; a figure that can't be converted is named in its place). Tables become Word tables, including those in `\resizebox`, `table*` or with siunitx columns. The reference list keeps its place and heading, and citations link to their entries. Citation styles: like the document, APA, Vancouver, AMA, IEEE, Nature, Chicago, or a .csl file in the project; a journal's Word template (.docx) in the project can give the styles (without one, headings are black).
- 60 built-in templates across twelve fields (general; computing and electrical engineering; engineering; physics; astronomy; chemistry; life sciences; medicine; mathematics and statistics; economics; social sciences and humanities; earth and environment), with separate templates where one class serves several kinds of venue (Elsevier, IEEE, ACM, REVTeX, APA 7, ACS). For medicine: clinical study (CONSORT), trial protocol (SPIRIT), observational study (STROBE), diagnostic accuracy (STARD), systematic review (PRISMA 2020), case report (CARE) and research letter, besides the Elsevier, OUP and Nature articles. Templates whose files may not be redistributed (NeurIPS, ICML, ICLR, ACL, CVPR, Springer Nature and others) are not built in: the help lists them, to download from the journal or conference and import.
- **Groups** (Settings → Groups): anyone makes a group and invites people on the server, who join by accepting. A project can be shared with a group: everyone in it gets the role, people who join later too, and people who leave lose it.
- Templates are shared by administrators: with their groups and people they pick, and by the system administrator with everyone. Anyone can import a journal's zip as a template of their own (sharing it is optional, and for administrators); importing makes no project in the workspace, the template keeps its files. Templates get a field. The new-project dialog shows them all in one list, filtered by field, each tagged Built-in, shared by the system administrator, shared across its groups, shared by someone, or Only you.
- **The AI agent on the web**: the AI agent searches the web and reads web pages. Anthropic, OpenAI and ChatGPT models use their own built-in search; other models use a search service an administrator connects in Settings → AI services (DeepSeek, Tavily, Exa or Brave Search; DeepSeek can use the connected DeepSeek provider's key; several can be connected, with one in use). Nothing of a project can leave this way: queries go only to the chosen search service and are short, and only addresses the author wrote or a search returned can be read. While the AI agent can use the web, its changes always wait for review whatever the permission, and it doesn't delete or move files.
- Conversion between templates: every built-in template converts to every target and builds (60 templates by 16 targets checked). It reads Springer Nature (sn-jnl), Oxford University Press, Elsevier CAS, BMC and the new templates' classes: authors with their names and degrees, affiliations, `\abstract{}` and structured abstracts, keywords, back matter; commands of packages the target drops (line spacing, line numbers and others) keep working. New targets: Elsevier CAS (one and two columns), OUP, AMS, APA 7, AASTeX, MNRAS and ACS. The target list is plainer.
- **Conversion into any template**: besides ColTex's own conversions, a paper converts into any template: one from the template list (the same list as for new projects; a built-in template uses ColTex's conversion for it), one of the person's projects, or a journal's zip uploaded in the dialog. The title, authors, affiliations, abstract and keywords are written where the template has its samples and the way it writes them (its label scheme and fields, Springer Nature's `\fnm`/`\sur`, Elsevier's `organization=`, and so on), the sample text is replaced by the paper, and the template's class and style files come along. Converting each test paper into every built-in template builds.
- **The template-conversion Skill**: a built-in Skill for the AI agent that finishes a conversion. After a conversion with errors or warnings, **Open and fix with AI** starts it: it asks which journal or conference the paper is for, looks up the venue's current author guidelines, makes the paper build, and brings it in line with the guidelines without changing its content.
- The AI agent can look at pages of the PDF (with models that see images) to check the layout that the log can't show.

### Improved

- New project: **Import template** is the first card of the template list, and a search field finds templates by name or description.
- Updates download only what changed: TeX Live stays the same for a year (TeX Live 2026 now; it moves with each year's release), and ColTex's own part is the compiler image's last layer, so an update is usually some tens of megabytes instead of several gigabytes. The update that brings a new TeX Live says so.
- The AI agent answers in the language of the interface (unless spoken to in another one).
- The log has no "Ask AI" button on each error any more: it had the AI agent fix the error, not explain it. **Fix with AI** at the top hands over the build's errors.
- The compiler runs as many builds at once as its CPUs and memory allow (two before), and fewer while memory is low. The administration overview shows how many.
- A project's builds wait their turn on the server, so one busy project no longer holds the compiler while other people's builds wait.
- The AI agent compiles less: not to look at what's wrong (it reads the latest build's log), not the same draft twice, and at most five times a message. Builds it no longer needs after Stop are taken out of the queue.
- The word count counts `\abstract{...}` as the abstract.
- Self-hosted endpoints no longer ask for a context window: the context and the length of answers are the server's settings (Ollama, vLLM, LM Studio), so ColTex sends no limit of its own, and the AI panel shows how many tokens the chat uses.
- The message boxes of the AI agent, the project chat and the skills chat grow with the text, and can be made taller by dragging their top edge.
- The repository is now github.com/coltexeditor/coltex and the images are at ghcr.io/coltexeditor. Old links keep working, and `coltex update` moves an install's image address and Git remote to the new ones by itself.
- The short install command is `curl -fsSL https://coltexeditor.github.io/install.sh | bash`.
- The vulnerability scan lists its findings by image and package, with the fixed version, and keeps the full report with the run.
- Fewer known vulnerabilities in the images: Tailscale 1.104.2 and cloudflared 2026.10.3, built with a current Go; the server image no longer carries npm, pnpm, yarn or an old esbuild, which it never ran; the compiler image leaves out tlcockpit, TeX Live's graphical package manager, which can't open in a container.
- Builds of different projects are kept apart: each runs as a user of its project's own and can't read other projects' files, which TeX (and a project's latexmkrc) could do before. Valkey, which builds could reach, has a password; `coltex update` adds one to existing installs.

### Fixed

- An affiliation written partly outside its tags (an institution without `\orgname`, an address written in `\orgaddress` as plain text, as OUP's and Springer Nature's classes allow) kept only its tagged parts in Word export and conversion. The rest is now kept, in the order it was written.
- When the AI agent reached the limit of steps for one message, it stopped without a word. It now tells you what it did and what is left (and if it doesn't, a note says it stopped and that “continue” lets it go on).
- Links in the PDF preview did nothing. Citations and references to figures, tables, equations and sections now jump to their place, and web addresses open in a new tab.
- A process a build left running could keep the compiler waiting for that build forever.
- A build that failed with an error (for example a file deleted while it started) stopped the whole compiler, and every build running or waiting with it hung until it timed out.
- After installing, `coltex` wasn't found in new SSH sessions on systems whose login doesn't read `~/.bashrc`. The installer now adds `~/.local/bin` to the files a login reads too, and `coltex update` adds it to installs that had it only in `~/.bashrc`.
- `coltex update` right after a release, while the Alibaba Cloud mirror didn't have its images yet, tried to build them from the sources instead of taking them from GitHub. It now downloads them from GitHub, and the next update uses the mirror again.
- An update that stopped half way (the images not downloaded) said the new version was already installed when run again. Running it again now finishes it.
- With automatic or full access, Stop didn't stop the AI agent while it applied its changes and built the project after a reply.
- When the server restarted behind a proxy that answered with an error meanwhile (such as 502), the AI panel showed a reply in progress, and new notifications didn't arrive, until the page was reloaded. They now reconnect by themselves.

## v0.0.5

Two-step verification, a record of sign-ins and protection against password guessing, renaming projects, security headers, and `coltex update` with the installer's download bar.

### New

- Two-step verification, for whoever turns it on in Settings → Account: a code from an authenticator app after the password, 10 recovery codes, and "don't ask again on this device for 30 days". `coltex reset-2fa <email>` turns it off for someone who lost both.
- Sign-in activity in Settings → Account: each sign-in with the result, the browser and the address with its place (country, region, city and network operator, looked up in a database on the server; addresses are never sent anywhere). Places are shown in the interface language: countries and first-level regions everywhere, and places in China in full.
- Administration → Sign-ins, for the system administrator: everyone's sign-ins, locked accounts and blocked addresses, and each person's signed-in devices, which can be signed out one by one or all at once.
- Sign-in protection, without third-party services: from unfamiliar addresses, a small proof of work in the browser from the third failed attempt, a 15-minute wait after five, and the account locked for unfamiliar addresses after ten, until the system administrator unlocks it (they get a notification; `coltex unlock <email>` on the server). Addresses where the account signed in before only wait. An address on the internet that fails 20 times in an hour is blocked for a day.
- Rename a project from its menu in the project list, or by clicking its name at the top of the editor.

### Improved

- `coltex update` shows the same one-line download bar as the installer, with the speed, where the images come from and retries, and starting the services is one line too.
- `coltex update` hands the rest of the update to the version it just got, so later versions can do what they need on the way.
- ColTex's pages send security headers: no framing by other sites, only its own scripts (a Content Security Policy), no content sniffing, and no referrer to other sites. With `--domain`, Caddy adds HSTS.
- The API description (`/api/openapi.json`) needs a signed-in account.
- Dependencies updated to their patched releases.
- The README starts with a quick start.

### Fixed

- Signing in with an email that has no account and a short password answered differently from a wrong password, which told that the account didn't exist.
- The `--images` help said the installer picks Alibaba Cloud in mainland China; it uses whichever registry answers faster.

## v0.0.4

Projects from Overleaf and VS Code compile and import cleanly, a simpler installer, grouped `coltex` help, and skills that are all your own.

### Fixed

- A project whose `latexmkrc` sends the output to another folder (`$out_dir = 'build'`, as VS Code's LaTeX Workshop is often set up) no longer fails every build. ColTex keeps latexmk's output where it reads it; the rest of the `latexmkrc` still applies.
- With many files, the file tree no longer runs under the file outline in the editor's side panel.
- The installer's download bar looked full from the start in terminals that don't dim text (PuTTY, for one).

### Improved

- Importing a project leaves out the build files other editors leave behind (`.aux`, `.log`, `.synctex.gz` and the like) and folders such as `.vscode`, as Overleaf does. `latexmkrc` and `.bbl` files are kept.
- A PDF opened from the file tree is shown like the build's PDF, filling the pane, and images are shown on white instead of a checkerboard. A file that isn't a readable PDF says so instead of showing nothing.
- The installer asks only for the language and the TeX Live edition. Remote access (Tailscale, Cloudflare Tunnel) is turned on afterwards in Settings → Network, or with the same options as before. The edition choices say what each contains.
- The installer's download shows the speed instead of the time and says in one line where the images come from. The closing screen lists the common commands and, when `~/.local/bin` isn't in `PATH`, one line that adds it and works right away.
- `coltex help` groups the commands by task and says what each does; `coltex cli` on its own shows it too.
- Downloads of ColTex's code from GitHub, in the installer and in `coltex update`, are tried again when the connection is reset.
- Skills are each person's own, for all their projects. Project skills are removed.

### New

- `coltex reset-password <email>` and `coltex system-admin <email>`, without `coltex cli`.
- Installs and `coltex update` follow full releases (`vX.Y.Z`) only, so a pre-release is installed only when asked for with `--version`.

## v0.0.3

Fixes for the Cloudflare Tunnel, ports, the data folder and downloads, the images on Alibaba Cloud for mainland China, three new maintenance commands, and themes kept with your account.

### Fixed

- Cloudflare Tunnel: changing the tunnel (or the kind of link) while cloudflared waited to restart could leave two of them running, fighting over the metrics port (`address already in use`). There is now only ever one.
- Installs no longer publish PostgreSQL (5432) and Valkey (6379) on the host, so they don't clash with a database already running there.
- A data folder owned by root (Docker recreates it that way after it was deleted) made the server restart over and over (`EACCES … /data/.secret`). `coltex start`, `restart` and `update` now fix the owner first, and the server says which `chown` to run instead of printing a stack trace.
- `docker compose` commands run by hand no longer warn that `COLTEX_BIND` is not set.

### Improved

- The theme is kept with your account instead of the browser, so it follows you to other browsers, and the sign-in page always shows ColTex's default blue. Dark and Moss use dark grey instead of near-black. Sepia and Espresso are replaced by Lavender and Plum (violet). Project cards take the theme's colour.
- The skills chat (Settings → AI skills) has a floating message box with the model, thinking level and usage inside it.
- Skills are personal: the project settings no longer have an AI skills section, and skills the AI agent drafts are saved to your skills.
- Choose your avatar colour in Settings → Account (it is also your cursor's colour in the editor). The initials grow with the avatar.
- References → Add has a Search (or Add, for a DOI or arXiv id) button that shows when it is working.
- `coltex cli reset-password` leaves a trace: the account's owner gets a notification, and the server's log records it.
- The sign-in, setup and invitation pages link "Open source under AGPL-3.0" to the repository.
- Cloudflare Tunnel: when QUIC can't get through (a firewall, or a proxy that drops UDP), it switches to HTTP/2 by itself. A rate-limited temporary link (429) is asked for again less and less often instead of every 5 seconds. Common errors are explained in plain words, each line once, and changing the tunnel warns that its hostnames stay on the old one (Error 1033).
- The compiler images come in layers of about a gigabyte instead of one TeX Live layer of up to 7 GB, so a download that breaks only repeats the part it was on.
- Downloads cut off by the network are tried again (three times in all, keeping the finished layers), in the installer and in `coltex update`. When it still fails, it says how to use a mirror of ghcr.io and which Docker settings help on a poor connection.
- The images are also on Alibaba Cloud Container Registry, for mainland China. The installer downloads from whichever of the two answers faster from the machine (Alibaba Cloud in mainland China, ghcr.io elsewhere); `--images aliyun` or `--images ghcr` chooses by hand (running the install command again with it switches an existing install; settings and data stay). With Alibaba Cloud, PostgreSQL, Valkey and Caddy come from there too, since Docker Hub is hard to reach from mainland China. `--images REGISTRY` takes any other mirror of ghcr.io (Docker's `registry-mirrors` doesn't apply to ghcr.io).
- The help explains running the built-in Tailscale and Cloudflare Tunnel next to the server's own, and why ColTex shouldn't be given the server's tunnel token.
- When `~/.local/bin` isn't in `PATH`, the installer links `coltex` into `/usr/local/bin` if it can, or shows the line that adds it. When this user may not use Docker, it shows the `usermod` command.

### New

- `coltex cli reset-password <email>`: a new password for an account, from the server's terminal, signing it out everywhere.
- `coltex reset`: deletes all data and starts again from the setup page (asks you to type `reset` first).
- `coltex uninstall`: removes ColTex from the machine in one go: containers, database, data, images, the `coltex` command and its folder (asks you to type `uninstall` first; Docker stays).

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
