<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Editor LaTeX kolaboratif yang di-hosting sendiri, dengan agen AI bawaan.</strong><br>
  Server Anda · Akun Anda · Data Anda · Kolaborasi real-time · Sumber terbuka (AGPL-3.0)
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
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd><b>Bahasa Indonesia</b></kbd></a>
</p>
<p align="center">
  <a href="#install">Instalasi</a> · <a href="#configure">Konfigurasi</a> · <a href="../CHANGELOG.md">Catatan perubahan</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Rilis terbaru"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="Editor ColTex: file, sumber LaTeX, PDF hasil kompilasi, dan agen AI" width="900">
</p>

<a id="why"></a>
## Mengapa ColTex?

ColTex adalah alternatif Overleaf untuk kelompok riset, laboratorium, atau untuk Anda sendiri, yang berjalan di komputer yang Anda kendalikan: komputer desktop di lab, server rumahan, atau mesin cloud.

- **Semuanya tetap di server Anda.** Proyek, riwayat, akun, dan tugas kompilasi tidak pernah meninggalkannya. TeX berjalan di kontainer sandbox tanpa akses internet.
- **Dibuat untuk menulis bersama.** Beberapa orang menyunting file yang sama sekaligus, dengan komentar, lacak perubahan, obrolan, dan riwayat versi.
- **Agen AI yang bekerja pada proyek Anda.** Agen membaca file dan log kompilasi, membuat draf perubahan, mengompilasi uji, dan menampilkan diff kepada Anda. Tidak ada yang ditulis sampai Anda menerapkannya.
- **Satu perintah untuk instalasi, tanpa port yang perlu dibuka.** Tailscale dan Cloudflare Tunnel sudah tersedia bawaan untuk akses jarak jauh.

<a id="features"></a>
## Fitur

### Menulis dan mengompilasi
- Editor kode sumber (CodeMirror) dan editor visual dengan editor tabel dan dialog gambar dari Overleaf, bilah alat, palet simbol, kerangka, dan breadcrumb.
- Pelengkapan LaTeX, pemeriksaan kode, pratinjau persamaan, pemeriksaan ejaan dalam banyak bahasa, jumlah kata, cari dan ganti di seluruh proyek, serta tombol Vim atau Emacs.
- Kompilasi dengan latexmk di atas TeX Live lengkap. Mesinnya (pdfLaTeX, XeLaTeX, atau LuaLaTeX) dipilih berdasarkan dokumen, termasuk bahasa Tionghoa (ctex, xeCJK).
- Pratinjau PDF dengan SyncTeX dua arah, juga di jendela terpisah. Galat kompilasi digarisbawahi di kode sumber, dengan petunjuk dalam bahasa sehari-hari.
- Referensi: kutip dari file `.bib` Anda, cari di Crossref dan arXiv (atau tempel DOI atau ID arXiv) untuk menambahkan entri, atau impor pustaka atau koleksi Zotero dan jaga agar tetap tersinkron.

### Kolaborasi
- Penyuntingan real-time dengan kursor setiap orang, komentar dengan @sebutan, lacak perubahan (terima, tolak, dan urungkan keputusan), obrolan proyek, dan notifikasi di dalam aplikasi.
- Peran per proyek: pemilik, editor, peninjau (hanya saran), dan pelihat.
- Riwayat versi seperti git: versi otomatis, versi yang disimpan dengan pesan, dan pengurungan perubahan satu versi.
- Akses Git: clone proyek, kerjakan secara lokal, lalu push kembali (token pribadi; suntingan yang dibuat di peramban sementara itu digabungkan).

