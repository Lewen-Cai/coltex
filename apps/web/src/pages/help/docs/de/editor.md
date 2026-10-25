# Editor

## Code- und visueller Modus

**Code / Visuell** in der Werkzeugleiste wechselt die Art der Bearbeitung; beide bearbeiten denselben LaTeX-Quelltext.

- **Code**: der Quelltext selbst, mit Hervorhebung, Autovervollständigung und Klammerzuordnung. Steht der Cursor in einer Formel, wird die gesetzte Formel darüber angezeigt (`Esc` blendet sie aus).
- **Visuell**: Überschriften, Fettdruck, Listen, Formeln, Tabellen und Abbildungen erscheinen gesetzt; wo der Cursor steht, wird der Quelltext gezeigt. Gut zum Lesen und Bearbeiten von Text.

## Werkzeugleiste

Überschriftenebene, fett, kursiv, Formeln, Symbole, Links, `\ref`, `\cite`, Abbildungen, Tabellen, Listen und Suche. Schaltflächen, die nicht hineinpassen, wandern in das Menü **⋯**.

- **Symbole** (Σ): griechische Buchstaben, Operatoren, Pfeile und mehr, nach Kategorien; ein Klick fügt ein.
- **Tabellen**: Die Größe wählen Sie beim Einfügen. Im visuellen Modus klicken Sie auf eine Tabelle, um ihre Zellen zu bearbeiten (`Tab` springt zwischen ihnen); ihre Werkzeugleiste fügt Zeilen und Spalten hinzu oder entfernt sie, verbindet Zellen und legt Ausrichtung und Rahmenlinien fest.
- **Abbildungen**: Laden Sie ein Bild hoch, wählen Sie eines aus dem Projekt oder fügen Sie ein Bild in den Editor ein bzw. ziehen Sie es hinein. Im visuellen Modus ändert die Bearbeiten-Schaltfläche einer Abbildung ihre Breite, Beschriftung und ihr Label.

## Autovervollständigung

