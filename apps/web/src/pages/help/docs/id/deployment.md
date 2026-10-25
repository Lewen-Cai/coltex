# Penerapan dan jaringan

Dalam produksi, ColTex menggunakan satu port (3690 secara bawaan): halaman, API, kolaborasi langsung (WebSocket), dan notifikasi semuanya melewatinya. Apa pun yang meneruskan HTTP dan WebSocket dapat digunakan: komputer ini, LAN, Tailscale, Cloudflare Tunnel, atau server cloud. (3000 dan 5173 adalah port server pengembangan.)

## Instalasi

Di Linux atau macOS dengan Docker, cukup satu perintah:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

Jika unduhan terputus (`curl: (35) Recv failure: Connection reset by peer`, sering terjadi saat GitHub sulit dijangkau), jalankan perintahnya lagi.

Perintah ini menanyakan bahasa dan edisi TeX Live (tombol panah; opsi `--edition` dan `--lang` menjawabnya sebagai gantinya), memeriksa Docker (di Linux dapat memasangnya), mengambil ColTex ke `~/coltex`, menulis pengaturan, mengunduh image siap pakai (x86-64 dan ARM64) lalu menjalankannya, dan mencetak alamat yang dapat dibuka di mesin ini dan di jaringan Anda. Saat pertama kali dijalankan, TeX Live diunduh. Ada dua edisi:

| Edisi | Unduhan | Di disk (seluruh ColTex) | Ruang kosong yang diperlukan |
| --- | --- | --- | --- |
| **standard** (bawaan) | sekitar 3 GB | sekitar 12 GB | 20 GB |
| **full** (`--edition full`) | sekitar 8 GB | sekitar 23 GB | 35 GB |

Keduanya berisi TeX Live lengkap dan mengompilasi dengan sama, dan agen AI bekerja dengan keduanya. Edisi standard tidak menyertakan manual dan sumber paket; edisi full menambahkannya, dan agen AI juga dapat membaca manualnya. Dengan edisi standard, agen menjawab dari file paket dan pengetahuannya sendiri. Ganti kemudian dengan `coltex edition full` atau `coltex edition standard`.

Akses jarak jauh (Tailscale, Cloudflare Tunnel) diaktifkan setelah instalasi, di **Pengaturan → Jaringan** (lihat di bawah). Untuk instalasi lewat skrip, opsi juga dapat menyiapkannya saat instalasi:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --tailscale
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Lalu kelola dengan `coltex`:

| Perintah | Fungsinya |
| --- | --- |
| `coltex status` / `logs` | Status / log |
| `coltex edition [standard\|full]` | Tampilkan atau ganti edisi TeX Live (mengunduh image kompilator yang lain) |
| `coltex update` | Perbarui ke rilis terbaru (mengunduh image baru); data dan pengaturan tetap |
| `coltex stop` / `start` | Hentikan / jalankan |
| `coltex tailscale up` | Bergabung dengan tailnet Anda (mencetak tautan masuk dan kode QR) |
| `coltex cloudflare quick` | Alamat Cloudflare publik sementara |
| `coltex cloudflare token` | Terowongan Cloudflare dengan domain Anda sendiri (meminta token) |
| `coltex reset` | Hapus semuanya (akun, proyek, basis data) dan mulai lagi dari halaman penyiapan; Anda diminta mengetik `reset` terlebih dahulu |
| `coltex uninstall` | Hapus ColTex dari mesin ini: kontainer, basis data, data, image, perintah `coltex` beserta foldernya (Docker tetap ada); Anda diminta mengetik `uninstall` terlebih dahulu |

## Masuk dari alamat mana pun

Server menerima proses masuk yang dilakukan ke alamatnya sendiri: buka di `localhost`, IP LAN, alamat Tailscale, atau domain, tanpa perlu mendaftarkannya terlebih dahulu. Halaman di situs lain tidak dapat memasukkan siapa pun.

## Alamat yang digunakan tautan

Tautan undangan dan alamat clone Git ditawarkan satu per satu untuk setiap alamat tempat ColTex dapat dijangkau, masing-masing dengan tombol salinnya sendiri, sehingga Anda memilih yang dapat dibuka penerima:

