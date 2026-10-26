# Administrasi

Administrator sistem melihat halaman Administrasi di bawah **Pengaturan** pada menu avatar; admin melihat **Kelola pengguna** dan **Undangan** di sana, untuk tim mereka sendiri.

## Pengguna dan undangan

- Tidak ada pendaftaran publik: akun hanya berasal dari tautan undangan, dan proyek hanya dibagikan dengan orang yang memiliki akun.
- Akun memiliki salah satu dari tiga peran:
  - **Anggota**.
  - **Admin**: memimpin sebuah **tim**, misalnya seorang pembimbing dan mahasiswanya. Anggota yang diundang admin bergabung ke tim admin itu, dan admin hanya mengelola mereka.
  - **Admin sistem**: hanya ada satu, yaitu akun yang dibuat saat penyiapan pertama. Akun ini menjalankan seluruh instans (layanan AI, cadangan, jaringan) dan melihat semua orang. Tidak ada yang dapat dijadikan admin sistem kedua, sehingga satu akun admin tidak dapat mengambil alih instans.
- **Undangan**: tautan sekali pakai, untuk satu email atau (jika email dikosongkan) untuk siapa pun yang memiliki tautan, dengan masa berlaku. Tautan undangan yang tertunda tetap ada di daftar (**Tautan**), satu untuk setiap alamat tempat ColTex dapat dijangkau (LAN, Tailscale, Cloudflare). Admin sistem mengundang anggota atau admin dan memilih **Grup AI** untuk akun baru. Admin hanya mengundang anggota, ke dalam tim mereka sendiri; anggota tersebut mendapat grup AI admin itu. Admin hanya melihat dan mencabut undangan mereka sendiri.
- **Kelola pengguna**: admin sistem melihat setiap akun, menjadikan orang anggota atau admin, memindahkan anggota antartim (**Tim** di menu baris), mengatur ulang kata sandi, membuka **Catatan masuk dan perangkat**, serta menangguhkan atau menghapus akun. Daftar menandai akun yang **Dikunci** dan akun dengan verifikasi **2 langkah** aktif. Seorang admin melihat dirinya sendiri dan timnya, dan hanya mengatur ulang kata sandi, menangguhkan, atau menghapus anggota timnya. Menghapus akun akan menghapus proyek miliknya.
- Untuk menyerahkan peran admin sistem kepada orang lain (atau mendapatkannya kembali jika akun itu hilang), jalankan `coltex cli system-admin <email>` di server; admin sistem sebelumnya menjadi admin.
- Lupa kata sandi, termasuk kata sandi admin sistem? Jalankan `coltex cli reset-password <email>` di server: perintah ini meminta kata sandi baru dua kali dan mengeluarkan akun itu dari semua perangkat. Pemilik akun menerima notifikasi tentang hal ini, dan log server (`coltex logs`) mencatatnya.
- Kehilangan ponsel untuk verifikasi 2 langkah sekaligus kode pemulihannya? `coltex reset-2fa <email>` mematikannya untuk akun itu (dengan notifikasi kepada pemiliknya dan satu baris di log server).

## Catatan masuk

Hanya admin sistem yang melihat **Catatan masuk**: setiap proses masuk ke instans (juga percobaan dengan email yang tidak memiliki akun), beserta hasilnya, peramban dan sistem, serta alamat beserta lokasinya. Klik seseorang (atau gunakan **Catatan masuk dan perangkat** di Kelola pengguna) untuk melihat proses masuknya dan perangkat tempat ia sedang masuk; **Keluar** mengakhiri sesi satu perangkat, **Keluar dari semua perangkat** mengakhiri semuanya. Orang lain hanya melihat catatannya sendiri, di **Pengaturan → Akun**.

ColTex melindungi proses masuk dengan sendirinya, tanpa layanan luar. Sebuah alamat dianggap dikenal untuk suatu akun jika akun itu pernah masuk dari alamat tersebut dalam 90 hari terakhir.

- Dari alamat yang tidak dikenal, kegagalan dihitung per akun, apa pun alamatnya: mulai percobaan ketiga, peramban terlebih dahulu menyelesaikan teka-teki kecil (proof of work, sekitar satu detik, otomatis); setelah 5 kegagalan, harus menunggu 15 menit; setelah 10, akun **dikunci** untuk alamat yang tidak dikenal. Admin sistem menerima notifikasi dan membukanya di sini atau di Kelola pengguna (**Buka kunci**).
- Dari alamat yang dikenal, setiap 5 kegagalan berarti menunggu 15 menit, dan alamat itu tidak pernah dikunci: pemilik tetap dapat masuk dari tempat ia biasa bekerja selama akunnya dikunci.
- Alamat di internet yang gagal 20 kali dalam satu jam, dengan akun apa pun, diblokir selama sehari; alamat yang diblokir tercantum di bagian atas **Catatan masuk** dengan **Buka blokir**. Alamat di jaringan lokal atau di tailnet tidak pernah diblokir: beberapa orang dapat berbagi satu alamat.

Anda sendiri terkunci? Jalankan `coltex unlock <email>` (atau `coltex unlock <address>` untuk alamat yang diblokir) di server.

## Layanan AI

