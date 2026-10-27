# Kompilieren und PDF

## Compiler und Hauptdokument

In den Projekteinstellungen finden Sie **Compiler** und **Hauptdokument**:

- **Automatisch** (die Voreinstellung für neue Projekte): wird bei jedem Build anhand des Dokuments gewählt. XeLaTeX, wenn die Präambel (mit den Dateien, die sie per `\input` einbindet, und den projekteigenen `.sty`/`.cls`) `ctex`, `xeCJK`, `fontspec`, `unicode-math` und Ähnliches lädt oder die Klasse `ctexart`/`ctexbook` usw. ist; LuaLaTeX, wenn sie `luacode` oder `luatexja` lädt; sonst pdfLaTeX. Eine erste Zeile `% !TEX program = xelatex` oder eine `latexmkrc` im Projekt entscheidet stattdessen.
- **pdfLaTeX**: die übliche Wahl für englische Dokumente.
- **XeLaTeX**: nötig für Chinesisch (ctex) und Systemschriften.
- **LuaLaTeX**: unterstützt ebenfalls Systemschriften.

Wählen Sie eine Engine aus, wird sie jedes Mal verwendet, ohne Erkennung.

> Für Chinesisch laden Sie `\usepackage[UTF8]{ctex}` (oder verwenden die Klasse `ctexart`), und Automatisch wechselt zu XeLaTeX. Chinesischer Text ohne ctex scheitert unter pdfLaTeX mit „Unicode character … not set up for use with LaTeX“.

Das Hauptdokument ist die Datei, mit der ein Build beginnt; wählen Sie sie unter **Hauptdokument** in den Projekteinstellungen.

Builds verwenden das vollständige TeX Live mit latexmk, das LaTeX, BibTeX/Biber und Register so oft wie nötig ausführt. Sie laufen isoliert, ohne Netzwerkzugang, und Shell-Escape ist eingeschränkt.

## Kompilieroptionen

Der Pfeil neben **Neu kompilieren** bietet:

- **Automatisch kompilieren**: startet einen Build, sobald Sie beim Tippen eine Pause machen (ein Build pro Projekt zur selben Zeit, egal wie viele Personen tippen).
- **Kompiliermodus**: Normal oder Schnell [Entwurf]. Der Entwurfsmodus lässt Bilder weg und ist schneller.
- **Umgang mit Kompilierfehlern**: beim ersten Fehler anhalten oder trotz Fehlern weiter kompilieren.
- **Bereinigen und neu kompilieren**: Wenn ein Build fehlerhaft aussieht, werden die Hilfsdateien entfernt und alles neu gebaut.

Diese Optionen werden pro Projekt in diesem Browser gespeichert.

## Protokolle

Die Zahl an **Protokolle** ist die Anzahl der Fehler. Das Protokoll listet Fehler, Warnungen und Satzprobleme auf:

- jeweils mit der LaTeX-Meldung und bei häufigen Problemen mit einer Erklärung (bei einem fehlenden Paket etwa wird das hinzuzufügende Paket genannt);
- ein Klick springt zur Datei und Zeile;
- auch das Rohprotokoll ist verfügbar, und die KI kann die Fehler erklären oder beheben.

> Schlägt ein Build fehl, bleibt das PDF des letzten erfolgreichen Builds auf dem Bildschirm.

## Zwischen Quelltext und PDF

- **Quelltext → PDF**: Klicken Sie mit dem Cursor im Quelltext auf **Anzeigen** in der PDF-Leiste (oder auf „Zum PDF“ im Kontextmenü); das PDF scrollt an die Stelle und hebt sie hervor.
- **PDF → Quelltext**: Doppelklicken Sie ins PDF; der Editor öffnet die Datei an dieser Zeile.
- **Links im PDF**: Zitate, Verweise auf Abbildungen, Tabellen, Gleichungen und Abschnitte sowie das Inhaltsverzeichnis springen an ihre Stelle im PDF (mit `hyperref`); Webadressen öffnen sich in einem neuen Tab.

