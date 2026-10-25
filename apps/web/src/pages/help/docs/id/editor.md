# Editor

## Mode kode dan visual

**Kode / Visual** di bilah alat mengganti cara Anda menyunting; keduanya menyunting sumber LaTeX yang sama.

- **Kode**: sumbernya sendiri, dengan penyorotan sintaks, pelengkapan otomatis, dan pencocokan kurung. Dengan kursor di dalam matematika, persamaan yang sudah ditata ditampilkan di atasnya (`Esc` menyembunyikannya).
- **Visual**: judul, teks tebal, daftar, matematika, tabel, dan gambar tampak seperti hasil cetak; kode sumber ditampilkan di posisi kursor. Cocok untuk membaca dan menyunting teks.

## Bilah alat

Tingkat judul, tebal, miring, matematika, simbol, tautan, `\ref`, `\cite`, gambar, tabel, daftar, dan pencarian. Tombol yang tidak muat masuk ke menu **⋯**.

- **Simbol** (Σ): huruf Yunani, operator, panah, dan lainnya per kategori; klik untuk menyisipkan.
- **Tabel**: pilih ukurannya saat menyisipkan. Dalam mode visual, klik tabel untuk mengedit selnya (`Tab` berpindah antarsel); bilah alatnya menambah dan menghapus baris dan kolom, menggabungkan sel, serta mengatur perataan dan garis tepi.
- **Gambar**: unggah gambar, pilih dari proyek, atau tempel atau jatuhkan gambar ke editor. Dalam mode visual, tombol edit pada gambar mengubah lebar, keterangan, dan labelnya.

## Pelengkapan otomatis

Mengetik `\` menampilkan saran perintah; `\ref{` dan `\cite{` menampilkan label dan kunci bibliografi proyek. `Ctrl+Space` membuka saran kapan saja.

## Galat

- **Galat kompilasi**: galat dan peringatan dari kompilasi terakhir di file yang terbuka mendapat titik di samping nomor baris, dan galat digarisbawahi. Arahkan kursor untuk melihat pesan LaTeX dan penjelasannya.
- **Pemeriksaan kode**: memeriksa saat Anda mengetik, tanpa kompilasi: lingkungan yang tidak ditutup atau tidak cocok, `}` atau `$` yang tersesat, perintah matematika di luar matematika. Bagian yang sedang Anda ketik tidak ditandai. Apit sebuah bagian dengan `%%begin novalidate` dan `%%end novalidate` untuk melewatinya.

## Pemeriksaan ejaan

Kata yang salah eja mendapat garis bawah titik-titik merah (teks CJK tidak diperiksa). Klik kanan kata itu untuk melihat saran atau **Tambahkan ke kamus**. Bahasanya adalah pengaturan proyek.

Kamus Anda ada di **Pengaturan → Kamus** di bagian bawah rel editor; kata-katanya dianggap benar di semua proyek Anda. Ketik di kolom isian untuk mencari kata, dan tekan Enter untuk menambahkannya jika belum ada; huruf di atas daftar melompat ke huruf itu. Menu **⋯** mengimpor file teks (satu kata per baris, atau dipisahkan spasi atau koma; file Hunspell `.dic` juga bisa), mengekspor kata-kata Anda sebagai `dictionary.txt`, dan menghapus semuanya. Editor yang terbuka langsung memeriksa ulang kata-katanya.

## Menu klik kanan

Potong, salin, tempel, pilih semua, hapus, ke PDF, dan tambah komentar. Pada `\ref{…}` tersedia **Ke label**; pada `\input{…}` atau `\include{…}`, **Buka file**.

## Kerangka dan breadcrumb

- **Kerangka file** di bawah pohon file mencantumkan seksi-seksi file yang terbuka; klik salah satunya untuk menuju ke sana. Seksi tempat Anda berada disorot.
- Baris di atas editor menampilkan "file › seksi › subseksi" untuk posisi kursor; klik sebuah seksi untuk menuju ke sana. Baris ini dapat dimatikan di pengaturan editor.

## Pencarian

`Mod+F` (atau `Mod+Shift+F`, atau tombol pencarian di bilah alat) membuka panel **Cari** di kiri dengan teks yang dipilih sudah terisi. Pencarian mencakup seluruh proyek dengan kecocokan di file yang terbuka di urutan pertama, mendukung ekspresi reguler, pencocokan huruf besar/kecil dan seluruh kata, serta mengganti satu kecocokan atau semuanya. Sebuah versi disimpan sebelum mengganti semua.

## Pengaturan editor

**Pengaturan** di bagian bawah rel kiri mengelompokkan pengaturannya ke dalam kategori di sebelah kiri:

- **Proyek**: kompilator, dokumen utama, bahasa pemeriksaan ejaan (diubah oleh editor, untuk semua orang), dan alamat clone Git;
- **Tampilan**: ukuran font, font (monospace atau sans-serif), tinggi baris, **Warna kode** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark, dan lainnya, hanya mode kode), breadcrumb;
- **Penyuntingan**: pemetaan tombol (bawaan, Vim, atau Emacs) dan sakelar untuk pemeriksaan kode, pratinjau persamaan, tutup kurung otomatis, dan pelengkapan otomatis;
- **Pintasan keyboard**: lihat di bawah;
- **Tindakan**: jumlah kata, salin, ekspor ke Word, konversi templat, terbitkan sebagai templat.

Tampilan, penyuntingan, dan pintasan adalah milik Anda, disimpan di peramban ini, untuk setiap proyek.

## Pintasan keyboard

**Pintasan** di rel kiri mencantumkan semuanya. Yang paling sering digunakan:

| Tindakan | Tombol |
| --- | --- |
| Kompilasi | `Mod+S` atau `Mod+Enter` |
| Urungkan / ulangi | `Mod+Z` / `Mod+Shift+Z` |
| Cari dan ganti | `Mod+F` |
| Tebal / miring | `Mod+B` / `Mod+I` |
| Jadikan atau batalkan komentar baris | `Mod+/` |
| Ke baris | `Mod+Alt+G` |
| Komentari pilihan | `Mod+Alt+M` |
| Tampilkan saran | `Ctrl+Space` |

Tombol ditampilkan sesuai sistem Anda: ⌘, ⌥, dan ⇧ di Mac, Ctrl, Alt, dan Shift di Windows dan Linux. Ini adalah tombol bawaan.

### Pintasan Anda sendiri

Di **Pintasan keyboard** pada pengaturan, klik **Ubah** di samping sebuah perintah lalu tekan tombol baru. Tombol itu harus menyertakan Ctrl (⌘ di Mac) atau Alt; tombol yang sudah dipakai perintah lain, atau yang dicadangkan untuk peramban dan penyuntingan dasar (urungkan, salin, tempel, pilih semua…), tidak dapat digunakan. Atur ulang satu, atau semuanya. Petunjuk di bilah alat dan daftar pintasan kemudian menampilkan tombol Anda.
