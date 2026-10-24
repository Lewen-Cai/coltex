<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Yerleşik bir YZ ajanı olan, kendi sunucunuzda barındırılan, birlikte çalışmaya yönelik bir LaTeX düzenleyicisi.</strong><br>
  Sizin sunucunuz · Sizin hesaplarınız · Sizin verileriniz · Gerçek zamanlı iş birliği · Açık kaynak (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd>Español</kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd><b>Türkçe</b></kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Kurulum</a> · <a href="#configure">Yapılandırma</a> · <a href="../CHANGELOG.md">Değişiklik günlüğü</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Son sürüm"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="ColTex düzenleyicisi: dosyalar, LaTeX kaynağı, derlenmiş PDF ve YZ ajanı" width="900">
</p>

<a id="why"></a>
## Neden ColTex?

ColTex; bir araştırma grubu, bir laboratuvar ya da yalnızca kendiniz için, denetiminizdeki bir bilgisayarda çalışan bir Overleaf alternatifidir: laboratuvardaki bir masaüstü bilgisayar, evdeki bir sunucu veya bir bulut makinesi.

- **Her şey sunucunuzda kalır.** Projeler, geçmiş, hesaplar ve derleme işleri asla sunucudan çıkmaz. TeX, internet erişimi olmayan, korumalı bir kapsayıcıda çalışır.
- **Birlikte yazmak için tasarlandı.** Birden çok kişi aynı dosyayı aynı anda düzenler; yorumlar, değişiklik izleme, sohbet ve sürüm geçmişi de vardır.
- **Projeniz üzerinde çalışan bir YZ ajanı.** Dosyaları ve derleme günlüğünü okur, değişiklik taslakları hazırlar, bunları deneme amaçlı derler ve size bir fark gösterir. Siz uygulayana kadar hiçbir şey yazılmaz.
- **Tek komutla kurulum, açılacak bağlantı noktası yok.** Uzaktan erişim için Tailscale ve Cloudflare Tunnel yerleşiktir.

<a id="features"></a>
## Özellikler

### Yazma ve derleme
- Kaynak düzenleyici (CodeMirror) ve Overleaf’in tablo düzenleyicisi ile şekil iletişim kutusunu içeren görsel düzenleyici, araç çubuğu, simge paleti, ana hat ve içerik haritası.
- LaTeX tamamlamaları, kod denetimi, denklem önizlemesi, birçok dilde yazım denetimi, sözcük sayısı, proje genelinde ara ve değiştir, Vim veya Emacs tuşları.
- Tam bir TeX Live üzerinde latexmk ile derler. Motor (pdfLaTeX, XeLaTeX veya LuaLaTeX) belgeye göre seçilir; Çince de dahil (ctex, xeCJK).
- Ayrı bir pencerede de açılabilen, iki yönlü SyncTeX destekli PDF önizlemesi. Derleme hatalarının altı kaynakta çizilir ve anlaşılır ipuçları verilir.
- Kaynaklar: `.bib` dosyalarınızdan atıf yapın, girdi eklemek için Crossref ve arXiv’de arayın (veya bir DOI ya da arXiv kimliği yapıştırın) ya da bir Zotero kitaplığını veya koleksiyonunu içe aktarıp eşitli tutun.

### İş birliği
- Herkesin imleçleriyle gerçek zamanlı düzenleme, @bahsetmeli yorumlar, değişiklik izleme (kabul etme, reddetme ve bir kararı geri alma), proje sohbeti ve uygulama içi bildirimler.
- Proje başına roller: sahip, düzenleyici, inceleyici (yalnızca öneriler) ve görüntüleyici.
- git benzeri sürüm geçmişi: otomatik sürümler, mesajla kaydedilen sürümler ve tek bir sürümün değişikliklerini geri alma.
- Git erişimi: bir projeyi klonlayın, yerelde üzerinde çalışın ve geri itin (kişisel belirteçler; bu arada tarayıcıda yapılan düzenlemeler birleştirilir).

### YZ ajanı
- LaTeX, projeniz veya yazınız hakkında soru sorun ya da derleme hatalarını düzeltmesine izin verin. Değişikliklerin taslağını özel bir kopyada hazırlar, deneme amaçlı derler ve bir fark gösterir; tamamını veya bir kısmını siz uygularsınız.
- Uygulama önce bir sürüm kaydeder ve yeniden derler; derleme kötüleşirse değişiklik otomatik olarak geri alınır.
- Sağlayıcılar: API anahtarları (Anthropic, OpenAI, DeepSeek, Google, OpenRouter ve diğerleri), abonelik oturumu (Claude Pro/Max, ChatGPT, GitHub Copilot ve diğerleri) veya kendi OpenAI uyumlu sunucunuz (Ollama, vLLM, LM Studio).
- Otomatik model seçimi (mesaj başına hafif veya güçlü bir model), kişi grupları için erişim, kişi başına kullanım ve günlük, haftalık veya aylık kullanım sınırları.
- Proje başına kaydedilen sohbetler, ilerledikçe gösterilen bağlam penceresi ve uzun bir sohbeti özetlemek için `/compact`.
- Skills: ajanın izlediği, size ve projeye ait talimatlar (Agent Skills biçimi), `/name` ile kullanılır; kendiniz yazın, içe aktarın veya Ayarlar’da YZ ile oluşturun.
- Claude Code’unkine benzer izinler: YZ ajanının değişiklikleri incelemenizi bekler (Elle), ajan bitirdiğinde uygulanır (Otomatik) ya da ajan dosyaları silip taşıyabilir de (Tam erişim).
- MCP üzerinden kendi ajanınız (Claude Code, Codex, Cursor…): tüm projeleriniz için tek bir adres, aynı izinlerle (Elle kipinde düzenlemeleri sizin önerileriniz olur).

### Projeler ve yönetim
- IEEE, ACM, Springer LNCS, Elsevier, REVTeX ve arXiv şablonları ve bir makalenin bir dergi şablonundan diğerine dönüştürülmesi.
- Overleaf zip içe ve dışa aktarma, bir URL’den veya başka bir projeden bağlanan dosyalar, etiketler, arşiv ve çöp kutusu.
- Herkese açık kayıt yok: hesaplar davet bağlantılarından gelir. Bir sistem yöneticisi ve her biri davet ettiği ekibi yöneten yöneticiler.
- İzleme, WebDAV yedekleri (isteğe bağlı şifreli), yerel veya S3 uyumlu depolama, açık ve koyu temalar ve 14 dilde arayüz (İngilizce, Çince, Japonca, Korece, İspanyolca, Fransızca, Almanca, Portekizce, İtalyanca, Rusça, Türkçe, Vietnamca ve Endonezce).

<a id="install"></a>
## Kurulum

Docker yüklü bir Linux veya macOS makinesine (Linux’ta kurulum aracı Docker’ı kurabilir), en az 2 CPU çekirdeğine ve 4 GB belleğe ihtiyacınız var. İmajlar x86-64 ve ARM64 için hazır derlenmiştir.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

İndirme yarıda kesilirse (`curl: (35) Recv failure: Connection reset by peer`, GitHub’a erişmek zor olduğunda sık görülür) komutu yeniden çalıştırın.

Kurulum aracı dili ve TeX Live sürümünü (edition) sorar (ok tuşlarıyla), en son sürümü `~/coltex` içine alır, hazır imajları bir ilerleme çubuğuyla indirir, ColTex’i başlatır ve açılacak adresleri yazdırır. Çıktının tamamı `~/coltex/install.log` dosyasına gider. Ardından `http://<server>:3690` adresini açın ve yönetici hesabını oluşturun. Tailscale veya Cloudflare Tunnel üzerinden uzaktan erişim daha sonra **Ayarlar → Ağ** bölümünden açılır.

İlk başlatma TeX Live’ı indirir. Bir sürüm seçin:

| Sürüm | İndirme | Disk (tüm ColTex) | Gereken boş alan |
| --- | --- | --- | --- |
| **standard** (varsayılan) | yaklaşık 3 GB | yaklaşık 12 GB | 20 GB |
| **full** (`--edition full`) | yaklaşık 8 GB | yaklaşık 23 GB | 35 GB |

İkisinde de TeX Live’ın tüm paketleri vardır ve aynı belgeleri derler; YZ ajanı ikisiyle de çalışır. standard sürümünde paket kılavuzları yoktur; full sürümü kılavuzları ve kaynakları ekler, YZ ajanı bunları da okuyabilir.

`--edition` ve `--lang` soruları yanıtlar ya da terminal olmayan yerlerde onların yerini alır. `--domain`, `--tailscale` ve Cloudflare seçenekleri, betikle yapılan kurulumlarda uzaktan erişimi kurulum sırasında ayarlar. Seçenekleri `bash -s --` sonrasına ekleyin:

| Seçenek | |
| --- | --- |
| `--domain tex.example.org` | Kendi alan adı olan bir sunucu için, birlikte gelen Caddy üzerinden HTTPS. Alan adını sunucuya yönlendirin ve 80 ile 443 numaralı bağlantı noktalarını açın |
| `--tailscale` | ColTex’i tailnet’inize ekler: bir oturum açma bağlantısı ve bir QR kodu yazdırır |
| `--cloudflare-token TOKEN` | Kendi alan adınız için oluşturduğunuz bir Cloudflare tünelini bağlar |
| `--cloudflare-quick` | Denemek için geçici, genel bir `trycloudflare.com` adresi |
| `--edition full` | Tam (full) TeX Live sürümü |
| `--lang LANG` | Kurulum aracının, `coltex` komutunun ve kurulum sayfasının dili: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` veya `id` (verilmezse sorulur) |
| `--port 3690` | Başka bir bağlantı noktası |
| `--version v0.0.1` | Belirli bir sürüm (geliştirme dalı için `main`) |
| `--build` | İmajları indirmek yerine bu makinede kaynaklardan derler |
| `--images REGISTRY` | İmajların nereden indirileceği: `aliyun` (Alibaba Cloud’daki aynı imajlar), `ghcr` (`ghcr.io/lewen-cai`) ya da başka bir ghcr.io aynası. Verilmezse kurulum programı Çin anakarasında Alibaba Cloud’u, başka yerlerde ghcr.io’yu kullanır (Docker’ın `registry-mirrors` ayarı ghcr.io için değil, yalnızca Docker Hub için geçerlidir) |

İnternetten erişilebilen bir sunucuda düz `http://` üzerinden oturum açmayın: `--domain`, Tailscale veya bir Cloudflare tüneli kullanın.

### Yönetme ve güncelleme

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
coltex reset           # delete all data and start again from the setup page (asks first)
coltex uninstall       # remove ColTex from this machine: containers, data, images, this folder (asks first)
```

<a id="configure"></a>
## Yapılandırma

Her şey tarayıcıda, kullanıcı menüsündeki **Ayarlar** altında ayarlanır:

1. **Kullanıcıları yönet** ve **Davetler**: kişileri bağlantılarla davet edin (her biri bir kez çalışır, isteğe bağlı olarak tek bir e-posta için).
2. **YZ hizmetleri**: bir sağlayıcı bağlayın. Ardından **YZ kullanımı ve erişimi** bölümünde kişileri onu kullanabilen bir gruba ekleyin. Grup olmadan sistem yöneticisi dışında kimse YZ ajanını kullanamaz.
3. **Ağ**: ColTex’e erişilen adresler, Tailscale ve Cloudflare Tunnel.
4. **Depolama ve yedekler**: bir WebDAV klasörüne (Nextcloud, bir NAS…) günlük veya haftalık yedekler.

Yardım belgeleri yerleşiktir: kullanıcı menüsünde **Yardım belgeleri**. Sunucu işlemleri (ortam değişkenleri, S3, bir yedeği geri yükleme) [docs/operations.md](../docs/operations.md) dosyasındadır (İngilizce).

<a id="feedback"></a>
## İlk günler: lütfen issue açın

ColTex henüz genç (0.0.x). Her gün kullanılıyor ve test ediliyor, ancak her şey henüz bulunmuş değil. Bir şey bozulursa, yanlış görünürse veya kullanımı zorsa lütfen [bir issue açın](https://github.com/Lewen-Cai/coltex/issues): her bildirim yardımcı olur.

Yararlı bir bildirimde sürüm (`coltex version`), ne yaptığınız ve ne olduğu ve sunucu işin içindeyse `coltex logs` çıktısının ilgili satırları bulunur. Lütfen parolaları, API anahtarlarını ve özel belge içeriklerini eklemeyin.

<a id="development"></a>
## Geliştirme

Node 24 veya daha yenisi, pnpm 11 ve Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Yol | |
| --- | --- |
| `apps/web` | Web uygulaması: React, CodeMirror 6, PDF.js |
| `apps/server` | API: Fastify, hesaplar, projeler, gerçek zamanlı iş birliği, YZ ajanı |
| `services/compiler` | Bir TeX Live kapsayıcısındaki derleme işçisi |
| `packages/*` | Ortak şemalar, günlük ayrıştırıcı, LaTeX dil desteği, inceleme verileri ve şablon dönüştürme |

Tasarım [docs/architecture.md](../docs/architecture.md) dosyasında anlatılmaktadır (İngilizce).

<a id="acknowledgements"></a>
## Teşekkürler

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex onun günlük ayrıştırıcısını ve ipuçlarını, LaTeX dil desteğini, görsel düzenleyicisini, tablo düzenleyicisini, yazım denetimini ve sözcük sayımını aktarır. Aktarılan her dosya [NOTICE](../NOTICE) içinde listelenmiştir.
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): YZ ajanının arkasındaki model sağlayıcıları ve ajan döngüsü.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): sağlayıcı sağlığı takibi ve otomatik model seçimi ondan uyarlanmıştır.
- [Yjs](https://github.com/yjs/yjs) ve [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): sağlayıcı logoları. Ticari markalar sahiplerine aittir ve yalnızca hizmeti tanımlar.

<a id="license"></a>
## Lisans

[AGPL-3.0](../LICENSE). Değiştirilmiş bir ColTex’i bir ağ üzerinden başkalarına sunuyorsanız onlara kaynak kodunu sunmanız gerekir. Üçüncü taraf kodlar kendi lisanslarını korur; bkz. [NOTICE](../NOTICE).
