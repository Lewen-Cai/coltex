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
root) can't write into.

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
`$CF_TUNNEL_TOKEN`, or typed in).

### Installing with one command

`install.sh` (Linux/macOS): checks Docker (offers get.docker.com on Linux),
clones the repository (`DEFAULT_REPO` at the top; `--repo` or `COLTEX_REPO`
for a fork) into `~/coltex` or pulls it when
already there, writes `.env` once (port, a random `POSTGRES_PASSWORD`,
`COLTEX_UID/GID`, `TS_HOSTNAME`), builds and starts, waits for
`/api/health`, links `coltex` into `~/.local/bin`, and optionally runs
`--domain HOST`: writes `COLTEX_DOMAIN`, `COLTEX_URL=https://HOST`,
`TRUST_PROXY=uniquelocal`, `COMPOSE_PROFILES=proxy` (so every `docker compose`
and `coltex` command includes Caddy) and `COLTEX_BIND=127.0.0.1`; then it
`coltex tailscale up` / `coltex cloudflare quick|token`. `coltex` wraps
`docker compose` (start, stop, restart, status, logs, update) and the
server's CLI (`tailscale`, `cloudflare`, `cli …`).

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

## Git bridge

Every project can be cloned, pulled and pushed with git at
`<your ColTex address>/api/git/<project id>.git` (shown in the project's
settings). People sign in with any user name and a personal Git token as the
password (Settings → Git). Reading needs access to the project; pushing needs
editor or owner rights. Only `main` can be pushed, and only as a fast-forward:
if the project changed since someone's last pull, their push is refused until
they pull.

Behind a reverse proxy, make sure large request bodies are allowed for
`/api/git/` (pushes of images and PDFs).

