# Zusammenarbeit

## Personen einladen

Klicken Sie oben rechts im Editor auf **Teilen**:

- Projekte werden nur mit Personen geteilt, die ein Konto auf diesem Server haben. Geben Sie einen Teil eines Namens oder einer E-Mail-Adresse ein, wählen Sie das Konto aus der Liste, wählen Sie eine Rolle und klicken Sie auf **+**.
- Personen ohne Konto brauchen zuerst einen Einladungslink von einem Admin oder dem Systemadmin; siehe [Verwaltung](#/help/admin).
- In der Mitgliederliste ändern Sie Rollen, übertragen das Eigentum oder entfernen Personen. Nur der Eigentümer verwaltet die Mitglieder.

### Rollen

| Rolle | Darf |
| --- | --- |
| Eigentümer | Alles, einschließlich Mitgliederverwaltung, Löschen des Projekts und Veröffentlichen als Vorlage |
| Bearbeiter | Dateien bearbeiten und verwalten, Vorschläge annehmen oder ablehnen |
| Prüfer | Text nur als nachverfolgte Vorschläge ändern; kommentieren |
| Betrachter | Lesen, kompilieren, herunterladen, kommentieren |

## Gemeinsam bearbeiten

Mehrere Personen können dieselbe Datei gleichzeitig bearbeiten; jeder Cursor hat eine eigene Farbe, und die Kopfzeile zeigt, wer gerade da ist. Änderungen werden live synchronisiert; es gibt nichts zu speichern.

## Kommentare

Markieren Sie Text und klicken Sie auf die Kommentar-Schaltfläche in der Werkzeugleiste (oder drücken Sie `Mod+Alt+M`). Kommentare stehen im Bereich **Prüfen** links, wo Sie antworten, sie bearbeiten und erledigen können. Mit `@` erwähnen Sie jemanden; die Person erhält eine Benachrichtigung.

## Änderungen nachverfolgen

Schalten Sie im Bereich Prüfen das Nachverfolgen von Änderungen für alle oder für einzelne Personen ein. Bearbeitungen werden dann zu Vorschlägen:

- gelöschter Text wird durchgestrichen und neuer Text hervorgehoben;
- Bearbeiter wählen **Annehmen** oder **Ablehnen**, einzeln oder alle auf einmal; eine versehentliche Entscheidung lässt sich mit **Rückgängig** in der folgenden Meldung zurücknehmen (15 Minuten lang);
- Änderungen von Prüfern werden immer nachverfolgt; ihre eigenen Vorschläge können sie im Bereich mit **Zurückziehen** zurücknehmen;
- eigene Fehler: `Ctrl/Cmd+Z` macht Ihre nachverfolgten Änderungen rückgängig, und wenn Sie gelöschten Text an seiner Stelle wieder eintippen, wird er wiederhergestellt statt als neuer Vorschlag hinzugefügt;
- das PDF zeigt den Text mit den Vorschlägen.

## Chat

**Chat** in der linken Leiste ist der Chat des Projekts:

- `Enter` sendet, `Shift+Enter` beginnt eine neue Zeile.
- `@` erwähnt ein Mitglied.
- Mathematik in `$…$` wird gesetzt, z. B. `$x^2$`.

## Benachrichtigungen

Erwähnungen im Chat oder in Kommentaren, Antworten auf Ihre Kommentare und das Hinzufügen zu einem Projekt erscheinen unter **Benachrichtigungen**, mit der Zahl der ungelesenen in der Seitenleiste. Sie gibt es nur in ColTex; keine E-Mails.
