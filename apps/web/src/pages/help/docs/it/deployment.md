# Installazione e rete

In produzione ColTex usa una sola porta (3690 per impostazione predefinita): pagine, API, collaborazione in tempo reale (WebSocket) e notifiche passano tutte da lì. Funziona tutto ciò che inoltra HTTP e WebSocket: questo computer, una LAN, Tailscale, Cloudflare Tunnel o un server cloud. (3000 e 5173 sono le porte del server di sviluppo.)

## Installazione

Su Linux o macOS con Docker, un solo comando:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Se il download si interrompe (`curl: (35) Recv failure: Connection reset by peer`, frequente quando GitHub è difficile da raggiungere), esegui di nuovo il comando.

Chiede la lingua e l’edizione di TeX Live (con i tasti freccia; `--edition` e `--lang` rispondono al posto tuo), controlla Docker (su Linux può installarlo), scarica ColTex in `~/coltex`, scrive le impostazioni, scarica le immagini precompilate (x86-64 e ARM64) e lo avvia, poi stampa gli indirizzi da aprire su questa macchina e nella tua rete. Il primo avvio scarica TeX Live. Ci sono due edizioni:

| Edizione | Download | Su disco (tutto ColTex) | Spazio libero necessario |
| --- | --- | --- | --- |
| **standard** (predefinita) | circa 3 GB | circa 12 GB | 20 GB |
| **full** (`--edition full`) | circa 8 GB | circa 23 GB | 35 GB |

Entrambe hanno TeX Live completo e compilano allo stesso modo, e l’agente IA funziona con tutte e due. La standard non include i manuali e i sorgenti dei pacchetti; la full li aggiunge, e l’agente IA può anche leggere i manuali. Con quella standard risponde in base ai file dei pacchetti e alle proprie conoscenze. Puoi cambiare in seguito con `coltex edition full` o `coltex edition standard`.

L’accesso remoto (Tailscale, Cloudflare Tunnel) si attiva dopo l’installazione, in **Impostazioni → Rete** (vedi sotto). Nelle installazioni da script, alcune opzioni possono anche configurarlo durante l’installazione:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Poi gestiscilo con `coltex`:

| Comando | Cosa fa |
| --- | --- |
| `coltex status` / `logs` | Stato / log |
| `coltex edition [standard\|full]` | Mostra o cambia l’edizione di TeX Live (scarica l’altra immagine del compilatore) |
| `coltex update` | Aggiorna all’ultima release (scarica le nuove immagini); dati e impostazioni restano |
| `coltex stop` / `start` | Arresta / avvia |
| `coltex tailscale up` | Entra nella tua tailnet (stampa un link di accesso e un codice QR) |
| `coltex cloudflare quick` | Un indirizzo pubblico Cloudflare temporaneo |
| `coltex cloudflare token` | Un tunnel Cloudflare con il tuo dominio (chiede il token) |
| `coltex reset` | Elimina tutto (account, progetti, il database) e riparte dalla pagina di configurazione; prima ti chiede di digitare `reset` |
| `coltex uninstall` | Rimuove ColTex da questa macchina: container, database, dati, immagini, il comando `coltex` e la sua cartella (Docker resta); prima ti chiede di digitare `uninstall` |

## Accedere da qualsiasi indirizzo

Il server accetta gli accessi fatti al proprio indirizzo: aprilo su `localhost`, un IP della LAN, un indirizzo Tailscale o un dominio, senza doverli elencare prima. Una pagina di un altro sito non può far accedere nessuno.

## Quali indirizzi usano i link

I link di invito e gli indirizzi di clonazione Git vengono proposti una volta per ogni indirizzo a cui ColTex è raggiungibile, ciascuno con il proprio pulsante di copia, così scegli quello che il destinatario può aprire:

- **LAN** o **Tailscale**: l’indirizzo a cui hai aperto ColTex (riconosciuto dal suo indirizzo);
- **Tailscale**, **Cloudflare**: gli indirizzi di Tailscale o di Cloudflare Tunnel integrati mentre sono connessi. Compaiono e scompaiono con loro; non c’è niente da cambiare quando uno viene disattivato;
- **Indirizzo pubblico**: il `COLTEX_URL` del server, se impostato.

I link di un invito in sospeso restano nell’elenco degli inviti finché non viene usato o non scade.

## Tailscale

ColTex ha Tailscale integrato: può entrare nella tua tailnet come dispositivo a sé (chiamato `coltex` per impostazione predefinita). Non serve installare nulla sul server, e funziona anche su server senza desktop.

1. In **Impostazioni → Rete**, attiva Tailscale.
2. Scansiona il codice QR con un telefono, o apri il link su un qualsiasi dispositivo, e accedi alla tua tailnet. La pagina passa da sola a Collegato.
3. Attiva **Rendi disponibile ColTex sulla tailnet**. Con MagicDNS e HTTPS abilitati per la tailnet l’indirizzo è `https://coltex.<your tailnet>.ts.net`, altrimenti `http://coltex.<your tailnet>.ts.net`.

Quando nessun browser può ancora raggiungere la pagina delle impostazioni, esegui questo sul server:

```sh
coltex tailscale up
```

Attiva Tailscale, stampa nel terminale il link di accesso e un codice QR, attende l’accesso, poi rende disponibile ColTex sulla tailnet. `coltex tailscale status` mostra lo stato, `coltex tailscale down` esce dalla tailnet, `coltex tailscale off` lo disattiva.

`TS_HOSTNAME` cambia il nome del dispositivo. Il server esegue Tailscale da sé: nessun container o privilegio aggiuntivo. Le chiavi del dispositivo sono conservate in `data/tailscale` e non sono nei backup; dopo un ripristino, accedi di nuovo.

