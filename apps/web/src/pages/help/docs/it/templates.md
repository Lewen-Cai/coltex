# Modelli

## Nuovi progetti dai modelli

**Nuovo progetto** mostra un solo elenco: i modelli integrati e quelli condivisi con te. Un’etichetta su ciascuno dice da dove viene:

- **Integrate**: incluso in ColTex.
- **Condiviso dall’amministratore di sistema**: per tutti su questo server.
- **Condiviso in** il nome di un gruppo: condiviso con un gruppo di cui fai parte.
- **Condiviso da** un nome: condiviso con te personalmente.
- **Solo tu**: un modello che hai importato per te.

I pulsanti sopra l’elenco (**Tutti**, poi gli ambiti) mostrano i modelli di un ambito. Vedi solo i modelli condivisi con te. Vedi anche [Primi passi](#/help/getting-started).

Il campo di ricerca sotto di essi trova i modelli per nome o descrizione.

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

1. Fai clic su **Nuovo progetto**, poi su **Importa modello**.
2. Scegli lo zip, dagli un nome, una descrizione e un **Ambito**, e fai clic su **Importa**. È solo per te, a meno che tu non attivi **Condividi con altri** (amministratori) e scelga con chi.

Da sapere:

- La condivisione segue le regole della pubblicazione (sopra): gli amministratori condividono con i propri gruppi e con le persone scelte, l’amministratore di sistema anche con tutti. Un modello solo per te ha l’etichetta **Solo tu**.
- L’importazione non aggiunge progetti al tuo spazio di lavoro: il modello conserva i propri file. Il documento principale si trova come nell’importazione di un progetto; file di compilazione e residui di sistema vengono esclusi.
- Il menu ⋯ del modello ha **Modifica i file**, **Modifica modello…** (per rinominarlo, cambiare con chi è condiviso o ritirarlo; ritirandolo, i suoi file diventano un tuo progetto) e **Rimuovi modello**, che ne elimina i file.

## Convertire in un modello di rivista

**Converti in modello…** nel menu di un progetto (nelle impostazioni del progetto: “Converti in un modello di rivista”) riscrive un articolo per un’altra rivista o conferenza: IEEE Transactions, IEEE Conference, ACM Conference, ACM Journal, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS o un articolo semplice. Ogni modello integrato può essere convertito in ciascuno di questi.

L’elenco è quello di **Nuovo progetto**. Un modello integrato viene scritto con le regole che ColTex ha per lui; qualsiasi altro modello (uno condiviso, uno dei tuoi progetti con **Uno dei miei progetti**, o lo zip offerto da una rivista con **Carica un modello (.zip)**) viene compilato a modo suo: titolo, autori, affiliazioni, abstract e parole chiave dell’articolo vanno dove il modello ha quelli di esempio, e il testo di esempio che segue viene sostituito dal tuo articolo. I file di classe e di stile del modello vengono copiati, e il suo file principale di esempio resta nel progetto come riferimento.

- Titolo, autori, affiliazioni, abstract, pacchetti e bibliografia vengono ricostruiti in un **nuovo progetto**, che viene poi compilato. L’originale resta com’è.
- Vengono letti anche gli articoli scritti con il modello `sn-jnl` di Springer Nature, come quelli BMC, OUP ed Elsevier CAS: autori con nome e cognome, affiliazioni, `\abstract{}` e abstract strutturati, parole chiave e la parte finale con le dichiarazioni.
- Un rapporto elenca cosa è stato cambiato e cosa controllare. Se la compilazione ha errori o il rapporto avvisi, **Apri e correggi con l’IA** apre il nuovo progetto con l’agente IA che segue lo Skill integrato **template-conversion**: chiede prima a quale rivista o conferenza invii, cerca le sue norme per gli autori aggiornate, fa compilare l’articolo e lo adegua alle norme senza cambiarne il contenuto. Le sue modifiche attendono la tua revisione.
