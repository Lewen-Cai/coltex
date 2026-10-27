# Yönetim

Sistem yöneticisi, avatar menüsündeki **Ayarlar** altında Yönetim sayfalarını görür; yöneticiler orada kendi ekipleri için **Kullanıcıları yönet** ve **Davetler** sayfalarını görür.

## Kullanıcılar ve davetler

- Herkese açık kayıt yoktur: hesaplar yalnızca davet bağlantılarından gelir ve projeler yalnızca hesabı olan kişilerle paylaşılır.
- Hesapların üç rolden biri vardır:
  - **Üye**.
  - **Yönetici**: bir **ekip** yönetir; örneğin bir danışman ve öğrencileri. Bir yöneticinin davet ettiği üyeler yöneticinin ekibine katılır ve yönetici yalnızca onları yönetir.
  - **Sistem yöneticisi**: tam olarak bir tane vardır; ilk çalıştırma kurulumunda oluşturulan hesap. Tüm örneği (YZ hizmetleri, yedekler, ağ) yönetir ve herkesi görür. Kimse ikinci sistem yöneticisi yapılamaz; böylece tek bir yönetici hesabı örneği ele geçiremez.
- **Davetler**: tek kullanımlık, son geçerlilik tarihi olan bağlantılar; tek bir e-posta için veya (e-posta boş bırakılırsa) bağlantıya sahip herkes için. Bekleyen bir davetin bağlantıları listede kalır (**Bağlantı**); ColTex’e erişilebilen her adres (yerel ağ, Tailscale, Cloudflare) için bir tane. Sistem yöneticisi üye veya yönetici davet eder ve yeni hesap için **YZ grubu** seçer. Yöneticiler yalnızca üye davet eder ve bu üyeler kendi ekiplerine katılır; bu üyeler yöneticinin YZ grubunu alır. Yöneticiler yalnızca kendi davetlerini görür ve iptal eder.
- **Kullanıcıları yönet**: sistem yöneticisi her hesabı görür, kişileri üye veya yönetici yapar, üyeleri ekipler arasında taşır (satırın menüsündeki **Ekip**), parolaları sıfırlar, **Oturum açmalar ve cihazlar** sayfasını açar ve hesapları askıya alır veya siler. Liste, **Kilitli** olan hesapları ve **İki adımlı** doğrulaması açık olanları işaretler. Bir yönetici kendisini ve ekibini görür; parolaları sıfırlama, askıya alma ve silme işlemlerini yalnızca kendi ekibinin üyeleri için yapar. Bir hesabı silmek, sahibi olduğu projeleri de siler.
- Sistem yöneticisi rolünü başka birine devretmek (veya o hesap kaybolduğunda geri almak) için sunucuda `coltex cli system-admin <email>` komutunu çalıştırın; önceki sistem yöneticisi yönetici olur.
- Bir parolayı mı unuttunuz, sistem yöneticisininki dahil? Sunucuda `coltex cli reset-password <email>` komutunu çalıştırın: yeni parolayı iki kez sorar ve o hesabın tüm oturumlarını kapatır. Hesabın sahibi bunun yapıldığına dair bir bildirim alır ve sunucunun günlüğü (`coltex logs`) bunu kaydeder.
- İki adımlı doğrulama için kullanılan telefonu ve kurtarma kodlarını mı kaybettiniz? `coltex reset-2fa <email>` o hesap için doğrulamayı kapatır (hesabın sahibine bir bildirim gider ve sunucunun günlüğüne bir satır yazılır).

## Oturum açmalar

**Oturum açmalar** sayfasını yalnızca sistem yöneticisi görür: örneğe yapılan her oturum açma (hesabı olmayan e-postalarla yapılan denemeler de), sonucu, tarayıcısı ve sistemiyle ve adresle birlikte nereden geldiği. Bir kişinin oturum açmalarını ve oturumunun açık olduğu cihazları görmek için ona tıklayın (veya Kullanıcıları yönet’teki **Oturum açmalar ve cihazlar** seçeneğini kullanın); **Oturumu kapat** tek bir cihazın oturumunu, **Her yerde oturumu kapat** tümünü sonlandırır. Diğer herkes yalnızca kendi oturum açmalarını **Ayarlar → Hesap** bölümünde görür.

