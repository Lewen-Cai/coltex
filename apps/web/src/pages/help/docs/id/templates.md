# Templat

## Proyek baru dari templat

**Proyek baru** menampilkan satu daftar: templat bawaan dan templat yang dibagikan dengan Anda. Label pada masing-masing menunjukkan asalnya:

- **Bawaan**: disertakan dengan ColTex.
- **Dibagikan oleh administrator sistem**: untuk semua orang di server ini.
- **Dibagikan di** nama grup: dibagikan dengan grup yang Anda ikuti.
- **Dibagikan oleh** sebuah nama: dibagikan kepada Anda secara pribadi.
- **Hanya Anda**: templat yang Anda impor untuk diri sendiri.

Tombol di atas daftar (**Semua**, lalu bidang-bidang) menampilkan templat satu bidang. Anda hanya melihat templat yang dibagikan dengan Anda. Lihat juga [Memulai](#/help/getting-started).

Kolom pencarian di bawahnya menemukan templat menurut nama atau deskripsi.

## Menerbitkan proyek sebagai templat

Administrator bisa menerbitkan proyek miliknya sebagai templat, misalnya format tesis sebuah grup:

1. Di menu proyek (⋯) pada daftar proyek, atau di pengaturan proyek, pilih **Terbitkan sebagai templat…**.
2. Beri nama, deskripsi, dan **Bidang** (tempat ia tercantum), pilih siapa yang menerimanya di **Dibagikan dengan**, lalu klik **Terbitkan**.

Untuk siapa:

- Admin: grup yang ia ikuti dan orang yang ia pilih lewat nama atau email.
- Administrator sistem: juga **Semua orang di server ini**.
- Anggota tidak bisa menerbitkan templat; mintalah kepada administrator.

Perlu diketahui:

- Proyek baru darinya mendapat berkas proyek seperti **pada saat itu**, kompilernya, dan bahasa pemeriksa ejaannya; bukan anggota, riwayat, atau komentarnya.
- Templat mengikuti proyeknya: ubah proyeknya, dan proyek baru berikutnya mendapat perubahan itu.
- Buka lagi **Terbitkan sebagai templat…** untuk mengubah nama, bidang, atau penerimanya, atau untuk **Batalkan penerbitan**. Administrator sistem juga bisa menghapus templat apa pun di dialog proyek baru.
- Templat hilang saat proyeknya dihapus.

## Mengimpor templat jurnal

Banyak jurnal dan konferensi menerbitkan templat LaTeX yang tidak disertakan di ColTex: lisensinya tidak mengizinkan penyebaran ulang, atau templat itu bukan bagian dari TeX Live. Di antaranya NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Unduh templat resmi dari situs konferensi atau penerbit, lalu impor sebagai templat:

1. Klik **Proyek baru**, lalu **Impor templat**.
2. Pilih zip, beri nama, deskripsi, dan **Bidang**, lalu klik **Impor**. Templat hanya untuk Anda kecuali Anda menyalakan **Bagikan dengan orang lain** (admin) dan memilih penerimanya.

Perlu diketahui:

- Berbagi mengikuti aturan penerbitan (di atas): admin berbagi dengan grup mereka dan orang yang dipilih, administrator sistem juga dengan semua orang. Templat yang hanya untuk Anda berlabel **Hanya Anda**.
- Mengimpor tidak menambah proyek di ruang kerja Anda: templat menyimpan berkasnya sendiri. Dokumen utamanya ditemukan seperti saat mengimpor proyek; berkas build dan sampah sistem dibuang.
- Menu ⋯ templat berisi **Edit berkas**, **Edit templat…** (mengganti nama, mengubah penerima, atau membatalkan penerbitan; setelah dibatalkan, berkasnya menjadi proyek Anda) dan **Hapus templat**, yang menghapus berkasnya.

## Mengonversi ke templat jurnal

**Konversi ke templat…** di menu proyek (di pengaturan proyek: "Konversi ke templat jurnal") menulis ulang makalah untuk jurnal atau konferensi lain: IEEE Transactions, IEEE Conference, ACM Conference, ACM Journal, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS, atau artikel polos. Setiap templat bawaan dapat dikonversi ke salah satu dari ini.

Daftarnya sama dengan di **Proyek baru**. Templat bawaan ditulis dengan aturan yang dimiliki ColTex untuknya; templat lain (templat yang dibagikan, salah satu proyek Anda lewat **Salah satu proyek saya**, atau zip dari jurnal lewat **Unggah templat (.zip)**) diisi dengan caranya sendiri: judul, penulis, afiliasi, abstrak, dan kata kunci makalah ditaruh di tempat contoh templat, dan teks contoh sesudahnya diganti dengan makalah Anda. Berkas kelas dan gaya templat ikut disertakan, dan berkas utama contohnya tetap di proyek sebagai rujukan.

- Judul, penulis, afiliasi, abstrak, paket, dan bibliografi dibangun ulang dalam **proyek baru**, yang kemudian dikompilasi. Proyek asli tetap seperti semula.
- Makalah yang ditulis dengan templat `sn-jnl` dari Springer Nature juga dibaca, begitu pula templat BMC, OUP, dan Elsevier CAS: penulis dengan nama depan dan nama belakang, afiliasi, `\abstract{}` dan abstrak terstruktur, kata kunci, serta bagian akhir berisi pernyataan.
- Laporan mencantumkan apa yang diubah dan apa yang perlu diperiksa. Jika kompilasi ada galat atau laporan ada peringatan, **Buka dan perbaiki dengan AI** membuka proyek baru dengan agen AI mengikuti Skill bawaan **template-conversion**: pertama ia menanyakan jurnal atau konferensi tujuan Anda, mencari pedoman penulis terbarunya, membuat makalah dapat dikompilasi, lalu menyesuaikannya dengan pedoman tanpa mengubah isinya. Perubahannya menunggu tinjauan Anda.
