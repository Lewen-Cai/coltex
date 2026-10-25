# Déploiement et réseau

En production, ColTex utilise un seul port (3690 par défaut) : les pages, l’API, la collaboration en direct (WebSocket) et les notifications passent toutes par lui. Tout ce qui relaie HTTP et WebSocket fonctionne : cet ordinateur, un réseau local, Tailscale, Cloudflare Tunnel ou un serveur cloud. (3000 et 5173 sont les ports du serveur de développement.)

## Installation

Sous Linux ou macOS avec Docker, une seule commande :

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

Si le téléchargement est interrompu (`curl: (35) Recv failure: Connection reset by peer`, fréquent quand GitHub est difficile à joindre), relancez la commande.

Elle demande la langue et l’édition de TeX Live (touches fléchées ; `--edition` et `--lang` y répondent à la place), vérifie Docker (sous Linux, elle peut l’installer), place ColTex dans `~/coltex`, écrit les réglages, télécharge les images précompilées (x86-64 et ARM64) et le démarre, puis affiche les adresses à ouvrir sur cette machine et sur votre réseau. Le premier démarrage télécharge TeX Live. Il existe deux éditions :

| Édition | Téléchargement | Sur le disque (tout ColTex) | Espace libre à prévoir |
| --- | --- | --- | --- |
| **standard** (par défaut) | environ 3 Go | environ 12 Go | 20 Go |
| **full** (`--edition full`) | environ 8 Go | environ 23 Go | 35 Go |

Les deux contiennent le TeX Live complet et compilent de la même façon, et l’agent IA fonctionne avec l’une comme avec l’autre. L’édition standard n’inclut pas les manuels ni les sources des packages ; l’édition full les ajoute, et l’agent IA peut alors aussi lire les manuels. Avec l’édition standard, il répond à partir des fichiers des packages et de ses propres connaissances. Changez plus tard avec `coltex edition full` ou `coltex edition standard`.

L’accès à distance (Tailscale, Cloudflare Tunnel) s’active après l’installation, dans **Paramètres → Réseau** (voir plus bas). Pour une installation scriptée, des options peuvent aussi le configurer pendant l’installation :

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --tailscale
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Gérez-le ensuite avec `coltex` :

| Commande | Ce qu’elle fait |
| --- | --- |
| `coltex status` / `logs` | État / journaux |
| `coltex edition [standard\|full]` | Affiche ou change l’édition de TeX Live (télécharge l’autre image du compilateur) |
| `coltex update` | Met à jour vers la dernière version publiée (télécharge les nouvelles images) ; les données et les réglages sont conservés |
| `coltex stop` / `start` | Arrêter / démarrer |
| `coltex tailscale up` | Rejoindre votre tailnet (affiche un lien de connexion et un code QR) |
| `coltex cloudflare quick` | Une adresse Cloudflare publique temporaire |
| `coltex cloudflare token` | Un tunnel Cloudflare avec votre propre domaine (demande le jeton) |
| `coltex reset` | Supprime tout (comptes, projets, base de données) et repart de la page de configuration ; demande d’abord de taper `reset` |
| `coltex uninstall` | Retire ColTex de cette machine : conteneurs, base de données, données, images, la commande `coltex` et son dossier (Docker reste installé) ; demande d’abord de taper `uninstall` |

## Se connecter depuis n’importe quelle adresse

Le serveur accepte les connexions faites à sa propre adresse : ouvrez-le via `localhost`, une IP du réseau local, une adresse Tailscale ou un domaine, sans avoir à les lister au préalable. Une page d’un autre site ne peut connecter personne.

## Adresses utilisées par les liens

Les liens d’invitation et les adresses de clonage Git sont proposés une fois pour chaque adresse à laquelle ColTex est joignable, chacun avec son bouton de copie : vous choisissez celui que le destinataire peut ouvrir :

- **Réseau local** ou **Tailscale** : l’adresse à laquelle vous avez ouvert ColTex (reconnue d’après l’adresse) ;
- **Tailscale**, **Cloudflare** : les adresses du Tailscale ou du Cloudflare Tunnel intégrés tant qu’ils sont connectés. Elles apparaissent et disparaissent avec eux ; rien n’est à modifier quand l’un est désactivé ;
- **Adresse publique** : le `COLTEX_URL` du serveur, s’il est défini.