ColTex oturum açmayı dış hizmetler olmadan kendisi korur. Bir hesap son 90 gün içinde bir adresten oturum açtıysa o adres, hesap için tanıdık sayılır.

- Tanıdık olmayan adreslerden gelen başarısız denemeler, adres ne olursa olsun hesap için sayılır: üçüncü denemeden itibaren tarayıcı önce küçük bir bulmaca çözer (iş kanıtı, yaklaşık bir saniye, otomatik); 5 başarısız denemeden sonra 15 dakika beklenir; 10 denemeden sonra hesap tanıdık olmayan adreslere karşı **kilitlenir**. Sistem yöneticisi bir bildirim alır ve kilidi burada ya da Kullanıcıları yönet’te açar (**Kilidi aç**).
- Tanıdık adreslerden her 5 başarısız deneme 15 dakika beklemeye yol açar ve bu adresler asla kilitlenmez: hesap kilitliyken sahibi, genellikle çalıştığı yerden yine oturum açabilir.
- İnternetteki bir adres, hangi hesaplarla olursa olsun bir saat içinde 20 kez başarısız olursa bir gün boyunca engellenir; engellenen adresler **Oturum açmalar** sayfasının üstünde **Engeli kaldır** ile listelenir. Yerel ağdaki veya tailnet’teki adresler asla engellenmez: birkaç kişi aynı adresi paylaşıyor olabilir.

Kendiniz mi dışarıda kaldınız? Sunucuda `coltex unlock <email>` (engellenen bir adres için `coltex unlock <address>`) komutunu çalıştırın.

## YZ hizmetleri

- **YZ hizmetleri**: sağlayıcıları API anahtarlarıyla veya abonelik oturumuyla (Claude Pro/Max, ChatGPT, Copilot…) ya da kendi OpenAI uyumlu sunucularınızla (Ollama, vLLM, LM Studio…) bağlayın. Anahtarlar şifreli saklanır, üyeler onları asla görmez ve istekler bu sunucu üzerinden gider.
- Bir abonelik oturumu açılmayan bir localhost adresinde biterse, adres çubuğundaki tam adresi kopyalayıp ColTex’e geri yapıştırın.
- **Otomatik** için üç modeli ayarladığınızda herkes otomatik seçimle başlar: **karar** modeli (ucuz, hızlı bir model) her mesajı okur ve onu **hafif** modele (kısa sorular, küçük düzeltmeler) ya da **güçlü** modele (birkaç hata, dosyalar arası değişiklikler, özenli yazım) verir. Üçü de ayarlanana kadar kişiler kullanabilecekleri ilk modelle başlar.
- **Web araması**: Anthropic, OpenAI ve ChatGPT modelleri kendi yerleşik aramalarıyla arar, ayarlanacak bir şey yoktur. Diğer modeller için bir arama hizmeti (DeepSeek, Tavily, Exa veya Brave Search) **bağlayın** ve API anahtarını yapıştırın; DeepSeek bağlı bir DeepSeek sağlayıcısının anahtarını da kullanabilir. Menüsündeki **Test** bir arama yapar. Bazı hesapların önce sağlayıcıda yerleşik aramaya izin vermesi gerekir: istekler başarısız olursa o sağlayıcının menüsünden kapatın, modelleri arama hizmetini kullanır. YZ ajanına sahip herkes web’i kullanabilir ve kullanabildiği sürece YZ ajanının değişiklikleri her zaman incelemeyi bekler.
- **Birden çok arama hizmeti**: istediğiniz kadar bağlayın; kullanılan **Kullanımda** olarak işaretlenir ve başka birinin menüsündeki **Arama için kullan** ona geçer. Kullanımdaki kaldırılırsa sıradaki bağlı hizmete geçilir.
- **YZ kullanımı ve erişimi**: grup için ve kişi başına istekler ve token’lar. Kimin hangi modelleri kullanabileceği **YZ grupları** ile ayarlanır: her grup sağlayıcılara (sonradan eklenen modeller dahil) veya tek tek modellere izin verir; ör. güçlü modelle "Doktora öğrencileri" ve hafif modelle "Lisans öğrencileri". Herkes en fazla bir gruptadır; grup davette ya da sonradan listede kişi açılarak seçilir. Hiçbir grupta olmayanlar YZ ajanını kullanamaz; bu yüzden yeni kişilerin, sistem yöneticisi onları eklemedikçe YZ erişimi yoktur (bir yöneticinin davet ettiği üyeler yöneticinin grubunu alır). Sistem yöneticisi her zaman tüm modelleri kullanabilir. Bir grubu silmek, üyelerini başka bir gruba katılana kadar YZ’siz bırakır.

  Bir grup, üyelerinin her birinin günlük, haftalık veya aylık kullanımını da sınırlayabilir: token, maliyet (liste fiyatlarıyla) veya ikisi birden. Bir üye sınıra ulaştığında sonraki dönem başlayana kadar (sunucunun saat diliminde takvim günleri, pazartesiden başlayan haftalar, aylar) mesajları reddedilir; sınırı aşan mesaj yine de tamamlanır. Üyeler ne kadar kullandıklarını YZ ajanının mesaj kutusunun altında görür. Sistem yöneticisinin sınırı yoktur.

  Tek bir kişiyi ayarlamak için onu listede açın: **Özelleştir** altında **Kişiye özel model erişimi** ve **Kişiye özel kullanım sınırı**, açık oldukları sürece grubun ayarlarının yerini alır (kişiye özel erişim grup olmadan da çalışır). Liste bu kişileri **Özelleştirildi** olarak işaretler.

