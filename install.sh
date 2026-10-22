#!/usr/bin/env bash
# Install ColTex on this machine (Linux or macOS) with Docker:
#
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
#
# Without options, it asks for the language, the TeX Live edition and how to reach ColTex
# (arrow keys). Options answer those questions, or replace them where there is no terminal:
#   --lang LANG             en or zh, for the installer, `coltex` and the setup page
#   --dir DIR               where it goes (default ~/coltex)
#   --port PORT             the port (default 3690)
#   --edition EDITION       standard (default, TeX Live without package manuals, about 9 GB)
#                           or full (with the manuals the AI agent can read, about 20 GB)
#   --repo URL              the Git repository (default: github.com/Lewen-Cai/coltex)
#   --version VERSION       a release such as v0.0.1 (default: the latest), or main for the
#                           development branch
#   --domain HOST           serve it at https://HOST with the bundled Caddy (certificates from
#                           Let's Encrypt; HOST's DNS must point here, ports 80 and 443 open)
#   --tailscale             afterwards, put it on your tailnet (prints a sign-in link and QR code)
#   --cloudflare-quick      afterwards, open a temporary trycloudflare.com address
#   --cloudflare-token TOK  afterwards, connect a Cloudflare tunnel made in the dashboard
#   --local                 only this machine and its network (no questions about access)
#   --build                 build the images from the sources here instead of downloading
#                           the prebuilt ones (kept for updates: COLTEX_BUILD=1 in .env)
#   --no-start              get the code and write the settings, but don't download or start
#
# Run again to update to the latest release: settings and data stay. The full output of
# every step goes to install.log in the ColTex folder.
set -euo pipefail

# The repository the one-line command points at (COLTEX_REPO overrides it).
DEFAULT_REPO="${COLTEX_REPO:-https://github.com/Lewen-Cai/coltex.git}"

DIR="${COLTEX_DIR:-$HOME/coltex}"
PORT=""
EDITION=""
DOMAIN=""
VERSION=""
LANGUAGE=""
REPO="$DEFAULT_REPO"
TAILSCALE=0
CF_QUICK=0
CF_TOKEN=""
ACCESS_GIVEN=0
BUILD=0
START=1

while [ $# -gt 0 ]; do
  case "$1" in
    --lang) LANGUAGE="$2"; shift 2 ;;
    --dir) DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --edition) EDITION="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; ACCESS_GIVEN=1; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --tailscale) TAILSCALE=1; ACCESS_GIVEN=1; shift ;;
    --cloudflare-quick) CF_QUICK=1; ACCESS_GIVEN=1; shift ;;
    --cloudflare-token) CF_TOKEN="$2"; ACCESS_GIVEN=1; shift 2 ;;
    --local) ACCESS_GIVEN=1; shift ;;
    --build) BUILD=1; shift ;;
    --no-start) START=0; shift ;;
    -h | --help) sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$EDITION" in "" | standard | full) ;; *) echo "--edition is standard or full" >&2; exit 2 ;; esac
case "$LANGUAGE" in "" | en | zh) ;; *) echo "--lang is en or zh" >&2; exit 2 ;; esac

have() { command -v "$1" >/dev/null 2>&1; }

# ---- The terminal -------------------------------------------------------------------
# Interactive: a terminal to draw on and to read answers from (also under `curl | bash`).
TTY=0
if [ -t 1 ] && { : </dev/tty; } 2>/dev/null; then TTY=1; fi
COLS="$(tput cols 2>/dev/null || echo 80)"
ESC=$'\033'
RESET="" BOLD="" DIM="" BLUE="" WHITE="" GREEN="" RED="" AMBER=""
if [ "$TTY" = 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RESET="${ESC}[0m" BOLD="${ESC}[1m" DIM="${ESC}[2m"
  case "${COLORTERM:-}" in
    truecolor | 24bit)
      BLUE="${ESC}[38;2;37;99;235m" WHITE="${ESC}[38;2;255;255;255m" GREEN="${ESC}[38;2;22;163;74m"
      RED="${ESC}[38;2;220;38;38m" AMBER="${ESC}[38;2;217;119;6m" ;;
    *)
      BLUE="${ESC}[38;5;27m" WHITE="${ESC}[38;5;231m" GREEN="${ESC}[38;5;34m" RED="${ESC}[38;5;160m" AMBER="${ESC}[38;5;172m" ;;
  esac
