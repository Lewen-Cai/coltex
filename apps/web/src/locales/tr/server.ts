// Turkish messages, keyed by their English text. See lib/i18n.ts.
// Text the server sends that the interface shows as content (version
// descriptions, AI steps and notices, import notes, AI status, login prompts,
// compile log hints),
// matched at run time by translateServerMessage: exact text first, then keys
// with {placeholders} as patterns (the most specific first). Keep keys
// identical to what the server sends. Error messages are not translated: they
// are shown in English as sent, so don't add them here.
const messages: Record<string, string> = {
  // Import (zip archives)
  'Skipped symbolic link {name}': 'Sembolik bağlantı atlandı: {name}',
  'Duplicate entry {path}; kept the last one': 'Yinelenen girdi: {path}; sonuncusu tutuldu',

  // History
  'Initial version': 'İlk sürüm',
  'Created the project': 'Projeyi oluşturdu',
  'Imported the project': 'Projeyi içe aktardı',
  'Converted to a journal template': 'Dergi şablonuna dönüştürüldü',
  'Copied from another project': 'Başka bir projeden kopyalandı',
  'Applied changes from the AI agent': 'YZ ajanının değişikliklerini uyguladı',
  'Edited by an AI agent over MCP': 'Bir YZ ajanı tarafından MCP üzerinden düzenlendi',
  'Accepted or rejected tracked changes': 'İzlenen değişiklikleri kabul etti veya reddetti',
  'Restored an earlier version': 'Önceki bir sürümü geri yükledi',
  'Deleted user': 'Silinmiş kullanıcı',

  // AI assistant: availability
  'The AI agent is unavailable': 'YZ ajanı kullanılamıyor',
  'The AI agent is turned off': 'YZ ajanı kapalı',
  "You don't have access to the AI agent": 'YZ ajanına erişiminiz yok',
  'No AI model is available to you': 'Kullanabileceğiniz bir YZ modeli yok',
  'No AI provider is connected yet': 'Henüz bağlı bir YZ sağlayıcısı yok',
  'Auto: {model} for a quick answer': 'Otomatik: hızlı yanıt için {model}',
  'Auto: {model} for this task': 'Otomatik: bu görev için {model}',
  '{provider} keeps failing; {model} answers this message instead': '{provider} sürekli hata veriyor; bu mesajı bunun yerine {model} yanıtlıyor',
  '{provider} is not signed in': '{provider}: oturum açılmamış',

  // AI assistant: session, apply and undo
  'Draft changes discarded': 'Taslak değişiklikleri atıldı',
  'Stopped; the draft was not applied': 'Durduruldu; taslak uygulanmadı',
  'Applied changes to {files}; stopped before the build finished.': 'Değişiklikler {files} dosyasına uygulandı; derleme bitmeden durduruldu.',
  'Applied changes to {files}. Build: {before} → {after} errors.': 'Değişiklikler uygulandı: {files}. Derleme hataları: {before} → {after}.',
  "Undid the AI agent's changes, except in {files} where the same lines were edited since.":
    'YZ ajanının değişiklikleri geri alındı; aynı satırların sonradan düzenlendiği şu dosyalar hariç: {files}.',
  "Undid the AI agent's changes.": 'YZ ajanının değişiklikleri geri alındı.',

  // AI assistant: tool steps in the transcript (specific patterns first)
  'List project files': 'Proje dosyalarını listele',
  'Read compile log': 'Derleme günlüğünü oku',
  'Compile with proposed changes': 'Önerilen değişikliklerle derle',
  'Read the {name} manual': '{name} kılavuzunu oku',
  'Read {name} from TeX Live': 'TeX Live içinden oku: {name}',
  'Read {path} (lines {start}–end)': 'Oku: {path} (satır {start}–son)',
  'Read {path} (lines {start}–{end})': 'Oku: {path} (satır {start}–{end})',
  'Read {path}': 'Oku: {path}',
  'Search compile log for “{query}”': 'Derleme günlüğünde ara: “{query}”',
  'Search the {name} manual for “{query}”': '{name} kılavuzunda ara: “{query}”',
  'Search for “{query}”': 'Ara: “{query}”',
  'Look up “{query}” in {name}': '{name} içinde bak: “{query}”',
  'Undo draft changes to {path}': 'Taslak değişikliklerini geri al: {path}',
  'Edit {path}': 'Düzenle: {path}',
  'Create {path}': 'Oluştur: {path}',
  'Delete {path}': 'Sil: {path}',
  'Move {from} to {to}': 'Taşı: {from} → {to}',
  'Use skill “{name}”': 'Skill kullan: “{name}”',
  'Read {path} of skill “{name}”': '“{name}” adlı skill içinden oku: {path}',
  'Draft skill “{name}”': 'Skill taslağı hazırla: “{name}”',
  // Notes from importing skills
  'Renamed “{from}” to {name}': 'Yeniden adlandırıldı: “{from}” → {name}',
  '{name} has no description; used its first line': '{name}: açıklama yok; ilk satırı kullanıldı',
  '{name}: skipped {path} (not a text file)': '{name}: {path} atlandı (metin dosyası değil)',
  '{name}: skipped {path} (too large)': '{name}: {path} atlandı (çok büyük)',

  // AI administration and provider logins
  'API key for {name} (leave empty if the server needs none)': '{name} için API anahtarı (sunucu gerektirmiyorsa boş bırakın)',
  'Complete login in your browser, or paste the authorization code / redirect URL here:':
    'Oturum açmayı tarayıcınızda tamamlayın veya yetkilendirme kodunu / yönlendirme URL’sini buraya yapıştırın:',
  'Complete sign-in in your browser, or paste the authorization code / redirect URL here:':
    'Oturum açmayı tarayıcınızda tamamlayın veya yetkilendirme kodunu / yönlendirme URL’sini buraya yapıştırın:',
  'Complete login in your browser, or paste the final redirect URL here:': 'Oturum açmayı tarayıcınızda tamamlayın veya son yönlendirme URL’sini buraya yapıştırın:',
  'Paste the code Anthropic shows after you sign in:': 'Oturum açtıktan sonra Anthropic’in gösterdiği kodu yapıştırın:',
  'Exchanging authorization code for tokens...': 'Yetkilendirme kodu belirteçlerle değiştiriliyor…',
  'Exchanging authorization code for an API key...': 'Yetkilendirme kodu bir API anahtarıyla değiştiriliyor…',
  'GitHub Enterprise URL/domain (blank for github.com)': 'GitHub Enterprise URL’si/alan adı (github.com için boş bırakın)',
  'Select {name} login method:': '{name} için oturum açma yöntemini seçin:',
  'Select {name} authentication method:': '{name} için kimlik doğrulama yöntemini seçin:',
  'Listening for OAuth callback on {url}': 'OAuth geri çağrısı bekleniyor: {url}',
  'Sign in to {name}:': 'Oturum açın: {name}',
  'Enter {name}': 'Girin: {name}',
  // Compile log hints (Overleaf's human-readable log rules, packages/log-parser).
  // Keys must equal the English hint text; the AI keeps reading the English.
  'You have placed an alignment tab character \'&\' in the wrong place. If you want to align something, you must write it inside an align environment such as \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular}, etc. If you want to write an ampersand \'&\' in text, you must write \\& instead.':
    'Hizalama karakteri ‘&’ yanlış yere konmuş. Bir şeyi hizalamak istiyorsanız, onu \\begin{align} … \\end{align}, \\begin{tabular} … \\end{tabular} gibi bir hizalama ortamının içine yazmalısınız. Metinde ‘&’ işareti yazmak istiyorsanız bunun yerine \\& yazın.',
  'You have written too many alignment tabs in a table, causing one of them to be turned into a line break. Make sure you have specified the correct number of columns in your table.':
    'Bir tabloda çok fazla hizalama karakteri (&) yazılmış; bu nedenle biri satır sonuna dönüştürülmüş. Tablonuzda doğru sütun sayısını belirttiğinizden emin olun.',
  'You have forgotten a $ sign at the end of \'display math\' mode. When writing in display math mode, you must always math write inside $$ … $$. Check that the number of $s match around each math expression.':
    'Blok matematik kipinin sonunda bir $ işareti unutulmuş. Blok matematik kipinde her zaman $$ … $$ arasına yazmalısınız. Her matematik ifadesinin iki yanındaki $ sayısının eşleştiğini denetleyin.',
  'You need to enclose all mathematical expressions and symbols with special markers. These special markers create a ‘math mode’. Use $...$ for inline math mode, and \\[...\\] or one of the mathematical environments (e.g. equation) for display math mode. This applies to symbols such as subscripts ( _ ), integrals ( \\int ), Greek letters ( \\alpha, \\beta, \\delta ) and modifiers (\\vec{x}, \\tilde{x}).':
    'Tüm matematik ifadelerini ve simgelerini özel işaretlerle çevrelemeniz gerekir. Bu işaretler bir ‘matematik kipi’ oluşturur. Satır içi matematik için $...$, blok matematik için \\[...\\] veya matematik ortamlarından birini (ör. equation) kullanın. Bu; alt simgeler ( _ ), integraller ( \\int ), Yunan harfleri ( \\alpha, \\beta, \\delta ) ve değiştiriciler (\\vec{x}, \\tilde{x}) gibi simgeler için geçerlidir.',
  'You have referenced something which has not yet been labelled. If you have labelled it already, make sure that what is written inside \\ref{...} is the same as what is written inside \\label{...}.':
    'Henüz etiketlenmemiş bir şeye başvurmuşsunuz. Zaten etiketlediyseniz \\ref{...} içine yazılanın \\label{...} içine yazılanla aynı olduğundan emin olun.',
  'You have cited something which is not included in your bibliography. Make sure that the citation (\\cite{...}) has a corresponding key in your bibliography, and that both are spelled the same way.':
    'Kaynakçanızda bulunmayan bir şeye atıf yapmışsınız. Atıfın (\\cite{...}) kaynakçanızda karşılık gelen bir anahtarı olduğundan ve ikisinin de aynı yazıldığından emin olun.',
  'You have used the same label more than once. Check that each \\label{...} labels only one item.':
    'Aynı etiketi birden çok kez kullanmışsınız. Her \\label{...} komutunun yalnızca bir öğeyi etiketlediğini denetleyin.',
  'The float specifier \'h\' is too strict of a demand for LaTeX to place your float in a nice way here. Try relaxing it by using \'ht\', or even \'htbp\' if necessary. If you want to try keep the float here anyway, check out the float package.':
    '‘h’ yerleşim belirteci, LaTeX’in kayan nesnenizi buraya düzgünce yerleştirmesi için fazla katı bir istek. ‘ht’ veya gerekirse ‘htbp’ kullanarak gevşetmeyi deneyin. Kayan nesneyi yine de burada tutmak istiyorsanız float paketine göz atın.',
  'You have forgotten to include a float specifier, which tells LaTeX where to position your figure. To fix this, either insert a float specifier inside the square brackets (e.g. \\begin{figure}[h]), or remove the square brackets (e.g. \\begin{figure} ). Find out more about float specifiers here.':
    'LaTeX’e şeklinizi nereye yerleştireceğini söyleyen yerleşim belirtecini eklemeyi unutmuşsunuz. Düzeltmek için köşeli parantezlerin içine bir yerleşim belirteci yazın (ör. \\begin{figure}[h]) ya da köşeli parantezleri kaldırın (ör. \\begin{figure} ). Yerleşim belirteçleri hakkında daha fazla bilgiyi burada bulabilirsiniz.',
  'The compiler is having trouble understanding a command you have used. Check that the command is spelled correctly. If the command is part of a package, make sure you have included the package in your preamble using \\usepackage{...}.':
    'Derleyici kullandığınız bir komutu anlamakta zorlanıyor. Komutun doğru yazıldığını denetleyin. Komut bir pakete aitse, paketi önsözde \\usepackage{...} ile eklediğinizden emin olun.',
  'We think you’ve got a missing package! The {command} command won\'t work unless you include {usage} in your document preamble.':
    'Eksik bir paketiniz var gibi görünüyor! Belgenizin önsözüne {usage} eklemezseniz {command} komutu çalışmaz.',
  'You have created an environment (using \\begin{…} and \\end{…} commands) which is not recognized. Make sure you have included the required package for that environment in your preamble, and that the environment is spelled correctly.':
    'Tanınmayan bir ortam oluşturmuşsunuz (\\begin{…} ve \\end{…} komutlarıyla). Bu ortam için gereken paketi önsöze eklediğinizden ve ortam adının doğru yazıldığından emin olun.',
  'We think you’ve got a missing package! The {environment} environment won\'t work unless you include {usage} in your document preamble.':
    'Eksik bir paketiniz var gibi görünüyor! Belgenizin önsözüne {usage} eklemezseniz {environment} ortamı çalışmaz.',
  'The compiler cannot find the file you want to include. Make sure that you have uploaded the file and specified the file location correctly.':
    'Derleyici eklemek istediğiniz dosyayı bulamıyor. Dosyayı yüklediğinizden ve dosya konumunu doğru belirttiğinizden emin olun.',
  'The compiler does not recognise the file type of one of your images. Make sure you are using a supported image format for your choice of compiler, and check that there are no periods (.) in the name of your image.':
    'Derleyici görüntülerinizden birinin dosya türünü tanımıyor. Seçtiğiniz derleyicinin desteklediği bir görüntü biçimi kullandığınızdan emin olun ve görüntü adında nokta (.) bulunmadığını denetleyin.',
  'The compiler isn\'t recognizing the float option \'H\'. Include \\usepackage{float} in your preamble to fix this.':
    'Derleyici ‘H’ yerleşim seçeneğini tanımıyor. Düzeltmek için önsöze \\usepackage{float} ekleyin.',
  'You have used a float specifier which the compiler does not understand. You can learn more about the different float options available for placing figures here.':
    'Derleyicinin anlamadığı bir yerleşim belirteci kullanmışsınız. Şekilleri yerleştirmek için kullanılabilen yerleşim seçenekleri hakkında daha fazla bilgiyi burada bulabilirsiniz.',
  'You have used a font command which is only available in math mode. To use this command, you must be in maths mode (E.g. $ … $ or \\begin{math} … \\end{math} ). If you want to use it outside of math mode, use the text version instead: \\textrm, \\textit, etc.':
    'Yalnızca matematik kipinde kullanılabilen bir yazı tipi komutu kullanmışsınız. Bu komutu kullanmak için matematik kipinde olmalısınız (ör. $ … $ veya \\begin{math} … \\end{math} ). Matematik kipi dışında kullanmak istiyorsanız metin sürümünü kullanın: \\textrm, \\textit vb.',
  'You have used \\begin{...} without a corresponding \\end{...}.':
    'Karşılığı olan bir \\end{...} olmadan \\begin{...} kullanmışsınız.',
  'You have used an open bracket without a corresponding close bracket.':
    'Karşılığı olan bir kapanış parantezi olmadan açılış parantezi kullanmışsınız.',
  'You have used a command in the main body of your document which should be used in the preamble. Make sure that \\documentclass[…]{…} and all \\usepackage{…} commands are written before \\begin{document}.':
    'Belgenizin gövdesinde, önsözde kullanılması gereken bir komut kullanmışsınız. \\documentclass[…]{…} ve tüm \\usepackage{…} komutlarının \\begin{document} öncesine yazıldığından emin olun.',
  'You have started an expression with a \\left command, but have not included a corresponding \\right command. Make sure that your \\left and \\right commands balance everywhere, or else try using \\Biggl and \\Biggr commands instead as shown here.':
    'Bir ifadeye \\left komutuyla başlamışsınız, ancak karşılığı olan \\right komutunu eklememişsiniz. \\left ve \\right komutlarının her yerde dengeli olduğundan emin olun ya da burada gösterildiği gibi bunların yerine \\Biggl ve \\Biggr komutlarını kullanmayı deneyin.',
  'You have written a double superscript incorrectly as a^b^c, or else you have written a prime with a superscript. Remember to include { and } when using multiple superscripts. Try a^{b^c} instead.':
    'Çift üst simgeyi yanlış biçimde a^b^c olarak yazmışsınız ya da üs işaretli (′) bir ifadeye üst simge eklemişsiniz. Birden çok üst simge kullanırken { ve } eklemeyi unutmayın. Bunun yerine a^{b^c} deneyin.',
  'You have written a double subscript incorrectly as a_b_c. Remember to include { and } when using multiple subscripts. Try a_{b_c} instead.':
    'Çift alt simgeyi yanlış biçimde a_b_c olarak yazmışsınız. Birden çok alt simge kullanırken { ve } eklemeyi unutmayın. Bunun yerine a_{b_c} deneyin.',
  'You have used the \\maketitle command, but have not specified any \\author. To fix this, include an author in your preamble using the \\author{…} command.':
    '\\maketitle komutunu kullanmışsınız, ancak hiç \\author belirtmemişsiniz. Düzeltmek için önsöze \\author{…} komutuyla bir yazar ekleyin.',
  'There are no entries found in a list you have created. Make sure you label list entries using the \\item command, and that you have not used a list inside a table.':
    'Oluşturduğunuz bir listede hiç öğe bulunamadı. Liste öğelerini \\item komutuyla işaretlediğinizden ve bir tablonun içinde liste kullanmadığınızdan emin olun.',
  'You have used a \\hline command in the wrong place, probably outside a table. If the \\hline command is written inside a table, try including \\\\ before it.':
    'Bir \\hline komutunu yanlış yerde, büyük olasılıkla tablo dışında kullanmışsınız. \\hline komutu bir tablonun içindeyse önüne \\\\ eklemeyi deneyin.',
  'You have used a \\\\ or \\newline command where LaTeX was not expecting one. Make sure that you only use line breaks after blocks of text, and be careful using linebreaks inside lists and other environments.':
    'LaTeX’in beklemediği bir yerde \\\\ veya \\newline komutu kullanmışsınız. Satır sonlarını yalnızca metin bloklarından sonra kullandığınızdan emin olun; listelerde ve diğer ortamlarda satır sonu kullanırken dikkatli olun.',
  'You have used a \\verb command incorrectly. Try replacling the \\verb command with \\begin{verbatim} … \\end{verbatim}.':
    '\\verb komutunu yanlış kullanmışsınız. \\verb komutunun yerine \\begin{verbatim} … \\end{verbatim} kullanmayı deneyin.',
  'You have written a length, but have not specified the appropriate units (pt, mm, cm etc.). If you have not written a length, check that you have not witten a linebreak \\\\ followed by square brackets […] anywhere.':
    'Bir uzunluk yazmışsınız, ancak uygun birimi (pt, mm, cm vb.) belirtmemişsiniz. Uzunluk yazmadıysanız, hiçbir yerde ardından köşeli parantez […] gelen bir \\\\ satır sonu yazmadığınızı denetleyin.',
  'You have written a \\right command without a corresponding \\left command. Check that all \\left and \\right commands balance everywhere.':
    'Karşılığı olan bir \\left komutu olmadan \\right komutu yazmışsınız. Tüm \\left ve \\right komutlarının her yerde dengeli olduğunu denetleyin.',
  'No \\begin{document} command was found. Make sure you have included \\begin{document} in your preamble, and that your main document is set correctly.':
    '\\begin{document} komutu bulunamadı. Belgenize \\begin{document} eklediğinizden ve ana belgenizin doğru ayarlandığından emin olun.',
  'You have used \\begin{} without a corresponding \\end{}.':
    'Karşılığı olan bir \\end{} olmadan \\begin{} kullanmışsınız.',

  // What the AI agent was given with a message (the chips under it).
  '{n} compile error': '{n} derleme hatası',
  'Compile log': 'Derleme günlüğü',
}

export default messages