## Depolama ve yedekler

- Proje dosyaları yerel diskte veya S3 uyumlu depolamada tutulur; bu, sunucu başlarken ayarlanır (`STORAGE` ve `S3_*`). Geçmiş, derleme çıktısı ve derleyicinin çalışma kopyaları veri dizininde kalır.
- **WebDAV yedekleri** Nextcloud, ownCloud, bir NAS veya herhangi bir WebDAV sunucusundaki bir klasöre gider. Her yedek; veritabanını, her projenin dosyalarını ve geçmişlerini içeren tek bir dosyadır. Yedeklemeyi günlük veya haftalık zamanlayın ve kaç yedeğin saklanacağını seçin. Sunucu sunuyorsa bir uygulama parolası kullanın.
> **Şifreleme**: şifreli yedekler (AES-256) örnek gizli anahtarını da içerir; böylece geri yüklemeden sonra bağlı YZ hizmetleri ve iki adımlı doğrulama çalışmaya devam eder. **Parolayı başka bir yerde saklayın: o olmadan yedek açılamaz.** Şifresiz bir yedekten yeni bir sunucuya (yeni bir örnek gizli anahtarıyla) geri yükleme yapıldıysa, iki adımlı doğrulaması açık olan kişiler, siz onlar için `coltex reset-2fa <email>` çalıştırana kadar oturum açamaz.
- Geri yükleme, sunucu durdurulmuşken sunucuda `restore` komutuyla yapılır; bkz. işletim kılavuzu.

## İzleme

**Genel bakış**, sunucunun, derleyicinin ve veritabanının canlı durumunu CPU, bellek ve derlemeler için geçmiş grafikleriyle gösterir. Sunucu her 10 saniyede bir örnek alır ve 30 gün saklar; sayfayı kimse açmamışken de.

## Ağ

**Ağ**, ColTex’e erişilen adresleri listeler (davetler ve Git adresleri bunları kullanır), yerleşik Tailscale ve Cloudflare Tunnel’ı açar ve isteklerin sunucuya nasıl ulaştığını gösterir. Bkz. [Kurulum ve ağ](#/help/deployment).
