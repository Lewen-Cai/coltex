# Agente IA

**IA** nella barra a sinistra apre l’agente IA. È disponibile quando un amministratore ha collegato un servizio di modelli e ti ha aggiunto a un gruppo IA; il gruppo decide quali modelli puoi usare.

## Cosa fa

- Risponde a domande su LaTeX e spiega il codice selezionato.
- Spiega o corregge gli errori di compilazione (anche il log ha un pulsante “Correggi con l’IA”).
- Riscrive, rifinisce o traduce la selezione.
- Dà una panoramica del progetto, trova le etichette mai citate, e così via.
- Guarda pagine del PDF per controllare l’impaginazione, come figure e tabelle nelle loro colonne o equazioni che escono (con i modelli che vedono le immagini).

Il file aperto, la selezione e gli errori di compilazione recenti vengono allegati al tuo messaggio; fai clic su un allegato per escluderlo.

## Permessi

Cosa può modificare l’agente IA lo decidi tu: scegli in **Impostazioni → Agente IA** o nel selettore del modello in fondo al pannello (sotto il livello di ragionamento); la riga sotto la casella dei messaggi lo mostra. La stessa scelta vale per i tuoi agenti collegati tramite MCP (vedi sotto).

- **Manuale** (il valore predefinito): le modifiche dell’agente IA vanno in una bozza, e nulla cambia finché non la applichi.
  1. Quando ha finito, la bozza viene compilata di prova e ti viene detto se aggiunge errori.
  2. **Rivedi le modifiche** mostra il diff per file; puoi applicarne solo una parte.
  3. **Applica** scrive le modifiche nel progetto e compila; se la compilazione peggiora, vengono annullate. Prima di applicare viene salvata una versione.
  4. Dopo l’applicazione, **Annulla** ripristina le modifiche e mantiene quelle fatte da altre persone nel frattempo.
- **Automatico**: la bozza viene applicata appena l’agente IA finisce la risposta, con le stesse garanzie: prima viene salvata una versione, il progetto viene compilato, una compilazione peggiore viene annullata e dopo c’è **Annulla**. Se qualcuno ha modificato le stesse righe nel frattempo, non viene applicato nulla e la bozza ti aspetta. Quando interrompi l’agente IA, anche la sua bozza ti aspetta.
- **Accesso completo**: come Automatico, e in più l’agente IA può eliminare, spostare e rinominare file. Queste operazioni avvengono subito, non nella bozza; prima della prima di ogni risposta viene salvata una versione. La risposta le elenca insieme ai file modificati.

Visualizzatori e revisori possono fare domande all’agente IA, ma per loro non può modificare nulla.

## Il web

Una volta configurata la ricerca web, l’agente IA può cercare sul web e leggere pagine: le norme per gli autori aggiornate di una rivista, le note di rilascio di un pacchetto, una fonte per verificare un’affermazione. I modelli di Anthropic, OpenAI e ChatGPT usano la propria ricerca integrata; gli altri modelli il servizio di ricerca collegato dall’amministratore. Le sue ricerche e le pagine lette compaiono come passaggi nella conversazione, e indica da quali pagine viene una risposta.

Perché nulla del tuo progetto esca per questa via:
- Le ricerche vanno solo al servizio di ricerca scelto dall’amministratore (o alla ricerca del modello stesso) e sono lunghe al massimo 128 caratteri.
- Legge solo indirizzi che hai scritto nella conversazione o che le sue ricerche hanno restituito, esattamente così; non può inventarsi un indirizzo.
- Legge soltanto: non carica né invia nulla.

Le pagine web le scrive chiunque e possono contenere istruzioni fatte per ingannare l’agente IA. Perciò, finché hai il web, le modifiche dell’agente IA attendono sempre la tua revisione, anche con **Automatico** o **Accesso completo**, e non elimina né sposta file. I tuoi strumenti IA (MCP) mantengono il tuo permesso.

## Modelli e ragionamento

