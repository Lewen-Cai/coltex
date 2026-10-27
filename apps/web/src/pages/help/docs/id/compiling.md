# Kompilasi dan PDF

## Kompilator dan dokumen utama

Pengaturan proyek berisi **Kompilator** dan **Dokumen utama**:

- **Otomatis** (bawaan untuk proyek baru): dipilih pada setiap kompilasi berdasarkan dokumennya. XeLaTeX jika preambul (beserta file yang di-`\input` dan file `.sty`/`.cls` milik proyek) memuat `ctex`, `xeCJK`, `fontspec`, `unicode-math` dan sejenisnya, atau kelasnya `ctexart`/`ctexbook` dsb.; LuaLaTeX jika memuat `luacode` atau `luatexja`; selain itu pdfLaTeX. Baris pertama `% !TEX program = xelatex`, atau `latexmkrc` di proyek, yang menentukan sebagai gantinya.
- **pdfLaTeX**: pilihan umum untuk dokumen berbahasa Inggris.
- **XeLaTeX**: diperlukan untuk bahasa Tionghoa (ctex) dan font sistem.
- **LuaLaTeX**: juga mendukung font sistem.

Memilih sebuah mesin berarti mesin itu selalu digunakan, tanpa deteksi.

> Untuk bahasa Tionghoa, muat `\usepackage[UTF8]{ctex}` (atau gunakan kelas `ctexart`) dan Otomatis akan beralih ke XeLaTeX. Teks Tionghoa tanpa ctex gagal di pdfLaTeX dengan “Unicode character … not set up for use with LaTeX”.

Dokumen utama adalah file tempat kompilasi dimulai; pilih di **Dokumen utama** pada pengaturan proyek.

Kompilasi menggunakan TeX Live lengkap dengan latexmk, yang menjalankan LaTeX, BibTeX/Biber, dan indeks sesering yang diperlukan. Kompilasi berjalan terisolasi, tanpa akses jaringan, dan shell escape dibatasi.

## Opsi kompilasi

Panah di samping **Kompilasi ulang** berisi:

- **Kompilasi otomatis**: mengompilasi saat Anda berhenti mengetik (satu kompilasi per proyek pada satu waktu, berapa pun orang yang mengetik).
- **Mode kompilasi**: Normal atau Cepat [draf]. Mode draf tidak menyertakan gambar dan lebih cepat.
- **Penanganan galat kompilasi**: berhenti pada galat pertama, atau coba kompilasi meskipun ada galat.
- **Bersihkan dan kompilasi ulang**: jika hasil kompilasi tampak salah, hapus file bantu dan kompilasi dari awal.

Opsi ini disimpan per proyek di peramban ini.

## Log

Angka pada **Log** adalah jumlah galat. Log mencantumkan galat, peringatan, dan masalah penataan huruf:

- masing-masing dengan pesan LaTeX-nya, dan untuk masalah umum disertai penjelasan (paket yang hilang, misalnya, menyebutkan paket yang perlu ditambahkan);
- klik salah satunya untuk melompat ke file dan barisnya;
- log mentah juga tersedia, dan AI dapat menjelaskan atau memperbaiki galat.

> Ketika kompilasi gagal, PDF dari kompilasi terakhir yang berhasil tetap ditampilkan.

## Antara kode sumber dan PDF

- **Sumber → PDF**: dengan kursor di kode sumber, klik **Temukan** di bilah PDF (atau "Ke PDF" di menu klik kanan); PDF bergulir ke sana dan menyorotnya.
- **PDF → sumber**: klik dua kali PDF; editor membuka file di baris tersebut.
- **Tautan di PDF**: sitasi, rujukan ke gambar, tabel, persamaan dan bagian, serta daftar isi melompat ke tempatnya di PDF (dengan `hyperref`); alamat web terbuka di tab baru.

## Tata letak: editor, PDF, atau keduanya

Pengalih tampilan (empat tombol kecil di kanan bilah PDF) menampilkan **Hanya editor**, **Editor & PDF** berdampingan, atau **Hanya PDF**, seperti di Overleaf, dan tombol keempat membuka PDF di jendela baru; peramban ini mengingat pilihan Anda. Menyeret pembatas sepenuhnya ke satu sisi juga menyembunyikan panel itu.

- Saat hanya editor yang tampil, **Kompilasi ulang** dan pengalih yang sama ada di ujung bilah alat editor.
- **Ke PDF** dari editor menampilkan PDF ketika PDF tersembunyi.
- Di jendela yang sempit (tablet atau ponsel) hanya ada ruang untuk satu panel pada satu waktu, dan panel samping (file, pencarian…) menutupi editor selama terbuka.

## PDF di jendelanya sendiri

**Buka PDF di jendela baru** (tombol terakhir pengalih tampilan) membuka PDF di jendela terpisah yang dapat Anda pindahkan ke layar lain:

- Jendela editor melepas panel PDF-nya dan editor memenuhi jendela; **Kompilasi ulang** pindah ke ujung bilah alat editor.
- Jendela PDF berisi Kompilasi ulang, Log, ke PDF, dan unduh. Klik dua kali PDF-nya untuk melompat ke kode sumber di jendela editor.
- **Tampilkan PDF di sini** di bilah alat editor, atau menutup jendela itu, mengembalikan panel PDF.

## Unduhan

- Bilah PDF mengunduh PDF saat ini.
- Tombol unduh di bagian atas pohon file mengunduh file sumber proyek sebagai .zip.
- Di daftar proyek, menu proyek (⋯) berisi **Unduh PDF**, yang mengompilasinya terlebih dahulu, dan **Unduh .zip** untuk semua file sumbernya.

## Mengekspor ke Word

Beberapa jurnal hanya menerima file Word. **Ekspor ke Word…** di menu proyek (⋯) pada daftar proyek, atau di **Tindakan** pada pengaturan proyek, mengubah proyek menjadi .docx.

- Halaman judul diambil dari dokumen: judul, penulis, afiliasi, penulis korespondensi, abstrak, dan kata kunci, untuk kelas yang dibaca oleh konversi templat (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Rumus menjadi persamaan Word. Gambar dan tabel diberi nomor oleh Word, gambar PDF dan EPS diubah menjadi gambar biasa, dan persamaan bernomor tetap mempertahankan nomornya sehingga `\eqref` tetap merujuk ke sana.
- Tabel menjadi tabel Word yang dapat diedit, termasuk sel yang digabung. Daftar pustaka tetap di tempat bibliografi semula, di bawah judulnya (References, atau judul dari dokumen), dan sitasi tertaut ke entrinya.
- **Gaya sitasi**: **Sama seperti dokumen** mengikuti gaya bibliografi dokumen. Anda juga dapat memilih APA, Vancouver, AMA, IEEE, Nature, atau Chicago, atau file `.csl` yang diunggah ke proyek.
- **Templat Word**: unggah templat Word (`.docx`) dari jurnal ke proyek dan pilih di sini; dokumen akan memakai gayanya. Kolom ini muncul jika proyek memiliki file `.docx`.
- Periksa hasilnya sebelum mengirim: makro buatan sendiri dan tabel yang rumit mungkin perlu diperbaiki di Word. Gambar TikZ tidak dikonversi: kompilasi menjadi gambar terlebih dahulu dan sertakan gambar itu sebagai gantinya.
