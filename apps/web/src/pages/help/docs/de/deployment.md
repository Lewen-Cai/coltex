# Bereitstellung und Netzwerk

Im Produktivbetrieb verwendet ColTex einen einzigen Port (standardmäßig 3690): Seiten, die API, die Live-Zusammenarbeit (WebSocket) und Benachrichtigungen laufen alle darüber. Alles, was HTTP und WebSocket weiterleitet, funktioniert: dieser Computer, ein LAN, Tailscale, Cloudflare Tunnel oder ein Cloud-Server. (3000 und 5173 sind die Ports des Entwicklungsservers.)

## Installation

Unter Linux oder macOS mit Docker genügt ein Befehl:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Er fragt nach der Sprache, der Edition und danach, wie Personen ColTex erreichen sollen (mit den Pfeiltasten; Optionen wie `--edition`, `--domain` oder `--lang` beantworten diese Fragen stattdessen), prüft Docker (unter Linux kann er es installieren), holt ColTex nach `~/coltex`, schreibt die Einstellungen, lädt die vorgefertigten Images (x86-64 und ARM64) herunter, startet ColTex und gibt die Adressen aus, die Sie auf diesem Rechner und in Ihrem Netzwerk öffnen können. Beim ersten Start wird TeX Live heruntergeladen. Es gibt zwei Editionen:

| Edition | Download | Auf der Festplatte (ColTex gesamt) | Benötigter freier Speicher |
| --- | --- | --- | --- |
| **standard** (Voreinstellung) | etwa 3 GB | etwa 12 GB | 20 GB |
| **full** (`--edition full`) | etwa 8 GB | etwa 23 GB | 35 GB |

Beide kompilieren gleich (das vollständige TeX Live). Die Edition full fügt die Handbücher und Quellen der Pakete hinzu, die der KI-Agent dann lesen kann; mit der Edition standard antwortet er anhand der Paketdateien und seines eigenen Wissens. Später wechseln Sie mit `coltex edition full` oder `coltex edition standard`.

Der Fernzugriff lässt sich gleich mit einschalten:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Danach verwalten Sie es mit `coltex`:

| Befehl | Was er tut |
| --- | --- |
| `coltex status` / `logs` | Zustand / Protokolle |
| `coltex edition [standard\|full]` | Die TeX-Live-Edition anzeigen oder wechseln (lädt das andere Compiler-Image herunter) |
| `coltex update` | Auf die neueste Version aktualisieren (lädt die neuen Images herunter); Daten und Einstellungen bleiben erhalten |
| `coltex stop` / `start` | Stoppen / starten |
| `coltex tailscale up` | Ihrem Tailnet beitreten (gibt einen Anmeldelink und einen QR-Code aus) |
| `coltex cloudflare quick` | Eine temporäre öffentliche Cloudflare-Adresse |
| `coltex cloudflare token` | Ein Cloudflare-Tunnel mit Ihrer eigenen Domain (fragt nach dem Token) |
| `coltex reset` | Alles löschen (Konten, Projekte, die Datenbank) und auf der Einrichtungsseite neu beginnen; fragt vorher nach, Sie müssen `reset` eintippen |
| `coltex uninstall` | ColTex von diesem Rechner entfernen: Container, Datenbank, Daten, Images, den Befehl `coltex` und seinen Ordner (Docker bleibt); fragt vorher nach, Sie müssen `uninstall` eintippen |

## Anmelden von jeder Adresse

Der Server akzeptiert Anmeldungen, die an seine eigene Adresse gerichtet sind: Öffnen Sie ihn unter `localhost`, einer LAN-IP, einer Tailscale-Adresse oder einer Domain, ohne eine davon vorher eintragen zu müssen. Eine Seite auf einer anderen Website kann niemanden anmelden.

## Welche Adressen Links verwenden

Einladungslinks und Git-Klon-Adressen werden für jede Adresse angeboten, unter der ColTex erreichbar ist, jeweils mit eigener Kopierschaltfläche, sodass Sie die wählen, die der Empfänger öffnen kann:

