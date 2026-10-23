# Premiers pas

ColTex est un éditeur LaTeX collaboratif qui fonctionne sur votre propre serveur. Il ressemble beaucoup à Overleaf : la source à gauche, le PDF à droite, et plusieurs personnes peuvent modifier le même projet en même temps.

## Nouveaux projets

Cliquez sur **Nouveau projet** en haut à gauche, donnez-lui un nom et choisissez un modèle :

| Modèle | Classe |
| --- | --- |
| Article vierge | La classe `article` standard, le départ le plus simple |
| Prépublication arXiv | `article`, une colonne, auteurs avec affiliations (authblk), références natbib |
| Conférence IEEE / Revue IEEE | `IEEEtran` en mode conférence / revue |
| Conférence ACM / Revue ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, pour les LNCS et les autres actes Springer |
| Revue Elsevier | `elsarticle`, prépublication sur une colonne |
| APS (REVTeX 4.2) | `revtex4-2`, pour les revues Physical Review et AIP |

À part l’article vierge, chacun contient un résumé, des mots-clés, une équation, une figure, un tableau et un `references.bib`, et compile tel quel. Les classes sont les classes officielles fournies avec TeX Live. Les conférences qui publient de nouveaux fichiers de style chaque année (NeurIPS, ICML) ne sont pas dans TeX Live : téléversez les fichiers de l’année dans un projet et publiez-le comme modèle.

Les projets que d’autres ont publiés comme modèles (le format de thèse d’une équipe, par exemple) sont listés sous « Partagés sur ce serveur ».

Les nouveaux projets compilent en **Automatique** : le moteur est choisi à chaque compilation d’après le document ; voir [Compilation et PDF](#/help/compiling).

Pour reprendre un projet d’Overleaf, choisissez là-bas **Download Source** (télécharger la source), puis **Importer** le zip ici (jusqu’à 200 Mo). Le document principal est détecté, et le compilateur est lui aussi en Automatique.

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
