<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Un editor LaTeX collaborativo self-hosted con un agente IA integrato.</strong><br>
  Il tuo server · I tuoi account · I tuoi dati · Collaborazione in tempo reale · Open source (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd><b>Italiano</b></kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Installazione</a> · <a href="#configure">Configurazione</a> · <a href="../CHANGELOG.md">Novità</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issue</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Ultima versione"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="L’editor di ColTex: i file, il sorgente LaTeX, il PDF compilato e l’agente IA" width="900">
</p>

<a id="why"></a>
## Perché ColTex?

ColTex è un’alternativa a Overleaf per un gruppo di ricerca, un laboratorio o anche solo per te, in esecuzione su un computer che controlli tu: un desktop in laboratorio, un server di casa o una macchina nel cloud.

- **Tutto resta sul tuo server.** Progetti, cronologia, account e compilazioni non ne escono mai. TeX gira in un container isolato senza accesso a internet.
- **Pensato per scrivere insieme.** Più persone modificano lo stesso file contemporaneamente, con commenti, revisioni, chat e cronologia delle versioni.
- **Un agente IA che lavora sul tuo progetto.** Legge i file e il log di compilazione, prepara le modifiche, le compila di prova e ti mostra un diff. Non viene scritto nulla finché non le applichi.
- **Un solo comando per installare, nessuna porta da aprire.** Tailscale e Cloudflare Tunnel sono integrati per l’accesso remoto.

<a id="features"></a>
## Funzionalità

### Scrivere e compilare
- Editor del codice (CodeMirror) ed editor visuale con l’editor di tabelle e la finestra delle figure di Overleaf, barra degli strumenti, tavolozza dei simboli, struttura e percorso di navigazione.
- Completamenti LaTeX, controllo del codice, anteprima delle equazioni, controllo ortografico in molte lingue, conteggio parole, ricerca e sostituzione in tutto il progetto, e tasti Vim o Emacs.
- Compila con latexmk su un TeX Live completo. Il motore (pdfLaTeX, XeLaTeX o LuaLaTeX) viene scelto in base al documento, cinese compreso (ctex, xeCJK).
- Anteprima PDF con SyncTeX in entrambe le direzioni, anche in una finestra separata. Gli errori di compilazione sono sottolineati nel sorgente, con suggerimenti in linguaggio semplice.
- Bibliografia: cita dai tuoi file `.bib`, cerca su Crossref e arXiv (o incolla un DOI o un ID arXiv) per aggiungere voci, oppure importa una libreria o una raccolta Zotero e tienila sincronizzata.

### Collaborazione
- Modifica in tempo reale con i cursori di tutti, commenti con @menzioni, rilevamento delle modifiche (accetta, rifiuta e annulla una decisione), chat del progetto e notifiche nell’app.
- Ruoli per progetto: proprietario, editor, revisore (solo suggerimenti) e visualizzatore.
- Cronologia delle versioni come in git: versioni automatiche, versioni salvate con un messaggio e annullamento delle modifiche di una singola versione.
- Accesso Git: clona un progetto, lavoraci in locale e fai push (token personali; le modifiche fatte nel frattempo nel browser vengono unite).

### Agente IA
- Chiedi di LaTeX, del tuo progetto o della tua scrittura, oppure fagli correggere gli errori di compilazione. Prepara le modifiche in una copia privata, le compila di prova e mostra un diff; tu le applichi in tutto o in parte.
- L’applicazione salva prima una versione e ricompila; se la compilazione peggiora, la modifica viene annullata automaticamente.
- Fornitori: chiavi API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter e altri), accesso tramite abbonamento (Claude Pro/Max, ChatGPT, GitHub Copilot e altri), o il tuo server compatibile con OpenAI (Ollama, vLLM, LM Studio).
- Scelta automatica del modello (un modello leggero o potente per ogni messaggio), accesso per gruppi di persone, utilizzo per persona e limiti di utilizzo al giorno, alla settimana o al mese.
- Chat salvate per progetto, la finestra di contesto sempre visibile e `/compact` per riassumere una chat lunga.
- Skill: istruzioni tue e del progetto (formato Agent Skills) che l’agente segue, da usare con `/name`; scrivile tu, importale o creale con l’IA nelle Impostazioni.
- Permessi come in Claude Code: le modifiche dell’agente IA aspettano la tua revisione (Manuale), si applicano quando ha finito (Automatico), oppure può anche eliminare e spostare file (Accesso completo).
- Il tuo agente (Claude Code, Codex, Cursor…) tramite MCP: un solo indirizzo per tutti i tuoi progetti, con gli stessi permessi (in Manuale le sue modifiche diventano tuoi suggerimenti).

