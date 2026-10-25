# Erste Schritte

ColTex ist ein kollaborativer LaTeX-Editor, der auf Ihrem eigenen Server läuft. Er funktioniert ganz ähnlich wie Overleaf: links der Quelltext, rechts das PDF, und mehrere Personen können gleichzeitig am selben Projekt arbeiten.

## Neue Projekte

Klicken Sie oben links auf **Neues Projekt**, geben Sie einen Namen ein und wählen Sie eine Vorlage:

| Fachgebiet | Vorlagen |
| --- | --- |
| Allgemein | Leerer Artikel, arXiv-Preprint, Elsevier-Zeitschrift, Elsevier-Zeitschrift (Autor–Jahr), Elsevier-Zeitschrift (zweispaltig), Elsevier-CAS-Zeitschrift (zweispaltig), Nature, Übersichtsartikel, Kurzmitteilung |
| Informatik und Elektrotechnik | IEEE-Konferenz, IEEE-Zeitschrift, Konferenz der IEEE Computer Society, Zeitschrift der IEEE Computer Society, Zeitschrift der IEEE Communications Society, ACM-Konferenz, ACM-Zeitschrift, ACM-Einreichung (anonym), ACM-SIGPLAN-Konferenz, ACM Transactions on Graphics, Springer LNCS, PMLR-Tagungsband |
| Ingenieurwesen | ASME-Konferenz, ASCE-Zeitschrift, AIAA-Konferenzbeitrag, SPIE-Tagungsband |
| Physik | APS (REVTeX 4.2), Physical Review Letters, AIP-Zeitschrift, Journal of the Physical Society of Japan, JACoW-Konferenzbeitrag |
| Astronomie | AAS-Zeitschriften (AASTeX), Monthly Notices of the RAS |
| Chemie | ACS-Zeitschriftenartikel, ACS-Letter |
| Lebenswissenschaften | Forschungsartikel Lebenswissenschaften, Bioinformatik-Application-Note |
| Medizin | Bericht einer klinischen Studie, Studienprotokoll einer klinischen Studie, Beobachtungsstudie, Studie zur diagnostischen Genauigkeit, Systematische Übersichtsarbeit und Metaanalyse, Fallbericht, Medizinischer Research Letter, Elsevier-CAS-Zeitschrift, Zeitschrift von Oxford University Press |
| Mathematik und Statistik | AMS-Artikel, AMS-Tagungsband, Annals of Mathematics, Artikel zu statistischen Methoden |
| Wirtschaft | Wirtschaftswissenschaftlicher Artikel (AEA-Stil), Ökonometrischer Artikel |
| Sozial- und Geisteswissenschaften | APA-7-Manuskript, APA-7-Zeitschriftenlayout, APA-7-Studienarbeit, Geisteswissenschaftlicher Artikel (Chicago-Fußnoten), Literaturwissenschaftlicher Essay (MLA), Juristischer Artikel (OSCOLA) |
| Erde und Umwelt | Geowissenschaftlicher Artikel (AGU-Stil), Ökologische Feldstudie, Zeitschrift von Canadian Science Publishing |

Bis auf den leeren Artikel enthält jede eine Zusammenfassung, Beispielabschnitte und eine `references.bib` und lässt sich so übersetzen. Die Klassen sind die offiziellen, die TeX Live mitbringt. Viele bekannte Vorlagen von Zeitschriften und Konferenzen sind nicht eingebaut; warum, und wie Sie sie hinzufügen, steht unter [Vorlagen](#/help/templates).

Die Schaltflächen über den Vorlagen zeigen die eines Fachgebiets. Mit Ihnen geteilte Vorlagen (das Dissertationsformat einer Arbeitsgruppe etwa) stehen in derselben Liste, mit einem Etikett, wer sie geteilt hat; siehe [Vorlagen](#/help/templates).

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
