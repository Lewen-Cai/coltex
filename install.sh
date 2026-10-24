#!/usr/bin/env bash
# Install ColTex on this machine (Linux or macOS) with Docker:
#
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
#
# Without options, it asks for the language, the TeX Live edition and how to reach ColTex
# (arrow keys). Options answer those questions, or replace them where there is no terminal:
#   --lang LANG             the language of the installer, `coltex` and the setup page:
#                           en, zh-CN, zh-TW, ja, ko, es, fr, de, pt-BR, it, ru, tr, vi, id
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
#   --images REGISTRY       where to download the images from: aliyun (the same images on
#                           Alibaba Cloud), ghcr (ghcr.io/lewen-cai) or another mirror of
#                           ghcr.io. Without it, whichever answers faster from here (Alibaba
#                           Cloud in mainland China; kept for updates: COLTEX_IMAGES in .env)
#   --build                 build the images from the sources here instead of downloading
#                           the prebuilt ones (kept for updates: COLTEX_BUILD=1 in .env)
#   --no-start              get the code and write the settings, but don't download or start
#
# Run again to update to the latest release: settings and data stay. The full output of
# every step goes to install.log in the ColTex folder.
set -euo pipefail

# The repository the one-line command points at (COLTEX_REPO overrides it).
DEFAULT_REPO="${COLTEX_REPO:-https://github.com/Lewen-Cai/coltex.git}"
# Where the images are: ghcr.io, and the same ones copied to Alibaba Cloud Container Registry
# for mainland China (the mirror job in .github/workflows/images.yml).
GHCR_IMAGES="ghcr.io/lewen-cai"
ALIYUN_IMAGES="crpi-jf7w2fwdvslokqcw.cn-guangzhou.personal.cr.aliyuncs.com/coltex"

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
IMAGES=""

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
    --images) IMAGES="${2%/}"; shift 2 ;;
    --build) BUILD=1; shift ;;
    --no-start) START=0; shift ;;
    -h | --help) sed -n '2,33p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

case "$EDITION" in "" | standard | full) ;; *) echo "--edition is standard or full" >&2; exit 2 ;; esac
case "$IMAGES" in
  aliyun) IMAGES="$ALIYUN_IMAGES" ;;
  ghcr | github) IMAGES="$GHCR_IMAGES" ;;
esac
# A language setting or a locale (ja_JP.UTF-8, and zh from before there were more) as one of
# ColTex's interface languages (the web app's lib/locales.ts), or nothing.
lang_id() {
  case "$1" in
    zh_TW* | zh_HK* | zh_MO* | zh-TW | zh-HK | zh-MO | zh-Hant* | zh_Hant*) echo zh-TW ;;
    zh*) echo zh-CN ;;
    pt*) echo pt-BR ;;
    *) case "${1%%[_.@-]*}" in en | ja | ko | es | fr | de | it | ru | tr | vi | id) echo "${1%%[_.@-]*}" ;; esac ;;
  esac
}
LANGS=(zh-CN zh-TW en ja ko es fr de pt-BR it ru tr vi id)
LANG_NAMES=("简体中文" "繁體中文" "English" "日本語" "한국어" "Español" "Français" "Deutsch" "Português (Brasil)" "Italiano" "Русский" "Türkçe" "Tiếng Việt" "Bahasa Indonesia")
if [ -n "$LANGUAGE" ]; then
  given="$LANGUAGE"
  LANGUAGE="$(lang_id "$given")"
  [ -n "$LANGUAGE" ] || { echo "--lang is one of: ${LANGS[*]} (not $given)" >&2; exit 2; }
fi

have() { command -v "$1" >/dev/null 2>&1; }

# ---- The terminal -------------------------------------------------------------------
# Interactive: a terminal to draw on and to read answers from (also under `curl | bash`).
TTY=0
if [ -t 1 ] && { : </dev/tty; } 2>/dev/null; then TTY=1; fi
COLS="$(tput cols 2>/dev/null || echo 80)"
ESC=$'\033'
RESET="" BOLD="" DIM="" BLUE="" WHITE="" GREEN="" RED="" AMBER="" BG_BLUE="" BG_WHITE=""
if [ "$TTY" = 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RESET="${ESC}[0m" BOLD="${ESC}[1m" DIM="${ESC}[2m"
  case "${COLORTERM:-}" in
    truecolor | 24bit)
      BLUE="${ESC}[38;2;37;99;235m" WHITE="${ESC}[38;2;255;255;255m" GREEN="${ESC}[38;2;22;163;74m"
      RED="${ESC}[38;2;220;38;38m" AMBER="${ESC}[38;2;217;119;6m" BG_BLUE="${ESC}[48;2;37;99;235m" BG_WHITE="${ESC}[48;2;255;255;255m" ;;
    *)
      BLUE="${ESC}[38;5;27m" WHITE="${ESC}[38;5;231m" GREEN="${ESC}[38;5;34m" RED="${ESC}[38;5;160m" AMBER="${ESC}[38;5;172m" BG_BLUE="${ESC}[48;5;27m" BG_WHITE="${ESC}[48;5;231m" ;;
  esac
fi
cursor_hide() { [ "$TTY" = 1 ] && printf '%s' "${ESC}[?25l" || true; }
cursor_show() { [ "$TTY" = 1 ] && printf '%s' "${ESC}[?25h" || true; }
trap 'cursor_show; printf "%s\n" "$RESET"; exit 130' INT TERM
trap 'cursor_show' EXIT

# Columns a string takes: one per character (UTF-8 continuation bytes don't count), two for
# CJK and Hangul (lead bytes E3-ED) and full-width forms (EF BC/BD).
width() {
  local s="$1" bytes cont wide full
  bytes=$(printf '%s' "$s" | LC_ALL=C wc -c | tr -d ' ')
  cont=$(printf '%s' "$s" | LC_ALL=C tr -cd '\200-\277' | LC_ALL=C wc -c | tr -d ' ')
  wide=$(printf '%s' "$s" | LC_ALL=C tr -cd '\343-\355' | LC_ALL=C wc -c | tr -d ' ')
  full=$( (printf '%s' "$s" | LC_ALL=C grep -o $'\357[\274\275]' || true) | wc -l | tr -d ' ')
  echo $((bytes - cont + wide + full))
}
# The string padded with spaces to $2 columns.
pad() {
  local w
  w=$(width "$1")
  printf '%s%*s' "$1" $(($2 > w ? $2 - w : 0)) ''
}

