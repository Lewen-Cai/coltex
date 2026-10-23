# Referensi

**Referensi** di rel kiri bekerja dengan file `.bib` proyek.

## Mengutip

**Sitasi** menampilkan setiap entri `.bib` di proyek; cari berdasarkan penulis, judul, tahun, atau kunci. Klik sebuah entri untuk menyisipkan `\cite{key}` di posisi kursor. Mengetik `\cite{` di editor juga memunculkan saran kunci.

## Mencari dan menambahkan

Di tab **Tambah**, ketik judul, penulis, atau kata kunci lalu tekan Enter: ColTex mencari di Crossref (jurnal, prosiding, buku) dan arXiv (pracetak) lalu menampilkan hasilnya, dengan kecocokan terbaik dari masing-masing sumber di urutan teratas. **+** menambahkan makalah ke file `.bib` yang dipilih di bawah kolom isian. Pracetak yang versi terbitnya diketahui arXiv ditambahkan dengan DOI versi terbit tersebut.

DOI (mis. `10.1145/3290605.3300857`), tautan doi.org, atau ID arXiv langsung ditambahkan, tanpa pencarian.

Entri diambil dari doi.org dan ditambahkan di akhir file dengan kunci yang unik; entri yang sudah ada di file (DOI yang sama) tidak ditambahkan dua kali. Periksa hasil yang diambil.

## Zotero

1. Di **Pengaturan → Layanan sinkronisasi**, masukkan kunci API Zotero (dibuat di pengaturan zotero.org Anda; akses baca sudah cukup). Kunci ini disimpan terenkripsi di server ini dan hanya digunakan untuk membaca pustaka Anda.
2. Di tab **Zotero** pada panel Referensi, pilih pustaka atau koleksi untuk diimpor sebagai file `.bib` di proyek.
3. **Segarkan dari Zotero** mengganti file itu dengan isi Zotero saat ini, jadi editlah entri di Zotero, bukan di file.

Penyegaran menggunakan koneksi Zotero milik orang yang mengimpor file tersebut.
