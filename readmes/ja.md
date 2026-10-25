<h1 align="center">ColTex</h1>
<p align="center">
  <strong>AI エージェントを内蔵した、セルフホスト型の共同編集 LaTeX エディター。</strong><br>
  自分のサーバー · 自分のアカウント · 自分のデータ · リアルタイム共同編集 · オープンソース（AGPL-3.0）
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd><b>日本語</b></kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">インストール</a> · <a href="#configure">設定</a> · <a href="../CHANGELOG.md">変更履歴</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="最新リリース"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<a id="quick-start"></a>
## クイックスタート

Docker の入った Linux または macOS のマシン（Linux ではインストーラーが Docker をセットアップできます）と、2 コア以上の CPU、4 GB 以上のメモリが必要です。イメージは x86-64 と ARM64 向けにビルド済みです。

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

その後 `http://<サーバー>:3690` を開き、管理者アカウントを作成します。

<p align="center">
  <img src="../docs/images/editor.png" alt="ColTex のエディター：ファイル、LaTeX ソース、コンパイルされた PDF、AI エージェント" width="900">
</p>

<a id="why"></a>
## なぜ ColTex？

ColTex は、研究グループや研究室、あるいは個人のための Overleaf の代替です。研究室のデスクトップ、自宅のサーバー、クラウドのマシンなど、自分で管理するコンピューターで動きます。

- **すべてがあなたのサーバーに留まります。** プロジェクト、履歴、アカウント、コンパイルジョブが外部に出ることはありません。TeX はインターネットにアクセスできないサンドボックスのコンテナで実行されます。
- **共同執筆のために作られています。** 複数のユーザーが同じファイルを同時に編集でき、コメント、変更履歴の記録、チャット、バージョン履歴が使えます。
- **プロジェクトを直接扱う AI エージェント。** ファイルとコンパイルログを読み、変更の下書きを作り、テストコンパイルして差分を表示します。あなたが適用するまで何も書き込まれません。
- **コマンド 1 つでインストール、ポートの開放は不要。** リモートアクセス用に Tailscale と Cloudflare Tunnel が組み込まれています。

<a id="features"></a>
## 機能

### 執筆とコンパイル
- ソースエディター（CodeMirror）と、Overleaf の表エディターと図のダイアログ、ツールバー、記号パレット、アウトライン、パンくずリストを備えたビジュアルエディター。
- LaTeX の補完、コードチェック、数式プレビュー、多言語のスペルチェック、単語数、プロジェクト全体の検索と置換、Vim や Emacs のキーバインド。
- 完全な TeX Live 上の latexmk でコンパイルします。エンジン（pdfLaTeX、XeLaTeX、LuaLaTeX）は中国語（ctex、xeCJK）も含めて文書から自動で選ばれます。
- 双方向の SyncTeX に対応した PDF プレビュー。別ウィンドウでも表示できます。コンパイルエラーはソースに下線で示され、わかりやすいヒントが付きます。
- 参考文献：`.bib` ファイルから引用、Crossref と arXiv を検索して（または DOI や arXiv ID を貼り付けて）エントリを追加、Zotero のライブラリやコレクションをインポートして同期。

### 共同作業
- 全員のカーソルが見えるリアルタイム編集、@メンション付きのコメント、変更履歴の記録（承諾、却下、判断の取り消し）、プロジェクトのチャット、アプリ内通知。
- プロジェクトごとのロール：オーナー、編集者、レビュアー（提案のみ）、閲覧者。
- git のようなバージョン履歴：自動のバージョン、メッセージ付きで保存したバージョン、1 つのバージョンの変更の取り消し。
- Git アクセス：プロジェクトを clone してローカルで作業し、push で戻せます（個人用トークン。その間にブラウザで行われた編集はマージされます）。

