# Verwaltung

Der Systemadministrator sieht die Verwaltungsseiten unter **Einstellungen** im Avatar-Menü; Admins sehen dort **Benutzer verwalten** und **Einladungen** für ihr eigenes Team.

## Benutzer und Einladungen

- Es gibt keine öffentliche Registrierung: Konten entstehen nur über Einladungslinks, und Projekte werden nur mit Personen geteilt, die ein Konto haben.
- Konten haben eine von drei Rollen:
  - **Mitglied**.
  - **Admin**: leitet ein **Team**, etwa eine Betreuerin und ihre Studierenden. Die Mitglieder, die ein Admin einlädt, kommen in sein Team, und der Admin verwaltet nur sie.
  - **Systemadmin**: Es gibt genau einen, das bei der Ersteinrichtung angelegte Konto. Er betreibt die gesamte Instanz (KI-Dienste, Backups, Netzwerk) und sieht alle. Niemand kann zu einem zweiten gemacht werden, sodass ein einzelnes Admin-Konto die Instanz nicht übernehmen kann.
- **Einladungen**: Links zur einmaligen Verwendung, für eine E-Mail-Adresse oder (bei leerem E-Mail-Feld) für alle mit dem Link, mit Ablaufdatum. Die Links einer ausstehenden Einladung bleiben in der Liste (**Link**), einer für jede Adresse, unter der ColTex erreichbar ist (LAN, Tailscale, Cloudflare). Der Systemadmin lädt Mitglieder oder Admins ein und wählt die **KI-Gruppe** des neuen Kontos. Admins laden nur Mitglieder ein, in ihr eigenes Team; diese Mitglieder erhalten die KI-Gruppe des Admins. Admins sehen und widerrufen nur ihre eigenen Einladungen.
- **Benutzer verwalten**: Der Systemadmin sieht alle Konten, macht Personen zu Mitgliedern oder Admins, verschiebt Mitglieder zwischen Teams (**Team** im Menü der Zeile), setzt Passwörter zurück und sperrt oder löscht Konten. Ein Admin sieht sich selbst und sein Team und setzt Passwörter nur für die Mitglieder seines Teams zurück, sperrt oder löscht nur diese. Wird ein Konto gelöscht, werden auch die Projekte gelöscht, deren Eigentümer es ist.
- Um die Rolle des Systemadmins an jemand anderen zu übergeben (oder sie zurückzuholen, wenn das Konto verloren ist), führen Sie `coltex cli system-admin <email>` auf dem Server aus; der bisherige Systemadmin wird zum Admin.
- Passwort vergessen, auch das des Systemadmins? Führen Sie `coltex cli reset-password <email>` auf dem Server aus: Der Befehl fragt zweimal nach dem neuen Passwort und meldet dieses Konto überall ab. Die Person, der das Konto gehört, erhält eine Benachrichtigung darüber, und das Serverprotokoll (`coltex logs`) hält es fest.

## KI-Dienste

