# 部署与网络

ColTex 正式部署只用一个端口（默认 3690）：网页、接口、实时协作（WebSocket）和通知推送都走它。所以只要能转发 HTTP 和 WebSocket，本机、局域网、Tailscale、Cloudflare Tunnel、云服务器都可以用。（3000 和 5173 是开发模式用的端口。）

## 安装

在 Linux 或 macOS 上（需要 Docker），一行命令安装：

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

如果下载中途断开（`curl: (35) Recv failure: Connection reset by peer`，访问 GitHub 不稳定时常见），重新运行这条命令即可。

在中国大陆，它会自动从阿里云下载镜像（与 ghcr.io 上的相同）。它会先用方向键询问语言和 TeX Live 版本（也可以用 `--edition`、`--lang` 参数直接指定），再检查 Docker（Linux 上没有的话可以帮你装）、把 ColTex 下载到 `~/coltex`、生成配置、下载预构建的镜像（x86-64 和 ARM64）并启动，最后打印本机和局域网的访问地址。第一次启动要下载 TeX Live，有两个版本：

| 版本 | 下载量 | 安装后整个 ColTex 占用 | 建议预留空间 |
| --- | --- | --- | --- |
| **标准版**（默认） | 约 3 GB | 约 12 GB | 20 GB |
| **完整版**（`--edition full`） | 约 8 GB | 约 23 GB | 35 GB |

两个版本都是完整的 TeX Live，编译效果一样，AI 智能体也都能用。标准版不带宏包手册和源码；完整版加上了它们，AI 智能体还可以查阅手册。用标准版时，AI 智能体根据宏包文件和自己的知识回答。之后可以用 `coltex edition full` 或 `coltex edition standard` 切换。

远程访问（Tailscale、Cloudflare Tunnel）在安装后到 **设置 → 网络** 里开启（见下文）。用脚本安装时，也可以用参数在安装时顺带开启：

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --tailscale
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

之后用 `coltex` 命令管理：

| 命令 | 作用 |
| --- | --- |
| `coltex status` / `logs` | 查看状态 / 日志 |
| `coltex edition [standard\|full]` | 查看或切换 TeX Live 版本（会下载另一个编译镜像） |
| `coltex update` | 更新到最新版本（下载新镜像），数据和设置保留 |
| `coltex stop` / `start` | 停止 / 启动 |
| `coltex tailscale up` | 接入 Tailnet（打印登录链接和二维码） |
| `coltex cloudflare quick` | 打开一个临时的 Cloudflare 公网地址 |
| `coltex cloudflare token` | 用自己域名的 Cloudflare 隧道（会提示粘贴令牌） |
| `coltex reset` | 删除一切（账号、项目、数据库），从初始设置页重新开始；会先让你输入 `reset` 确认 |
| `coltex uninstall` | 从这台机器上彻底移除 ColTex：容器、数据库、数据、镜像、`coltex` 命令和安装目录（Docker 本身保留）；会先让你输入 `uninstall` 确认 |

## 从哪个地址都能登录

服务器接受来自它自身地址的登录：用 `localhost`、局域网 IP、Tailscale 地址还是域名打开都可以，不需要事先登记。别的网站上的页面不能替你登录。

## 链接用哪些地址

邀请链接和 Git clone 地址会按 ColTex 能访问到的每个地址各给一条，每条都能单独复制，你按对方能打开的那条发：

- **局域网** 或 **Tailscale**：你当前打开 ColTex 用的地址（按地址自动识别类型）；
- **Tailscale**、**Cloudflare**：自带的 Tailscale 或 Cloudflare Tunnel 连上时的地址。它们随开关自动出现和消失，关掉后不需要改任何设置；
- **公开地址**：服务器设置了 `COLTEX_URL` 时的地址。

待接受的邀请会一直在邀请列表里，点“链接”就能再次复制，直到被使用或过期。

## Tailscale

ColTex 自带 Tailscale，可以作为 Tailnet 里的一台独立设备（默认叫 `coltex`），不需要在服务器上另外安装，也适合没有图形界面的服务器。

1. 在 **设置 → 网络** 里打开 Tailscale 开关。
2. 用手机扫描页面上的二维码，或在任意设备上打开显示的链接，登录你的 Tailnet。页面会自动刷新到“已连接”。
3. 打开“在 Tailnet 上提供 ColTex”。Tailnet 启用了 MagicDNS 和 HTTPS 时，地址是 `https://coltex.<你的 tailnet>.ts.net`，否则是 `http://coltex.<你的 tailnet>.ts.net`。

没有浏览器能打开设置页面时，在服务器终端运行：

```sh
coltex tailscale up
```

它会开启 Tailscale，在终端里打印登录链接和二维码，等你登录后自动在 Tailnet 上提供 ColTex。`coltex tailscale status` 查看状态，`coltex tailscale down` 退出 Tailnet，`coltex tailscale off` 关闭。

设备名用 `TS_HOSTNAME` 修改。Tailscale 由服务器自己运行，不需要额外的容器或权限；它的设备密钥保存在 `data/tailscale`，不在备份里，恢复备份后重新登录即可。

