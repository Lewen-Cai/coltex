# Başlarken

ColTex, kendi sunucunuzda çalışan, birlikte çalışmaya yönelik bir LaTeX düzenleyicisidir. Overleaf’e çok benzer çalışır: solda kaynak, sağda PDF; birden çok kişi aynı projeyi aynı anda düzenleyebilir.

## Yeni projeler

Sol üstteki **Yeni proje** düğmesine tıklayın, bir ad verin ve bir şablon seçin:

| Şablon | Sınıf |
| --- | --- |
| Boş makale | Standart `article`, en basit başlangıç |
| arXiv ön baskısı | `article`, tek sütun, kurumlarıyla yazarlar (authblk), natbib kaynakçası |
| IEEE konferansı / IEEE dergisi | Konferans / dergi kipinde `IEEEtran` |
| ACM konferansı / ACM dergisi | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, LNCS ve diğer Springer bildiri kitapları için |
| Elsevier dergisi | `elsarticle`, tek sütunlu ön baskı |
| APS (REVTeX 4.2) | `revtex4-2`, Physical Review ve AIP dergileri için |

Boş makale dışında her biri bir özet, anahtar sözcükler, bir denklem, bir şekil, bir tablo ve bir `references.bib` ile gelir ve olduğu gibi derlenir. Sınıflar, TeX Live ile gelen resmî sınıflardır. Her yıl yeni stil dosyaları yayımlayan konferanslar (NeurIPS, ICML) TeX Live’da yoktur: o yılın dosyalarını bir projeye yükleyin ve projeyi şablon olarak yayımlayın.

Kişilerin şablon olarak yayımladığı projeler (örneğin bir grubun tez biçimi) "Bu sunucuda paylaşılanlar" altında listelenir.

Yeni projeler **Otomatik** ile derlenir: motor her derlemede belgeye göre seçilir; bkz. [Derleme ve PDF](#/help/compiling).

Bir projeyi Overleaf’ten getirmek için orada **Download Source** seçeneğini kullanın ve zip dosyasını burada **İçe aktar** ile yükleyin (en fazla 200 MB). Ana belge algılanır ve derleyici de Otomatik olur. Başka düzenleyicilerin bıraktığı derleme dosyaları (`.aux`, `.log`, `.synctex.gz` vb.) ve `.vscode` gibi klasörler, Overleaf’te olduğu gibi alınmaz; `latexmkrc` ve `.bbl` dosyaları korunur.

## Düzenleyici

- **Üst**: proje adı, burada kimlerin olduğu, **Geçmiş** ve **Paylaş**.
- **Sol çubuk**: sol paneli dosyalar, arama, kaynaklar, inceleme, sohbet ve YZ arasında değiştirir; klavye kısayolları ve proje ayarları çubuğun altındadır.
- **Orta**: araç çubuğunda **Kod / Görsel** bulunan düzenleyici.
- **Sağ**: **Yeniden derle**, **Günlükler**, PDF’te gösterme düğmesi, yeni pencerede açma ve indirme ile birlikte PDF.

## Derleme ve PDF

- **Yeniden derle** düğmesine tıklayın veya `Mod+S` / `Mod+Enter` tuşlarına basın. Otomatik derleme varsayılan olarak açıktır ve yazmaya ara verdiğinizde derler.
- **Günlükler** hata sayısını gösterir; her hatayı açıklamasıyla görmek için açın ve satırına gitmek için bir hataya tıklayın. Hatalar düzenleyicide satır numaralarının yanında da işaretlenir.
- **Kaynak ↔ PDF**: imleç kaynaktayken PDF çubuğundaki artı işaretine tıklayın, PDF o yere kayar; kaynağa geri dönmek için PDF’e çift tıklayın.
- **Ayrı pencerede PDF**: PDF çubuğundaki "PDF’i yeni pencerede aç", düzenleyici kendi penceresini doldururken PDF’i başka bir ekrana almanızı sağlar. Bkz. [Derleme ve PDF](#/help/compiling).

## Sonra

- [Düzenleyici](#/help/editor): iki kip, tablolar ve şekiller, denklem önizlemesi, yazım denetimi, sağ tık menüsü.
- [İş birliği](#/help/collaboration): kişileri davet etme, yorumlar, değişiklikleri izleme, sohbet.
- [YZ ajanı](#/help/ai): açıklamalar ve düzenlemeler; yalnızca siz inceledikten sonra uygulanır.
