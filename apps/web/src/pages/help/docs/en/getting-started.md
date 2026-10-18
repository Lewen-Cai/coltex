# Getting started

ColTex is a collaborative LaTeX editor running on your own server. It works much like Overleaf: the source on the left, the PDF on the right, and several people can edit the same project at once.

## New projects

Click **New project** at the top left, give it a name and pick a template:

| Template | Class |
| --- | --- |
| Blank article | The standard `article`, the simplest start |
| arXiv preprint | `article`, one column, authors with affiliations (authblk), natbib references |
| IEEE conference / IEEE journal | `IEEEtran` in conference / journal mode |
| ACM conference / ACM journal | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, for LNCS and other Springer proceedings |
| Elsevier journal | `elsarticle`, one-column preprint |
| APS (REVTeX 4.2) | `revtex4-2`, for Physical Review and AIP journals |

Apart from the blank article, each comes with an abstract, keywords, an equation, a figure, a table and a `references.bib`, and builds as it is. The classes are the official ones that ship with TeX Live. Conferences that publish new style files every year (NeurIPS, ICML) aren't in TeX Live: upload that year's files to a project and publish it as a template.

Projects that people published as templates (a group's thesis format, say) are listed under "Shared on this server".

New projects compile with **Automatic**: the engine is picked at each build from the document; see [Compiling and the PDF](#/help/compiling).

To bring a project over from Overleaf, choose **Download Source** there and **Import** the zip here (up to 200 MB). The main document is detected, and the compiler is Automatic too.

## The editor

- **Top**: the project name, who is here, **History** and **Share**.
- **Left rail**: switches the left panel between files, search, references, review, chat and AI; keyboard shortcuts and project settings are at its bottom.
- **Middle**: the editor, with **Code / Visual** in its toolbar.
- **Right**: the PDF, with **Recompile**, **Logs**, the go-to-PDF button, open in a new window and download.

## Compiling and the PDF

- Click **Recompile** or press `Mod+S` / `Mod+Enter`. Auto compile is on by default and builds when you pause typing.
- **Logs** shows the number of errors; open it to see each one with an explanation, and click one to jump to its line. Errors are also marked next to the line numbers in the editor.
- **Source ↔ PDF**: with the cursor in the source, click the crosshair in the PDF bar and the PDF scrolls to that place; double-click the PDF to jump back to the source.
- **PDF in its own window**: "Open the PDF in a new window" in the PDF bar lets you put the PDF on another screen while the editor fills its window. See [Compiling and the PDF](#/help/compiling).

## Next

- [Editor](#/help/editor): the two modes, tables and figures, equation preview, spell checking, the right-click menu.
- [Collaboration](#/help/collaboration): inviting people, comments, track changes, chat.
- [AI agent](#/help/ai): explanations and edits, applied only after you review them.
