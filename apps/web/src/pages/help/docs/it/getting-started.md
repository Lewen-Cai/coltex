# Primi passi

ColTex è un editor LaTeX collaborativo che gira sul tuo server. Funziona in modo molto simile a Overleaf: il sorgente a sinistra, il PDF a destra, e più persone possono modificare lo stesso progetto contemporaneamente.

## Nuovi progetti

Fai clic su **Nuovo progetto** in alto a sinistra, dagli un nome e scegli un modello:

| Modello | Classe |
| --- | --- |
| Articolo vuoto | La classe standard `article`, il punto di partenza più semplice |
| Preprint arXiv | `article`, una colonna, autori con affiliazioni (authblk), bibliografia natbib |
| Conferenza IEEE / Rivista IEEE | `IEEEtran` in modalità conferenza / rivista |
| Conferenza ACM / Rivista ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, per LNCS e altri atti Springer |
| Rivista Elsevier | `elsarticle`, preprint a una colonna |
| APS (REVTeX 4.2) | `revtex4-2`, per le riviste Physical Review e AIP |

A parte l’articolo vuoto, ognuno include un abstract, parole chiave, un’equazione, una figura, una tabella e un `references.bib`, e si compila così com’è. Le classi sono quelle ufficiali distribuite con TeX Live. Le conferenze che pubblicano nuovi file di stile ogni anno (NeurIPS, ICML) non sono in TeX Live: carica i file dell’anno in un progetto e pubblicalo come modello.

I progetti che altre persone hanno pubblicato come modelli (per esempio il formato di tesi di un gruppo) sono elencati in “Condivisi su questo server”.

I nuovi progetti si compilano con **Automatico**: il motore viene scelto a ogni compilazione in base al documento; vedi [Compilazione e PDF](#/help/compiling).

Per portare un progetto da Overleaf, scegli lì **Download Source** e usa **Importa** qui con lo zip (fino a 200 MB). Il documento principale viene rilevato e anche il compilatore è Automatico. I file di compilazione lasciati da altri editor (`.aux`, `.log`, `.synctex.gz` e simili) e le cartelle come `.vscode` vengono tralasciati, come su Overleaf; i file `latexmkrc` e `.bbl` restano.

## L’editor

- **In alto**: il nome del progetto, chi è presente, **Cronologia** e **Condividi**.
- **Barra a sinistra**: alterna il pannello di sinistra tra file, ricerca, bibliografia, revisione, chat e IA; le scorciatoie da tastiera e le impostazioni del progetto sono in fondo.
- **Al centro**: l’editor, con **Codice / Visuale** nella sua barra degli strumenti.
- **A destra**: il PDF, con **Ricompila**, **Log**, il pulsante per andare al PDF, l’apertura in una nuova finestra e il download.

## Compilazione e PDF

- Fai clic su **Ricompila** o premi `Mod+S` / `Mod+Enter`. La compilazione automatica è attiva per impostazione predefinita e compila quando smetti di scrivere.
- **Log** mostra il numero di errori; aprilo per vedere ciascuno con una spiegazione e fai clic su uno per saltare alla sua riga. Gli errori sono segnalati anche accanto ai numeri di riga nell’editor.
- **Sorgente ↔ PDF**: con il cursore nel sorgente, fai clic sul mirino nella barra del PDF e il PDF scorre fino a quel punto; fai doppio clic sul PDF per tornare al sorgente.
- **PDF in una finestra a parte**: “Apri il PDF in una nuova finestra” nella barra del PDF ti permette di mettere il PDF su un altro schermo mentre l’editor occupa tutta la sua finestra. Vedi [Compilazione e PDF](#/help/compiling).

## Prossimi passi

- [Editor](#/help/editor): le due modalità, tabelle e figure, anteprima delle equazioni, controllo ortografico, il menu del tasto destro.
- [Collaborazione](#/help/collaboration): invitare persone, commenti, revisioni, chat.
- [Agente IA](#/help/ai): spiegazioni e modifiche, applicate solo dopo che le hai riviste.
