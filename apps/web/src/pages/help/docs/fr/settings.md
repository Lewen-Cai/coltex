# Paramètres

Cliquez sur votre avatar en bas à gauche et choisissez **Paramètres**.

- **Compte** : votre nom affiché (visible par les collaborateurs, dans les commentaires et dans l’historique), la couleur de votre avatar (c’est aussi celle de votre curseur dans l’éditeur ; **Automatique** est celle que ColTex a choisie) et votre mot de passe. Changer le mot de passe peut déconnecter vos autres appareils. Un mot de passe doit comporter au moins 8 caractères, dont une majuscule, une minuscule et un chiffre ; les symboles sont facultatifs. L’évaluation affichée pendant la saisie (faible, moyen, bon, fort) augmente avec la longueur et les symboles. L’inscription et les réinitialisations par un administrateur suivent les mêmes règles. Seul un administrateur peut changer votre e-mail de connexion. La validation en deux étapes et votre activité de connexion se trouvent aussi sur cette page (voir ci-dessous).
- **Apparence** : le thème (Clair et Sombre en bleu, Forêt et Mousse en vert, Lavande et Prune en violet ; Clair par défaut), et la langue de l’interface (14 langues, dont English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français et Deutsch ; elle démarre dans la langue de votre navigateur). Les thèmes sombres s’appliquent aussi à l’éditeur ; les pages du PDF restent blanches. Le thème est conservé avec votre compte et vous suit donc dans les autres navigateurs (la page de connexion utilise toujours Clair) ; la langue est conservée dans ce navigateur.
- **Services de synchronisation** : connectez votre compte Zotero (voir [Références](#/help/references)), et créez et révoquez des jetons git (voir [Fichiers](#/help/files)) : chacun pour Git, MCP ou les deux, en lecture et écriture ou en lecture seule, pour tous vos projets ou certains, avec une date d’expiration. Utilisez un jeton par ordinateur, pour pouvoir le révoquer séparément.
- **Groupes** : les groupes dont vous faites partie, les invitations à accepter ou refuser, et la création de groupes ; voir plus bas.
- **Agent IA** : votre utilisation de l’IA sur les 7, 30 ou 90 derniers jours (requêtes, jetons, coût, par jour et par modèle) et ce qui reste de votre limite (si vous avez accès à l’agent IA), ce que les agents IA peuvent modifier pour vous (**Autorisations**), et la connexion de vos propres agents IA via **MCP**, avec leurs jetons ; voir [Agent IA](#/help/ai).
- **Skills IA** (si vous avez accès à l’agent IA) : vos propres skills, les skills intégrés, et une conversation avec l’agent IA pour écrire des skills ; voir [Agent IA](#/help/ai).

## Groupes

**Paramètres → Groupes** liste les groupes dont vous faites partie. Un projet peut être partagé avec tout un groupe (voir [Collaboration](#/help/collaboration)), et les administrateurs partagent des modèles avec des groupes (voir [Modèles](#/help/templates)).

- Tout le monde peut créer un groupe : **Créer un groupe**, puis un nom. Vous en êtes le propriétaire.
- Les propriétaires invitent toute personne ayant un compte sur ce serveur avec **Inviter quelqu’un par nom ou e-mail**. Elle reçoit une notification et rejoint le groupe avec **Rejoindre** sous **Invitations** sur cette page, ou décline avec **Refuser**. D’ici là, elle apparaît comme **Invité**, et le propriétaire peut **Retirer l’invitation**.
- Dans le menu ⋯ d’un membre, les propriétaires peuvent **Rendre propriétaire** (ou **Rendre membre**) et **Retirer**. Le menu ⋯ du groupe propose **Renommer** et **Supprimer le groupe** aux propriétaires, et **Quitter le groupe**.
- Un groupe a toujours un propriétaire : le dernier en nomme un autre avant de partir, ou supprime le groupe.
- Quitter un groupe, en être retiré ou sa suppression fait perdre les projets partagés avec lui, sauf ceux auxquels vous avez été ajouté individuellement.

## Validation en deux étapes

Avec la validation en deux étapes activée, la connexion demande, après le mot de passe, un code d’une application d’authentification sur votre téléphone (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). C’est votre propre choix ; personne d’autre ne peut l’activer pour vous.

1. Dans **Paramètres → Compte**, sous **Validation en deux étapes**, cliquez sur **Activer** et saisissez votre mot de passe.
2. Scannez le code QR avec l’application (ou saisissez-y la clé de configuration), puis entrez le code à 6 chiffres qu’elle affiche.
3. Conservez les 10 **codes de récupération** (copiez-les ou téléchargez-les dans un fichier). Chacun vous connecte une fois à la place d’un code, si vous perdez votre téléphone. Ils ne sont affichés qu’à ce moment-là.

À la connexion, après le mot de passe, saisissez le code de l’application, ou cliquez sur **Utiliser un code de récupération**. **Ne plus demander sur cet appareil pendant 30 jours** évite le code dans ce navigateur. **Nouveaux codes de récupération** remplace les anciens (conservez les nouveaux) ; **Désactiver** revient au mot de passe seul. Les jetons Git et MCP fonctionnent comme avant.

> Vous avez perdu à la fois le téléphone et les codes de récupération ? L’administrateur système peut désactiver la validation en deux étapes de votre compte sur le serveur (`coltex reset-2fa <email>`) ; vous vous connectez alors avec votre mot de passe et pouvez la réactiver.

## Activité de connexion

**Activité de connexion**, en bas de **Paramètres → Compte**, liste les connexions à votre compte, les plus récentes en premier : la date, le résultat (connecté, mauvais mot de passe, mauvais code, refusé), le navigateur et le système, et l’adresse avec sa provenance : le réseau local, Tailscale, ou pour une adresse sur Internet son pays, sa région, sa ville et son opérateur réseau. Les lieux viennent d’une base de données sur le serveur ; les adresses ne sont jamais envoyées ailleurs pour les localiser. Les enregistrements sont conservés 90 jours.

Les paramètres de l’éditeur (taille de police, couleurs, Vim…) se trouvent sous **Paramètres** en bas de la barre latérale gauche de l’éditeur ; voir [Éditeur](#/help/editor).
