#!/usr/bin/env bash
# Install ColTex on this machine (Linux or macOS) with Docker:
#
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
#
# Options:
#   --dir DIR               where it goes (default ~/coltex)
#   --port PORT             the port (default 3690)
#   --edition EDITION       standard (default, TeX Live without package manuals, about 9 GB)
#                           or full (with the manuals the AI assistant can read, about 20 GB)
#   --repo URL              the Git repository (default: github.com/Lewen-Cai/coltex)
#   --version VERSION       a release such as v0.0.1 (default: the latest), or main for the
#                           development branch
#   --domain HOST           serve it at https://HOST with the bundled Caddy (certificates from
#                           Let's Encrypt; HOST's DNS must point here, ports 80 and 443 open)
#   --tailscale             afterwards, put it on your tailnet (prints a sign-in link and QR code)
#   --cloudflare-quick      afterwards, open a temporary trycloudflare.com address
#   --cloudflare-token TOK  afterwards, connect a Cloudflare tunnel made in the dashboard
#   --no-start              get the code and write the settings, but don't build or start
#
# Run again to update to the latest release: settings and data stay.
set -euo pipefail

# The repository the one-line command points at (COLTEX_REPO overrides it).
DEFAULT_REPO="${COLTEX_REPO:-https://github.com/Lewen-Cai/coltex.git}"

DIR="${COLTEX_DIR:-$HOME/coltex}"
PORT=""
EDITION=""
DOMAIN=""
VERSION=""
REPO="$DEFAULT_REPO"
TAILSCALE=0
CF_QUICK=0
CF_TOKEN=""
START=1

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --edition) EDITION="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --tailscale) TAILSCALE=1; shift ;;
    --cloudflare-quick) CF_QUICK=1; shift ;;
    --cloudflare-token) CF_TOKEN="$2"; shift 2 ;;
    --no-start) START=0; shift ;;
    -h | --help) sed -n '2,23p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$EDITION" in "" | standard | full) ;; *) echo "--edition is standard or full" >&2; exit 2 ;; esac

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
die() { printf '\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
# Questions go to the terminal even when the script itself comes from a pipe.
ask() {
  local answer=""
  if [ -r /dev/tty ]; then read -r -p "$1 [y/N] " answer </dev/tty || true; fi
  [ "$answer" = y ] || [ "$answer" = Y ]
}

# ---- Docker -----------------------------------------------------------------
if ! have docker; then
  if [ "$(uname -s)" = Linux ] && ask "Docker is not installed. Install it now with Docker's script (get.docker.com, needs sudo)?"; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER" || true
    say "Docker installed. If the next step says permission denied, log out and back in (docker group), then run this again."
  else
    die "Docker is needed: https://docs.docker.com/engine/install/ (Docker Desktop on macOS)"
  fi
fi
docker compose version >/dev/null 2>&1 || die "The Docker Compose plugin is needed (docker compose …): https://docs.docker.com/compose/install/"
docker info >/dev/null 2>&1 || die "Docker is installed but not running, or this user may not use it (add it to the docker group)"
have git || die "git is needed"
have curl || die "curl is needed"

# ---- The code: a release (a vX.Y.Z tag), or the main branch with --version main ----------
# The newest release tag in a repository (a URL or a local path).
latest_release() { git ls-remote --tags --refs "$1" 'v*' | sed 's|.*refs/tags/||' | sort -V | tail -1; }

if [ -d "$DIR/.git" ]; then
  REPO="$(git -C "$DIR" remote get-url origin)"
fi
[ -n "$REPO" ] || die "Which repository? Pass --repo URL (or set COLTEX_REPO)"
if [ -z "$VERSION" ]; then
  # Installed from main stays on main; otherwise the latest release.
  if [ -d "$DIR/.git" ] && git -C "$DIR" symbolic-ref -q HEAD >/dev/null; then VERSION=main; else VERSION="$(latest_release "$REPO")"; fi
  [ -n "$VERSION" ] || die "No release found in $REPO (pass --version main for the development branch)"
fi
if [ -d "$DIR/.git" ]; then
  say "Updating $DIR to $VERSION"
  if [ "$VERSION" = main ]; then
    git -C "$DIR" fetch --depth 1 origin main && git -C "$DIR" checkout -q -B main FETCH_HEAD
  else
    git -C "$DIR" fetch --depth 1 --force origin tag "$VERSION" && git -C "$DIR" -c advice.detachedHead=false checkout -q "$VERSION"
  fi
else
  say "Getting ColTex $VERSION into $DIR"
  git -c advice.detachedHead=false clone -q --depth 1 --branch "$VERSION" "$REPO" "$DIR"
fi
cd "$DIR"

# ---- Settings (written once; kept on updates) -----------------------------------
# Run as root (a fresh cloud server), the containers still run as an ordinary user.
OWNER_UID="$(id -u)"
OWNER_GID="$(id -g)"
if [ "$OWNER_UID" = 0 ]; then OWNER_UID=1000; OWNER_GID=1000; fi
if [ ! -f .env ]; then
  say "Writing settings to $DIR/.env"
  secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  cat >.env <<EOF
# ColTex settings for docker compose (see docs/operations.md). Created by install.sh.
COLTEX_PORT=${PORT:-3690}
# standard: TeX Live without package manuals (about 9 GB); full: with them (about 20 GB).
COLTEX_EDITION=${EDITION:-standard}
# The database password, only used between the containers.
POSTGRES_PASSWORD=$(secret)
# The containers run as this user (and own ./data); never root, since the compiler runs untrusted TeX.
COLTEX_UID=$OWNER_UID
COLTEX_GID=$OWNER_GID
# The device name on a tailnet (Settings → Network → Tailscale).
TS_HOSTNAME=coltex
EOF
fi
# A setting in .env, or nothing when it isn't there.
get() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }
# A setting in .env: replaced when there, added when not.
setting() {
  if grep -q "^$1=" .env; then sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak; else echo "$1=$2" >>.env; fi
}
[ -n "$PORT" ] && setting COLTEX_PORT "$PORT"
[ -n "$EDITION" ] && setting COLTEX_EDITION "$EDITION"
if [ -n "$DOMAIN" ]; then
  # HTTPS through the bundled Caddy (compose profile "proxy", which every coltex command then
  # includes); links use the domain; the plain port only answers on this machine.
  setting COLTEX_DOMAIN "$DOMAIN"
  setting COLTEX_URL "https://$DOMAIN"
  setting TRUST_PROXY uniquelocal
  setting COMPOSE_PROFILES proxy
  setting COLTEX_BIND 127.0.0.1
