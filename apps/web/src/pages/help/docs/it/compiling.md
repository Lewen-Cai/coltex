# Compilazione e PDF

## Compilatore e documento principale

Le impostazioni del progetto contengono il **Compilatore** e il **Documento principale**:

- **Automatico** (il valore predefinito per i nuovi progetti): scelto a ogni compilazione in base al documento. XeLaTeX quando il preambolo (con i file che `\input` include e i `.sty`/`.cls` del progetto stesso) carica `ctex`, `xeCJK`, `fontspec`, `unicode-math` e simili, o la classe è `ctexart`/`ctexbook` ecc.; LuaLaTeX quando carica `luacode` o `luatexja`; altrimenti pdfLaTeX. Una prima riga `% !TEX program = xelatex`, o un `latexmkrc` nel progetto, decide al suo posto.
- **pdfLaTeX**: la scelta abituale per i documenti in inglese.
- **XeLaTeX**: necessario per il cinese (ctex) e per i font di sistema.
- **LuaLaTeX**: supporta anch’esso i font di sistema.

Se scegli un motore, viene usato sempre, senza rilevamento.

> Per il cinese, carica `\usepackage[UTF8]{ctex}` (o usa la classe `ctexart`) e Automatico passa a XeLaTeX. Un testo cinese senza ctex non si compila con pdfLaTeX e dà l’errore “Unicode character … not set up for use with LaTeX”.

Il documento principale è il file da cui parte la compilazione; sceglilo in **Documento principale** nelle impostazioni del progetto.

Le compilazioni usano TeX Live completo con latexmk, che esegue LaTeX, BibTeX/Biber e gli indici tutte le volte necessarie. Vengono eseguite in isolamento, senza accesso alla rete, e lo shell escape è limitato.

## Opzioni di compilazione

La freccia accanto a **Ricompila** contiene:

- **Compilazione automatica**: compila quando smetti di scrivere (una compilazione alla volta per progetto, per quante persone stiano scrivendo).
- **Modalità di compilazione**: Normale o Veloce [bozza]. La modalità bozza tralascia le immagini ed è più rapida.
- **Gestione degli errori di compilazione**: fermarsi al primo errore o provare a compilare nonostante gli errori.
- **Pulisci e ricompila**: quando una compilazione sembra sbagliata, rimuove i file ausiliari e compila da zero.

Queste opzioni sono salvate per progetto in questo browser.

## Log

Il numero su **Log** è il conteggio degli errori. Il log elenca errori, avvisi e problemi di composizione:

- ciascuno con il messaggio di LaTeX e, per i problemi comuni, una spiegazione (per un pacchetto mancante, per esempio, indica il pacchetto da aggiungere);
- fai clic su uno per saltare al suo file e alla sua riga;
- c’è anche il log completo, e l’IA può spiegare o correggere gli errori.

> Quando una compilazione non riesce, resta sullo schermo il PDF dell’ultima compilazione riuscita.

## Tra il sorgente e il PDF

- **Sorgente → PDF**: con il cursore nel sorgente, fai clic su **Individua** nella barra del PDF (o su “Vai al PDF” nel menu del tasto destro); il PDF scorre fino a quel punto e lo evidenzia.
- **PDF → sorgente**: fai doppio clic sul PDF; l’editor apre il file a quella riga.

## Layout: editor, PDF o entrambi

Il selettore di vista (quattro piccoli pulsanti a destra della barra del PDF) mostra **Solo editor**, **Editor e PDF** affiancati o **Solo PDF**, come in Overleaf, e il quarto apre il PDF in una nuova finestra; questo browser ricorda la scelta. Anche trascinando il divisore fino in fondo da un lato si nasconde quel riquadro.

- Con il solo editor, **Ricompila** e lo stesso selettore si trovano alla fine della barra degli strumenti dell’editor.
- **Vai al PDF** dall’editor mostra il PDF quando è nascosto.
- In una finestra stretta (un tablet o un telefono) c’è spazio per un riquadro alla volta, e i pannelli laterali (file, ricerca…) coprono l’editor mentre sono aperti.

## Il PDF in una finestra a parte

**Apri il PDF in una nuova finestra** (l’ultimo pulsante del selettore di vista) apre il PDF in una finestra separata che puoi spostare su un altro schermo:

- La finestra dell’editor rinuncia al riquadro del PDF e l’editor la occupa tutta; **Ricompila** si sposta alla fine della barra degli strumenti dell’editor.
- La finestra del PDF ha Ricompila, Log, vai al PDF e download. Un doppio clic sul suo PDF salta al sorgente nella finestra dell’editor.
- **Mostra il PDF qui** nella barra degli strumenti dell’editor, o la chiusura della finestra, riporta il riquadro del PDF.

## Download

- La barra del PDF scarica il PDF attuale.
- Il pulsante di download in cima all’albero dei file scarica i file sorgente del progetto come .zip.
- Nell’elenco dei progetti, il menu di un progetto (⋯) ha **Scarica PDF**, che prima lo compila, e **Scarica .zip** per tutti i suoi file sorgente.

## Esportare in Word

Alcune riviste accettano solo file Word. **Esporta in Word…** nel menu di un progetto (⋯) nell’elenco dei progetti, oppure in **Azioni** nelle impostazioni del progetto, trasforma il progetto in un .docx.

- La pagina del titolo viene dal documento: titolo, autori, affiliazioni, autore corrispondente, abstract e parole chiave, per le classi che la conversione di modello sa leggere (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Le formule diventano equazioni di Word. Word numera figure e tabelle, le figure PDF ed EPS diventano immagini e le equazioni numerate mantengono il loro numero, quindi `\eqref` continua a puntare a esse.
- **Stile delle citazioni**: **Come nel documento** segue lo stile bibliografico del documento. Puoi anche scegliere APA, Vancouver, AMA, IEEE, Nature o Chicago, oppure un file `.csl` caricato nel progetto.
- **Modello Word**: carica nel progetto il modello Word (`.docx`) di una rivista e sceglilo qui; il documento ne prende gli stili. Il campo compare quando il progetto contiene un file `.docx`.
- Controlla il risultato prima di inviarlo: le tue macro e le tabelle complesse potrebbero richiedere ritocchi in Word. I disegni TikZ non vengono convertiti: compilali come immagini e includi quelle.
