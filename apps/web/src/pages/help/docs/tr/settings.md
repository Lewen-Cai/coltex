# Ayarlar

Sol alttaki avatarınıza tıklayın ve **Ayarlar**’ı seçin.

- **Hesap**: görünen adınız (ortak çalışanlara, yorumlarda ve geçmişte gösterilir), avatarınızın rengi (düzenleyicideki imlecinizin rengi de budur; **Otomatik**, ColTex’in seçtiği renktir) ve parolanız. Parolayı değiştirirken diğer cihazlarınızdaki oturumları kapatabilirsiniz. Parolalar en az 8 karakter olmalı ve bir büyük harf, bir küçük harf ve bir rakam içermelidir; simgeler isteğe bağlıdır. Yazarken gösterilen değerlendirme (zayıf, orta, iyi, güçlü) uzunluk ve simgelerle yükselir. Kayıt ve yönetici sıfırlamaları da aynı kurallara uyar. Oturum açma e-postanızı yalnızca bir yönetici değiştirebilir. İki adımlı doğrulama ve oturum açma etkinliğiniz de bu sayfadadır (aşağıda).
- **Görünüm**: tema (mavi tonlarda Açık ve Koyu, yeşil tonlarda Orman ve Yosun, mor tonlarda Lavanta ve Erik; varsayılan Açık) ve arayüz dili (aralarında English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français ve Deutsch bulunan 14 dil; başlangıçta tarayıcınızın dilidir). Koyu temalar düzenleyiciye de uygulanır; PDF sayfaları beyaz kalır. Tema hesabınızla birlikte saklanır, böylece sizi diğer tarayıcılara da izler (oturum açma sayfası her zaman Açık temayı kullanır); dil bu tarayıcıda saklanır.
- **Eşitleme hizmetleri**: Zotero hesabınızı bağlayın (bkz. [Kaynaklar](#/help/references)), git belirteçleri oluşturun ve iptal edin (bkz. [Dosyalar](#/help/files)): her biri Git, MCP veya ikisi için; okuma ve yazma ya da salt okunur; tüm projeleriniz veya bazıları için; bir son geçerlilik tarihiyle. Her bilgisayar için ayrı bir belirteç kullanın; böylece onu tek başına iptal edebilirsiniz.
- **Gruplar**: üyesi olduğunuz gruplar, yanıt bekleyen davetler ve yeni gruplar; aşağıya bakın.
- **YZ ajanı**: son 7, 30 veya 90 gündeki YZ kullanımınız (istekler, token’lar, maliyet; günlük ve modele göre) ve sınırınızdan kalan (YZ ajanına erişiminiz varsa), YZ ajanlarının sizin adınıza neleri değiştirebileceği (**İzinler**) ve kendi YZ ajanlarınızı belirteçleriyle **MCP** üzerinden bağlama; bkz. [YZ ajanı](#/help/ai).
- **YZ skills** (YZ ajanına erişiminiz varsa): kişisel skills, yerleşik skills ve skill yazmak için YZ ajanıyla bir sohbet; bkz. [YZ ajanı](#/help/ai).

## Gruplar

**Ayarlar → Gruplar** üyesi olduğunuz grupları listeler. Bir proje bütün bir grupla paylaşılabilir ([İş birliği](#/help/collaboration) bölümüne bakın) ve yöneticiler şablonları gruplarla paylaşır ([Şablonlar](#/help/templates) bölümüne bakın).

- Herkes grup oluşturabilir: **Grup oluştur** ve bir ad verin. Grubun sahibi siz olursunuz.
- Sahipler bu sunucuda hesabı olan herkesi **Ad veya e-posta ile davet et** ile davet eder. Kişi bir bildirim alır ve bu sayfadaki **Davetler** altında **Katıl** ile katılır ya da **Reddet** ile reddeder. O zamana kadar **Davet edildi** olarak görünür ve sahip **Daveti geri al** diyebilir.
- Bir üyenin ⋯ menüsünde sahipler onu **Sahip yap** (veya **Üye yap**) ve **Kaldır** yapabilir. Grubun ⋯ menüsünde sahipler için **Yeniden adlandır** ve **Grubu sil**, ayrıca **Gruptan ayrıl** vardır.
- Bir grubun her zaman sahibi olur: son sahip ayrılmadan önce başka birini sahip yapar ya da grubu siler.
- Gruptan ayrılmak, çıkarılmak veya grubun silinmesi, grupla paylaşılan projeleri kaybettirir; tek tek eklendiğiniz projeler hariç.

## İki adımlı doğrulama

İki adımlı doğrulama açıkken oturum açarken paroladan sonra telefonunuzdaki bir kimlik doğrulama uygulamasından (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…) bir kod istenir. Bu sizin seçiminizdir; başka kimse sizin için açamaz.

1. **Ayarlar → Hesap** bölümünde, **İki adımlı doğrulama** altında **Aç** düğmesine tıklayın ve parolanızı girin.
2. QR kodunu uygulamayla tarayın (veya kurulum anahtarını uygulamaya yazın), ardından uygulamanın gösterdiği 6 haneli kodu girin.
3. 10 **kurtarma kodunu** kaydedin (kopyalayın veya dosya olarak indirin). Telefonunuzu kaybederseniz her biri, kod yerine bir kez oturum açmanızı sağlar. Yalnızca şimdi gösterilirler.

Oturum açarken paroladan sonra uygulamadaki kodu girin veya **Kurtarma kodu kullan** düğmesine tıklayın. **Bu cihazda 30 gün boyunca tekrar sorma**, o tarayıcıda kodu atlar. **Yeni kurtarma kodları** eskilerinin yerini alır (yenilerini saklayın); **Kapat** yalnızca paroladan oluşan oturum açmaya döner. Git ve MCP belirteçleri eskisi gibi çalışır.

> Hem telefonu hem kurtarma kodlarını mı kaybettiniz? Sistem yöneticisi, sunucuda hesabınız için iki adımlı doğrulamayı kapatabilir (`coltex reset-2fa <email>`); ardından parolanızla oturum açar ve yeniden açabilirsiniz.

## Oturum açma etkinliği

**Ayarlar → Hesap** sayfasının altındaki **Oturum açma etkinliği**, hesabınıza yapılan oturum açmaları en yenisi önce olacak şekilde listeler: ne zaman olduğu, sonuç (oturum açıldı, yanlış parola, yanlış kod, reddedildi), tarayıcı ve sistem ve adresle birlikte nereden geldiği: yerel ağ, Tailscale veya internetteki bir adres için ülkesi, bölgesi, şehri ve ağ operatörü. Konumlar sunucudaki bir veritabanından gelir; adresler bunları bulmak için asla başka bir yere gönderilmez. Kayıtlar 90 gün saklanır.

Düzenleyici ayarları (yazı tipi boyutu, renkler, Vim…) düzenleyicinin sol çubuğunun altındaki **Ayarlar**’dadır; bkz. [Düzenleyici](#/help/editor).
