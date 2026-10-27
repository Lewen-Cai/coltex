# KI-Agent

**KI** in der linken Leiste öffnet den KI-Agenten. Er steht zur Verfügung, sobald ein Administrator einen Modelldienst verbunden und Sie einer KI-Gruppe hinzugefügt hat; die Gruppe bestimmt, welche Modelle Sie verwenden dürfen.

## Was er kann

- Beantwortet LaTeX-Fragen und erklärt markierten Code.
- Erklärt oder behebt Kompilierfehler (das Protokoll hat dafür auch eine Schaltfläche „Mit KI beheben“).
- Formuliert die Auswahl um, überarbeitet oder übersetzt sie.
- Gibt einen Überblick über das Projekt, findet nicht referenzierte Labels und vieles mehr.
- Sieht sich Seiten der PDF an, um das Layout zu prüfen, etwa Abbildungen und Tabellen in ihren Spalten oder überlaufende Formeln (mit Modellen, die Bilder sehen können).

Die geöffnete Datei, die Auswahl und aktuelle Kompilierfehler werden Ihrer Nachricht angehängt; klicken Sie auf einen Anhang, um ihn wegzulassen.

Für eine Nachricht kann der KI-Agent bis zu 60 Schritte machen (lesen, bearbeiten, kompilieren, suchen …). Erreicht er die Grenze, hält er an und sagt, was er getan hat und was noch fehlt; senden Sie „weiter“, damit er fortfährt.

## Berechtigungen

Was der KI-Agent ändern darf, entscheiden Sie: unter **Einstellungen → KI-Agent** oder in der Modellauswahl unten im Bereich (unter der Denkstufe); die Zeile unter dem Eingabefeld zeigt die Wahl an. Dieselbe Wahl gilt für Ihre eigenen, über MCP angebundenen Agenten (siehe unten).

- **Manuell** (Voreinstellung): Die Änderungen des KI-Agenten landen in einem Entwurf, und nichts ändert sich, bis Sie ihn übernehmen.
  1. Wenn er fertig ist, wird der Entwurf testweise kompiliert, und Sie erfahren, ob er Fehler hinzufügt.
  2. **Änderungen prüfen** zeigt den Diff pro Datei; Sie können auch nur einen Teil übernehmen.
  3. **Auswahl übernehmen** schreibt die Änderungen ins Projekt und kompiliert; verschlechtert sich der Build, wird zurückgerollt. Vor dem Übernehmen wird eine Version gespeichert.
  4. Nach dem Übernehmen macht **Rückgängig** die Änderungen rückgängig und behält, was andere inzwischen bearbeitet haben.
- **Auto**: Der Entwurf wird übernommen, sobald der KI-Agent seine Antwort beendet, mit denselben Sicherungen: Zuerst wird eine Version gespeichert, das Projekt wird kompiliert, ein schlechterer Build wird zurückgerollt, und **Rückgängig** steht danach bereit. Hat jemand inzwischen dieselben Zeilen geändert, wird nichts übernommen, und der Entwurf wartet auf Sie. Wenn Sie den KI-Agenten anhalten, wartet sein Entwurf ebenfalls auf Sie.
- **Vollzugriff**: wie Auto; zusätzlich kann der KI-Agent Dateien löschen, verschieben und umbenennen. Das geschieht sofort, nicht im Entwurf; vor dem ersten solchen Schritt jeder Antwort wird eine Version gespeichert. Die Antwort listet diese Schritte zusammen mit den geänderten Dateien auf.

Betrachter und Prüfer können den KI-Agenten fragen, aber er kann für sie nichts ändern.

## Das Web

Sobald die Websuche eingerichtet ist, kann der KI-Agent im Web suchen und Webseiten lesen: die aktuellen Autorenrichtlinien einer Zeitschrift, die Versionshinweise eines Pakets, eine Quelle, um eine Behauptung zu prüfen. Modelle von Anthropic, OpenAI und ChatGPT nutzen ihre integrierte Suche, andere Modelle den Suchdienst, den die Administration verbunden hat. Seine Suchen und die gelesenen Seiten erscheinen als Schritte im Gespräch, und er sagt, auf welchen Seiten eine Antwort beruht.

Damit auf diesem Weg nichts von Ihrem Projekt nach außen gelangt:
- Suchanfragen gehen nur an den Suchdienst, den der Administrator gewählt hat (oder an die eigene Suche des Modells), und sind höchstens 128 Zeichen lang.
- Er liest nur Adressen, die Sie im Gespräch geschrieben haben oder die seine Suchen geliefert haben, genau so; eigene Adressen kann er nicht erfinden.
- Er liest nur: Es wird nichts hochgeladen oder gesendet.

Webseiten kann jeder schreiben, und sie können Anweisungen enthalten, die den KI-Agenten in die Irre führen sollen. Solange Sie das Web nutzen können, warten die Änderungen des KI-Agenten deshalb immer auf Ihre Prüfung, auch bei **Auto** oder **Vollzugriff**, und er löscht oder verschiebt keine Dateien. Für Ihre KI-Werkzeuge (MCP) gilt weiter Ihre Berechtigung.