- **Layanan AI**: hubungkan penyedia dengan kunci API atau masuk dengan langganan (Claude Pro/Max, ChatGPT, Copilot…), atau server Anda sendiri yang kompatibel dengan OpenAI (Ollama, vLLM, LM Studio…). Kunci disimpan terenkripsi, anggota tidak pernah melihatnya, dan permintaan melewati server ini.
- Jika proses masuk dengan langganan berakhir di alamat localhost yang tidak dapat dimuat, salin alamat lengkap itu dari bilah alamat kembali ke ColTex.
- Atur tiga model untuk **Otomatis** dan semua orang mulai dengan pemilihan otomatis: model **penilai** (model murah dan cepat) membaca setiap pesan dan menyerahkannya ke model **ringan** (pertanyaan cepat, perbaikan kecil) atau model **kuat** (beberapa galat, perubahan di banyak file, penulisan yang cermat). Sampai ketiganya diatur, orang mulai dengan model pertama yang boleh mereka gunakan.
- **Pencarian web**: model Anthropic, OpenAI, dan ChatGPT mencari dengan pencarian bawaannya sendiri, tanpa perlu disiapkan. Untuk model lain, **hubungkan** sebuah layanan pencarian (DeepSeek, Tavily, Exa, atau Brave Search) dan tempel kunci API-nya; DeepSeek juga bisa memakai kunci penyedia DeepSeek yang terhubung. **Uji** di menunya menjalankan satu pencarian. Sebagian akun harus mengizinkan pencarian bawaan di penyedia terlebih dahulu: jika permintaan gagal, matikan di menu penyedia itu, dan modelnya akan memakai layanan pencarian. Semua orang yang memiliki agen AI dapat memakai web, dan selama bisa, perubahan agen AI selalu menunggu tinjauan.
- **Penggunaan & akses AI**: permintaan dan token untuk seluruh kelompok dan per orang. Siapa yang boleh menggunakan model mana diatur dengan **Grup AI**: setiap grup mengizinkan penyedia (termasuk model yang ditambahkan kemudian) atau model tertentu, mis. "Mahasiswa doktoral" dengan model kuat dan "Mahasiswa sarjana" dengan model ringan. Setiap orang berada di paling banyak satu grup, yang dipilih di undangan atau kemudian dengan membuka orang itu di daftar. Orang yang tidak berada di grup mana pun tidak dapat menggunakan agen AI, jadi orang baru tidak memiliki AI sampai admin sistem menambahkan mereka (anggota yang diundang admin mendapat grup admin itu). Admin sistem selalu dapat menggunakan setiap model. Menghapus grup membuat anggotanya tanpa AI sampai mereka bergabung dengan grup lain.

  Sebuah grup juga dapat membatasi berapa banyak yang digunakan setiap anggotanya per hari, minggu, atau bulan: token, biaya (dengan harga daftar), atau keduanya. Pesan ditolak begitu seorang anggota mencapai batasnya, sampai periode berikutnya dimulai (hari kalender, minggu mulai Senin, bulan, dalam zona waktu server); pesan yang melampaui batas tetap diselesaikan. Anggota melihat penggunaan mereka di bawah kotak pesan agen AI. Admin sistem tidak memiliki batas.

  Untuk menyesuaikan satu orang, buka orang itu di daftar: di bawah **Sesuaikan**, **Akses model tersendiri** dan **Batas penggunaan tersendiri** menggantikan pengaturan grupnya selama diaktifkan (akses tersendiri juga berfungsi tanpa grup). Daftar menandai mereka dengan **Disesuaikan**.

## Penyimpanan dan cadangan

- File proyek disimpan di disk lokal atau di penyimpanan yang kompatibel dengan S3, diatur saat server dimulai (`STORAGE` dan `S3_*`). Riwayat, keluaran kompilasi, dan salinan kerja kompilator tetap berada di direktori data.
- **Cadangan WebDAV** disimpan ke folder di Nextcloud, ownCloud, NAS, atau server WebDAV mana pun. Setiap cadangan adalah satu file berisi basis data, file setiap proyek, dan riwayatnya. Jadwalkan setiap hari atau setiap minggu dan pilih berapa banyak yang disimpan. Gunakan kata sandi aplikasi jika server menyediakannya.
> **Enkripsi**: cadangan terenkripsi (AES-256) juga berisi rahasia instans, sehingga layanan AI yang terhubung dan verifikasi 2 langkah tetap berfungsi setelah pemulihan. **Simpan kata sandi ini di tempat lain: tanpanya cadangan tidak dapat dibuka.** Jika dipulihkan dari cadangan tanpa enkripsi di server baru (dengan rahasia instans baru), orang dengan verifikasi 2 langkah tidak dapat masuk sampai Anda menjalankan `coltex reset-2fa <email>` untuk mereka.
- Pemulihan dilakukan di server dengan perintah `restore` saat server dihentikan; lihat panduan operasional.

## Pemantauan

**Ringkasan** menampilkan keadaan langsung server, kompilator, dan basis data, dengan grafik riwayat untuk CPU, memori, dan kompilasi. Server mengambil sampel setiap 10 detik dan menyimpannya selama 30 hari, juga saat tidak ada yang membuka halaman ini.

## Jaringan

**Jaringan** mencantumkan alamat tempat ColTex dapat dijangkau (undangan dan alamat Git menggunakannya), mengaktifkan Tailscale dan Cloudflare Tunnel bawaan, dan menampilkan bagaimana permintaan sampai ke server. Lihat [Penerapan dan jaringan](#/help/deployment).