Wenn Sie `\` tippen, werden Befehle vorgeschlagen; `\ref{` und `\cite{` listen die Labels und Literaturschlüssel des Projekts auf. `Ctrl+Space` öffnet die Vorschläge jederzeit.

## Fehler

- **Kompilierfehler**: Fehler und Warnungen des letzten Builds in der geöffneten Datei erhalten einen Punkt neben der Zeilennummer, und Fehler werden unterstrichen. Fahren Sie mit der Maus darüber, um die LaTeX-Meldung und eine Erklärung zu sehen.
- **Codeprüfung**: prüft beim Tippen, ohne zu kompilieren: nicht geschlossene oder nicht zusammenpassende Umgebungen, ein überzähliges `}` oder `$`, Mathematikbefehle außerhalb von Formeln. Die Stelle, an der Sie gerade tippen, wird nicht markiert. Setzen Sie `%%begin novalidate` und `%%end novalidate` um einen Abschnitt, um ihn auszunehmen.

## Rechtschreibprüfung

Falsch geschriebene Wörter erhalten eine rot gepunktete Unterstreichung (CJK-Text wird nicht geprüft). Ein Rechtsklick darauf zeigt Vorschläge oder **Zum Wörterbuch hinzufügen**. Die Sprache ist eine Projekteinstellung.

Ihr Wörterbuch finden Sie unter **Einstellungen → Wörterbuch** unten in der Leiste des Editors; seine Wörter gelten in allen Ihren Projekten als korrekt. Tippen Sie in das Feld, um ein Wort zu suchen, und drücken Sie Enter, um es hinzuzufügen, falls es noch fehlt; die Buchstaben über der Liste springen zu diesem Buchstaben. Das Menü **⋯** importiert eine Textdatei (ein Wort pro Zeile oder durch Leerzeichen oder Kommas getrennt; auch Hunspell-`.dic`-Dateien funktionieren), exportiert Ihre Wörter als `dictionary.txt` und entfernt alle. Geöffnete Editoren prüfen die Wörter sofort neu.

## Kontextmenü

Ausschneiden, kopieren, einfügen, alles auswählen, löschen, zum PDF und Kommentar hinzufügen. Auf `\ref{…}` bietet es **Zum Label**, auf `\input{…}` oder `\include{…}` **Datei öffnen**.

## Gliederung und Brotkrümelnavigation

- **Gliederung** unter dem Dateibaum listet die Abschnitte der geöffneten Datei auf; ein Klick springt dorthin. Der Abschnitt, in dem Sie sich befinden, ist hervorgehoben.
- Die Zeile über dem Editor zeigt „Datei › Abschnitt › Unterabschnitt“ für die Cursorposition; ein Klick auf einen Abschnitt springt dorthin. Sie lässt sich in den Editor-Einstellungen ausschalten.

## Suche

`Mod+F` (oder `Mod+Shift+F` oder die Suchschaltfläche der Werkzeugleiste) öffnet links den Bereich **Suche** mit dem markierten Text. Er durchsucht das ganze Projekt, die Treffer der geöffneten Datei zuerst, mit regulären Ausdrücken, Beachtung der Groß-/Kleinschreibung und Suche nach ganzen Wörtern, und ersetzt einen Treffer oder alle. Vor dem Ersetzen aller Treffer wird eine Version gespeichert.

## Editor-Einstellungen

**Einstellungen** unten in der linken Leiste gruppiert die Einstellungen links in Kategorien:

- **Projekt**: Compiler, Hauptdokument, Sprache der Rechtschreibprüfung (Bearbeiter ändern sie für alle) und die Git-Klon-Adresse;
- **Darstellung**: Schriftgröße, Schriftart (Monospace oder serifenlos), Zeilenhöhe, **Codefarben** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark und weitere, nur im Code-Modus), Brotkrümelnavigation;
- **Bearbeiten**: Tastenbelegung (Standard, Vim oder Emacs) und Schalter für Codeprüfung, Formelvorschau, automatisches Schließen von Klammern und Autovervollständigung;
- **Tastenkürzel**: siehe unten;
- **Aktionen**: Wortzählung, Kopie, Word-Export, Vorlagenumwandlung, Veröffentlichen als Vorlage.

Darstellung, Bearbeiten und Tastenkürzel gehören Ihnen, werden in diesem Browser gespeichert und gelten für jedes Projekt.

## Tastenkürzel

**Tastenkürzel** in der linken Leiste listet sie alle auf. Die meistgenutzten:

| Aktion | Tasten |
| --- | --- |
| Kompilieren | `Mod+S` oder `Mod+Enter` |
| Rückgängig / Wiederholen | `Mod+Z` / `Mod+Shift+Z` |
| Suchen und Ersetzen | `Mod+F` |
| Fett / Kursiv | `Mod+B` / `Mod+I` |
| Zeilen aus- oder einkommentieren | `Mod+/` |
| Gehe zu Zeile | `Mod+Alt+G` |
| Auswahl kommentieren | `Mod+Alt+M` |
| Vorschläge anzeigen | `Ctrl+Space` |

Die Tasten werden für Ihr System angezeigt: ⌘, ⌥ und ⇧ auf einem Mac, Ctrl, Alt und Shift unter Windows und Linux. Dies sind die Standardtasten.

### Eigene Tastenkürzel

Klicken Sie in den Einstellungen unter **Tastenkürzel** neben einem Befehl auf **Ändern** und drücken Sie die neuen Tasten. Sie brauchen Ctrl (⌘ auf einem Mac) oder Alt; Tasten, die ein anderer Befehl verwendet oder die dem Browser und einfachem Bearbeiten vorbehalten sind (Rückgängig, Kopieren, Einfügen, Alles auswählen…), können nicht belegt werden. Setzen Sie eines oder alle zurück. Die Hinweise der Werkzeugleiste und die Liste der Tastenkürzel zeigen dann Ihre Tasten.
