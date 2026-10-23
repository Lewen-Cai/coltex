# Memulai

ColTex adalah editor LaTeX kolaboratif yang berjalan di server Anda sendiri. Cara kerjanya mirip Overleaf: kode sumber di kiri, PDF di kanan, dan beberapa orang dapat menyunting proyek yang sama sekaligus.

## Proyek baru

Klik **Proyek baru** di kiri atas, beri nama, lalu pilih templat:

| Templat | Kelas |
| --- | --- |
| Artikel kosong | `article` standar, awal yang paling sederhana |
| Pracetak arXiv | `article`, satu kolom, penulis dengan afiliasi (authblk), referensi natbib |
| Konferensi IEEE / Jurnal IEEE | `IEEEtran` dalam mode konferensi / jurnal |
| Konferensi ACM / Jurnal ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, untuk LNCS dan prosiding Springer lainnya |
| Jurnal Elsevier | `elsarticle`, pracetak satu kolom |
| APS (REVTeX 4.2) | `revtex4-2`, untuk jurnal Physical Review dan AIP |

Selain artikel kosong, setiap templat dilengkapi abstrak, kata kunci, persamaan, gambar, tabel, dan `references.bib`, dan dapat langsung dikompilasi apa adanya. Kelas-kelasnya adalah kelas resmi yang disertakan dalam TeX Live. Konferensi yang menerbitkan file gaya baru setiap tahun (NeurIPS, ICML) tidak ada di TeX Live: unggah file tahun itu ke sebuah proyek dan terbitkan sebagai templat.

Proyek yang diterbitkan orang sebagai templat (misalnya format tesis sebuah kelompok) tercantum di bawah "Dibagikan di server ini".

Proyek baru dikompilasi dengan **Otomatis**: mesin dipilih pada setiap kompilasi berdasarkan dokumennya; lihat [Kompilasi dan PDF](#/help/compiling).

Untuk memindahkan proyek dari Overleaf, pilih **Download Source** di sana lalu **Impor** file zip-nya di sini (maksimal 200 MB). Dokumen utama terdeteksi, dan kompilatornya juga Otomatis.

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
