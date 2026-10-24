# YZ ajanı

Sol çubuktaki **YZ**, YZ ajanını açar. Bir yönetici bir model hizmeti bağladığında ve sizi bir YZ grubuna eklediğinde kullanılabilir; hangi modelleri kullanabileceğinize grup karar verir.

## Ne yapar

- LaTeX sorularını yanıtlar ve seçili kodu açıklar.
- Derleme hatalarını açıklar veya düzeltir (günlükte de bir "YZ ile düzelt" düğmesi vardır).
- Seçimi yeniden yazar, iyileştirir veya çevirir.
- Projeye genel bir bakış sunar, başvurulmayan etiketleri bulur vb.

Açık dosya, seçim ve son derleme hataları mesajınıza eklenir; bir eki dışarıda bırakmak için ona tıklayın.

## İzinler

YZ ajanının neleri değiştirebileceği size kalmıştır: **Ayarlar → YZ ajanı** bölümünde veya panelin altındaki model seçicide (düşünme düzeyinin altında) seçin; mesaj kutusunun altındaki satır seçiminizi gösterir. Aynı seçim, MCP üzerinden bağlanan kendi ajanlarınız için de geçerlidir (aşağıya bakın).

- **Elle** (varsayılan): YZ ajanının değişiklikleri bir taslağa gider ve siz uygulayana kadar hiçbir şey değişmez.
  1. İşini bitirdiğinde taslak deneme amaçlı derlenir ve hata ekleyip eklemediği size bildirilir.
  2. **Değişiklikleri incele**, farkı dosya başına gösterir; yalnızca bir kısmını uygulayabilirsiniz.
  3. **Seçilenleri uygula**, değişiklikleri projeye yazar ve derler; derleme kötüleşirse geri alınır. Uygulamadan önce bir sürüm kaydedilir.
  4. Uyguladıktan sonra **Geri al**, değişiklikleri geri alır ve bu arada başkalarının yaptığı düzenlemeleri korur.
- **Otomatik**: taslak, YZ ajanı yanıtını bitirir bitirmez aynı güvencelerle uygulanır: önce bir sürüm kaydedilir, proje derlenir, kötüleşen bir derleme geri alınır ve sonrasında **Geri al** kullanılabilir. Bu arada biri aynı satırları değiştirdiyse hiçbir şey uygulanmaz ve taslak sizi bekler. YZ ajanını durdurduğunuzda da taslağı sizi bekler.
- **Tam erişim**: Otomatik ile aynı; ayrıca YZ ajanı dosyaları silebilir, taşıyabilir ve yeniden adlandırabilir. Bunlar taslakta değil, hemen gerçekleşir; her yanıttaki ilk işlemden önce bir sürüm kaydedilir. Yanıt bunları değiştirdiği dosyalarla birlikte listeler.

Görüntüleyiciler ve inceleyiciler YZ ajanına soru sorabilir, ancak ajan onlar için hiçbir şeyi değiştiremez.

## Modeller ve düşünme

- Modeli panelin altında seçin. **Otomatik** ile ColTex soruya göre hafif veya güçlü bir model seçer.
- Düşünebilen modellerde düzey aynı seçicide ayarlanır; mesaj kutusunun altındaki satır onu gösterir.

## Sohbetler ve bağlam

- Sohbetler sizin için proje başına kaydedilir (başkaları asla görmez). **Yeni sohbet** yeni bir sohbet başlatır; **Sohbetler** öncekileri listeler: açın, yeniden adlandırın veya silin. Bir sohbeti yeniden açmak onu kaldığı yerden sürdürür; uygulanmamış bir taslak saklanmaz, bu yüzden böyle bir sohbetten ayrılırken önce sorulur.
- Mesaj kutusunun altındaki halka, sohbetin modelin bağlam penceresinin ne kadarını kullandığını gösterir (ör. `12k / 200k`). %70’te kehribar, %90’da kırmızı olur.
- YZ grubunuzun bir kullanım sınırı varsa yanındaki bir çubuk bu gün, hafta veya ay ne kadar kullandığınızı gösterir (ayrıntılar için üzerine gelin). Sınıra ulaştığınızda mesajlar sonraki döneme kadar bekler. **Ayarlar → YZ ajanı**, son 30 gündeki kullanımınızı ve kalanı gösterir.
- Komutlar için mesaj kutusuna `/` yazın:
  - `/compact`: şimdiye kadarki sohbeti özetleyip özetten devam ederek bağlamı boşaltır. Mesajlar görünür kalır; YZ ajanı onları özet aracılığıyla hatırlar.
  - `/new`: yeni bir sohbet başlatır.
  - `/chats`: önceki sohbetler.