Les liens d’une invitation en attente restent dans la liste des invitations jusqu’à ce qu’elle soit utilisée ou expire.

## Tailscale

ColTex intègre Tailscale : il peut rejoindre votre tailnet comme appareil à part entière (nommé `coltex` par défaut). Rien n’est à installer sur le serveur, et cela fonctionne sur les serveurs sans environnement de bureau.

1. Dans **Paramètres → Réseau**, activez Tailscale.
2. Scannez le code QR avec un téléphone, ou ouvrez le lien sur n’importe quel appareil, et connectez-vous à votre tailnet. La page passe d’elle-même à Connecté.
3. Activez **Servir ColTex sur le tailnet**. Avec MagicDNS et HTTPS activés pour le tailnet, l’adresse est `https://coltex.<your tailnet>.ts.net`, sinon `http://coltex.<your tailnet>.ts.net`.

Si aucun navigateur ne peut encore atteindre la page des paramètres, lancez ceci sur le serveur :

```sh
coltex tailscale up
```

La commande active Tailscale, affiche le lien de connexion et un code QR dans le terminal, attend la connexion, puis sert ColTex sur le tailnet. `coltex tailscale status` affiche l’état, `coltex tailscale down` quitte le tailnet, `coltex tailscale off` désactive Tailscale.

`TS_HOSTNAME` change le nom de l’appareil. Le serveur exécute Tailscale lui-même : aucun conteneur ni privilège supplémentaire. Ses clés d’appareil sont conservées dans `data/tailscale` et ne figurent pas dans les sauvegardes ; après une restauration, reconnectez-vous.

Si le serveur exécute déjà Tailscale lui-même, les deux ne se gênent pas : celui intégré est un appareil à part entière et utilise le réseau en espace utilisateur (userspace networking), il ne modifie donc aucun réglage réseau du serveur. Vous n’en avez pas besoin non plus : ouvrez ColTex à l’IP Tailscale ou au nom MagicDNS du serveur avec `:3690`.

## Cloudflare Tunnel

ColTex intègre aussi Cloudflare Tunnel, uniquement comme tunnel : les gens se connectent toujours avec leur compte ColTex ; Cloudflare Access n’est pas nécessaire. Le serveur n’a besoin d’aucun port ouvert.

- **Tunnel rapide** : sans compte Cloudflare ; vous obtenez `https://<random>.trycloudflare.com`, qui change à chaque démarrage. Pour faire des essais.
- **Mon propre domaine** : avec votre domaine sur Cloudflare, créez un tunnel sous Zero Trust → Networks → Tunnels, copiez la commande sous « Run the following command » (pour n’importe quel système : Windows, macOS, Debian, Red Hat ou Docker) ; ColTex en extrait le jeton ; ajoutez au tunnel un nom d’hôte public (p. ex. `tex.example.org`) avec le service `http://localhost:3690`.

Activez-le avec l’interrupteur de la carte Cloudflare Tunnel dans **Paramètres → Réseau**, puis choisissez un lien temporaire ou un tunnel (celui enregistré, ou un nouveau à partir de la commande collée), ou dans un terminal avec `coltex cloudflare quick` / `coltex cloudflare token`. Une fois connecté, ses adresses apparaissent d’elles-mêmes dans les liens d’invitation. Le jeton est stocké chiffré et n’est plus jamais affiché.

Si le tunnel ne peut pas joindre Cloudflare en QUIC (un pare-feu, ou un proxy qui bloque l’UDP), ColTex le fait passer de lui-même en HTTP/2. Quand trycloudflare.com limite les liens temporaires (429 Too Many Requests), ColTex redemande de moins en moins souvent. Quand vous changez de tunnel, déplacez ses noms d’hôte publics vers le nouveau tunnel dans le tableau de bord Cloudflare ; d’ici là, ils répondent par Error 1033.