## Modelle und Denken

- Das Modell wählen Sie unten im Bereich. Mit **Auto** wählt ColTex je nach Frage ein leichtes oder ein starkes Modell.
- Bei Modellen, die denken können, stellen Sie die Stufe in derselben Auswahl ein; die Zeile unter dem Eingabefeld zeigt sie an.

## Chats und Kontext

- Unterhaltungen werden für Sie gespeichert, pro Projekt (andere sehen sie nie). **Neuer Chat** beginnt einen weiteren; **Chats** listet die früheren auf: öffnen, umbenennen oder löschen. Ein wieder geöffneter Chat geht dort weiter, wo er aufgehört hat; ein nicht übernommener Entwurf wird nicht aufbewahrt, deshalb wird vor dem Wechsel nachgefragt.
- Der Ring unter dem Eingabefeld zeigt, wie viel vom Kontextfenster des Modells der Chat belegt (z. B. `12k / 200k`). Ab 70 % wird er gelb, ab 90 % rot.
- Hat Ihre KI-Gruppe ein Nutzungslimit, zeigt ein Balken daneben, was Sie an diesem Tag, in dieser Woche oder in diesem Monat verbraucht haben (für Details mit der Maus darüberfahren). Ist es erreicht, warten Nachrichten bis zum nächsten Zeitraum. **Einstellungen → KI-Agent** zeigt Ihre Nutzung der letzten 30 Tage und was übrig ist.
- Tippen Sie `/` in das Eingabefeld für Befehle:
  - `/compact`: den bisherigen Chat zusammenfassen und von der Zusammenfassung aus weitermachen, um Kontext freizugeben. Die Nachrichten bleiben sichtbar; der KI-Agent erinnert sich über die Zusammenfassung an sie.
  - `/new`: einen neuen Chat beginnen.
  - `/chats`: die früheren Chats.
- Das Eingabefeld wächst mit dem Text. Ziehen Sie seinen oberen Rand, um es höher zu machen (das bleibt in diesem Browser so, auch im Projekt-Chat); ein Doppelklick auf den Rand stellt es zurück.

## Skills

Ein Skill ist eine Sammlung von Anweisungen für eine Aufgabe, die Sie immer wieder erledigen, zum Beispiel „ein Abstract auf das Limit der Zeitschrift kürzen“ oder „prüfen, ob jede Abbildung referenziert wird“. Skills verwenden das Format Agent Skills (eine `SKILL.md` mit Name, Beschreibung und Anweisungen), daher funktionieren auch Skills, die für andere KI-Agenten geschrieben wurden.

- **Ihre Skills** finden Sie unter **Einstellungen → KI-Skills**; nur Sie sehen sie, und Sie können sie in jedem Projekt verwenden.
- Vorhandene Skills fügen Sie mit **Importieren** hinzu: **Dateien hochladen** nimmt eine `SKILL.md` mit ihren Referenzdateien oder eine `.zip` mit Skill-Ordnern; **Ordner hochladen** nimmt den Ordner eines Skills oder einen Ordner mit mehreren. Skripte in einem Skill werden als Text aufbewahrt, den der KI-Agent lesen kann; nichts in einem Skill wird je ausgeführt.
- Verwenden Sie einen, indem Sie `/` tippen und ihn auswählen, und schreiben Sie dann Ihre Nachricht dazu (`/polish-abstract keep it under 200 words`). Der KI-Agent liest außerdem die Beschreibungen und lädt einen Skill von sich aus, wenn Ihre Anfrage dazu passt.
- Bitten Sie den KI-Agenten, etwas zu einem Skill zu machen („speichere, wie wir gerade das Literaturverzeichnis repariert haben, als Skill“): Er entwirft einen im Chat, und Sie bearbeiten ihn oder speichern ihn in Ihren Skills.
- Unter **Einstellungen → KI-Skills** sind Ihre Skills links aufgelistet; wählen Sie einen aus, um seine Anweisungen und Referenzdateien zu lesen, oder **Mit KI erstellen**, um einen Chat mit dem KI-Agenten zum Schreiben von Skills zu öffnen (**Im Chat verbessern** bei einem Ihrer Skills beginnt eine Nachricht dazu). Der Chat folgt dem integrierten Skill **skill-creator**: Er fragt, wie Sie den Skill verwenden würden, entwirft ihn (mit Referenzdateien, wenn sie helfen) und kann einen Entwurf an eingefügtem Text ausprobieren. Entwürfe werden erst gespeichert, wenn Sie sie speichern; wenn Sie einen unter einem bereits verwendeten Namen speichern, wird vor dem Ersetzen nachgefragt. Der Chat bleibt erhalten, bis Sie einen neuen beginnen.
- ColTex bringt integrierte Skills mit (aufgelistet unter **Integriert**). Sie können sie lesen und herunterladen, aber nicht ändern; ein eigener Skill mit gleichem Namen wird stattdessen verwendet.
  - **skill-creator**: Skills schreiben (der Skills-Chat folgt ihm).
  - **template-conversion**: eine Vorlagenkonvertierung abschließen: Er fragt nach der Zeitschrift oder Konferenz, sucht deren Autorenrichtlinien und passt den Artikel an (**Öffnen und mit KI beheben** nach einer Konvertierung startet ihn).