fi
cursor_hide() { [ "$TTY" = 1 ] && printf '%s' "${ESC}[?25l" || true; }
cursor_show() { [ "$TTY" = 1 ] && printf '%s' "${ESC}[?25h" || true; }
trap 'cursor_show; printf "%s\n" "$RESET"; exit 130' INT TERM
trap 'cursor_show' EXIT

# Columns a string takes: CJK characters (3 bytes in UTF-8) take two.
width() {
  local s="$1" bytes ascii
  bytes=$(printf '%s' "$s" | LC_ALL=C wc -c | tr -d ' ')
  ascii=$(printf '%s' "$s" | LC_ALL=C tr -d '\200-\377' | LC_ALL=C wc -c | tr -d ' ')
  echo $((ascii + (bytes - ascii) * 2 / 3))
}
# The string padded with spaces to $2 columns.
pad() {
  local w
  w=$(width "$1")
  printf '%s%*s' "$1" $(($2 > w ? $2 - w : 0)) ''
}

# ---- Language -------------------------------------------------------------------------
# A string in the chosen language: T "English" "中文".
T() { if [ "$LANGUAGE" = zh ]; then printf '%s' "$2"; else printf '%s' "$1"; fi; }

# A choice with the arrow keys (or the number keys); the index lands in CHOICE.
# $1 is the question, the rest are the options; CHOICE's value going in is the default.
choose() {
  local title="$1" i key rest n
  shift
  n=$#
  local options=("$@")
  printf '\n  %s\n' "${BOLD}${title}${RESET}"
  cursor_hide
  local first=1
  while :; do
    [ "$first" = 1 ] || printf '%s' "${ESC}[${n}A"
    first=0
    for i in "${!options[@]}"; do
      if [ "$i" = "$CHOICE" ]; then printf '\r%s    %s %s\n' "${ESC}[2K" "${BLUE}❯${RESET}" "${BOLD}${options[i]}${RESET}"
      else printf '\r%s      %s\n' "${ESC}[2K" "${DIM}${options[i]}${RESET}"; fi
    done
    IFS= read -rsn1 key </dev/tty || key=""
    case "$key" in
      "") break ;;
      "$ESC")
        IFS= read -rsn2 rest </dev/tty || rest=""
        case "$rest" in
          "[A" | "OA") CHOICE=$(((CHOICE + n - 1) % n)) ;;
          "[B" | "OB") CHOICE=$(((CHOICE + 1) % n)) ;;
        esac ;;
      k) CHOICE=$(((CHOICE + n - 1) % n)) ;;
      j) CHOICE=$(((CHOICE + 1) % n)) ;;
      [1-9]) if [ "$key" -le "$n" ]; then CHOICE=$((key - 1)); fi ;;
    esac
  done
  # Fold the list into one line with the answer (what comes before a colon), or none with $QUIET.
  printf '%s' "${ESC}[$((n + 2))A"
  for ((i = 0; i < n + 2; i++)); do printf '\r%s\n' "${ESC}[2K"; done
  printf '%s' "${ESC}[$((n + 2))A"
  local answer="${options[CHOICE]}"
  answer="${answer%%:*}"
  answer="${answer%%：*}"
  [ -n "${QUIET:-}" ] || printf '\r  %s %s\n' "${GREEN}✓${RESET}" "${title} ${DIM}${answer}${RESET}"
  cursor_show
}

# A line of text from the terminal; with $2 = secret, not echoed.
ask_text() {
  local answer=""
  if [ "${2:-}" = secret ]; then IFS= read -rs -p "    $1 " answer </dev/tty || true; echo >&2
  else IFS= read -r -p "    $1 " answer </dev/tty || true; fi
  printf '%s' "$answer"
}