Si le serveur exécute déjà cloudflared pour son propre tunnel, les deux n’entrent pas en conflit, mais ne donnez pas à ColTex le jeton de ce tunnel : Cloudflare traiterait les deux comme des connecteurs du même tunnel et répartirait les requêtes entre eux, si bien que les autres noms d’hôte du serveur aboutiraient parfois à ColTex et échoueraient (502). Ajoutez plutôt à ce tunnel un nom d’hôte public pour ColTex (service `http://localhost:3690`) en laissant celui intégré désactivé, ou créez un tunnel séparé pour ColTex.

## Réglages du serveur

Ce sont des variables d’environnement du serveur. Avec Docker, placez-les dans le fichier `.env` à côté de `docker-compose.yml` et lancez `docker compose up -d`.

| Variable | Ce qu’elle fait |
| --- | --- |
| `COLTEX_PORT` | Le port, 3690 par défaut |
| `COLTEX_URL` | Une adresse publique proposée dans chaque lien, p. ex. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | D’autres adresses acceptées pour la connexion, séparées par des virgules. Nécessaire uniquement quand les pages et l’API sont à des adresses différentes |
| `TRUST_PROXY` | Avec un proxy inverse devant (Caddy, Nginx) : `uniquelocal` (proxy sur un réseau privé) ou `true`. S’il n’est pas défini, le serveur prend le proxy pour le visiteur : tout le monde partage une même adresse, donc les échecs de connexion d’une personne comptent contre tout le monde, et les enregistrements de connexion affichent l’adresse du proxy. Le Tailscale et le Cloudflare Tunnel intégrés n’ont besoin de rien ici |
| `TS_HOSTNAME` | Le nom d’appareil du Tailscale intégré, `coltex` par défaut |

**Arrivée des requêtes**, en bas de **Paramètres → Réseau**, affiche ces réglages et l’IP que voit le serveur, et signale les problèmes.

## Configurations courantes

| Configuration | Comment |
| --- | --- |
| Cet ordinateur uniquement | Les valeurs par défaut : `http://localhost:3690` |
| Réseau local | Ouvrez-le à l’adresse du serveur sur le réseau local, p. ex. `http://192.168.1.20:3690`. Les adresses locales peuvent changer ; réservez-en une dans le routeur pour un usage durable |
| Tailscale | Voir Tailscale ci-dessus |
| Cloudflare Tunnel | Voir Cloudflare Tunnel ci-dessus |
| Serveur cloud | Avec un domaine : installez avec `--domain tex.example.org` (faites pointer son DNS vers le serveur et ouvrez les ports 80 et 443). Le Caddy fourni obtient le certificat HTTPS ; le port 3690 ne répond alors que sur le serveur lui-même. Sans domaine : Cloudflare Tunnel ou Tailscale |

## Sécurité

- Pour une petite équipe, n’accéder à ColTex que via Tailscale ou un VPN est le plus simple : il n’est pas du tout visible sur Internet. Avec Cloudflare Tunnel, il est public, protégé par la connexion de ColTex.
- Sur Internet, utilisez HTTPS (Caddy, comme dans la configuration serveur cloud).
- Un pare-feu sur le serveur (ufw, firewalld) ne ferme pas les ports que Docker publie. Avec `--domain`, le port 3690 ne répond que sur le serveur lui-même ; avec Tailscale ou un tunnel Cloudflare à la place, fermez le port 3690 dans le pare-feu de votre fournisseur cloud.
- Il n’y a pas d’inscription publique, seulement des invitations ; les mots de passe ont des règles de robustesse ; chacun peut activer la validation en deux étapes. Les échecs de connexion ralentissent puis verrouillent un compte pour les adresses inhabituelles, et une adresse qui échoue sans cesse est bloquée pendant un jour (voir [Administration](#/help/admin)).
- Les pages de ColTex indiquent aux navigateurs de ne pas l’afficher dans d’autres sites (contre le clickjacking) et de n’exécuter que ses propres scripts ; avec `--domain`, Caddy leur indique aussi de n’utiliser que HTTPS (HSTS).
- Un port inhabituel n’arrête pas les scanners ; ne comptez pas dessus.
