# File

## L’albero dei file

- I pulsanti nella sua intestazione: nuovo file, nuova cartella, caricamento e aggiunta di un file collegato.
- Trascina un file su una cartella per spostarlo; fai doppio clic su un nome per rinominarlo. I file trascinati dal tuo computer vengono caricati.
- Fai clic con il tasto destro su un file o una cartella per creare, caricare, rinominare o eliminare.
- Un punto colorato accanto a un file indica che qualcun altro lo ha aperto.

I file eliminati si possono recuperare dalla cronologia.

## File collegati

Un file collegato proviene da un’altra fonte e può essere aggiornato da essa in qualsiasi momento:

- **Da un altro progetto**: qualsiasi file di un altro progetto, o il suo PDF compilato (viene prima compilato). Utile per figure o un `.bib` condivisi, o per usare il PDF di un progetto come figura in un altro.
- **Da un URL**: scaricato da un indirizzo pubblico (fino a 50 MB). Non si possono usare indirizzi della rete locale o privata.

> I file collegati hanno un simbolo di collegamento nell’albero; passaci sopra con il mouse per vedere da dove provengono. Con il tasto destro, **Aggiorna il file collegato** lo scarica di nuovo e lo sostituisce. Per aggiungere o aggiornare devi avere tu stesso accesso al progetto di origine.

## Git

Ogni progetto si può clonare, aggiornare con pull e modificare con push tramite git:

1. Crea un token per Git in **Impostazioni → Servizi di sincronizzazione** (viene mostrato una sola volta; conservalo). Un token di **Sola lettura** può fare clone e pull ma non push.
2. Copia l’indirizzo di clonazione dalle impostazioni del progetto ed esegui `git clone <address>`. Quando git lo chiede, usa un nome utente qualsiasi e il token come password.
3. Fai commit in locale e `git push`: le modifiche entrano subito nel progetto, dove i collaboratori le vedono.

Da sapere:

- Ogni progetto ha un solo branch, `main`.
- Se qualcuno ha modificato il progetto dopo il tuo ultimo pull, git rifiuta il push: prima `git pull`, poi di nuovo push.
- Prima di applicare un push, lo stato del progetto viene salvato come versione.
- Revisori e visualizzatori non possono fare push.
- Per non dover digitare il token ogni volta: `git config --global credential.helper store` (o `osxkeychain` su Mac).