- **LAN** oder **Tailscale**: die Adresse, unter der Sie ColTex geöffnet haben (an der Adresse erkannt);
- **Tailscale**, **Cloudflare**: die Adressen des integrierten Tailscale bzw. Cloudflare Tunnel, solange sie verbunden sind. Sie erscheinen und verschwinden mit ihnen; wird eines ausgeschaltet, muss nichts geändert werden;
- **Öffentliche Adresse**: die `COLTEX_URL` des Servers, falls gesetzt.

Die Links einer ausstehenden Einladung bleiben in der Einladungsliste, bis sie verwendet wird oder abläuft.

## Tailscale

ColTex hat Tailscale eingebaut: Es kann Ihrem Tailnet als eigenes Gerät beitreten (standardmäßig mit dem Namen `coltex`). Auf dem Server muss nichts installiert werden, und es funktioniert auch auf Servern ohne Desktop.

1. Schalten Sie unter **Einstellungen → Netzwerk** Tailscale ein.
2. Scannen Sie den QR-Code mit einem Smartphone oder öffnen Sie den Link auf einem beliebigen Gerät und melden Sie sich bei Ihrem Tailnet an. Die Seite wechselt von selbst zu Verbunden.
3. Schalten Sie **ColTex im Tailnet bereitstellen** ein. Mit MagicDNS und HTTPS im Tailnet lautet die Adresse `https://coltex.<your tailnet>.ts.net`, sonst `http://coltex.<your tailnet>.ts.net`.

Wenn noch kein Browser die Einstellungsseite erreichen kann, führen Sie dies auf dem Server aus:

```sh
coltex tailscale up
```

Der Befehl schaltet Tailscale ein, gibt den Anmeldelink und einen QR-Code im Terminal aus, wartet auf die Anmeldung und stellt ColTex dann im Tailnet bereit. `coltex tailscale status` zeigt den Zustand, `coltex tailscale down` verlässt das Tailnet, `coltex tailscale off` schaltet es aus.

`TS_HOSTNAME` ändert den Gerätenamen. Der Server betreibt Tailscale selbst: kein zusätzlicher Container, keine zusätzlichen Rechte. Seine Geräteschlüssel liegen in `data/tailscale` und sind nicht in Backups enthalten; melden Sie sich nach einer Wiederherstellung erneut an.

Läuft auf dem Server bereits Tailscale, kommen sich die beiden nicht in die Quere: Das integrierte ist ein eigenes Gerät und verwendet Userspace-Networking, ändert also keine Netzwerkeinstellungen des Servers. Sie brauchen es aber auch nicht: Öffnen Sie ColTex unter der Tailscale-IP oder dem MagicDNS-Namen des Servers mit `:3690`.

## Cloudflare Tunnel

ColTex hat auch Cloudflare Tunnel eingebaut, nur als Tunnel: Personen melden sich weiterhin mit ihren ColTex-Konten an; Cloudflare Access wird nicht benötigt. Der Server braucht keinen offenen Port.

- **Schneller Tunnel**: ohne Cloudflare-Konto; Sie erhalten `https://<random>.trycloudflare.com`, das sich bei jedem Start ändert. Zum Ausprobieren.
- **Eigene Domain**: Mit Ihrer Domain bei Cloudflare erstellen Sie unter Zero Trust → Networks → Tunnels einen Tunnel, kopieren den Befehl unter „Run the following command“ (für ein beliebiges System: Windows, macOS, Debian, Red Hat oder Docker) – ColTex entnimmt ihm das Token – und fügen dem Tunnel einen öffentlichen Hostnamen hinzu (z. B. `tex.example.org`) mit dem Dienst `http://localhost:3690`.

Schalten Sie ihn mit dem Schalter der Karte Cloudflare Tunnel unter **Einstellungen → Netzwerk** ein und wählen Sie dann einen temporären Link oder einen Tunnel (den gespeicherten oder einen neuen aus dem eingefügten Befehl), oder im Terminal mit `coltex cloudflare quick` / `coltex cloudflare token`. Sobald er verbunden ist, erscheinen seine Adressen von selbst in Einladungslinks. Das Token wird verschlüsselt gespeichert und nie wieder angezeigt.