# ---- Language -------------------------------------------------------------------------
# A message in the chosen language: T key [name=value…], each {name} in it replaced by the
# value. Each language is a function below (msg_en, msg_zh_CN, …) setting M; a missing one
# falls back to English.
T() {
  local key="$1" kv
  shift
  M=""
  if declare -F "msg_${LANGUAGE//-/_}" >/dev/null; then "msg_${LANGUAGE//-/_}" "$key"; fi
  [ -n "$M" ] || msg_en "$key"
  for kv in "$@"; do M="${M//\{${kv%%=*}\}/${kv#*=}}"; done
  printf '%s' "$M"
}
# >>> messages (one function per language; keep the keys the same in all of them)
msg_en() {
  case "$1" in
    tagline) M='A self-hosted collaborative LaTeX editor' ;;
    language) M='Language' ;;
    full_output) M='Full output: {log}' ;;
    downloading) M='Downloading' ;;
    download_note) M='The images are several GB, so the download can take a while.' ;;
    pull_failed) M='Downloading the images failed. Check the network connection and run this again.' ;;
    docker_install_q) M='Docker is not installed. Install it now with Docker’s script (get.docker.com, needs sudo)?' ;;
    docker_install) M='Install Docker' ;;
    cancel) M='Cancel' ;;
    docker_needed) M='Docker is needed: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker installed. If the next step says permission denied, log out and back in (docker group), then run this again.' ;;
    docker_needed_mac) M='Docker is needed: https://docs.docker.com/engine/install/ (Docker Desktop on macOS)' ;;
    checking_docker) M='Checking Docker' ;;
    no_release) M='No release found in {repo} (pass --version main for the development branch)' ;;
    edition_q) M='TeX Live edition' ;;
    edition_standard) M='Standard: everything compiles; about 3 GB to download, 12 GB on disk' ;;
    edition_full) M='Full: also the package manuals for the AI agent; about 8 GB, 23 GB on disk' ;;
    access_q) M='How will people reach ColTex?' ;;
    access_local) M='On this machine and its network' ;;
    access_domain) M='A domain of mine, with HTTPS' ;;
    access_tailscale) M='Tailscale (my tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel with my domain' ;;
    access_cf_quick) M='A temporary public link (trycloudflare.com)' ;;
    ask_domain) M='Domain (its DNS must point here; ports 80 and 443 open):' ;;
    ask_token) M='Tunnel token (from the Cloudflare dashboard):' ;;
    updating_to) M='Updating ColTex to {version}' ;;
    getting) M='Getting ColTex {version}' ;;
    writing_settings) M='Writing settings' ;;
    ready_start) M='Ready. Start it with:' ;;
    building) M='Building the images (several minutes; TeX Live is large)' ;;
    no_prebuilt) M='No prebuilt images for {version}; building them from the sources.' ;;
    starting) M='Starting the services' ;;
    waiting) M='Waiting for ColTex' ;;
    tailscale_signin) M='Tailscale: sign this server in to your tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (temporary link)' ;;
    running_fresh) M='ColTex is running. Open it and create the administrator account:' ;;
    running_version) M='ColTex {version} is running:' ;;
    first_visit) M='(the first visit can take a minute while Caddy gets the certificate)' ;;
    this_machine) M='(on this machine)' ;;
    your_network) M='(on your network)' ;;
    public_address) M='(public address)' ;;
    public_warning) M='This server is reachable from the internet: for real use don’t sign in over plain http. Use --domain (HTTPS), Tailscale or a Cloudflare tunnel.' ;;
    manage) M='Manage it:' ;;
    remote_later) M='Remote access later:' ;;
    pull_retry) M='The download was cut off; trying again ({n}/{max}). Finished layers are kept.' ;;
    pull_hint) M='If ghcr.io is slow from here (in mainland China, say): run this again with --images aliyun, the same images on Alibaba Cloud (registry-mirrors in Docker’s daemon.json only applies to Docker Hub). If the connection keeps breaking: set "max-concurrent-downloads": 1 and "max-download-attempts": 10 in /etc/docker/daemon.json, restart Docker, and run this again.' ;;
    images_aliyun) M='Alibaba Cloud answers faster from here: images from Alibaba Cloud (--images ghcr to use ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud doesn’t have these images yet: downloading them from ghcr.io.' ;;
    docker_permission) M='This user may not use Docker. Run sudo usermod -aG docker {user}, log out and back in (or run newgrp docker), then run this again.' ;;
    path_hint) M='To run it as just coltex, add {dir} to PATH: {line}' ;;
  esac
}
msg_zh_CN() {
  case "$1" in
    tagline) M='自托管的协作 LaTeX 编辑器' ;;
    language) M='语言' ;;
    full_output) M='完整输出：{log}' ;;
    downloading) M='下载镜像' ;;
    download_note) M='镜像有几 GB，下载需要一段时间。' ;;
    pull_failed) M='下载镜像失败。请检查网络连接后重新运行。' ;;
    docker_install_q) M='没有安装 Docker。现在用 Docker 的官方脚本（get.docker.com，需要 sudo）安装吗？' ;;
    docker_install) M='安装 Docker' ;;
    cancel) M='取消' ;;
    docker_needed) M='需要 Docker：https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker 已安装。如果下一步提示权限不足，请注销后重新登录（docker 用户组），再运行一次。' ;;
    docker_needed_mac) M='需要 Docker：https://docs.docker.com/engine/install/（macOS 上用 Docker Desktop）' ;;
    checking_docker) M='检查 Docker' ;;
    no_release) M='在 {repo} 里没有找到发布版本（开发分支请加 --version main）' ;;
    edition_q) M='TeX Live 版本' ;;
    edition_standard) M='标准版：能编译的文档完全一样；下载约 3 GB，占用约 12 GB' ;;
    edition_full) M='完整版：另含宏包手册，供 AI 智能体查阅；下载约 8 GB，占用约 23 GB' ;;
    access_q) M='大家怎样访问 ColTex？' ;;
    access_local) M='本机和局域网' ;;
    access_domain) M='我自己的域名，启用 HTTPS' ;;
    access_tailscale) M='Tailscale（我的 tailnet）' ;;
    access_cf_token) M='Cloudflare Tunnel，用我的域名' ;;
    access_cf_quick) M='临时公网链接（trycloudflare.com）' ;;
    ask_domain) M='域名（DNS 要解析到这台机器，并开放 80 和 443 端口）：' ;;
    ask_token) M='隧道令牌（在 Cloudflare 控制台里）：' ;;
    updating_to) M='更新 ColTex 到 {version}' ;;
    getting) M='获取 ColTex {version}' ;;
    writing_settings) M='写入设置' ;;
    ready_start) M='准备好了。启动：' ;;
    building) M='构建镜像（需要几分钟，TeX Live 很大）' ;;
    no_prebuilt) M='{version} 没有预构建的镜像，改为从源码构建。' ;;
    starting) M='启动服务' ;;
    waiting) M='等待 ColTex 就绪' ;;
    tailscale_signin) M='Tailscale：把这台服务器登录到你的 tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel（临时链接）' ;;
    running_fresh) M='ColTex 已启动。打开下面的地址，创建管理员账号：' ;;
    running_version) M='ColTex {version} 已启动：' ;;
    first_visit) M='（第一次访问时 Caddy 要申请证书，可能需要一分钟）' ;;
    this_machine) M='（本机）' ;;
    your_network) M='（局域网）' ;;
    public_address) M='（公网地址）' ;;
    public_warning) M='这台服务器能从公网访问：正式使用时不要通过明文 http 登录，请用 --domain（HTTPS）、Tailscale 或 Cloudflare 隧道。' ;;
    manage) M='管理：' ;;
    remote_later) M='之后开启远程访问：' ;;
    pull_retry) M='下载中断，正在重试（{n}/{max}）。已下载完的层会保留。' ;;
    pull_hint) M='如果从这里访问 ghcr.io 很慢（比如在中国大陆）：加上 --images aliyun 重新运行，从阿里云下载同样的镜像（Docker daemon.json 里的 registry-mirrors 只对 Docker Hub 有效）。如果连接总是中断：在 /etc/docker/daemon.json 中设置 "max-concurrent-downloads": 1 和 "max-download-attempts": 10，重启 Docker 后重新运行。' ;;
    images_aliyun) M='从这里访问阿里云更快：从阿里云下载镜像（--images ghcr 改用 ghcr.io）' ;;
    images_fallback) M='阿里云上还没有这些镜像：改从 ghcr.io 下载。' ;;
    docker_permission) M='当前用户无权使用 Docker。请运行 sudo usermod -aG docker {user}，然后重新登录（或运行 newgrp docker），再重新运行本脚本。' ;;
    path_hint) M='想直接输入 coltex 运行，请把 {dir} 加入 PATH：{line}' ;;
  esac
}
msg_zh_TW() {
  case "$1" in
    tagline) M='自行架設的協作 LaTeX 編輯器' ;;
    language) M='語言' ;;
    full_output) M='完整輸出：{log}' ;;
    downloading) M='下載映像檔' ;;
    download_note) M='映像檔有好幾 GB，下載需要一段時間。' ;;
    pull_failed) M='下載映像檔失敗。請檢查網路連線後重新執行。' ;;
    docker_install_q) M='尚未安裝 Docker。要現在用 Docker 的官方指令碼（get.docker.com，需要 sudo）安裝嗎？' ;;
    docker_install) M='安裝 Docker' ;;
    cancel) M='取消' ;;
    docker_needed) M='需要 Docker：https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker 已安裝。如果下一步出現 permission denied，請登出後重新登入（docker group），再執行一次。' ;;
    docker_needed_mac) M='需要 Docker：https://docs.docker.com/engine/install/（macOS 上請用 Docker Desktop）' ;;
    checking_docker) M='檢查 Docker' ;;
    no_release) M='在 {repo} 中找不到發佈版本（開發分支請加上 --version main）' ;;
    edition_q) M='TeX Live 版本' ;;
    edition_standard) M='標準版：能編譯的文件完全相同；下載約 3 GB，磁碟占用約 12 GB' ;;
    edition_full) M='完整版：另含套件手冊，供 AI 代理閱讀；下載約 8 GB，磁碟占用約 23 GB' ;;
    access_q) M='其他人要如何連線到 ColTex？' ;;
    access_local) M='本機及其所在網路' ;;
    access_domain) M='我自己的網域，啟用 HTTPS' ;;
    access_tailscale) M='Tailscale（我的 tailnet）' ;;
    access_cf_token) M='Cloudflare Tunnel，使用我的網域' ;;
    access_cf_quick) M='臨時公開連結（trycloudflare.com）' ;;
    ask_domain) M='網域（DNS 必須指向這台機器，並開放連接埠 80 和 443）：' ;;
    ask_token) M='通道權杖（在 Cloudflare 主控台中）：' ;;
    updating_to) M='將 ColTex 更新到 {version}' ;;
    getting) M='取得 ColTex {version}' ;;
    writing_settings) M='寫入設定' ;;
    ready_start) M='準備完成。啟動方式：' ;;
    building) M='建置映像檔（需要幾分鐘，TeX Live 很大）' ;;
    no_prebuilt) M='{version} 沒有預先建置的映像檔，改為從原始碼建置。' ;;
    starting) M='啟動服務' ;;
    waiting) M='等待 ColTex 就緒' ;;
    tailscale_signin) M='Tailscale：將這台伺服器登入你的 tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel（臨時連結）' ;;
    running_fresh) M='ColTex 已啟動。請開啟以下網址，建立管理員帳號：' ;;
    running_version) M='ColTex {version} 已啟動：' ;;
    first_visit) M='（第一次連線時 Caddy 需要取得憑證，可能要等一分鐘）' ;;
    this_machine) M='（本機）' ;;
    your_network) M='（你的網路）' ;;
    public_address) M='（公開位址）' ;;
    public_warning) M='這台伺服器可以從網際網路連線：正式使用時請不要透過未加密的 http 登入，請改用 --domain（HTTPS）、Tailscale 或 Cloudflare 通道。' ;;
    manage) M='管理：' ;;
    remote_later) M='之後開啟遠端存取：' ;;
    pull_retry) M='下載中斷，正在重試（{n}/{max}）。已下載完成的層會保留。' ;;
    pull_hint) M='如果從這裡存取 ghcr.io 很慢（例如在中國大陸）：加上 --images aliyun 重新執行，從阿里雲下載同樣的映像檔（Docker daemon.json 裡的 registry-mirrors 只對 Docker Hub 有效）。如果連線一直中斷：在 /etc/docker/daemon.json 中設定 "max-concurrent-downloads": 1 和 "max-download-attempts": 10，重新啟動 Docker 後再執行一次。' ;;
    images_aliyun) M='從這裡存取阿里雲較快：從阿里雲下載映像檔（--images ghcr 改用 ghcr.io）' ;;
    images_fallback) M='阿里雲上還沒有這些映像檔：改從 ghcr.io 下載。' ;;
    docker_permission) M='目前的使用者無權使用 Docker。請執行 sudo usermod -aG docker {user}，然後重新登入（或執行 newgrp docker），再重新執行本指令碼。' ;;
    path_hint) M='想直接輸入 coltex 執行，請把 {dir} 加入 PATH：{line}' ;;
  esac
}
msg_ja() {
  case "$1" in
    tagline) M='セルフホスト型の共同編集 LaTeX エディター' ;;
    language) M='言語' ;;
    full_output) M='出力の全文：{log}' ;;
    downloading) M='ダウンロード中' ;;
    download_note) M='イメージは数 GB あるため、ダウンロードには時間がかかります。' ;;
    pull_failed) M='イメージのダウンロードに失敗しました。ネットワーク接続を確認して、もう一度実行してください。' ;;
    docker_install_q) M='Docker がインストールされていません。Docker の公式スクリプト（get.docker.com、sudo が必要）で今すぐインストールしますか？' ;;
    docker_install) M='Docker をインストール' ;;
    cancel) M='キャンセル' ;;
    docker_needed) M='Docker が必要です：https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker をインストールしました。次の手順で permission denied と表示された場合は、一度ログアウトしてログインし直し（docker group）、もう一度実行してください。' ;;
    docker_needed_mac) M='Docker が必要です：https://docs.docker.com/engine/install/（macOS では Docker Desktop）' ;;
    checking_docker) M='Docker を確認中' ;;
    no_release) M='{repo} にリリースが見つかりません（開発ブランチを使うには --version main を指定してください）' ;;
    edition_q) M='TeX Live のエディション' ;;
    edition_standard) M='standard：すべての文書をコンパイル可能。ダウンロード約 3 GB、ディスク使用量 12 GB' ;;
    edition_full) M='full：AI エージェント用のパッケージマニュアルも含む。ダウンロード約 8 GB、ディスク使用量 23 GB' ;;
    access_q) M='ColTex へのアクセス方法は？' ;;
    access_local) M='このマシンとそのネットワークから' ;;
    access_domain) M='独自ドメイン（HTTPS）' ;;
    access_tailscale) M='Tailscale（自分の tailnet）' ;;
    access_cf_token) M='独自ドメインの Cloudflare Tunnel' ;;
    access_cf_quick) M='一時的な公開リンク（trycloudflare.com）' ;;
    ask_domain) M='ドメイン（DNS がこのマシンを指し、ポート 80 と 443 が開いている必要があります）：' ;;
    ask_token) M='トンネルトークン（Cloudflare のダッシュボードで取得）：' ;;
    updating_to) M='ColTex を {version} に更新中' ;;
    getting) M='ColTex {version} を取得中' ;;
    writing_settings) M='設定を書き込み中' ;;
    ready_start) M='準備ができました。次のコマンドで起動します：' ;;
    building) M='イメージをビルド中（TeX Live が大きいため数分かかります）' ;;
    no_prebuilt) M='{version} のビルド済みイメージがないため、ソースからビルドします。' ;;
    starting) M='サービスを起動中' ;;
    waiting) M='ColTex の起動を待機中' ;;
    tailscale_signin) M='Tailscale：このサーバーを tailnet にログインさせてください' ;;
    cf_temporary) M='Cloudflare Tunnel（一時リンク）' ;;
    running_fresh) M='ColTex が起動しました。次のアドレスを開いて管理者アカウントを作成してください：' ;;
    running_version) M='ColTex {version} が起動しています：' ;;
    first_visit) M='（初回のアクセスは、Caddy が証明書を取得するまで 1 分ほどかかることがあります）' ;;
    this_machine) M='（このマシン）' ;;
    your_network) M='（ネットワーク内）' ;;
    public_address) M='（公開アドレス）' ;;
    public_warning) M='このサーバーはインターネットからアクセスできます。本番で使う場合は暗号化されていない http でログインしないでください。--domain（HTTPS）、Tailscale、または Cloudflare Tunnel を使ってください。' ;;
    manage) M='管理：' ;;
    remote_later) M='後からリモートアクセスを有効にするには：' ;;
    pull_retry) M='ダウンロードが途切れました。再試行しています（{n}/{max}）。完了したレイヤーは保持されます。' ;;
    pull_hint) M='ここから ghcr.io が遅い場合（中国本土など）：--images aliyun を付けてもう一度実行すると、同じイメージを Alibaba Cloud からダウンロードします（Docker の daemon.json の registry-mirrors は Docker Hub にしか効きません）。接続が何度も切れる場合：/etc/docker/daemon.json に "max-concurrent-downloads": 1 と "max-download-attempts": 10 を設定し、Docker を再起動してからもう一度実行してください。' ;;
    images_aliyun) M='ここからは Alibaba Cloud のほうが速いため、イメージを Alibaba Cloud からダウンロードします（ghcr.io を使うには --images ghcr）' ;;
    images_fallback) M='Alibaba Cloud にはまだこれらのイメージがありません。ghcr.io からダウンロードします。' ;;
    docker_permission) M='このユーザーは Docker を使えません。sudo usermod -aG docker {user} を実行し、ログインし直して（または newgrp docker を実行して）から、もう一度実行してください。' ;;
    path_hint) M='coltex だけで実行するには、{dir} を PATH に追加してください：{line}' ;;
  esac
}
msg_ko() {
  case "$1" in
    tagline) M='자체 호스팅 협업 LaTeX 편집기' ;;
    language) M='언어' ;;
    full_output) M='전체 출력: {log}' ;;
    downloading) M='다운로드 중' ;;
    download_note) M='이미지가 몇 GB라서 내려받는 데 시간이 걸립니다.' ;;
    pull_failed) M='이미지를 내려받지 못했습니다. 네트워크 연결을 확인한 뒤 다시 실행하세요.' ;;
    docker_install_q) M='Docker가 설치되어 있지 않습니다. 지금 Docker 설치 스크립트(get.docker.com, sudo 필요)로 설치할까요?' ;;
    docker_install) M='Docker 설치' ;;
    cancel) M='취소' ;;
    docker_needed) M='Docker가 필요합니다: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker를 설치했습니다. 다음 단계에서 permission denied가 나오면 로그아웃했다가 다시 로그인(docker group)한 뒤 이 명령을 다시 실행하세요.' ;;
    docker_needed_mac) M='Docker가 필요합니다: https://docs.docker.com/engine/install/ (macOS에서는 Docker Desktop)' ;;
    checking_docker) M='Docker 확인 중' ;;
    no_release) M='{repo}에서 릴리스를 찾을 수 없습니다(개발 브랜치를 쓰려면 --version main을 지정하세요)' ;;
    edition_q) M='TeX Live 에디션' ;;
    edition_standard) M='standard: 모든 문서를 컴파일할 수 있음, 다운로드 약 3 GB, 디스크 12 GB' ;;
    edition_full) M='full: AI 에이전트용 패키지 매뉴얼 포함, 다운로드 약 8 GB, 디스크 23 GB' ;;
    access_q) M='사람들이 ColTex에 어떻게 접속하나요?' ;;
    access_local) M='이 컴퓨터와 그 네트워크에서' ;;
    access_domain) M='내 도메인으로, HTTPS 사용' ;;
    access_tailscale) M='Tailscale(내 tailnet)' ;;
    access_cf_token) M='내 도메인을 쓰는 Cloudflare Tunnel' ;;
    access_cf_quick) M='임시 공개 링크(trycloudflare.com)' ;;
    ask_domain) M='도메인(DNS가 이 서버를 가리키고 포트 80과 443이 열려 있어야 함):' ;;
    ask_token) M='터널 토큰(Cloudflare 대시보드에서 확인):' ;;
    updating_to) M='ColTex를 {version}(으)로 업데이트하는 중' ;;
    getting) M='ColTex {version} 내려받는 중' ;;
    writing_settings) M='설정 쓰는 중' ;;
    ready_start) M='준비되었습니다. 다음 명령으로 시작하세요:' ;;
    building) M='이미지 빌드 중(몇 분 걸립니다. TeX Live는 용량이 큽니다)' ;;
    no_prebuilt) M='{version}용으로 미리 빌드된 이미지가 없어 소스에서 빌드합니다.' ;;
    starting) M='서비스 시작 중' ;;
    waiting) M='ColTex를 기다리는 중' ;;
    tailscale_signin) M='Tailscale: 이 서버를 tailnet에 로그인하세요' ;;
    cf_temporary) M='Cloudflare Tunnel(임시 링크)' ;;
    running_fresh) M='ColTex가 실행 중입니다. 열어서 관리자 계정을 만드세요:' ;;
    running_version) M='ColTex {version} 실행 중:' ;;
    first_visit) M='(Caddy가 인증서를 받는 동안 첫 접속에 1분 정도 걸릴 수 있습니다)' ;;
    this_machine) M='(이 컴퓨터에서)' ;;
    your_network) M='(내 네트워크에서)' ;;
    public_address) M='(공개 주소)' ;;
    public_warning) M='이 서버는 인터넷에서 접속할 수 있습니다. 실제로 사용할 때는 암호화되지 않은 http로 로그인하지 마세요. --domain(HTTPS), Tailscale 또는 Cloudflare 터널을 사용하세요.' ;;
    manage) M='관리:' ;;
    remote_later) M='나중에 원격 접속을 켜려면:' ;;
    pull_retry) M='다운로드가 끊겼습니다. 다시 시도합니다({n}/{max}). 다 받은 레이어는 유지됩니다.' ;;
    pull_hint) M='여기서 ghcr.io가 느리다면(예: 중국 본토): --images aliyun을 붙여 다시 실행하면 같은 이미지를 Alibaba Cloud에서 받습니다(Docker daemon.json의 registry-mirrors는 Docker Hub에만 적용됩니다). 연결이 계속 끊긴다면: /etc/docker/daemon.json에 "max-concurrent-downloads": 1과 "max-download-attempts": 10을 설정하고 Docker를 다시 시작한 뒤 다시 실행하세요.' ;;
    images_aliyun) M='여기서는 Alibaba Cloud가 더 빠르므로 이미지를 Alibaba Cloud에서 받습니다(ghcr.io를 쓰려면 --images ghcr)' ;;
    images_fallback) M='Alibaba Cloud에 아직 이 이미지가 없습니다. ghcr.io에서 받습니다.' ;;
    docker_permission) M='이 사용자는 Docker를 사용할 수 없습니다. sudo usermod -aG docker {user}를 실행하고 다시 로그인한 뒤(또는 newgrp docker 실행) 다시 실행하세요.' ;;
    path_hint) M='coltex만 입력해 실행하려면 {dir}을(를) PATH에 추가하세요: {line}' ;;
  esac
}
msg_es() {
  case "$1" in
    tagline) M='Un editor de LaTeX colaborativo y autoalojado' ;;
    language) M='Idioma' ;;
    full_output) M='Salida completa: {log}' ;;
    downloading) M='Descargando' ;;
    download_note) M='Las imágenes ocupan varios GB, así que la descarga puede tardar.' ;;
    pull_failed) M='No se pudieron descargar las imágenes. Revisa la conexión de red y vuelve a ejecutar esto.' ;;
    docker_install_q) M='Docker no está instalado. ¿Instalarlo ahora con el script de Docker (get.docker.com, requiere sudo)?' ;;
    docker_install) M='Instalar Docker' ;;
    cancel) M='Cancelar' ;;
    docker_needed) M='Se necesita Docker: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker instalado. Si el siguiente paso dice permission denied, cierra la sesión y vuelve a entrar (docker group) y ejecuta esto de nuevo.' ;;
    docker_needed_mac) M='Se necesita Docker: https://docs.docker.com/engine/install/ (Docker Desktop en macOS)' ;;
    checking_docker) M='Comprobando Docker' ;;
    no_release) M='No se encontró ninguna versión en {repo} (usa --version main para la rama de desarrollo)' ;;
    edition_q) M='Edición de TeX Live' ;;
    edition_standard) M='Standard: compila todo; unos 3 GB de descarga, 12 GB en disco' ;;
    edition_full) M='Full: incluye también los manuales de los paquetes para el agente de IA; unos 8 GB, 23 GB en disco' ;;
    access_q) M='¿Cómo accederán las personas a ColTex?' ;;
    access_local) M='En esta máquina y su red' ;;
    access_domain) M='Un dominio propio, con HTTPS' ;;
    access_tailscale) M='Tailscale (mi tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel con mi dominio' ;;
    access_cf_quick) M='Un enlace público temporal (trycloudflare.com)' ;;
    ask_domain) M='Dominio (su DNS debe apuntar aquí; puertos 80 y 443 abiertos):' ;;
    ask_token) M='Token del túnel (del panel de Cloudflare):' ;;
    updating_to) M='Actualizando ColTex a {version}' ;;
    getting) M='Descargando ColTex {version}' ;;
    writing_settings) M='Escribiendo la configuración' ;;
    ready_start) M='Listo. Inícialo con:' ;;
    building) M='Compilando las imágenes (varios minutos; TeX Live es grande)' ;;
    no_prebuilt) M='No hay imágenes precompiladas para {version}; se compilarán a partir del código fuente.' ;;
    starting) M='Iniciando los servicios' ;;
    waiting) M='Esperando a ColTex' ;;
    tailscale_signin) M='Tailscale: conecta este servidor a tu tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (enlace temporal)' ;;
    running_fresh) M='ColTex está en marcha. Ábrelo y crea la cuenta de administrador:' ;;
    running_version) M='ColTex {version} está en marcha:' ;;
    first_visit) M='(la primera visita puede tardar un minuto mientras Caddy obtiene el certificado)' ;;
    this_machine) M='(en esta máquina)' ;;
    your_network) M='(en tu red)' ;;
    public_address) M='(dirección pública)' ;;
    public_warning) M='Este servidor es accesible desde internet: para un uso real, no inicies sesión por http sin cifrar. Usa --domain (HTTPS), Tailscale o un túnel de Cloudflare.' ;;
    manage) M='Gestión:' ;;
    remote_later) M='Acceso remoto más adelante:' ;;
    pull_retry) M='La descarga se cortó; reintentando ({n}/{max}). Las capas ya descargadas se conservan.' ;;
    pull_hint) M='Si ghcr.io va lento desde aquí (en China continental, por ejemplo): vuelve a ejecutarlo con --images aliyun, las mismas imágenes en Alibaba Cloud (registry-mirrors en el daemon.json de Docker solo se aplica a Docker Hub). Si la conexión se corta una y otra vez: pon "max-concurrent-downloads": 1 y "max-download-attempts": 10 en /etc/docker/daemon.json, reinicia Docker y vuelve a ejecutarlo.' ;;
    images_aliyun) M='Alibaba Cloud responde más rápido desde aquí: imágenes desde Alibaba Cloud (--images ghcr para usar ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud aún no tiene estas imágenes: se descargan de ghcr.io.' ;;
    docker_permission) M='Este usuario no puede usar Docker. Ejecuta sudo usermod -aG docker {user}, cierra la sesión y vuelve a entrar (o ejecuta newgrp docker) y luego vuelve a ejecutar esto.' ;;
    path_hint) M='Para ejecutarlo solo como coltex, añade {dir} al PATH: {line}' ;;
  esac
}
msg_fr() {
  case "$1" in
    tagline) M='Un éditeur LaTeX collaboratif auto-hébergé' ;;
    language) M='Langue' ;;
    full_output) M='Sortie complète : {log}' ;;
    downloading) M='Téléchargement' ;;
    download_note) M='Les images font plusieurs GB : le téléchargement peut prendre un moment.' ;;
    pull_failed) M='Le téléchargement des images a échoué. Vérifiez la connexion réseau et relancez la commande.' ;;
    docker_install_q) M='Docker n’est pas installé. L’installer maintenant avec le script de Docker (get.docker.com, nécessite sudo) ?' ;;
    docker_install) M='Installer Docker' ;;
    cancel) M='Annuler' ;;
    docker_needed) M='Docker est nécessaire : https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker est installé. Si l’étape suivante indique « permission denied », déconnectez-vous puis reconnectez-vous (docker group), puis relancez cette commande.' ;;
    docker_needed_mac) M='Docker est nécessaire : https://docs.docker.com/engine/install/ (Docker Desktop sur macOS)' ;;
    checking_docker) M='Vérification de Docker' ;;
    no_release) M='Aucune version publiée trouvée dans {repo} (indiquez --version main pour la branche de développement)' ;;
    edition_q) M='Édition de TeX Live' ;;
    edition_standard) M='Standard : tout compile ; environ 3 GB à télécharger, 12 GB sur le disque' ;;
    edition_full) M='Full : avec en plus les manuels des packages pour l’agent IA ; environ 8 GB, 23 GB sur le disque' ;;
    access_q) M='Comment les gens accéderont-ils à ColTex ?' ;;
    access_local) M='Sur cette machine et son réseau' ;;
    access_domain) M='Un domaine à moi, avec HTTPS' ;;
    access_tailscale) M='Tailscale (mon tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel avec mon domaine' ;;
    access_cf_quick) M='Un lien public temporaire (trycloudflare.com)' ;;
    ask_domain) M='Domaine (son DNS doit pointer ici ; ports 80 et 443 ouverts) :' ;;
    ask_token) M='Jeton du tunnel (depuis le tableau de bord Cloudflare) :' ;;
    updating_to) M='Mise à jour de ColTex vers {version}' ;;
    getting) M='Récupération de ColTex {version}' ;;
    writing_settings) M='Écriture des réglages' ;;
    ready_start) M='Prêt. Démarrez-le avec :' ;;
    building) M='Construction des images (plusieurs minutes ; TeX Live est volumineux)' ;;
    no_prebuilt) M='Pas d’images précompilées pour {version} ; construction à partir des sources.' ;;
    starting) M='Démarrage des services' ;;
    waiting) M='En attente de ColTex' ;;
    tailscale_signin) M='Tailscale : connectez ce serveur à votre tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (lien temporaire)' ;;
    running_fresh) M='ColTex est en marche. Ouvrez-le et créez le compte administrateur :' ;;
    running_version) M='ColTex {version} est en marche :' ;;
    first_visit) M='(la première visite peut prendre une minute, le temps que Caddy obtienne le certificat)' ;;
    this_machine) M='(sur cette machine)' ;;
    your_network) M='(sur votre réseau)' ;;
    public_address) M='(adresse publique)' ;;
    public_warning) M='Ce serveur est joignable depuis Internet : pour un usage réel, ne vous connectez pas en simple http. Utilisez --domain (HTTPS), Tailscale ou un tunnel Cloudflare.' ;;
    manage) M='Pour le gérer :' ;;
    remote_later) M='Accès à distance plus tard :' ;;
    pull_retry) M='Le téléchargement a été interrompu ; nouvel essai ({n}/{max}). Les couches terminées sont conservées.' ;;
    pull_hint) M='Si ghcr.io est lent depuis ici (en Chine continentale, par exemple) : relancez avec --images aliyun, les mêmes images sur Alibaba Cloud (registry-mirrors dans le daemon.json de Docker ne s’applique qu’à Docker Hub). Si la connexion coupe sans cesse : mettez "max-concurrent-downloads": 1 et "max-download-attempts": 10 dans /etc/docker/daemon.json, redémarrez Docker, puis relancez.' ;;
    images_aliyun) M='Alibaba Cloud répond plus vite d’ici : images depuis Alibaba Cloud (--images ghcr pour utiliser ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud n’a pas encore ces images : téléchargement depuis ghcr.io.' ;;
    docker_permission) M='Cet utilisateur ne peut pas utiliser Docker. Lancez sudo usermod -aG docker {user}, déconnectez-vous puis reconnectez-vous (ou lancez newgrp docker), puis relancez.' ;;
    path_hint) M='Pour le lancer simplement avec coltex, ajoutez {dir} au PATH : {line}' ;;
  esac
}
msg_de() {
  case "$1" in
    tagline) M='Ein selbst gehosteter kollaborativer LaTeX-Editor' ;;
    language) M='Sprache' ;;
    full_output) M='Vollständige Ausgabe: {log}' ;;
    downloading) M='Wird heruntergeladen' ;;
    download_note) M='Die Images sind mehrere GB groß, der Download kann eine Weile dauern.' ;;
    pull_failed) M='Die Images konnten nicht heruntergeladen werden. Prüfen Sie die Netzwerkverbindung und starten Sie den Befehl erneut.' ;;
    docker_install_q) M='Docker ist nicht installiert. Jetzt mit dem Skript von Docker installieren (get.docker.com, benötigt sudo)?' ;;
    docker_install) M='Docker installieren' ;;
    cancel) M='Abbrechen' ;;
    docker_needed) M='Docker wird benötigt: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker ist installiert. Meldet der nächste Schritt „permission denied“, melden Sie sich ab und wieder an (docker group) und führen Sie dies erneut aus.' ;;
    docker_needed_mac) M='Docker wird benötigt: https://docs.docker.com/engine/install/ (Docker Desktop unter macOS)' ;;
    checking_docker) M='Docker wird geprüft' ;;
    no_release) M='Keine Version in {repo} gefunden (mit --version main erhalten Sie den Entwicklungszweig)' ;;
    edition_q) M='TeX-Live-Edition' ;;
    edition_standard) M='Standard: alles kompiliert; etwa 3 GB Download, 12 GB auf der Festplatte' ;;
    edition_full) M='Full: zusätzlich die Paket-Handbücher für den KI-Agenten; etwa 8 GB, 23 GB auf der Festplatte' ;;
    access_q) M='Wie sollen Personen ColTex erreichen?' ;;
    access_local) M='Auf diesem Rechner und in seinem Netzwerk' ;;
    access_domain) M='Über eine eigene Domain, mit HTTPS' ;;
    access_tailscale) M='Tailscale (mein tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel mit meiner Domain' ;;
    access_cf_quick) M='Ein temporärer öffentlicher Link (trycloudflare.com)' ;;
    ask_domain) M='Domain (ihr DNS-Eintrag muss hierher zeigen; Ports 80 und 443 offen):' ;;
    ask_token) M='Tunnel-Token (aus dem Cloudflare-Dashboard):' ;;
    updating_to) M='ColTex wird auf {version} aktualisiert' ;;
    getting) M='ColTex {version} wird geholt' ;;
    writing_settings) M='Einstellungen werden geschrieben' ;;
    ready_start) M='Fertig. Starten Sie es mit:' ;;
    building) M='Images werden gebaut (mehrere Minuten; TeX Live ist groß)' ;;
    no_prebuilt) M='Keine vorgefertigten Images für {version}; sie werden aus den Quellen gebaut.' ;;
    starting) M='Dienste werden gestartet' ;;
    waiting) M='Warten auf ColTex' ;;
    tailscale_signin) M='Tailscale: Melden Sie diesen Server in Ihrem tailnet an' ;;
    cf_temporary) M='Cloudflare Tunnel (temporärer Link)' ;;
    running_fresh) M='ColTex läuft. Öffnen Sie es und erstellen Sie das Administratorkonto:' ;;
    running_version) M='ColTex {version} läuft:' ;;
    first_visit) M='(der erste Aufruf kann eine Minute dauern, während Caddy das Zertifikat holt)' ;;
    this_machine) M='(auf diesem Rechner)' ;;
    your_network) M='(in Ihrem Netzwerk)' ;;
    public_address) M='(öffentliche Adresse)' ;;
    public_warning) M='Dieser Server ist aus dem Internet erreichbar: Melden Sie sich im echten Betrieb nicht über unverschlüsseltes http an. Verwenden Sie --domain (HTTPS), Tailscale oder einen Cloudflare Tunnel.' ;;
    manage) M='Verwaltung:' ;;
    remote_later) M='Fernzugriff später:' ;;
    pull_retry) M='Der Download wurde unterbrochen; neuer Versuch ({n}/{max}). Fertige Layer bleiben erhalten.' ;;
    pull_hint) M='Wenn ghcr.io von hier aus langsam ist (etwa in Festlandchina): erneut mit --images aliyun ausführen, dieselben Images bei Alibaba Cloud (registry-mirrors in Dockers daemon.json gilt nur für Docker Hub). Wenn die Verbindung immer wieder abbricht: "max-concurrent-downloads": 1 und "max-download-attempts": 10 in /etc/docker/daemon.json setzen, Docker neu starten und erneut ausführen.' ;;
    images_aliyun) M='Alibaba Cloud antwortet von hier schneller: Images von Alibaba Cloud (--images ghcr für ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud hat diese Images noch nicht: Download von ghcr.io.' ;;
    docker_permission) M='Dieser Benutzer darf Docker nicht verwenden. Führen Sie sudo usermod -aG docker {user} aus, melden Sie sich ab und wieder an (oder führen Sie newgrp docker aus) und starten Sie dies erneut.' ;;
    path_hint) M='Um es einfach als coltex auszuführen, fügen Sie {dir} zum PATH hinzu: {line}' ;;
  esac
}
msg_pt_BR() {
  case "$1" in
    tagline) M='Um editor de LaTeX colaborativo e auto-hospedado' ;;
    language) M='Idioma' ;;
    full_output) M='Saída completa: {log}' ;;
    downloading) M='Baixando' ;;
    download_note) M='As imagens têm vários GB, então o download pode demorar.' ;;
    pull_failed) M='Não foi possível baixar as imagens. Verifique a conexão de rede e execute de novo.' ;;
    docker_install_q) M='O Docker não está instalado. Instalar agora com o script do Docker (get.docker.com, requer sudo)?' ;;
    docker_install) M='Instalar o Docker' ;;
    cancel) M='Cancelar' ;;
    docker_needed) M='O Docker é necessário: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker instalado. Se o próximo passo disser permission denied, saia da sessão e entre de novo (docker group) e execute isto outra vez.' ;;
    docker_needed_mac) M='O Docker é necessário: https://docs.docker.com/engine/install/ (Docker Desktop no macOS)' ;;
    checking_docker) M='Verificando o Docker' ;;
    no_release) M='Nenhuma versão encontrada em {repo} (use --version main para o branch de desenvolvimento)' ;;
    edition_q) M='Edição do TeX Live' ;;
    edition_standard) M='Standard: compila tudo; cerca de 3 GB para baixar, 12 GB em disco' ;;
    edition_full) M='Full: inclui também os manuais dos pacotes para o agente de IA; cerca de 8 GB, 23 GB em disco' ;;
    access_q) M='Como as pessoas vão acessar o ColTex?' ;;
    access_local) M='Nesta máquina e na rede dela' ;;
    access_domain) M='Um domínio meu, com HTTPS' ;;
    access_tailscale) M='Tailscale (minha tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel com meu domínio' ;;
    access_cf_quick) M='Um link público temporário (trycloudflare.com)' ;;
    ask_domain) M='Domínio (o DNS dele deve apontar para cá; portas 80 e 443 abertas):' ;;
    ask_token) M='Token do túnel (do painel da Cloudflare):' ;;
    updating_to) M='Atualizando o ColTex para {version}' ;;
    getting) M='Obtendo o ColTex {version}' ;;
    writing_settings) M='Gravando as configurações' ;;
    ready_start) M='Pronto. Inicie com:' ;;
    building) M='Compilando as imagens (vários minutos; o TeX Live é grande)' ;;
    no_prebuilt) M='Não há imagens pré-compiladas para {version}; compilando a partir do código-fonte.' ;;
    starting) M='Iniciando os serviços' ;;
    waiting) M='Aguardando o ColTex' ;;
    tailscale_signin) M='Tailscale: conecte este servidor à sua tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (link temporário)' ;;
    running_fresh) M='O ColTex está em execução. Abra-o e crie a conta de administrador:' ;;
    running_version) M='O ColTex {version} está em execução:' ;;
    first_visit) M='(o primeiro acesso pode levar um minuto enquanto o Caddy obtém o certificado)' ;;
    this_machine) M='(nesta máquina)' ;;
    your_network) M='(na sua rede)' ;;
    public_address) M='(endereço público)' ;;
    public_warning) M='Este servidor é acessível pela internet: para uso real, não faça login por http simples. Use --domain (HTTPS), Tailscale ou um Cloudflare Tunnel.' ;;
    manage) M='Para gerenciar:' ;;
    remote_later) M='Acesso remoto depois:' ;;
    pull_retry) M='O download foi interrompido; tentando de novo ({n}/{max}). As camadas já baixadas são mantidas.' ;;
    pull_hint) M='Se o ghcr.io estiver lento daqui (na China continental, por exemplo): execute de novo com --images aliyun, as mesmas imagens na Alibaba Cloud (registry-mirrors no daemon.json do Docker só vale para o Docker Hub). Se a conexão cair repetidamente: defina "max-concurrent-downloads": 1 e "max-download-attempts": 10 em /etc/docker/daemon.json, reinicie o Docker e execute de novo.' ;;
    images_aliyun) M='A Alibaba Cloud responde mais rápido daqui: imagens da Alibaba Cloud (--images ghcr para usar o ghcr.io)' ;;
    images_fallback) M='A Alibaba Cloud ainda não tem estas imagens: baixando do ghcr.io.' ;;
    docker_permission) M='Este usuário não pode usar o Docker. Execute sudo usermod -aG docker {user}, saia e entre de novo (ou execute newgrp docker) e depois execute isto de novo.' ;;
    path_hint) M='Para executá-lo só como coltex, adicione {dir} ao PATH: {line}' ;;
  esac
}
msg_it() {
  case "$1" in
    tagline) M='Un editor LaTeX collaborativo self-hosted' ;;
    language) M='Lingua' ;;
    full_output) M='Output completo: {log}' ;;
    downloading) M='Download in corso' ;;
    download_note) M='Le immagini pesano diversi GB, quindi il download può richiedere un po’ di tempo.' ;;
    pull_failed) M='Il download delle immagini non è riuscito. Controlla la connessione di rete ed esegui di nuovo il comando.' ;;
    docker_install_q) M='Docker non è installato. Vuoi installarlo ora con lo script di Docker (get.docker.com, richiede sudo)?' ;;
    docker_install) M='Installa Docker' ;;
    cancel) M='Annulla' ;;
    docker_needed) M='Serve Docker: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker installato. Se il passaggio successivo dice permission denied, esci e rientra (docker group), poi esegui di nuovo questo comando.' ;;
    docker_needed_mac) M='Serve Docker: https://docs.docker.com/engine/install/ (Docker Desktop su macOS)' ;;
    checking_docker) M='Controllo di Docker' ;;
    no_release) M='Nessuna release trovata in {repo} (usa --version main per il branch di sviluppo)' ;;
    edition_q) M='Edizione di TeX Live' ;;
    edition_standard) M='Standard: compila tutto; circa 3 GB da scaricare, 12 GB su disco' ;;
    edition_full) M='Full: anche i manuali dei pacchetti per l’agente IA; circa 8 GB, 23 GB su disco' ;;
    access_q) M='Come raggiungeranno ColTex le persone?' ;;
    access_local) M='Da questa macchina e dalla sua rete' ;;
    access_domain) M='Un mio dominio, con HTTPS' ;;
    access_tailscale) M='Tailscale (la mia tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel con il mio dominio' ;;
    access_cf_quick) M='Un link pubblico temporaneo (trycloudflare.com)' ;;
    ask_domain) M='Dominio (il suo DNS deve puntare qui; porte 80 e 443 aperte):' ;;
    ask_token) M='Token del tunnel (dalla dashboard di Cloudflare):' ;;
    updating_to) M='Aggiornamento di ColTex a {version}' ;;
    getting) M='Download di ColTex {version}' ;;
    writing_settings) M='Scrittura delle impostazioni' ;;
    ready_start) M='Pronto. Avvialo con:' ;;
    building) M='Compilazione delle immagini (diversi minuti; TeX Live è grande)' ;;
    no_prebuilt) M='Nessuna immagine precompilata per {version}; vengono compilate dai sorgenti.' ;;
    starting) M='Avvio dei servizi' ;;
    waiting) M='In attesa di ColTex' ;;
    tailscale_signin) M='Tailscale: collega questo server alla tua tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (link temporaneo)' ;;
    running_fresh) M='ColTex è in esecuzione. Aprilo e crea l’account amministratore:' ;;
    running_version) M='ColTex {version} è in esecuzione:' ;;
    first_visit) M='(la prima visita può richiedere un minuto mentre Caddy ottiene il certificato)' ;;
    this_machine) M='(su questa macchina)' ;;
    your_network) M='(nella tua rete)' ;;
    public_address) M='(indirizzo pubblico)' ;;
    public_warning) M='Questo server è raggiungibile da internet: per l’uso reale non accedere tramite http in chiaro. Usa --domain (HTTPS), Tailscale o un tunnel Cloudflare.' ;;
    manage) M='Per gestirlo:' ;;
    remote_later) M='Accesso remoto in seguito:' ;;
    pull_retry) M='Il download si è interrotto; nuovo tentativo ({n}/{max}). I layer già scaricati vengono mantenuti.' ;;
    pull_hint) M='Se ghcr.io è lento da qui (nella Cina continentale, per esempio): esegui di nuovo con --images aliyun, le stesse immagini su Alibaba Cloud (registry-mirrors nel daemon.json di Docker vale solo per Docker Hub). Se la connessione cade di continuo: imposta "max-concurrent-downloads": 1 e "max-download-attempts": 10 in /etc/docker/daemon.json, riavvia Docker ed esegui di nuovo.' ;;
    images_aliyun) M='Da qui Alibaba Cloud risponde più in fretta: immagini da Alibaba Cloud (--images ghcr per usare ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud non ha ancora queste immagini: le scarico da ghcr.io.' ;;
    docker_permission) M='Questo utente non può usare Docker. Esegui sudo usermod -aG docker {user}, esci e rientra (oppure esegui newgrp docker), poi esegui di nuovo.' ;;
    path_hint) M='Per avviarlo semplicemente con coltex, aggiungi {dir} al PATH: {line}' ;;
  esac
}
msg_ru() {
  case "$1" in
    tagline) M='Совместный LaTeX-редактор на своём сервере' ;;
    language) M='Язык' ;;
    full_output) M='Полный вывод: {log}' ;;
    downloading) M='Загрузка' ;;
    download_note) M='Образы занимают несколько GB, загрузка может занять время.' ;;
    pull_failed) M='Не удалось загрузить образы. Проверьте подключение к сети и запустите команду снова.' ;;
    docker_install_q) M='Docker не установлен. Установить его сейчас скриптом Docker (get.docker.com, нужен sudo)?' ;;
    docker_install) M='Установить Docker' ;;
    cancel) M='Отмена' ;;
    docker_needed) M='Нужен Docker: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker установлен. Если следующий шаг сообщит permission denied, выйдите из системы и войдите снова (docker group), затем запустите это ещё раз.' ;;
    docker_needed_mac) M='Нужен Docker: https://docs.docker.com/engine/install/ (Docker Desktop на macOS)' ;;
    checking_docker) M='Проверка Docker' ;;
    no_release) M='В {repo} не найдено ни одного выпуска (укажите --version main для ветки разработки)' ;;
    edition_q) M='Редакция TeX Live' ;;
    edition_standard) M='Standard: компилируется всё; загрузка около 3 GB, на диске 12 GB' ;;
    edition_full) M='Full: ещё и руководства пакетов для ИИ-агента; около 8 GB, на диске 23 GB' ;;
    access_q) M='Как люди будут открывать ColTex?' ;;
    access_local) M='На этой машине и в её сети' ;;
    access_domain) M='Мой домен, с HTTPS' ;;
    access_tailscale) M='Tailscale (мой tailnet)' ;;
    access_cf_token) M='Cloudflare Tunnel с моим доменом' ;;
    access_cf_quick) M='Временная публичная ссылка (trycloudflare.com)' ;;
    ask_domain) M='Домен (его DNS должен указывать сюда; порты 80 и 443 открыты):' ;;
    ask_token) M='Токен туннеля (из панели Cloudflare):' ;;
    updating_to) M='Обновление ColTex до {version}' ;;
    getting) M='Загрузка ColTex {version}' ;;
    writing_settings) M='Запись настроек' ;;
    ready_start) M='Готово. Запустите командой:' ;;
    building) M='Сборка образов (несколько минут; TeX Live большой)' ;;
    no_prebuilt) M='Для {version} нет готовых образов; они будут собраны из исходного кода.' ;;
    starting) M='Запуск сервисов' ;;
    waiting) M='Ожидание ColTex' ;;
    tailscale_signin) M='Tailscale: подключите этот сервер к своему tailnet' ;;
    cf_temporary) M='Cloudflare Tunnel (временная ссылка)' ;;
    running_fresh) M='ColTex запущен. Откройте его и создайте учётную запись администратора:' ;;
    running_version) M='ColTex {version} запущен:' ;;
    first_visit) M='(первое открытие может занять минуту, пока Caddy получает сертификат)' ;;
    this_machine) M='(на этой машине)' ;;
    your_network) M='(в вашей сети)' ;;
    public_address) M='(публичный адрес)' ;;
    public_warning) M='Этот сервер доступен из интернета: при реальной работе не входите по открытому http. Используйте --domain (HTTPS), Tailscale или туннель Cloudflare.' ;;
    manage) M='Управление:' ;;
    remote_later) M='Удалённый доступ позже:' ;;
    pull_retry) M='Загрузка прервалась; повторная попытка ({n}/{max}). Загруженные слои сохраняются.' ;;
    pull_hint) M='Если ghcr.io отсюда работает медленно (например, в материковом Китае): запустите снова с --images aliyun — те же образы в Alibaba Cloud (registry-mirrors в daemon.json Docker действует только для Docker Hub). Если соединение постоянно рвётся: задайте "max-concurrent-downloads": 1 и "max-download-attempts": 10 в /etc/docker/daemon.json, перезапустите Docker и запустите снова.' ;;
    images_aliyun) M='Отсюда Alibaba Cloud отвечает быстрее: образы из Alibaba Cloud (--images ghcr, чтобы использовать ghcr.io)' ;;
    images_fallback) M='В Alibaba Cloud этих образов пока нет: загружаю их с ghcr.io.' ;;
    docker_permission) M='Этому пользователю нельзя использовать Docker. Выполните sudo usermod -aG docker {user}, выйдите и войдите снова (или выполните newgrp docker), затем запустите снова.' ;;
    path_hint) M='Чтобы запускать просто командой coltex, добавьте {dir} в PATH: {line}' ;;
  esac
}
msg_tr() {
  case "$1" in
    tagline) M='Kendi sunucunuzda ortak LaTeX düzenleyicisi' ;;
    language) M='Dil' ;;
    full_output) M='Çıktının tamamı: {log}' ;;
    downloading) M='İndiriliyor' ;;
    download_note) M='İmajlar birkaç GB olduğundan indirme biraz zaman alabilir.' ;;
    pull_failed) M='İmajlar indirilemedi. Ağ bağlantısını kontrol edip komutu yeniden çalıştırın.' ;;
    docker_install_q) M='Docker yüklü değil. Docker’ın betiğiyle (get.docker.com, sudo gerekir) şimdi kurulsun mu?' ;;
    docker_install) M='Docker’ı kur' ;;
    cancel) M='İptal' ;;
    docker_needed) M='Docker gerekli: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker kuruldu. Sonraki adım permission denied derse oturumu kapatıp yeniden açın (docker group), ardından bunu yeniden çalıştırın.' ;;
    docker_needed_mac) M='Docker gerekli: https://docs.docker.com/engine/install/ (macOS’ta Docker Desktop)' ;;
    checking_docker) M='Docker denetleniyor' ;;
    no_release) M='{repo} içinde sürüm bulunamadı (geliştirme dalı için --version main kullanın)' ;;
    edition_q) M='TeX Live sürümü (edition)' ;;
    edition_standard) M='Standard: her şey derlenir; yaklaşık 3 GB indirme, diskte 12 GB' ;;
    edition_full) M='Full: YZ ajanı için paket kılavuzları da; yaklaşık 8 GB, diskte 23 GB' ;;
    access_q) M='Kişiler ColTex’e nasıl erişecek?' ;;
    access_local) M='Bu makinede ve ağında' ;;
    access_domain) M='Kendi alan adımla, HTTPS ile' ;;
    access_tailscale) M='Tailscale (tailnet’im)' ;;
    access_cf_token) M='Kendi alan adımla Cloudflare Tunnel' ;;
    access_cf_quick) M='Geçici bir genel bağlantı (trycloudflare.com)' ;;
    ask_domain) M='Alan adı (DNS kaydı buraya yönlenmeli; 80 ve 443 numaralı bağlantı noktaları açık olmalı):' ;;
    ask_token) M='Tünel belirteci (Cloudflare panelinden):' ;;
    updating_to) M='ColTex güncelleniyor: {version}' ;;
    getting) M='ColTex alınıyor: {version}' ;;
    writing_settings) M='Ayarlar yazılıyor' ;;
    ready_start) M='Hazır. Şununla başlatın:' ;;
    building) M='İmajlar derleniyor (birkaç dakika sürer; TeX Live büyüktür)' ;;
    no_prebuilt) M='{version} için hazır imaj yok; kaynaklardan derleniyor.' ;;
    starting) M='Hizmetler başlatılıyor' ;;
    waiting) M='ColTex bekleniyor' ;;
    tailscale_signin) M='Tailscale: bu sunucuyu tailnet’inize bağlayın' ;;
    cf_temporary) M='Cloudflare Tunnel (geçici bağlantı)' ;;
    running_fresh) M='ColTex çalışıyor. Açın ve yönetici hesabını oluşturun:' ;;
    running_version) M='ColTex {version} çalışıyor:' ;;
    first_visit) M='(Caddy sertifikayı alırken ilk ziyaret bir dakika sürebilir)' ;;
    this_machine) M='(bu makinede)' ;;
    your_network) M='(ağınızda)' ;;
    public_address) M='(genel adres)' ;;
    public_warning) M='Bu sunucuya internetten erişilebiliyor: gerçek kullanımda düz http üzerinden oturum açmayın. --domain (HTTPS), Tailscale veya bir Cloudflare tüneli kullanın.' ;;
    manage) M='Yönetmek için:' ;;
    remote_later) M='Daha sonra uzaktan erişim:' ;;
    pull_retry) M='İndirme kesildi; yeniden deneniyor ({n}/{max}). Tamamlanan katmanlar korunur.' ;;
    pull_hint) M='ghcr.io buradan yavaşsa (örneğin Çin anakarasında): --images aliyun ile yeniden çalıştırın; aynı imajlar Alibaba Cloud’dan iner (Docker daemon.json içindeki registry-mirrors yalnızca Docker Hub için geçerlidir). Bağlantı sürekli kopuyorsa: /etc/docker/daemon.json içinde "max-concurrent-downloads": 1 ve "max-download-attempts": 10 ayarlayın, Docker’ı yeniden başlatın ve yeniden çalıştırın.' ;;
    images_aliyun) M='Buradan Alibaba Cloud daha hızlı yanıt veriyor: imajlar Alibaba Cloud’dan iniyor (ghcr.io için --images ghcr)' ;;
    images_fallback) M='Alibaba Cloud’da bu imajlar henüz yok: ghcr.io’dan indiriliyor.' ;;
    docker_permission) M='Bu kullanıcı Docker’ı kullanamıyor. sudo usermod -aG docker {user} çalıştırın, oturumu kapatıp yeniden açın (veya newgrp docker çalıştırın), sonra yeniden çalıştırın.' ;;
    path_hint) M='Yalnızca coltex yazarak çalıştırmak için {dir} dizinini PATH’e ekleyin: {line}' ;;
  esac
}
msg_vi() {
  case "$1" in
    tagline) M='Trình soạn thảo LaTeX cộng tác tự lưu trữ' ;;
    language) M='Ngôn ngữ' ;;
    full_output) M='Toàn bộ đầu ra: {log}' ;;
    downloading) M='Đang tải xuống' ;;
    download_note) M='Các image nặng vài GB nên việc tải xuống có thể mất một lúc.' ;;
    pull_failed) M='Không tải được các image. Hãy kiểm tra kết nối mạng rồi chạy lại.' ;;
    docker_install_q) M='Docker chưa được cài đặt. Cài ngay bằng script của Docker (get.docker.com, cần sudo)?' ;;
    docker_install) M='Cài Docker' ;;
    cancel) M='Hủy' ;;
    docker_needed) M='Cần có Docker: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Đã cài Docker. Nếu bước tiếp theo báo permission denied, hãy đăng xuất rồi đăng nhập lại (docker group), sau đó chạy lại lệnh này.' ;;
    docker_needed_mac) M='Cần có Docker: https://docs.docker.com/engine/install/ (Docker Desktop trên macOS)' ;;
    checking_docker) M='Đang kiểm tra Docker' ;;
    no_release) M='Không tìm thấy bản phát hành nào trong {repo} (dùng --version main cho nhánh phát triển)' ;;
    edition_q) M='Phiên bản TeX Live' ;;
    edition_standard) M='Standard: biên dịch được mọi thứ; tải khoảng 3 GB, chiếm 12 GB trên ổ đĩa' ;;
    edition_full) M='Full: có thêm tài liệu hướng dẫn của các gói cho tác tử AI; khoảng 8 GB, chiếm 23 GB trên ổ đĩa' ;;
    access_q) M='Mọi người sẽ truy cập ColTex bằng cách nào?' ;;
    access_local) M='Trên máy này và mạng của nó' ;;
    access_domain) M='Tên miền của tôi, có HTTPS' ;;
    access_tailscale) M='Tailscale (tailnet của tôi)' ;;
    access_cf_token) M='Cloudflare Tunnel với tên miền của tôi' ;;
    access_cf_quick) M='Một liên kết công khai tạm thời (trycloudflare.com)' ;;
    ask_domain) M='Tên miền (DNS phải trỏ về máy này; mở cổng 80 và 443):' ;;
    ask_token) M='Token của tunnel (từ bảng điều khiển Cloudflare):' ;;
    updating_to) M='Đang cập nhật ColTex lên {version}' ;;
    getting) M='Đang tải ColTex {version}' ;;
    writing_settings) M='Đang ghi cài đặt' ;;
    ready_start) M='Đã sẵn sàng. Khởi động bằng:' ;;
    building) M='Đang dựng các image (mất vài phút; TeX Live rất lớn)' ;;
    no_prebuilt) M='Không có image dựng sẵn cho {version}; đang dựng từ mã nguồn.' ;;
    starting) M='Đang khởi động các dịch vụ' ;;
    waiting) M='Đang chờ ColTex' ;;
    tailscale_signin) M='Tailscale: đăng nhập máy chủ này vào tailnet của bạn' ;;
    cf_temporary) M='Cloudflare Tunnel (liên kết tạm thời)' ;;
    running_fresh) M='ColTex đang chạy. Hãy mở nó và tạo tài khoản quản trị viên:' ;;
    running_version) M='ColTex {version} đang chạy:' ;;
    first_visit) M='(lần truy cập đầu tiên có thể mất một phút trong lúc Caddy lấy chứng chỉ)' ;;
    this_machine) M='(trên máy này)' ;;
    your_network) M='(trong mạng của bạn)' ;;
    public_address) M='(địa chỉ công khai)' ;;
    public_warning) M='Máy chủ này truy cập được từ internet: khi dùng thật, đừng đăng nhập qua http thuần. Hãy dùng --domain (HTTPS), Tailscale hoặc Cloudflare tunnel.' ;;
    manage) M='Quản lý:' ;;
    remote_later) M='Truy cập từ xa sau này:' ;;
    pull_retry) M='Quá trình tải bị ngắt; đang thử lại ({n}/{max}). Các lớp đã tải xong được giữ lại.' ;;
    pull_hint) M='Nếu ghcr.io chậm từ đây (ví dụ ở Trung Quốc đại lục): chạy lại với --images aliyun để tải cùng các image từ Alibaba Cloud (registry-mirrors trong daemon.json của Docker chỉ áp dụng cho Docker Hub). Nếu kết nối cứ bị ngắt: đặt "max-concurrent-downloads": 1 và "max-download-attempts": 10 trong /etc/docker/daemon.json, khởi động lại Docker rồi chạy lại.' ;;
    images_aliyun) M='Từ đây Alibaba Cloud phản hồi nhanh hơn: tải image từ Alibaba Cloud (--images ghcr để dùng ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud chưa có các image này: tải từ ghcr.io.' ;;
    docker_permission) M='Người dùng này không được dùng Docker. Chạy sudo usermod -aG docker {user}, đăng xuất rồi đăng nhập lại (hoặc chạy newgrp docker), sau đó chạy lại.' ;;
    path_hint) M='Để chạy chỉ bằng lệnh coltex, hãy thêm {dir} vào PATH: {line}' ;;
  esac
}
msg_id() {
  case "$1" in
    tagline) M='Editor LaTeX kolaboratif yang di-hosting sendiri' ;;
    language) M='Bahasa' ;;
    full_output) M='Keluaran lengkap: {log}' ;;
    downloading) M='Mengunduh' ;;
    download_note) M='Image berukuran beberapa GB, jadi pengunduhan bisa memakan waktu.' ;;
    pull_failed) M='Gagal mengunduh image. Periksa koneksi jaringan lalu jalankan lagi.' ;;
    docker_install_q) M='Docker belum terpasang. Pasang sekarang dengan skrip Docker (get.docker.com, memerlukan sudo)?' ;;
    docker_install) M='Pasang Docker' ;;
    cancel) M='Batal' ;;
    docker_needed) M='Docker diperlukan: https://docs.docker.com/engine/install/' ;;
    docker_installed) M='Docker terpasang. Jika langkah berikutnya menyatakan permission denied, keluar lalu masuk lagi (docker group), kemudian jalankan ini lagi.' ;;
    docker_needed_mac) M='Docker diperlukan: https://docs.docker.com/engine/install/ (Docker Desktop di macOS)' ;;
    checking_docker) M='Memeriksa Docker' ;;
    no_release) M='Tidak ada rilis di {repo} (gunakan --version main untuk cabang pengembangan)' ;;
    edition_q) M='Edisi TeX Live' ;;
    edition_standard) M='Standard: semua dapat dikompilasi; unduhan sekitar 3 GB, 12 GB di disk' ;;
    edition_full) M='Full: ditambah manual paket untuk agen AI; sekitar 8 GB, 23 GB di disk' ;;
    access_q) M='Bagaimana orang akan menjangkau ColTex?' ;;
    access_local) M='Di mesin ini dan jaringannya' ;;
    access_domain) M='Domain saya sendiri, dengan HTTPS' ;;
    access_tailscale) M='Tailscale (tailnet saya)' ;;
    access_cf_token) M='Cloudflare Tunnel dengan domain saya' ;;
    access_cf_quick) M='Tautan publik sementara (trycloudflare.com)' ;;
    ask_domain) M='Domain (DNS-nya harus mengarah ke sini; port 80 dan 443 terbuka):' ;;
    ask_token) M='Token terowongan (dari dasbor Cloudflare):' ;;
    updating_to) M='Memperbarui ColTex ke {version}' ;;
    getting) M='Mengambil ColTex {version}' ;;
    writing_settings) M='Menulis pengaturan' ;;
    ready_start) M='Siap. Jalankan dengan:' ;;
    building) M='Membangun image (beberapa menit; TeX Live berukuran besar)' ;;
    no_prebuilt) M='Tidak ada image siap pakai untuk {version}; membangunnya dari kode sumber.' ;;
    starting) M='Menjalankan layanan' ;;
    waiting) M='Menunggu ColTex' ;;
    tailscale_signin) M='Tailscale: masukkan server ini ke tailnet Anda' ;;
    cf_temporary) M='Cloudflare Tunnel (tautan sementara)' ;;
    running_fresh) M='ColTex sudah berjalan. Buka dan buat akun administrator:' ;;
    running_version) M='ColTex {version} sudah berjalan:' ;;
    first_visit) M='(kunjungan pertama dapat memakan waktu sekitar satu menit selagi Caddy mendapatkan sertifikat)' ;;
    this_machine) M='(di mesin ini)' ;;
    your_network) M='(di jaringan Anda)' ;;
    public_address) M='(alamat publik)' ;;
    public_warning) M='Server ini dapat dijangkau dari internet: untuk penggunaan sungguhan, jangan masuk melalui http biasa. Gunakan --domain (HTTPS), Tailscale, atau Cloudflare Tunnel.' ;;
    manage) M='Kelola:' ;;
    remote_later) M='Akses jarak jauh nanti:' ;;
    pull_retry) M='Unduhan terputus; mencoba lagi ({n}/{max}). Lapisan yang sudah selesai tetap disimpan.' ;;
    pull_hint) M='Jika ghcr.io lambat dari sini (misalnya di Tiongkok daratan): jalankan lagi dengan --images aliyun, image yang sama di Alibaba Cloud (registry-mirrors di daemon.json Docker hanya berlaku untuk Docker Hub). Jika koneksi terus terputus: atur "max-concurrent-downloads": 1 dan "max-download-attempts": 10 di /etc/docker/daemon.json, mulai ulang Docker, lalu jalankan lagi.' ;;
    images_aliyun) M='Dari sini Alibaba Cloud merespons lebih cepat: image dari Alibaba Cloud (--images ghcr untuk memakai ghcr.io)' ;;
    images_fallback) M='Alibaba Cloud belum punya image ini: diunduh dari ghcr.io.' ;;
    docker_permission) M='Pengguna ini tidak boleh memakai Docker. Jalankan sudo usermod -aG docker {user}, keluar lalu masuk lagi (atau jalankan newgrp docker), lalu jalankan lagi.' ;;
    path_hint) M='Agar bisa dijalankan cukup dengan coltex, tambahkan {dir} ke PATH: {line}' ;;
  esac
}
# <<< messages

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
LANGUAGE="$(lang_id "$LANGUAGE")"
if [ -z "$LANGUAGE" ]; then
  # The default is the system's language (else English); the logo follows in the chosen one,
  # so the answer needn't stay on screen.
  LANGUAGE="$(lang_id "${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}")"
  LANGUAGE="${LANGUAGE:-en}"
  CHOICE=2
  for i in "${!LANGS[@]}"; do [ "${LANGS[i]}" = "$LANGUAGE" ] && CHOICE=$i; done
  if [ "$TTY" = 1 ]; then QUIET=1 choose "Language" "${LANG_NAMES[@]}"; fi
  LANGUAGE="${LANGS[CHOICE]}"