- **KI-Dienste**: Verbinden Sie Anbieter mit API-Schlüsseln oder über die Anmeldung mit einem Abonnement (Claude Pro/Max, ChatGPT, Copilot…) oder Ihre eigenen OpenAI-kompatiblen Server (Ollama, vLLM, LM Studio…). Schlüssel werden verschlüsselt gespeichert, Mitglieder sehen sie nie, und Anfragen laufen über diesen Server.
- Endet eine Abonnement-Anmeldung auf einer localhost-Adresse, die nicht lädt, kopieren Sie diese vollständige Adresse aus der Adressleiste zurück in ColTex.
- Legen Sie die drei Modelle von **Auto** fest, und alle beginnen mit der automatischen Wahl: Das **Bewertungsmodell** (ein günstiges, schnelles Modell) liest jede Nachricht und gibt sie an das **leichte** Modell (schnelle Fragen, kleine Korrekturen) oder das **starke** (mehrere Fehler, Änderungen über mehrere Dateien, sorgfältiges Schreiben). Solange nicht alle drei festgelegt sind, beginnen alle mit dem ersten Modell, das sie verwenden dürfen.
- **KI-Nutzung & Zugriff**: Anfragen und Tokens für die Gruppe und pro Person. Wer welche Modelle verwenden darf, legen Sie mit **KI-Gruppen** fest: Jede Gruppe erlaubt Anbieter (einschließlich später hinzugefügter Modelle) oder einzelne Modelle, z. B. „Doktoranden“ mit dem starken Modell und „Bachelorstudierende“ mit dem leichten. Jede Person ist in höchstens einer Gruppe, gewählt in der Einladung oder später, indem Sie die Person in der Liste öffnen. Personen ohne Gruppe können den KI-Agenten nicht verwenden, daher haben neue Personen keine KI, bis der Systemadmin sie hinzufügt (von einem Admin eingeladene Mitglieder erhalten die Gruppe des Admins). Der Systemadmin kann immer alle Modelle verwenden. Wird eine Gruppe gelöscht, haben ihre Personen keine KI, bis sie einer anderen beitreten.

  Eine Gruppe kann auch begrenzen, wie viel jedes ihrer Mitglieder pro Tag, Woche oder Monat verbraucht: Tokens, Kosten (zu Listenpreisen) oder beides. Hat ein Mitglied das Limit erreicht, wird eine Nachricht abgelehnt, bis der nächste Zeitraum beginnt (Kalendertage, Wochen ab Montag, Monate, in der Zeitzone des Servers); die Nachricht, die das Limit überschreitet, wird noch zu Ende geführt. Mitglieder sehen ihren Verbrauch unter dem Eingabefeld des KI-Agenten. Der Systemadmin hat keine Limits.

  Um eine einzelne Person anzupassen, öffnen Sie sie in der Liste: Unter **Anpassen** ersetzen **Eigener Modellzugriff** und **Eigenes Nutzungslimit** die Einstellungen ihrer Gruppe, solange sie eingeschaltet sind (eigener Zugriff funktioniert auch ohne Gruppe). Die Liste kennzeichnet diese Personen mit **Angepasst**.

## Speicher und Backups

- Projektdateien liegen auf der lokalen Festplatte oder in S3-kompatiblem Speicher, festgelegt beim Start des Servers (`STORAGE` und `S3_*`). Verlauf, Build-Ausgaben und die Arbeitskopien des Compilers bleiben im Datenverzeichnis.
- **WebDAV-Backups** gehen in einen Ordner auf Nextcloud, ownCloud, einem NAS oder einem beliebigen WebDAV-Server. Jedes Backup ist eine Datei mit der Datenbank, den Dateien jedes Projekts und ihrem Verlauf. Planen Sie sie täglich oder wöchentlich und wählen Sie, wie viele aufbewahrt werden. Verwenden Sie ein App-Passwort, wenn der Server eines anbietet.
> **Verschlüsselung**: Verschlüsselte Backups (AES-256) enthalten auch das Instanzgeheimnis, sodass verbundene KI-Dienste nach einer Wiederherstellung weiter funktionieren. **Bewahren Sie das Passwort an anderer Stelle auf: Ohne es lässt sich ein Backup nicht öffnen.**
- Die Wiederherstellung erfolgt auf dem Server mit dem Befehl `restore`, während der Server gestoppt ist; siehe die Betriebsanleitung.

## Überwachung

**Übersicht** zeigt den aktuellen Zustand von Server, Compiler und Datenbank, mit Verlaufsdiagrammen für CPU, Arbeitsspeicher und Builds. Der Server misst alle 10 Sekunden und bewahrt 30 Tage auf, auch wenn niemand die Seite geöffnet hat.

## Netzwerk

**Netzwerk** listet die Adressen auf, unter denen ColTex erreichbar ist (Einladungen und Git-Adressen verwenden sie), schaltet das integrierte Tailscale und Cloudflare Tunnel ein und zeigt, wie Anfragen beim Server ankommen. Siehe [Bereitstellung und Netzwerk](#/help/deployment).
