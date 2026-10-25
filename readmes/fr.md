<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Un éditeur LaTeX collaboratif auto-hébergé, avec un agent IA intégré.</strong><br>
  Votre serveur · Vos comptes · Vos données · Collaboration en temps réel · Open source (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd><b>Français</b></kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Installation</a> · <a href="#configure">Configuration</a> · <a href="../CHANGELOG.md">Journal des modifications</a> · <a href="https://github.com/coltexeditor/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/coltexeditor/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/coltexeditor/coltex?style=flat-square&amp;color=2563eb" alt="Dernière version"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/coltexeditor/coltex/actions/workflows/ci.yml"><img src="https://github.com/coltexeditor/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<a id="quick-start"></a>
## Démarrage rapide

Il vous faut une machine Linux ou macOS avec Docker (sous Linux, l’installateur peut l’installer), au moins 2 cœurs de CPU et 4 Go de mémoire. Les images sont précompilées pour x86-64 et ARM64.

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

Ouvrez ensuite `http://<serveur>:3690` et créez le compte administrateur.

<p align="center">
  <img src="../docs/images/editor.png" alt="L’éditeur ColTex : les fichiers, la source LaTeX, le PDF compilé et l’agent IA" width="900">
</p>

<a id="why"></a>
## Pourquoi ColTex ?

ColTex est une alternative à Overleaf pour une équipe de recherche, un laboratoire ou vous seul, qui fonctionne sur un ordinateur que vous contrôlez : un poste du labo, un serveur à la maison ou une machine dans le cloud.

- **Tout reste sur votre serveur.** Les projets, l’historique, les comptes et les compilations n’en sortent jamais. TeX s’exécute dans un conteneur isolé, sans accès à Internet.
- **Conçu pour écrire à plusieurs.** Plusieurs personnes modifient le même fichier en même temps, avec commentaires, suivi des modifications, discussion et historique des versions.
- **Un agent IA qui travaille sur votre projet.** Il lit les fichiers et le journal de compilation, rédige des modifications, les compile pour essai et vous montre un diff. Rien n’est écrit tant que vous ne l’appliquez pas.
- **Une seule commande pour installer, aucun port à ouvrir.** Tailscale et Cloudflare Tunnel sont intégrés pour l’accès à distance.

<a id="features"></a>
## Fonctionnalités

### Écrire et compiler
- Éditeur de code (CodeMirror) et éditeur visuel avec l’éditeur de tableaux et la boîte de dialogue des figures d’Overleaf, barre d’outils, palette de symboles, plan et fil d’Ariane.
- Complétions LaTeX, vérification du code, aperçu des équations, vérification orthographique dans de nombreuses langues, nombre de mots, recherche et remplacement dans tout le projet, et raccourcis Vim ou Emacs.
- Compilation avec latexmk sur un TeX Live complet. Le moteur (pdfLaTeX, XeLaTeX ou LuaLaTeX) est choisi d’après le document, chinois compris (ctex, xeCJK).
- Aperçu PDF avec SyncTeX dans les deux sens, y compris dans une fenêtre séparée. Les erreurs de compilation sont soulignées dans la source, avec des explications en langage clair.
- Références : citez depuis vos fichiers `.bib`, cherchez dans Crossref et arXiv (ou collez un DOI ou un identifiant arXiv) pour ajouter des entrées, ou importez une bibliothèque ou une collection Zotero et gardez-la synchronisée.

### Collaboration
- Édition en temps réel avec les curseurs de chacun, commentaires avec @mentions, suivi des modifications (accepter, refuser et annuler une décision), discussion du projet et notifications dans l’application.
- Rôles par projet : propriétaire, éditeur, relecteur (suggestions uniquement) et lecteur.
- Historique des versions à la manière de git : versions automatiques, versions enregistrées avec un message, et annulation des modifications d’une version.
- Accès Git : clonez un projet, travaillez-y en local et poussez vos modifications (jetons personnels ; les modifications faites entre-temps dans le navigateur sont fusionnées).

### Agent IA
- Posez des questions sur LaTeX, votre projet ou votre rédaction, ou laissez-le corriger les erreurs de compilation. Il rédige les modifications dans une copie privée, les compile pour essai et affiche un diff ; vous appliquez tout ou partie.
- L’application enregistre d’abord une version et recompile ; si la compilation se dégrade, la modification est annulée automatiquement.
- Fournisseurs : clés API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter et d’autres), connexion par abonnement (Claude Pro/Max, ChatGPT, GitHub Copilot et d’autres), ou votre propre serveur compatible OpenAI (Ollama, vLLM, LM Studio).
- Choix automatique du modèle (un modèle léger ou puissant pour chaque message), accès par groupe de personnes, utilisation par personne, et limites d’utilisation par jour, semaine ou mois.
- Conversations enregistrées par projet, fenêtre de contexte affichée au fil de l’eau, et `/compact` pour résumer une longue conversation.
- Skills : vos propres instructions (format Agent Skills), pour tous vos projets, que l’agent suit, utilisées avec `/name` ; écrivez-les vous-même, importez-les ou créez-les avec l’IA dans les Paramètres.
- Autorisations à la manière de Claude Code : les modifications de l’agent IA attendent votre relecture (Manuel), s’appliquent quand il a terminé (Auto), ou il peut aussi supprimer et déplacer des fichiers (Accès complet).
- Votre propre agent (Claude Code, Codex, Cursor…) via MCP : une seule adresse pour tous vos projets, avec les mêmes autorisations (en Manuel, ses modifications deviennent vos suggestions).

