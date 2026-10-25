# Başlarken

ColTex, kendi sunucunuzda çalışan, birlikte çalışmaya yönelik bir LaTeX düzenleyicisidir. Overleaf’e çok benzer çalışır: solda kaynak, sağda PDF; birden çok kişi aynı projeyi aynı anda düzenleyebilir.

## Yeni projeler

Sol üstteki **Yeni proje** düğmesine tıklayın, bir ad verin ve bir şablon seçin:

| Alan | Şablonlar |
| --- | --- |
| Genel | Boş makale, arXiv ön baskısı, Elsevier dergisi, Elsevier dergisi (yazar–yıl), Elsevier dergisi (iki sütun), Elsevier CAS dergisi (iki sütun), Nature, Derleme makalesi, Kısa bildiri |
| Bilgisayar ve elektrik mühendisliği | IEEE konferansı, IEEE dergisi, IEEE Computer Society konferansı, IEEE Computer Society dergisi, IEEE Communications Society dergisi, ACM konferansı, ACM dergisi, ACM gönderimi (anonim), ACM SIGPLAN konferansı, ACM Transactions on Graphics, Springer LNCS, PMLR bildiri kitabı |
| Mühendislik | ASME konferansı, ASCE dergisi, AIAA konferans bildirisi, SPIE bildiri kitabı |
| Fizik | APS (REVTeX 4.2), Physical Review Letters, AIP dergisi, Journal of the Physical Society of Japan, JACoW konferans bildirisi |
| Astronomi | AAS dergileri (AASTeX), Monthly Notices of the RAS |
| Kimya | ACS dergi makalesi, ACS letter |
| Yaşam bilimleri | Yaşam bilimleri araştırma makalesi, Biyoinformatik uygulama notu |
| Tıp | Klinik çalışma raporu, Klinik çalışma protokolü, Gözlemsel çalışma, Tanısal doğruluk çalışması, Sistematik derleme ve meta-analiz, Olgu sunumu, Tıbbi araştırma mektubu, Elsevier CAS dergisi, Oxford University Press dergisi |
| Matematik ve istatistik | AMS makalesi, AMS bildiri kitabı, Annals of Mathematics, İstatistiksel yöntem makalesi |
| İktisat | İktisat makalesi (AEA biçimi), Ekonometri makalesi |
| Sosyal ve beşeri bilimler | APA 7 makale taslağı, APA 7 dergi düzeni, APA 7 öğrenci ödevi, Beşeri bilimler makalesi (Chicago dipnotları), Edebiyat denemesi (MLA), Hukuk makalesi (OSCOLA) |
| Yer ve çevre | Yer bilimleri makalesi (AGU biçimi), Ekolojik arazi çalışması, Canadian Science Publishing dergisi |

Boş makale dışında her birinde bir özet, örnek bölümler ve bir `references.bib` vardır ve olduğu gibi derlenir. Sınıflar TeX Live ile gelen resmî sınıflardır. Bilinen pek çok dergi ve konferans şablonu yerleşik değildir; nedenini ve nasıl ekleneceğini [Şablonlar](#/help/templates) anlatır.

Şablonların üstündeki düğmeler tek bir alanın şablonlarını gösterir. Sizinle paylaşılan şablonlar (örneğin bir grubun tez biçimi) aynı listededir ve kimin paylaştığını söyleyen bir etiket taşır; [Şablonlar](#/help/templates) bölümüne bakın.

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