# The language: given, kept from an earlier install, chosen here, or from the locale.
if [ -z "$LANGUAGE" ] && [ -f "$DIR/.env" ]; then
  LANGUAGE="$(grep -E '^COLTEX_LANG=' "$DIR/.env" | tail -1 | cut -d= -f2- || true)"
fi
if [ -z "$LANGUAGE" ]; then
  case "${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}" in zh*) CHOICE=1 ;; *) CHOICE=0 ;; esac
  # The logo follows in the chosen language, so the answer needn't stay on screen.
  if [ "$TTY" = 1 ]; then QUIET=1 choose "Language / 语言" "English" "简体中文"; fi
  if [ "$CHOICE" = 1 ]; then LANGUAGE=zh; else LANGUAGE=en; fi
fi

# ---- The mark ------------------------------------------------------------------------
# A white sigma on a blue tile with rounded corners (" " = outside the tile), each cell two
# columns wide so the pixels come out square; the sigma is drawn in pen order.
LOGO=(
  " bbbbbbbbb "
  "bbbbbbbbbbb"
  "bbWWWWWWWbb"
  "bbbWbbbbWbb"
  "bbbbWbbbbbb"
  "bbbbbWbbbbb"
  "bbbbWbbbbbb"
  "bbbWbbbbWbb"
  "bbWWWWWWWbb"
  "bbbbbbbbbbb"
  " bbbbbbbbb "
)
STROKE="2,8 2,7 2,6 2,5 2,4 2,3 2,2 3,3 4,4 5,5 6,4 7,3 8,2 8,3 8,4 8,5 8,6 8,7 8,8 3,8 7,8"
TAGLINE="$(T "A self-hosted collaborative LaTeX editor" "自托管的协作 LaTeX 编辑器")"

draw_logo() { # $1 = how many stroke cells are white
  local shown=" " row col ch line
  [ "$1" -gt 0 ] && shown=" $(echo "$STROKE" | cut -d' ' -f1-"$1") "
  for row in "${!LOGO[@]}"; do
    line="  "
    for ((col = 0; col < ${#LOGO[row]}; col++)); do
      ch="${LOGO[row]:col:1}"
      if [ "$ch" = " " ]; then line+="  "
      elif [ "$1" -gt 0 ] && [[ "$shown" == *" $row,$col "* ]]; then line+="${WHITE}██"
      else line+="${BLUE}██"; fi
    done
    case "$row" in
      4) line+="${RESET}    ${BOLD}ColTex${RESET}" ;;
      5) line+="${RESET}    ${DIM}${TAGLINE}${RESET}" ;;
    esac
    printf '%s%s\n' "$line" "$RESET"
  done
}

header() {
  if [ "$TTY" = 1 ] && [ "$COLS" -ge 64 ] && [ -n "$BLUE" ]; then
    echo
    cursor_hide
    draw_logo 0
    for n in $(seq 1 21); do
      sleep 0.03
      printf '%s' "${ESC}[11A"
      draw_logo "$n"
    done
    cursor_show
  else
    printf '\n  %s  %s\n' "${BOLD}${BLUE}Σ ColTex${RESET}" "${DIM}${TAGLINE}${RESET}"
  fi
}
header

# ---- Steps ---------------------------------------------------------------------------
# Everything a step prints goes to the log; the screen shows one line per step.
LOG="$(mktemp "${TMPDIR:-/tmp}/coltex-install.XXXXXX")"
SPIN=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)

# Stop with a message (none after a failed step, whose line says it) and the log's end.
die() {
  cursor_show
  [ -n "$*" ] && printf '\n  %s %s\n' "${RED}✗${RESET}" "${BOLD}$*${RESET}" >&2
  if [ -s "$LOG" ]; then
    printf '\n%s\n' "${DIM}$(tail -n 15 "$LOG" | sed 's/^/    /')${RESET}" >&2
    printf '\n  %s\n\n' "$(T "Full output: $LOG" "完整输出：$LOG")" >&2
  fi
  exit 1
}
done_line() { printf '\r%s  %s %s\n' "${ESC}[2K" "${GREEN}✓${RESET}" "$1"; }
note() { printf '  %s\n' "${DIM}$*${RESET}"; }