### Projets et administration
- Modèles pour IEEE, ACM, Springer LNCS, Elsevier, REVTeX et arXiv, et conversion d’un article d’un modèle de revue à un autre.
- Import et export de zip Overleaf, fichiers liés depuis une URL ou un autre projet, étiquettes, archive et corbeille.
- Pas d’inscription publique : les comptes viennent de liens d’invitation. Un administrateur système, et des administrateurs qui gèrent chacun l’équipe qu’ils ont invitée.
- Surveillance, sauvegardes WebDAV (chiffrées en option), stockage local ou compatible S3, thèmes clairs et sombres, et une interface en 14 langues (anglais, chinois, japonais, coréen, espagnol, français, allemand, portugais, italien, russe, turc, vietnamien et indonésien).
- Sécurité des comptes : validation en deux étapes avec une application d’authentification, un journal des connexions avec le lieu de chaque adresse (recherché sur le serveur) et une protection contre la devinette des mots de passe qui verrouille le compte pour les adresses inconnues, le tout sans service tiers.

<a id="install"></a>
## Installation

Si le téléchargement est interrompu (`curl: (35) Recv failure: Connection reset by peer`, fréquent quand GitHub est difficile à joindre), relancez la commande.

Il demande la langue et l’édition de TeX Live (touches fléchées), place la dernière version publiée dans `~/coltex`, télécharge les images précompilées avec une barre de progression, démarre ColTex et affiche les adresses à ouvrir. La sortie complète va dans `~/coltex/install.log`. Ouvrez ensuite `http://<server>:3690` et créez le compte administrateur. L’accès à distance par Tailscale ou Cloudflare Tunnel s’active plus tard dans **Paramètres → Réseau**.

Le premier démarrage télécharge TeX Live. Choisissez une édition :

| Édition | Téléchargement | Disque (tout ColTex) | Espace libre à prévoir |
| --- | --- | --- | --- |
| **standard** (par défaut) | environ 3 Go | environ 12 Go | 20 Go |
| **full** (`--edition full`) | environ 8 Go | environ 23 Go | 35 Go |

Les deux contiennent tous les packages de TeX Live et compilent les mêmes documents, et l’agent IA fonctionne avec l’une comme avec l’autre. L’édition standard n’inclut pas les manuels des packages ; l’édition full ajoute les manuels et les sources, que l’agent IA peut aussi lire.

`--edition` et `--lang` répondent aux questions, ou les remplacent quand il n’y a pas de terminal. `--domain`, `--tailscale` et les options Cloudflare configurent l’accès à distance pendant l’installation, pour les installations scriptées. Ajoutez les options après `bash -s --` :

