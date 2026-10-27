# Şablonlar

## Şablonlardan yeni projeler

**Yeni proje** tek bir liste gösterir: yerleşik şablonlar ve sizinle paylaşılanlar. Her birinin üzerindeki etiket nereden geldiğini söyler:

- **Yerleşik**: ColTex ile gelir.
- **Sistem yöneticisi paylaştı**: bu sunucudaki herkes için.
- Bir grup adıyla **ile paylaşıldı**: üyesi olduğunuz bir grupla paylaşılmış.
- Bir adla **paylaştı**: sizinle kişisel olarak paylaşılmış.
- **Yalnızca siz**: kendiniz için içe aktardığınız bir şablon.

Listenin üstündeki düğmeler (**Tümü**, sonra alanlar) tek bir alanın şablonlarını gösterir. Yalnızca sizinle paylaşılan şablonları görürsünüz. Ayrıca [Başlarken](#/help/getting-started) bölümüne bakın.

Altlarındaki arama alanı şablonları ada veya açıklamaya göre bulur.

## Bir projeyi şablon olarak yayımlamak

Yöneticiler kendi projelerini şablon olarak yayımlayabilir, örneğin bir grubun tez biçimini:

1. Proje listesindeki proje menüsünde (⋯) veya proje ayarlarında **Şablon olarak yayımla…** seçeneğini seçin.
2. Bir ad, açıklama ve **Alan** (nerede listeleneceği) girin, **Paylaşılan** altında kimin alacağını seçin ve **Yayımla** düğmesine tıklayın.

Kimin için olabilir:

- Bir yönetici: üyesi olduğu gruplar ve ad ya da e-postayla seçtiği kişiler.
- Sistem yöneticisi: ayrıca **Bu sunucudaki herkes**.
- Üyeler şablon yayımlayamaz; bir yöneticiye başvurun.

Bilmekte fayda var:

- Ondan oluşturulan yeni projeler, projenin dosyalarını **o anki** halleriyle, derleyicisini ve yazım denetimi dilini alır; üyelerini, geçmişini veya yorumlarını almaz.
- Şablon projeyi izler: projeyi değiştirin, sonraki yeni projeler değişiklikleri alır.
- Adını, alanını veya kimin için olduğunu değiştirmek ya da **Yayımdan kaldır** demek için **Şablon olarak yayımla…** öğesini yeniden açın. Sistem yöneticisi yeni proje penceresinde herhangi bir şablonu da kaldırabilir.
- Proje silinince şablon da gider.

## Bir derginin şablonunu içe aktarma

Birçok dergi ve konferansın yayımladığı LaTeX şablonları ColTex’e yerleşik değildir: lisansları yeniden dağıtılmalarına izin vermez ya da TeX Live’ın parçası değildirler. Bunlar arasında NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics vardır. Resmî şablonu konferansın ya da yayıncının web sitesinden indirin ve şablon olarak içe aktarın:

1. **Yeni proje**ye, ardından **Şablonu içe aktar**a tıklayın.
2. Zip’i seçin, bir ad, açıklama ve **Alan** girin, **İçe aktar**a tıklayın. **Başkalarıyla paylaş**ı (yöneticiler) açıp kiminle paylaşacağınızı seçmezseniz yalnızca sizindir.

Bilmekte fayda var:

- Paylaşım yayımlama kurallarına uyar (yukarıda): yöneticiler kendi gruplarıyla ve seçtikleri kişilerle, sistem yöneticisi ayrıca herkesle paylaşır. Yalnızca size ait bir şablonun etiketi **Yalnızca siz** olur.
- İçe aktarma çalışma alanınıza proje eklemez: şablon dosyalarını kendisi tutar. Ana belgesi proje içe aktarılırken olduğu gibi bulunur; derleme dosyaları ve sistem artıkları dışarıda kalır.
- Şablonun ⋯ menüsünde **Dosyaları düzenle**, **Şablonu düzenle…** (yeniden adlandırmak, kiminle paylaşıldığını değiştirmek veya yayından kaldırmak; kaldırınca dosyaları sizin bir projeniz olur) ve dosyalarını da silen **Şablonu kaldır** vardır.

## Dergi şablonuna dönüştürme

Bir projenin menüsündeki **Şablona dönüştür…** (proje ayarlarında: "Dergi şablonuna dönüştür"), bir makaleyi başka bir dergi veya konferans için yeniden yazar: IEEE Transactions, IEEE Konferansı, ACM Konferansı, ACM Dergisi, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS veya düz bir makale. Her yerleşik şablon bunlardan herhangi birine dönüştürülebilir.

Liste **Yeni proje**dekiyle aynıdır. Yerleşik bir şablon, ColTex’in onun için yazdığı kurallarla doldurulur; diğer şablonlar (paylaşılan bir şablon, **Projelerimden biri** ile seçtiğiniz bir proje ya da bir derginin sunduğu ve **Şablon yükle (.zip)** ile yüklediğiniz zip) kendi biçimleriyle doldurulur: makalenin başlığı, yazarları, kurumları, özeti ve anahtar sözcükleri şablondaki örneklerin yerine yazılır ve ardından gelen örnek metin makalenizle değiştirilir. Şablonun sınıf ve stil dosyaları da gelir; örnek ana dosyası başvuru için projede kalır.

- Başlık, yazarlar, kurumlar, özet, paketler ve kaynakça **yeni bir projede** yeniden oluşturulur ve ardından derlenir. Özgün proje olduğu gibi kalır.
- Springer Nature'ın `sn-jnl` şablonuyla yazılmış makaleler de okunur; BMC, OUP ve Elsevier CAS makaleleri de öyle: ad ve soyadıyla yazarlar, kurumlar, `\abstract{}` ve yapılandırılmış özetler, anahtar kelimeler ve sondaki beyanlar bölümü.
- Bir rapor neyin değiştiğini ve neyin kontrol edileceğini listeler. Derlemede hata ya da raporda uyarı varsa **Aç ve YZ ile düzelt** yeni projeyi açar ve YZ ajanı yerleşik **template-conversion** Skill'ini izler: önce hangi dergiye ya da konferansa göndereceğinizi sorar, güncel yazar yönergelerini araştırır, makalenin derlenmesini sağlar ve içeriğini değiştirmeden yönergelere uydurur. Değişiklikleri incelemenizi bekler.
