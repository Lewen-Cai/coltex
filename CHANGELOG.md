# Changelog

All notable changes to ColTex. Versions follow `vMAJOR.MINOR.PATCH`; while ColTex is at 0.0.x, any release may change things.

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
