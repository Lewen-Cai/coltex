# Düzenleyici

## Kod ve görsel kip

Araç çubuğundaki **Kod / Görsel**, nasıl düzenleyeceğinizi değiştirir; ikisi de aynı LaTeX kaynağını düzenler.

- **Kod**: vurgulama, otomatik tamamlama ve parantez eşleştirmeyle kaynağın kendisi. İmleç matematik içindeyken dizilmiş denklem üstünde gösterilir (`Esc` gizler).
- **Görsel**: başlıklar, kalın yazı, listeler, matematik, tablolar ve şekiller dizilmiş gibi görünür; imlecin bulunduğu yerde kaynak görünür. Metni okumak ve düzenlemek için uygundur.

## Araç çubuğu

Başlık düzeyi, kalın, italik, matematik, simgeler, bağlantılar, `\ref`, `\cite`, şekiller, tablolar, listeler ve arama. Sığmayan düğmeler **⋯** menüsüne gider.

- **Simgeler** (Σ): kategorilere göre Yunan harfleri, işleçler, oklar ve daha fazlası; eklemek için tıklayın.
- **Tablolar**: eklerken boyutu seçin. Görsel kipte hücrelerini düzenlemek için bir tabloya tıklayın (`Tab` hücreler arasında gezinir); tablonun araç çubuğu satır ve sütun ekler ve kaldırır, hücreleri birleştirir, hizalama ve kenarlıkları ayarlar.
- **Şekiller**: bir görüntü yükleyin, projeden birini seçin ya da düzenleyiciye bir görüntü yapıştırın veya bırakın. Görsel kipte bir şeklin düzenleme düğmesi genişliğini, resim yazısını ve etiketini değiştirir.

## Otomatik tamamlama

`\` yazmak komutlar önerir; `\ref{` ve `\cite{` projenin etiketlerini ve kaynakça anahtarlarını listeler. `Ctrl+Space` önerileri istediğiniz zaman açar.

## Hatalar

- **Derleme hataları**: son derlemenin açık dosyadaki hata ve uyarıları satır numarasının yanında bir nokta alır ve hataların altı çizilir. LaTeX mesajını ve bir açıklamayı görmek için üzerine gelin.
- **Kod denetimi**: derlemeden, siz yazarken denetler: kapatılmamış veya eşleşmeyen ortamlar, fazladan bir `}` veya `$`, matematik dışında matematik komutları. Yazmakta olduğunuz yer işaretlenmez. Bir bölümü atlamak için çevresine `%%begin novalidate` ve `%%end novalidate` koyun.

## Yazım denetimi

Yanlış yazılan sözcüklerin altı kırmızı noktalı çizgiyle çizilir (CJK metin denetlenmez). Öneriler veya **Sözlüğe ekle** için birine sağ tıklayın. Dil bir proje ayarıdır.

Sözlüğünüz, düzenleyicinin çubuğunun altındaki **Ayarlar → Sözlük** bölümündedir; içindeki sözcükler tüm projelerinizde doğru sayılır. Bir sözcüğü bulmak için alana yazın; henüz yoksa eklemek için Enter’a basın; listenin üstündeki harfler o harfe atlar. **⋯** menüsü bir metin dosyasını içe aktarır (satır başına bir sözcük ya da boşluk veya virgülle ayrılmış; Hunspell `.dic` dosyaları da çalışır), sözcüklerinizi `dictionary.txt` olarak dışa aktarır ve hepsini kaldırır. Açık düzenleyiciler sözcükleri hemen yeniden denetler.

## Sağ tık menüsü

Kes, kopyala, yapıştır, tümünü seç, sil, PDF’te göster ve yorum ekle. `\ref{…}` üzerinde **Etikete git**; `\input{…}` veya `\include{…}` üzerinde **Dosyayı aç** sunar.

## Ana hat ve içerik haritası

- Dosya ağacının altındaki **Dosya ana hattı**, açık dosyanın bölümlerini listeler; oraya gitmek için birine tıklayın. İçinde bulunduğunuz bölüm vurgulanır.
- Düzenleyicinin üstündeki satır, imleç için "dosya › bölüm › alt bölüm" gösterir; bir bölüme gitmek için ona tıklayın. Düzenleyici ayarlarından kapatılabilir.

## Arama

`Mod+F` (veya `Mod+Shift+F` ya da araç çubuğunun arama düğmesi), seçili metni doldurarak soldaki **Ara** panelini açar. Panel, açık dosyanın eşleşmeleri önce gelecek şekilde tüm projede; düzenli ifadeler, büyük/küçük harf ve tam sözcük eşleştirmesiyle arar ve tek bir eşleşmeyi veya tümünü değiştirir. Tümünü değiştirmeden önce bir sürüm kaydedilir.

## Düzenleyici ayarları

Sol çubuğun altındaki **Ayarlar**, ayarlarını soldaki kategorilerde toplar:

- **Proje**: derleyici, ana belge, yazım denetimi dili (düzenleyiciler herkes için değiştirir) ve Git klonlama adresi;
- **Görünüm**: yazı tipi boyutu, yazı tipi (eş aralıklı veya tırnaksız), satır yüksekliği, **Kod renkleri** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark ve daha fazlası; yalnızca kod kipinde), içerik haritası;
- **Düzenleme**: tuş atamaları (varsayılan, Vim veya Emacs) ve kod denetimi, denklem önizlemesi, parantezleri otomatik kapatma ve otomatik tamamlama için anahtarlar;
- **Klavye kısayolları**: aşağıya bakın;
- **İşlemler**: sözcük sayısı, kopyalama, Word'e aktarma, şablon dönüştürme, şablon olarak yayımlama.

Görünüm, düzenleme ve kısayollar size aittir; bu tarayıcıda, her proje için saklanır.

## Klavye kısayolları

Sol çubuktaki **Kısayollar** hepsini listeler. En çok kullanılanlar:

| İşlem | Tuşlar |
| --- | --- |
| Derle | `Mod+S` veya `Mod+Enter` |
| Geri al / yinele | `Mod+Z` / `Mod+Shift+Z` |
| Ara ve değiştir | `Mod+F` |
| Kalın / italik | `Mod+B` / `Mod+I` |
| Satırları yorum satırı yap veya geri al | `Mod+/` |
| Satıra git | `Mod+Alt+G` |
| Seçime yorum yap | `Mod+Alt+M` |
| Önerileri göster | `Ctrl+Space` |

Tuşlar sisteminize göre gösterilir: Mac’te ⌘, ⌥ ve ⇧; Windows ve Linux’ta Ctrl, Alt ve Shift. Bunlar varsayılan tuşlardır.

### Kendi kısayollarınız

Ayarlardaki **Klavye kısayolları** bölümünde bir komutun yanındaki **Değiştir** düğmesine tıklayın ve yeni tuşlara basın. Ctrl (Mac’te ⌘) veya Alt gerekir; başka bir komutun kullandığı ya da tarayıcıya ve temel düzenlemeye ayrılmış tuşlar (geri alma, kopyalama, yapıştırma, tümünü seçme…) alınamaz. Birini veya tümünü sıfırlayın. Araç çubuğu ipuçları ve kısayol listesi bundan sonra sizin tuşlarınızı gösterir.
