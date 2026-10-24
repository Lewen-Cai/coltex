# Bibliografia

**Bibliografia** nella barra a sinistra lavora con i file `.bib` del progetto.

## Citare

**Cita** elenca tutte le voci `.bib` del progetto; cerca per autore, titolo, anno o chiave. Fai clic su una voce per inserire `\cite{key}` nel punto del cursore. Anche scrivendo `\cite{` nell’editor vengono suggerite le chiavi.

## Cercare e aggiungere

Nella scheda **Aggiungi**, scrivi un titolo, degli autori o delle parole chiave e premi Invio o **Cerca**: ColTex cerca su Crossref (riviste, atti, libri) e su arXiv (preprint) ed elenca ciò che trova, prima le corrispondenze migliori di ciascuno. **+** aggiunge un articolo al file `.bib` scelto sotto il campo. Un preprint di cui arXiv conosce la versione pubblicata viene aggiunto tramite il DOI di quella versione.

Un DOI (ad es. `10.1145/3290605.3300857`), un link doi.org o un ID arXiv viene aggiunto direttamente, senza ricerca (il pulsante allora mostra **Aggiungi**).

Le voci vengono scaricate da doi.org e aggiunte in fondo al file con una chiave univoca; una voce già presente nel file (stesso DOI) non viene aggiunta due volte. Controlla ciò che è stato scaricato.

## Zotero

1. In **Impostazioni → Servizi di sincronizzazione**, inserisci una chiave API di Zotero (creata nelle impostazioni di zotero.org; basta l’accesso in lettura). Viene conservata crittografata su questo server e usata solo per leggere la tua libreria.
2. Nella scheda **Zotero** del pannello Bibliografia, scegli una libreria o una raccolta da importare come file `.bib` nel progetto.
3. **Aggiorna da Zotero** sostituisce quel file con ciò che c’è ora in Zotero, quindi modifica le voci in Zotero e non nel file.

L’aggiornamento usa la connessione a Zotero di chi ha importato il file.
