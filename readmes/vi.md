<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Trình soạn thảo LaTeX cộng tác tự lưu trữ, có sẵn tác tử AI.</strong><br>
  Máy chủ của bạn · Tài khoản của bạn · Dữ liệu của bạn · Cộng tác thời gian thực · Mã nguồn mở (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd><b>Tiếng Việt</b></kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Cài đặt</a> · <a href="#configure">Cấu hình</a> · <a href="../CHANGELOG.md">Nhật ký thay đổi</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Phiên bản mới nhất"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="Trình soạn thảo ColTex: tệp, mã nguồn LaTeX, PDF đã biên dịch và tác tử AI" width="900">
</p>

<a id="why"></a>
## Vì sao chọn ColTex?

ColTex là một lựa chọn thay thế Overleaf cho nhóm nghiên cứu, phòng thí nghiệm hoặc cho riêng bạn, chạy trên một máy tính do bạn kiểm soát: máy bàn trong phòng thí nghiệm, máy chủ tại nhà hoặc máy chủ đám mây.

- **Mọi thứ nằm trên máy chủ của bạn.** Dự án, lịch sử, tài khoản và các tác vụ biên dịch không bao giờ rời khỏi đó. TeX chạy trong một container cách ly, không có truy cập internet.
- **Được xây dựng để cùng nhau viết.** Nhiều người cùng chỉnh sửa một tệp cùng lúc, với bình luận, theo dõi thay đổi, trò chuyện và lịch sử phiên bản.
- **Một tác tử AI làm việc trên dự án của bạn.** Nó đọc các tệp và nhật ký biên dịch, soạn nháp thay đổi, biên dịch thử, rồi cho bạn xem phần khác biệt. Không có gì được ghi cho đến khi bạn áp dụng.
- **Cài đặt bằng một lệnh, không cần mở cổng.** Tailscale và Cloudflare Tunnel được tích hợp sẵn để truy cập từ xa.

<a id="features"></a>
## Tính năng

### Viết và biên dịch
- Trình soạn thảo mã nguồn (CodeMirror) và trình soạn thảo trực quan với trình chỉnh sửa bảng và hộp thoại chèn hình của Overleaf, thanh công cụ, bảng ký hiệu, dàn ý và đường dẫn điều hướng.
- Tự động hoàn thành LaTeX, kiểm tra mã, xem trước công thức, kiểm tra chính tả cho nhiều ngôn ngữ, đếm từ, tìm và thay thế trên toàn dự án, và tổ hợp phím Vim hoặc Emacs.
- Biên dịch bằng latexmk trên TeX Live đầy đủ. Trình biên dịch (pdfLaTeX, XeLaTeX hoặc LuaLaTeX) được chọn dựa trên tài liệu, kể cả tiếng Trung (ctex, xeCJK).
- Xem trước PDF với SyncTeX theo cả hai chiều, kể cả trong một cửa sổ riêng. Lỗi biên dịch được gạch chân trong mã nguồn, kèm gợi ý bằng ngôn ngữ dễ hiểu.
- Tài liệu tham khảo: trích dẫn từ các tệp `.bib` của bạn, tìm trong Crossref và arXiv (hoặc dán DOI hay mã arXiv) để thêm mục, hoặc nhập một thư viện hay bộ sưu tập Zotero và giữ đồng bộ.

### Cộng tác
- Soạn thảo thời gian thực với con trỏ của mọi người, bình luận có @nhắc tên, theo dõi thay đổi (chấp nhận, từ chối và hoàn tác một quyết định), trò chuyện trong dự án và thông báo trong ứng dụng.
- Vai trò theo từng dự án: chủ sở hữu, người chỉnh sửa, người duyệt (chỉ đề xuất) và người xem.
- Lịch sử phiên bản như git: phiên bản tự động, phiên bản được lưu kèm mô tả, và hoàn tác thay đổi của một phiên bản.
- Truy cập Git: clone một dự án, làm việc cục bộ rồi push trở lại (token cá nhân; các chỉnh sửa trên trình duyệt trong lúc đó sẽ được hợp nhất).

### Tác tử AI
- Hỏi về LaTeX, dự án hoặc bài viết của bạn, hoặc để nó sửa lỗi biên dịch. Nó soạn nháp thay đổi trong một bản sao riêng, biên dịch thử và cho xem phần khác biệt; bạn áp dụng toàn bộ hoặc một phần.
- Khi áp dụng, một phiên bản được lưu trước và dự án được biên dịch lại; nếu kết quả biên dịch tệ hơn, thay đổi sẽ tự động được hoàn nguyên.
- Nhà cung cấp: khóa API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter và nhiều hơn nữa), đăng nhập gói đăng ký (Claude Pro/Max, ChatGPT, GitHub Copilot và nhiều hơn nữa), hoặc máy chủ tương thích OpenAI của riêng bạn (Ollama, vLLM, LM Studio).
- Tự động chọn mô hình (mô hình nhẹ hoặc mạnh cho mỗi tin nhắn), quyền truy cập theo nhóm người, mức dùng theo từng người, và giới hạn mức dùng theo ngày, tuần hoặc tháng.
- Cuộc trò chuyện được lưu theo từng dự án, cửa sổ ngữ cảnh hiển thị trong lúc làm việc, và `/compact` để tóm tắt một cuộc trò chuyện dài.
- Skill: các hướng dẫn của riêng bạn (định dạng Agent Skills) cho mọi dự án, mà tác tử làm theo, dùng bằng `/name`; tự viết, nhập vào, hoặc tạo cùng AI trong Cài đặt.
- Quyền giống Claude Code: thay đổi của tác tử AI chờ bạn xem xét (Thủ công), được áp dụng khi nó hoàn tất (Tự động), hoặc nó còn được phép xóa và di chuyển tệp (Toàn quyền).
- Tác tử của riêng bạn (Claude Code, Codex, Cursor…) qua MCP: một địa chỉ cho mọi dự án của bạn, với cùng các quyền (ở chế độ Thủ công, chỉnh sửa của nó trở thành đề xuất của bạn).

