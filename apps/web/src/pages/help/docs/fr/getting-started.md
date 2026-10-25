# Premiers pas

ColTex est un éditeur LaTeX collaboratif qui fonctionne sur votre propre serveur. Il ressemble beaucoup à Overleaf : la source à gauche, le PDF à droite, et plusieurs personnes peuvent modifier le même projet en même temps.

## Nouveaux projets

Cliquez sur **Nouveau projet** en haut à gauche, donnez-lui un nom et choisissez un modèle :

| Domaine | Modèles |
| --- | --- |
| Général | Article vierge, Prépublication arXiv, Revue Elsevier, Revue Elsevier (auteur–année), Revue Elsevier (deux colonnes), Revue Elsevier CAS (deux colonnes), Nature, Article de synthèse, Communication courte |
| Informatique et génie électrique | Conférence IEEE, Revue IEEE, Conférence de l’IEEE Computer Society, Revue de l’IEEE Computer Society, Revue de l’IEEE Communications Society, Conférence ACM, Revue ACM, Soumission ACM (anonyme), Conférence ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Actes PMLR |
| Ingénierie | Conférence ASME, Revue ASCE, Article de conférence AIAA, Actes SPIE |
| Physique | APS (REVTeX 4.2), Physical Review Letters, Revue AIP, Journal of the Physical Society of Japan, Article de conférence JACoW |
| Astronomie | Revues de l’AAS (AASTeX), Monthly Notices of the RAS |
| Chimie | Article de revue ACS, Letter ACS |
| Sciences de la vie | Article de recherche en sciences de la vie, Note d’application en bio-informatique |
| Médecine | Rapport d’essai clinique, Protocole d’essai clinique, Étude observationnelle, Étude de performance diagnostique, Revue systématique et méta-analyse, Cas clinique, Lettre de recherche médicale, Revue Elsevier CAS, Revue d’Oxford University Press |
| Mathématiques et statistique | Article AMS, Actes de l’AMS, Annals of Mathematics, Article de méthodes statistiques |
| Économie | Article d’économie (style AEA), Article d’économétrie |
| Sciences sociales et humaines | Manuscrit APA 7, Mise en page de revue APA 7, Devoir étudiant APA 7, Article de sciences humaines (notes Chicago), Essai littéraire (MLA), Article de droit (OSCOLA) |
| Terre et environnement | Article de géosciences (style AGU), Étude de terrain en écologie, Revue de Canadian Science Publishing |

À part l’article vide, chacun comporte un résumé, des sections d’exemple et un `references.bib`, et compile tel quel. Les classes sont les classes officielles fournies avec TeX Live. Beaucoup de modèles connus de revues et de conférences ne sont pas intégrés ; [Modèles](#/help/templates) explique pourquoi et comment les ajouter.

Les boutons au-dessus des modèles affichent ceux d’un domaine. Les modèles partagés avec vous (le format de thèse d’une équipe, par exemple) sont dans la même liste, avec une étiquette indiquant qui les a partagés ; voir [Modèles](#/help/templates).

Les nouveaux projets compilent en **Automatique** : le moteur est choisi à chaque compilation d’après le document ; voir [Compilation et PDF](#/help/compiling).

Pour reprendre un projet d’Overleaf, choisissez là-bas **Download Source** (télécharger la source), puis **Importer** le zip ici (jusqu’à 200 Mo). Le document principal est détecté, et le compilateur est lui aussi en Automatique. Les fichiers de compilation laissés par d’autres éditeurs (`.aux`, `.log`, `.synctex.gz`, etc.) et les dossiers comme `.vscode` sont ignorés, comme sur Overleaf ; les fichiers `latexmkrc` et `.bbl` sont conservés.

## L’éditeur

- **En haut** : le nom du projet, les personnes présentes, **Historique** et **Partager**.
- **Barre latérale gauche** : bascule le panneau de gauche entre fichiers, recherche, références, relecture, discussion et IA ; les raccourcis clavier et les paramètres du projet sont en bas.
- **Au milieu** : l’éditeur, avec **Code / Visuel** dans sa barre d’outils.
- **À droite** : le PDF, avec **Recompiler**, **Journaux**, le bouton pour aller au PDF, l’ouverture dans une nouvelle fenêtre et le téléchargement.

## Compilation et PDF

- Cliquez sur **Recompiler** ou appuyez sur `Mod+S` / `Mod+Enter`. La compilation automatique est activée par défaut et compile quand vous faites une pause dans la saisie.
- **Journaux** affiche le nombre d’erreurs ; ouvrez-le pour voir chacune avec une explication, et cliquez sur l’une d’elles pour aller à sa ligne. Les erreurs sont aussi signalées à côté des numéros de ligne dans l’éditeur.
- **Source ↔ PDF** : le curseur dans la source, cliquez sur la cible dans la barre du PDF et le PDF défile jusqu’à cet endroit ; double-cliquez dans le PDF pour revenir à la source.
- **PDF dans sa propre fenêtre** : « Ouvrir le PDF dans une nouvelle fenêtre » dans la barre du PDF permet de placer le PDF sur un autre écran pendant que l’éditeur occupe toute sa fenêtre. Voir [Compilation et PDF](#/help/compiling).

## Ensuite

- [Éditeur](#/help/editor) : les deux modes, les tableaux et les figures, l’aperçu des équations, la vérification orthographique, le menu contextuel.
- [Collaboration](#/help/collaboration) : inviter des personnes, commentaires, suivi des modifications, discussion.
- [Agent IA](#/help/ai) : explications et modifications, appliquées seulement après votre relecture.
