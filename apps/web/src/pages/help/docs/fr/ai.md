# Agent IA

**IA** dans la barre latérale gauche ouvre l’agent IA. Il est disponible dès qu’un administrateur a connecté un service de modèles et vous a ajouté à un groupe IA ; le groupe détermine les modèles que vous pouvez utiliser.

## Ce qu’il fait

- Répond aux questions sur LaTeX et explique le code sélectionné.
- Explique ou corrige les erreurs de compilation (le journal a aussi un bouton « Corriger avec l’IA »).
- Réécrit, peaufine ou traduit la sélection.
- Donne une vue d’ensemble du projet, trouve les étiquettes jamais référencées, etc.

Le fichier ouvert, la sélection et les erreurs de compilation récentes sont joints à votre message ; cliquez sur une pièce jointe pour l’exclure.

## Autorisations

Ce que l’agent IA peut modifier dépend de vous : choisissez dans **Paramètres → Agent IA**, ou dans le sélecteur de modèle en bas du panneau (sous le niveau de réflexion) ; la ligne sous la zone de message l’indique. Le même choix s’applique à vos propres agents connectés via MCP (voir plus bas).

- **Manuel** (par défaut) : les modifications de l’agent IA vont dans un brouillon, et rien ne change tant que vous ne l’appliquez pas.
  1. Quand il a terminé, le brouillon fait l’objet d’une compilation d’essai et vous êtes informé s’il ajoute des erreurs.
  2. **Relire les modifications** affiche le diff par fichier ; vous pouvez n’en appliquer qu’une partie.
  3. **Appliquer la sélection** écrit les modifications dans le projet et compile ; si la compilation se dégrade, elles sont annulées. Une version est enregistrée avant l’application.
  4. Après l’application, **Annuler** revient sur les modifications et conserve celles que d’autres personnes ont faites entre-temps.
- **Auto** : le brouillon est appliqué dès que l’agent IA termine sa réponse, avec les mêmes garde-fous : une version est d’abord enregistrée, le projet est compilé, une compilation dégradée est annulée, et **Annuler** reste disponible ensuite. Si quelqu’un a modifié les mêmes lignes entre-temps, rien n’est appliqué et le brouillon vous attend. Quand vous arrêtez l’agent IA, son brouillon vous attend aussi.
- **Accès complet** : comme Auto, et l’agent IA peut aussi supprimer, déplacer et renommer des fichiers. Ces opérations ont lieu immédiatement, pas dans le brouillon ; une version est enregistrée avant la première de chaque réponse. La réponse les liste avec les fichiers modifiés.

Les lecteurs et les relecteurs peuvent interroger l’agent IA, mais il ne peut rien modifier pour eux.

## Le web

Une fois la recherche web configurée, l’agent IA peut chercher sur le web et lire des pages : les consignes aux auteurs actuelles d’une revue, les notes de version d’un paquet, une source pour vérifier une affirmation. Les modèles d’Anthropic, d’OpenAI et de ChatGPT utilisent leur propre recherche intégrée ; les autres, le service de recherche connecté par l’administrateur. Ses recherches et les pages lues apparaissent comme des étapes dans la conversation, et il indique de quelles pages vient une réponse.

Pour que rien de votre projet ne sorte par ce biais :
- Les recherches ne vont qu’au service de recherche choisi par l’administrateur (ou à la recherche propre au modèle) et font au plus 128 caractères.
- Il ne lit que les adresses que vous avez écrites dans la conversation ou que ses recherches ont renvoyées, telles quelles ; il ne peut pas inventer d’adresse.
- Il ne fait que lire : rien n’est téléversé ni envoyé.

N’importe qui peut écrire une page web, qui peut contenir des instructions destinées à tromper l’agent IA. Tant que vous avez le web, les modifications de l’agent IA attendent donc toujours votre relecture, même en **Auto** ou **Accès complet**, et il ne supprime ni ne déplace de fichiers. Vos outils IA (MCP) gardent votre autorisation.

## Modèles et réflexion