fi
# The compiler mounts data/projects and data/outputs on their own: made here, or Docker
# would create them owned by root and the server couldn't write into them.
mkdir -p data/projects data/outputs
# Installed as root: ./data belongs to the unprivileged user the containers run as.
if [ "$(id -u)" = 0 ]; then
  chown -R "$(get COLTEX_UID):$(get COLTEX_GID)" data
fi
PORT="$(get COLTEX_PORT)"
PORT="${PORT:-3690}"

# The `coltex` command, where the shell finds it.
chmod +x coltex
if [ -d "$HOME/.local/bin" ] || mkdir -p "$HOME/.local/bin" 2>/dev/null; then
  ln -sf "$DIR/coltex" "$HOME/.local/bin/coltex"
  case ":$PATH:" in *":$HOME/.local/bin:"*) CMD=coltex ;; *) CMD="$DIR/coltex" ;; esac
else
  CMD="$DIR/coltex"
fi

if [ "$START" = 0 ]; then
  docker compose config -q
  say "Ready. Start it with: $CMD start   (the first build downloads TeX Live, several GB)"
  exit 0
fi

# ---- Build and start -------------------------------------------------------------
ED="$(get COLTEX_EDITION)"
case "${ED:-standard}" in full) SIZE="about 7 GB to download, 20 GB on disk" ;; *) SIZE="about 3 GB to download, 9 GB on disk" ;; esac
say "Building and starting, ${ED:-standard} edition (the first time downloads TeX Live: $SIZE; this can take a while)"
docker compose up -d --build

say "Waiting for ColTex to answer on port $PORT"
for _ in $(seq 1 180); do
  curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1 && break
  sleep 2
done
curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1 || die "ColTex did not start; see: $CMD logs"

# ---- Remote access, if asked for -----------------------------------------------------
if [ "$TAILSCALE" = 1 ]; then
  say "Tailscale: sign this server in to your tailnet"
  "$DIR/coltex" tailscale up
fi
if [ -n "$CF_TOKEN" ]; then
  say "Cloudflare Tunnel"
  CF_TUNNEL_TOKEN="$CF_TOKEN" "$DIR/coltex" cloudflare token
elif [ "$CF_QUICK" = 1 ]; then
  say "Cloudflare Tunnel (quick)"
  "$DIR/coltex" cloudflare quick
fi

# ---- Where to open it ----------------------------------------------------------------
# This machine's own addresses: not Docker's bridges, not a tunnel's.
addresses=""
if have ip; then
  addresses="$(ip -4 -o addr show scope global 2>/dev/null | awk '$2 !~ /^(docker|br-|veth|tailscale|cni|flannel|virbr)/ { split($4, a, "/"); print a[1] }' || true)"
elif have ipconfig; then
  addresses="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
fi
is_private() { echo "$1" | grep -qE '^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168|100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7]))\.'; }
echo
say "ColTex is running. Open it and create the administrator account:"
DOMAIN="$(get COLTEX_DOMAIN)"
if [ -n "$DOMAIN" ]; then
  echo "    https://$DOMAIN   (the first visit can take a minute while Caddy gets the certificate)"
  echo "    http://localhost:$PORT   (on this machine)"
else
  echo "    http://localhost:$PORT   (on this machine)"
  public=0
  for ip in $addresses; do
    if is_private "$ip"; then echo "    http://$ip:$PORT   (on your network)"
    else echo "    http://$ip:$PORT   (public address)"; public=1; fi
  done
  if [ "$public" = 1 ]; then
    echo
    echo "  This server is reachable from the internet: for real use don't sign in over plain"
    echo "  http. Use --domain (HTTPS), Tailscale or a Cloudflare tunnel (below)."
  fi
fi
echo
echo "  Remote access: Settings → Network in ColTex, or"
echo "    $CMD tailscale up          put it on your tailnet"
echo "    $CMD cloudflare quick      a temporary public address"
echo "    $CMD cloudflare token      a Cloudflare tunnel with your own domain"
echo "  Manage it: $CMD status | logs | update | stop | start"
