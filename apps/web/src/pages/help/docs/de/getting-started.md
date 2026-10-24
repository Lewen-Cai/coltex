# Erste Schritte

ColTex ist ein kollaborativer LaTeX-Editor, der auf Ihrem eigenen Server läuft. Er funktioniert ganz ähnlich wie Overleaf: links der Quelltext, rechts das PDF, und mehrere Personen können gleichzeitig am selben Projekt arbeiten.

## Neue Projekte

Klicken Sie oben links auf **Neues Projekt**, geben Sie einen Namen ein und wählen Sie eine Vorlage:

| Vorlage | Klasse |
| --- | --- |
| Leerer Artikel | Die Standardklasse `article`, der einfachste Einstieg |
| arXiv-Preprint | `article`, einspaltig, Autoren mit Affiliationen (authblk), Literaturverweise mit natbib |
| IEEE-Konferenz / IEEE-Zeitschrift | `IEEEtran` im Konferenz- bzw. Journal-Modus |
| ACM-Konferenz / ACM-Zeitschrift | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, für LNCS und andere Springer-Tagungsbände |
| Elsevier-Zeitschrift | `elsarticle`, einspaltiges Preprint |
| APS (REVTeX 4.2) | `revtex4-2`, für Physical Review und AIP-Zeitschriften |

Bis auf den leeren Artikel enthält jede Vorlage ein Abstract, Schlüsselwörter, eine Formel, eine Abbildung, eine Tabelle und eine `references.bib` und lässt sich so, wie sie ist, kompilieren. Die Klassen sind die offiziellen, die mit TeX Live ausgeliefert werden. Konferenzen, die jedes Jahr neue Stildateien veröffentlichen (NeurIPS, ICML), sind nicht in TeX Live enthalten: Laden Sie die Dateien des jeweiligen Jahres in ein Projekt hoch und veröffentlichen Sie es als Vorlage.

Projekte, die andere als Vorlage veröffentlicht haben (etwa das Dissertationsformat einer Arbeitsgruppe), stehen unter „Auf diesem Server geteilt“.

Neue Projekte kompilieren mit **Automatisch**: Die Engine wird bei jedem Build anhand des Dokuments gewählt; siehe [Kompilieren und PDF](#/help/compiling).

Um ein Projekt aus Overleaf zu übernehmen, wählen Sie dort **Download Source** und **Importieren** Sie die ZIP-Datei hier (bis 200 MB). Das Hauptdokument wird erkannt, und der Compiler steht ebenfalls auf Automatisch. Build-Dateien, die andere Editoren hinterlassen (`.aux`, `.log`, `.synctex.gz` und ähnliche), und Ordner wie `.vscode` werden wie bei Overleaf ausgelassen; `latexmkrc`- und `.bbl`-Dateien bleiben erhalten.

## Der Editor

- **Oben**: der Projektname, wer gerade da ist, **Verlauf** und **Teilen**.
- **Linke Leiste**: schaltet den linken Bereich zwischen Dateien, Suche, Literatur, Prüfen, Chat und KI um; Tastenkürzel und Projekteinstellungen finden Sie unten in der Leiste.
- **Mitte**: der Editor, mit **Code / Visuell** in seiner Werkzeugleiste.
- **Rechts**: das PDF, mit **Neu kompilieren**, **Protokolle**, der Schaltfläche „Zum PDF“, dem Öffnen in einem neuen Fenster und dem Herunterladen.

## Kompilieren und PDF

- Klicken Sie auf **Neu kompilieren** oder drücken Sie `Mod+S` / `Mod+Enter`. Automatisches Kompilieren ist standardmäßig eingeschaltet und startet einen Build, sobald Sie beim Tippen eine Pause machen.
- **Protokolle** zeigt die Anzahl der Fehler; öffnen Sie es, um jeden Fehler mit einer Erklärung zu sehen, und klicken Sie auf einen, um zu seiner Zeile zu springen. Fehler werden außerdem im Editor neben den Zeilennummern markiert.
- **Quelltext ↔ PDF**: Klicken Sie mit dem Cursor im Quelltext auf das Fadenkreuz in der PDF-Leiste, und das PDF scrollt an diese Stelle; ein Doppelklick ins PDF springt zurück in den Quelltext.
- **PDF in eigenem Fenster**: Mit „PDF in neuem Fenster öffnen“ in der PDF-Leiste können Sie das PDF auf einen anderen Bildschirm legen, während der Editor sein Fenster ausfüllt. Siehe [Kompilieren und PDF](#/help/compiling).

## Weiter

- [Editor](#/help/editor): die beiden Modi, Tabellen und Abbildungen, Formelvorschau, Rechtschreibprüfung, das Kontextmenü.
- [Zusammenarbeit](#/help/collaboration): Personen einladen, Kommentare, Änderungen nachverfolgen, Chat.
- [KI-Agent](#/help/ai): Erklärungen und Änderungen, die erst nach Ihrer Prüfung übernommen werden.
