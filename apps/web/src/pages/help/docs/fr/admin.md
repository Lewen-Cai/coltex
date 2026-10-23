# Administration

L’administrateur système voit les pages d’administration sous **Paramètres** dans le menu de l’avatar ; les administrateurs y voient **Gérer les utilisateurs** et **Invitations**, pour leur propre équipe.

## Utilisateurs et invitations

- Il n’y a pas d’inscription publique : les comptes ne viennent que de liens d’invitation, et les projets ne sont partagés qu’avec des personnes qui ont un compte.
- Chaque compte a l’un de trois rôles :
  - **Membre**.
  - **Administrateur** : dirige une **équipe**, par exemple un directeur de recherche et ses étudiants. Les membres qu’un administrateur invite rejoignent son équipe, et il ne gère qu’eux.
  - **Administrateur système** : il y en a exactement un, le compte créé lors de la configuration initiale. Il gère toute l’instance (services d’IA, sauvegardes, réseau) et voit tout le monde. Personne ne peut devenir un second administrateur système, si bien qu’un compte administrateur ne peut pas prendre le contrôle de l’instance.
- **Invitations** : des liens à usage unique, pour un e-mail ou (si l’e-mail est laissé vide) pour toute personne disposant du lien, avec une date d’expiration. Les liens d’une invitation en attente restent dans la liste (**Lien**), un pour chaque adresse à laquelle ColTex est joignable (réseau local, Tailscale, Cloudflare). L’administrateur système invite des membres ou des administrateurs et choisit le **Groupe IA** du nouveau compte. Les administrateurs n’invitent que des membres, dans leur propre équipe ; ces membres reçoivent le groupe IA de l’administrateur. Les administrateurs ne voient et ne révoquent que leurs propres invitations.
- **Gérer les utilisateurs** : l’administrateur système voit tous les comptes, rend des personnes membres ou administrateurs, déplace des membres d’une équipe à l’autre (**Équipe** dans le menu de la ligne), réinitialise les mots de passe, et suspend ou supprime des comptes. Un administrateur se voit lui-même et son équipe, et ne réinitialise les mots de passe, ne suspend ou ne supprime que les membres de son équipe. Supprimer un compte supprime les projets dont il est propriétaire.
- Pour transmettre le rôle d’administrateur système à quelqu’un d’autre (ou le récupérer quand ce compte est perdu), lancez `coltex cli system-admin <email>` sur le serveur ; l’ancien administrateur système devient administrateur.

## Services d’IA

- **Services d’IA** : connectez des fournisseurs avec des clés API ou une connexion par abonnement (Claude Pro/Max, ChatGPT, Copilot…), ou vos propres serveurs compatibles OpenAI (Ollama, vLLM, LM Studio…). Les clés sont stockées chiffrées, les membres ne les voient jamais, et les requêtes passent par ce serveur.
- Si une connexion par abonnement se termine sur une adresse localhost qui ne se charge pas, copiez l’adresse complète depuis la barre d’adresse et collez-la dans ColTex.
- Définissez les trois modèles d’**Auto** et tout le monde démarre avec le choix automatique : le modèle **arbitre** (un modèle bon marché et rapide) lit chaque message et le confie au modèle **léger** (questions rapides, petites corrections) ou au modèle **puissant** (plusieurs erreurs, modifications sur plusieurs fichiers, rédaction soignée). Tant que les trois ne sont pas définis, chacun démarre sur le premier modèle auquel il a accès.
- **Utilisation et accès IA** : requêtes et jetons pour le groupe et par personne. Qui peut utiliser quels modèles se règle avec les **Groupes IA** : chaque groupe autorise des fournisseurs (y compris les modèles ajoutés plus tard) ou des modèles précis, p. ex. « Doctorants » avec le modèle puissant et « Étudiants de licence » avec le léger. Chacun appartient à au plus un groupe, choisi dans l’invitation ou plus tard en ouvrant la personne dans la liste. Les personnes sans groupe ne peuvent pas utiliser l’agent IA : les nouveaux venus n’ont donc pas d’IA tant que l’administrateur système ne les a pas ajoutés (les membres invités par un administrateur reçoivent le groupe de celui-ci). L’administrateur système peut toujours utiliser tous les modèles. Supprimer un groupe laisse ses membres sans IA jusqu’à ce qu’ils en rejoignent un autre.

  Un groupe peut aussi limiter ce que chacun de ses membres utilise par jour, par semaine ou par mois : jetons, coût (au prix catalogue), ou les deux. Un message est refusé dès qu’un membre a atteint la limite, jusqu’au début de la période suivante (jours calendaires, semaines commençant le lundi, mois, dans le fuseau horaire du serveur) ; le message qui franchit la limite se termine malgré tout. Les membres voient ce qu’ils ont utilisé sous la zone de message de l’agent IA. L’administrateur système n’a pas de limite.

  Pour ajuster une seule personne, ouvrez-la dans la liste : sous **Personnaliser**, **Accès aux modèles propre** et **Limite d’utilisation propre** remplacent ceux de son groupe tant qu’ils sont activés (l’accès propre fonctionne aussi sans groupe). La liste la marque **Personnalisé**.

## Stockage et sauvegardes

- Les fichiers des projets sont conservés sur le disque local ou dans un stockage compatible S3, défini au démarrage du serveur (`STORAGE` et `S3_*`). L’historique, les résultats de compilation et les copies de travail du compilateur restent dans le répertoire de données.
- Les **sauvegardes WebDAV** vont dans un dossier sur Nextcloud, ownCloud, un NAS ou n’importe quel serveur WebDAV. Chaque sauvegarde est un seul fichier contenant la base de données, les fichiers de chaque projet et leur historique. Planifiez-les chaque jour ou chaque semaine et choisissez combien en conserver. Utilisez un mot de passe d’application quand le serveur en propose un.
> **Chiffrement** : les sauvegardes chiffrées (AES-256) contiennent aussi le secret de l’instance, pour que les services d’IA connectés continuent de fonctionner après une restauration. **Conservez le mot de passe ailleurs : sans lui, une sauvegarde ne peut pas être ouverte.**
- La restauration se fait sur le serveur avec la commande `restore`, serveur arrêté ; voir le guide d’exploitation.

## Surveillance

**Vue d’ensemble** montre l’état en direct du serveur, du compilateur et de la base de données, avec des graphiques d’historique pour le CPU, la mémoire et les compilations. Le serveur prend une mesure toutes les 10 secondes et conserve 30 jours, même quand personne n’a la page ouverte.

## Réseau

**Réseau** liste les adresses auxquelles ColTex est joignable (les invitations et les adresses Git les utilisent), active le Tailscale et le Cloudflare Tunnel intégrés, et montre comment les requêtes arrivent au serveur. Voir [Déploiement et réseau](#/help/deployment).
