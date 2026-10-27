# Modelli

## Nuovi progetti dai modelli

**Nuovo progetto** mostra un solo elenco: i modelli integrati e quelli condivisi con te. Un’etichetta su ciascuno dice da dove viene:

- **Integrate**: incluso in ColTex.
- **Condiviso dall’amministratore di sistema**: per tutti su questo server.
- **Condiviso in** il nome di un gruppo: condiviso con un gruppo di cui fai parte.
- **Condiviso da** un nome: condiviso con te personalmente.

I pulsanti sopra l’elenco (**Tutti**, poi gli ambiti) mostrano i modelli di un ambito. Vedi solo i modelli condivisi con te. Vedi anche [Primi passi](#/help/getting-started).

## Pubblicare un progetto come modello

Gli amministratori possono pubblicare come modello un proprio progetto, per esempio il formato di tesi di un gruppo:

1. Nel menu del progetto (⋯) nell’elenco dei progetti, o nelle impostazioni del progetto, scegli **Pubblica come modello…**.
2. Dagli un nome, una descrizione e un **Ambito** (dove compare), scegli a chi va in **Condiviso con** e fai clic su **Pubblica**.

Per chi può essere:

- Un amministratore: i gruppi di cui fa parte e le persone che sceglie per nome o email.
- L’amministratore di sistema: anche **Tutti su questo server**.
- I membri non possono pubblicare modelli; chiedi a un amministratore.

Da sapere:

- I nuovi progetti ricevono i file del progetto come sono **in quel momento**, il compilatore e la lingua del correttore; non i membri, la cronologia o i commenti.
- Il modello segue il progetto: modifica il progetto e i nuovi progetti successivi ricevono le modifiche.
- Riapri **Pubblica come modello…** per cambiarne il nome, l’ambito o i destinatari, oppure per **Annulla pubblicazione**. L’amministratore di sistema può anche rimuovere qualsiasi modello nella finestra del nuovo progetto.
- Scompare quando il progetto viene eliminato.

## Importare il modello di una rivista

Molte riviste e conferenze pubblicano modelli LaTeX che non sono integrati in ColTex: le loro licenze non ne consentono la ridistribuzione, oppure non fanno parte di TeX Live. Tra questi ci sono NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Scarica il modello ufficiale dal sito della conferenza o dell’editore e importalo come modello:

1. Fai clic su **Nuovo progetto** e poi su **Importa modello** (solo amministratori).
2. Scegli lo zip, dagli un nome, una descrizione e un **Ambito**, scegli a chi va in **Condiviso con** e fai clic su **Importa**.

Da sapere:

- Per chi può essere segue le regole della pubblicazione (sopra): gli amministratori condividono con i loro gruppi e con le persone che scelgono, l’amministratore di sistema anche con tutti.
- Lo zip diventa un tuo progetto, pubblicato come modello. Il documento principale viene trovato come quando si importa un progetto; i file di compilazione e di sistema sono esclusi.
- Il menu ⋯ del modello ha **Apri progetto** (per modificarne i file), **Modifica modello…** (per rinominarlo, cambiare i destinatari o annullarne la pubblicazione) e **Rimuovi modello**.

## Convertire in un modello di rivista

**Converti in modello…** nel menu di un progetto (nelle impostazioni del progetto: “Converti in un modello di rivista”) riscrive un articolo per un’altra rivista o conferenza: IEEE Transactions, IEEE Conference, ACM Conference, ACM Journal, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS o un articolo semplice. Ogni modello integrato può essere convertito in ciascuno di questi.

In **Modelli**, l’articolo va invece in un modello qualsiasi: uno dell’elenco dei modelli, uno dei tuoi progetti (**Uno dei miei progetti**) o lo zip che una rivista offre da scaricare (**Carica un modello (.zip)**). Titolo, autori, affiliazioni, abstract e parole chiave vengono scritti dove il modello ha i suoi esempi, nel modo del modello, e il testo di esempio che segue è sostituito dal tuo articolo. I file di classe e di stile del modello vengono con lui, e il suo file principale di esempio resta nel progetto come riferimento.

- Titolo, autori, affiliazioni, abstract, pacchetti e bibliografia vengono ricostruiti in un **nuovo progetto**, che viene poi compilato. L’originale resta com’è.
- Vengono letti anche gli articoli scritti con il modello `sn-jnl` di Springer Nature, come quelli BMC, OUP ed Elsevier CAS: autori con nome e cognome, affiliazioni, `\abstract{}` e abstract strutturati, parole chiave e la parte finale con le dichiarazioni.
- Un rapporto elenca cosa è stato cambiato e cosa controllare. Se la compilazione ha errori o il rapporto avvisi, **Apri e correggi con l’IA** apre il nuovo progetto con l’agente IA che segue lo Skill integrato **template-conversion**: chiede prima a quale rivista o conferenza invii, cerca le sue norme per gli autori aggiornate, fa compilare l’articolo e lo adegua alle norme senza cambiarne il contenuto. Le sue modifiche attendono la tua revisione.
