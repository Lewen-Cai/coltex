<h1 align="center">ColTex</h1>
<p align="center">
  <strong>自托管的多人协作 LaTeX 编辑器，内置 AI 智能体。</strong><br>
  你的服务器 · 你的账号 · 你的数据 · 实时协作 · 开源（AGPL-3.0）
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd><b>简体中文</b></kbd></a>
</p>
<p align="center">
  <a href="#install">安装</a> · <a href="#configure">配置</a> · <a href="../CHANGELOG.md">更新日志</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="最新版本"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="ColTex 编辑器：文件、LaTeX 源码、编译出的 PDF 和 AI 智能体" width="900">
</p>

<a id="why"></a>
## 为什么用 ColTex？

ColTex 可以替代 Overleaf，适合课题组、实验室或个人使用，装在你自己掌控的电脑上：实验室的台式机、家里的服务器或云服务器都可以。

- **所有东西都留在你的服务器上。** 项目、历史版本、账号和编译任务都不会离开它。TeX 在一个隔离、不能联网的容器里编译。
- **为多人一起写作而设计。** 多人同时编辑同一个文件，有批注、修订、聊天和历史版本。
- **在项目里干活的 AI 智能体。** 它会读项目文件和编译日志，起草修改、试编译，再把差异给你看。你点应用之前，什么都不会写进项目。
- **一条命令安装，不用开放端口。** 内置 Tailscale 和 Cloudflare Tunnel，方便远程访问。

<a id="features"></a>
## 功能

### 写作与编译
- 源码编辑器（CodeMirror）和可视化编辑器，含 Overleaf 的表格编辑器和插图对话框、工具栏、符号面板、文档大纲和路径导航。
- LaTeX 自动补全、代码检查、公式预览、多语言拼写检查、字数统计、全项目搜索替换，支持 Vim 和 Emacs 键位。
- 在完整的 TeX Live 上用 latexmk 编译，根据文档自动选择 pdfLaTeX、XeLaTeX 或 LuaLaTeX，支持中文（ctex、xeCJK）。
- PDF 预览支持双向 SyncTeX，也可以在单独的窗口里打开。编译错误会在源码里标出，并附上通俗的提示。
- 参考文献：从项目的 `.bib` 里引用，搜索 Crossref 和 arXiv（或粘贴 DOI、arXiv 编号）添加条目，或者导入 Zotero 的文献库或分类并保持同步。

### 协作
- 实时多人编辑，能看到每个人的光标；支持带 @提及 的批注、修订（接受、拒绝，点错了还能撤销）、项目聊天和站内通知。
- 项目角色：所有者、编辑者、审阅者（只能提建议）和只读成员。
- 像 git 一样的历史版本：自动保存的版本、带说明手动保存的版本，以及撤销某一个版本的修改。
- Git 同步：把项目 clone 到本地编辑，再 push 回来（使用个人令牌；期间在浏览器里的修改会自动合并）。

### AI 智能体
- 可以问 LaTeX、项目或写作上的问题，也可以让它修编译错误。它在私有副本里起草修改并试编译，然后展示差异，你可以全部或部分应用。
- 应用前会先保存一个版本，应用后重新编译；如果编译结果变差，会自动回滚。
- 模型服务：API Key（Anthropic、OpenAI、DeepSeek、Google、OpenRouter 等）、订阅账号登录（Claude Pro/Max、ChatGPT、GitHub Copilot 等），或者自己部署的 OpenAI 兼容服务（Ollama、vLLM、LM Studio）。
- 自动选择模型（每条消息在轻量模型和强模型之间选择）、按用户组分配权限、按人统计用量，并可按天、周或月限制每人用量。
- 按项目保存历史对话，实时显示上下文占用，用 `/compact` 压缩过长的对话。
- 技能：个人和项目的技能（Agent Skills 格式），AI 智能体照着做，用 `/名称` 调用；可以自己写、导入，也可以在设置里让 AI 帮你创建。
- 通过 MCP 接入你自己的智能体（Claude Code、Codex、Cursor 等）：每个项目都是一个 MCP 服务器。每个项目可以分别选择它的修改记为你的修订建议、直接生效，还是也可以删除和移动文件。

### 项目与管理
- IEEE、ACM、Springer LNCS、Elsevier、REVTeX 和 arXiv 模板，以及把论文从一种期刊模板转换成另一种。
- 导入、导出 Overleaf 的 zip，关联来自网址或其他项目的文件，标签、归档和回收站。
- 不开放注册，只能凭邀请链接创建账号。一个系统管理员，以及各自管理自己所邀请小组的管理员。
- 运行监控、WebDAV 备份（可加密）、本地或 S3 兼容存储、浅色和深色主题、中英文界面。

<a id="install"></a>
## 安装

需要一台装有 Docker 的 Linux 或 macOS 电脑（Linux 上安装脚本可以帮你装 Docker），至少 2 核 CPU、4 GB 内存。镜像已为 x86-64 和 ARM64 预先构建好。

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

脚本会先用方向键询问语言、TeX Live 版本和访问方式，然后把最新版本下载到 `~/coltex`，生成配置，带进度条下载预构建的镜像并启动 ColTex，最后打印访问地址。完整输出写在 `~/coltex/install.log`。然后打开 `http://<服务器>:3690`，创建管理员账号。

第一次启动要下载 TeX Live，有两个版本可选：

| 版本 | 下载量 | 整个 ColTex 占用 | 建议预留空间 |
| --- | --- | --- | --- |
| **标准版**（默认） | 约 3 GB | 约 12 GB | 20 GB |
| **完整版**（`--edition full`） | 约 8 GB | 约 23 GB | 35 GB |