- **LAN** atau **Tailscale**: alamat tempat Anda membuka ColTex (dikenali dari alamatnya);
- **Tailscale**, **Cloudflare**: alamat Tailscale bawaan atau Cloudflare Tunnel selama terhubung. Alamat ini muncul dan hilang bersamanya; tidak ada yang perlu diubah ketika salah satunya dimatikan;
- **Alamat publik**: `COLTEX_URL` server, jika diatur.

Tautan undangan yang tertunda tetap ada di daftar undangan sampai digunakan atau kedaluwarsa.

## Tailscale

ColTex memiliki Tailscale bawaan: ColTex dapat bergabung dengan tailnet Anda sebagai perangkat tersendiri (bernama `coltex` secara bawaan). Tidak ada yang perlu dipasang di server, dan ini berfungsi di server tanpa desktop.

1. Di **Pengaturan → Jaringan**, aktifkan Tailscale.
2. Pindai kode QR dengan ponsel, atau buka tautannya di perangkat mana pun, lalu masuk ke tailnet Anda. Halaman beralih ke Terhubung dengan sendirinya.
3. Aktifkan **Sajikan ColTex di tailnet**. Dengan MagicDNS dan HTTPS diaktifkan untuk tailnet, alamatnya `https://coltex.<your tailnet>.ts.net`, jika tidak `http://coltex.<your tailnet>.ts.net`.

Jika belum ada peramban yang dapat menjangkau halaman pengaturan, jalankan ini di server:

```sh
coltex tailscale up
```

Perintah ini mengaktifkan Tailscale, mencetak tautan masuk dan kode QR di terminal, menunggu proses masuk, lalu menyajikan ColTex di tailnet. `coltex tailscale status` menampilkan status, `coltex tailscale down` meninggalkan tailnet, `coltex tailscale off` mematikannya.

`TS_HOSTNAME` mengubah nama perangkat. Server menjalankan Tailscale sendiri: tanpa kontainer atau hak istimewa tambahan. Kunci perangkatnya disimpan di `data/tailscale` dan tidak termasuk dalam cadangan; setelah pemulihan, masuk lagi.

Jika server sudah menjalankan Tailscale sendiri, keduanya tidak saling mengganggu: Tailscale bawaan adalah perangkat tersendiri dan menggunakan jaringan userspace, sehingga tidak mengubah pengaturan jaringan server sama sekali. Anda juga tidak memerlukannya: buka ColTex di IP Tailscale atau nama MagicDNS server dengan `:3690`.

## Cloudflare Tunnel

ColTex juga memiliki Cloudflare Tunnel bawaan, hanya sebagai terowongan: orang tetap masuk dengan akun ColTex mereka; Cloudflare Access tidak diperlukan. Server tidak memerlukan port yang terbuka.

- **Terowongan cepat**: tanpa akun Cloudflare; Anda mendapat `https://<random>.trycloudflare.com`, yang berubah setiap kali dijalankan. Untuk mencoba-coba.
- **Domain saya sendiri**: dengan domain Anda di Cloudflare, buat terowongan di Zero Trust → Networks → Tunnels, salin perintah di bawah “Run the following command” (untuk sistem apa pun: Windows, macOS, Debian, Red Hat, atau Docker); ColTex mengambil token dari perintah itu; tambahkan nama host publik ke terowongan (mis. `tex.example.org`) dengan layanan `http://localhost:3690`.

Aktifkan dengan sakelar pada kartu Cloudflare Tunnel di **Pengaturan → Jaringan**, lalu pilih tautan sementara atau terowongan (yang tersimpan, atau yang baru dari perintah yang ditempel), atau di terminal dengan `coltex cloudflare quick` / `coltex cloudflare token`. Setelah terhubung, alamatnya muncul di tautan undangan dengan sendirinya. Token disimpan terenkripsi dan tidak pernah ditampilkan lagi.

Jika terowongan tidak dapat menjangkau Cloudflare melalui QUIC (firewall, atau proksi yang membuang UDP), ColTex otomatis mengalihkannya ke HTTP/2. Ketika trycloudflare.com membatasi tautan sementara (429 Too Many Requests), ColTex mencoba lagi dengan jeda yang makin lama. Saat Anda mengganti terowongan, pindahkan nama host publiknya ke terowongan baru di dasbor Cloudflare; sampai saat itu, nama host tersebut menjawab dengan Error 1033.

