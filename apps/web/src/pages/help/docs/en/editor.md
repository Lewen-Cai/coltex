# Editor

## Code and visual mode

**Code / Visual** in the toolbar switches how you edit; both edit the same LaTeX source.

- **Code**: the source itself, with highlighting, autocomplete and bracket matching. With the cursor in maths, the typeset equation is shown above it (`Esc` hides it).
- **Visual**: headings, bold, lists, maths, tables and figures look typeset; the source shows where the cursor is. Good for reading and editing text.

## Toolbar

Heading level, bold, italic, maths, symbols, links, `\ref`, `\cite`, figures, tables, lists, and search. Buttons that don't fit go into the **⋯** menu.

- **Symbols** (Σ): Greek letters, operators, arrows and more by category; click to insert.
- **Tables**: choose the size when inserting. In visual mode, click a table to edit its cells (`Tab` moves between them); its toolbar adds and removes rows and columns, merges cells and sets alignment and borders.
- **Figures**: upload an image, pick one from the project, or paste or drop an image into the editor. In visual mode the edit button on a figure changes its width, caption and label.

## Autocomplete

Typing `\` suggests commands; `\ref{` and `\cite{` list the project's labels and bibliography keys. `Ctrl+Space` opens suggestions at any time.

## Errors

- **Compile errors**: the last build's errors and warnings in the open file get a dot next to the line number, and errors are underlined. Hover to see the LaTeX message and an explanation.
- **Code check**: checks as you type, without compiling: unclosed or mismatched environments, a stray `}` or `$`, maths commands outside maths. Where you are typing isn't flagged. Put `%%begin novalidate` and `%%end novalidate` around a part to skip it.

## Spell checking

Misspelled words get a red dotted underline (CJK text isn't checked). Right-click one for suggestions or **Add to dictionary**. The language is a project setting.

Your dictionary is under **Settings → Dictionary** at the bottom of the editor's rail; its words count as correct in all your projects. Type in the field to find a word, and press Enter to add it if it isn't there yet; the letters above the list jump to that letter. The **⋯** menu imports a text file (one word per line, or separated by spaces or commas; Hunspell `.dic` files work too), exports your words as `dictionary.txt`, and removes them all. Open editors check the words again straight away.

## Right-click menu

Cut, copy, paste, select all, delete, go to PDF, and add a comment. On `\ref{…}` it offers **Go to label**; on `\input{…}` or `\include{…}`, **Open file**.

## Outline and breadcrumbs

- **File outline** under the file tree lists the sections of the open file; click one to go there. The section you're in is highlighted.
- The row above the editor shows "file › section › subsection" for the cursor; click a section to go to it. It can be turned off in the editor settings.

## Search

`Mod+F` (or `Mod+Shift+F`, or the toolbar's search button) opens the **Search** panel on the left with the selected text filled in. It searches the whole project with the open file's matches first, with regular expressions, case and whole-word matching, and replaces one match or all. A version is saved before replacing all.

## Editor settings

**Settings** at the bottom of the left rail groups its settings into categories on the left:

- **Project**: compiler, main document, spell-check language (editors change them, for everyone), and the Git clone address;
- **Appearance**: font size, font (monospace or sans-serif), line height, **Code colours** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark and more, code mode only), breadcrumbs;
- **Editing**: keybindings (default, Vim or Emacs) and switches for the code check, equation preview, auto-close brackets and autocomplete;
- **Keyboard shortcuts**: see below;
- **Actions**: word count, copy, export to Word, template conversion, publishing as a template.

Appearance, editing and shortcuts are yours, kept in this browser, for every project.

## Keyboard shortcuts

**Shortcuts** in the left rail lists them all. The most used:

| Action | Keys |
| --- | --- |
| Compile | `Mod+S` or `Mod+Enter` |
| Undo / redo | `Mod+Z` / `Mod+Shift+Z` |
| Search and replace | `Mod+F` |
| Bold / italic | `Mod+B` / `Mod+I` |
| Comment or uncomment lines | `Mod+/` |
| Go to line | `Mod+Alt+G` |
| Comment on the selection | `Mod+Alt+M` |
| Show suggestions | `Ctrl+Space` |

Keys are shown for your system: ⌘, ⌥ and ⇧ on a Mac, Ctrl, Alt and Shift on Windows and Linux. These are the default keys.

### Your own shortcuts

In **Keyboard shortcuts** in the settings, click **Change** next to a command and press the new keys. They need Ctrl (⌘ on a Mac) or Alt; keys another command uses, or that stay with the browser and basic editing (undo, copy, paste, select all…), can't be taken. Reset one, or all. The toolbar hints and the shortcut list then show your keys.