Se sul server gira già Tailscale per conto suo, i due non si intralciano: quello integrato è un dispositivo a sé e usa la rete in userspace, quindi non modifica nessuna impostazione di rete del server. Del resto non ti serve: apri ColTex all’IP Tailscale o al nome MagicDNS del server con `:3690`.

## Cloudflare Tunnel

ColTex ha integrato anche Cloudflare Tunnel, solo come tunnel: le persone accedono comunque con i loro account ColTex; non serve Cloudflare Access. Il server non ha bisogno di porte aperte.

- **Tunnel rapido**: nessun account Cloudflare; ottieni `https://<random>.trycloudflare.com`, che cambia a ogni avvio. Per fare delle prove.
- **Il mio dominio**: con il tuo dominio su Cloudflare, crea un tunnel in Zero Trust → Networks → Tunnels, copia il comando sotto “Run the following command” (per qualsiasi sistema: Windows, macOS, Debian, Red Hat o Docker); ColTex ne estrae il token; aggiungi al tunnel un hostname pubblico (ad es. `tex.example.org`) con il servizio `http://localhost:3690`.

Attivalo con l’interruttore della scheda Cloudflare Tunnel in **Impostazioni → Rete**, poi scegli un link temporaneo o un tunnel (quello salvato, o uno nuovo dal comando incollato), oppure in un terminale con `coltex cloudflare quick` / `coltex cloudflare token`. Una volta connesso, i suoi indirizzi compaiono da soli nei link di invito. Il token viene conservato crittografato e non viene più mostrato.

Se il tunnel non riesce a raggiungere Cloudflare tramite QUIC (un firewall, o un proxy che scarta UDP), ColTex lo passa da solo a HTTP/2. Quando trycloudflare.com limita i link temporanei (429 Too Many Requests), ColTex riprova sempre meno spesso. Quando cambi tunnel, sposta i suoi hostname pubblici sul nuovo tunnel nella dashboard di Cloudflare; fino ad allora rispondono con Error 1033.

Se sul server gira già cloudflared per un tunnel suo, i due non vanno in conflitto, ma non dare a ColTex il token di quel tunnel: Cloudflare tratterebbe entrambi come connettori dello stesso tunnel e dividerebbe le richieste tra loro, quindi gli altri hostname del server a volte arriverebbero a ColTex e fallirebbero (502). Aggiungi invece a quel tunnel un hostname pubblico per ColTex (servizio `http://localhost:3690`) e lascia disattivato quello integrato, oppure crea un tunnel separato per ColTex.

## Impostazioni del server

Sono variabili d’ambiente del server. Con Docker, mettile nel file `.env` accanto a `docker-compose.yml` ed esegui `docker compose up -d`.

| Variabile | Cosa fa |
| --- | --- |
| `COLTEX_PORT` | La porta, 3690 per impostazione predefinita |
| `COLTEX_URL` | Un indirizzo pubblico proposto in ogni link, ad es. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Altri indirizzi accettati per l’accesso, separati da virgole. Serve solo quando pagine e API sono a indirizzi diversi |
| `TRUST_PROXY` | Con un reverse proxy davanti (Caddy, Nginx): `uniquelocal` (proxy su una rete privata) o `true`. Se non è impostato, il server scambia il proxy per il visitatore: tutti condividono un unico indirizzo, quindi i tentativi di accesso falliti di una persona contano contro tutti, e i registri degli accessi mostrano l’indirizzo del proxy. Tailscale e Cloudflare Tunnel integrati non richiedono nulla qui |
| `TS_HOSTNAME` | Il nome del dispositivo del Tailscale integrato, `coltex` per impostazione predefinita |

**Come arrivano le richieste** in fondo a **Impostazioni → Rete** mostra queste impostazioni e l’IP visto dal server, e segnala i problemi.

## Configurazioni comuni

| Configurazione | Come |
| --- | --- |
| Solo questo computer | I valori predefiniti: `http://localhost:3690` |
| LAN | Aprilo all’indirizzo LAN del server, ad es. `http://192.168.1.20:3690`. Gli indirizzi LAN possono cambiare; per un uso a lungo termine riservane uno nel router |
| Tailscale | Vedi Tailscale sopra |
| Cloudflare Tunnel | Vedi Cloudflare Tunnel sopra |
| Server cloud | Con un dominio: installa con `--domain tex.example.org` (punta il suo DNS al server e apri le porte 80 e 443). Il Caddy incluso ottiene il certificato HTTPS; la porta 3690 risponde poi solo sul server stesso. Senza dominio: Cloudflare Tunnel o Tailscale |

## Sicurezza

- Per un piccolo gruppo, raggiungere ColTex solo tramite Tailscale o una VPN è la soluzione più semplice: non è affatto visibile su internet. Con Cloudflare Tunnel è pubblico, protetto dall’accesso di ColTex.
- Su internet, usa HTTPS (Caddy, come nella configurazione cloud).
- Un firewall sul server (ufw, firewalld) non chiude le porte pubblicate da Docker. Con `--domain`, la porta 3690 risponde solo sul server stesso; se invece usi Tailscale o un tunnel Cloudflare, chiudi la 3690 nel firewall del tuo provider cloud.
- Non c’è registrazione pubblica, solo inviti; le password hanno regole di robustezza; ognuno può attivare la verifica in due passaggi. Gli accessi falliti rallentano e poi bloccano un account per gli indirizzi non abituali, e un indirizzo che continua a fallire viene bloccato per un giorno (vedi [Amministrazione](#/help/admin)).
- Le pagine di ColTex dicono ai browser di non mostrarlo dentro altri siti (contro il clickjacking) e di eseguire solo i suoi script; con `--domain`, Caddy dice loro anche di usare solo HTTPS (HSTS).
- Una porta insolita non ferma gli scanner; non farci affidamento.
