# Collaborazione

## Invitare persone

Fai clic su **Condividi** in alto a destra nell’editor:

- I progetti si condividono solo con persone che hanno un account su questo server. Scrivi parte di un nome o di un’email, scegli l’account dall’elenco, scegli un ruolo e fai clic su **+**.
- Chi non ha un account ha prima bisogno di un link di invito da un amministratore o dall’amministratore di sistema; vedi [Amministrazione](#/help/admin).
- Nell’elenco dei membri puoi cambiare ruoli, trasferire la proprietà o rimuovere persone. Solo il proprietario gestisce i membri.

### Condividere con un gruppo

Il proprietario può condividere un progetto con un gruppo di cui fa parte: in **Condividi** digita parte del nome del gruppo, sceglilo (i gruppi compaiono prima delle persone), scegli un ruolo e fai clic su **+**.

- Tutti quelli che si sono uniti al gruppo ricevono quel ruolo. Chi si unisce dopo lo riceve anch’esso; chi esce lo perde.
- Il gruppo compare con il numero di membri e il ruolo, che si cambia lì; il suo menu ⋯ ha **Smetti di condividere**.
- I suoi membri compaiono nell’elenco «tramite» il gruppo. Il ruolo viene dal gruppo; per dare a uno di loro un altro ruolo, aggiungilo singolarmente, e le modifiche del gruppo non lo riguardano più.

### Ruoli

| Ruolo | Può |
| --- | --- |
| Proprietario | Tutto, compresi i membri e l’eliminazione del progetto; gli amministratori possono anche pubblicarlo come modello |
| Editor | Modificare e gestire i file, accettare o rifiutare i suggerimenti |
| Revisore | Modificare il testo solo come suggerimenti registrati; commentare |
| Visualizzatore | Leggere, compilare, scaricare, commentare |

## Modificare insieme

Più persone possono modificare lo stesso file contemporaneamente; ogni cursore ha il suo colore e l’intestazione mostra chi è presente. Le modifiche si sincronizzano in tempo reale; non c’è niente da salvare.

## Commenti

Seleziona del testo e fai clic sul pulsante dei commenti nella barra degli strumenti (o premi `Mod+Alt+M`). I commenti sono nel pannello **Revisione** a sinistra, dove puoi rispondere, modificarli e risolverli. Scrivi `@` per menzionare qualcuno; riceverà una notifica.

## Rileva modifiche

Nel pannello Revisione, attiva il rilevamento delle modifiche per tutti o per alcune persone. Le modifiche diventano allora suggerimenti:

- il testo eliminato appare barrato e quello nuovo evidenziato;
- gli editor li **accettano** o li **rifiutano**, uno alla volta o tutti insieme; una decisione presa per errore si può revocare con **Annulla** nel messaggio che segue (per 15 minuti);
- le modifiche dei revisori sono sempre registrate; possono **ritirare** i propri suggerimenti nel pannello;
- i tuoi errori: `Ctrl/Cmd+Z` annulla le tue modifiche registrate, e riscrivere al suo posto un testo che hai eliminato lo ripristina invece di aggiungere un nuovo suggerimento;
- il PDF mostra il testo con i suggerimenti inclusi.

## Chat

**Chat** nella barra a sinistra è la chat del progetto:

- `Enter` invia, `Shift+Enter` va a capo.
- `@` menziona un membro.
- Le formule in `$…$` vengono composte, ad es. `$x^2$`.

## Notifiche

Le menzioni in chat o nei commenti, le risposte ai tuoi commenti, l’aggiunta a un progetto e gli inviti ai gruppi compaiono in **Notifiche**, con il numero di non lette nella barra laterale. Restano in ColTex; niente email.