两个版本能编译的文档一样。完整版多了宏包手册，AI 智能体 可以查阅。

参数可以直接回答这些问题，没有终端时也用它们代替（加在 `bash -s --` 后面）：

| 参数 | |
| --- | --- |
| `--domain tex.example.org` | 有自己域名的服务器：通过内置的 Caddy 启用 HTTPS。先把域名解析到服务器，并开放 80 和 443 端口 |
| `--tailscale` | 把 ColTex 加入你的 Tailnet，会打印登录链接和二维码 |
| `--cloudflare-token 令牌` | 连接你为自己域名创建的 Cloudflare 隧道 |
| `--cloudflare-quick` | 临时的 `trycloudflare.com` 公网地址，适合试用 |
| `--edition full` | 完整版 TeX Live |
| `--local` | 只在本机和局域网访问 |
| `--lang zh` | 安装脚本、`coltex` 和初始设置页面使用中文（`en` 为英文） |
| `--port 3690` | 换一个端口 |
| `--version v0.0.1` | 指定版本（`main` 表示开发分支） |
| `--build` | 在本机从源码构建镜像，而不是下载预构建的镜像 |

如果服务器能从公网访问，不要通过明文 `http://` 登录：请用 `--domain`、Tailscale 或 Cloudflare 隧道。

### 管理与更新

```sh
coltex status          # 是否在运行、访问地址
coltex logs            # 服务器日志（coltex logs compiler 查看编译服务）
coltex update          # 更新到最新版本，配置和数据都会保留
coltex version
coltex edition full    # 切换 TeX Live 版本
coltex tailscale up    # 或者：coltex cloudflare quick | token
coltex stop | start
```

<a id="configure"></a>
## 配置

所有设置都在浏览器里完成，在左下角用户菜单的 **设置** 里：

1. **管理用户** 和 **邀请**：用邀请链接邀请别人（每个链接只能用一次，可以限定邮箱）。
2. **AI 服务**：接入一个模型服务。然后在 **AI 用量与权限** 里把人加进可以使用它的用户组。不在任何用户组里的人（系统管理员除外）用不了 AI 智能体。
3. **网络**：ColTex 当前的访问地址，以及 Tailscale 和 Cloudflare Tunnel。
4. **存储与备份**：每天或每周备份到 WebDAV 文件夹（Nextcloud、NAS 等）。

使用说明内置在 ColTex 里：用户菜单里的 **帮助文档**。服务器运维（环境变量、S3、恢复备份）见 [docs/operations.md](../docs/operations.md)（英文）。

<a id="feedback"></a>
## 早期版本：欢迎提 Issue

ColTex 还很年轻（0.0.x）。虽然每天都在使用和测试，但问题不一定都找出来了。如果遇到出错、显示不对或者不好用的地方，欢迎[提一个 Issue](https://github.com/Lewen-Cai/coltex/issues)，每一份反馈都很有帮助。

反馈时最好写上版本号（`coltex version`）、你做了什么、发生了什么；如果和服务器有关，附上 `coltex logs` 里的相关几行。请不要附上密码、API Key 或私密的文档内容。

<a id="development"></a>
## 开发

需要 Node 24 或更新版本、pnpm 11 和 Docker。

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # 在 Docker 里启动 Postgres、Valkey 和 TeX Live 编译服务
pnpm dev             # API 在 :3000，网页在 http://localhost:5173
pnpm -r typecheck
pnpm -r test         # 服务器测试需要 infra:up 启动的 Postgres
```

| 目录 | |
| --- | --- |
| `apps/web` | 网页应用：React、CodeMirror 6、PDF.js |
| `apps/server` | API：Fastify、账号、项目、实时协作、AI 智能体 |
| `services/compiler` | 在 TeX Live 容器里运行的编译服务 |
| `packages/*` | 共享的数据结构、日志解析、LaTeX 语言支持、审阅数据和模板转换 |

设计说明见 [docs/architecture.md](../docs/architecture.md)（英文）。

<a id="acknowledgements"></a>
## 致谢

- [Overleaf](https://github.com/overleaf/overleaf)（AGPL-3.0）：ColTex 移植了它的日志解析和提示、LaTeX 语言支持、可视化编辑器、表格编辑器、拼写检查和字数统计。每个移植的文件都列在 [NOTICE](../NOTICE) 里。
- [Pi](https://github.com/earendil-works)（`pi-ai`、`pi-agent-core`）：AI 智能体 背后的模型接入和 Agent 循环。
- [PilotDeck](https://github.com/OpenBMB/PilotDeck)（AGPL-3.0）：模型服务健康检测和自动选择模型参考并改编自它。
- [Yjs](https://github.com/yjs/yjs) 和 [Hocuspocus](https://github.com/ueberdosis/hocuspocus)、[CodeMirror](https://codemirror.net)、[PDF.js](https://mozilla.github.io/pdf.js/)、[better-auth](https://www.better-auth.com)、[shadcn/ui](https://ui.shadcn.com)、[TeX Live](https://tug.org/texlive/)。
- [Lobe Icons](https://github.com/lobehub/lobe-icons)（MIT）：模型服务商的图标。商标归各自所有者，仅用于标识所选的服务。

<a id="license"></a>
## 许可证

[AGPL-3.0](../LICENSE)。如果你通过网络向他人提供修改过的 ColTex，必须向他们提供相应的源代码。第三方代码保留各自的许可证，见 [NOTICE](../NOTICE)。
