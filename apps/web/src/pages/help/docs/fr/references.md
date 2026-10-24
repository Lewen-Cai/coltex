# Références

**Références** dans la barre latérale gauche travaille avec les fichiers `.bib` du projet.

## Citer

**Citer** liste toutes les entrées `.bib` du projet ; recherchez par auteur, titre, année ou clé. Cliquez sur une entrée pour insérer `\cite{key}` au curseur. Taper `\cite{` dans l’éditeur suggère aussi des clés.

## Rechercher et ajouter

Dans l’onglet **Ajouter**, saisissez un titre, des auteurs ou des mots-clés et appuyez sur Entrée ou sur **Recherche** : ColTex interroge Crossref (revues, actes, livres) et arXiv (prépublications) et liste ce qu’il trouve, les meilleurs résultats de chacun en premier. **+** ajoute un article au fichier `.bib` choisi sous le champ. Une prépublication dont arXiv connaît la version publiée est ajoutée par le DOI de cette version.

Un DOI (p. ex. `10.1145/3290605.3300857`), un lien doi.org ou un identifiant arXiv est ajouté directement, sans recherche (le bouton affiche alors **Ajouter**).

Les entrées sont récupérées sur doi.org et ajoutées à la fin du fichier avec une clé unique ; une entrée déjà présente dans le fichier (même DOI) n’est pas ajoutée deux fois. Vérifiez ce qui a été récupéré.

## Zotero

1. Dans **Paramètres → Services de synchronisation**, saisissez une clé API Zotero (créée dans vos paramètres sur zotero.org ; l’accès en lecture suffit). Elle est stockée chiffrée sur ce serveur et sert uniquement à lire votre bibliothèque.
2. Dans l’onglet **Zotero** du panneau Références, choisissez une bibliothèque ou une collection à importer comme fichier `.bib` dans le projet.
3. **Actualiser depuis Zotero** remplace ce fichier par le contenu actuel de Zotero : modifiez donc les entrées dans Zotero plutôt que dans le fichier.

L’actualisation utilise la connexion Zotero de la personne qui a importé le fichier.