# Run a command with a spinner (output to the log); ✓ when it worked, else its exit code
# with the line cleared.
spin() {
  local label="$1" pid rc=0 i=0
  shift
  printf '\n==> %s\n' "$label" >>"$LOG"
  if [ "$TTY" != 1 ]; then
    printf '==> %s\n' "$label"
    "$@" >>"$LOG" 2>&1 || return $?
    return 0
  fi
  cursor_hide
  "$@" >>"$LOG" 2>&1 &
  pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r  %s %s' "${BLUE}${SPIN[i % 10]}${RESET}" "$label"
    i=$((i + 1))
    sleep 0.08
  done
  wait "$pid" || rc=$?
  cursor_show
  if [ "$rc" = 0 ]; then done_line "$label"; else printf '\r%s' "${ESC}[2K"; fi
  return "$rc"
}

# A step that must work: a spinner while it runs, ✓, or ✗ and the end of its output.
step() {
  local label="$1"
  spin "$@" && return 0
  printf '  %s %s\n' "${RED}✗${RESET}" "${BOLD}$label${RESET}" >&2
  die
}

# Bytes as "1.2 GB" or "340 MB".
size() { awk -v b="$1" 'BEGIN { if (b >= 1e9) printf "%.1f GB", b / 1e9; else printf "%.0f MB", b / 1e6 }'; }

