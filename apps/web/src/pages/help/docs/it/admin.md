# Amministrazione

L’amministratore di sistema vede le pagine di Amministrazione in **Impostazioni** nel menu dell’avatar; gli amministratori vi trovano **Gestisci utenti** e **Inviti**, per il proprio team.

## Utenti e inviti

- Non c’è registrazione pubblica: gli account nascono solo da link di invito, e i progetti si condividono solo con persone che hanno un account.
- Ogni account ha uno di tre ruoli:
  - **Membro**.
  - **Amministratore**: guida un **team**, per esempio un relatore e i suoi studenti. I membri invitati da un amministratore entrano nel suo team, e l’amministratore gestisce solo loro.
  - **Amministratore di sistema**: ce n’è esattamente uno, l’account creato durante la configurazione iniziale. Gestisce l’intera istanza (servizi IA, backup, rete) e vede tutti. Nessuno può diventare un secondo amministratore di sistema, così un account amministratore non può impadronirsi dell’istanza.
- **Inviti**: link monouso, per una email oppure (lasciando vuota l’email) per chiunque abbia il link, con una scadenza. I link di un invito in sospeso restano nell’elenco (**Link**), uno per ogni indirizzo a cui ColTex è raggiungibile (LAN, Tailscale, Cloudflare). L’amministratore di sistema invita membri o amministratori e sceglie il **Gruppo IA** del nuovo account. Gli amministratori invitano solo membri, nel proprio team; questi membri ricevono il gruppo IA dell’amministratore. Gli amministratori vedono e revocano solo i propri inviti.
- **Gestisci utenti**: l’amministratore di sistema vede tutti gli account, rende le persone membri o amministratori, sposta i membri tra i team (**Team** nel menu della riga), reimposta le password, apre **Accessi e dispositivi** e sospende o elimina gli account. L’elenco contrassegna gli account **Bloccato** e quelli con la verifica in **Due passaggi** attiva. Un amministratore vede se stesso e il proprio team, e reimposta le password, sospende o elimina solo i membri del proprio team. Eliminando un account si eliminano i progetti di sua proprietà.
- Per passare il ruolo di amministratore di sistema a qualcun altro (o riaverlo quando quell’account è perso), esegui `coltex cli system-admin <email>` sul server; il precedente amministratore di sistema diventa amministratore.
- Hai dimenticato una password, anche quella dell’amministratore di sistema? Esegui `coltex cli reset-password <email>` sul server: chiede due volte la nuova password e disconnette quell’account ovunque. Il titolare dell’account riceve una notifica dell’accaduto, e il log del server (`coltex logs`) lo registra.
- Hai perso il telefono della verifica in due passaggi e i codici di recupero? `coltex reset-2fa <email>` la disattiva per quell’account (con una notifica al titolare e una riga nel log del server).

## Accessi

Solo l’amministratore di sistema vede **Accessi**: ogni accesso all’istanza (anche i tentativi con email che non hanno un account), con il risultato, browser e sistema, e l’indirizzo con la sua provenienza. Fai clic su una persona (o usa **Accessi e dispositivi** in Gestisci utenti) per vedere i suoi accessi e i dispositivi su cui ha effettuato l’accesso; **Esci** chiude la sessione di un dispositivo, **Disconnetti ovunque** tutte. Gli altri vedono solo i propri, in **Impostazioni → Account**.

ColTex protegge l’accesso da sé, senza servizi esterni. Un indirizzo è considerato abituale per un account quando l’account vi ha effettuato l’accesso negli ultimi 90 giorni.

- Da indirizzi non abituali, i tentativi falliti contano per l’account, qualunque sia l’indirizzo: dal terzo tentativo il browser risolve prima un piccolo enigma (proof of work, circa un secondo, automatico); dopo 5 tentativi falliti, 15 minuti di attesa; dopo 10 l’account viene **bloccato** per gli indirizzi non abituali. L’amministratore di sistema riceve una notifica e lo sblocca qui o in Gestisci utenti (**Sblocca**).
- Da indirizzi abituali, ogni 5 tentativi falliti comportano 15 minuti di attesa, e non vengono mai bloccati: il titolare può ancora accedere da dove lavora di solito mentre il suo account è bloccato.
- Un indirizzo su internet che fallisce 20 volte in un’ora, con qualsiasi account, viene bloccato per un giorno; gli indirizzi bloccati sono elencati in cima ad **Accessi** con **Sblocca**. Gli indirizzi della rete locale o della tailnet non vengono mai bloccati: più persone possono condividerne uno.