### Progetti e amministrazione
- Modelli per IEEE, ACM, Springer LNCS, Elsevier, REVTeX e arXiv, e conversione di un articolo da un modello di rivista a un altro.
- Importazione ed esportazione di zip Overleaf, file collegati da un URL o da un altro progetto, tag, archivio e cestino.
- Nessuna registrazione pubblica: gli account nascono da link di invito. Un amministratore di sistema e amministratori che gestiscono ciascuno il team che hanno invitato.
- Monitoraggio, backup WebDAV (facoltativamente crittografati), archiviazione locale o compatibile S3, temi chiari e scuri, e un’interfaccia in 14 lingue (inglese, cinese, giapponese, coreano, spagnolo, francese, tedesco, portoghese, italiano, russo, turco, vietnamita e indonesiano).

<a id="install"></a>
## Installazione

Ti serve una macchina Linux o macOS con Docker (su Linux l’installer può configurarlo), almeno 2 core di CPU e 4 GB di memoria. Le immagini sono precompilate per x86-64 e ARM64.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Se il download si interrompe (`curl: (35) Recv failure: Connection reset by peer`, frequente quando GitHub è difficile da raggiungere), esegui di nuovo il comando.

Chiede la lingua e l’edizione di TeX Live (con i tasti freccia), scarica l’ultima release in `~/coltex`, scarica le immagini precompilate con una barra di avanzamento, avvia ColTex e stampa gli indirizzi da aprire. L’output completo va in `~/coltex/install.log`. Poi apri `http://<server>:3690` e crea l’account amministratore. L’accesso remoto tramite Tailscale o Cloudflare Tunnel si attiva in seguito in **Impostazioni → Rete**.

Il primo avvio scarica TeX Live. Scegli un’edizione:

| Edizione | Download | Disco (tutto ColTex) | Spazio libero necessario |
| --- | --- | --- | --- |
| **standard** (predefinita) | circa 3 GB | circa 12 GB | 20 GB |
| **full** (`--edition full`) | circa 8 GB | circa 23 GB | 35 GB |

Entrambe contengono tutti i pacchetti di TeX Live e compilano gli stessi documenti, e l’agente IA funziona con tutte e due. La standard non include i manuali dei pacchetti; la full aggiunge manuali e sorgenti, che l’agente IA può anche leggere.

`--edition` e `--lang` rispondono alle domande, o le sostituiscono dove non c’è un terminale. `--domain`, `--tailscale` e le opzioni Cloudflare configurano l’accesso remoto già durante l’installazione, per le installazioni da script. Aggiungi le opzioni dopo `bash -s --`:

