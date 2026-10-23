# デプロイとネットワーク

本番環境の ColTex は 1 つのポート（既定は 3690）を使います。ページ、API、リアルタイムの共同編集（WebSocket）、通知はすべてこのポートを通ります。HTTP と WebSocket を転送できるものなら何でも使えます。このコンピューター、LAN、Tailscale、Cloudflare Tunnel、クラウドサーバーなどです。（3000 と 5173 は開発用サーバーのポートです。）

## インストール

Docker の入った Linux または macOS で、次のコマンドを 1 つ実行します。

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

言語、エディション、ColTex へのアクセス方法を尋ねられます（矢印キーで選択します。`--edition`、`--domain`、`--lang` などのオプションで代わりに指定することもできます）。その後、Docker を確認し（Linux ではインストールもできます）、ColTex を `~/coltex` に取得し、設定を書き込み、ビルド済みのイメージ（x86-64 と ARM64）をダウンロードして起動し、このマシンとネットワーク上で開くアドレスを表示します。初回の起動時には TeX Live がダウンロードされます。エディションは 2 つあります。

| エディション | ダウンロード | ディスク使用量（ColTex 全体） | 必要な空き容量 |
| --- | --- | --- | --- |
| **standard**（既定） | 約 3 GB | 約 12 GB | 20 GB |
| **full**（`--edition full`） | 約 8 GB | 約 23 GB | 35 GB |

どちらも同じようにコンパイルできます（完全な TeX Live）。full エディションにはパッケージのマニュアルとソースが追加され、AI エージェントがそれを読めるようになります。standard エディションでは、AI エージェントはパッケージのファイルと自身の知識から回答します。後から `coltex edition full` または `coltex edition standard` で切り替えられます。

リモートアクセスも同時にオンにできます。

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

その後は `coltex` で管理します。

| コマンド | 内容 |
| --- | --- |
| `coltex status` / `logs` | 状態 / ログ |
| `coltex edition [standard\|full]` | TeX Live のエディションを表示または切り替え（もう一方のコンパイライメージをダウンロードします） |
| `coltex update` | 最新のリリースに更新（新しいイメージをダウンロードします）。データと設定はそのまま残ります |
| `coltex stop` / `start` | 停止 / 起動 |
| `coltex tailscale up` | tailnet に参加（ログインリンクと QR コードを表示します） |
| `coltex cloudflare quick` | Cloudflare の一時的な公開アドレス |
| `coltex cloudflare token` | 独自ドメインを使う Cloudflare トンネル（トークンを尋ねます） |

## どのアドレスからでもログインできる

サーバーは、自身のアドレスに対して行われたログインを受け付けます。`localhost`、LAN の IP、Tailscale のアドレス、ドメインのどれで開いても、事前に登録しておく必要はありません。別のサイトのページから誰かをログインさせることはできません。

## リンクに使われるアドレス

招待リンクと Git の clone 用アドレスは、ColTex にアクセスできるアドレスごとに 1 つずつ、それぞれコピーボタン付きで表示されます。受け取る人が開けるものを選んでください。

- **LAN** または **Tailscale**：ColTex を開いたときのアドレス（アドレスから判別されます）。
- **Tailscale**、**Cloudflare**：組み込みの Tailscale または Cloudflare Tunnel が接続している間のアドレス。接続に合わせて表示されたり消えたりするため、オフにしたときに何かを変更する必要はありません。
- **公開アドレス**：サーバーの `COLTEX_URL`（設定されている場合）。

保留中の招待のリンクは、使われるか期限切れになるまで招待一覧に残ります。

## Tailscale

ColTex には Tailscale が組み込まれており、独立したデバイス（既定の名前は `coltex`）として tailnet に参加できます。サーバーに何かをインストールする必要はなく、デスクトップ環境のないサーバーでも動作します。

1. **設定 → ネットワーク** で Tailscale をオンにします。
2. スマートフォンで QR コードをスキャンするか、任意のデバイスでリンクを開き、tailnet にログインします。ページは自動的に「接続済み」に切り替わります。
3. **tailnet で ColTex を公開** をオンにします。tailnet で MagicDNS と HTTPS が有効な場合のアドレスは `https://coltex.<your tailnet>.ts.net`、そうでない場合は `http://coltex.<your tailnet>.ts.net` です。

まだどのブラウザからも設定ページにアクセスできない場合は、サーバーで次を実行します。

```sh
coltex tailscale up
```

Tailscale をオンにし、ターミナルにログインリンクと QR コードを表示し、ログインを待ってから、tailnet で ColTex を公開します。`coltex tailscale status` で状態を表示し、`coltex tailscale down` で tailnet から離脱し、`coltex tailscale off` でオフにします。

