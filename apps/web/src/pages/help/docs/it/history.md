# Cronologia

**Cronologia** in alto nell’editor apre la vista della cronologia. Funziona come un git log: ogni versione ha un ID breve (come `a1b2c3d`), una descrizione, quando è stata creata e da chi.

- Le versioni vengono registrate automaticamente dopo una pausa nella modifica, con chi ha fatto le modifiche.
- **Salva versione** registra subito lo stato attuale, con la tua descrizione (come un messaggio di commit). Se nulla è cambiato dall’ultima versione, la descrizione diventa un’etichetta su quella versione.
- Seleziona una versione per vedere quali file ha modificato e come, oppure confrontala con il progetto attuale.
- **Annulla queste modifiche** annulla solo ciò che quella versione ha cambiato e mantiene tutto ciò che è cambiato dopo (come `git revert`). Se nel frattempo un file è stato modificato di nuovo in modo incompatibile, non viene cambiato nulla e il file viene indicato.
- **Ripristina progetto** riporta ogni file com’era in quella versione; i file aggiunti dopo vengono rimossi. **Ripristina questo file** fa lo stesso per un solo file.
- Annullamenti e ripristini sono a loro volta versioni (“Annulla a1b2c3d”, “Torna a a1b2c3d”; fai clic sull’ID per andare a quella versione), quindi si possono annullare anch’essi.
- **Aggiungi etichetta** dà un nome a una versione (ad es. “Inviato”) per ritrovarla più tardi.
- I file di qualsiasi versione si possono scaricare come .zip.

> Una versione viene salvata anche prima di applicare modifiche dell’IA, prima di una sostituzione in tutto il progetto, di un git push, di un annullamento e di un ripristino.
