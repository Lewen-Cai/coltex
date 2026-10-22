# Files

## The file tree

- The buttons in its header: new file, new folder, upload, and add a linked file.
- Drag a file onto a folder to move it; double-click a name to rename it. Files dropped from your computer are uploaded.
- Right-click a file or folder to create, upload, rename or delete.
- A coloured dot next to a file means someone else has it open.

Deleted files can be brought back from the history.

## Linked files

A linked file comes from elsewhere and can be refreshed from its source at any time:

- **From another project**: any file of another project, or its compiled PDF (built first). Useful for shared figures or a shared `.bib`, or to use one project's PDF as a figure in another.
- **From a URL**: downloaded from a public address (up to 50 MB). Addresses on the local or private network can't be used.

> Linked files have a link mark in the tree; hover to see where they come from. Right-click and **Refresh linked file** fetches it again and replaces it. Adding or refreshing needs your own access to the source project.

## Git

Every project can be cloned, pulled and pushed with git:

1. Create a token in **Settings → Git** (it's shown once; keep it).
2. Copy the clone address from the project settings and run `git clone <address>`. When git asks, use any user name and the token as the password.
3. Commit locally and `git push`: the changes go into the project at once, where collaborators see them.

Good to know:

- Each project has one branch, `main`.
- If someone changed the project since your last pull, git refuses the push: `git pull` first, then push again.
- Before a push is applied, the project's state is saved as a version.
- Reviewers and viewers can't push.
- To avoid typing the token each time: `git config --global credential.helper store` (or `osxkeychain` on a Mac).
