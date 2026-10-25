# Pengaturan

Klik avatar Anda di kiri bawah dan pilih **Pengaturan**.

- **Akun**: nama tampilan Anda (ditampilkan kepada kolaborator, di komentar, dan di riwayat), warna avatar Anda (juga warna kursor Anda di editor; **Otomatis** adalah warna yang dipilih ColTex), dan kata sandi Anda. Mengubah kata sandi dapat mengeluarkan Anda dari perangkat lain. Kata sandi memerlukan 8 karakter atau lebih dengan huruf besar, huruf kecil, dan angka; simbol bersifat opsional. Penilaian yang ditampilkan saat mengetik (lemah, cukup, baik, kuat) naik seiring panjang dan simbol. Pendaftaran dan pengaturan ulang oleh admin mengikuti aturan yang sama. Email masuk Anda hanya dapat diubah oleh administrator. Verifikasi 2 langkah dan aktivitas masuk Anda juga ada di halaman ini (lihat di bawah).
- **Tampilan**: tema (Terang dan Gelap bernuansa biru, Hutan dan Lumut bernuansa hijau, Lavender dan Plum bernuansa ungu; bawaannya Terang), dan bahasa antarmuka (14 bahasa, di antaranya English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, dan Deutsch; awalnya mengikuti bahasa peramban Anda). Tema gelap juga berlaku untuk editor; halaman PDF tetap putih. Tema disimpan bersama akun Anda, sehingga ikut ke peramban lain (halaman masuk selalu menggunakan Terang); bahasa disimpan di peramban ini.
- **Layanan sinkronisasi**: hubungkan akun Zotero Anda (lihat [Referensi](#/help/references)), serta buat dan cabut token git (lihat [File](#/help/files)): masing-masing untuk Git, MCP, atau keduanya, baca dan tulis atau hanya baca, untuk semua proyek Anda atau sebagian, dengan masa berlaku. Gunakan satu token per komputer, agar Anda dapat mencabutnya secara terpisah.
- **Agen AI**: penggunaan AI Anda selama 7, 30, atau 90 hari terakhir (permintaan, token, biaya, per hari dan per model) dan sisa batas Anda (jika Anda memiliki agen AI), apa yang boleh diubah agen AI untuk Anda (**Izin**), dan menghubungkan agen AI Anda sendiri melalui **MCP**, beserta tokennya; lihat [Agen AI](#/help/ai).
- **Skill AI** (jika Anda memiliki agen AI): skill Anda sendiri, skill bawaan, dan obrolan dengan agen AI untuk menulis skill; lihat [Agen AI](#/help/ai).

## Verifikasi 2 langkah

Dengan verifikasi 2 langkah aktif, proses masuk meminta kode dari aplikasi autentikator di ponsel Anda (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…) setelah kata sandi. Ini pilihan Anda sendiri; tidak ada orang lain yang dapat mengaktifkannya untuk Anda.

1. Di **Pengaturan → Akun**, di bawah **Verifikasi 2 langkah**, klik **Aktifkan** dan masukkan kata sandi Anda.
2. Pindai kode QR dengan aplikasi (atau ketik kunci penyiapan ke dalamnya), lalu masukkan kode 6 digit yang ditampilkannya.
3. Simpan 10 **kode pemulihan** (salin, atau unduh sebagai file). Masing-masing dapat digunakan sekali untuk masuk sebagai pengganti kode, jika ponsel Anda hilang. Kode ini hanya ditampilkan sekarang.

Saat masuk, setelah kata sandi, masukkan kode dari aplikasi, atau klik **Gunakan kode pemulihan**. **Jangan tanya lagi di perangkat ini selama 30 hari** melewati kode di peramban itu. **Kode pemulihan baru** mengganti kode yang lama (simpan yang baru); **Matikan** kembali ke kata sandi saja. Token Git dan MCP tetap berfungsi seperti sebelumnya.

> Kehilangan ponsel sekaligus kode pemulihan? Administrator sistem dapat mematikan verifikasi 2 langkah untuk akun Anda di server (`coltex reset-2fa <email>`); setelah itu Anda masuk dengan kata sandi dan dapat mengaktifkannya lagi.

## Aktivitas masuk

**Aktivitas masuk** di bagian bawah **Pengaturan → Akun** mencantumkan proses masuk ke akun Anda, yang terbaru di atas: kapan, hasilnya (berhasil masuk, kata sandi salah, kode salah, ditolak), peramban dan sistem, serta alamat beserta lokasinya: jaringan lokal, Tailscale, atau untuk alamat di internet negara, wilayah, kota, dan operator jaringannya. Lokasi berasal dari basis data di server; alamat tidak pernah dikirim ke tempat lain untuk dicari. Catatan disimpan selama 90 hari.

Pengaturan editor (ukuran font, warna, Vim…) ada di **Pengaturan** di bagian bawah rel kiri editor; lihat [Editor](#/help/editor).