- Choisissez le modèle en bas du panneau. Avec **Auto**, ColTex choisit un modèle léger ou puissant selon la question.
- Pour les modèles capables de réfléchir, le niveau se règle dans le même sélecteur ; la ligne sous la zone de message l’indique.

## Conversations et contexte

- Les conversations sont enregistrées pour vous, par projet (les autres ne les voient jamais). **Nouvelle conversation** en démarre une autre ; **Conversations** liste les précédentes : ouvrez-les, renommez-les ou supprimez-les. Rouvrir une conversation la reprend là où elle s’était arrêtée ; un brouillon non appliqué n’est pas conservé, donc quitter une conversation qui en a un demande confirmation.
- L’anneau sous la zone de message montre quelle part de la fenêtre de contexte du modèle la conversation utilise (p. ex. `12k / 200k`). Il devient orange à 70 % et rouge à 90 %.
- Si votre groupe IA a une limite d’utilisation, une barre à côté montre ce que vous avez utilisé ce jour, cette semaine ou ce mois (survolez pour les détails). Une fois la limite atteinte, les messages attendent la période suivante. **Paramètres → Agent IA** affiche votre utilisation sur les 30 derniers jours et ce qui reste.
- Tapez `/` dans la zone de message pour les commandes :
  - `/compact` : résume la conversation jusqu’ici et continue à partir du résumé, ce qui libère le contexte. Les messages restent visibles ; l’agent IA s’en souvient grâce au résumé.
  - `/new` : démarre une nouvelle conversation.
  - `/chats` : les conversations précédentes.
- La zone de message s’agrandit avec ce que vous tapez. Faites glisser son bord supérieur pour l’agrandir (c’est retenu dans ce navigateur, aussi pour la discussion du projet) ; double-cliquez sur le bord pour revenir en arrière.

## Skills

Un skill est un ensemble d’instructions pour une tâche que vous faites souvent, par exemple « raccourcir un résumé à la limite de la revue » ou « vérifier que chaque figure est référencée ». Les skills utilisent le format Agent Skills (un `SKILL.md` avec un nom, une description et les instructions) : les skills écrits pour d’autres agents IA fonctionnent donc ici aussi.

- **Vos skills** se trouvent dans **Paramètres → Skills IA** ; vous seul les voyez, et vous pouvez les utiliser dans tous les projets.
- Pour ajouter des skills que vous avez déjà, utilisez **Importer** : **Téléverser des fichiers** accepte un `SKILL.md` avec ses fichiers de référence, ou un `.zip` de dossiers de skills ; **Téléverser un dossier** accepte le dossier d’un skill, ou un dossier qui en contient plusieurs. Les scripts d’un skill sont conservés comme texte que l’agent IA peut lire ; rien dans un skill n’est jamais exécuté.
- Utilisez-en un en tapant `/` et en le choisissant, puis ajoutez votre message (`/polish-abstract keep it under 200 words`). L’agent IA lit aussi les descriptions et charge de lui-même un skill quand votre demande y correspond.
- Demandez à l’agent IA de transformer quelque chose en skill (« enregistre comme skill la façon dont nous venons de corriger la bibliographie ») : il en rédige un dans la conversation, et vous le modifiez ou l’enregistrez dans vos skills.
- Dans **Paramètres → Skills IA**, vos skills sont listés à gauche ; choisissez-en un pour lire ses instructions et ses fichiers de référence, ou **Créer avec l’IA** pour ouvrir une conversation avec l’agent IA dédiée à l’écriture de skills (**Améliorer dans la conversation** sur l’un de vos skills commence un message à son sujet). La conversation suit le skill intégré **skill-creator** : elle demande comment vous utiliseriez le skill, le rédige (avec des fichiers de référence quand ils sont utiles) et peut essayer un brouillon sur un texte que vous collez. Les brouillons ne sont enregistrés que lorsque vous les enregistrez ; en enregistrer un sous un nom déjà utilisé demande confirmation avant de remplacer. La conversation est conservée jusqu’à ce que vous en commenciez une nouvelle.
- ColTex est fourni avec des skills intégrés (listés sous **Intégrés**). Vous pouvez les lire et les télécharger, mais pas les modifier ; un skill à vous portant le même nom est utilisé à la place.
  - **skill-creator** : l’écriture de skills (la conversation des skills le suit).