# `docker compose pull` with a download bar from compose's JSON progress (the layers'
# sizes become known as each starts downloading, so the total can grow).
pull_with_bar() {
  local label="$1" cur tot pct filled bar k i=0 rc
  printf '\n==> %s\n' "$label" >>"$LOG"
  if [ "$TTY" != 1 ]; then
    printf '==> %s\n' "$label"
    docker compose pull >>"$LOG" 2>&1
    return
  fi
  cursor_hide
  printf '\r  %s %s' "${BLUE}${SPIN[0]}${RESET}" "$label"
  set +e
  docker compose --progress json pull 2>&1 | tee -a "$LOG" | awk '
    !/"parent_id"/ { next }
    {
      id = ""; if (match($0, /"id":"[^"]*"/)) id = substr($0, RSTART + 6, RLENGTH - 7)
      if (match($0, /"total":[0-9]+/)) total[id] = substr($0, RSTART + 8, RLENGTH - 8) + 0
      if ($0 ~ /"text":"Downloading"/ && match($0, /"current":[0-9]+/)) got[id] = substr($0, RSTART + 10, RLENGTH - 10) + 0
      if ($0 ~ /"text":"(Download complete|Pull complete)"/ && (id in total)) got[id] = total[id]
      s = 0; t = 0
      for (k in total) { t += total[k]; s += got[k] }
      step = t > 0 ? int(s * 400 / t) : -1
      if (t > 0 && (step != last || t != lastt)) { print s, t; fflush(); last = step; lastt = t }
    }' | while read -r cur tot; do
    pct=$((cur * 100 / tot))
    filled=$((cur * 24 / tot))
    bar=""
    for ((k = 0; k < 24; k++)); do if [ "$k" -lt "$filled" ]; then bar+="━"; else bar+="${DIM}━${RESET}${BLUE}"; fi; done
    printf '\r%s  %s %s %s%s%s %3d%%  %s' "${ESC}[2K" "${BLUE}${SPIN[i % 10]}${RESET}" "$(pad "$label" 20)" "$BLUE" "$bar" "$RESET" "$pct" "${DIM}$(size "$cur") / $(size "$tot")${RESET}"
    i=$((i + 1))
  done
  rc=${PIPESTATUS[0]}
  set -e
  cursor_show
  if [ "$rc" = 0 ]; then done_line "$label"; else printf '\r%s' "${ESC}[2K"; fi
  return "$rc"
}

# The images: pulled with a bar, or plainly when this Compose has no JSON progress; false
# when there are none for this version.
pull_images() {
  local label
  label="$(T "Downloading" "下载镜像")"
  pull_with_bar "$label" && return 0
  # A Compose without JSON progress said so instead of pulling.
  if tail -n 3 "$LOG" | grep -qi 'progress'; then spin "$label" docker compose pull && return 0; fi
  return 1
}

# ---- Docker --------------------------------------------------------------------------
if ! have docker; then
  if [ "$(uname -s)" = Linux ] && [ "$TTY" = 1 ]; then
    CHOICE=0
    choose "$(T "Docker is not installed. Install it now with Docker's script (get.docker.com, needs sudo)?" "没有安装 Docker。现在用 Docker 的官方脚本（get.docker.com，需要 sudo）安装吗？")" \
      "$(T "Install Docker" "安装 Docker")" "$(T "Cancel" "取消")"
    [ "$CHOICE" = 0 ] || die "$(T "Docker is needed: https://docs.docker.com/engine/install/" "需要 Docker：https://docs.docker.com/engine/install/")"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER" || true
    note "$(T "Docker installed. If the next step says permission denied, log out and back in (docker group), then run this again." "Docker 已安装。如果下一步提示权限不足，请注销后重新登录（docker 用户组），再运行一次。")"
  else
    die "$(T "Docker is needed: https://docs.docker.com/engine/install/ (Docker Desktop on macOS)" "需要 Docker：https://docs.docker.com/engine/install/（macOS 上用 Docker Desktop）")"
  fi
fi
check_docker() {
  docker compose version >/dev/null 2>&1 || { echo "The Docker Compose plugin is needed: https://docs.docker.com/compose/install/"; return 1; }
  docker info >/dev/null 2>&1 || { echo "Docker is installed but not running, or this user may not use it (add it to the docker group)"; return 1; }
  have git || { echo "git is needed"; return 1; }
  have curl || { echo "curl is needed"; return 1; }
}
echo
step "$(T "Checking Docker" "检查 Docker")" check_docker

# ---- The code: a release (a vX.Y.Z tag), or the main branch with --version main ----------
# The newest release tag in a repository (a URL or a local path).
latest_release() { git ls-remote --tags --refs "$1" 'v*' | sed 's|.*refs/tags/||' | sort -V | tail -1; }

FRESH=1
[ -f "$DIR/.env" ] && FRESH=0
if [ -d "$DIR/.git" ]; then
  REPO="$(git -C "$DIR" remote get-url origin)"
fi
[ -n "$REPO" ] || die "Which repository? Pass --repo URL (or set COLTEX_REPO)"
if [ -z "$VERSION" ]; then
  # Installed from main stays on main; otherwise the latest release.
  if [ -d "$DIR/.git" ] && git -C "$DIR" symbolic-ref -q HEAD >/dev/null; then VERSION=main; else VERSION="$(latest_release "$REPO" 2>>"$LOG" || true)"; fi
  [ -n "$VERSION" ] || die "$(T "No release found in $REPO (pass --version main for the development branch)" "在 $REPO 里没有找到发布版本（开发分支请加 --version main）")"
fi

# ---- Questions (a fresh install with a terminal, for what no option answered) ------------
if [ "$FRESH" = 1 ] && [ "$TTY" = 1 ]; then
  if [ -z "$EDITION" ]; then
    CHOICE=0
    choose "$(T "TeX Live edition" "TeX Live 版本")" \
      "$(T "Standard: everything compiles; about 3 GB to download, 12 GB on disk" "标准版：能编译的文档完全一样；下载约 3 GB，占用约 12 GB")" \
      "$(T "Full: also the package manuals for the AI agent; about 8 GB, 23 GB on disk" "完整版：另含宏包手册，供 AI 智能体查阅；下载约 8 GB，占用约 23 GB")"
    if [ "$CHOICE" = 1 ]; then EDITION=full; else EDITION=standard; fi
  fi
  if [ "$ACCESS_GIVEN" = 0 ]; then
    CHOICE=0
    choose "$(T "How will people reach ColTex?" "大家怎样访问 ColTex？")" \
      "$(T "On this machine and its network" "本机和局域网")" \
      "$(T "A domain of mine, with HTTPS" "我自己的域名，启用 HTTPS")" \
      "$(T "Tailscale (my tailnet)" "Tailscale（我的 tailnet）")" \
      "$(T "Cloudflare Tunnel with my domain" "Cloudflare Tunnel，用我的域名")" \
      "$(T "A temporary public link (trycloudflare.com)" "临时公网链接（trycloudflare.com）")"
    case "$CHOICE" in
      1)
        while [ -z "$DOMAIN" ]; do DOMAIN="$(ask_text "$(T "Domain (its DNS must point here; ports 80 and 443 open):" "域名（DNS 要解析到这台机器，并开放 80 和 443 端口）：")")"; done ;;
      2) TAILSCALE=1 ;;
      3) while [ -z "$CF_TOKEN" ]; do CF_TOKEN="$(ask_text "$(T "Tunnel token (from the Cloudflare dashboard):" "隧道令牌（在 Cloudflare 控制台里）：")" secret)"; done ;;
      4) CF_QUICK=1 ;;
    esac
  fi
  echo
