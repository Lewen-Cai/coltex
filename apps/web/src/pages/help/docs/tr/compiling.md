# Derleme ve PDF

## Derleyici ve ana belge

Proje ayarlarında **Derleyici** ve **Ana belge** bulunur:

- **Otomatik** (yeni projeler için varsayılan): her derlemede belgeye göre seçilir. Önsöz (`\input` ile eklediği dosyalar ve projenin kendi `.sty`/`.cls` dosyalarıyla birlikte) `ctex`, `xeCJK`, `fontspec`, `unicode-math` ve benzerlerini yüklüyorsa ya da sınıf `ctexart`/`ctexbook` vb. ise XeLaTeX; `luacode` veya `luatexja` yüklüyorsa LuaLaTeX; aksi hâlde pdfLaTeX. İlk satırdaki `% !TEX program = xelatex` veya projedeki bir `latexmkrc` varsa onlar belirler.
- **pdfLaTeX**: İngilizce belgeler için olağan seçim.
- **XeLaTeX**: Çince (ctex) ve sistem yazı tipleri için gereklidir.
- **LuaLaTeX**: sistem yazı tiplerini de destekler.

Bir motor seçmek, algılama yapılmadan her seferinde onun kullanılmasını sağlar.

> Çince için `\usepackage[UTF8]{ctex}` yükleyin (veya `ctexart` sınıfını kullanın); Otomatik, XeLaTeX’e geçer. ctex olmadan Çince metin pdfLaTeX altında “Unicode character … not set up for use with LaTeX” hatasıyla başarısız olur.

Ana belge, bir derlemenin başladığı dosyadır; proje ayarlarında **Ana belge** altından seçin.

Derlemeler, LaTeX’i, BibTeX/Biber’i ve dizinleri gerektiği kadar çalıştıran latexmk ile tam TeX Live kullanır. Yalıtılmış olarak, ağ erişimi olmadan çalışırlar ve shell escape kısıtlıdır.

## Derleme seçenekleri

**Yeniden derle** düğmesinin yanındaki okta şunlar bulunur:

- **Otomatik derleme**: yazmaya ara verdiğinizde derler (kaç kişi yazarsa yazsın proje başına aynı anda bir derleme).
- **Derleme kipi**: Normal veya Hızlı [taslak]. Taslak kipi görüntüleri dışarıda bırakır ve daha hızlıdır.
- **Derleme hatalarında**: ilk hatada durma veya hatalara rağmen derlemeyi deneme.
- **Temizle ve yeniden derle**: bir derleme yanlış göründüğünde yardımcı dosyaları kaldırır ve sıfırdan derler.

Bunlar bu tarayıcıda proje başına saklanır.

## Günlükler

**Günlükler** üzerindeki sayı hata sayısıdır. Günlük; hataları, uyarıları ve dizgi sorunlarını listeler:

- her biri LaTeX mesajıyla ve yaygın sorunlar için bir açıklamayla birlikte (örneğin eksik bir paket için eklenecek paketin adı verilir);
- dosyasına ve satırına gitmek için birine tıklayın;
- ham günlük de oradadır ve YZ hataları açıklayabilir veya düzeltebilir.

> Bir derleme başarısız olduğunda, son başarılı derlemenin PDF’i ekranda kalır.

## Kaynak ile PDF arasında

- **Kaynak → PDF**: imleç kaynaktayken PDF çubuğundaki **Bul** düğmesine (veya sağ tık menüsündeki "PDF’te göster" seçeneğine) tıklayın; PDF oraya kayar ve orayı vurgular.
- **PDF → kaynak**: PDF’e çift tıklayın; düzenleyici dosyayı o satırda açar.

## Yerleşim: düzenleyici, PDF veya ikisi

Görünüm anahtarı (PDF çubuğunun sağındaki dört küçük düğme), Overleaf’teki gibi **Yalnızca düzenleyici**, yan yana **Düzenleyici ve PDF** veya **Yalnızca PDF** gösterir; dördüncüsü PDF’i yeni bir pencerede açar. Bu tarayıcı seçimi hatırlar. Ayırıcıyı bir tarafa sonuna kadar sürüklemek de o bölmeyi gizler.

- Yalnızca düzenleyici gösterilirken **Yeniden derle** ve aynı anahtar düzenleyici araç çubuğunun sonundadır.
- Düzenleyicideki **PDF’te göster**, gizliyse PDF’i gösterir.
- Dar bir pencerede (tablet veya telefon) aynı anda yalnızca birine yer vardır ve yan paneller (dosyalar, arama…) açıkken düzenleyicinin üzerini kaplar.

## Ayrı pencerede PDF

**PDF’i yeni pencerede aç** (görünüm anahtarının son düğmesi), PDF’i başka bir ekrana taşıyabileceğiniz ayrı bir pencerede açar:

- Düzenleyici penceresi PDF bölmesini kaldırır ve düzenleyici pencereyi doldurur; **Yeniden derle** düzenleyici araç çubuğunun sonuna taşınır.
- PDF penceresinde yeniden derleme, günlükler, PDF’te gösterme ve indirme bulunur. PDF’ine çift tıklamak, düzenleyici penceresinde kaynağa atlar.
- Düzenleyici araç çubuğundaki **PDF’i burada göster** veya pencereyi kapatmak PDF bölmesini geri getirir.

## İndirmeler

- PDF çubuğu geçerli PDF’i indirir.
- Dosya ağacının üstündeki indirme düğmesi projenin kaynak dosyalarını .zip olarak indirir.
- Proje listesinde bir projenin menüsünde (⋯) önce derleyen **PDF’i indir** ve tüm kaynak dosyaları için **.zip olarak indir** bulunur.

## Word'e aktarma

Bazı dergiler yalnızca Word dosyası kabul eder. Proje listesinde bir projenin menüsündeki (⋯) ya da proje ayarlarındaki **İşlemler** bölümündeki **Word'e aktar…**, projeyi bir .docx dosyasına dönüştürür.

- Başlık sayfası belgeden alınır: başlık, yazarlar, kurumlar, sorumlu yazar, özet ve anahtar kelimeler; şablon dönüştürmenin okuyabildiği sınıflar için (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Matematik ifadeleri Word denklemlerine dönüşür. Şekilleri ve tabloları Word numaralandırır, PDF ve EPS şekiller resme dönüşür, numaralı denklemler numaralarını korur; böylece `\eqref` onları göstermeye devam eder.
- Tablolar, birleştirilmiş hücreleri de içeren düzenlenebilir Word tablolarına dönüşür. Kaynakça, bibliyografyanın bulunduğu yerde kendi başlığıyla (References ya da belgenin kendi başlığı) kalır ve atıflar ilgili girdilere bağlanır.
- **Kaynak gösterme stili**: **Belgedeki gibi**, belgenin kaynakça stiline uyar. APA, Vancouver, AMA, IEEE, Nature veya Chicago'yu ya da projeye yüklediğiniz bir `.csl` dosyasını da seçebilirsiniz.
- **Word şablonu**: Bir derginin Word şablonunu (`.docx`) projeye yükleyip burada seçin; belge onun stillerini alır. Bu alan, projede bir `.docx` dosyası olduğunda görünür.
- Göndermeden önce sonucu kontrol edin: kendi makrolarınız ve karmaşık tablolar Word'de düzeltme gerektirebilir. TikZ çizimleri dönüştürülmez: önce onları resim olarak derleyin ve yerlerine bu resimleri koyun.