### AI エージェント
- LaTeX、プロジェクト、文章について質問したり、コンパイルエラーを修正させたりできます。AI エージェントは非公開のコピーで変更の下書きを作り、テストコンパイルして差分を表示します。全部または一部を適用できます。
- 適用時には先にバージョンを保存して再コンパイルし、ビルド結果が悪化した場合は変更を自動でロールバックします。
- プロバイダー：API キー（Anthropic、OpenAI、DeepSeek、Google、OpenRouter など）、サブスクリプションでのログイン（Claude Pro/Max、ChatGPT、GitHub Copilot など）、または独自の OpenAI 互換サーバー（Ollama、vLLM、LM Studio）。
- モデルの自動選択（メッセージごとに軽量モデルか高性能モデルを選択）、ユーザーのグループごとのアクセス、個人ごとの利用状況、1 日・1 週間・1 か月あたりの利用上限。
- プロジェクトごとに保存されるチャット、随時表示されるコンテキストウィンドウの使用量、長いチャットを要約する `/compact`。
- Skill：AI エージェントが従う自分用の指示（Agent Skills 形式）で、すべてのプロジェクトに共通です。`/name` で使います。自分で書く、インポートする、または設定で AI と一緒に作成できます。
- Claude Code のような権限：AI エージェントの変更はあなたのレビューを待つ（手動）、処理が終わると適用される（自動）、またはファイルの削除や移動も可能（フルアクセス）。
- MCP 経由で自分のエージェント（Claude Code、Codex、Cursor など）を接続：すべてのプロジェクトに共通の 1 つのアドレスで、同じ権限が適用されます（手動の場合、その編集はあなたの提案になります）。

### プロジェクトと管理
- IEEE、ACM、Springer LNCS、Elsevier、REVTeX、arXiv のテンプレートと、論文をあるジャーナルテンプレートから別のテンプレートへ変換する機能。
- Overleaf の zip のインポートとエクスポート、URL や別のプロジェクトからのリンクファイル、タグ、アーカイブ、ゴミ箱。
- 一般公開のアカウント登録はなく、アカウントは招待リンクから作成します。システム管理者は 1 人で、管理者はそれぞれ自分が招待したチームを管理します。
- 監視、WebDAV バックアップ（暗号化も可能）、ローカルまたは S3 互換のストレージ、ライトテーマとダークテーマ、14 言語のインターフェース（英語、中国語、日本語、韓国語、スペイン語、フランス語、ドイツ語、ポルトガル語、イタリア語、ロシア語、トルコ語、ベトナム語、インドネシア語）。
- アカウントの保護：認証アプリによる 2 段階認証、各アドレスの所在地（サーバー上で調べます）付きのサインイン記録、見知らぬアドレスからの失敗が続くとアカウントをロックするパスワード推測対策。いずれも外部サービスを使いません。

<a id="install"></a>
## インストール

ダウンロードが途中で切れた場合（`curl: (35) Recv failure: Connection reset by peer`。GitHub につながりにくい環境でよく起こります）は、同じコマンドをもう一度実行してください。

言語と TeX Live のエディションを（矢印キーで）尋ねたあと、最新のリリースを `~/coltex` に取得し、ビルド済みのイメージを進捗バー付きでダウンロードして ColTex を起動し、開くべきアドレスを表示します。出力の全文は `~/coltex/install.log` に保存されます。その後 `http://<server>:3690` を開き、管理者アカウントを作成してください。Tailscale や Cloudflare Tunnel によるリモートアクセスは、あとから **設定 → ネットワーク** でオンにします。

初回の起動時には TeX Live がダウンロードされます。エディションを選んでください。

| エディション | ダウンロード | ディスク（ColTex 全体） | 必要な空き容量 |
| --- | --- | --- | --- |
| **standard**（既定） | 約 3 GB | 約 12 GB | 20 GB |
| **full**（`--edition full`） | 約 8 GB | 約 23 GB | 35 GB |

どちらにも TeX Live のすべてのパッケージが入っていて、同じ文書をコンパイルでき、AI エージェントもどちらでも使えます。standard エディションにはパッケージのマニュアルが含まれません。full エディションにはマニュアルとソースが加わり、AI エージェントはそれも読めます。

`--edition` と `--lang` で質問に答えることも、端末がない環境で質問の代わりに指定することもできます。`--domain`、`--tailscale`、Cloudflare のオプションは、スクリプトでインストールするときにリモートアクセスもあわせて設定するためのものです。オプションは `bash -s --` の後に付けます。

