# Operating ColTex

How to store project files in S3, back up an instance, and restore it.
Commands assume the Docker Compose setup; with `pnpm dev`, run
`pnpm --filter @coltex/server cli <command>` instead of
`docker compose run --rm server node src/cli.ts <command>`.

## What lives where

| Data | Where |
|---|---|
| Accounts, projects, members, comments, chat, settings | PostgreSQL |
| Project files | `DATA_DIR/projects` (local) or an S3 bucket |
| History (versions) | `DATA_DIR/history`, one git repository per project |
| Git bridge repositories (git clone/push) | `DATA_DIR/git-bridge`, one per project that has been cloned |
| Instance secret (signs sessions, encrypts AI credentials) | `DATA_DIR/.secret`, or `COLTEX_SECRET` |
| Build output, compile caches, the S3 driver's local copies | `DATA_DIR/outputs`, the `compile-cache` volume, `DATA_DIR/projects` (rebuildable) |

Without `install.sh` on Linux, create `data/projects` and `data/outputs`
before the first `docker compose up` and give `./data` to `COLTEX_UID:COLTEX_GID`
(1000 by default): the compiler mounts those two folders on their own, and
folders Docker creates for a mount belong to root, which the server (not
root) can't write into. `coltex start`, `restart` and `deploy` check this
first and fix it (as root, or else through a throwaway container of the
server image run as root); a server that still can't use the folder stops
at once and says which `chown` to run, instead of restarting over and over.

