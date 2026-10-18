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