fi

get_code() {
  if [ -d "$DIR/.git" ]; then
    if [ "$VERSION" = main ]; then
      git -C "$DIR" fetch --depth 1 origin main && git -C "$DIR" checkout -q -B main FETCH_HEAD
    else
      git -C "$DIR" fetch --depth 1 --force origin tag "$VERSION" && git -C "$DIR" -c advice.detachedHead=false checkout -q "$VERSION"
    fi
  else
    git -c advice.detachedHead=false clone -q --depth 1 --branch "$VERSION" "$REPO" "$DIR"
  fi
}
if [ -d "$DIR/.git" ]; then step "$(T "Updating ColTex to $VERSION" "更新 ColTex 到 $VERSION")" get_code
else step "$(T "Getting ColTex $VERSION" "获取 ColTex $VERSION")" get_code; fi
cd "$DIR"
# From here on the log lives with ColTex.
cat "$LOG" >>install.log && rm -f "$LOG"
LOG="$DIR/install.log"

# ---- Settings (written once; kept on updates) -----------------------------------
# Run as root (a fresh cloud server), the containers still run as an ordinary user.
OWNER_UID="$(id -u)"
OWNER_GID="$(id -g)"
if [ "$OWNER_UID" = 0 ]; then OWNER_UID=1000; OWNER_GID=1000; fi
# A setting in .env, or nothing when it isn't there.
get() { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2- || true; }
# A setting in .env: replaced when there, added when not.
setting() {
  if grep -q "^$1=" .env; then sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak; else echo "$1=$2" >>.env; fi
}
write_settings() {
  if [ ! -f .env ]; then
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
  [ -n "$PORT" ] && setting COLTEX_PORT "$PORT"
  [ -n "$EDITION" ] && setting COLTEX_EDITION "$EDITION"
  # The language of `coltex` and of the setup page (until someone picks one there).
  setting COLTEX_LANG "$LANGUAGE"
  # The images of the version just checked out (ghcr.io; see docker-compose.yml).
  setting COLTEX_IMAGE_TAG "$VERSION"
  [ "$BUILD" = 1 ] && setting COLTEX_BUILD 1
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
  docker compose config -q
}
step "$(T "Writing settings" "写入设置")" write_settings
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

# Shown with ~ for the home folder.
SHOWN_CMD="${CMD/#$HOME/~}"
SHOWN_LOG="${DIR/#$HOME/~}/install.log"

if [ "$START" = 0 ]; then
  printf '\n  %s\n\n' "$(T "Ready. Start it with:" "准备好了。启动：") ${BOLD}$SHOWN_CMD start${RESET}"
  exit 0
fi

