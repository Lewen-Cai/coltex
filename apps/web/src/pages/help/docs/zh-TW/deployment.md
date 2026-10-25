# 部署與網路

在正式環境中，ColTex 只使用一個連接埠（預設為 3690）：頁面、API、即時協作（WebSocket）和通知都經由它傳輸。任何能轉送 HTTP 和 WebSocket 的方式都可以：本機、區域網路、Tailscale、Cloudflare Tunnel 或雲端伺服器。（3000 和 5173 是開發伺服器的連接埠。）

## 安裝

在裝有 Docker 的 Linux 或 macOS 上，只需要一個指令：

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

如果下載中斷（`curl: (35) Recv failure: Connection reset by peer`，連線 GitHub 不穩定時常見），再執行一次指令即可。

它會詢問語言和 TeX Live 版本（用方向鍵選擇；也可以改用 `--edition` 或 `--lang` 選項直接回答），檢查 Docker（在 Linux 上可以代為安裝），把 ColTex 下載到 `~/coltex`，寫入設定，下載預先建置的映像檔（x86-64 和 ARM64）並啟動，最後列出在本機和在你的網路上要開啟的網址。第一次啟動會下載 TeX Live。共有兩種版本：

| 版本 | 下載量 | 磁碟占用（整個 ColTex） | 建議可用空間 |
| --- | --- | --- | --- |
| **standard**（預設） | 約 3 GB | 約 12 GB | 20 GB |
| **full**（`--edition full`） | 約 8 GB | 約 23 GB | 35 GB |

兩者都是完整的 TeX Live，編譯能力相同，AI 代理也都能使用。standard 版不含套件手冊和原始碼；full 版另外包含它們，AI 代理還可以閱讀手冊。使用 standard 版時，AI 代理會根據套件檔案和自身知識回答。之後可以用 `coltex edition full` 或 `coltex edition standard` 切換。

遠端存取（Tailscale、Cloudflare Tunnel）在安裝後到 **設定 → 網路** 開啟（見下文）。以腳本安裝時，也可以用選項在安裝時一併開啟：

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

之後用 `coltex` 管理：

| 指令 | 作用 |
| --- | --- |
| `coltex status` / `logs` | 狀態 / 記錄檔 |
| `coltex edition [standard\|full]` | 顯示或切換 TeX Live 版本（會下載另一個編譯器映像檔） |
| `coltex update` | 更新到最新版本（會下載新的映像檔）；資料和設定都會保留 |
| `coltex stop` / `start` | 停止 / 啟動 |
| `coltex tailscale up` | 加入你的 tailnet（會列出登入連結和 QR 碼） |
| `coltex cloudflare quick` | 臨時的 Cloudflare 公開網址 |
| `coltex cloudflare token` | 使用自己網域的 Cloudflare 通道（會詢問權杖） |
| `coltex reset` | 刪除所有資料（帳號、專案、資料庫），從初始設定頁面重新開始；會先要求你輸入 `reset` 確認 |
| `coltex uninstall` | 從這台機器移除 ColTex：容器、資料庫、資料、映像檔、`coltex` 指令及其資料夾（Docker 會保留）；會先要求你輸入 `uninstall` 確認 |

## 從任何位址登入

伺服器接受對它自己位址發出的登入：無論是用 `localhost`、區域網路 IP、Tailscale 位址還是網域開啟，都不需要事先列出這些位址。其他網站上的頁面無法讓任何人登入。

## 連結使用哪些位址

邀請連結和 Git clone 位址會針對 ColTex 的每個可連線位址各提供一條，每條都有自己的複製按鈕，讓你挑選收件人能開啟的那一條：

- **區域網路** 或 **Tailscale**：你開啟 ColTex 時使用的位址（依位址辨識）；
- **Tailscale**、**Cloudflare**：內建 Tailscale 或 Cloudflare Tunnel 連線時的位址。它們會隨連線出現和消失；關閉其中一個時不需要做任何修改；
- **公開位址**：伺服器的 `COLTEX_URL`（有設定時）。

待接受的邀請會在邀請清單中保留其連結，直到被使用或到期為止。

## Tailscale

ColTex 內建 Tailscale：它可以以獨立裝置的身分加入你的 tailnet（預設名稱為 `coltex`）。伺服器上不需要安裝任何東西，在沒有桌面環境的伺服器上也能使用。

1. 在 **設定 → 網路** 中開啟 Tailscale。
2. 用手機掃描 QR 碼，或在任何裝置上開啟連結，登入你的 tailnet。頁面會自動切換為已連接。
3. 開啟 **在 Tailnet 上提供 ColTex**。如果 tailnet 啟用了 MagicDNS 和 HTTPS，位址就是 `https://coltex.<your tailnet>.ts.net`，否則是 `http://coltex.<your tailnet>.ts.net`。

如果目前還沒有任何瀏覽器能開啟設定頁面，請在伺服器上執行：

```sh
coltex tailscale up
```

它會開啟 Tailscale，在終端機中列出登入連結和 QR 碼，等待登入完成，然後在 tailnet 上提供 ColTex。`coltex tailscale status` 會顯示狀態，`coltex tailscale down` 會離開 tailnet，`coltex tailscale off` 會關閉它。

`TS_HOSTNAME` 可以變更裝置名稱。Tailscale 由伺服器自己執行：不需要額外的容器或權限。它的裝置金鑰保存在 `data/tailscale` 中，不會包含在備份裡；還原後請重新登入。

