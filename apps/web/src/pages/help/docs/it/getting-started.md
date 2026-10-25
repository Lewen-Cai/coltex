# Primi passi

ColTex è un editor LaTeX collaborativo che gira sul tuo server. Funziona in modo molto simile a Overleaf: il sorgente a sinistra, il PDF a destra, e più persone possono modificare lo stesso progetto contemporaneamente.

## Nuovi progetti

Fai clic su **Nuovo progetto** in alto a sinistra, dagli un nome e scegli un modello:

| Ambito | Modelli |
| --- | --- |
| Generale | Articolo vuoto, Preprint arXiv, Rivista Elsevier, Rivista Elsevier (autore–anno), Rivista Elsevier (due colonne), Rivista Elsevier CAS (due colonne), Nature, Articolo di rassegna, Comunicazione breve |
| Informatica e ingegneria elettrica | Conferenza IEEE, Rivista IEEE, Conferenza della IEEE Computer Society, Rivista della IEEE Computer Society, Rivista della IEEE Communications Society, Conferenza ACM, Rivista ACM, Sottomissione ACM (anonima), Conferenza ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Atti PMLR |
| Ingegneria | Conferenza ASME, Rivista ASCE, Articolo di conferenza AIAA, Atti SPIE |
| Fisica | APS (REVTeX 4.2), Physical Review Letters, Rivista AIP, Journal of the Physical Society of Japan, Articolo di conferenza JACoW |
| Astronomia | Riviste AAS (AASTeX), Monthly Notices of the RAS |
| Chimica | Articolo di rivista ACS, Letter ACS |
| Scienze della vita | Articolo di ricerca in scienze della vita, Nota applicativa di bioinformatica |
| Medicina | Report di studio clinico, Protocollo di studio clinico, Studio osservazionale, Studio di accuratezza diagnostica, Revisione sistematica e meta-analisi, Caso clinico, Lettera di ricerca medica, Rivista Elsevier CAS, Rivista di Oxford University Press |
| Matematica e statistica | Articolo AMS, Atti AMS, Annals of Mathematics, Articolo di metodi statistici |
| Economia | Articolo di economia (stile AEA), Articolo di econometria |
| Scienze sociali e umanistiche | Manoscritto APA 7, Impaginazione da rivista APA 7, Elaborato studentesco APA 7, Articolo umanistico (note Chicago), Saggio letterario (MLA), Articolo giuridico (OSCOLA) |
| Terra e ambiente | Articolo di geoscienze (stile AGU), Studio ecologico sul campo, Rivista di Canadian Science Publishing |

Tranne l’articolo vuoto, ognuno include un abstract, sezioni di esempio e un `references.bib`, e si compila così com’è. Le classi sono quelle ufficiali incluse in TeX Live. Molti modelli noti di riviste e conferenze non sono integrati; [Modelli](#/help/templates) spiega perché e come aggiungerli.

I pulsanti sopra i modelli mostrano quelli di un ambito. I modelli condivisi con te (il formato di tesi di un gruppo, per esempio) sono nello stesso elenco, con un’etichetta che dice chi li ha condivisi; vedi [Modelli](#/help/templates).

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
