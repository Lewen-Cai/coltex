// Indonesian messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Tautan simbolis {name} dilewati',
  'Duplicate entry {path}; kept the last one': 'Entri ganda {path}; yang terakhir dipertahankan',

  // History
  'Initial version': 'Versi awal',
  'Created the project': 'Membuat proyek',
  'Imported the project': 'Mengimpor proyek',
  'Converted to a journal template': 'Dikonversi ke templat jurnal',
  'Copied from another project': 'Disalin dari proyek lain',
  'Applied changes from the AI agent': 'Menerapkan perubahan dari agen AI',
  'Edited by an AI agent over MCP': 'Diedit oleh agen AI melalui MCP',
  'Accepted or rejected tracked changes': 'Menerima atau menolak perubahan terlacak',
  'Restored an earlier version': 'Memulihkan versi sebelumnya',
  'Deleted user': 'Pengguna yang dihapus',

  // AI assistant: availability
  'The AI agent is unavailable': 'Agen AI tidak tersedia',
  'The AI agent is turned off': 'Agen AI dimatikan',
  "You don't have access to the AI agent": 'Anda tidak memiliki akses ke agen AI',
  'No AI model is available to you': 'Tidak ada model AI yang tersedia untuk Anda',
  'No AI provider is connected yet': 'Belum ada penyedia AI yang terhubung',
  'Auto: {model} for a quick answer': 'Otomatis: {model} untuk jawaban cepat',
  'Auto: {model} for this task': 'Otomatis: {model} untuk tugas ini',
  '{provider} keeps failing; {model} answers this message instead': '{provider} terus gagal; {model} menjawab pesan ini sebagai gantinya',
  '{provider} is not signed in': '{provider} belum masuk',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Perubahan draf dibuang',
  'Stopped; the draft was not applied': 'Dihentikan; draf tidak diterapkan',
  'Applied changes to {files}; stopped before the build finished.': 'Perubahan diterapkan ke {files}; dihentikan sebelum build selesai.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Perubahan diterapkan ke {files}. Kompilasi: {before} → {after} galat.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'Perubahan agen AI diurungkan, kecuali di {files} karena baris yang sama telah diedit sejak itu.',
  "Undid the AI agent's changes.": 'Perubahan agen AI diurungkan.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Daftar file proyek',
  'Read compile log': 'Baca log kompilasi',
  'Compile with proposed changes': 'Kompilasi dengan perubahan yang diusulkan',
  'Read the {name} manual': 'Baca manual {name}',
  'Read {name} from TeX Live': 'Baca {name} dari TeX Live',
  'Read {path} (lines {start}–end)': 'Baca {path} (baris {start}–akhir)',
  'Read {path} (lines {start}–{end})': 'Baca {path} (baris {start}–{end})',
  'Read {path}': 'Baca {path}',
  'Search compile log for “{query}”': 'Cari “{query}” di log kompilasi',
  'Search the {name} manual for “{query}”': 'Cari “{query}” di manual {name}',
  'Search for “{query}”': 'Cari “{query}”',
  'Look up “{query}” in {name}': 'Cari “{query}” di {name}',
  'Undo draft changes to {path}': 'Urungkan perubahan draf pada {path}',
  'Edit {path}': 'Edit {path}',
  'Create {path}': 'Buat {path}',
  'Delete {path}': 'Hapus {path}',
  'Move {from} to {to}': 'Pindahkan {from} ke {to}',
  'Use skill “{name}”': 'Gunakan skill “{name}”',
  'Read {path} of skill “{name}”': 'Baca {path} dari skill “{name}”',
  'Draft skill “{name}”': 'Buat draf skill “{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': '“{from}” diganti namanya menjadi {name}',
  '{name} has no description; used its first line': '{name} tidak memiliki deskripsi; baris pertamanya digunakan',
  '{name}: skipped {path} (not a text file)': '{name}: {path} dilewati (bukan file teks)',
  '{name}: skipped {path} (too large)': '{name}: {path} dilewati (terlalu besar)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': 'Kunci API untuk {name} (kosongkan jika server tidak memerlukannya)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Selesaikan proses masuk di peramban Anda, atau tempel kode otorisasi / URL pengalihan di sini:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Selesaikan proses masuk di peramban Anda, atau tempel kode otorisasi / URL pengalihan di sini:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Selesaikan proses masuk di peramban Anda, atau tempel URL pengalihan terakhir di sini:',
  'Paste the code Anthropic shows after you sign in:': 'Tempel kode yang ditampilkan Anthropic setelah Anda masuk:',
  'Exchanging authorization code for tokens...': 'Menukar kode otorisasi dengan token...',
  'Exchanging authorization code for an API key...': 'Menukar kode otorisasi dengan kunci API...',
  'GitHub Enterprise URL/domain (blank for github.com)': 'URL/domain GitHub Enterprise (kosongkan untuk github.com)',
  'Select {name} login method:': 'Pilih metode masuk {name}:',
  'Select {name} authentication method:': 'Pilih metode autentikasi {name}:',
  'Listening for OAuth callback on {url}': 'Menunggu callback OAuth di {url}',
  'Sign in to {name}:': 'Masuk ke {name}:',
  'Enter {name}': 'Masukkan {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Anda menempatkan karakter tab perataan \'&\' di tempat yang salah. Jika ingin meratakan sesuatu, Anda harus menulisnya di dalam lingkungan perataan seperti \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, dll. Jika ingin menulis ampersand \'&\' di dalam teks, tulislah \\&.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Anda menulis terlalu banyak tab perataan dalam tabel, sehingga salah satunya diubah menjadi pemisah baris. Pastikan jumlah kolom yang Anda tentukan untuk tabel sudah benar.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Anda lupa tanda $ di akhir mode \'matematika tampilan\'. Dalam mode matematika tampilan, matematika harus selalu ditulis di dalam $$ … $$. Periksa apakah jumlah $ di sekitar setiap ekspresi matematika sudah sesuai.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Semua ekspresi dan simbol matematika harus diapit penanda khusus. Penanda khusus ini membuat ‘mode matematika’. Gunakan $...$ untuk mode matematika sebaris, dan \\[...\\] atau salah satu lingkungan matematika (mis. equation) untuk mode matematika tampilan. Ini berlaku untuk simbol seperti subskrip ( _ ), integral ( \\int ), huruf Yunani ( \\alpha, \\beta, \\delta ) dan pengubah (\\vec{x}, \\tilde{x}).',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Anda merujuk sesuatu yang belum diberi label. Jika sudah diberi label, pastikan yang ditulis di dalam \\ref{...} sama dengan yang ditulis di dalam \\label{...}.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Anda mengutip sesuatu yang tidak ada di bibliografi Anda. Pastikan sitasi (\\cite{...}) memiliki kunci yang sesuai di bibliografi, dan keduanya dieja sama persis.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Anda menggunakan label yang sama lebih dari sekali. Pastikan setiap \\label{...} hanya melabeli satu item.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    'Penentu float \'h\' terlalu ketat bagi LaTeX untuk menempatkan float Anda dengan baik di sini. Coba longgarkan dengan \'ht\', atau bahkan \'htbp\' jika perlu. Jika tetap ingin float berada di sini, gunakan paket float.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'Anda lupa menyertakan penentu float, yang memberi tahu LaTeX di mana gambar harus ditempatkan. Untuk memperbaikinya, sisipkan penentu float di dalam kurung siku (mis. \\begin{figure}[h]), atau hapus kurung sikunya (mis. \\begin{figure} ). Pelajari lebih lanjut tentang penentu float di sini.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Kompilator kesulitan memahami perintah yang Anda gunakan. Periksa apakah perintah dieja dengan benar. Jika perintah tersebut bagian dari sebuah paket, pastikan paket itu sudah disertakan di preambul dengan \\usepackage{...}.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Sepertinya ada paket yang hilang! Perintah {command} tidak akan berfungsi kecuali Anda menyertakan {usage} di preambul dokumen.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Anda membuat lingkungan (dengan perintah \\begin{…} dan \\end{…}) yang tidak dikenali. Pastikan paket yang diperlukan lingkungan itu sudah disertakan di preambul, dan nama lingkungan dieja dengan benar.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Sepertinya ada paket yang hilang! Lingkungan {environment} tidak akan berfungsi kecuali Anda menyertakan {usage} di preambul dokumen.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Kompilator tidak dapat menemukan file yang ingin Anda sertakan. Pastikan file sudah diunggah dan lokasinya ditulis dengan benar.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Kompilator tidak mengenali jenis file salah satu gambar Anda. Pastikan Anda menggunakan format gambar yang didukung kompilator pilihan Anda, dan periksa bahwa tidak ada titik (.) di nama gambar.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Kompilator tidak mengenali opsi float \'H\'. Sertakan \\usepackage{float} di preambul untuk memperbaikinya.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Anda menggunakan penentu float yang tidak dipahami kompilator. Pelajari lebih lanjut di sini tentang berbagai opsi float yang tersedia untuk menempatkan gambar.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Anda menggunakan perintah font yang hanya tersedia dalam mode matematika. Untuk menggunakan perintah ini, Anda harus berada dalam mode matematika (mis. $ … $ atau \\begin{math} … \\end{math} ). Jika ingin menggunakannya di luar mode matematika, gunakan versi teksnya: \\textrm, \\textit, dll.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Anda menggunakan \\begin{...} tanpa \\end{...} yang sesuai.',
  'You have used an open bracket without a corresponding close bracket.':
    'Anda menggunakan kurung buka tanpa kurung tutup yang sesuai.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Anda menggunakan perintah di badan dokumen yang seharusnya digunakan di preambul. Pastikan \\documentclass[…]{…} dan semua perintah \\usepackage{…} ditulis sebelum \\begin{document}.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Anda memulai ekspresi dengan perintah \\left, tetapi tidak menyertakan perintah \\right yang sesuai. Pastikan perintah \\left dan \\right selalu seimbang, atau coba gunakan perintah \\Biggl dan \\Biggr seperti yang ditunjukkan di sini.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Anda menulis superskrip ganda secara salah sebagai a^b^c, atau menulis tanda aksen (prime) dengan superskrip. Ingatlah untuk menyertakan { dan } saat menggunakan beberapa superskrip. Coba a^{b^c}.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Anda menulis subskrip ganda secara salah sebagai a_b_c. Ingatlah untuk menyertakan { dan } saat menggunakan beberapa subskrip. Coba a_{b_c}.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    'Anda menggunakan perintah \\maketitle, tetapi tidak menentukan \\author. Untuk memperbaikinya, sertakan penulis di preambul dengan perintah \\author{…}.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Tidak ditemukan butir dalam daftar yang Anda buat. Pastikan butir daftar ditandai dengan perintah \\item, dan Anda tidak menggunakan daftar di dalam tabel.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Anda menggunakan perintah \\hline di tempat yang salah, mungkin di luar tabel. Jika perintah \\hline ditulis di dalam tabel, coba sertakan \\\\ sebelumnya.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'Anda menggunakan perintah \\\\ atau \\newline di tempat yang tidak diharapkan LaTeX. Pastikan Anda hanya menggunakan pemisah baris setelah blok teks, dan berhati-hatilah menggunakan pemisah baris di dalam daftar dan lingkungan lain.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    'Anda menggunakan perintah \\verb secara salah. Coba ganti perintah \\verb dengan \\begin{verbatim} … \\end{verbatim}.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Anda menulis panjang, tetapi tidak menentukan satuannya (pt, mm, cm, dll.). Jika Anda tidak menulis panjang, periksa bahwa tidak ada pemisah baris \\\\ yang diikuti kurung siku […] di mana pun.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Anda menulis perintah \\right tanpa perintah \\left yang sesuai. Periksa bahwa semua perintah \\left dan \\right selalu seimbang.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    'Perintah \\begin{document} tidak ditemukan. Pastikan Anda telah menyertakan \\begin{document}, dan dokumen utama Anda sudah diatur dengan benar.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Anda menggunakan \\begin{} tanpa \\end{} yang sesuai.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} galat kompilasi',
  'Compile log': 'Log kompilasi',
  'Search the web for “{query}”': 'Cari di web “{query}”',
  'Read web page {url}': 'Baca halaman web {url}',
}

export default messages
