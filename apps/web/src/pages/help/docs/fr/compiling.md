# Compilation et PDF

## Compilateur et document principal

Les paramètres du projet contiennent le **Compilateur** et le **Document principal** :

- **Automatique** (par défaut pour les nouveaux projets) : choisi à chaque compilation d’après le document. XeLaTeX quand le préambule (avec les fichiers qu’il charge par `\input` et les `.sty`/`.cls` propres au projet) charge `ctex`, `xeCJK`, `fontspec`, `unicode-math` ou similaires, ou que la classe est `ctexart`/`ctexbook` etc. ; LuaLaTeX quand il charge `luacode` ou `luatexja` ; pdfLaTeX sinon. Une première ligne `% !TEX program = xelatex`, ou un `latexmkrc` dans le projet, décide à la place.
- **pdfLaTeX** : le choix habituel pour les documents en anglais.
- **XeLaTeX** : nécessaire pour le chinois (ctex) et les polices système.
- **LuaLaTeX** : prend aussi en charge les polices système.

Choisir un moteur l’utilise à chaque fois, sans détection.

> Pour le chinois, chargez `\usepackage[UTF8]{ctex}` (ou utilisez la classe `ctexart`) et Automatique passe à XeLaTeX. Du texte chinois sans ctex échoue sous pdfLaTeX avec « Unicode character … not set up for use with LaTeX ».

Le document principal est le fichier à partir duquel une compilation démarre ; choisissez-le sous **Document principal** dans les paramètres du projet.

Les compilations utilisent le TeX Live complet avec latexmk, qui lance LaTeX, BibTeX/Biber et les index autant de fois que nécessaire. Elles s’exécutent isolées, sans accès au réseau, et le shell escape est restreint.

## Options de compilation

La flèche à côté de **Recompiler** propose :

- **Compilation automatique** : compile quand vous faites une pause dans la saisie (une compilation à la fois par projet, quel que soit le nombre de personnes qui tapent).
- **Mode de compilation** : Normal ou Rapide [brouillon]. Le mode brouillon laisse de côté les images et va plus vite.
- **Gestion des erreurs de compilation** : s’arrêter à la première erreur, ou essayer de compiler malgré les erreurs.
- **Nettoyer et recompiler** : quand une compilation semble incorrecte, supprime les fichiers auxiliaires et recompile de zéro.

Ces options sont conservées par projet dans ce navigateur.

## Journaux

Le nombre sur **Journaux** est le nombre d’erreurs. Le journal liste les erreurs, les avertissements et les problèmes de composition :

- chacun avec le message LaTeX et, pour les problèmes courants, une explication (un package manquant, par exemple, indique le package à ajouter) ;
- cliquez sur l’un d’eux pour aller à son fichier et à sa ligne ;
- le journal brut est là aussi, et l’IA peut expliquer ou corriger les erreurs.

> Quand une compilation échoue, le PDF de la dernière compilation réussie reste affiché.

## Entre la source et le PDF

- **Source → PDF** : le curseur dans la source, cliquez sur **Localiser** dans la barre du PDF (ou « Aller au PDF » dans le menu contextuel) ; le PDF défile jusqu’à cet endroit et le met en évidence.
- **PDF → source** : double-cliquez dans le PDF ; l’éditeur ouvre le fichier à cette ligne.

## Disposition : éditeur, PDF ou les deux

Le sélecteur de vue (quatre petits boutons à droite de la barre du PDF) affiche **Éditeur seul**, **Éditeur et PDF** côte à côte ou **PDF seul**, comme dans Overleaf, et le quatrième ouvre le PDF dans une nouvelle fenêtre ; ce navigateur retient le choix. Faire glisser le séparateur jusqu’au bord masque aussi ce volet.

- Avec l’éditeur seul, **Recompiler** et le même sélecteur se trouvent au bout de la barre d’outils de l’éditeur.
- **Aller au PDF** depuis l’éditeur affiche le PDF quand il est masqué.
- Dans une fenêtre étroite (tablette ou téléphone), il n’y a de place que pour un volet à la fois, et les panneaux latéraux (fichiers, recherche…) recouvrent l’éditeur quand ils sont ouverts.

## Le PDF dans sa propre fenêtre

**Ouvrir le PDF dans une nouvelle fenêtre** (le dernier bouton du sélecteur de vue) ouvre le PDF dans une fenêtre séparée que vous pouvez déplacer sur un autre écran :

- La fenêtre de l’éditeur perd son volet PDF et l’éditeur l’occupe entièrement ; **Recompiler** passe au bout de la barre d’outils de l’éditeur.
- La fenêtre du PDF propose Recompiler, Journaux, aller au PDF et télécharger. Double-cliquer dans son PDF renvoie à la source dans la fenêtre de l’éditeur.
- **Afficher le PDF ici** dans la barre d’outils de l’éditeur, ou fermer la fenêtre, fait revenir le volet PDF.

## Téléchargements

- La barre du PDF télécharge le PDF actuel.
- Le bouton de téléchargement en haut de l’arborescence des fichiers télécharge les fichiers sources du projet en .zip.
- Dans la liste des projets, le menu d’un projet (⋯) propose **Télécharger le PDF**, qui le compile d’abord, et **Télécharger le .zip** pour tous ses fichiers sources.
