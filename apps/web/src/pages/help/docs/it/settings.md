# Impostazioni

Fai clic sul tuo avatar in basso a sinistra e scegli **Impostazioni**.

- **Account**: il tuo nome visualizzato (mostrato ai collaboratori, nei commenti e nella cronologia), il colore del tuo avatar (è anche il tuo cursore nell’editor; **Automatico** è quello scelto da ColTex) e la password. Cambiando la password puoi uscire dagli altri dispositivi. Le password richiedono almeno 8 caratteri con una lettera maiuscola, una minuscola e un numero; i simboli sono facoltativi. La valutazione mostrata durante la digitazione (debole, discreta, buona, forte) sale con la lunghezza e i simboli. La registrazione e il ripristino da parte di un amministratore seguono le stesse regole. L’email di accesso può essere cambiata solo da un amministratore. In questa pagina ci sono anche la verifica in due passaggi e la tua attività di accesso (vedi sotto).
- **Aspetto**: il tema (Chiaro e Scuro in blu, Foresta e Muschio in verde, Lavanda e Prugna in viola; Chiaro come predefinito) e la lingua dell’interfaccia (14 lingue, tra cui English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français e Deutsch; all’inizio è quella del tuo browser). I temi scuri si applicano anche all’editor; le pagine del PDF restano bianche. Il tema è salvato con il tuo account, quindi ti segue negli altri browser (la pagina di accesso usa sempre Chiaro); la lingua è salvata in questo browser.
- **Servizi di sincronizzazione**: collega il tuo account Zotero (vedi [Bibliografia](#/help/references)) e crea e revoca i token git (vedi [File](#/help/files)): ognuno per Git, MCP o entrambi, in lettura e scrittura o in sola lettura, per tutti i tuoi progetti o solo per alcuni, con una scadenza. Usa un token per computer, così puoi revocarlo da solo.
- **Gruppi**: i gruppi di cui fai parte, gli inviti a cui rispondere e i nuovi gruppi; vedi sotto.
- **Agente IA**: il tuo utilizzo dell’IA negli ultimi 7, 30 o 90 giorni (richieste, token, costo, per giorno e per modello) e quanto resta del tuo limite (quando hai l’agente IA), cosa possono modificare per te gli agenti IA (**Permessi**) e il collegamento dei tuoi agenti IA tramite **MCP**, con i loro token; vedi [Agente IA](#/help/ai).
- **Skill IA** (quando hai l’agente IA): le tue skill, quelle integrate e una chat con l’agente IA per scrivere skill; vedi [Agente IA](#/help/ai).

## Gruppi

**Impostazioni → Gruppi** elenca i gruppi di cui fai parte. Un progetto si può condividere con un intero gruppo (vedi [Collaborazione](#/help/collaboration)), e gli amministratori condividono modelli con i gruppi (vedi [Modelli](#/help/templates)).

- Chiunque può creare un gruppo: **Crea gruppo** e un nome. Ne sei il proprietario.
- I proprietari invitano chiunque abbia un account su questo server con **Invita qualcuno per nome o email**. La persona riceve una notifica e si unisce con **Unisciti** in **Inviti** in questa pagina, oppure rifiuta con **Rifiuta**. Fino ad allora risulta **Invitato**, e il proprietario può **Ritira invito**.
- Nel menu ⋯ di un membro i proprietari possono **Rendi proprietario** (o **Rendi membro**) e **Rimuovi**. Il menu ⋯ del gruppo ha **Rinomina** ed **Elimina gruppo** per i proprietari, e **Lascia il gruppo**.
- Un gruppo ha sempre un proprietario: l’ultimo rende proprietario qualcun altro prima di uscire, oppure elimina il gruppo.
- Lasciando un gruppo, venendone rimossi o con il gruppo eliminato si perdono i progetti condivisi con esso, tranne quelli a cui si è stati aggiunti singolarmente.

## Verifica in due passaggi

Con la verifica in due passaggi attiva, dopo la password l’accesso chiede un codice da un’app di autenticazione sul tuo telefono (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). È una tua scelta; nessun altro può attivarla per te.

1. In **Impostazioni → Account**, in **Verifica in due passaggi**, fai clic su **Attiva** e inserisci la tua password.
2. Scansiona il codice QR con l’app (o digita la chiave di configurazione), poi inserisci il codice a 6 cifre che mostra.
3. Salva i 10 **codici di recupero** (copiali o scaricali come file). Ognuno ti fa accedere una volta al posto di un codice, se perdi il telefono. Vengono mostrati solo ora.

All’accesso, dopo la password, inserisci il codice dell’app oppure fai clic su **Usa un codice di recupero**. **Non chiedere più su questo dispositivo per 30 giorni** salta il codice in quel browser. **Nuovi codici di recupero** sostituisce quelli vecchi (conserva i nuovi); **Disattiva** torna alla sola password. I token Git e MCP funzionano come prima.

> Hai perso sia il telefono sia i codici di recupero? L’amministratore di sistema può disattivare la verifica in due passaggi per il tuo account sul server (`coltex reset-2fa <email>`); poi accedi con la password e puoi riattivarla.

## Attività di accesso

**Attività di accesso** in fondo a **Impostazioni → Account** elenca gli accessi al tuo account, dal più recente: quando, il risultato (accesso effettuato, password errata, codice errato, rifiutato), browser e sistema, e l’indirizzo con la sua provenienza: la rete locale, Tailscale o, per un indirizzo su internet, paese, regione, città e operatore di rete. Le località provengono da un database sul server; gli indirizzi non vengono mai inviati altrove per cercarle. I dati vengono conservati 90 giorni.

Le impostazioni dell’editor (dimensione del carattere, colori, Vim…) sono in **Impostazioni** in fondo alla barra a sinistra dell’editor; vedi [Editor](#/help/editor).