Sei rimasto fuori tu stesso? Esegui `coltex unlock <email>` (o `coltex unlock <address>` per un indirizzo bloccato) sul server.

## Servizi IA

- **Servizi IA**: collega fornitori con chiavi API o con l’accesso tramite abbonamento (Claude Pro/Max, ChatGPT, Copilot…), oppure i tuoi server compatibili con OpenAI (Ollama, vLLM, LM Studio…). Le chiavi sono conservate crittografate, i membri non le vedono mai e le richieste passano da questo server.
- Se l’accesso tramite abbonamento finisce su un indirizzo localhost che non si carica, copia l’indirizzo completo dalla barra degli indirizzi e incollalo in ColTex.
- Imposta i tre modelli di **Automatico** e tutti partono con la scelta automatica: il **giudice** (un modello economico e veloce) legge ogni messaggio e lo passa al modello **leggero** (domande rapide, piccole correzioni) o a quello **potente** (più errori, modifiche su più file, scrittura accurata). Finché non sono impostati tutti e tre, ognuno parte dal primo modello che può usare.
- **Utilizzo e accesso IA**: richieste e token per il gruppo e per persona. Chi può usare quali modelli si stabilisce con i **Gruppi IA**: ogni gruppo consente dei fornitori (inclusi i modelli aggiunti in seguito) o singoli modelli, ad es. “Dottorandi” con il modello potente e “Studenti triennali” con quello leggero. Ognuno fa parte al massimo di un gruppo, scelto nell’invito o in seguito aprendo la persona nell’elenco. Chi non è in alcun gruppo non può usare l’agente IA, quindi le persone nuove non hanno l’IA finché l’amministratore di sistema non le aggiunge (i membri invitati da un amministratore ricevono il gruppo dell’amministratore). L’amministratore di sistema può sempre usare tutti i modelli. Eliminando un gruppo, le sue persone restano senza IA finché non entrano in un altro.

  Un gruppo può anche limitare quanto ciascun membro usa al giorno, alla settimana o al mese: token, costo (a prezzi di listino) o entrambi. Quando un membro ha raggiunto il limite, i messaggi vengono rifiutati fino all’inizio del periodo successivo (giorni di calendario, settimane dal lunedì, mesi, nel fuso orario del server); il messaggio che supera il limite viene comunque completato. I membri vedono quanto hanno usato sotto la casella dei messaggi dell’agente IA. L’amministratore di sistema non ha limiti.

  Per regolare una singola persona, aprila nell’elenco: in **Personalizza**, **Accesso ai modelli personale** e **Limite di utilizzo personale** sostituiscono quelli del gruppo finché sono attivi (l’accesso personale funziona anche senza gruppo). L’elenco le contrassegna come **Personalizzato**.

## Archiviazione e backup

- I file dei progetti sono conservati sul disco locale o in uno storage compatibile S3, impostato all’avvio del server (`STORAGE` e `S3_*`). Cronologia, risultati delle compilazioni e copie di lavoro del compilatore restano nella cartella dei dati.
- I **backup WebDAV** vanno in una cartella su Nextcloud, ownCloud, un NAS o qualsiasi server WebDAV. Ogni backup è un unico file con il database, i file di ogni progetto e la loro cronologia. Pianificali ogni giorno o ogni settimana e scegli quanti conservarne. Usa una password per le app se il server la offre.
> **Crittografia**: i backup crittografati (AES-256) contengono anche il segreto dell’istanza, così i servizi IA collegati e la verifica in due passaggi continuano a funzionare dopo un ripristino. **Conserva la password altrove: senza di essa un backup non si può aprire.** Se ripristini da un backup non crittografato su un nuovo server (con un nuovo segreto dell’istanza), chi usa la verifica in due passaggi non può accedere finché non esegui `coltex reset-2fa <email>` per quella persona.
- Il ripristino si fa sul server con il comando `restore`, a server fermo; vedi la guida operativa.

## Monitoraggio

**Panoramica** mostra in tempo reale lo stato di server, compilatore e database, con grafici storici di CPU, memoria e compilazioni. Il server campiona ogni 10 secondi e conserva 30 giorni, anche quando nessuno ha la pagina aperta.

## Rete

**Rete** elenca gli indirizzi a cui ColTex è raggiungibile (li usano gli inviti e gli indirizzi Git), attiva Tailscale e Cloudflare Tunnel integrati e mostra come le richieste arrivano al server. Vedi [Installazione e rete](#/help/deployment).
