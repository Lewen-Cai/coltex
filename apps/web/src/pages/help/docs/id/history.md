# Riwayat

**Riwayat** di bagian atas editor membuka tampilan riwayat. Cara kerjanya seperti git log: setiap versi memiliki ID pendek (seperti `a1b2c3d`), deskripsi, waktu pembuatan, dan siapa yang membuatnya.

- Versi dicatat secara otomatis setelah jeda dalam penyuntingan, beserta siapa yang membuat perubahan.
- **Simpan versi** mencatat keadaan saat ini sekarang juga, dengan deskripsi Anda (seperti pesan commit). Jika tidak ada yang berubah sejak versi terakhir, deskripsi itu menjadi label pada versi tersebut.
- Pilih sebuah versi untuk melihat file mana yang diubahnya dan bagaimana, atau bandingkan dengan proyek saat ini.
- **Batalkan perubahan ini** hanya mengurungkan apa yang diubah versi itu dan mempertahankan semua perubahan sesudahnya (seperti `git revert`). Jika sebuah file telah diubah lagi sejak itu dengan cara yang berbenturan, tidak ada yang diubah dan file tersebut disebutkan.
- **Pulihkan proyek** mengembalikan setiap file seperti pada versi itu; file yang ditambahkan sesudahnya dihapus. **Pulihkan file ini** melakukan hal yang sama untuk satu file.
- Pembatalan dan pemulihan menjadi versi tersendiri ("Membatalkan a1b2c3d", "Kembali ke a1b2c3d"; klik ID-nya untuk membuka versi itu), sehingga dapat diurungkan juga.
- **Tambah label** memberi nama pada sebuah versi (mis. "Diajukan") agar mudah ditemukan nanti.
- File dari versi mana pun dapat diunduh sebagai .zip.

> Sebuah versi juga disimpan sebelum perubahan AI diterapkan, sebelum penggantian di seluruh proyek, git push, pembatalan, dan pemulihan.
