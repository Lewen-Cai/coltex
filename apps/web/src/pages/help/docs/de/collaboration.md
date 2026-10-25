# Zusammenarbeit

## Personen einladen

Klicken Sie oben rechts im Editor auf **Teilen**:

- Projekte werden nur mit Personen geteilt, die ein Konto auf diesem Server haben. Geben Sie einen Teil eines Namens oder einer E-Mail-Adresse ein, wählen Sie das Konto aus der Liste, wählen Sie eine Rolle und klicken Sie auf **+**.
- Personen ohne Konto brauchen zuerst einen Einladungslink von einem Admin oder dem Systemadmin; siehe [Verwaltung](#/help/admin).
- In der Mitgliederliste ändern Sie Rollen, übertragen das Eigentum oder entfernen Personen. Nur der Eigentümer verwaltet die Mitglieder.

### Mit einer Gruppe teilen

Der Eigentümer kann ein Projekt mit einer Gruppe teilen, in der er ist: In **Teilen** einen Teil des Gruppennamens eingeben, die Gruppe wählen (Gruppen stehen vor Personen), eine Rolle wählen und auf **+** klicken.

- Alle, die der Gruppe beigetreten sind, bekommen diese Rolle. Wer später beitritt, bekommt sie auch; wer austritt, verliert sie.
- Die Gruppe steht mit ihrer Mitgliederzahl und ihrer Rolle in der Liste, die Rolle wird dort geändert; ihr ⋯-Menü hat **Nicht mehr teilen**.
- Ihre Mitglieder stehen in der Mitgliederliste mit „über“ der Gruppe. Ihre Rolle kommt von der Gruppe; um einem von ihnen eine andere Rolle zu geben, fügen Sie ihn einzeln hinzu, dann betreffen ihn Änderungen der Gruppe nicht mehr.

### Rollen

| Rolle | Darf |
| --- | --- |
| Eigentümer | Alles, auch Mitglieder verwalten und das Projekt löschen; Administratoren können es auch als Vorlage veröffentlichen |
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

Erwähnungen im Chat oder in Kommentaren, Antworten auf Ihre Kommentare, das Hinzufügen zu einem Projekt und Einladungen in Gruppen erscheinen unter **Benachrichtigungen**, mit der Zahl der ungelesenen in der Seitenleiste. Sie bleiben in ColTex; keine E-Mails.