- Scegli il modello in fondo al pannello. Con **Automatico**, ColTex sceglie un modello leggero o potente a seconda della domanda.
- Per i modelli che sanno ragionare, il livello si imposta nello stesso selettore; la riga sotto la casella dei messaggi lo mostra.

## Chat e contesto

- Le conversazioni vengono salvate per te, per progetto (gli altri non le vedono mai). **Nuova chat** ne inizia un’altra; **Chat** elenca quelle precedenti: aprile, rinominale o eliminale. Riaprendo una chat la riprendi da dove si era fermata; una bozza non applicata non viene conservata, quindi prima di lasciarla ti viene chiesta conferma.
- L’anello sotto la casella dei messaggi mostra quanta parte della finestra di contesto del modello usa la chat (ad es. `12k / 200k`). Diventa ambra al 70% e rosso al 90%.
- Se il tuo gruppo IA ha un limite di utilizzo, una barra accanto mostra quanto hai usato oggi, questa settimana o questo mese (passaci sopra con il mouse per i dettagli). Una volta raggiunto, i messaggi aspettano il periodo successivo. **Impostazioni → Agente IA** mostra il tuo utilizzo negli ultimi 30 giorni e quanto resta.
- Scrivi `/` nella casella dei messaggi per i comandi:
  - `/compact`: riassume la chat fin qui e prosegue dal riassunto, liberando il contesto. I messaggi restano visibili; l’agente IA li ricorda tramite il riassunto.
  - `/new`: inizia una nuova chat.
  - `/chats`: le chat precedenti.
- La casella del messaggio cresce con il testo. Trascina il bordo superiore per renderla più alta (resta così in questo browser, anche nella chat del progetto); fai doppio clic sul bordo per tornare com’era.

## Skill

Una skill è un insieme di istruzioni per un compito che fai di continuo, per esempio “accorcia un abstract al limite della rivista” o “controlla che ogni figura sia citata”. Le skill usano il formato Agent Skills (un `SKILL.md` con un nome, una descrizione e le istruzioni), quindi funzionano qui anche le skill scritte per altri agenti IA.

- **Le tue skill** sono in **Impostazioni → Skill IA**; le vedi solo tu e puoi usarle in ogni progetto.
- Per aggiungere skill che hai già, usa **Importa**: **Carica file** accetta un `SKILL.md` con i suoi file di riferimento, o uno `.zip` di cartelle di skill; **Carica cartella** accetta la cartella di una skill, o una cartella che ne contiene diverse. Gli script in una skill vengono conservati come testo che l’agente IA può leggere; niente in una skill viene mai eseguito.
- Per usarne una, scrivi `/` e sceglila, poi aggiungi il tuo messaggio (`/polish-abstract keep it under 200 words`). L’agente IA legge anche le descrizioni e carica da solo una skill quando la tua richiesta corrisponde.
- Chiedi all’agente IA di trasformare qualcosa in una skill (“salva come skill il modo in cui abbiamo appena sistemato la bibliografia”): ne abbozza una nella chat, e tu la modifichi o la salvi tra le tue skill.
- In **Impostazioni → Skill IA**, le tue skill sono elencate a sinistra; scegline una per leggerne le istruzioni e i file di riferimento, oppure **Crea con l’IA** per aprire una chat con l’agente IA dedicata alla scrittura di skill (**Migliora in chat** su una delle tue skill inizia un messaggio su di essa). La chat segue la skill integrata **skill-creator**: ti chiede come useresti la skill, la abbozza (con file di riferimento quando servono) e può provare una bozza su un testo che incolli. Le bozze vengono salvate solo quando le salvi tu; salvarne una con un nome che usi già chiede conferma prima di sostituirla. La chat resta finché non ne inizi una nuova.
- ColTex include delle skill integrate (elencate in **Integrate**). Puoi leggerle e scaricarle ma non modificarle; una tua skill con lo stesso nome viene usata al loro posto.
  - **skill-creator**: scrivere skill (la chat delle skill la segue).
  - **template-conversion**: completare una conversione di modello: chiede la rivista o la conferenza, cerca le norme per gli autori e adegua l’articolo (**Apri e correggi con l’IA** dopo una conversione lo avvia).

