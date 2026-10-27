# Agen AI

**AI** di rel kiri membuka agen AI. Agen ini tersedia setelah administrator menghubungkan layanan model dan menambahkan Anda ke sebuah grup AI; grup itu menentukan model mana yang boleh Anda gunakan.

## Apa yang dilakukannya

- Menjawab pertanyaan LaTeX dan menjelaskan kode yang dipilih.
- Menjelaskan atau memperbaiki galat kompilasi (log juga memiliki tombol "Perbaiki dengan AI").
- Menulis ulang, memoles, atau menerjemahkan bagian yang dipilih.
- Memberikan gambaran umum proyek, menemukan label yang tidak pernah dirujuk, dan sebagainya.
- Melihat halaman PDF untuk memeriksa tata letak, seperti gambar dan tabel di kolomnya atau persamaan yang melewati batas (dengan model yang dapat melihat gambar).

File yang terbuka, bagian yang dipilih, dan galat kompilasi terbaru dilampirkan ke pesan Anda; klik sebuah lampiran untuk tidak menyertakannya.

## Izin

Apa yang boleh diubah agen AI terserah Anda: pilih di **Pengaturan → Agen AI**, atau di pemilih model di bagian bawah panel (di bawah tingkat penalaran); baris di bawah kotak pesan menampilkannya. Pilihan yang sama berlaku untuk agen Anda sendiri yang terhubung melalui MCP (lihat di bawah).

- **Manual** (bawaan): perubahan agen AI masuk ke draf, dan tidak ada yang berubah sampai Anda menerapkannya.
  1. Setelah selesai, draf dikompilasi uji dan Anda diberi tahu apakah draf itu menambah galat.
  2. **Tinjau perubahan** menampilkan diff per file; Anda dapat menerapkan sebagian saja.
  3. **Terapkan yang dipilih** menulis perubahan ke proyek dan mengompilasinya; jika hasil kompilasi memburuk, perubahan dikembalikan. Sebuah versi disimpan sebelum penerapan.
  4. Setelah penerapan, **Urungkan** membatalkan perubahan dan mempertahankan suntingan yang dibuat orang lain sementara itu.
- **Otomatis**: draf diterapkan begitu agen AI selesai menjawab, dengan pengaman yang sama: sebuah versi disimpan terlebih dahulu, proyek dikompilasi, hasil kompilasi yang memburuk dikembalikan, dan **Urungkan** tersedia sesudahnya. Jika seseorang mengubah baris yang sama sementara itu, tidak ada yang diterapkan dan draf menunggu Anda. Saat Anda menghentikan agen AI, drafnya juga menunggu Anda.
- **Akses penuh**: seperti Otomatis, dan agen AI juga dapat menghapus, memindahkan, dan mengganti nama file. Tindakan ini langsung dilakukan, tidak masuk ke draf; sebuah versi disimpan sebelum tindakan pertama dalam setiap jawaban. Jawaban mencantumkannya bersama file yang diubah.

Pelihat dan peninjau dapat bertanya kepada agen AI, tetapi agen itu tidak dapat mengubah apa pun untuk mereka.

## Web

Setelah pencarian web disiapkan, agen AI dapat mencari di web dan membaca halaman web: pedoman penulis terbaru sebuah jurnal, catatan rilis sebuah paket, sumber untuk memeriksa suatu klaim. Model Anthropic, OpenAI, dan ChatGPT memakai pencarian bawaannya sendiri; model lain memakai layanan pencarian yang dihubungkan administrator. Pencarian dan halaman yang dibacanya tampil sebagai langkah dalam percakapan, dan ia menyebutkan halaman mana yang menjadi dasar jawabannya.

Agar tidak ada isi proyek Anda yang keluar lewat jalan ini:
- Pencarian hanya dikirim ke layanan pencarian yang dipilih administrator (atau pencarian bawaan model), paling panjang 128 karakter.
- Ia hanya membaca alamat yang Anda tulis di percakapan atau yang dikembalikan pencariannya, persis seperti itu; ia tidak dapat mengarang alamat.
- Ia hanya membaca: tidak ada yang diunggah atau dikirim.

Halaman web dapat ditulis siapa saja dan bisa berisi instruksi untuk menyesatkan agen AI. Karena itu, selama Anda bisa memakai web, perubahan agen AI selalu menunggu tinjauan Anda, meskipun dengan **Otomatis** atau **Akses penuh**, dan ia tidak menghapus atau memindahkan file. Alat AI Anda (MCP) tetap mengikuti izin Anda.

