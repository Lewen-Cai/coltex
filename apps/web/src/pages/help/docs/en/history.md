# History

**History** at the top of the editor opens the history view. It works like a git log: every version has a short id (like `a1b2c3d`), a description, when it was made and who made it.

- Versions are recorded automatically after a pause in editing, with who made the changes.
- **Save version** records the current state now, with your description (like a commit message). If nothing changed since the last version, the description becomes a label on it.
- Select a version to see which files it changed and how, or compare it with the current project.
- **Revert these changes** undoes only what that version changed and keeps everything changed since (like `git revert`). If a file was changed again since in a way that clashes, nothing is changed and the file is named.
- **Restore project** brings every file back to how it was in that version; files added since are removed. **Restore this file** does that for one file.
- Reverts and restores are versions of their own ("Reverts a1b2c3d", "Back to a1b2c3d"; click the id to go to that version), so they can be undone too.
- **Add label** names a version (e.g. "Submitted") so you can find it later.
- Any version's files can be downloaded as a .zip.

> A version is also saved before AI changes are applied, before a project-wide replace, a git push, a revert and a restore.
