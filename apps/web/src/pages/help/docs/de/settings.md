# Einstellungen

Klicken Sie unten links auf Ihren Avatar und wählen Sie **Einstellungen**.

- **Konto**: Ihr Anzeigename (sichtbar für Mitwirkende, in Kommentaren und im Verlauf), die Farbe Ihres Avatars (auch Ihr Cursor im Editor; **Automatisch** ist die von ColTex gewählte) und Ihr Passwort. Beim Ändern des Passworts können Sie Ihre anderen Geräte abmelden. Passwörter brauchen mindestens 8 Zeichen mit einem Großbuchstaben, einem Kleinbuchstaben und einer Ziffer; Sonderzeichen sind optional. Die beim Tippen angezeigte Bewertung (schwach, mittel, gut, stark) steigt mit Länge und Sonderzeichen. Für die Registrierung und das Zurücksetzen durch Admins gelten dieselben Regeln. Ihre Anmelde-E-Mail kann nur ein Administrator ändern. Die Bestätigung in zwei Schritten und Ihre Anmeldeaktivität finden Sie ebenfalls auf dieser Seite (siehe unten).
- **Darstellung**: das Design (Hell und Dunkel in Blau, Wald und Moos in Grün, Lavendel und Pflaume in Violett; standardmäßig Hell) und die Sprache der Oberfläche (14 Sprachen, darunter English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français und Deutsch; anfangs die Sprache Ihres Browsers). Dunkle Designs gelten auch für den Editor; PDF-Seiten bleiben weiß. Das Design wird mit Ihrem Konto gespeichert und folgt Ihnen daher in andere Browser (die Anmeldeseite verwendet immer Hell); die Sprache wird in diesem Browser gespeichert.
- **Synchronisierung**: Ihr Zotero-Konto verbinden (siehe [Literatur](#/help/references)) sowie Git-Tokens erstellen und widerrufen (siehe [Dateien](#/help/files)): jedes für Git, MCP oder beides, mit Lese- und Schreibzugriff oder schreibgeschützt, für alle Ihre Projekte oder einige, mit Ablaufdatum. Verwenden Sie ein Token pro Computer, damit Sie es einzeln widerrufen können.
- **Gruppen**: die Gruppen, in denen Sie sind, offene Einladungen und neue Gruppen; siehe unten.
- **KI-Agent**: Ihre KI-Nutzung der letzten 7, 30 oder 90 Tage (Anfragen, Tokens, Kosten, pro Tag und pro Modell) und was von Ihrem Limit übrig ist (wenn Sie den KI-Agenten nutzen können), was KI-Agenten für Sie ändern dürfen (**Berechtigungen**) und die Anbindung Ihrer eigenen KI-Agenten über **MCP** mit ihren Tokens; siehe [KI-Agent](#/help/ai).
- **KI-Skills** (wenn Sie den KI-Agenten nutzen können): Ihre eigenen Skills, die integrierten und ein Chat mit dem KI-Agenten zum Schreiben von Skills; siehe [KI-Agent](#/help/ai).

## Gruppen

**Einstellungen → Gruppen** listet die Gruppen, in denen Sie sind. Ein Projekt lässt sich mit einer ganzen Gruppe teilen (siehe [Zusammenarbeit](#/help/collaboration)), und Administratoren teilen Vorlagen mit Gruppen (siehe [Vorlagen](#/help/templates)).

- Jeder kann eine Gruppe erstellen: **Gruppe erstellen** und einen Namen geben. Sie sind dann ihr Eigentümer.
- Eigentümer laden mit **Jemanden per Name oder E-Mail einladen** jeden ein, der auf diesem Server ein Konto hat. Die Person bekommt eine Benachrichtigung und tritt unter **Einladungen** auf dieser Seite mit **Beitreten** bei oder lehnt mit **Ablehnen** ab. Bis dahin steht sie als **Eingeladen** in der Liste, und der Eigentümer kann **Einladung zurückziehen**.
- Im ⋯-Menü eines Mitglieds können Eigentümer es **Zum Eigentümer machen** (oder **Zum Mitglied machen**) und **Entfernen**. Das ⋯-Menü der Gruppe hat **Umbenennen** und **Gruppe löschen** für Eigentümer sowie **Gruppe verlassen**.
- Eine Gruppe hat immer einen Eigentümer: Der letzte macht vor dem Verlassen jemand anderen zum Eigentümer oder löscht die Gruppe.
- Wer eine Gruppe verlässt, entfernt wird oder deren Gruppe gelöscht wird, verliert die mit ihr geteilten Projekte, außer denen, zu denen er einzeln hinzugefügt wurde.

## Bestätigung in zwei Schritten

Ist die Bestätigung in zwei Schritten eingeschaltet, fragt die Anmeldung nach dem Passwort nach einem Code aus einer Authenticator-App auf Ihrem Smartphone (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). Das entscheiden Sie selbst; niemand sonst kann sie für Sie einschalten.

1. Klicken Sie unter **Einstellungen → Konto** bei **Bestätigung in zwei Schritten** auf **Einschalten** und geben Sie Ihr Passwort ein.
2. Scannen Sie den QR-Code mit der App (oder tippen Sie den Einrichtungsschlüssel ein) und geben Sie dann den 6-stelligen Code ein, den sie anzeigt.
3. Speichern Sie die 10 **Wiederherstellungscodes** (kopieren oder als Datei herunterladen). Jeder meldet Sie einmal anstelle eines Codes an, falls Sie Ihr Smartphone verlieren. Sie werden nur jetzt angezeigt.

Geben Sie bei der Anmeldung nach dem Passwort den Code aus der App ein oder klicken Sie auf **Wiederherstellungscode verwenden**. **Auf diesem Gerät 30 Tage lang nicht mehr fragen** überspringt den Code in diesem Browser. **Neue Wiederherstellungscodes** ersetzt die alten (bewahren Sie die neuen auf); **Ausschalten** kehrt zur Anmeldung nur mit Passwort zurück. Git- und MCP-Tokens funktionieren wie bisher.

> Smartphone und Wiederherstellungscodes verloren? Der Systemadministrator kann die Bestätigung in zwei Schritten für Ihr Konto auf dem Server ausschalten (`coltex reset-2fa <email>`); dann melden Sie sich mit Ihrem Passwort an und können sie wieder einschalten.

## Anmeldeaktivität

**Anmeldeaktivität** unten unter **Einstellungen → Konto** listet die Anmeldungen bei Ihrem Konto auf, die neuesten zuerst: wann, das Ergebnis (angemeldet, falsches Passwort, falscher Code, abgewiesen), Browser und System sowie die Adresse und ihr Standort: das lokale Netzwerk, Tailscale oder bei einer Adresse im Internet Land, Region, Stadt und Netzbetreiber. Die Standorte stammen aus einer Datenbank auf dem Server; Adressen werden nie anderswohin geschickt, um sie nachzuschlagen. Die Einträge werden 90 Tage aufbewahrt.

Die Editor-Einstellungen (Schriftgröße, Farben, Vim…) finden Sie unter **Einstellungen** unten in der linken Leiste des Editors; siehe [Editor](#/help/editor).
