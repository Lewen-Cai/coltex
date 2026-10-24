# AI agent

**AI** in the left rail opens the AI agent. It's available once an administrator has connected a model service and added you to an AI group; the group decides which models you may use.

## What it does

- Answers LaTeX questions and explains selected code.
- Explains or fixes compile errors (the log has a "Fix with AI" button too).
- Rewrites, polishes or translates the selection.
- Gives an overview of the project, finds unreferenced labels, and so on.

The open file, the selection and recent compile errors are attached to your message; click an attachment to leave it out.

## Permissions

What the AI agent may change is up to you: choose in **Settings → AI agent**, or in the model picker at the bottom of the panel (under the thinking level); the line under the message box shows it. The same choice applies to your own agents connected over MCP (see below).

- **Manual** (the default): the AI agent's changes go into a draft, and nothing changes until you apply it.
  1. When it's done, the draft is test-compiled and you're told whether it adds errors.
  2. **Review changes** shows the diff per file; you can apply only some of it.
  3. **Apply** writes the changes into the project and compiles; if the build gets worse, it's rolled back. A version is saved before applying.
  4. After applying, **Undo** reverts the changes and keeps edits other people made in the meantime.
- **Auto**: the draft is applied as soon as the AI agent finishes its answer, with the same safeguards: a version is saved first, the project is compiled, a worse build is rolled back, and **Undo** is there afterwards. If someone changed the same lines meanwhile, nothing is applied and the draft waits for you. When you stop the AI agent, its draft also waits for you.
- **Full access**: as Auto, and the AI agent can also delete, move and rename files. These happen at once, not in the draft; a version is saved before the first one in each answer. The answer lists them with the files it changed.

Viewers and reviewers can ask the AI agent, but it can't change anything for them.

## Models and thinking

- Choose the model at the bottom of the panel. With **Auto**, ColTex picks a light or a strong model depending on the question.
- For models that can think, the level is set in the same picker; the line under the message box shows it.

## Chats and context

- Conversations are saved for you, per project (others never see them). **New chat** starts another; **Chats** lists the previous ones: open, rename or delete them. Reopening a chat continues it where it stopped; a draft that wasn't applied is not kept, so switching away from one asks first.
- The ring under the message box shows how much of the model's context window the chat uses (e.g. `12k / 200k`). It turns amber at 70% and red at 90%.
- If your AI group has a usage limit, a bar beside it shows what you've used this day, week or month (hover for details). Once you reach it, messages wait until the next period. **Settings → AI agent** shows your usage over the last 30 days and what is left.
- Type `/` in the message box for commands:
  - `/compact`: summarise the chat so far and continue from the summary, freeing the context. The messages stay visible; the AI agent remembers them through the summary.
  - `/new`: start a new chat.
  - `/chats`: the previous chats.

## Skills

A skill is a set of instructions for a task you do again and again, for example "shorten an abstract to the journal's limit" or "check that every figure is referenced". Skills use the Agent Skills format (a `SKILL.md` with a name, a description and the instructions), so skills written for other AI agents work here too.

- **Your skills** are in **Settings → AI skills**; only you see them, and you can use them in every project.
- **Import** skills you already have: **Upload files** takes a `SKILL.md` with its reference files, or a `.zip` of skill folders; **Upload folder** takes a skill's folder, or a folder holding several. Scripts in a skill are kept as text the AI agent can read; nothing in a skill is ever run.
- Use one by typing `/` and picking it, then add your message (`/polish-abstract keep it under 200 words`). The AI agent also reads the descriptions and loads a skill on its own when your request fits one.
- Ask the AI agent to turn something into a skill ("save how we just fixed the bibliography as a skill"): it drafts one in the chat, and you edit it or save it to your skills.
- In **Settings → AI skills**, your skills are listed on the left; pick one to read its instructions and reference files, or **Create with AI** to open a chat with the AI agent for writing skills (**Improve in chat** on one of your skills starts a message about it). The chat follows the built-in **skill-creator** skill: it asks how you would use the skill, drafts it (with reference files when they help), and can try a draft on text you paste. Drafts are saved only when you save them; saving one under a name you already use asks before replacing it. The chat is kept until you start a new one.
- ColTex comes with built-in skills (listed under **Built-in**). You can read and download them but not change them; a skill of your own with the same name is used instead.
  - **skill-creator**: writing skills (the skills chat follows it).

## Your own AI tools (MCP)

AI tools such as Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline or OpenCode can work on your projects directly: list them, read and search their files, edit them, compile and read the log, see the history, and read, add and answer comments. ColTex is an MCP server for them, with one address for all your projects; the tool names the project it works on.

In **Settings → AI agent**, under **Your AI tools (MCP)**, pick your tool on the left and follow the three steps: the address, a token (**Create token**; it's shown once), and the configuration to copy, with both filled in. Any other tool that connects to MCP servers over HTTP with a header for the token works too (**Other**). Apps that only accept servers signing in through OAuth (such as Claude's or ChatGPT's custom connectors) can't connect yet.

What your tools may change follows your permission in **Settings → AI agent**:

- **Manual** (the default): their edits become your suggestions, which you and your collaborators accept or reject in **Review**. New files are created directly.
- **Auto**: their edits are applied directly, as your own. If track changes is on for you, they are suggestions anyway.
- **Full access**: as Auto, and they may also delete, move and rename files.

Before a tool's first change in a while, the project's state is saved as a version, so you can go back. Reviewers' tools can only suggest changes, viewers' tools can only read and comment.

### Safety

- Anyone with your token acts as you: keep it like a password, and revoke it in the token list when you no longer need it (one token per tool or computer makes that easy). Give each token only what it needs when you create it:
  - **Used for**: Git, MCP, or both. A token made only for MCP can't clone or push, and the other way round.
  - **Access**: **Read only** lets a tool list, read, search and compile, but not change files or comments (and lets git clone and pull, not push), whatever your permission.
  - **Projects**: all your projects, or only the ones you pick; the others don't exist for the token.
  - **Expires**: after 30 days, 90 days, a year, or never. An expired token stops working; revoke it and create a new one.
- ColTex only answers your tool; it never connects to other MCP servers. What else your tool can do (a browser through Playwright MCP, a terminal, other services) is up to the tool and its own settings. A project's text, comments and logs can be written by your collaborators, so a tool that reads them could be asked, in that text, to do something with its other abilities. ColTex tells tools to treat project content as content, not instructions, but only your tool can enforce it: keep its own confirmations on for actions outside ColTex, and use **Manual** when a tool also has a browser or a terminal.
- A tool with a browser that is signed in to ColTex acts with your full rights through the web pages, not through MCP, so the permission above doesn't limit it there. Let such tools use a browser profile that isn't signed in.
