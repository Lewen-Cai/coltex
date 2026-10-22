# References

**References** in the left rail works with the project's `.bib` files.

## Citing

**Cite** lists every `.bib` entry in the project; search by author, title, year or key. Click an entry to insert `\cite{key}` at the cursor. Typing `\cite{` in the editor suggests keys too.

## Search and add

On the **Add** tab, type a title, authors or keywords and press Enter: ColTex searches Crossref (journals, proceedings, books) and arXiv (preprints) and lists what it finds, the best matches of each first. **+** adds a paper to the `.bib` file chosen under the field. A preprint arXiv knows the published version of is added by that version's DOI.

A DOI (e.g. `10.1145/3290605.3300857`), a doi.org link or an arXiv id is added directly, without a search.

Entries are fetched from doi.org and added at the end of the file with a unique key; one already in the file (same DOI) isn't added twice. Check what was fetched.

## Zotero

1. In **Settings → Sync services**, enter a Zotero API key (made in your zotero.org settings; read access is enough). It's stored encrypted on this server and only used to read your library.
2. On the **Zotero** tab of the References panel, choose a library or collection to import as a `.bib` file in the project.
3. **Refresh** replaces that file with what is in Zotero now, so edit entries in Zotero rather than in the file.

Refreshing uses the Zotero connection of whoever imported the file.