`TS_HOSTNAME` でデバイス名を変更できます。Tailscale はサーバー自身が実行するため、追加のコンテナや特権は不要です。デバイスの鍵は `data/tailscale` に保存され、バックアップには含まれません。復元後はもう一度ログインしてください。

サーバーですでに Tailscale を実行している場合は、組み込みの Tailscale は不要です。サーバーの Tailscale IP または MagicDNS 名に `:3690` を付けて ColTex を開いてください。

## Cloudflare Tunnel

ColTex には Cloudflare Tunnel も組み込まれています。トンネルとしてのみ使うため、ユーザーは引き続き ColTex のアカウントでログインし、Cloudflare Access は不要です。サーバー側でポートを開ける必要もありません。

- **一時リンク**：Cloudflare のアカウントは不要です。`https://<random>.trycloudflare.com` が発行されますが、起動するたびに変わります。お試し用です。
- **独自ドメインのトンネル**：Cloudflare にドメインがある場合、Zero Trust → Networks → Tunnels でトンネルを作成し、“Run the following command” の下にあるコマンド（Windows、macOS、Debian、Red Hat、Docker のどのシステム用でも構いません）をコピーします。ColTex がそこからトークンを取り出します。トンネルに公開ホスト名（例：`tex.example.org`）を追加し、サービスを `http://localhost:3690` に設定します。

**設定 → ネットワーク** の Cloudflare Tunnel カードのスイッチでオンにし、一時リンクかトンネル（保存済みのもの、または貼り付けたコマンドから作る新しいもの）を選びます。ターミナルで `coltex cloudflare quick` / `coltex cloudflare token` を使うこともできます。接続すると、そのアドレスは自動的に招待リンクに表示されます。トークンは暗号化して保存され、二度と表示されません。

## サーバーの設定

これらはサーバーの環境変数です。Docker の場合は、`docker-compose.yml` と同じ場所にある `.env` ファイルに書き、`docker compose up -d` を実行します。

| 変数 | 内容 |
| --- | --- |
| `COLTEX_PORT` | ポート。既定は 3690 |
| `COLTEX_URL` | すべてのリンクで提示される公開アドレス。例：`https://tex.example.org` |
| `TRUSTED_ORIGINS` | ログインを受け付けるその他のアドレス（カンマ区切り）。ページと API が別のアドレスにある場合にのみ必要です |
| `TRUST_PROXY` | 前段にリバースプロキシ（Caddy、Nginx）がある場合：`uniquelocal`（プライベートネットワーク上のプロキシ）または `true`。設定しないと、サーバーはプロキシを訪問者とみなし、全員が 1 つのログインのレート制限を共有することになります |
| `TS_HOSTNAME` | 組み込みの Tailscale のデバイス名。既定は `coltex` |

**設定 → ネットワーク** の下部にある **リクエストの経路** には、これらの設定とサーバーから見た IP が表示され、問題があれば指摘されます。

## よくある構成

| 構成 | 方法 |
| --- | --- |
| このコンピューターのみ | 既定のまま：`http://localhost:3690` |
| LAN | サーバーの LAN アドレスで開きます。例：`http://192.168.1.20:3690`。LAN のアドレスは変わることがあるため、長く使う場合はルーターでアドレスを予約してください |
| Tailscale | 上記の Tailscale を参照してください |
| Cloudflare Tunnel | 上記の Cloudflare Tunnel を参照してください |
| クラウドサーバー | ドメインがある場合：`--domain tex.example.org` を付けてインストールします（ドメインの DNS をサーバーに向け、ポート 80 と 443 を開けます）。同梱の Caddy が HTTPS 証明書を取得し、ポート 3690 はサーバー自身からの接続にのみ応答するようになります。ドメインがない場合：Cloudflare Tunnel または Tailscale |

## セキュリティ

- 小規模なグループなら、Tailscale や VPN 経由でのみ ColTex にアクセスするのが最も簡単です。インターネットからはまったく見えません。Cloudflare Tunnel を使う場合は公開され、ColTex のログインで保護されます。
- インターネット上では HTTPS を使ってください（クラウドサーバーの構成のように Caddy を使います）。
- サーバーのファイアウォール（ufw、firewalld）では、Docker が公開するポートは閉じられません。`--domain` を使う場合、ポート 3690 はサーバー自身からの接続にのみ応答します。代わりに Tailscale や Cloudflare トンネルを使う場合は、クラウドプロバイダーのファイアウォールで 3690 を閉じてください。
- 一般公開のアカウント登録はなく、招待のみです。パスワードには強度のルールがあり、ログインは IP ごとに 10 秒あたり 3 回まで試行できます。
- 一般的でないポートを使っても、スキャナーは防げません。それに頼らないでください。