如果伺服器本身已經在執行 Tailscale，兩者不會互相干擾：內建的 Tailscale 是一台獨立的裝置，並使用使用者空間網路（userspace networking），因此不會變更伺服器的任何網路設定。你也可以不使用它：直接用伺服器的 Tailscale IP 或 MagicDNS 名稱加上 `:3690` 開啟 ColTex 即可。

## Cloudflare Tunnel

ColTex 也內建 Cloudflare Tunnel，僅作為通道使用：大家仍然用自己的 ColTex 帳號登入，不需要 Cloudflare Access。伺服器不需要開放任何連接埠。

- **快速通道**：不需要 Cloudflare 帳號；你會得到一個 `https://<random>.trycloudflare.com`，每次啟動都會改變。適合試用。
- **自己的網域**：你的網域在 Cloudflare 上時，在 Zero Trust → Networks → Tunnels 中建立一個通道，複製「Run the following command」下方的指令（任何作業系統都可以：Windows、macOS、Debian、Red Hat 或 Docker）；ColTex 會從中取出權杖；再為通道新增一個公開主機名稱（例如 `tex.example.org`），服務設為 `http://localhost:3690`。

在 **設定 → 網路** 中，用 Cloudflare Tunnel 卡片上的開關開啟它，然後選擇臨時連結或通道（已儲存的通道，或從貼上的指令建立新通道）；也可以在終端機中執行 `coltex cloudflare quick` / `coltex cloudflare token`。連線後，它的位址會自動出現在邀請連結中。權杖會加密儲存，之後不會再顯示。

如果通道無法透過 QUIC 連上 Cloudflare（防火牆，或會丟棄 UDP 的代理），ColTex 會自動改用 HTTP/2。當 trycloudflare.com 限制臨時連結（429 Too Many Requests）時，ColTex 重新請求的間隔會越來越長。更換通道時，請在 Cloudflare 主控台中把它的公開主機名稱移到新通道；在那之前，這些主機名稱會回應 Error 1033。

如果伺服器本身已經為自己的通道執行 cloudflared，兩者不會衝突，但請不要把那個通道的權杖交給 ColTex：Cloudflare 會把兩者視為同一個通道的連接器，並在它們之間分配請求，導致伺服器的其他主機名稱有時會連到 ColTex 而失敗（502）。請為 ColTex 在那個通道中新增一個公開主機名稱（服務設為 `http://localhost:3690`），並保持內建的通道關閉；或者為 ColTex 另外建立一個通道。

## 伺服器設定

這些是伺服器的環境變數。使用 Docker 時，請寫在 `docker-compose.yml` 旁的 `.env` 檔案中，然後執行 `docker compose up -d`。

| 變數 | 作用 |
| --- | --- |
| `COLTEX_PORT` | 連接埠，預設為 3690 |
| `COLTEX_URL` | 每條連結都會提供的公開位址，例如 `https://tex.example.org` |
| `TRUSTED_ORIGINS` | 登入時接受的其他位址，以逗號分隔。只有在頁面和 API 位於不同位址時才需要 |
| `TRUST_PROXY` | 前面有反向代理（Caddy、Nginx）時：`uniquelocal`（代理位於私人網路上）或 `true`。未設定時，伺服器會把代理當成訪客：所有人共用同一個位址，因此一個人的登入失敗會算在所有人頭上，登入紀錄中顯示的也是代理的位址。內建的 Tailscale 和 Cloudflare Tunnel 不需要設定這一項 |
| `TS_HOSTNAME` | 內建 Tailscale 的裝置名稱，預設為 `coltex` |

**設定 → 網路** 底部的 **連線情況** 會顯示這些設定和伺服器看到的 IP，並指出問題。

## 常見部署方式

| 部署方式 | 做法 |
| --- | --- |
| 僅限本機 | 使用預設值：`http://localhost:3690` |
| 區域網路 | 用伺服器的區域網路位址開啟，例如 `http://192.168.1.20:3690`。區域網路位址可能會改變；長期使用時，請在路由器中為它保留一個固定位址 |
| Tailscale | 請見上方的 Tailscale |
| Cloudflare Tunnel | 請見上方的 Cloudflare Tunnel |
| 雲端伺服器 | 有網域時：使用 `--domain tex.example.org` 安裝（將網域的 DNS 指向伺服器，並開放連接埠 80 和 443）。內附的 Caddy 會取得 HTTPS 憑證；之後連接埠 3690 只會在伺服器本機上回應。沒有網域時：使用 Cloudflare Tunnel 或 Tailscale |

## 安全性

- 對小團隊來說，只透過 Tailscale 或 VPN 連線到 ColTex 最簡單：它在網際網路上完全不可見。使用 Cloudflare Tunnel 時它是公開的，由 ColTex 的登入機制保護。
- 在網際網路上，請使用 HTTPS（Caddy，如雲端伺服器的部署方式）。
- 伺服器上的防火牆（ufw、firewalld）無法關閉 Docker 發佈的連接埠。使用 `--domain` 時，連接埠 3690 只會在伺服器本機上回應；如果改用 Tailscale 或 Cloudflare 通道，請在雲端供應商的防火牆中關閉 3690。
- 沒有公開註冊，只有邀請；密碼有強度規則；每個人都可以開啟兩步驟驗證。登入失敗會先減慢速度，之後對不熟悉的位址鎖定帳號，持續失敗的位址會被封鎖一天（請見 [管理](#/help/admin)）。
- ColTex 的頁面會告訴瀏覽器不要在其他網站中顯示它（防止點擊劫持），並且只執行它自己的指令碼；使用 `--domain` 時，Caddy 還會告訴瀏覽器只使用 HTTPS（HSTS）。
- 使用不常見的連接埠並不能阻擋掃描程式；不要依賴它。