## Skills

Skill, tekrar tekrar yaptığınız bir görev için bir talimat kümesidir; örneğin "özeti derginin sınırına kadar kısalt" veya "her şekle başvurulduğunu denetle". Skills, Agent Skills biçimini (ad, açıklama ve talimatları içeren bir `SKILL.md`) kullanır; bu nedenle başka YZ ajanları için yazılmış skills burada da çalışır.

- **Kişisel skills** **Ayarlar → YZ skills** bölümündedir; onları yalnızca siz görürsünüz ve her projede kullanabilirsiniz.
- Hazır skills için **İçe aktar** kullanın: **Dosya yükle**, başvuru dosyalarıyla birlikte bir `SKILL.md` veya skill klasörlerinden oluşan bir `.zip` alır; **Klasör yükle**, tek bir skill klasörünü veya birkaç skill içeren bir klasörü alır. Bir skill içindeki betikler YZ ajanının okuyabileceği metin olarak saklanır; bir skill içindeki hiçbir şey asla çalıştırılmaz.
- Bir skill kullanmak için `/` yazıp onu seçin, ardından mesajınızı ekleyin (`/polish-abstract keep it under 200 words`). YZ ajanı açıklamaları da okur ve isteğiniz bir skill açıklamasına uyduğunda o skill kendiliğinden yüklenir.
- YZ ajanından bir şeyden skill oluşturmasını isteyin ("kaynakçayı az önce nasıl düzelttiğimizi skill olarak kaydet"): sohbette bir taslak hazırlar; siz onu düzenler ya da kişisel skill olarak kaydedersiniz.
- **Ayarlar → YZ skills** bölümünde kişisel skills solda listelenir; talimatlarını ve başvuru dosyalarını okumak için birini seçin ya da skill yazmak üzere YZ ajanıyla bir sohbet açmak için **YZ ile oluştur** düğmesine tıklayın (kişisel skills arasından birinde **Sohbette iyileştir**, o skill hakkında bir mesaj başlatır). Sohbet yerleşik **skill-creator** adlı skill talimatlarını izler: skill ile ne yapmak istediğinizi sorar, taslağını hazırlar (yararlı olduğunda başvuru dosyalarıyla) ve bir taslağı yapıştırdığınız bir metin üzerinde deneyebilir. Taslaklar yalnızca siz kaydettiğinizde kaydedilir; zaten kullandığınız bir adla kaydetmek, değiştirmeden önce sorar. Sohbet, yeni bir sohbet başlatana kadar saklanır.
- ColTex yerleşik skills ile gelir (**Yerleşik** altında listelenir). Onları okuyabilir ve indirebilirsiniz ama değiştiremezsiniz; aynı adlı kişisel bir skill varsa onun yerine o kullanılır.
  - **skill-creator**: skill yazma (skills sohbeti bunu izler).

## Kendi YZ araçlarınız (MCP)

Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline veya OpenCode gibi YZ araçları projeleriniz üzerinde doğrudan çalışabilir: projeleri listeleyebilir, dosyalarını okuyup arayabilir, düzenleyebilir, derleyip günlüğü okuyabilir, geçmişi görebilir ve yorumları okuyabilir, ekleyebilir ve yanıtlayabilir. ColTex onlar için tüm projeleriniz için tek bir adresi olan bir MCP sunucusudur; araç üzerinde çalıştığı projeyi adıyla belirtir.