| オプション | |
| --- | --- |
| `--domain tex.example.org` | 独自ドメインを持つサーバーで、同梱の Caddy による HTTPS を使います。ドメインをサーバーに向け、ポート 80 と 443 を開けてください |
| `--tailscale` | ColTex を tailnet に追加します。ログインリンクと QR コードが表示されます |
| `--cloudflare-token TOKEN` | 独自ドメイン用に作成した Cloudflare トンネルに接続します |
| `--cloudflare-quick` | お試し用の一時的な公開アドレス（`trycloudflare.com`） |
| `--edition full` | TeX Live の full エディション |
| `--lang LANG` | インストーラー、`coltex`、セットアップページの言語：`en`、`zh-CN`、`zh-TW`、`ja`、`ko`、`es`、`fr`、`de`、`pt-BR`、`it`、`ru`、`tr`、`vi`、`id`（指定しない場合は尋ねられます） |
| `--port 3690` | 別のポート |
| `--version v0.0.1` | 特定のリリース（開発ブランチは `main`） |
| `--build` | イメージをダウンロードせず、このマシンでソースからビルドします |
| `--images REGISTRY` | イメージのダウンロード元：`aliyun`（Alibaba Cloud 上の同じイメージ）、`ghcr`（`ghcr.io/lewen-cai`）、または ghcr.io の別のミラー。指定しない場合、このマシンから応答の速いほうを使います（Docker の `registry-mirrors` は Docker Hub にのみ適用され、ghcr.io には適用されません） |

インターネットからアクセスできるサーバーでは、暗号化されていない `http://` でログインしないでください。`--domain`、Tailscale、または Cloudflare トンネルを使ってください。

### 管理と更新

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
## 設定

すべてブラウザで、ユーザーメニューの **設定** から設定します。

1. **ユーザーを管理** と **招待**：リンクでユーザーを招待します（各リンクは 1 回だけ使え、1 つのメールアドレスに限定することもできます）。
2. **AI サービス**：プロバイダーを接続します。次に **AI の利用状況とアクセス** で、そのプロバイダーを使えるグループにユーザーを追加します。グループに属していないと、システム管理者以外は AI エージェントを利用できません。
3. **ネットワーク**：ColTex にアクセスできるアドレスと、Tailscale と Cloudflare Tunnel。
4. **ストレージとバックアップ**：WebDAV のフォルダー（Nextcloud、NAS など）への毎日または毎週のバックアップ。

ヘルプドキュメントは内蔵されています：ユーザーメニューの **ヘルプドキュメント**。サーバーの運用（環境変数、S3、バックアップの復元）については [docs/operations.md](../docs/operations.md)（英語）を参照してください。

<a id="development"></a>
## 開発

Node 24 以降、pnpm 11、Docker が必要です。

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| パス | |
| --- | --- |
| `apps/web` | Web アプリ：React、CodeMirror 6、PDF.js |
| `apps/server` | API：Fastify、アカウント、プロジェクト、リアルタイム共同編集、AI エージェント |
| `services/compiler` | TeX Live のコンテナで動くコンパイルワーカー |
| `packages/*` | 共有スキーマ、ログパーサー、LaTeX の言語サポート、レビューデータ、テンプレート変換 |

設計については [docs/architecture.md](../docs/architecture.md)（英語）で説明しています。

<a id="acknowledgements"></a>
## 謝辞

- [Overleaf](https://github.com/overleaf/overleaf)（AGPL-3.0）：ColTex は、そのログパーサーとヒント、LaTeX の言語サポート、ビジュアルエディター、表エディター、スペルチェック、単語数を移植しています。移植したファイルはすべて [NOTICE](../NOTICE) に記載しています。
- [Pi](https://github.com/earendil-works)（`pi-ai`、`pi-agent-core`）：AI エージェントを支えるモデルプロバイダーとエージェントループ。
- [PilotDeck](https://github.com/OpenBMB/PilotDeck)（AGPL-3.0）：プロバイダーの健全性の追跡とモデルの自動選択は、これを改変したものです。
- [Yjs](https://github.com/yjs/yjs) と [Hocuspocus](https://github.com/ueberdosis/hocuspocus)、[CodeMirror](https://codemirror.net)、[PDF.js](https://mozilla.github.io/pdf.js/)、[better-auth](https://www.better-auth.com)、[shadcn/ui](https://ui.shadcn.com)、[TeX Live](https://tug.org/texlive/)。
- [Lobe Icons](https://github.com/lobehub/lobe-icons)（MIT）：プロバイダーのロゴ。商標はそれぞれの所有者に帰属し、サービスを識別するためにのみ使用しています。

<a id="license"></a>
## ライセンス

[AGPL-3.0](../LICENSE)。改変した ColTex をネットワーク経由で他の人に提供する場合は、そのソースコードを提供しなければなりません。サードパーティのコードはそれぞれのライセンスに従います。[NOTICE](../NOTICE) を参照してください。