## Model dan penalaran

- Pilih model di bagian bawah panel. Dengan **Otomatis**, ColTex memilih model ringan atau kuat tergantung pertanyaannya.
- Untuk model yang dapat bernalar, tingkatnya diatur di pemilih yang sama; baris di bawah kotak pesan menampilkannya.

## Obrolan dan konteks

- Percakapan disimpan untuk Anda, per proyek (orang lain tidak pernah melihatnya). **Obrolan baru** memulai obrolan lain; **Obrolan** mencantumkan obrolan sebelumnya: buka, ganti nama, atau hapus. Membuka kembali sebuah obrolan melanjutkannya dari tempat terakhir; draf yang belum diterapkan tidak disimpan, jadi berpindah dari obrolan yang memiliki draf akan meminta konfirmasi terlebih dahulu.
- Cincin di bawah kotak pesan menunjukkan seberapa banyak jendela konteks model yang dipakai obrolan (mis. `12k / 200k`). Warnanya menjadi kuning di 70% dan merah di 90%.
- Jika grup AI Anda memiliki batas penggunaan, bilah di sampingnya menunjukkan penggunaan Anda hari, minggu, atau bulan ini (arahkan kursor untuk detail). Setelah batas tercapai, pesan menunggu sampai periode berikutnya. **Pengaturan → Agen AI** menampilkan penggunaan Anda selama 30 hari terakhir dan sisanya.
- Ketik `/` di kotak pesan untuk perintah:
  - `/compact`: meringkas obrolan sejauh ini dan melanjutkan dari ringkasan itu, sehingga konteks menjadi lega. Pesan-pesan tetap terlihat; agen AI mengingatnya melalui ringkasan.
  - `/new`: memulai obrolan baru.
  - `/chats`: obrolan sebelumnya.
- Kotak pesan membesar mengikuti yang Anda ketik. Seret tepi atasnya agar lebih tinggi (diingat di peramban ini, juga di obrolan proyek); klik dua kali tepi itu untuk kembali.

## Skill

Skill adalah sekumpulan instruksi untuk tugas yang Anda lakukan berulang kali, misalnya "persingkat abstrak sesuai batas jurnal" atau "periksa bahwa setiap gambar dirujuk". Skill menggunakan format Agent Skills (sebuah `SKILL.md` dengan nama, deskripsi, dan instruksi), sehingga skill yang ditulis untuk agen AI lain juga berfungsi di sini.

- **Skill Anda** ada di **Pengaturan → Skill AI**; hanya Anda yang melihatnya, dan Anda dapat menggunakannya di setiap proyek.
- Tambahkan skill yang sudah Anda miliki dengan **Impor**: **Unggah file** menerima `SKILL.md` beserta file referensinya, atau `.zip` berisi folder skill; **Unggah folder** menerima folder sebuah skill, atau folder yang berisi beberapa skill. Skrip dalam skill disimpan sebagai teks yang dapat dibaca agen AI; tidak ada isi skill yang pernah dijalankan.
- Gunakan dengan mengetik `/` lalu memilihnya, kemudian tambahkan pesan Anda (`/polish-abstract keep it under 200 words`). Agen AI juga membaca deskripsinya dan memuat skill sendiri ketika permintaan Anda cocok dengannya.
- Minta agen AI menjadikan sesuatu sebuah skill ("simpan cara kita memperbaiki bibliografi tadi sebagai skill"): agen membuat drafnya di obrolan, lalu Anda mengeditnya atau menyimpannya ke skill Anda.
- Di **Pengaturan → Skill AI**, skill Anda tercantum di sebelah kiri; pilih salah satunya untuk membaca instruksi dan file referensinya, atau **Buat dengan AI** untuk membuka obrolan dengan agen AI guna menulis skill (**Perbaiki di obrolan** pada salah satu skill Anda memulai pesan tentang skill itu). Obrolan ini mengikuti skill bawaan **skill-creator**: agen menanyakan bagaimana Anda akan menggunakan skill itu, membuat drafnya (dengan file referensi jika membantu), dan dapat mencoba draf pada teks yang Anda tempel. Draf hanya disimpan ketika Anda menyimpannya; menyimpan dengan nama yang sudah Anda gunakan akan meminta konfirmasi sebelum mengganti. Obrolan disimpan sampai Anda memulai yang baru.
- ColTex dilengkapi skill bawaan (tercantum di bawah **Bawaan**). Anda dapat membaca dan mengunduhnya tetapi tidak dapat mengubahnya; skill Anda sendiri dengan nama yang sama akan digunakan sebagai gantinya.
  - **skill-creator**: menulis skill (obrolan skill mengikutinya).
  - **template-conversion**: menyelesaikan konversi templat: menanyakan jurnal atau konferensi, mencari pedoman penulisnya, dan menyesuaikan makalah (**Buka dan perbaiki dengan AI** setelah konversi memulainya).

