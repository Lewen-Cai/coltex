# Compiling and the PDF

## Compiler and main document

Project settings has the **Compiler** and the **Main document**:

- **Automatic** (the default for new projects): picked at each build from the document. XeLaTeX when the preamble (with the files it `\input`s and the project's own `.sty`/`.cls`) loads `ctex`, `xeCJK`, `fontspec`, `unicode-math` and the like, or the class is `ctexart`/`ctexbook` etc.; LuaLaTeX when it loads `luacode` or `luatexja`; pdfLaTeX otherwise. A first line `% !TEX program = xelatex`, or a `latexmkrc` in the project, decides instead.
- **pdfLaTeX**: the usual choice for English documents.
- **XeLaTeX**: needed for Chinese (ctex) and system fonts.
- **LuaLaTeX**: also supports system fonts.

Choosing an engine uses it every time, without detection.

> For Chinese, load `\usepackage[UTF8]{ctex}` (or use the `ctexart` class) and Automatic switches to XeLaTeX. Chinese text without ctex fails under pdfLaTeX with “Unicode character … not set up for use with LaTeX”.

The main document is the file a build starts from; choose it under **Main document** in the project settings.

Builds use the full TeX Live with latexmk, which runs LaTeX, BibTeX/Biber and indexes as often as needed. They run isolated, without network access, and shell escape is restricted.

## Compile options

The arrow next to **Recompile** has:

- **Auto compile**: builds when you pause typing (one build at a time per project, however many people type).
- **Compile mode**: Normal or Fast [draft]. Draft mode leaves images out and is quicker.
- **Compile error handling**: stop on the first error, or try to compile despite errors.
- **Clean and recompile**: when a build looks wrong, remove the auxiliary files and build from scratch.

These are kept per project in this browser.

## Logs

The number on **Logs** is the error count. The log lists errors, warnings and typesetting issues:

- each with the LaTeX message, and for common problems an explanation (a missing package, for example, names the package to add);
- click one to jump to its file and line;
- the raw log is there too, and the AI can explain or fix the errors.

> When a build fails, the PDF of the last successful build stays on screen.

## Between the source and the PDF

- **Source → PDF**: with the cursor in the source, click **Locate** in the PDF bar (or "Go to PDF" in the right-click menu); the PDF scrolls there and highlights it.
- **PDF → source**: double-click the PDF; the editor opens the file at that line.

## Layout: editor, PDF or both

The view switch (four small buttons at the right of the PDF bar) shows **Editor only**, **Editor & PDF** side by side or **PDF only**, as in Overleaf, and the fourth opens the PDF in a new window; this browser remembers the choice. Dragging the divider all the way to one side hides that pane too.

- With the editor only, **Recompile** and the same switch are at the end of the editor toolbar.
- **Go to PDF** from the editor shows the PDF when it is hidden.
- In a narrow window (a tablet or phone) there is room for one at a time, and the side panels (files, search…) cover the editor while open.

## The PDF in its own window

**Open the PDF in a new window** (the last button of the view switch) opens the PDF in a separate window you can move to another screen:

- The editor window drops its PDF pane and the editor fills it; **Recompile** moves to the end of the editor toolbar.
- The PDF window has Recompile, Logs, go to PDF and download. Double-clicking its PDF jumps to the source in the editor window.
- **Show the PDF here** in the editor toolbar, or closing the window, brings the PDF pane back.

## Downloads

- The PDF bar downloads the current PDF.
- The download button at the top of the file tree downloads the project's source files as a .zip.
- In the project list, a project's menu (⋯) has **Download PDF**, which builds it first, and **Download .zip** for all its source files.

## Exporting to Word

Some journals take only Word files. **Export to Word…** in a project's menu (⋯) in the project list, or under **Actions** in the project settings, turns the project into a .docx.

- The title page comes from the document: title, authors, affiliations, corresponding author, abstract and keywords, for the classes template conversion reads (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Maths become Word equations. Word numbers the figures and tables, PDF and EPS figures become pictures, and numbered equations keep their numbers, so `\eqref` still points to them.
- Tables become Word tables you can edit, merged cells included. The reference list stays where the bibliography was, under its heading (References, or the document's own), and citations link to their entries.
- **Citation style**: **Like the document** follows the document's bibliography style. You can also pick APA, Vancouver, AMA, IEEE, Nature or Chicago, or a `.csl` file uploaded to the project.
- **Word template**: upload a journal's Word template (`.docx`) to the project and pick it here; the document takes its styles. The field appears when the project has a `.docx` file.
- Check the result before sending it: your own macros and complex tables may need fixing in Word. TikZ drawings aren't converted: compile them to images and include those instead.
