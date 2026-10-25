# Memulai

ColTex adalah editor LaTeX kolaboratif yang berjalan di server Anda sendiri. Cara kerjanya mirip Overleaf: kode sumber di kiri, PDF di kanan, dan beberapa orang dapat menyunting proyek yang sama sekaligus.

## Proyek baru

Klik **Proyek baru** di kiri atas, beri nama, lalu pilih templat:

| Bidang | Templat |
| --- | --- |
| Umum | Artikel kosong, Pracetak arXiv, Jurnal Elsevier, Jurnal Elsevier (penulis–tahun), Jurnal Elsevier (dua kolom), Jurnal Elsevier CAS (dua kolom), Nature, Artikel ulasan, Komunikasi singkat |
| Komputer dan teknik elektro | Konferensi IEEE, Jurnal IEEE, Konferensi IEEE Computer Society, Jurnal IEEE Computer Society, Jurnal IEEE Communications Society, Konferensi ACM, Jurnal ACM, Kiriman ACM (anonim), Konferensi ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Prosiding PMLR |
| Teknik | Konferensi ASME, Jurnal ASCE, Makalah konferensi AIAA, Prosiding SPIE |
| Fisika | APS (REVTeX 4.2), Physical Review Letters, Jurnal AIP, Journal of the Physical Society of Japan, Makalah konferensi JACoW |
| Astronomi | Jurnal AAS (AASTeX), Monthly Notices of the RAS |
| Kimia | Artikel jurnal ACS, Letter ACS |
| Ilmu hayati | Artikel penelitian ilmu hayati, Catatan aplikasi bioinformatika |
| Kedokteran | Laporan uji klinis, Protokol uji klinis, Studi observasional, Studi akurasi diagnostik, Tinjauan sistematis dan meta-analisis, Laporan kasus, Surat penelitian medis, Jurnal Elsevier CAS, Jurnal Oxford University Press |
| Matematika dan statistika | Artikel AMS, Prosiding AMS, Annals of Mathematics, Artikel metode statistik |
| Ekonomi | Makalah ekonomi (gaya AEA), Makalah ekonometrika |
| Ilmu sosial dan humaniora | Naskah APA 7, Tata letak jurnal APA 7, Makalah mahasiswa APA 7, Artikel humaniora (catatan Chicago), Esai sastra (MLA), Artikel hukum (OSCOLA) |
| Bumi dan lingkungan | Artikel geosains (gaya AGU), Studi lapangan ekologi, Jurnal Canadian Science Publishing |

Kecuali artikel kosong, setiap templat berisi abstrak, contoh bagian, dan `references.bib`, dan langsung bisa dikompilasi. Kelasnya adalah kelas resmi yang disertakan TeX Live. Banyak templat jurnal dan konferensi terkenal tidak disertakan; [Templat](#/help/templates) menjelaskan alasannya dan cara menambahkannya.

Tombol di atas templat menampilkan templat satu bidang. Templat yang dibagikan dengan Anda (misalnya format tesis sebuah grup) ada di daftar yang sama, dengan label siapa yang membagikannya; lihat [Templat](#/help/templates).

Proyek baru dikompilasi dengan **Otomatis**: mesin dipilih pada setiap kompilasi berdasarkan dokumennya; lihat [Kompilasi dan PDF](#/help/compiling).

Untuk memindahkan proyek dari Overleaf, pilih **Download Source** di sana lalu **Impor** file zip-nya di sini (maksimal 200 MB). Dokumen utama terdeteksi, dan kompilatornya juga Otomatis. Berkas kompilasi yang ditinggalkan editor lain (`.aux`, `.log`, `.synctex.gz`, dan sejenisnya) serta folder seperti `.vscode` dilewati, sama seperti di Overleaf; berkas `latexmkrc` dan `.bbl` tetap disimpan.

## Editor

- **Atas**: nama proyek, siapa yang sedang hadir, **Riwayat**, dan **Bagikan**.
- **Rel kiri**: mengganti panel kiri antara file, pencarian, referensi, tinjauan, obrolan, dan AI; pintasan keyboard dan pengaturan proyek ada di bagian bawahnya.
- **Tengah**: editor, dengan **Kode / Visual** di bilah alatnya.
- **Kanan**: PDF, dengan **Kompilasi ulang**, **Log**, tombol ke PDF, buka di jendela baru, dan unduh.

## Kompilasi dan PDF

- Klik **Kompilasi ulang** atau tekan `Mod+S` / `Mod+Enter`. Kompilasi otomatis aktif secara bawaan dan berjalan saat Anda berhenti mengetik.
- **Log** menampilkan jumlah galat; buka untuk melihat setiap galat beserta penjelasannya, dan klik salah satunya untuk melompat ke barisnya. Galat juga ditandai di samping nomor baris di editor.
- **Sumber ↔ PDF**: dengan kursor di kode sumber, klik ikon bidik di bilah PDF dan PDF akan bergulir ke tempat itu; klik dua kali PDF untuk kembali ke kode sumber.
- **PDF di jendelanya sendiri**: "Buka PDF di jendela baru" di bilah PDF memungkinkan Anda menaruh PDF di layar lain sementara editor memenuhi jendelanya. Lihat [Kompilasi dan PDF](#/help/compiling).

## Selanjutnya

- [Editor](#/help/editor): dua mode, tabel dan gambar, pratinjau persamaan, pemeriksaan ejaan, menu klik kanan.
- [Kolaborasi](#/help/collaboration): mengundang orang, komentar, lacak perubahan, obrolan.
- [Agen AI](#/help/ai): penjelasan dan suntingan, yang diterapkan hanya setelah Anda meninjaunya.