### Dự án và quản trị
- Mẫu cho IEEE, ACM, Springer LNCS, Elsevier, REVTeX và arXiv, và chuyển đổi bài báo từ mẫu tạp chí này sang mẫu tạp chí khác.
- Nhập và xuất zip của Overleaf, tệp liên kết từ URL hoặc từ dự án khác, thẻ, lưu trữ và thùng rác.
- Không có đăng ký công khai: tài khoản chỉ đến từ liên kết mời. Một quản trị viên hệ thống, và các quản trị viên, mỗi người quản lý nhóm do mình mời.
- Giám sát, sao lưu WebDAV (có thể mã hóa), lưu trữ cục bộ hoặc tương thích S3, chủ đề sáng và tối, và giao diện bằng 14 ngôn ngữ (tiếng Anh, tiếng Trung, tiếng Nhật, tiếng Hàn, tiếng Tây Ban Nha, tiếng Pháp, tiếng Đức, tiếng Bồ Đào Nha, tiếng Ý, tiếng Nga, tiếng Thổ Nhĩ Kỳ, tiếng Việt và tiếng Indonesia).

<a id="install"></a>
## Cài đặt

Bạn cần một máy Linux hoặc macOS có Docker (trên Linux, trình cài đặt có thể tự cài Docker), tối thiểu 2 nhân CPU và 4 GB bộ nhớ. Các image được dựng sẵn cho x86-64 và ARM64.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Nếu việc tải xuống bị ngắt (`curl: (35) Recv failure: Connection reset by peer`, thường gặp khi khó kết nối tới GitHub), hãy chạy lại lệnh.

Trình cài đặt hỏi ngôn ngữ và phiên bản TeX Live (dùng phím mũi tên), tải bản phát hành mới nhất về `~/coltex`, tải các image dựng sẵn kèm thanh tiến trình, khởi động ColTex, và in ra các địa chỉ để mở. Toàn bộ đầu ra được ghi vào `~/coltex/install.log`. Sau đó mở `http://<server>:3690` và tạo tài khoản quản trị viên. Truy cập từ xa qua Tailscale hoặc Cloudflare Tunnel được bật sau đó trong **Cài đặt → Mạng**.

Lần khởi động đầu tiên sẽ tải TeX Live. Hãy chọn một phiên bản:

| Phiên bản | Dung lượng tải | Ổ đĩa (toàn bộ ColTex) | Dung lượng trống cần có |
| --- | --- | --- | --- |
| **standard** (mặc định) | khoảng 3 GB | khoảng 12 GB | 20 GB |
| **full** (`--edition full`) | khoảng 8 GB | khoảng 23 GB | 35 GB |

Cả hai đều có mọi gói của TeX Live và biên dịch được cùng các tài liệu, và tác tử AI dùng được với cả hai. Phiên bản standard không kèm tài liệu hướng dẫn của các gói; phiên bản full có thêm tài liệu hướng dẫn và mã nguồn, mà tác tử AI cũng có thể đọc.

`--edition` và `--lang` trả lời thay cho câu hỏi, hoặc thay thế chúng khi không có terminal. `--domain`, `--tailscale` và các tùy chọn Cloudflare thiết lập truy cập từ xa ngay trong lúc cài, dành cho cài đặt bằng script. Thêm các tùy chọn sau `bash -s --`:

