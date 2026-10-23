# File

## Pohon file

- Tombol di bagian atasnya: file baru, folder baru, unggah, dan tambah file tertaut.
- Seret file ke sebuah folder untuk memindahkannya; klik dua kali sebuah nama untuk mengganti namanya. File yang dijatuhkan dari komputer Anda akan diunggah.
- Klik kanan file atau folder untuk membuat, mengunggah, mengganti nama, atau menghapus.
- Titik berwarna di samping file berarti orang lain sedang membukanya.

File yang dihapus dapat dikembalikan dari riwayat.

## File tertaut

File tertaut berasal dari tempat lain dan dapat disegarkan dari sumbernya kapan saja:

- **Dari proyek lain**: file apa pun dari proyek lain, atau PDF hasil kompilasinya (dikompilasi terlebih dahulu). Berguna untuk gambar bersama atau `.bib` bersama, atau untuk menggunakan PDF satu proyek sebagai gambar di proyek lain.
- **Dari URL**: diunduh dari alamat publik (maksimal 50 MB). Alamat di jaringan lokal atau privat tidak dapat digunakan.

> File tertaut memiliki tanda tautan di pohon file; arahkan kursor untuk melihat asalnya. Klik kanan lalu **Segarkan file tertaut** untuk mengambilnya lagi dan menggantinya. Menambahkan atau menyegarkan memerlukan akses Anda sendiri ke proyek sumber.

## Git

Setiap proyek dapat di-clone, di-pull, dan di-push dengan git:

1. Buat token di **Pengaturan → Layanan sinkronisasi** untuk Git (token hanya ditampilkan sekali; simpanlah). Token **Hanya baca** dapat melakukan clone dan pull, tetapi tidak push.
2. Salin alamat clone dari pengaturan proyek dan jalankan `git clone <address>`. Saat git meminta, gunakan nama pengguna apa saja dan token sebagai kata sandi.
3. Commit secara lokal lalu `git push`: perubahan langsung masuk ke proyek, tempat kolaborator melihatnya.

Perlu diketahui:

- Setiap proyek memiliki satu cabang, `main`.
- Jika seseorang mengubah proyek sejak pull terakhir Anda, git menolak push: jalankan `git pull` dulu, lalu push lagi.
- Sebelum push diterapkan, keadaan proyek disimpan sebagai versi.
- Peninjau dan pelihat tidak dapat melakukan push.
- Agar tidak perlu mengetik token setiap kali: `git config --global credential.helper store` (atau `osxkeychain` di Mac).