### Agen AI
- Tanyakan tentang LaTeX, proyek Anda, atau tulisan Anda, atau biarkan agen memperbaiki galat kompilasi. Agen membuat draf perubahan di salinan pribadi, mengompilasi uji, dan menampilkan diff; Anda menerapkan semuanya atau sebagian.
- Penerapan menyimpan versi terlebih dahulu lalu mengompilasi ulang; jika hasil kompilasi memburuk, perubahan dikembalikan secara otomatis.
- Penyedia: kunci API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter, dan lainnya), masuk dengan langganan (Claude Pro/Max, ChatGPT, GitHub Copilot, dan lainnya), atau server Anda sendiri yang kompatibel dengan OpenAI (Ollama, vLLM, LM Studio).
- Pemilihan model otomatis (model ringan atau kuat per pesan), akses per kelompok orang, penggunaan per orang, dan batas penggunaan per hari, minggu, atau bulan.
- Obrolan tersimpan per proyek, jendela konteks yang ditampilkan sepanjang jalan, dan `/compact` untuk meringkas obrolan yang panjang.
- Skill: instruksi Anda sendiri dan instruksi proyek (format Agent Skills) yang diikuti agen, digunakan dengan `/name`; tulis sendiri, impor, atau buat bersama AI di Pengaturan.
- Izin seperti di Claude Code: perubahan agen AI menunggu tinjauan Anda (Manual), diterapkan saat agen selesai (Otomatis), atau agen juga boleh menghapus dan memindahkan file (Akses penuh).
- Agen Anda sendiri (Claude Code, Codex, Cursor…) melalui MCP: satu alamat untuk semua proyek Anda, dengan izin yang sama (dalam mode Manual, suntingannya menjadi saran Anda).

### Proyek dan administrasi
- Templat untuk IEEE, ACM, Springer LNCS, Elsevier, REVTeX, dan arXiv, serta konversi makalah dari satu templat jurnal ke templat lain.
- Impor dan ekspor zip Overleaf, file yang ditautkan dari URL atau proyek lain, tag, arsip, dan sampah.
- Tanpa pendaftaran publik: akun berasal dari tautan undangan. Satu administrator sistem, dan admin yang masing-masing mengelola tim yang mereka undang.
- Pemantauan, cadangan WebDAV (opsional terenkripsi), penyimpanan lokal atau yang kompatibel dengan S3, tema terang dan gelap, serta antarmuka dalam 14 bahasa (Inggris, Tionghoa, Jepang, Korea, Spanyol, Prancis, Jerman, Portugis, Italia, Rusia, Turki, Vietnam, dan Indonesia).

<a id="install"></a>
## Instalasi

Anda memerlukan mesin Linux atau macOS dengan Docker (di Linux, penginstal dapat memasangnya), minimal 2 inti CPU dan memori 4 GB. Image sudah dibuat sebelumnya untuk x86-64 dan ARM64.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Jika unduhan terputus (`curl: (35) Recv failure: Connection reset by peer`, sering terjadi saat GitHub sulit dijangkau), jalankan perintahnya lagi.

Penginstal menanyakan bahasa dan edisi TeX Live (tombol panah), mengambil rilis terbaru ke `~/coltex`, mengunduh image siap pakai dengan bilah kemajuan, menjalankan ColTex, dan mencetak alamat yang dapat dibuka. Keluaran lengkapnya masuk ke `~/coltex/install.log`. Lalu buka `http://<server>:3690` dan buat akun administrator. Akses jarak jauh melalui Tailscale atau Cloudflare Tunnel diaktifkan setelahnya di **Pengaturan → Jaringan**.

Saat pertama kali dijalankan, TeX Live diunduh. Pilih edisi:

| Edisi | Unduhan | Disk (seluruh ColTex) | Ruang kosong yang diperlukan |
| --- | --- | --- | --- |
| **standard** (bawaan) | sekitar 3 GB | sekitar 12 GB | 20 GB |
| **full** (`--edition full`) | sekitar 8 GB | sekitar 23 GB | 35 GB |

Keduanya berisi semua paket TeX Live dan mengompilasi dokumen yang sama, dan agen AI bekerja dengan keduanya. Edisi standard tidak menyertakan manual paket; edisi full menambahkan manual dan sumber paket, yang juga dapat dibaca agen AI.

`--edition` dan `--lang` menjawab pertanyaan-pertanyaan itu, atau menggantikannya jika tidak ada terminal. `--domain`, `--tailscale`, dan opsi Cloudflare menyiapkan akses jarak jauh sekaligus saat instalasi, untuk instalasi lewat skrip. Tambahkan opsi setelah `bash -s --`:

