# Editor

## Modalità codice e visuale

**Codice / Visuale** nella barra degli strumenti cambia il modo di modificare; entrambe le modalità modificano lo stesso sorgente LaTeX.

- **Codice**: il sorgente vero e proprio, con evidenziazione, completamento automatico e abbinamento delle parentesi. Con il cursore in una formula, l’equazione composta viene mostrata sopra (`Esc` la nasconde).
- **Visuale**: titoli, grassetto, elenchi, formule, tabelle e figure appaiono composti; il sorgente si vede dove si trova il cursore. Ideale per leggere e modificare il testo.

## Barra degli strumenti

Livello del titolo, grassetto, corsivo, formule, simboli, link, `\ref`, `\cite`, figure, tabelle, elenchi e ricerca. I pulsanti che non ci stanno finiscono nel menu **⋯**.

- **Simboli** (Σ): lettere greche, operatori, frecce e altro, per categoria; fai clic per inserire.
- **Tabelle**: scegli la dimensione all’inserimento. In modalità visuale, fai clic su una tabella per modificarne le celle (`Tab` passa dall’una all’altra); la sua barra degli strumenti aggiunge e rimuove righe e colonne, unisce celle e imposta allineamento e bordi.
- **Figure**: carica un’immagine, scegline una dal progetto, oppure incolla o trascina un’immagine nell’editor. In modalità visuale il pulsante di modifica su una figura ne cambia larghezza, didascalia ed etichetta.

## Completamento automatico

Scrivendo `\` vengono suggeriti i comandi; `\ref{` e `\cite{` elencano le etichette e le chiavi bibliografiche del progetto. `Ctrl+Space` apre i suggerimenti in qualsiasi momento.

## Errori

- **Errori di compilazione**: gli errori e gli avvisi dell’ultima compilazione nel file aperto hanno un punto accanto al numero di riga, e gli errori sono sottolineati. Passa sopra con il mouse per vedere il messaggio di LaTeX e una spiegazione.
- **Controllo del codice**: controlla mentre scrivi, senza compilare: ambienti non chiusi o non corrispondenti, una `}` o un `$` di troppo, comandi matematici fuori dalle formule. Il punto in cui stai scrivendo non viene segnalato. Racchiudi una parte tra `%%begin novalidate` e `%%end novalidate` per saltarla.

## Controllo ortografico

Le parole errate hanno una sottolineatura rossa punteggiata (il testo CJK non viene controllato). Fai clic con il tasto destro su una parola per i suggerimenti o per **Aggiungi al dizionario**. La lingua è un’impostazione del progetto.

Il tuo dizionario è in **Impostazioni → Dizionario** in fondo alla barra dell’editor; le sue parole contano come corrette in tutti i tuoi progetti. Scrivi nel campo per trovare una parola e premi Invio per aggiungerla se non c’è ancora; le lettere sopra l’elenco saltano a quella lettera. Il menu **⋯** importa un file di testo (una parola per riga, oppure separate da spazi o virgole; funzionano anche i file `.dic` di Hunspell), esporta le tue parole come `dictionary.txt` e le rimuove tutte. Gli editor aperti ricontrollano subito le parole.

## Menu del tasto destro

Taglia, copia, incolla, seleziona tutto, elimina, vai al PDF e aggiungi un commento. Su `\ref{…}` offre **Vai all’etichetta**; su `\input{…}` o `\include{…}`, **Apri file**.

## Struttura e percorso di navigazione

- **Struttura del file** sotto l’albero dei file elenca le sezioni del file aperto; fai clic su una per andarci. La sezione in cui ti trovi è evidenziata.
- La riga sopra l’editor mostra “file › sezione › sottosezione” per il cursore; fai clic su una sezione per andarci. Si può disattivare nelle impostazioni dell’editor.

## Ricerca

`Mod+F` (o `Mod+Shift+F`, o il pulsante di ricerca della barra degli strumenti) apre il pannello **Cerca** a sinistra con il testo selezionato già inserito. Cerca in tutto il progetto, prima le corrispondenze del file aperto, con espressioni regolari, distinzione tra maiuscole e minuscole e parola intera, e sostituisce una corrispondenza o tutte. Prima di sostituire tutto viene salvata una versione.

## Impostazioni dell’editor

**Impostazioni** in fondo alla barra a sinistra raggruppa le impostazioni in categorie sulla sinistra:

- **Progetto**: compilatore, documento principale, lingua del controllo ortografico (le cambiano gli editor, per tutti) e l’indirizzo di clonazione Git;
- **Aspetto**: dimensione del carattere, carattere (monospaziato o senza grazie), interlinea, **Colori del codice** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark e altri, solo in modalità codice), percorso di navigazione;
- **Modifica**: associazioni tasti (predefinite, Vim o Emacs) e interruttori per il controllo del codice, l’anteprima delle equazioni, la chiusura automatica delle parentesi e il completamento automatico;
- **Scorciatoie da tastiera**: vedi sotto;
- **Azioni**: conteggio parole, copia, conversione di modello, pubblicazione come modello.

Aspetto, modifica e scorciatoie sono tuoi, salvati in questo browser, per ogni progetto.

## Scorciatoie da tastiera

**Scorciatoie** nella barra a sinistra le elenca tutte. Le più usate:

| Azione | Tasti |
| --- | --- |
| Compila | `Mod+S` o `Mod+Enter` |
| Annulla / ripeti | `Mod+Z` / `Mod+Shift+Z` |
| Cerca e sostituisci | `Mod+F` |
| Grassetto / corsivo | `Mod+B` / `Mod+I` |
| Commenta o decommenta le righe | `Mod+/` |
| Vai alla riga | `Mod+Alt+G` |
| Commenta la selezione | `Mod+Alt+M` |
| Mostra i suggerimenti | `Ctrl+Space` |

I tasti sono mostrati per il tuo sistema: ⌘, ⌥ e ⇧ su Mac, Ctrl, Alt e Shift su Windows e Linux. Questi sono i tasti predefiniti.

### Le tue scorciatoie

In **Scorciatoie da tastiera** nelle impostazioni, fai clic su **Cambia** accanto a un comando e premi i nuovi tasti. Devono includere Ctrl (⌘ su Mac) o Alt; i tasti usati da un altro comando, o riservati al browser e alle modifiche di base (annulla, copia, incolla, seleziona tutto…), non si possono usare. Ripristinane uno o tutti. I suggerimenti della barra degli strumenti e l’elenco delle scorciatoie mostrano poi i tuoi tasti.
