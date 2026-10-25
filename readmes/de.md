<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Ein selbst gehosteter kollaborativer LaTeX-Editor mit integriertem KI-Agenten.</strong><br>
  Ihr Server · Ihre Konten · Ihre Daten · Zusammenarbeit in Echtzeit · Open Source (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd><b>Deutsch</b></kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Installation</a> · <a href="#configure">Konfiguration</a> · <a href="../CHANGELOG.md">Änderungsprotokoll</a> · <a href="https://github.com/coltexeditor/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/coltexeditor/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/coltexeditor/coltex?style=flat-square&amp;color=2563eb" alt="Neueste Version"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/coltexeditor/coltex/actions/workflows/ci.yml"><img src="https://github.com/coltexeditor/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<a id="quick-start"></a>
## Schnellstart

Sie brauchen einen Linux- oder macOS-Rechner mit Docker (unter Linux kann das Installationsprogramm es einrichten), mindestens 2 CPU-Kerne und 4 GB Arbeitsspeicher. Die Images sind für x86-64 und ARM64 vorgefertigt.

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

Öffnen Sie dann `http://<server>:3690` und legen Sie das Administratorkonto an.

<p align="center">
  <img src="../docs/images/editor.png" alt="Der ColTex-Editor: Dateien, der LaTeX-Quelltext, das kompilierte PDF und der KI-Agent" width="900">
</p>

<a id="why"></a>
## Warum ColTex?

ColTex ist eine Alternative zu Overleaf für eine Arbeitsgruppe, ein Labor oder nur für Sie selbst, und läuft auf einem Rechner unter Ihrer Kontrolle: einem Desktop-PC im Labor, einem Heimserver oder einer Cloud-Maschine.

- **Alles bleibt auf Ihrem Server.** Projekte, Verlauf, Konten und Kompilieraufträge verlassen ihn nie. TeX läuft in einem abgeschotteten Container ohne Internetzugang.
- **Für gemeinsames Schreiben gebaut.** Mehrere Personen bearbeiten dieselbe Datei gleichzeitig, mit Kommentaren, Änderungsnachverfolgung, Chat und Versionsverlauf.
- **Ein KI-Agent, der an Ihrem Projekt arbeitet.** Er liest die Dateien und das Kompilierprotokoll, entwirft Änderungen, kompiliert sie testweise und zeigt Ihnen einen Diff. Nichts wird geschrieben, bevor Sie es übernehmen.
- **Ein Befehl zur Installation, keine Ports zu öffnen.** Tailscale und Cloudflare Tunnel sind für den Fernzugriff eingebaut.

<a id="features"></a>
## Funktionen

### Schreiben und Kompilieren
- Code-Editor (CodeMirror) und ein visueller Editor mit dem Tabelleneditor und dem Abbildungsdialog von Overleaf, Werkzeugleiste, Symbolpalette, Gliederung und Brotkrümelnavigation.
- LaTeX-Vervollständigung, eine Codeprüfung, Formelvorschau, Rechtschreibprüfung in vielen Sprachen, Wortzählung, projektweites Suchen und Ersetzen sowie Vim- oder Emacs-Tastenbelegung.
- Kompiliert mit latexmk auf einem vollständigen TeX Live. Die Engine (pdfLaTeX, XeLaTeX oder LuaLaTeX) wird anhand des Dokuments gewählt, auch für Chinesisch (ctex, xeCJK).
- PDF-Vorschau mit SyncTeX in beide Richtungen, auch in einem separaten Fenster. Kompilierfehler werden im Quelltext unterstrichen, mit verständlichen Hinweisen.
- Literatur: aus Ihren `.bib`-Dateien zitieren, Crossref und arXiv durchsuchen (oder eine DOI oder arXiv-ID einfügen), um Einträge hinzuzufügen, oder eine Zotero-Bibliothek oder -Sammlung importieren und synchron halten.

### Zusammenarbeit
- Bearbeitung in Echtzeit mit den Cursorn aller, Kommentare mit @-Erwähnungen, Änderungsnachverfolgung (annehmen, ablehnen und eine Entscheidung rückgängig machen), Projekt-Chat und Benachrichtigungen in der App.
- Rollen pro Projekt: Eigentümer, Bearbeiter, Prüfer (nur Vorschläge) und Betrachter.
- Versionsverlauf wie bei git: automatische Versionen, mit einer Nachricht gespeicherte Versionen und das Zurücknehmen der Änderungen einer einzelnen Version.
- Git-Zugriff: ein Projekt klonen, lokal daran arbeiten und zurückpushen (persönliche Tokens; inzwischen im Browser gemachte Änderungen werden zusammengeführt).

### KI-Agent
- Fragen Sie zu LaTeX, Ihrem Projekt oder Ihrem Text, oder lassen Sie ihn Kompilierfehler beheben. Er entwirft Änderungen in einer privaten Kopie, kompiliert sie testweise und zeigt einen Diff; Sie übernehmen alles oder einen Teil.
- Beim Übernehmen wird zuerst eine Version gespeichert und neu kompiliert; verschlechtert sich der Build, wird die Änderung automatisch zurückgerollt.
- Anbieter: API-Schlüssel (Anthropic, OpenAI, DeepSeek, Google, OpenRouter und weitere), Anmeldung mit einem Abonnement (Claude Pro/Max, ChatGPT, GitHub Copilot und weitere) oder Ihr eigener OpenAI-kompatibler Server (Ollama, vLLM, LM Studio).
- Automatische Modellwahl (ein leichtes oder ein starkes Modell pro Nachricht), Zugriff pro Personengruppe, Nutzung pro Person und Nutzungslimits pro Tag, Woche oder Monat.
- Gespeicherte Chats pro Projekt, laufende Anzeige des Kontextfensters und `/compact`, um einen langen Chat zusammenzufassen.
- Skills: Ihre eigenen Anweisungen (Format Agent Skills) für all Ihre Projekte, denen der Agent folgt, aufgerufen mit `/name`; schreiben Sie sie selbst, importieren Sie sie oder erstellen Sie sie in den Einstellungen mit der KI.
- Berechtigungen wie bei Claude Code: Die Änderungen des KI-Agenten warten auf Ihre Prüfung (Manuell), werden übernommen, wenn er fertig ist (Auto), oder er darf zusätzlich Dateien löschen und verschieben (Vollzugriff).
- Ihr eigener Agent (Claude Code, Codex, Cursor…) über MCP: eine Adresse für alle Ihre Projekte, mit denselben Berechtigungen (bei Manuell werden seine Änderungen zu Ihren Vorschlägen).

### Projekte und Verwaltung
- Vorlagen für IEEE, ACM, Springer LNCS, Elsevier, REVTeX und arXiv sowie die Umwandlung eines Papers von einer Zeitschriftenvorlage in eine andere.
- Import und Export von Overleaf-ZIP-Dateien, aus einer URL oder einem anderen Projekt verknüpfte Dateien, Tags, Archiv und Papierkorb.
- Keine öffentliche Registrierung: Konten entstehen über Einladungslinks. Ein Systemadministrator und Admins, die jeweils das von ihnen eingeladene Team verwalten.
- Überwachung, WebDAV-Backups (optional verschlüsselt), lokaler oder S3-kompatibler Speicher, helle und dunkle Designs und eine Oberfläche in 14 Sprachen (Englisch, Chinesisch, Japanisch, Koreanisch, Spanisch, Französisch, Deutsch, Portugiesisch, Italienisch, Russisch, Türkisch, Vietnamesisch und Indonesisch).
- Kontosicherheit: Bestätigung in zwei Schritten mit einer Authenticator-App, ein Anmeldeprotokoll mit dem Ort jeder Adresse (auf dem Server nachgeschlagen) und Schutz gegen das Erraten von Passwörtern, der ein Konto für unbekannte Adressen sperrt – alles ohne Dienste Dritter.

<a id="install"></a>
## Installation

Bricht der Download ab (`curl: (35) Recv failure: Connection reset by peer`, häufig, wenn GitHub schwer erreichbar ist), führen Sie den Befehl einfach erneut aus.

Es fragt nach der Sprache und der TeX-Live-Edition (Pfeiltasten), holt die neueste Version nach `~/coltex`, lädt die vorgefertigten Images mit Fortschrittsbalken herunter, startet ColTex und gibt die zu öffnenden Adressen aus. Die vollständige Ausgabe landet in `~/coltex/install.log`. Öffnen Sie dann `http://<server>:3690` und erstellen Sie das Administratorkonto. Fernzugriff über Tailscale oder Cloudflare Tunnel schalten Sie danach unter **Einstellungen → Netzwerk** ein.

Beim ersten Start wird TeX Live heruntergeladen. Wählen Sie eine Edition:

| Edition | Download | Festplatte (ColTex gesamt) | Benötigter freier Speicher |
| --- | --- | --- | --- |
| **standard** (Voreinstellung) | etwa 3 GB | etwa 12 GB | 20 GB |
| **full** (`--edition full`) | etwa 8 GB | etwa 23 GB | 35 GB |

Beide enthalten alle Pakete von TeX Live und kompilieren dieselben Dokumente, und der KI-Agent funktioniert mit beiden. Der Edition standard fehlen die Handbücher der Pakete; die Edition full fügt Handbücher und Quellen hinzu, die der KI-Agent ebenfalls lesen kann.

`--edition` und `--lang` beantworten die Fragen oder ersetzen sie, wo es kein Terminal gibt. `--domain`, `--tailscale` und die Cloudflare-Optionen richten bei skriptgesteuerten Installationen den Fernzugriff gleich mit ein. Hängen Sie Optionen nach `bash -s --` an:

| Option | |
| --- | --- |
| `--domain tex.example.org` | HTTPS für einen Server mit eigener Domain, über das mitgelieferte Caddy. Lassen Sie die Domain auf den Server zeigen und öffnen Sie die Ports 80 und 443 |
| `--tailscale` | ColTex in Ihr Tailnet bringen: gibt einen Anmeldelink und einen QR-Code aus |
| `--cloudflare-token TOKEN` | Einen Cloudflare-Tunnel verbinden, den Sie für Ihre eigene Domain erstellt haben |
| `--cloudflare-quick` | Eine temporäre öffentliche `trycloudflare.com`-Adresse, zum Ausprobieren |
| `--edition full` | Die vollständige TeX-Live-Edition |
| `--lang LANG` | Die Sprache des Installationsprogramms, von `coltex` und der Einrichtungsseite: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` oder `id` (wird gefragt, wenn nicht angegeben) |
| `--port 3690` | Ein anderer Port |
| `--version v0.0.1` | Eine bestimmte Version (`main` für den Entwicklungszweig) |
| `--build` | Die Images auf diesem Rechner aus den Quellen bauen, statt sie herunterzuladen |
| `--images REGISTRY` | Woher die Images kommen: `aliyun` (dieselben Images bei Alibaba Cloud), `ghcr` (`ghcr.io/coltexeditor`) oder ein anderer Spiegel von ghcr.io. Ohne die Option nimmt der Installer den der beiden, der von hier aus schneller antwortet (die `registry-mirrors` von Docker gelten nur für Docker Hub, nicht für ghcr.io) |

Melden Sie sich auf einem aus dem Internet erreichbaren Server nicht über unverschlüsseltes `http://` an: Verwenden Sie `--domain`, Tailscale oder einen Cloudflare-Tunnel.

### Verwalten und aktualisieren

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
coltex reset           # delete all data and start again from the setup page (asks first)
coltex uninstall       # remove ColTex from this machine: containers, data, images, this folder (asks first)
```

<a id="configure"></a>
## Konfiguration

Alles wird im Browser eingestellt, unter **Einstellungen** im Benutzermenü:

1. **Benutzer verwalten** und **Einladungen**: Personen mit Links einladen (jeder funktioniert einmal, optional nur für eine E-Mail-Adresse).
2. **KI-Dienste**: einen Anbieter verbinden. Fügen Sie dann unter **KI-Nutzung & Zugriff** Personen einer Gruppe hinzu, die ihn verwenden darf. Ohne Gruppe erhält niemand außer dem Systemadministrator den KI-Agenten.
3. **Netzwerk**: die Adressen, unter denen ColTex erreichbar ist, sowie Tailscale und Cloudflare Tunnel.
4. **Speicher & Backups**: tägliche oder wöchentliche Backups in einen WebDAV-Ordner (Nextcloud, ein NAS…).

Die Hilfe ist eingebaut: **Hilfe** im Benutzermenü. Der Serverbetrieb (Umgebungsvariablen, S3, Wiederherstellen eines Backups) ist in [docs/operations.md](../docs/operations.md) (auf Englisch) beschrieben.

<a id="development"></a>
## Entwicklung

Node 24 oder neuer, pnpm 11 und Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Pfad | |
| --- | --- |
| `apps/web` | Die Web-App: React, CodeMirror 6, PDF.js |
| `apps/server` | Die API: Fastify, Konten, Projekte, Zusammenarbeit in Echtzeit, der KI-Agent |
| `services/compiler` | Der Kompilier-Worker in einem TeX-Live-Container |
| `packages/*` | Gemeinsame Schemas, der Log-Parser, LaTeX-Sprachunterstützung, Review-Daten und Vorlagenumwandlung |

Die Architektur ist in [docs/architecture.md](../docs/architecture.md) (auf Englisch) beschrieben.

<a id="acknowledgements"></a>
## Danksagungen

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex portiert dessen Log-Parser und Hinweise, LaTeX-Sprachunterstützung, visuellen Editor, Tabelleneditor, Rechtschreibprüfung und Wortzählung. Jede portierte Datei ist in [NOTICE](../NOTICE) aufgeführt.
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): die Modellanbieter und die Agentenschleife hinter dem KI-Agenten.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): die Statusüberwachung der Anbieter und die automatische Modellwahl sind davon übernommen und angepasst.
- [Yjs](https://github.com/yjs/yjs) und [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): Logos der Anbieter. Marken gehören ihren Inhabern und dienen nur zur Kennzeichnung des Dienstes.

<a id="license"></a>
## Lizenz

[AGPL-3.0](../LICENSE). Wenn Sie ein verändertes ColTex für andere über ein Netzwerk betreiben, müssen Sie ihnen dessen Quellcode anbieten. Code von Dritten behält seine eigene Lizenz; siehe [NOTICE](../NOTICE).