| Opsi | |
| --- | --- |
| `--domain tex.example.org` | HTTPS untuk server dengan domainnya sendiri, melalui Caddy yang disertakan. Arahkan domain ke server dan buka port 80 dan 443 |
| `--tailscale` | Pasang ColTex di tailnet Anda: mencetak tautan masuk dan kode QR |
| `--cloudflare-token TOKEN` | Sambungkan terowongan Cloudflare yang Anda buat untuk domain Anda sendiri |
| `--cloudflare-quick` | Alamat `trycloudflare.com` publik sementara, untuk mencoba-coba |
| `--edition full` | Edisi TeX Live full |
| `--lang LANG` | Bahasa penginstal, `coltex`, dan halaman penyiapan: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi`, atau `id` (ditanyakan jika tidak diberikan) |
| `--port 3690` | Port lain |
| `--version v0.0.1` | Rilis tertentu (`main` untuk cabang pengembangan) |
| `--build` | Bangun image dari kode sumber di mesin ini alih-alih mengunduhnya |
| `--images REGISTRY` | Tempat mengunduh image: `aliyun` (image yang sama di Alibaba Cloud), `ghcr` (`ghcr.io/lewen-cai`), atau mirror ghcr.io lainnya. Tanpa opsi ini, penginstal memakai Alibaba Cloud di Tiongkok daratan dan ghcr.io di tempat lain (`registry-mirrors` milik Docker hanya berlaku untuk Docker Hub, bukan untuk ghcr.io) |

Di server yang dapat dijangkau dari internet, jangan masuk melalui `http://` biasa: gunakan `--domain`, Tailscale, atau terowongan Cloudflare.

### Mengelola dan memperbarui

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
## Konfigurasi

Semuanya diatur di peramban, di bawah **Pengaturan** pada menu pengguna:

1. **Kelola pengguna** dan **Undangan**: undang orang dengan tautan (masing-masing hanya berlaku sekali, opsional untuk satu email).
2. **Layanan AI**: hubungkan penyedia. Lalu, di **Penggunaan & akses AI**, masukkan orang ke grup yang boleh menggunakannya. Tanpa grup, tidak ada yang mendapat agen AI selain administrator sistem.
3. **Jaringan**: alamat tempat ColTex dapat dijangkau, serta Tailscale dan Cloudflare Tunnel.
4. **Penyimpanan & cadangan**: pencadangan harian atau mingguan ke folder WebDAV (Nextcloud, NAS…).

Dokumentasi bantuan sudah tersedia di dalam aplikasi: **Dokumentasi bantuan** di menu pengguna. Operasional server (variabel lingkungan, S3, memulihkan cadangan) ada di [docs/operations.md](../docs/operations.md) (bahasa Inggris).

<a id="feedback"></a>
## Masih tahap awal: silakan buka issue

ColTex masih muda (0.0.x). ColTex digunakan dan diuji setiap hari, tetapi belum semua masalah ditemukan. Jika ada yang rusak, tampak salah, atau sulit digunakan, silakan [buka issue](https://github.com/Lewen-Cai/coltex/issues): setiap laporan membantu.

Laporan yang berguna mencantumkan versi (`coltex version`), apa yang Anda lakukan dan apa yang terjadi, serta jika melibatkan server, baris-baris yang relevan dari `coltex logs`. Jangan sertakan kata sandi, kunci API, dan isi dokumen pribadi.

<a id="development"></a>
## Pengembangan

Node 24 atau lebih baru, pnpm 11, dan Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Path | |
| --- | --- |
| `apps/web` | Aplikasi web: React, CodeMirror 6, PDF.js |
| `apps/server` | API: Fastify, akun, proyek, kolaborasi real-time, agen AI |
| `services/compiler` | Worker kompilasi di kontainer TeX Live |
| `packages/*` | Skema bersama, pengurai log, dukungan bahasa LaTeX, data tinjauan, dan konversi templat |

Rancangannya dijelaskan di [docs/architecture.md](../docs/architecture.md) (bahasa Inggris).

<a id="acknowledgements"></a>
## Ucapan terima kasih

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex mem-port pengurai log dan petunjuknya, dukungan bahasa LaTeX, editor visual, editor tabel, pemeriksaan ejaan, dan penghitung kata. Setiap file yang di-port tercantum di [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): penyedia model dan loop agen di balik agen AI.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): pemantauan kesehatan penyedia dan pemilihan model otomatis diadaptasi darinya.
- [Yjs](https://github.com/yjs/yjs) dan [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): logo penyedia. Merek dagang adalah milik pemiliknya masing-masing dan hanya mengidentifikasi layanannya.

<a id="license"></a>
## Lisensi

[AGPL-3.0](../LICENSE). Jika Anda menjalankan ColTex yang telah dimodifikasi untuk orang lain melalui jaringan, Anda wajib menawarkan kode sumbernya kepada mereka. Kode pihak ketiga tetap memakai lisensinya sendiri; lihat [NOTICE](../NOTICE).