Only ColTex's port (and Caddy's 80 and 443 with `--domain`) is published on
the host. PostgreSQL and Valkey stay inside Docker, so an install never
clashes with a database already running on the machine; development adds
their ports from `docker-compose.dev.yml` (`pnpm infra:up`, or
`COMPOSE_FILE` in the checkout's `.env`, as in `.env.example`).

## Addresses, proxies and tunnels

Everything (pages, API, collaboration WebSocket, notification stream) is served
on one port, so any forwarding that carries HTTP and WebSocket works: LAN,
Tailscale, Cloudflare Tunnel, or a reverse proxy.

- Sign-in accepts requests made to the address the server was reached at
  (same-origin: the request's own scheme and Host), plus `COLTEX_URL`,
  `TRUSTED_ORIGINS` (comma-separated; only for pages served from elsewhere),
  and the built-in Tailscale's and Cloudflare Tunnel's addresses. So LAN, Tailscale and domain addresses work without listing them.
- Links (invitations, Git) are offered for every address (`GET
  /api/instance`): `COLTEX_URL` when set, the tailnet's while the built-in
  Tailscale serves ColTex, the Cloudflare Tunnel's while connected, and the
  browser's own address. Leave
  `COLTEX_URL` out of `.env` in a development checkout: compose reads that
  file too.
- `TRUST_PROXY`: set it (`uniquelocal`, `true`) behind Caddy or Nginx, or every visitor gets the proxy's IP and one shared sign-in rate
  limit (better-auth: 3 sign-in attempts per 10 s per IP in production).
- `COLTEX_PORT`: the host port (default 3690; 3000 is the development
  server's).

Settings → Network (`pages/admin/network.tsx`, `GET/PUT /api/admin/network`)
shows and sets these, and warns about a proxy without `TRUST_PROXY`. The help section "Deployment and network" walks through
the usual setups.

### Tailscale

The server image ships `tailscaled` (copied from `tailscale/tailscale:v1.102.5`).
Settings → Network turns it on (`app_settings` key `network`, `tailscale: true`);
the server then runs it as a child process (`src/network/daemon.ts`:
userspace networking, as the server's own user, state and socket in
`DATA_DIR/tailscale`, restarted if it exits) and drives it over its LocalAPI
(`src/network/tailscale.ts`): status, sign-in (`PATCH prefs` WantRunning and
Hostname = `TS_HOSTNAME`, then `login-interactive` for the link), logout, and
`tailscale serve` (HTTPS on 443 when the tailnet issues certificates, else
HTTP on 80, proxying to `http://127.0.0.1:3690`). tailscaled must run as the
server's user: it takes changes over its socket only from its own user (as
root it answers 403). No extra container, capability or Docker socket.

Serve forwards from loopback with the visitor's tailnet address in
X-Forwarded-For, so Fastify trusts loopback in addition to `TRUST_PROXY`
(only processes inside the server's container connect from there).

Headless servers: `docker compose exec server node src/cli.ts tailscale up`
sets the setting, signals the server (`SIGUSR2`, pid in
`DATA_DIR/cache/server.pid`), prints the sign-in link with a terminal QR
code, waits, and turns serving on; `status`, `down` (leave the tailnet),
`off`. The device keys are not in backups (a restored copy would clash with
the running device); sign in again after a restore. The compiler can't see
`DATA_DIR/tailscale` (it mounts only `projects` and `outputs`).

### Cloudflare Tunnel

The image also ships `cloudflared` (from `cloudflare/cloudflared:2026.9.3`),
run by the server when an admin turns it on (`src/network/cloudflare.ts`, on
`src/network/process.ts` like tailscaled). A tunnel only: Cloudflare carries
the traffic, ColTex's accounts sign people in (no Access). `quick` runs
`cloudflared tunnel --url http://127.0.0.1:3690` (a trycloudflare.com address
that changes every start); `token` runs `cloudflared tunnel run` with
`TUNNEL_TOKEN` in the environment (never argv), its hostnames configured in
the dashboard pointing at `http://localhost:3690`. The token is sealed with
the instance secret in `app_settings` and never sent back. State comes from
the metrics server on `CLOUDFLARED_METRICS` (default `127.0.0.1:20241`:
`/ready`, `/quicktunnel`) and the configuration cloudflared logs (the
hostnames). cloudflared forwards from loopback with `X-Forwarded-For` and
`X-Forwarded-Proto`, which the loopback trust covers. CLI: `cloudflare
[status | quick | token [TOKEN] | off]` (token from the argument,
`$CF_TUNNEL_TOKEN`, or typed in); it only changes the setting and signals
the server, whose cloudflared is the only one.

`Supervised` keeps exactly one process: starts and stops are queued, each
start ends the previous run and any pending restart, and a restart is only
for the launch it was made for. A process that exits on its own is started
again after 5 s, doubling up to 5 min while it keeps failing (a run of 2 min
resets it); asking again with the same settings keeps the wait. For
cloudflared, a rate-limited quick tunnel (429 / error 1015) waits from 30 s
up to 30 min. Three QUIC dial timeouts in one run (UDP blocked, or a proxy
with fake IPs such as Clash's 198.18.0.0/15) restart it with `--protocol
http2` until the server restarts, unless `TUNNEL_TRANSPORT_PROTOCOL` is set
for the server. Known errors (rate limit, edge unreachable, metrics port
taken, invalid token) are shown explained; others as cloudflared logged
them, each line once.

### Installing with one command

`install.sh` (Linux/macOS): asks for the language, edition and access when
run in a terminal on a fresh install (arrow-key menus; options answer them;
`COLTEX_LANG` in `.env` — one of the web app's 14 language ids, `zh` from
older installs meaning `zh-CN` — also sets `coltex`'s language and the setup
page's first language; each language's messages are a `msg_<id>` function
at the top of `install.sh` and of `coltex`), shows each step with a spinner and the image download
with a bar (from `docker compose --progress json pull`; its total is asked of the
registries first with `docker manifest inspect -v`, less the layers already here, and every
byte count stays in awk, printed with `%.0f`, because some awks print large numbers in
exponent form; a pull that fails for anything but missing images stops with an error rather
than building TeX Live locally, in `install.sh` and `coltex deploy` alike), keeps the full
output in `install.log`, and on failure prints its end. It checks Docker (offers get.docker.com on Linux),
clones the repository (`DEFAULT_REPO` at the top; `--repo` or `COLTEX_REPO`
for a fork) into `~/coltex` or pulls it when
already there, writes `.env` once (port, a random `POSTGRES_PASSWORD`,
`COLTEX_UID/GID`, `TS_HOSTNAME`; `COLTEX_IMAGE_TAG` on every run), pulls the
images and starts (`coltex deploy`), waits for
`/api/health`, links `coltex` into `~/.local/bin`, and optionally runs
`--domain HOST`: writes `COLTEX_DOMAIN`, `COLTEX_URL=https://HOST`,
`TRUST_PROXY=uniquelocal`, `COMPOSE_PROFILES=proxy` (so every `docker compose`
and `coltex` command includes Caddy) and `COLTEX_BIND=127.0.0.1`; then it
`coltex tailscale up` / `coltex cloudflare quick|token`. `coltex` wraps
`docker compose` (start, stop, restart, status, logs, update) and the
server's CLI (`tailscale`, `cloudflare`, `cli …`).

### Prebuilt images

`.github/workflows/images.yml` builds the server and the compiler (both
editions) for linux/amd64 and linux/arm64, each on a native runner, and
pushes them to ghcr.io on every push to `main` and every `v*` tag:

| Image | Tags |
| --- | --- |
| `ghcr.io/coltexeditor/coltex-server` | `v0.0.2`, `latest`, `main` |
| `ghcr.io/coltexeditor/coltex-compiler` | the same, with `-standard` or `-full` |

`docker-compose.yml` names them from `.env`: `COLTEX_IMAGES` (the registry
and owner, for a fork), `COLTEX_IMAGE_TAG` (written by `install.sh` and
`coltex update` as the version they check out) and `COLTEX_EDITION`. Both
services keep their `build:` sections: `coltex deploy` pulls, and builds
from the checked-out sources when the pull fails (no images for that
version) or when `.env` has `COLTEX_BUILD=1` (`install.sh --build`). After
a deploy it removes the images the containers ran before. The packages must
be public on GitHub (package settings → visibility), or pulls are refused.

For mainland China the mirror job (`.github/workflows/mirror.yml`, called
after the merge) copies every image to Alibaba Cloud Container Registry with
the same tags: the amd64 and arm64 images, copied with `regctl` one layer
at a time over HTTP/1.1 and put together again with `docker buildx
imagetools create` (ACR's personal edition refuses the attestation
manifests buildx adds). ACR resets a connection after a while; uploading
every layer at once over one HTTP/2 connection broke them all together, so
the full edition never arrived. One at a time, a reset costs one layer and
the next try (six in all) skips the layers already there. The compiler
images keep TeX Live in layers of about a gigabyte (see
services/compiler/Dockerfile), which also helps downloads that break. It can also be run by hand (Actions → Mirror → Run
workflow, with the tag) to copy a version again. It runs only when the repository has the variable
`ALIYUN_IMAGES` (registry and namespace:
`crpi-jf7w2fwdvslokqcw.cn-guangzhou.personal.cr.aliyuncs.com/coltex`;
`install.sh` has the same value as `ALIYUN_IMAGES`) and the secrets
`ALIYUN_REGISTRY_USERNAME` and `ALIYUN_REGISTRY_PASSWORD`; the namespace's
repositories must be public (ACR: default repository type public, created
automatically on push).

It also copies the images docker-compose.yml takes from Docker Hub
(PostgreSQL, Valkey, Caddy, with their tags) into the same namespace: Docker
Hub is hard to reach from mainland China and its public mirrors there are
gone. `COLTEX_HUB_MIRROR` (written by `install.sh`: the ACR namespace with
Alibaba Cloud, empty otherwise) makes compose take them from there; the
workflow's list must follow the tags in docker-compose.yml.

Without `--images` (and without `COLTEX_IMAGES` from an earlier install),
`install.sh` picks whichever registry's `/v2/` answers faster from the
machine (Alibaba Cloud in mainland China, ghcr.io elsewhere; ghcr.io when
neither answers). Only the two registries are asked, without the shell's
proxy, since Docker's daemon doesn't use it. The choice is kept as `COLTEX_IMAGES`, so
`coltex update` stays with it. When the registry was picked this way and
Alibaba Cloud doesn't have the version yet (the mirror copies a release
after ghcr.io has it), it switches to ghcr.io.

A pull cut off by the network is tried again, three times in all (Docker
keeps the layers it finished; `install.sh` and `coltex deploy` alike).
`install.sh --images aliyun`, `--images ghcr` or `--images REGISTRY` (any
other mirror) sets the registry by hand, also on an existing install
(Docker's `registry-mirrors` in `daemon.json` only applies to Docker Hub). On a connection that keeps breaking,
`"max-concurrent-downloads": 1` and `"max-download-attempts": 10` in
`/etc/docker/daemon.json` help. `install.sh` writes an empty `COLTEX_BIND=`
(and `coltex` adds it when missing) so that older Compose versions don't warn
about the port's `${COLTEX_BIND:+…}`.

## Storing project files in S3

Any S3-compatible service works: AWS S3, Cloudflare R2, Backblaze B2,
MinIO, Garage, SeaweedFS. Set these for the `server` service (in `.env` next
to `docker-compose.yml`):

```sh
STORAGE=s3
S3_BUCKET=coltex
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_REGION=us-east-1          # R2: auto
S3_ENDPOINT=https://…        # leave unset for AWS
S3_PREFIX=                   # optional folder inside the bucket
S3_PATH_STYLE=               # defaults to true when S3_ENDPOINT is set
```

The server checks the bucket when it starts and refuses to start if it
can't reach it. The bucket must already exist.

The compiler has no internet access, so before each build the server copies
the project's current files from the bucket into `DATA_DIR/projects` (only
what changed). That directory is a cache in S3 mode; history and build
output stay on local disk.

### Moving an existing instance to S3

1. Stop the server: `docker compose stop server`.
2. Add the S3 settings above.
3. Copy the projects: `docker compose run --rm server node src/cli.ts copy-storage`.
   Projects already in the bucket are skipped; local files are not deleted.
4. Start the server: `docker compose up -d server`.

## Backups

In **Settings → Storage & backups** (administrators), set a WebDAV folder:
Nextcloud, ownCloud, a NAS (Synology, QNAP), Apache or nginx WebDAV, or
`rclone serve webdav`. For Nextcloud the URL looks like
`https://cloud.example.org/remote.php/dav/files/<user>/ColTex/`; use an app
password. **Test connection** checks that ColTex can create and delete a
file there.

Each backup is one file, `coltex-backup-<date>-<time>.zip` (UTC), holding the
database dump, every project's files, its history and its Git bridge
repository (so existing clones keep pulling after a restore). Back up now, or every
day or week at a set time. Older backups beyond the number to keep are
deleted from the folder after a successful backup; other files in the folder
are left alone.

### Encryption

With an encryption password, backups are `….zip.enc`, AES-256 encrypted, and
also contain the instance secret, so sessions and connected AI providers keep
working after a restore. Keep the password somewhere other than this server:
without it a backup cannot be opened. Unencrypted backups leave the secret
out; after restoring one, everyone signs in again and AI providers need
reconnecting.

An encrypted backup opens with standard tools:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in coltex-backup-….zip.enc -out backup.zip
```

### Restoring

Restore into a fresh install: an empty database and an empty data directory
(the server may have been started once, as long as nobody has signed up).

1. Install ColTex on the new machine (same or newer version), with the same
   storage settings you want to use there. Don't create an account.
2. Stop the server: `docker compose stop server`.
3. Put the backup file in `./data/`.
4. Run the restore (for an encrypted backup, pass its password):

   ```sh
   docker compose run --rm -e COLTEX_BACKUP_PASSWORD='…' server \
     node src/cli.ts restore /data/coltex-backup-….zip.enc
   ```

   It restores the database (psql), the project files (into the configured
   storage, local or S3), the history and the instance secret. It refuses to
   overwrite existing data.
5. Start the server: `docker compose up -d server`. A newer ColTex applies
   its database migrations on start.

If the old server used `COLTEX_SECRET`, set the same value on the new one.

## Passwords, sign-ins and starting over

- `coltex cli reset-password <email>` sets a new password for an account
  (typed twice without echo, or from `COLTEX_NEW_PASSWORD`), checked by the
  same rules as the web app, and ends all its sessions. It works with the
  server running.
- `coltex reset-2fa <email>` turns two-step verification off for an account
  (its authenticator secret and recovery codes are deleted); the owner gets
  a notification and the server's log a line. Needed after restoring a
  backup without the instance secret, which encrypts those secrets.
- `coltex unlock <email>` opens an account locked after failed sign-ins
  from unfamiliar addresses (the system administrator's too) and clears its
  failure count; `coltex unlock <address>` lifts the one-day block of an
  address. Both are also in the web app (Administration → Sign-ins). The
  counters live in Valkey (`coltex:signin:*`), the locks and the sign-in
  record (90 days) in Postgres, so backups carry them.
- `coltex reset` puts the instance back to a fresh install: after you type
  `reset`, `docker compose down -v` (database, Valkey, build cache, Caddy's
  certificates), then empties `data/` (through a root container for what
  belongs to root), recreates its folders for `COLTEX_UID` and starts. `.env`
  stays. Make a backup first if any of it may be needed.
- `coltex uninstall` removes ColTex from the machine: after you type
  `uninstall`, it signs the built-in Tailscale out of the tailnet (so its
  device doesn't stay behind), `docker compose down -v`, empties and removes
  `data/` (a root container for what belongs to root, while the server image
  is still there), removes the images (`down --rmi all`), the `coltex` links
  that point at this folder, and finally the folder itself. Docker stays.

## Git bridge

Every project can be cloned, pulled and pushed with git at
`<your ColTex address>/api/git/<project id>.git` (shown in the project's
settings). People sign in with any user name and a personal Git token as the
password (Settings → Sync services). Reading needs access to the project; pushing needs
editor or owner rights. Only `main` can be pushed, and only as a fast-forward:
if the project changed since someone's last pull, their push is refused until
they pull.

Behind a reverse proxy, make sure large request bodies are allowed for
`/api/git/` (pushes of images and PDFs).

