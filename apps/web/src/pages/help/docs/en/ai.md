# AI agent

**AI** in the left rail opens the AI agent. It's available once an administrator has connected a model service and added you to an AI group; the group decides which models you may use.

## What it does

- Answers LaTeX questions and explains selected code.
- Explains or fixes compile errors (the log has a "Fix with AI" button too).
- Rewrites, polishes or translates the selection.
- Gives an overview of the project, finds unreferenced labels, and so on.

The open file, the selection and recent compile errors are attached to your message; click an attachment to leave it out.

## Changes are reviewed first

> The AI agent never edits your files directly. Its changes go into a draft:

1. When it's done, the draft is test-compiled and you're told whether it adds errors.
2. **Review changes** shows the diff per file; you can apply only some of it.
3. **Apply** writes the changes into the project and compiles; if the build gets worse, it's rolled back. A version is saved before applying.
4. After applying, **Undo** reverts the changes and keeps edits other people made in the meantime.

Viewers and reviewers can ask the AI agent but can't apply changes.

## Models and thinking

- Choose the model at the bottom of the panel. With **Auto**, ColTex picks a light or a strong model depending on the question.
- For models that can think, the level is set in the same picker; the line under the message box shows it.

## Chats and context

- Conversations are saved for you, per project (others never see them). **New chat** starts another; **Chats** lists the previous ones: open, rename or delete them. Reopening a chat continues it where it stopped; a draft that wasn't applied is not kept, so switching away from one asks first.
- The ring under the message box shows how much of the model's context window the chat uses (e.g. `12k / 200k`). It turns amber at 70% and red at 90%.
- Type `/` in the message box for commands:
  - `/compact`: summarise the chat so far and continue from the summary, freeing the context. The messages stay visible; the AI agent remembers them through the summary.
  - `/new`: start a new chat.
  - `/chats`: the previous chats.

## Skills

A skill is a set of instructions for a task you do again and again, for example "shorten an abstract to the journal's limit" or "check that every figure is referenced". Skills use the Agent Skills format (a `SKILL.md` with a name, a description and the instructions), so skills written for other AI agents work here too.

- **Your skills** are in **Settings → AI skills**; only you see them. **Project skills** are in the project settings (**AI skills**): every member who has the AI agent can use them, editors add and change them.
- Create one with **New skill**, or **Import** one: **Upload files** takes a `SKILL.md` with its reference files, or a `.zip` of skill folders; **Upload folder** takes a skill's folder, or a folder holding several. Scripts in a skill are kept as text the AI agent can read; nothing in a skill is ever run.
- Use one by typing `/` and picking it, then add your message (`/polish-abstract keep it under 200 words`). The AI agent also reads the descriptions and loads a skill on its own when your request fits one.
- Ask the AI agent to turn something into a skill ("save how we just fixed the bibliography as a skill"): it drafts one in the chat, and you edit it or save it to your skills or the project's.
- In **Settings → AI skills**, your skills are listed on the left; pick one to read its instructions and reference files, or **Create with AI** to open a chat with the AI agent for writing skills (**Improve in chat** on a skill starts a message about it). The chat follows the built-in **skill-creator** skill: it asks how you would use the skill, drafts it (with reference files when they help), and can try a draft on text you paste. Drafts are saved only when you save them; saving one under a name you already use asks before replacing it. The chat is kept until you start a new one.
- ColTex comes with built-in skills (listed under **Built-in**), such as **skill-creator**. You can read and download them but not change them; a skill of your own with the same name is used instead.
- When one of your skills has the same name as a project skill, yours is used.

## Your own AI agent (MCP)

AI agents such as Claude Code, Codex, Cursor or VS Code can work on a project directly: read and search its files, edit them, compile and read the log, see the history, and read, add and answer comments. Every project is an MCP server for them.

1. Create a token in **Settings → Sync services** (the same tokens as for Git).
2. Copy the MCP address from the project settings (**MCP**).
3. Add it to your agent, with the token as a Bearer token. For Claude Code:

   ```sh
   claude mcp add --transport http coltex <address> --header "Authorization: Bearer <token>"
   ```

   For Codex, in `~/.codex/config.toml` (with the token in the `COLTEX_TOKEN` environment variable):

   ```toml
   [mcp_servers.coltex]
   url = "<address>"
   bearer_token_env_var = "COLTEX_TOKEN"
   ```

   For Cursor (`.cursor/mcp.json`) and others that take JSON:

   ```json
   { "mcpServers": { "coltex": { "url": "<address>", "headers": { "Authorization": "Bearer <token>" } } } }
   ```

What your agents may change is your choice per project, in the project settings under **MCP**:

- **Manual** (the default): their edits become your suggestions, which you and your collaborators accept or reject in **Review**. New files are created directly.
- **Auto**: their edits are applied directly, as your own. If track changes is on for you, they are suggestions anyway.
- **Full access**: as Auto, and they may also delete, move and rename files.

Before an agent's first change in a while, the project's state is saved as a version, so you can go back. Reviewers' agents can only suggest changes, viewers' agents can only read and comment. Anyone with your token acts as you: revoke it in **Settings → Sync services** when you no longer need it.