**Ayarlar → YZ ajanı** bölümünde, **YZ araçlarınız (MCP)** altında solda aracınızı seçin ve üç adımı izleyin: adres, bir belirteç (**Belirteç oluştur**; bir kez gösterilir) ve ikisi de doldurulmuş olarak kopyalanacak yapılandırma. HTTP üzerinden, belirteç için bir başlıkla MCP sunucularına bağlanan başka herhangi bir araç da çalışır (**Diğer**). Yalnızca OAuth ile oturum açan sunucuları kabul eden uygulamalar (Claude’un veya ChatGPT’nin özel bağlayıcıları gibi) henüz bağlanamaz.

Araçlarınızın neleri değiştirebileceği **Ayarlar → YZ ajanı** bölümündeki izninize göre belirlenir:

- **Elle** (varsayılan): düzenlemeleri sizin önerileriniz olur; siz ve ortak çalışanlarınız bunları **İnceleme** bölümünde kabul eder veya reddeder. Yeni dosyalar doğrudan oluşturulur.
- **Otomatik**: düzenlemeleri sizin düzenlemeleriniz gibi doğrudan uygulanır. Sizin için değişiklik izleme açıksa yine de öneri olurlar.
- **Tam erişim**: Otomatik ile aynı; ayrıca dosyaları silebilir, taşıyabilir ve yeniden adlandırabilirler.

Bir aracın bir süredir yaptığı ilk değişiklikten önce projenin durumu bir sürüm olarak kaydedilir; böylece geri dönebilirsiniz. İnceleyicilerin araçları yalnızca değişiklik önerebilir, görüntüleyicilerin araçları yalnızca okuyabilir ve yorum yapabilir.

### Güvenlik

- Belirtecinize sahip olan herkes sizin adınıza işlem yapar: onu bir parola gibi saklayın ve artık ihtiyacınız olmadığında belirteç listesinden iptal edin (araç veya bilgisayar başına bir belirteç bunu kolaylaştırır). Oluştururken her belirtece yalnızca gerekenleri verin:
  - **Kullanım amacı**: Git, MCP veya ikisi. Yalnızca MCP için oluşturulan bir belirteç klonlayamaz veya itemez; tersi de geçerlidir.
  - **Erişim**: **Salt okunur**, izniniz ne olursa olsun bir aracın listelemesine, okumasına, aramasına ve derlemesine izin verir, ancak dosyaları veya yorumları değiştirmesine izin vermez (git için de klonlama ve çekmeye izin verir, itmeye vermez).
  - **Projeler**: tüm projeleriniz veya yalnızca seçtikleriniz; diğerleri belirteç için yoktur.
  - **Son geçerlilik**: 30 gün, 90 gün, bir yıl sonra veya hiçbir zaman. Süresi dolan bir belirteç çalışmayı durdurur; onu iptal edip yenisini oluşturun.
- ColTex yalnızca aracınıza yanıt verir; asla başka MCP sunucularına bağlanmaz. Aracınızın başka neler yapabileceği (Playwright MCP üzerinden bir tarayıcı, bir terminal, başka hizmetler) araca ve onun kendi ayarlarına bağlıdır. Bir projenin metni, yorumları ve günlükleri ortak çalışanlarınız tarafından yazılabilir; bu yüzden bunları okuyan bir araçtan, o metnin içinde, diğer yetenekleriyle bir şey yapması istenebilir. ColTex araçlara proje içeriğini talimat olarak değil içerik olarak ele almalarını söyler, ancak bunu yalnızca aracınız uygulayabilir: ColTex dışındaki işlemler için aracın kendi onaylarını açık tutun ve bir aracın bir tarayıcısı veya terminali de varsa **Elle** kullanın.
- ColTex’te oturum açmış bir tarayıcısı olan bir araç, MCP üzerinden değil web sayfaları üzerinden tüm haklarınızla işlem yapar; bu yüzden yukarıdaki izin onu orada sınırlamaz. Bu tür araçların oturum açılmamış bir tarayıcı profili kullanmasını sağlayın.