## Ihre eigenen KI-Tools (MCP)

KI-Tools wie Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline oder OpenCode können direkt an Ihren Projekten arbeiten: sie auflisten, ihre Dateien lesen und durchsuchen, sie bearbeiten, kompilieren und das Protokoll lesen, den Verlauf einsehen sowie Kommentare lesen, hinzufügen und beantworten. ColTex ist für sie ein MCP-Server, mit einer Adresse für alle Ihre Projekte; das Tool nennt das Projekt, an dem es arbeitet.

Wählen Sie unter **Einstellungen → KI-Agent** im Abschnitt **Ihre KI-Tools (MCP)** links Ihr Tool aus und folgen Sie den drei Schritten: die Adresse, ein Token (**Token erstellen**; es wird nur einmal angezeigt) und die Konfiguration zum Kopieren, in die beides schon eingetragen ist. Jedes andere Tool, das sich über HTTP mit einem Header für das Token mit MCP-Servern verbindet, funktioniert ebenfalls (**Sonstiges**). Apps, die nur Server mit Anmeldung über OAuth akzeptieren (etwa die benutzerdefinierten Konnektoren von Claude oder ChatGPT), können sich noch nicht verbinden.

Was Ihre Tools ändern dürfen, richtet sich nach Ihrer Berechtigung unter **Einstellungen → KI-Agent**:

- **Manuell** (Voreinstellung): Die Änderungen der Tools werden zu Ihren Vorschlägen, die Sie und Ihre Mitwirkenden unter **Prüfen** annehmen oder ablehnen. Neue Dateien werden direkt erstellt.
- **Auto**: Die Änderungen der Tools werden direkt übernommen, als wären es Ihre eigenen. Ist das Nachverfolgen von Änderungen für Sie eingeschaltet, werden sie trotzdem zu Vorschlägen.
- **Vollzugriff**: wie Auto; zusätzlich dürfen sie Dateien löschen, verschieben und umbenennen.

Vor der ersten Änderung eines Tools nach längerer Zeit wird der Stand des Projekts als Version gespeichert, sodass Sie zurückkehren können. Tools von Prüfern können nur Änderungen vorschlagen, Tools von Betrachtern nur lesen und kommentieren.

### Sicherheit

- Wer Ihr Token hat, handelt in Ihrem Namen: Behandeln Sie es wie ein Passwort und widerrufen Sie es in der Token-Liste, wenn Sie es nicht mehr brauchen (ein Token pro Tool oder Computer macht das einfach). Geben Sie jedem Token beim Erstellen nur, was es braucht:
  - **Verwendet für**: Git, MCP oder beides. Ein nur für MCP erstelltes Token kann nicht klonen oder pushen, und umgekehrt.
  - **Zugriff**: **Schreibgeschützt** erlaubt einem Tool, aufzulisten, zu lesen, zu suchen und zu kompilieren, aber keine Dateien oder Kommentare zu ändern (und git zu klonen und zu pullen, nicht zu pushen), unabhängig von Ihrer Berechtigung.
  - **Projekte**: alle Ihre Projekte oder nur die ausgewählten; die anderen existieren für das Token nicht.
  - **Läuft ab**: nach 30 Tagen, 90 Tagen, einem Jahr oder nie. Ein abgelaufenes Token funktioniert nicht mehr; widerrufen Sie es und erstellen Sie ein neues.
- ColTex antwortet nur Ihrem Tool; es verbindet sich nie mit anderen MCP-Servern. Was Ihr Tool sonst noch kann (einen Browser über Playwright MCP, ein Terminal, andere Dienste), hängt vom Tool und seinen eigenen Einstellungen ab. Text, Kommentare und Protokolle eines Projekts können von Ihren Mitwirkenden geschrieben sein, sodass ein Tool, das sie liest, in diesem Text aufgefordert werden könnte, etwas mit seinen anderen Fähigkeiten zu tun. ColTex weist Tools an, Projektinhalte als Inhalt und nicht als Anweisungen zu behandeln, aber durchsetzen kann das nur Ihr Tool: Lassen Sie seine eigenen Bestätigungen für Aktionen außerhalb von ColTex eingeschaltet und verwenden Sie **Manuell**, wenn ein Tool auch einen Browser oder ein Terminal hat.
- Ein Tool mit einem Browser, der bei ColTex angemeldet ist, handelt über die Webseiten mit Ihren vollen Rechten, nicht über MCP, sodass die obige Berechtigung es dort nicht einschränkt. Lassen Sie solche Tools ein Browserprofil verwenden, das nicht angemeldet ist.