# ---- Download (or build) and start --------------------------------------------------
if [ "$(get COLTEX_BUILD)" = 1 ]; then
  step "$(T "Building the images (several minutes; TeX Live is large)" "构建镜像（需要几分钟，TeX Live 很大）")" docker compose build
elif ! pull_images; then
  note "$(T "No prebuilt images for $VERSION; building them from the sources." "$VERSION 没有预构建的镜像，改为从源码构建。")"
  step "$(T "Building the images (several minutes; TeX Live is large)" "构建镜像（需要几分钟，TeX Live 很大）")" docker compose build
fi
step "$(T "Starting the services" "启动服务")" "$DIR/coltex" deploy
wait_ready() {
  for _ in $(seq 1 180); do
    curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "ColTex did not answer on port $PORT; see: $CMD logs"
  return 1
}
step "$(T "Waiting for ColTex" "等待 ColTex 就绪")" wait_ready

# ---- Remote access, if asked for (these print links and codes, so they show) -----------
if [ "$TAILSCALE" = 1 ]; then
  printf '\n  %s\n' "${BOLD}$(T "Tailscale: sign this server in to your tailnet" "Tailscale：把这台服务器登录到你的 tailnet")${RESET}"
  "$DIR/coltex" tailscale up
fi
if [ -n "$CF_TOKEN" ]; then
  printf '\n  %s\n' "${BOLD}Cloudflare Tunnel${RESET}"
  CF_TUNNEL_TOKEN="$CF_TOKEN" "$DIR/coltex" cloudflare token
elif [ "$CF_QUICK" = 1 ]; then
  printf '\n  %s\n' "${BOLD}$(T "Cloudflare Tunnel (temporary link)" "Cloudflare Tunnel（临时链接）")${RESET}"
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
address() { printf '    %s  %s\n' "${BLUE}$1${RESET}" "${DIM}$2${RESET}"; }
if [ "$FRESH" = 1 ]; then
  printf '\n  %s\n\n' "${BOLD}$(T "ColTex is running. Open it and create the administrator account:" "ColTex 已启动。打开下面的地址，创建管理员账号：")${RESET}"
else
  printf '\n  %s\n\n' "${BOLD}$(T "ColTex $VERSION is running:" "ColTex $VERSION 已启动：")${RESET}"
fi
DOMAIN="$(get COLTEX_DOMAIN)"
public=0
if [ -n "$DOMAIN" ]; then
  address "https://$DOMAIN" "$(T "(the first visit can take a minute while Caddy gets the certificate)" "（第一次访问时 Caddy 要申请证书，可能需要一分钟）")"
  address "http://localhost:$PORT" "$(T "(on this machine)" "（本机）")"
else
  address "http://localhost:$PORT" "$(T "(on this machine)" "（本机）")"
  for ip in $addresses; do
    if is_private "$ip"; then address "http://$ip:$PORT" "$(T "(on your network)" "（局域网）")"
    else address "http://$ip:$PORT" "$(T "(public address)" "（公网地址）")"; public=1; fi
  done
fi
if [ "$public" = 1 ]; then
  printf '\n  %s\n' "${AMBER}$(T "This server is reachable from the internet: for real use don't sign in over plain http. Use --domain (HTTPS), Tailscale or a Cloudflare tunnel." "这台服务器能从公网访问：正式使用时不要通过明文 http 登录，请用 --domain（HTTPS）、Tailscale 或 Cloudflare 隧道。")${RESET}"
fi
printf '\n  %s\n' "$(T "Manage it:" "管理：") ${BOLD}$SHOWN_CMD status | logs | update | stop | start${RESET}"
printf '  %s\n' "$(T "Remote access later:" "之后开启远程访问：") ${BOLD}$SHOWN_CMD tailscale up${RESET} | ${BOLD}cloudflare quick${RESET} | ${BOLD}cloudflare token${RESET}"
printf '  %s\n\n' "${DIM}$(T "Full output: $SHOWN_LOG" "完整输出：$SHOWN_LOG")${RESET}"
