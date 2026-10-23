# Fichiers

## L’arborescence des fichiers

- Les boutons de son en-tête : nouveau fichier, nouveau dossier, téléverser et ajouter un fichier lié.
- Faites glisser un fichier sur un dossier pour l’y déplacer ; double-cliquez sur un nom pour le renommer. Les fichiers déposés depuis votre ordinateur sont téléversés.
- Faites un clic droit sur un fichier ou un dossier pour créer, téléverser, renommer ou supprimer.
- Un point de couleur à côté d’un fichier signifie que quelqu’un d’autre l’a ouvert.

Les fichiers supprimés peuvent être récupérés depuis l’historique.

## Fichiers liés

Un fichier lié vient d’ailleurs et peut être actualisé depuis sa source à tout moment :

- **Depuis un autre projet** : n’importe quel fichier d’un autre projet, ou son PDF compilé (compilé d’abord). Utile pour des figures ou un `.bib` partagés, ou pour utiliser le PDF d’un projet comme figure dans un autre.
- **Depuis une URL** : téléchargé depuis une adresse publique (jusqu’à 50 Mo). Les adresses du réseau local ou privé ne peuvent pas être utilisées.

> Les fichiers liés portent une marque de lien dans l’arborescence ; survolez-la pour voir d’où ils viennent. Un clic droit puis **Actualiser le fichier lié** le récupère de nouveau et le remplace. Ajouter ou actualiser nécessite que vous ayez vous-même accès au projet source.

## Git

Chaque projet peut être cloné, tiré (pull) et poussé (push) avec git :

1. Créez un jeton pour Git dans **Paramètres → Services de synchronisation** (il n’est affiché qu’une fois ; conservez-le). Un jeton en **Lecture seule** peut cloner et tirer, mais pas pousser.
2. Copiez l’adresse de clonage depuis les paramètres du projet et lancez `git clone <address>`. Quand git le demande, saisissez n’importe quel nom d’utilisateur et le jeton comme mot de passe.
3. Faites vos commits en local puis `git push` : les modifications arrivent aussitôt dans le projet, où les collaborateurs les voient.

Bon à savoir :

- Chaque projet a une seule branche, `main`.
- Si quelqu’un a modifié le projet depuis votre dernier pull, git refuse le push : faites d’abord `git pull`, puis poussez de nouveau.
- Avant qu’un push soit appliqué, l’état du projet est enregistré comme version.
- Les relecteurs et les lecteurs ne peuvent pas pousser.
- Pour ne pas saisir le jeton à chaque fois : `git config --global credential.helper store` (ou `osxkeychain` sur Mac).
