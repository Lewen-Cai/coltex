# Literatur

**Literatur** in der linken Leiste arbeitet mit den `.bib`-Dateien des Projekts.

## Zitieren

**Zitieren** listet alle `.bib`-Einträge des Projekts auf; suchen Sie nach Autor, Titel, Jahr oder Schlüssel. Ein Klick auf einen Eintrag fügt `\cite{key}` an der Cursorposition ein. Auch wenn Sie im Editor `\cite{` tippen, werden Schlüssel vorgeschlagen.

## Suchen und hinzufügen

Geben Sie auf dem Tab **Hinzufügen** einen Titel, Autoren oder Schlüsselwörter ein und drücken Sie Enter: ColTex durchsucht Crossref (Zeitschriften, Tagungsbände, Bücher) und arXiv (Preprints) und listet die Treffer auf, jeweils die besten zuerst. **+** fügt ein Paper der `.bib`-Datei hinzu, die unter dem Feld gewählt ist. Ein Preprint, dessen veröffentlichte Fassung arXiv kennt, wird über die DOI dieser Fassung hinzugefügt.

Eine DOI (z. B. `10.1145/3290605.3300857`), ein doi.org-Link oder eine arXiv-ID wird direkt hinzugefügt, ohne Suche.

Einträge werden von doi.org abgerufen und mit einem eindeutigen Schlüssel ans Ende der Datei angefügt; ein Eintrag, der bereits in der Datei steht (gleiche DOI), wird nicht doppelt hinzugefügt. Prüfen Sie, was abgerufen wurde.

## Zotero

1. Geben Sie unter **Einstellungen → Synchronisierung** einen Zotero-API-Schlüssel ein (erstellt in Ihren Einstellungen auf zotero.org; Lesezugriff genügt). Er wird verschlüsselt auf diesem Server gespeichert und nur zum Lesen Ihrer Bibliothek verwendet.
2. Wählen Sie auf dem Tab **Zotero** des Literaturbereichs eine Bibliothek oder Sammlung, die als `.bib`-Datei ins Projekt importiert werden soll.
3. **Aus Zotero aktualisieren** ersetzt diese Datei durch den aktuellen Inhalt in Zotero; bearbeiten Sie Einträge daher in Zotero und nicht in der Datei.

Beim Aktualisieren wird die Zotero-Verbindung der Person verwendet, die die Datei importiert hat.