## Layout: Editor, PDF oder beides

Der Ansichtsschalter (vier kleine Schaltflächen rechts in der PDF-Leiste) zeigt **Nur Editor**, **Editor & PDF** nebeneinander oder **Nur PDF**, wie in Overleaf, und der vierte öffnet das PDF in einem neuen Fenster; dieser Browser merkt sich die Wahl. Wenn Sie den Trenner ganz an eine Seite ziehen, wird dieser Bereich ebenfalls ausgeblendet.

- Bei „Nur Editor“ stehen **Neu kompilieren** und derselbe Schalter am Ende der Werkzeugleiste des Editors.
- **Zum PDF** im Editor zeigt das PDF an, wenn es ausgeblendet ist.
- In einem schmalen Fenster (Tablet oder Smartphone) ist nur für einen Bereich Platz, und die Seitenbereiche (Dateien, Suche…) überdecken den Editor, solange sie geöffnet sind.

## Das PDF in eigenem Fenster

**PDF in neuem Fenster öffnen** (die letzte Schaltfläche des Ansichtsschalters) öffnet das PDF in einem separaten Fenster, das Sie auf einen anderen Bildschirm verschieben können:

- Das Editorfenster gibt seinen PDF-Bereich ab, und der Editor füllt es aus; **Neu kompilieren** wandert ans Ende der Werkzeugleiste des Editors.
- Das PDF-Fenster hat Neu kompilieren, Protokolle, Zum PDF und Herunterladen. Ein Doppelklick in sein PDF springt zum Quelltext im Editorfenster.
- **PDF hier anzeigen** in der Werkzeugleiste des Editors oder das Schließen des Fensters holt den PDF-Bereich zurück.

## Downloads

- Die PDF-Leiste lädt das aktuelle PDF herunter.
- Die Download-Schaltfläche oben im Dateibaum lädt die Quelldateien des Projekts als .zip herunter.
- In der Projektliste enthält das Menü eines Projekts (⋯) **PDF herunterladen**, das zuerst kompiliert, und **.zip herunterladen** für alle Quelldateien.

## Als Word exportieren

Manche Zeitschriften nehmen nur Word-Dateien an. **Als Word exportieren…** im Menü eines Projekts (⋯) in der Projektliste oder unter **Aktionen** in den Projekteinstellungen macht aus dem Projekt eine .docx-Datei.

- Die Titelseite stammt aus dem Dokument: Titel, Autoren, Affiliationen, korrespondierender Autor, Abstract und Schlüsselwörter, für die Klassen, die die Vorlagenumwandlung liest (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Formeln werden zu Word-Formeln. Word nummeriert Abbildungen und Tabellen, PDF- und EPS-Abbildungen werden zu Bildern, und nummerierte Gleichungen behalten ihre Nummern, sodass `\eqref` weiter auf sie verweist.
- Tabellen werden zu bearbeitbaren Word-Tabellen, verbundene Zellen eingeschlossen. Das Literaturverzeichnis steht dort, wo die Bibliografie war, unter seiner Überschrift (References oder der des Dokuments), und Zitate verlinken auf ihre Einträge.
- **Zitierstil**: **Wie im Dokument** folgt dem Literaturstil des Dokuments. Sie können auch APA, Vancouver, AMA, IEEE, Nature oder Chicago wählen oder eine `.csl`-Datei, die Sie ins Projekt hochgeladen haben.
- **Word-Vorlage**: Laden Sie die Word-Vorlage (`.docx`) einer Zeitschrift ins Projekt hoch und wählen Sie sie hier; das Dokument übernimmt ihre Formatvorlagen. Das Feld erscheint, wenn das Projekt eine `.docx`-Datei enthält.
- Prüfen Sie das Ergebnis vor dem Einreichen: eigene Makros und komplexe Tabellen müssen in Word eventuell nachbearbeitet werden. TikZ-Zeichnungen werden nicht umgewandelt: Kompilieren Sie sie zu Bildern und binden Sie diese stattdessen ein.