fi

# ---- The mark ------------------------------------------------------------------------
# A white sigma on a blue tile with rounded corners (" " = outside the tile), drawn with half
# blocks: each character cell holds two pixels, one above the other, so the pixels come out
# square and the mark takes 11 columns and 6 lines. The sigma is drawn in pen order.
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
TAGLINE="$(T tagline)"

# The colour of pixel $1,$2 in C: " " outside, W once the pen has drawn it, b (blue) otherwise.
cell() {
  C=" "
  [ "$1" -lt ${#LOGO[@]} ] && C="${LOGO[$1]:$2:1}"
  if [ "$C" = W ] && [[ "$SHOWN" != *" $1,$2 "* ]]; then C=b; fi
  return 0
}

draw_logo() { # $1 = how many stroke cells are white
  local row col top fore back under line
  SHOWN=" "
  [ "$1" -gt 0 ] && SHOWN=" $(echo "$STROKE" | cut -d' ' -f1-"$1") "
  for ((row = 0; row < ${#LOGO[@]}; row += 2)); do
    line="  "
    for ((col = 0; col < ${#LOGO[0]}; col++)); do
      cell "$row" "$col"; top="$C"
      cell $((row + 1)) "$col"
      # The upper pixel is the character's colour, the lower one its background.
      if [ "$top" = W ]; then fore="$WHITE"; else fore="$BLUE"; fi
      if [ "$C" = W ]; then back="$BG_WHITE"; under="$WHITE"; else back="$BG_BLUE"; under="$BLUE"; fi
      if [ "$top" = " " ] && [ "$C" = " " ]; then line+=" "
      elif [ "$top" = " " ]; then line+="${under}▄"
      elif [ "$C" = " " ]; then line+="${fore}▀"
      elif [ "$top" = "$C" ]; then line+="${fore}█"
      else line+="${fore}${back}▀${RESET}"; fi
    done
    case "$row" in
      4) line+="${RESET}   ${BOLD}ColTex${RESET}" ;;
      6) line+="${RESET}   ${DIM}${TAGLINE}${RESET}" ;;
    esac
    printf '%s%s\n' "$line" "$RESET"
  done
}

header() {
  if [ "$TTY" = 1 ] && [ "$COLS" -ge 60 ] && [ -n "$BLUE" ]; then
    echo
    cursor_hide
    draw_logo 0
    for n in $(seq 1 21); do
      sleep 0.03
      printf '%s' "${ESC}[6A"
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

# Stop with a message (none after a failed step, whose line says it), the log's end, and
# $DIE_HINT (what may help) last.
DIE_HINT=""
die() {
  cursor_show
  [ -n "$*" ] && printf '\n  %s %s\n' "${RED}✗${RESET}" "${BOLD}$*${RESET}" >&2
  if [ -s "$LOG" ]; then
    printf '\n%s\n' "${DIM}$(tail -n 15 "$LOG" | sed 's/^/    /')${RESET}" >&2
    printf '\n  %s\n' "$(T full_output log="$LOG")" >&2
  fi
  [ -z "$DIE_HINT" ] || printf '\n  %s\n' "$DIE_HINT" >&2
  echo >&2
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

# The compressed size of every layer the pull will download, as "<short id> <bytes>" lines (shared
# layers once), asked of the registries before it starts (`docker manifest inspect`: each image's
# layers for this machine's platform), so the bar's total is right from the start. Images already
# here are left out; nothing when the registries can't be asked (offline, an older Docker).
layer_sizes() {
  local arch img
  arch="$(docker version -f '{{.Server.Arch}}' 2>/dev/null || true)"
  for img in $(docker compose config --images 2>/dev/null); do
    docker image inspect "$img" >/dev/null 2>&1 && continue
    docker manifest inspect -v "$img" 2>/dev/null | awk -v arch="$arch" '
      /"Ref":/ { platform = "" }
      /"architecture":/ { v = $0; gsub(/.*: *"|".*/, "", v); platform = v }
      /"layers": *\[/ { layers = 1; next }
      layers && /^[ \t]*\]/ { layers = 0 }
      layers && /"digest":/ { d = $0; gsub(/.*sha256:|".*/, "", d) }
      layers && /"size":/ { n = $0; gsub(/[^0-9]/, "", n); if (platform == "" || arch == "" || platform == arch) print substr(d, 1, 12), n }
    ' || true
  done | sort -u
}

# `docker compose pull` with a download bar from compose's JSON progress. The total comes from
# layer_sizes (less the layers compose finds already here); without it, from the layers' sizes
# as each starts, and the percentage never goes back. Every byte count stays in awk (printed
# with %.0f: some awks print large numbers as 7.23839e+09, which bash can't count with), and
# drawing runs apart from the pull, so nothing that goes wrong on screen interrupts the download.
pull_with_bar() {
  local label="$1" sizes rc start=$SECONDS
  printf '\n==> %s\n' "$label" >>"$LOG"
  if [ "$TTY" != 1 ]; then
    printf '==> %s\n' "$label"
    docker compose pull >>"$LOG" 2>&1
    return
  fi
  # Once, not again on each retry.
  [ -n "${NOTED:-}" ] || note "$(T download_note)"
  NOTED=1
  cursor_hide
  printf '\r  %s %s' "${BLUE}${SPIN[0]}${RESET}" "$label"
  # Asking the registries takes a few seconds; the line above is already there meanwhile.
  sizes="$(mktemp "${TMPDIR:-/tmp}/coltex-layers.XXXXXX")"
  layer_sizes >"$sizes" 2>/dev/null || true
  set +e
  docker compose --progress json pull 2>&1 | tee -a "$LOG" | awk -v sizes="$sizes" '
    BEGIN { while ((getline line < sizes) > 0) { split(line, f, " "); want[f[1]] = f[2] + 0; known += f[2] + 0 } last = -1 }
    !/"parent_id"/ { next }
    {
      id = ""; if (match($0, /"id":"[^"]*"/)) id = substr($0, RSTART + 6, RLENGTH - 7)
      if ($0 ~ /"text":"Already exists"/) { if ((id in want) && !(id in here)) { here[id] = 1; known -= want[id] } next }
      if (!(id in want) && match($0, /"total":[0-9]+/)) extra[id] = substr($0, RSTART + 8, RLENGTH - 8) + 0
      if ($0 ~ /"text":"Downloading"/ && match($0, /"current":[0-9]+/)) got[id] = substr($0, RSTART + 10, RLENGTH - 10) + 0
      if ($0 ~ /"text":"(Download complete|Pull complete)"/) { if (id in want) got[id] = want[id]; else if (id in extra) got[id] = extra[id] }
      s = 0; t = known
      for (k in got) s += got[k]
      for (k in extra) t += extra[k]
      if (t <= 0) next
      if (s > t) s = t
      p = int(s * 100 / t); if (p < last) p = last
      if (p != last || t != lastt) { printf "%d %d %.0f %.0f\n", p, int(p * 20 / 100), s, t; fflush(); last = p; lastt = t }
    }' | {
    ( i=0
      while read -r pct filled cur tot; do
        bar=""
        for ((k = 0; k < 20; k++)); do if [ "$k" -lt "$filled" ]; then bar+="━"; else bar+="${DIM}━${RESET}${BLUE}"; fi; done
        e=$((SECONDS - start))
        printf '\r%s  %s %s %s%s%s %3d%%  %s' "${ESC}[2K" "${BLUE}${SPIN[i % 10]}${RESET}" "$(pad "$label" 16)" "$BLUE" "$bar" "$RESET" "$pct" \
          "${DIM}$(size "$cur") / $(size "$tot") · $((e / 60)):$(printf '%02d' $((e % 60)))${RESET}"
        i=$((i + 1))
      done ) 2>/dev/null
    cat >/dev/null
  }
  rc=${PIPESTATUS[0]}
  set -e
  rm -f "$sizes"
  cursor_show
  if [ "$rc" = 0 ]; then done_line "$label"; else printf '\r%s' "${ESC}[2K"; fi
  return "$rc"
}

# Whether the pull failed because there are no prebuilt images for this version (then they are
# built here), rather than for the network or the registry (then that is the error).
images_missing() { tail -n 40 "$LOG" | grep -qiE 'manifest unknown|no matching manifest|manifest for .* not found|failed to resolve reference.*not found'; }

# The images: pulled with a bar, or plainly when this Compose has no JSON progress. A pull cut
# off by the network is tried again (Docker keeps the layers it finished, so each try only
# fetches the rest), up to PULL_TRIES times in all.
PULL_TRIES=3
pull_once() {
  local label
  label="$(T downloading)"
  pull_with_bar "$label" && return 0
  # A Compose without JSON progress said so instead of pulling.
  if tail -n 3 "$LOG" | grep -qi 'progress'; then spin "$label" docker compose pull && return 0; fi
  return 1
}
pull_images() {
  local try=1
  until pull_once; do
    images_missing && return 1
    [ "$try" -lt "$PULL_TRIES" ] || return 1
    try=$((try + 1))
    note "$(T pull_retry n="$try" max="$PULL_TRIES")"
    sleep 3
  done
}

# ---- Docker --------------------------------------------------------------------------
if ! have docker; then
  if [ "$(uname -s)" = Linux ] && [ "$TTY" = 1 ]; then
    CHOICE=0
    choose "$(T docker_install_q)" "$(T docker_install)" "$(T cancel)"
    [ "$CHOICE" = 0 ] || die "$(T docker_needed)"
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER" || true
    note "$(T docker_installed)"
  else
    die "$(T docker_needed_mac)"
  fi
fi
check_docker() {
  docker compose version >/dev/null 2>&1 || { echo "The Docker Compose plugin is needed: https://docs.docker.com/compose/install/"; return 1; }
  local info
  if ! info="$(docker info 2>&1)"; then
    if echo "$info" | grep -qi 'permission denied'; then T docker_permission user="$(id -un)"; echo; return 1; fi
    echo "$info" | tail -n 3
    echo "Docker is installed but not running: start it (sudo systemctl start docker, or open Docker Desktop)"
    return 1
  fi
  have git || { echo "git is needed"; return 1; }
  have curl || { echo "curl is needed"; return 1; }
}
echo
step "$(T checking_docker)" check_docker

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
  [ -n "$VERSION" ] || die "$(T no_release repo="$REPO")"
fi

# ---- Questions (a fresh install with a terminal, for what no option answered) ------------
if [ "$FRESH" = 1 ] && [ "$TTY" = 1 ]; then
  if [ -z "$EDITION" ]; then
    CHOICE=0
    choose "$(T edition_q)" "$(T edition_standard)" "$(T edition_full)"
    if [ "$CHOICE" = 1 ]; then EDITION=full; else EDITION=standard; fi
  fi
  if [ "$ACCESS_GIVEN" = 0 ]; then
    CHOICE=0
    choose "$(T access_q)" "$(T access_local)" "$(T access_domain)" "$(T access_tailscale)" "$(T access_cf_token)" "$(T access_cf_quick)"
    case "$CHOICE" in
      1)
        while [ -z "$DOMAIN" ]; do DOMAIN="$(ask_text "$(T ask_domain)")"; done ;;
      2) TAILSCALE=1 ;;
      3) while [ -z "$CF_TOKEN" ]; do CF_TOKEN="$(ask_text "$(T ask_token)" secret)"; done ;;
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
if [ -d "$DIR/.git" ]; then step "$(T updating_to version="$VERSION")" get_code
else step "$(T getting version="$VERSION")" get_code; fi
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
# Where the images come from when neither --images nor an earlier install said: whichever of
# ghcr.io and Alibaba Cloud answers faster from here (Alibaba Cloud in mainland China, where
# ghcr.io is slow or cut off). Only the two registries are asked, without the shell's proxy,
# which Docker's daemon doesn't use.
answer_time() {
  local t
  t="$(curl -s --noproxy '*' -m 6 -o /dev/null -w '%{time_total}' "https://$1/v2/" 2>/dev/null)" && echo "$t"
}
aliyun_faster() {
  local g a
  g="$(answer_time "${GHCR_IMAGES%%/*}")" || g=""
  a="$(answer_time "${ALIYUN_IMAGES%%/*}")" || a=""
  [ -n "$a" ] || return 1
  [ -z "$g" ] || awk -v a="$a" -v g="$g" 'BEGIN { exit !(a < g) }'
}
AUTO_IMAGES=0
if [ -z "$IMAGES" ] && [ -z "$(get COLTEX_IMAGES)" ] && [ "$BUILD" = 0 ]; then
  if aliyun_faster; then IMAGES="$ALIYUN_IMAGES"; AUTO_IMAGES=1; else IMAGES="$GHCR_IMAGES"; fi
fi
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
  [ -n "$IMAGES" ] && setting COLTEX_IMAGES "$IMAGES"
  # PostgreSQL, Valkey and Caddy from the same copies on Alibaba Cloud (Docker Hub is hard to reach
  # from mainland China); from Docker Hub with any other registry.
  if [ "$(get COLTEX_IMAGES)" = "$ALIYUN_IMAGES" ]; then setting COLTEX_HUB_MIRROR "$ALIYUN_IMAGES"
  else setting COLTEX_HUB_MIRROR ""; fi
  # Present though empty, so a Compose that reads the port's ${COLTEX_BIND:+…} doesn't warn
  # that it isn't set.
  grep -q '^COLTEX_BIND=' .env || setting COLTEX_BIND ""
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
step "$(T writing_settings)" write_settings
PORT="$(get COLTEX_PORT)"
PORT="${PORT:-3690}"

# The `coltex` command, where the shell finds it: ~/.local/bin, or /usr/local/bin when that is
# on PATH and ~/.local/bin isn't (root on many servers); otherwise its full path for now, and
# how to add ~/.local/bin to PATH.
chmod +x coltex
on_path() { case ":$PATH:" in *":$1:"*) return 0 ;; *) return 1 ;; esac; }
CMD="$DIR/coltex"
PATH_HINT=""
if [ -d "$HOME/.local/bin" ] || mkdir -p "$HOME/.local/bin" 2>/dev/null; then
  ln -sf "$DIR/coltex" "$HOME/.local/bin/coltex"
  on_path "$HOME/.local/bin" && CMD=coltex
fi
if [ "$CMD" != coltex ] && on_path /usr/local/bin && [ -w /usr/local/bin ]; then
  ln -sf "$DIR/coltex" /usr/local/bin/coltex && CMD=coltex
fi
if [ "$CMD" != coltex ]; then
  case "${SHELL:-}" in */zsh) rc="~/.zshrc" ;; */bash) rc="~/.bashrc" ;; *) rc="~/.profile" ;; esac
  PATH_HINT="$(T path_hint dir="~/.local/bin" line="echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> $rc")"
fi

# Shown with ~ for the home folder.
SHOWN_CMD="${CMD/#$HOME/~}"
SHOWN_LOG="${DIR/#$HOME/~}/install.log"

if [ "$START" = 0 ]; then
  printf '\n  %s\n\n' "$(T ready_start) ${BOLD}$SHOWN_CMD start${RESET}"
  exit 0
fi

# ---- Download (or build) and start --------------------------------------------------
# Alibaba Cloud chosen here rather than asked for: ghcr.io when the mirror doesn't have this
# version yet (it copies a release after ghcr.io has it).
download() {
  [ "$AUTO_IMAGES" = 1 ] && note "$(T images_aliyun)"
  pull_images && return 0
  [ "$AUTO_IMAGES" = 1 ] && images_missing || return 1
  note "$(T images_fallback)"
  setting COLTEX_IMAGES "$GHCR_IMAGES"
  setting COLTEX_HUB_MIRROR ""
  pull_images
}
if [ "$(get COLTEX_BUILD)" = 1 ]; then
  step "$(T building)" docker compose build
elif ! download; then
  images_missing || { DIE_HINT="$(T pull_hint)"; die "$(T pull_failed)"; }
  note "$(T no_prebuilt version="$VERSION")"
  step "$(T building)" docker compose build
fi
step "$(T starting)" "$DIR/coltex" deploy
wait_ready() {
  for _ in $(seq 1 180); do
    curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "ColTex did not answer on port $PORT; see: $CMD logs"
  return 1
}
step "$(T waiting)" wait_ready

# ---- Remote access, if asked for (these print links and codes, so they show) -----------
if [ "$TAILSCALE" = 1 ]; then
  printf '\n  %s\n' "${BOLD}$(T tailscale_signin)${RESET}"
  "$DIR/coltex" tailscale up
fi
if [ -n "$CF_TOKEN" ]; then
  printf '\n  %s\n' "${BOLD}Cloudflare Tunnel${RESET}"
  CF_TUNNEL_TOKEN="$CF_TOKEN" "$DIR/coltex" cloudflare token
elif [ "$CF_QUICK" = 1 ]; then
  printf '\n  %s\n' "${BOLD}$(T cf_temporary)${RESET}"
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
  printf '\n  %s\n\n' "${BOLD}$(T running_fresh)${RESET}"
else
  printf '\n  %s\n\n' "${BOLD}$(T running_version version="$VERSION")${RESET}"
fi
DOMAIN="$(get COLTEX_DOMAIN)"
public=0
if [ -n "$DOMAIN" ]; then
  address "https://$DOMAIN" "$(T first_visit)"
  address "http://localhost:$PORT" "$(T this_machine)"
else
  address "http://localhost:$PORT" "$(T this_machine)"
  for ip in $addresses; do
    if is_private "$ip"; then address "http://$ip:$PORT" "$(T your_network)"
    else address "http://$ip:$PORT" "$(T public_address)"; public=1; fi
  done
fi
if [ "$public" = 1 ]; then
  printf '\n  %s\n' "${AMBER}$(T public_warning)${RESET}"
fi
printf '\n  %s\n' "$(T manage) ${BOLD}$SHOWN_CMD status | logs | update | stop | start${RESET}"
printf '  %s\n' "$(T remote_later) ${BOLD}$SHOWN_CMD tailscale up${RESET} | ${BOLD}cloudflare quick${RESET} | ${BOLD}cloudflare token${RESET}"
[ -z "$PATH_HINT" ] || printf '  %s\n' "$PATH_HINT"
printf '  %s\n\n' "${DIM}$(T full_output log="$SHOWN_LOG")${RESET}"
