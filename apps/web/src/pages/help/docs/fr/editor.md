# Éditeur

## Mode code et mode visuel

**Code / Visuel** dans la barre d’outils change la façon d’éditer ; les deux modes modifient la même source LaTeX.

- **Code** : la source elle-même, avec coloration, saisie semi-automatique et appariement des parenthèses. Quand le curseur est dans des maths, l’équation composée s’affiche au-dessus (`Esc` la masque).
- **Visuel** : titres, gras, listes, maths, tableaux et figures apparaissent composés ; la source s’affiche là où se trouve le curseur. Pratique pour lire et modifier le texte.

## Barre d’outils

Niveau de titre, gras, italique, maths, symboles, liens, `\ref`, `\cite`, figures, tableaux, listes et recherche. Les boutons qui ne tiennent pas passent dans le menu **⋯**.

- **Symboles** (Σ) : lettres grecques, opérateurs, flèches et plus encore, par catégorie ; cliquez pour insérer.
- **Tableaux** : choisissez la taille à l’insertion. En mode visuel, cliquez sur un tableau pour modifier ses cellules (`Tab` passe de l’une à l’autre) ; sa barre d’outils ajoute et supprime des lignes et des colonnes, fusionne des cellules et règle l’alignement et les bordures.
- **Figures** : téléversez une image, choisissez-en une dans le projet, ou collez ou déposez une image dans l’éditeur. En mode visuel, le bouton de modification d’une figure change sa largeur, sa légende et son étiquette.

## Saisie semi-automatique

Taper `\` suggère des commandes ; `\ref{` et `\cite{` listent les étiquettes et les clés bibliographiques du projet. `Ctrl+Space` ouvre les suggestions à tout moment.

## Erreurs

- **Erreurs de compilation** : les erreurs et avertissements de la dernière compilation dans le fichier ouvert reçoivent un point à côté du numéro de ligne, et les erreurs sont soulignées. Survolez pour voir le message LaTeX et une explication.
- **Vérification du code** : vérifie pendant la saisie, sans compiler : environnements non fermés ou mal appariés, `}` ou `$` en trop, commandes mathématiques hors des maths. L’endroit où vous tapez n’est pas signalé. Entourez une partie de `%%begin novalidate` et `%%end novalidate` pour l’ignorer.

## Vérification orthographique

Les mots mal orthographiés sont soulignés d’un pointillé rouge (le texte CJK n’est pas vérifié). Faites un clic droit sur l’un d’eux pour des suggestions ou **Ajouter au dictionnaire**. La langue est un paramètre du projet.

Votre dictionnaire se trouve sous **Paramètres → Dictionnaire** en bas de la barre latérale de l’éditeur ; ses mots sont considérés comme corrects dans tous vos projets. Tapez dans le champ pour trouver un mot, et appuyez sur Entrée pour l’ajouter s’il n’y est pas encore ; les lettres au-dessus de la liste sautent à cette lettre. Le menu **⋯** importe un fichier texte (un mot par ligne, ou séparés par des espaces ou des virgules ; les fichiers Hunspell `.dic` fonctionnent aussi), exporte vos mots dans `dictionary.txt` et les supprime tous. Les éditeurs ouverts revérifient aussitôt les mots.

## Menu contextuel

Couper, copier, coller, tout sélectionner, supprimer, aller au PDF et ajouter un commentaire. Sur `\ref{…}`, il propose **Aller à l’étiquette** ; sur `\input{…}` ou `\include{…}`, **Ouvrir le fichier**.

## Plan et fil d’Ariane

- **Plan du fichier**, sous l’arborescence des fichiers, liste les sections du fichier ouvert ; cliquez sur l’une d’elles pour y aller. La section où vous êtes est mise en évidence.
- La ligne au-dessus de l’éditeur affiche « fichier › section › sous-section » pour le curseur ; cliquez sur une section pour y aller. Elle peut être désactivée dans les paramètres de l’éditeur.

## Recherche

`Mod+F` (ou `Mod+Shift+F`, ou le bouton de recherche de la barre d’outils) ouvre le panneau **Recherche** à gauche avec le texte sélectionné déjà saisi. Il cherche dans tout le projet, les occurrences du fichier ouvert en premier, avec expressions régulières, respect de la casse et mot entier, et remplace une occurrence ou toutes. Une version est enregistrée avant de tout remplacer.

## Paramètres de l’éditeur

**Paramètres**, en bas de la barre latérale gauche, regroupe ses réglages en catégories à gauche :

- **Projet** : compilateur, document principal, langue de vérification orthographique (modifiés par les éditeurs, pour tout le monde), et l’adresse de clonage Git ;
- **Apparence** : taille de police, police (chasse fixe ou sans empattement), interligne, **Couleurs du code** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark et d’autres, en mode code uniquement), fil d’Ariane ;
- **Édition** : raccourcis (par défaut, Vim ou Emacs) et interrupteurs pour la vérification du code, l’aperçu des équations, la fermeture automatique des parenthèses et la saisie semi-automatique ;
- **Raccourcis clavier** : voir ci-dessous ;
- **Actions** : nombre de mots, copie, export vers Word, conversion de modèle, publication comme modèle.

L’apparence, l’édition et les raccourcis vous sont propres, conservés dans ce navigateur, pour tous les projets.

## Raccourcis clavier

**Raccourcis** dans la barre latérale gauche les liste tous. Les plus utilisés :

| Action | Touches |
| --- | --- |
| Compiler | `Mod+S` ou `Mod+Enter` |
| Annuler / rétablir | `Mod+Z` / `Mod+Shift+Z` |
| Rechercher et remplacer | `Mod+F` |
| Gras / italique | `Mod+B` / `Mod+I` |
| Commenter ou décommenter les lignes | `Mod+/` |
| Aller à la ligne | `Mod+Alt+G` |
| Commenter la sélection | `Mod+Alt+M` |
| Afficher les suggestions | `Ctrl+Space` |

Les touches sont affichées pour votre système : ⌘, ⌥ et ⇧ sur Mac, Ctrl, Alt et Shift sous Windows et Linux. Ce sont les touches par défaut.

### Vos propres raccourcis

Dans **Raccourcis clavier**, dans les paramètres, cliquez sur **Modifier** à côté d’une commande et appuyez sur les nouvelles touches. Elles doivent inclure Ctrl (⌘ sur Mac) ou Alt ; les touches utilisées par une autre commande, ou réservées au navigateur et à l’édition de base (annuler, copier, coller, tout sélectionner…), ne peuvent pas être prises. Rétablissez-en une, ou toutes. Les infobulles de la barre d’outils et la liste des raccourcis affichent alors vos touches.
