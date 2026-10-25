# Getting started

ColTex is a collaborative LaTeX editor running on your own server. It works much like Overleaf: the source on the left, the PDF on the right, and several people can edit the same project at once.

## New projects

Click **New project** at the top left, give it a name and pick a template:

| Field | Templates |
| --- | --- |
| General | Blank article, arXiv preprint, Elsevier journal, Elsevier journal (author–year), Elsevier journal (two columns), Elsevier CAS journal (two columns), Nature, Review article, Short communication |
| Computing & electrical engineering | IEEE conference, IEEE journal, IEEE Computer Society conference, IEEE Computer Society journal, IEEE Communications Society journal, ACM conference, ACM journal, ACM submission (anonymous), ACM SIGPLAN conference, ACM Transactions on Graphics, Springer LNCS, PMLR proceedings |
| Engineering | ASME conference, ASCE journal, AIAA conference paper, SPIE proceedings |
| Physics | APS (REVTeX 4.2), Physical Review Letters, AIP journal, Journal of the Physical Society of Japan, JACoW conference paper |
| Astronomy | AAS journals (AASTeX), Monthly Notices of the RAS |
| Chemistry | ACS journal article, ACS letter |
| Life sciences | Life sciences research article, Bioinformatics application note |
| Medicine | Clinical trial report, Clinical trial protocol, Observational study, Diagnostic accuracy study, Systematic review and meta-analysis, Case report, Medical research letter, Elsevier CAS journal, Oxford University Press journal |
| Mathematics & statistics | AMS article, AMS proceedings, Annals of Mathematics, Statistics methods article |
| Economics | Economics paper (AEA style), Econometrics paper |
| Social sciences & humanities | APA 7 manuscript, APA 7 journal layout, APA 7 student paper, Humanities article (Chicago notes), Literature essay (MLA), Law article (OSCOLA) |
| Earth & environment | Geoscience article (AGU style), Ecology field study, Canadian Science Publishing journal |

Apart from the blank article, each comes with an abstract, example sections and a `references.bib`, and builds as it is. The classes are the official ones that ship with TeX Live. Many well-known journal and conference templates aren't built in; [Templates](#/help/templates) says why and how to add them.

The buttons above the templates show those of one field. Templates shared with you (a group's thesis format, say) are in the same list, tagged with who shared them; see [Templates](#/help/templates).

New projects compile with **Automatic**: the engine is picked at each build from the document; see [Compiling and the PDF](#/help/compiling).

To bring a project over from Overleaf, choose **Download Source** there and **Import** the zip here (up to 200 MB). The main document is detected, and the compiler is Automatic too. Build files other editors leave behind (`.aux`, `.log`, `.synctex.gz` and the like) and folders such as `.vscode` are left out, as on Overleaf; `latexmkrc` and `.bbl` files are kept.

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
