# Modèles

## Nouveaux projets à partir de modèles

**Nouveau projet** affiche une seule liste : les modèles intégrés et ceux partagés avec vous. Une étiquette sur chacun indique d’où il vient :

- **Intégrés** : fourni avec ColTex.
- **Partagé par l’administrateur système** : pour tout le monde sur ce serveur.
- **Partagé avec** le nom d’un groupe : partagé avec un groupe dont vous faites partie.
- **Partagé par** un nom : partagé avec vous personnellement.

Les boutons au-dessus de la liste (**Tout**, puis les domaines) affichent les modèles d’un domaine. Vous ne voyez que les modèles partagés avec vous. Voir aussi [Premiers pas](#/help/getting-started).

## Publier un projet comme modèle

Les administrateurs peuvent publier comme modèle un projet qui leur appartient, le format de thèse d’une équipe par exemple :

1. Dans le menu du projet (⋯) de la liste des projets, ou dans les paramètres du projet, choisissez **Publier comme modèle…**.
2. Donnez-lui un nom, une description et un **Domaine** (où il est listé), choisissez qui le reçoit sous **Partagé avec**, puis cliquez sur **Publier**.

Pour qui :

- Un administrateur : les groupes dont il fait partie et les personnes qu’il choisit par nom ou e-mail.
- L’administrateur système : aussi **Tout le monde sur ce serveur**.
- Les membres ne peuvent pas publier de modèles ; demandez à un administrateur.

À savoir :

- Les nouveaux projets reçoivent les fichiers du projet tels qu’ils sont **à ce moment-là**, son compilateur et sa langue de correction ; pas ses membres, son historique ni ses commentaires.
- Le modèle suit le projet : modifiez le projet, et les nouveaux projets suivants reçoivent les changements.
- Rouvrez **Publier comme modèle…** pour changer son nom, son domaine ou ses destinataires, ou pour **Dépublier**. L’administrateur système peut aussi retirer n’importe quel modèle dans la fenêtre de nouveau projet.
- Il disparaît quand le projet est supprimé.

## Importer le modèle d’une revue

Beaucoup de revues et de conférences publient des modèles LaTeX qui ne sont pas intégrés à ColTex : leur licence n’en permet pas la redistribution, ou ils ne font pas partie de TeX Live. En font partie NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Téléchargez le modèle officiel sur le site de la conférence ou de l’éditeur, puis importez-le comme modèle :

1. Cliquez sur **Nouveau projet**, puis sur **Importer un modèle** (administrateurs seulement).
2. Choisissez le zip, donnez-lui un nom, une description et un **Domaine**, choisissez qui le reçoit sous **Partagé avec**, puis cliquez sur **Importer**.

À savoir :

- Les destinataires suivent les règles de la publication (ci-dessus) : les administrateurs partagent avec leurs groupes et les personnes qu’ils choisissent, l’administrateur système aussi avec tout le monde.
- Le zip devient un de vos projets, publié comme modèle. Son document principal est trouvé comme lors de l’import d’un projet ; les fichiers de compilation et les fichiers système sont écartés.
- Le menu ⋯ du modèle propose **Ouvrir le projet** (pour modifier ses fichiers), **Modifier le modèle…** (pour le renommer, changer ses destinataires ou le dépublier) et **Retirer le modèle**.

## Convertir vers un modèle de revue

**Convertir vers un modèle…** dans le menu d’un projet (dans les paramètres du projet : « Convertir vers un modèle de revue ») réécrit un article pour une autre revue ou conférence : IEEE Transactions, conférence IEEE, conférence ACM, revue ACM, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS ou un article simple. Chaque modèle intégré peut être converti vers chacun d’eux.

Sous **Modèles**, l’article va plutôt dans n’importe quel modèle : un modèle de la liste, un de vos projets (**Un de mes projets**) ou le zip qu’une revue propose au téléchargement (**Téléverser un modèle (.zip)**). Le titre, les auteurs, les affiliations, le résumé et les mots-clés sont écrits là où le modèle a ses exemples, à la manière du modèle, et le texte d’exemple qui suit est remplacé par votre article. Les fichiers de classe et de style du modèle suivent, et son fichier principal d’exemple reste dans le projet pour référence.

- Le titre, les auteurs, les affiliations, le résumé, les packages et la bibliographie sont reconstruits dans un **nouveau projet**, qui est ensuite compilé. L’original reste tel quel.
- Les articles écrits avec le modèle `sn-jnl` de Springer Nature sont lus aussi, tout comme ceux de BMC, OUP et Elsevier CAS : auteurs avec prénom et nom, affiliations, `\abstract{}` et résumés structurés, mots-clés et la partie finale avec les déclarations.
- Un rapport liste ce qui a été modifié et ce qu’il faut vérifier. Si la compilation a des erreurs ou le rapport des avertissements, **Ouvrir et corriger avec l’IA** ouvre le nouveau projet avec l’agent IA qui suit le Skill intégré **template-conversion** : il demande d’abord à quelle revue ou conférence vous soumettez, consulte ses consignes aux auteurs actuelles, fait compiler l’article et le met en conformité avec ces consignes sans changer ce qu’il dit. Ses modifications attendent votre relecture.