## I tuoi strumenti IA (MCP)

Strumenti IA come Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline o OpenCode possono lavorare direttamente sui tuoi progetti: elencarli, leggerne e cercarne i file, modificarli, compilare e leggere il log, vedere la cronologia, e leggere, aggiungere e rispondere ai commenti. ColTex è per loro un server MCP, con un unico indirizzo per tutti i tuoi progetti; lo strumento indica il progetto su cui lavora.

In **Impostazioni → Agente IA**, in **I tuoi strumenti IA (MCP)**, scegli il tuo strumento a sinistra e segui i tre passaggi: l’indirizzo, un token (**Crea token**; viene mostrato una sola volta) e la configurazione da copiare, con entrambi già inseriti. Funziona anche qualsiasi altro strumento che si collega a server MCP via HTTP con un’intestazione per il token (**Altro**). Le app che accettano solo server con accesso tramite OAuth (come i connettori personalizzati di Claude o di ChatGPT) non possono ancora collegarsi.

Cosa possono modificare i tuoi strumenti segue il tuo permesso in **Impostazioni → Agente IA**:

- **Manuale** (il valore predefinito): le loro modifiche diventano tuoi suggerimenti, che tu e i tuoi collaboratori accettate o rifiutate in **Revisione**. I nuovi file vengono creati direttamente.
- **Automatico**: le loro modifiche vengono applicate direttamente, come se fossero tue. Se il rilevamento delle modifiche è attivo per te, sono comunque suggerimenti.
- **Accesso completo**: come Automatico, e in più possono eliminare, spostare e rinominare file.

Prima della prima modifica di uno strumento dopo un po’ di tempo, lo stato del progetto viene salvato come versione, così puoi tornare indietro. Gli strumenti dei revisori possono solo suggerire modifiche, quelli dei visualizzatori possono solo leggere e commentare.

### Sicurezza

- Chiunque abbia il tuo token agisce come te: custodiscilo come una password e revocalo nell’elenco dei token quando non ti serve più (un token per strumento o per computer lo rende facile). Quando crei un token, dagli solo ciò che gli serve:
  - **Usato per**: Git, MCP o entrambi. Un token creato solo per MCP non può fare clone o push, e viceversa.
  - **Accesso**: **Sola lettura** consente a uno strumento di elencare, leggere, cercare e compilare, ma non di modificare file o commenti (e consente a git clone e pull, non push), qualunque sia il tuo permesso.
  - **Progetti**: tutti i tuoi progetti, o solo quelli che scegli; gli altri per il token non esistono.
  - **Scadenza**: dopo 30 giorni, 90 giorni, un anno, o mai. Un token scaduto smette di funzionare; revocalo e creane uno nuovo.
- ColTex risponde solo al tuo strumento; non si collega mai ad altri server MCP. Cos’altro può fare il tuo strumento (un browser tramite Playwright MCP, un terminale, altri servizi) dipende dallo strumento e dalle sue impostazioni. Il testo, i commenti e i log di un progetto possono essere scritti dai tuoi collaboratori, quindi a uno strumento che li legge potrebbe essere chiesto, in quel testo, di fare qualcosa con le sue altre capacità. ColTex dice agli strumenti di trattare il contenuto del progetto come contenuto, non come istruzioni, ma solo il tuo strumento può farlo rispettare: lascia attive le sue conferme per le azioni fuori da ColTex e usa **Manuale** quando uno strumento ha anche un browser o un terminale.
- Uno strumento con un browser in cui è stato effettuato l’accesso a ColTex agisce con tutti i tuoi diritti attraverso le pagine web, non tramite MCP, quindi lì il permesso indicato sopra non lo limita. Fai usare a questi strumenti un profilo del browser in cui non è stato effettuato l’accesso.