## Vos propres outils d’IA (MCP)

Des outils d’IA comme Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline ou OpenCode peuvent travailler directement sur vos projets : les lister, lire leurs fichiers et y chercher, les modifier, compiler et lire le journal, consulter l’historique, et lire, ajouter des commentaires et y répondre. ColTex est pour eux un serveur MCP, avec une seule adresse pour tous vos projets ; l’outil indique le projet sur lequel il travaille.

Dans **Paramètres → Agent IA**, sous **Vos outils d’IA (MCP)**, choisissez votre outil à gauche et suivez les trois étapes : l’adresse, un jeton (**Créer un jeton** ; il n’est affiché qu’une fois) et la configuration à copier, avec les deux déjà remplis. Tout autre outil qui se connecte à des serveurs MCP en HTTP avec un en-tête pour le jeton fonctionne aussi (**Autre**). Les applications qui n’acceptent que des serveurs se connectant via OAuth (comme les connecteurs personnalisés de Claude ou de ChatGPT) ne peuvent pas encore se connecter.

Ce que vos outils peuvent modifier suit votre autorisation dans **Paramètres → Agent IA** :

- **Manuel** (par défaut) : leurs modifications deviennent vos suggestions, que vous et vos collaborateurs acceptez ou refusez dans **Relecture**. Les nouveaux fichiers sont créés directement.
- **Auto** : leurs modifications sont appliquées directement, comme les vôtres. Si le suivi des modifications est activé pour vous, ce sont malgré tout des suggestions.
- **Accès complet** : comme Auto, et ils peuvent aussi supprimer, déplacer et renommer des fichiers.

Avant la première modification d’un outil depuis un moment, l’état du projet est enregistré comme version, pour que vous puissiez revenir en arrière. Les outils des relecteurs ne peuvent que suggérer des modifications, ceux des lecteurs ne peuvent que lire et commenter.

### Sécurité

- Quiconque possède votre jeton agit en votre nom : gardez-le comme un mot de passe, et révoquez-le dans la liste des jetons quand vous n’en avez plus besoin (un jeton par outil ou par ordinateur rend cela facile). Ne donnez à chaque jeton que ce dont il a besoin lors de sa création :
  - **Utilisé pour** : Git, MCP ou les deux. Un jeton créé uniquement pour MCP ne peut ni cloner ni pousser, et inversement.
  - **Accès** : **Lecture seule** permet à un outil de lister, lire, rechercher et compiler, mais pas de modifier des fichiers ou des commentaires (et permet à git de cloner et de tirer, pas de pousser), quelle que soit votre autorisation.
  - **Projets** : tous vos projets, ou seulement ceux que vous choisissez ; les autres n’existent pas pour le jeton.
  - **Expiration** : après 30 jours, 90 jours, un an, ou jamais. Un jeton expiré cesse de fonctionner ; révoquez-le et créez-en un nouveau.
- ColTex ne fait que répondre à votre outil ; il ne se connecte jamais à d’autres serveurs MCP. Ce que votre outil peut faire d’autre (un navigateur via Playwright MCP, un terminal, d’autres services) dépend de l’outil et de ses propres réglages. Le texte, les commentaires et les journaux d’un projet peuvent être écrits par vos collaborateurs : un outil qui les lit pourrait donc se voir demander, dans ce texte, de faire quelque chose avec ses autres capacités. ColTex indique aux outils de traiter le contenu du projet comme du contenu, pas comme des instructions, mais seul votre outil peut l’imposer : gardez ses propres confirmations activées pour les actions hors de ColTex, et utilisez **Manuel** quand un outil dispose aussi d’un navigateur ou d’un terminal.
- Un outil disposant d’un navigateur connecté à ColTex agit avec tous vos droits via les pages web, pas via MCP : l’autorisation ci-dessus ne le limite donc pas là. Faites utiliser à ces outils un profil de navigateur qui n’est pas connecté.