| Opzione | |
| --- | --- |
| `--domain tex.example.org` | HTTPS per un server con un proprio dominio, tramite il Caddy incluso. Punta il dominio al server e apri le porte 80 e 443 |
| `--tailscale` | Mette ColTex sulla tua tailnet: stampa un link di accesso e un codice QR |
| `--cloudflare-token TOKEN` | Collega un tunnel Cloudflare che hai creato per il tuo dominio |
| `--cloudflare-quick` | Un indirizzo pubblico temporaneo `trycloudflare.com`, per provarlo |
| `--edition full` | L’edizione completa di TeX Live |
| `--lang LANG` | La lingua dell’installer, di `coltex` e della pagina di configurazione: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` o `id` (chiesta se non indicata) |
| `--port 3690` | Un’altra porta |
| `--version v0.0.1` | Una release specifica (`main` per il branch di sviluppo) |
| `--build` | Compila le immagini dai sorgenti su questa macchina invece di scaricarle |
| `--images REGISTRY` | Da dove scaricare le immagini: `aliyun` (le stesse immagini su Alibaba Cloud), `ghcr` (`ghcr.io/lewen-cai`) o un altro mirror di ghcr.io. Senza l’opzione, l’installer usa Alibaba Cloud nella Cina continentale e ghcr.io altrove (`registry-mirrors` di Docker vale solo per Docker Hub, non per ghcr.io) |

Su un server raggiungibile da internet, non accedere tramite `http://` in chiaro: usa `--domain`, Tailscale o un tunnel Cloudflare.

### Gestione e aggiornamento

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
## Configurazione

Tutto si imposta nel browser, in **Impostazioni** nel menu utente:

1. **Gestisci utenti** e **Inviti**: invita persone con dei link (ognuno funziona una sola volta, facoltativamente per una sola email).
2. **Servizi IA**: collega un fornitore. Poi, in **Utilizzo e accesso IA**, metti le persone in un gruppo che può usarlo. Senza un gruppo nessuno, tranne l’amministratore di sistema, ha l’agente IA.
3. **Rete**: gli indirizzi a cui ColTex è raggiungibile, e Tailscale e Cloudflare Tunnel.
4. **Archiviazione e backup**: backup giornalieri o settimanali in una cartella WebDAV (Nextcloud, un NAS…).

La documentazione è integrata: **Documentazione** nel menu utente. Le operazioni sul server (variabili d’ambiente, S3, ripristino di un backup) sono in [docs/operations.md](../docs/operations.md) (in inglese).

<a id="feedback"></a>
## Siamo agli inizi: apri pure delle issue

ColTex è giovane (0.0.x). Viene usato e testato ogni giorno, ma non tutto è ancora venuto a galla. Se qualcosa si rompe, sembra sbagliato o è difficile da usare, [apri una issue](https://github.com/Lewen-Cai/coltex/issues): ogni segnalazione aiuta.

Una segnalazione utile riporta la versione (`coltex version`), cosa hai fatto e cosa è successo e, se è coinvolto il server, le righe rilevanti di `coltex logs`. Non includere password, chiavi API né il contenuto di documenti privati.

<a id="development"></a>
## Sviluppo

Node 24 o successivo, pnpm 11 e Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Percorso | |
| --- | --- |
| `apps/web` | L’app web: React, CodeMirror 6, PDF.js |
| `apps/server` | L’API: Fastify, account, progetti, collaborazione in tempo reale, l’agente IA |
| `services/compiler` | Il worker di compilazione in un container TeX Live |
| `packages/*` | Schemi condivisi, il parser dei log, il supporto al linguaggio LaTeX, i dati di revisione e la conversione dei modelli |

L’architettura è descritta in [docs/architecture.md](../docs/architecture.md) (in inglese).

<a id="acknowledgements"></a>
## Ringraziamenti

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex ne riprende il parser dei log e i suggerimenti, il supporto al linguaggio LaTeX, l’editor visuale, l’editor di tabelle, il controllo ortografico e il conteggio parole. Ogni file ripreso è elencato in [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): i fornitori di modelli e il ciclo dell’agente dietro l’agente IA.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): il monitoraggio dello stato dei fornitori e la scelta automatica del modello sono adattati da qui.
- [Yjs](https://github.com/yjs/yjs) e [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): i loghi dei fornitori. I marchi appartengono ai rispettivi proprietari e servono solo a identificare il servizio.

<a id="license"></a>
## Licenza

[AGPL-3.0](../LICENSE). Se offri ad altre persone, tramite una rete, una versione modificata di ColTex, devi mettere a loro disposizione il codice sorgente. Il codice di terze parti mantiene la propria licenza; vedi [NOTICE](../NOTICE).