## Alat AI Anda sendiri (MCP)

Alat AI seperti Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline, atau OpenCode dapat langsung bekerja pada proyek Anda: mencantumkannya, membaca dan mencari filenya, mengeditnya, mengompilasi dan membaca log, melihat riwayat, serta membaca, menambah, dan menjawab komentar. ColTex adalah server MCP untuk alat-alat itu, dengan satu alamat untuk semua proyek Anda; alat tersebut menyebutkan proyek yang dikerjakannya.

Di **Pengaturan → Agen AI**, di bawah **Alat AI Anda (MCP)**, pilih alat Anda di sebelah kiri dan ikuti tiga langkahnya: alamat, token (**Buat token**; hanya ditampilkan sekali), dan konfigurasi untuk disalin, dengan keduanya sudah terisi. Alat lain apa pun yang terhubung ke server MCP melalui HTTP dengan header untuk token juga berfungsi (**Lainnya**). Aplikasi yang hanya menerima server yang masuk melalui OAuth (seperti konektor kustom Claude atau ChatGPT) belum dapat terhubung.

Apa yang boleh diubah alat Anda mengikuti izin Anda di **Pengaturan → Agen AI**:

- **Manual** (bawaan): suntingannya menjadi saran Anda, yang Anda dan kolaborator Anda terima atau tolak di **Tinjauan**. File baru dibuat langsung.
- **Otomatis**: suntingannya langsung diterapkan, sebagai suntingan Anda sendiri. Jika lacak perubahan aktif untuk Anda, suntingan itu tetap menjadi saran.
- **Akses penuh**: seperti Otomatis, dan alat itu juga boleh menghapus, memindahkan, dan mengganti nama file.

Sebelum perubahan pertama sebuah alat setelah beberapa waktu, keadaan proyek disimpan sebagai versi, sehingga Anda dapat kembali. Alat milik peninjau hanya dapat menyarankan perubahan, alat milik pelihat hanya dapat membaca dan berkomentar.

### Keamanan

- Siapa pun yang memegang token Anda bertindak sebagai Anda: jaga token seperti kata sandi, dan cabut di daftar token ketika tidak lagi diperlukan (satu token per alat atau komputer memudahkan hal ini). Saat membuat token, berikan hanya yang diperlukan:
  - **Digunakan untuk**: Git, MCP, atau keduanya. Token yang dibuat hanya untuk MCP tidak dapat melakukan clone atau push, dan sebaliknya.
  - **Akses**: **Hanya baca** memungkinkan alat mencantumkan, membaca, mencari, dan mengompilasi, tetapi tidak mengubah file atau komentar (dan memungkinkan git clone dan pull, bukan push), apa pun izin Anda.
  - **Proyek**: semua proyek Anda, atau hanya yang Anda pilih; proyek lainnya tidak ada bagi token itu.
  - **Kedaluwarsa**: setelah 30 hari, 90 hari, satu tahun, atau tidak pernah. Token yang kedaluwarsa berhenti berfungsi; cabut dan buat yang baru.
- ColTex hanya menjawab alat Anda; ColTex tidak pernah terhubung ke server MCP lain. Apa lagi yang dapat dilakukan alat Anda (peramban melalui Playwright MCP, terminal, layanan lain) bergantung pada alat itu dan pengaturannya sendiri. Teks, komentar, dan log proyek dapat ditulis oleh kolaborator Anda, sehingga alat yang membacanya dapat diminta, melalui teks itu, untuk melakukan sesuatu dengan kemampuan lainnya. ColTex memberi tahu alat untuk memperlakukan isi proyek sebagai isi, bukan instruksi, tetapi hanya alat Anda yang dapat menegakkannya: biarkan konfirmasinya sendiri tetap aktif untuk tindakan di luar ColTex, dan gunakan **Manual** ketika sebuah alat juga memiliki peramban atau terminal.
- Alat dengan peramban yang sudah masuk ke ColTex bertindak dengan hak penuh Anda melalui halaman web, bukan melalui MCP, sehingga izin di atas tidak membatasinya di sana. Biarkan alat seperti itu menggunakan profil peramban yang belum masuk.