Kann der Tunnel Cloudflare nicht über QUIC erreichen (eine Firewall oder ein Proxy, der UDP verwirft), stellt ColTex ihn von selbst auf HTTP/2 um. Wenn trycloudflare.com temporäre Links begrenzt (429 Too Many Requests), fragt ColTex immer seltener erneut an. Wenn Sie den Tunnel wechseln, verschieben Sie seine öffentlichen Hostnamen im Cloudflare-Dashboard auf den neuen Tunnel; bis dahin antworten sie mit Error 1033.

Betreibt der Server bereits cloudflared für einen eigenen Tunnel, kollidieren die beiden nicht, aber geben Sie ColTex nicht das Token dieses Tunnels: Cloudflare würde beide als Connectoren desselben Tunnels behandeln und die Anfragen zwischen ihnen aufteilen, sodass die anderen Hostnamen des Servers manchmal bei ColTex landen und fehlschlagen würden (502). Fügen Sie entweder diesem Tunnel einen öffentlichen Hostnamen für ColTex hinzu (Dienst `http://localhost:3690`) und lassen Sie den integrierten ausgeschaltet, oder erstellen Sie einen separaten Tunnel für ColTex.

## Servereinstellungen

Dies sind Umgebungsvariablen des Servers. Mit Docker tragen Sie sie in die Datei `.env` neben `docker-compose.yml` ein und führen `docker compose up -d` aus.

| Variable | Was sie tut |
| --- | --- |
| `COLTEX_PORT` | Der Port, standardmäßig 3690 |
| `COLTEX_URL` | Eine öffentliche Adresse, die in jedem Link angeboten wird, z. B. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Weitere Adressen, die die Anmeldung akzeptiert, durch Kommas getrennt. Nur nötig, wenn Seiten und API unter verschiedenen Adressen liegen |
| `TRUST_PROXY` | Mit einem vorgeschalteten Reverse Proxy (Caddy, Nginx): `uniquelocal` (Proxy in einem privaten Netzwerk) oder `true`. Ist sie nicht gesetzt, hält der Server den Proxy für den Besucher, und alle teilen sich ein Anmeldelimit |
| `TS_HOSTNAME` | Der Gerätename des integrierten Tailscale, standardmäßig `coltex` |

**Wie Anfragen ankommen** unten unter **Einstellungen → Netzwerk** zeigt diese Einstellungen und die IP, die der Server sieht, und weist auf Probleme hin.

## Typische Konfigurationen

| Konfiguration | Vorgehen |
| --- | --- |
| Nur dieser Computer | Die Voreinstellungen: `http://localhost:3690` |
| LAN | Öffnen Sie ColTex unter der LAN-Adresse des Servers, z. B. `http://192.168.1.20:3690`. LAN-Adressen können sich ändern; reservieren Sie für die dauerhafte Nutzung eine im Router |
| Tailscale | Siehe Tailscale oben |
| Cloudflare Tunnel | Siehe Cloudflare Tunnel oben |
| Cloud-Server | Mit Domain: Installieren Sie mit `--domain tex.example.org` (lassen Sie ihren DNS-Eintrag auf den Server zeigen und öffnen Sie die Ports 80 und 443). Das mitgelieferte Caddy holt das HTTPS-Zertifikat; Port 3690 antwortet dann nur noch auf dem Server selbst. Ohne Domain: Cloudflare Tunnel oder Tailscale |

## Sicherheit

- Für eine kleine Gruppe ist es am einfachsten, ColTex nur über Tailscale oder ein VPN zu erreichen: Dann ist es im Internet gar nicht sichtbar. Mit Cloudflare Tunnel ist es öffentlich, geschützt durch die Anmeldung von ColTex.
- Verwenden Sie im Internet HTTPS (Caddy, wie bei der Cloud-Konfiguration).
- Eine Firewall auf dem Server (ufw, firewalld) schließt keine Ports, die Docker veröffentlicht. Mit `--domain` antwortet Port 3690 nur auf dem Server selbst; verwenden Sie stattdessen Tailscale oder einen Cloudflare-Tunnel, schließen Sie 3690 in der Firewall Ihres Cloud-Anbieters.
- Es gibt keine öffentliche Registrierung, nur Einladungen; Passwörter unterliegen Stärkeregeln; die Anmeldung erlaubt 3 Versuche pro 10 Sekunden und IP.
- Ein ungewöhnlicher Port hält Scanner nicht auf; verlassen Sie sich nicht darauf.