Jika server sudah menjalankan cloudflared untuk terowongannya sendiri, keduanya tidak berbenturan, tetapi jangan berikan token terowongan itu kepada ColTex: Cloudflare akan menganggap keduanya sebagai konektor dari terowongan yang sama dan membagi permintaan di antara keduanya, sehingga nama host lain milik server kadang-kadang sampai ke ColTex dan gagal (502). Tambahkan nama host publik untuk ColTex ke terowongan itu (layanan `http://localhost:3690`) dan biarkan yang bawaan mati, atau buat terowongan terpisah untuk ColTex.

## Pengaturan server

Ini adalah variabel lingkungan server. Dengan Docker, letakkan di file `.env` di samping `docker-compose.yml` lalu jalankan `docker compose up -d`.

| Variabel | Fungsinya |
| --- | --- |
| `COLTEX_PORT` | Port, 3690 secara bawaan |
| `COLTEX_URL` | Alamat publik yang ditawarkan di setiap tautan, mis. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Alamat lain yang diterima untuk masuk, dipisahkan koma. Hanya diperlukan ketika halaman dan API berada di alamat yang berbeda |
| `TRUST_PROXY` | Dengan proksi balik di depan (Caddy, Nginx): `uniquelocal` (proksi di jaringan privat) atau `true`. Jika tidak diatur, server menganggap proksi sebagai pengunjung: semua orang berbagi satu alamat, sehingga kegagalan masuk satu orang dihitung untuk semua orang, dan catatan masuk menampilkan alamat proksi. Tailscale dan Cloudflare Tunnel bawaan tidak memerlukan apa pun di sini |
| `TS_HOSTNAME` | Nama perangkat Tailscale bawaan, `coltex` secara bawaan |

**Cara permintaan masuk** di bagian bawah **Pengaturan → Jaringan** menampilkan pengaturan ini dan IP yang dilihat server, serta menunjukkan masalah.

## Penyiapan umum

| Penyiapan | Caranya |
| --- | --- |
| Hanya komputer ini | Bawaan: `http://localhost:3690` |
| LAN | Buka di alamat LAN server, mis. `http://192.168.1.20:3690`. Alamat LAN dapat berubah; cadangkan satu alamat di router untuk penggunaan jangka panjang |
| Tailscale | Lihat Tailscale di atas |
| Cloudflare Tunnel | Lihat Cloudflare Tunnel di atas |
| Server cloud | Dengan domain: pasang dengan `--domain tex.example.org` (arahkan DNS-nya ke server dan buka port 80 dan 443). Caddy yang disertakan mendapatkan sertifikat HTTPS; port 3690 kemudian hanya menjawab di server itu sendiri. Tanpa domain: Cloudflare Tunnel atau Tailscale |

## Keamanan

- Untuk kelompok kecil, menjangkau ColTex hanya melalui Tailscale atau VPN adalah cara paling sederhana: ColTex sama sekali tidak terlihat di internet. Dengan Cloudflare Tunnel, ColTex bersifat publik, dilindungi oleh proses masuk ColTex.
- Di internet, gunakan HTTPS (Caddy, seperti pada penyiapan server cloud).
- Firewall di server (ufw, firewalld) tidak menutup port yang dipublikasikan Docker. Dengan `--domain`, port 3690 hanya menjawab di server itu sendiri; jika menggunakan Tailscale atau terowongan Cloudflare, tutup port 3690 di firewall penyedia cloud Anda.
- Tidak ada pendaftaran publik, hanya undangan; kata sandi memiliki aturan kekuatan; setiap orang dapat mengaktifkan verifikasi 2 langkah. Kegagalan masuk akan diperlambat lalu mengunci akun untuk alamat yang tidak dikenal, dan alamat yang terus gagal diblokir selama sehari (lihat [Administrasi](#/help/admin)).
- Halaman ColTex memberi tahu peramban agar tidak menampilkannya di dalam situs lain (melawan clickjacking) dan hanya menjalankan skripnya sendiri; dengan `--domain`, Caddy juga memberi tahu peramban untuk hanya menggunakan HTTPS (HSTS).
- Port yang tidak lazim tidak menghentikan pemindai; jangan mengandalkannya.
