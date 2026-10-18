<h1 align="center">ColTex</h1>
<p align="center">
  <strong>A self-hosted collaborative LaTeX editor with a built-in AI agent.</strong><br>
  Your server · Your accounts · Your data · Real-time collaboration · Open source (AGPL-3.0)
</p>

<p align="center">
  <a href="./README.md"><kbd><b>English</b></kbd></a>
  <a href="./readmes/zh-CN.md"><kbd>简体中文</kbd></a>
</p>
<p align="center">
  <a href="#install">Install</a> · <a href="#configure">Configure</a> · <a href="./CHANGELOG.md">Changelog</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Latest release"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="./docs/images/editor.png" alt="The ColTex editor: files, the LaTeX source, the compiled PDF and the AI agent" width="900">
</p>

<a id="why"></a>
## Why ColTex?

ColTex is an alternative to Overleaf for a research group, a lab or just yourself, running on a computer you control: a desktop in the lab, a home server or a cloud machine.

- **Everything stays on your server.** Projects, history, accounts and compile jobs never leave it. TeX runs in a sandboxed container without internet access.
- **Built for writing together.** Several people edit the same file at once, with comments, track changes, chat and version history.
- **An AI agent that works on your project.** It reads the files and the compile log, drafts changes, test-compiles them, and shows you a diff. Nothing is written until you apply it.
- **One command to install, no ports to open.** Tailscale and Cloudflare Tunnel are built in for remote access.

<a id="features"></a>
## Features

### Writing and compiling
- Source editor (CodeMirror) and a visual editor with Overleaf's table editor and figure dialog, toolbar, symbol palette, outline and breadcrumbs.
- LaTeX completions, a code check, equation preview, spell checking in many languages, word count, project-wide search and replace, and Vim or Emacs keys.
- Compiles with latexmk on a complete TeX Live. The engine (pdfLaTeX, XeLaTeX or LuaLaTeX) is picked from the document, Chinese included (ctex, xeCJK).
- PDF preview with SyncTeX in both directions, also in a separate window. Compile errors are underlined in the source, with plain-language hints.
- References: cite from your `.bib` files, add entries by DOI or arXiv id, or import a Zotero library or collection and keep it in sync.

### Collaboration
- Real-time editing with everyone's cursors, comments with @mentions, track changes (accept, reject, and undo a decision), project chat and in-app notifications.
- Roles per project: owner, editor, reviewer (suggestions only) and viewer.
- Version history like git: automatic versions, versions saved with a message, and undoing one version's changes.

### AI agent
- Ask about LaTeX, your project or your writing, or let it fix compile errors. It drafts changes in a private copy, test-compiles them and shows a diff; you apply all or part of it.
- Applying saves a version first and recompiles; if the build gets worse, the change is rolled back automatically.
- Providers: API keys (Anthropic, OpenAI, DeepSeek, Google, OpenRouter and more), subscription sign-in (Claude Pro/Max, ChatGPT, GitHub Copilot and more), or your own OpenAI-compatible server (Ollama, vLLM, LM Studio).
- Automatic model choice (a light or a strong model per message), access per group of people, usage per person.
- Saved chats per project, the context window shown as you go, and `/compact` to summarise a long chat.

### Projects and administration
- Templates for IEEE, ACM, Springer LNCS, Elsevier, REVTeX and arXiv, and conversion of a paper from one journal template to another.
- Overleaf zip import and export, files linked from a URL or another project, tags, archive and trash.
- No public sign-up: accounts come from invitation links. One system administrator, and admins who each manage the team they invited.
- Monitoring, WebDAV backups (optionally encrypted), local or S3-compatible storage, light and dark themes, English and Chinese interface.

<a id="install"></a>
## Install

You need a Linux or macOS machine with Docker (on Linux the installer can set it up), at least 2 CPU cores and 4 GB of memory.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

It gets the latest release into `~/coltex`, writes the settings, builds and starts ColTex, and prints the addresses to open. Then open `http://<server>:3690` and create the administrator account.

The first build downloads TeX Live. Choose an edition:

| Edition | Download | Disk (all of ColTex) | Free space to have |
| --- | --- | --- | --- |
| **standard** (default) | about 3 GB | about 12 GB | 20 GB |
| **full** (`--edition full`) | about 8 GB | about 23 GB | 35 GB |

Both compile the same documents. The full edition also has the package manuals, which the AI agent can then read.

Options (add after `bash -s --`):

| Option | |
| --- | --- |
| `--domain tex.example.org` | HTTPS for a server with its own domain, through the bundled Caddy. Point the domain at the server and open ports 80 and 443 |
| `--tailscale` | Put ColTex on your tailnet: prints a sign-in link and a QR code |
| `--cloudflare-token TOKEN` | Connect a Cloudflare tunnel you created for your own domain |
| `--cloudflare-quick` | A temporary public `trycloudflare.com` address, for trying it out |
| `--edition full` | The full TeX Live edition |
| `--port 3690` | Another port |
| `--version v0.0.1` | A specific release (`main` for the development branch) |

On a server reachable from the internet, don't sign in over plain `http://`: use `--domain`, Tailscale or a Cloudflare tunnel.

### Manage and update

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
```

<a id="configure"></a>
## Configure

Everything is set in the browser, under **Settings** in the user menu:

1. **Manage users and Invitations**: invite people with links (each works once, optionally for one email).
2. **AI services**: connect a provider. Then, in **AI usage & access**, put people in a group that may use it. Without a group nobody but the system administrator gets the AI agent.
3. **Network**: the addresses ColTex is reached at, and Tailscale and Cloudflare Tunnel.
4. **Storage & backups**: daily or weekly backups to a WebDAV folder (Nextcloud, a NAS…).

The help documentation is built in: **Help documentation** in the user menu. Server operations (environment variables, S3, restoring a backup) are in [docs/operations.md](docs/operations.md).

<a id="feedback"></a>
## Early days: please open issues

ColTex is young (0.0.x). It is used and tested every day, but not everything has been found yet. If something breaks, looks wrong or is hard to use, please [open an issue](https://github.com/Lewen-Cai/coltex/issues): every report helps.

A useful report has the version (`coltex version`), what you did and what happened, and if the server is involved, the relevant lines of `coltex logs`. Please leave out passwords, API keys and private document content.

<a id="development"></a>
## Develop

Node 24 or newer, pnpm 11 and Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Path | |
| --- | --- |
| `apps/web` | The web app: React, CodeMirror 6, PDF.js |
| `apps/server` | The API: Fastify, accounts, projects, real-time collaboration, the AI agent |
| `services/compiler` | The compile worker in a TeX Live container |
| `packages/*` | Shared schemas, the log parser, LaTeX language support, review data and template conversion |

The design is described in [docs/architecture.md](docs/architecture.md).

<a id="acknowledgements"></a>
## Acknowledgements

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex ports its log parser and hints, LaTeX language support, visual editor, table editor, spell checking and word count. Every ported file is listed in [NOTICE](./NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): the model providers and the agent loop behind the AI agent.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): the provider health tracking and the automatic model choice are adapted from it.
- [Yjs](https://github.com/yjs/yjs) and [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): provider logos. Trademarks belong to their owners and only identify the service.

<a id="license"></a>
## License

[AGPL-3.0](./LICENSE). If you run a modified ColTex for other people over a network, you must offer them its source code. Third-party code keeps its own license; see [NOTICE](./NOTICE).