如果服务器本身已经装了 Tailscale，两者不会冲突：自带的是一台独立的设备，用的是用户态网络，不改服务器的任何网络设置。也可以不用自带的：直接用服务器的 Tailscale IP 或 MagicDNS 名称加 `:3690` 访问。

## Cloudflare Tunnel

ColTex 也自带 Cloudflare Tunnel，只用它的通道：登录仍然是 ColTex 自己的账号密码，不需要 Cloudflare Access。服务器不需要开放端口。

- **快速隧道**：不需要 Cloudflare 账号，会得到一个 `https://<随机>.trycloudflare.com` 地址，每次启动都会变，适合临时用。
- **自己的域名**：域名托管在 Cloudflare 上时，在 Cloudflare 后台 Zero Trust → Networks → Tunnels 创建隧道，复制 “Run the following command” 下面的那条命令（Windows、macOS、Debian、Red Hat、Docker 任选一个系统都行），ColTex 会自动从里面取出令牌；给隧道添加公网主机名（比如 `tex.example.org`），服务填 `http://localhost:3690`。

开启方式：打开 **设置 → 网络** 里 Cloudflare Tunnel 卡片的开关，再选临时链接或隧道（使用已保存的隧道，或粘贴命令连接新隧道）；或者在终端运行 `coltex cloudflare quick` / `coltex cloudflare token`。连上后它的地址会自动出现在邀请链接里。令牌加密保存，不会再显示。

如果隧道无法通过 QUIC 连上 Cloudflare（被防火墙拦住，或代理丢弃了 UDP），ColTex 会自动改用 HTTP/2。trycloudflare.com 限制临时链接时（429 Too Many Requests），ColTex 会越来越少地重试。更换隧道时，请在 Cloudflare 后台把公网主机名移到新隧道；移过去之前，访问这些域名会出现 Error 1033。

如果服务器上已经在用 cloudflared 跑自己的隧道，两者不会冲突，但不要把那个隧道的令牌填进 ColTex：Cloudflare 会把两边当成同一个隧道的两个连接器，把请求分给它们，服务器上其他域名的请求有时会落到 ColTex 这边而打不开（502）。可以在那个隧道里给 ColTex 加一个公网主机名（服务填 `http://localhost:3690`），不开自带的隧道；或者给 ColTex 单独建一个隧道。

## 服务器设置

这些是服务器的环境变量。用 Docker 部署时，写在 `docker-compose.yml` 旁边的 `.env` 文件里，然后执行 `docker compose up -d`。

| 变量 | 作用 |
| --- | --- |
| `COLTEX_PORT` | 对外的端口，默认 3690 |
| `COLTEX_URL` | 每条链接都会提供的公开地址，比如 `https://tex.example.org` |
| `TRUSTED_ORIGINS` | 其他也允许登录的地址，用逗号分隔。只有页面和接口不在同一个地址时才需要 |
| `TRUST_PROXY` | 前面有反向代理（Caddy、Nginx）时设为 `uniquelocal`（代理在内网）或 `true`。不设置时，服务器把代理当成访客：所有人共用一个地址，一个人的登录失败会算到所有人头上，登录记录里也只显示代理的地址。内置的 Tailscale 和 Cloudflare Tunnel 不需要设置它 |
| `TS_HOSTNAME` | 自带 Tailscale 的设备名，默认 `coltex` |

**设置 → 网络** 底部的“访问情况”显示这些设置和服务器看到的 IP，配置有问题时会给出提示。

## 常见场景

| 场景 | 做法 |
| --- | --- |
| 只在本机用 | 默认即可：`http://localhost:3690` |
| 局域网 | 用服务器的局域网 IP 打开，比如 `http://192.168.1.20:3690`。局域网 IP 可能变化，长期使用建议在路由器里固定它 |
| Tailscale | 见上面的 Tailscale 一节 |
| Cloudflare Tunnel | 见上面的 Cloudflare Tunnel 一节 |
| 云服务器 | 有域名：安装时加 `--domain tex.example.org`（先把域名解析到服务器，开放 80 和 443 端口），内置的 Caddy 会自动申请 HTTPS 证书，3690 端口之后只在服务器本机可访问。没有域名：用 Cloudflare Tunnel 或 Tailscale |

## 安全建议

- 小团队最省心的做法是只通过 Tailscale 或 VPN 访问，公网上根本看不到这个服务。用 Cloudflare Tunnel 时服务是公开的，靠 ColTex 的登录保护。
- 放到公网时用 HTTPS（云服务器场景里的 Caddy）。
- 服务器上的防火墙（ufw、firewalld）挡不住 Docker 开放的端口。用了 `--domain` 后，3690 端口只在服务器本机可访问；如果改用 Tailscale 或 Cloudflare 隧道，请在云服务商的防火墙里关掉 3690。
- ColTex 不开放注册，只能凭邀请创建账号。密码有强度要求，每个人都可以开启两步验证。登录失败多了要等待，再多会对陌生地址锁定账号，一直失败的地址会被封禁一天（见[管理](#/help/admin)）。
- ColTex 的页面告诉浏览器不要在其他网站里嵌入显示它（防点击劫持），只运行它自己的脚本；用 `--domain` 时，Caddy 还会告诉浏览器只用 HTTPS 访问（HSTS）。
- 换一个不常见的端口挡不住扫描，不要把它当成防护手段。