| Tùy chọn | |
| --- | --- |
| `--domain tex.example.org` | HTTPS cho máy chủ có tên miền riêng, qua Caddy đi kèm. Trỏ tên miền về máy chủ và mở cổng 80 và 443 |
| `--tailscale` | Đưa ColTex vào tailnet của bạn: in ra liên kết đăng nhập và mã QR |
| `--cloudflare-token TOKEN` | Kết nối một Cloudflare tunnel bạn đã tạo cho tên miền của mình |
| `--cloudflare-quick` | Một địa chỉ `trycloudflare.com` công khai tạm thời, để dùng thử |
| `--edition full` | Phiên bản TeX Live đầy đủ |
| `--lang LANG` | Ngôn ngữ của trình cài đặt, `coltex` và trang thiết lập: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` hoặc `id` (sẽ được hỏi nếu không chỉ định) |
| `--port 3690` | Một cổng khác |
| `--version v0.0.1` | Một bản phát hành cụ thể (`main` cho nhánh phát triển) |
| `--build` | Dựng các image từ mã nguồn trên máy này thay vì tải về |
| `--images REGISTRY` | Nơi tải các image: `aliyun` (cùng các image trên Alibaba Cloud), `ghcr` (`ghcr.io/lewen-cai`) hoặc một bản mirror khác của ghcr.io. Nếu không chỉ định, trình cài đặt dùng Alibaba Cloud ở Trung Quốc đại lục và ghcr.io ở nơi khác (`registry-mirrors` của Docker chỉ áp dụng cho Docker Hub, không áp dụng cho ghcr.io) |

Trên máy chủ truy cập được từ internet, đừng đăng nhập qua `http://` thuần: hãy dùng `--domain`, Tailscale hoặc Cloudflare tunnel.

### Quản lý và cập nhật

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
## Cấu hình

Mọi thứ được thiết lập trong trình duyệt, ở **Cài đặt** trong menu người dùng:

1. **Quản lý người dùng** và **Lời mời**: mời người khác bằng liên kết (mỗi liên kết dùng được một lần, có thể giới hạn cho một email).
2. **Dịch vụ AI**: kết nối một nhà cung cấp. Sau đó, trong **Mức dùng & quyền truy cập AI**, xếp mọi người vào một nhóm được phép dùng nhà cung cấp đó. Không thuộc nhóm nào thì không ai ngoài quản trị viên hệ thống có tác tử AI.
3. **Mạng**: các địa chỉ dùng để truy cập ColTex, cùng Tailscale và Cloudflare Tunnel.
4. **Lưu trữ & sao lưu**: sao lưu hằng ngày hoặc hằng tuần vào một thư mục WebDAV (Nextcloud, NAS…).

Tài liệu trợ giúp có sẵn trong ứng dụng: **Tài liệu trợ giúp** trong menu người dùng. Vận hành máy chủ (biến môi trường, S3, khôi phục bản sao lưu) được mô tả trong [docs/operations.md](../docs/operations.md).

<a id="feedback"></a>
## Giai đoạn đầu: hãy mở issue

ColTex còn non trẻ (0.0.x). Nó được dùng và kiểm thử hằng ngày, nhưng chưa phải mọi lỗi đều đã được phát hiện. Nếu có gì hỏng, trông sai hoặc khó dùng, hãy [mở một issue](https://github.com/Lewen-Cai/coltex/issues): mọi báo cáo đều có ích.

Một báo cáo hữu ích gồm phiên bản (`coltex version`), bạn đã làm gì và điều gì đã xảy ra, và nếu liên quan đến máy chủ thì gồm các dòng liên quan trong `coltex logs`. Vui lòng bỏ mật khẩu, khóa API và nội dung tài liệu riêng tư ra khỏi báo cáo.

<a id="development"></a>
## Phát triển

Node 24 trở lên, pnpm 11 và Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Đường dẫn | |
| --- | --- |
| `apps/web` | Ứng dụng web: React, CodeMirror 6, PDF.js |
| `apps/server` | API: Fastify, tài khoản, dự án, cộng tác thời gian thực, tác tử AI |
| `services/compiler` | Tiến trình biên dịch trong một container TeX Live |
| `packages/*` | Schema dùng chung, bộ phân tích nhật ký, hỗ trợ ngôn ngữ LaTeX, dữ liệu duyệt và chuyển đổi mẫu |

Thiết kế được mô tả trong [docs/architecture.md](../docs/architecture.md).

<a id="acknowledgements"></a>
## Lời cảm ơn

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex chuyển thể bộ phân tích nhật ký và các gợi ý, hỗ trợ ngôn ngữ LaTeX, trình soạn thảo trực quan, trình chỉnh sửa bảng, kiểm tra chính tả và đếm từ của Overleaf. Mọi tệp được chuyển thể đều được liệt kê trong [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): các nhà cung cấp mô hình và vòng lặp tác tử đứng sau tác tử AI.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): việc theo dõi tình trạng nhà cung cấp và tự động chọn mô hình được chuyển thể từ dự án này.
- [Yjs](https://github.com/yjs/yjs) và [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): logo của các nhà cung cấp. Nhãn hiệu thuộc về chủ sở hữu của chúng và chỉ dùng để nhận diện dịch vụ.

<a id="license"></a>
## Giấy phép

[AGPL-3.0](../LICENSE). Nếu bạn vận hành một bản ColTex đã sửa đổi cho người khác qua mạng, bạn phải cung cấp cho họ mã nguồn của bản đó. Mã của bên thứ ba giữ giấy phép riêng; xem [NOTICE](../NOTICE).
