# Submission checklist

What to look for in a venue's guidelines, and the layout problems to check in the build. Keep only the items the venue's guidelines mention, plus the build problems you find.

## Venue requirements

### Format

- Template and class options required (journal mode, review mode, anonymous, `manuscript`, `twocolumn`).
- Page size, margins, font size, line spacing, line numbers for submission.
- Page limit: with or without references and appendices, and whether extra pages can be bought.
- Word limits: the whole paper, the abstract, the title.
- Columns: one or two; full-width figures allowed or not.

### Front matter

- Title length; a short or running title.
- Authors: full names, ORCID, emails, the corresponding author marked; the order of names and affiliations; a maximum number of authors (some letters, conference short papers).
- Affiliations: department, institution, city, country; a present address.
- Abstract: word limit; structured (Background, Methods, Results, Conclusions) or not; no citations or abbreviations in it.
- Keywords: how many, from a controlled list (MeSH, ACM CCS, MSC, JEL, PACS).
- Highlights, graphical abstract, significance statement, lay summary.

### Statements and sections

- Data availability, code availability.
- Funding, with grant numbers.
- Competing or conflicting interests.
- Author contributions (CRediT roles).
- Ethics approval, consent to participate or publish, trial registration.
- Acknowledgments: placement, and whether they go in the anonymous version.
- Required section order (IMRaD), or sections a type of article must have.

### References

- Style: numbered or author–year; the `.bst` or biblatex style to use.
- A maximum number of references (common for letters and reviews).
- DOIs required; preprints and URLs allowed or not.

### Figures and tables

- File formats and resolution; colour or greyscale in print.
- Caption position (tables above, figures below) and caption style.
- Tables: editable text (no images of tables); rules (booktabs or vertical lines).
- Figure width: one column, one and a half, full width.

### Review

- Double-blind: no names or affiliations, no identifying acknowledgments or funding, self-citations in the third person, anonymised links.
- Supplementary material: a separate file, or appendices after the references.

## Layout problems to check in the build

Look for these in the log after each compile:

- **Overfull lines**: `Overfull \hbox (12.3pt too wide) in paragraph at lines …`. A few points are invisible; more than about 5pt shows in the margin. Common causes are long URLs, words TeX can't hyphenate, wide inline maths, and tables or figures wider than the column.
- **Floats that don't fit**: `Float too large for page by …`, and `'h' float specifier changed to 'ht'`. These often show up after a move to two columns. Use `figure*`/`table*` for full-width floats, and `\columnwidth` for one column.
- **Floats far from where they're first cited, or many floats on the last pages**: check the order of `\begin{figure}` against the first `\ref` to it. Moving a float earlier in the source is a layout change; changing its size is not allowed.
- **Equations wider than the column**: break them with `multline`, `split` or `aligned`. Don't make the font smaller.
- **Inconsistent tables**: a mix of `\hline` and booktabs rules, or captions both above and below. Follow the template.
- **Headings at the bottom of a column or page**, and very uneven last-page columns. Fix these only if the venue cares (camera-ready). Use the class's means, such as `\balance` where it is supported.
- **Missing fonts or characters**: `Missing character: There is no … in font …`. Use the engine and fonts the template expects (`fontspec` needs XeLaTeX or LuaLaTeX).
- **Undefined references or citations**: `Reference … undefined`, `Citation … undefined`. Check labels and `.bib` keys that were lost or renamed in the conversion.