| Option | |
| --- | --- |
| `--domain tex.example.org` | HTTPS pour un serveur avec son propre domaine, via le Caddy fourni. Faites pointer le domaine vers le serveur et ouvrez les ports 80 et 443 |
| `--tailscale` | Place ColTex sur votre tailnet : affiche un lien de connexion et un code QR |
| `--cloudflare-token TOKEN` | Connecte un tunnel Cloudflare que vous avez créé pour votre propre domaine |
| `--cloudflare-quick` | Une adresse publique temporaire `trycloudflare.com`, pour essayer |
| `--edition full` | L’édition complète de TeX Live |
| `--lang LANG` | La langue de l’installateur, de `coltex` et de la page de configuration : `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` ou `id` (demandée si elle n’est pas indiquée) |
| `--port 3690` | Un autre port |
| `--version v0.0.1` | Une version précise (`main` pour la branche de développement) |
| `--build` | Construit les images à partir des sources sur cette machine au lieu de les télécharger |
| `--images REGISTRY` | D’où télécharger les images : `aliyun` (les mêmes images sur Alibaba Cloud), `ghcr` (`ghcr.io/coltexeditor`) ou un autre miroir de ghcr.io. Sans cette option, l’installateur prend celui des deux qui répond le plus vite depuis cette machine (les `registry-mirrors` de Docker ne s’appliquent qu’à Docker Hub, pas à ghcr.io) |

Sur un serveur joignable depuis Internet, ne vous connectez pas en simple `http://` : utilisez `--domain`, Tailscale ou un tunnel Cloudflare.

### Gérer et mettre à jour

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
coltex reset           # delete all data and start again from the setup page (asks first)
coltex uninstall       # remove ColTex from this machine: containers, data, images, this folder (asks first)
```

<a id="configure"></a>
## Configuration

Tout se règle dans le navigateur, sous **Paramètres** dans le menu utilisateur :

1. **Gérer les utilisateurs** et **Invitations** : invitez des personnes avec des liens (chacun ne sert qu’une fois, éventuellement pour un seul e-mail).
2. **Services d’IA** : connectez un fournisseur. Puis, dans **Utilisation et accès IA**, placez les personnes dans un groupe qui peut l’utiliser. Sans groupe, personne d’autre que l’administrateur système n’a accès à l’agent IA.
3. **Réseau** : les adresses auxquelles ColTex est joignable, ainsi que Tailscale et Cloudflare Tunnel.
4. **Stockage et sauvegardes** : sauvegardes quotidiennes ou hebdomadaires vers un dossier WebDAV (Nextcloud, un NAS…).

La documentation d’aide est intégrée : **Documentation** dans le menu utilisateur. L’exploitation du serveur (variables d’environnement, S3, restauration d’une sauvegarde) est décrite dans [docs/operations.md](../docs/operations.md) (en anglais).

<a id="development"></a>
## Développement

Node 24 ou plus récent, pnpm 11 et Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Chemin | |
| --- | --- |
| `apps/web` | L’application web : React, CodeMirror 6, PDF.js |
| `apps/server` | L’API : Fastify, comptes, projets, collaboration en temps réel, l’agent IA |
| `services/compiler` | Le worker de compilation dans un conteneur TeX Live |
| `packages/*` | Schémas partagés, analyseur de journaux, prise en charge du langage LaTeX, données de relecture et conversion de modèles |

La conception est décrite dans [docs/architecture.md](../docs/architecture.md) (en anglais).

<a id="acknowledgements"></a>
## Remerciements

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0) : ColTex reprend son analyseur de journaux et ses explications, la prise en charge du langage LaTeX, l’éditeur visuel, l’éditeur de tableaux, la vérification orthographique et le nombre de mots. Chaque fichier repris est listé dans [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`) : les fournisseurs de modèles et la boucle d’agent derrière l’agent IA.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0) : le suivi de l’état des fournisseurs et le choix automatique du modèle en sont adaptés.
- [Yjs](https://github.com/yjs/yjs) et [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT) : logos des fournisseurs. Les marques appartiennent à leurs propriétaires et servent uniquement à identifier le service.

<a id="license"></a>
## Licence

[AGPL-3.0](../LICENSE). Si vous faites fonctionner une version modifiée de ColTex pour d’autres personnes via un réseau, vous devez leur en proposer le code source. Le code tiers garde sa propre licence ; voir [NOTICE](../NOTICE).
