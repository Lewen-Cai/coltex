# Kurulum ve ağ

Üretimde ColTex tek bir bağlantı noktası kullanır (varsayılan 3690): sayfalar, API, canlı iş birliği (WebSocket) ve bildirimler hep buradan geçer. HTTP ve WebSocket’i ileten her şey çalışır: bu bilgisayar, bir yerel ağ, Tailscale, Cloudflare Tunnel veya bir bulut sunucusu. (3000 ve 5173, geliştirme sunucusunun bağlantı noktalarıdır.)

## Kurulum

Docker yüklü Linux veya macOS’ta tek bir komut:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

İndirme yarıda kesilirse (`curl: (35) Recv failure: Connection reset by peer`, GitHub’a erişmek zor olduğunda sık görülür) komutu yeniden çalıştırın.

Komut dili ve TeX Live sürümünü (edition) sorar (ok tuşlarıyla; `--edition` ve `--lang` seçenekleri bunları yanıtlar), Docker’ı denetler (Linux’ta kurabilir), ColTex’i `~/coltex` içine alır, ayarları yazar, hazır imajları (x86-64 ve ARM64) indirip başlatır ve bu makinede ve ağınızda açılacak adresleri yazdırır. İlk başlatma TeX Live’ı indirir. İki sürüm vardır:

| Sürüm | İndirme | Diskte (tüm ColTex) | Gereken boş alan |
| --- | --- | --- | --- |
| **standard** (varsayılan) | yaklaşık 3 GB | yaklaşık 12 GB | 20 GB |
| **full** (`--edition full`) | yaklaşık 8 GB | yaklaşık 23 GB | 35 GB |

İkisinde de tam TeX Live vardır ve aynı biçimde derler; YZ ajanı ikisiyle de çalışır. standard sürümünde paket kılavuzları ve kaynakları yoktur; full sürümü bunları ekler ve YZ ajanı kılavuzları da okuyabilir. standard sürümde YZ ajanı paket dosyalarından ve kendi bilgisinden yanıt verir. Daha sonra `coltex edition full` veya `coltex edition standard` ile geçiş yapın.

Uzaktan erişim (Tailscale, Cloudflare Tunnel) kurulumdan sonra **Ayarlar → Ağ** bölümünden açılır (aşağıya bakın). Betikle yapılan kurulumlarda seçeneklerle kurulum sırasında da ayarlanabilir:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --tailscale
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Ardından `coltex` ile yönetin:

| Komut | Ne yapar |
| --- | --- |
| `coltex status` / `logs` | Durum / günlükler |
| `coltex edition [standard\|full]` | TeX Live sürümünü gösterir veya değiştirir (diğer derleyici imajını indirir) |
| `coltex update` | En son sürüme günceller, yalnızca değişenleri indirir (yeni TeX Live getiren yıllık güncelleme daha uzun sürer); veriler ve ayarlar kalır |
| `coltex stop` / `start` | Durdurur / başlatır |
| `coltex tailscale up` | tailnet’inize katılır (bir oturum açma bağlantısı ve QR kodu yazdırır) |
| `coltex cloudflare quick` | Geçici bir genel Cloudflare adresi |
| `coltex cloudflare token` | Kendi alan adınızla bir Cloudflare tüneli (belirteci sorar) |
| `coltex reset` | Her şeyi (hesaplar, projeler, veritabanı) siler ve kurulum sayfasından yeniden başlar; önce `reset` yazmanızı ister |
| `coltex uninstall` | ColTex’i bu makineden kaldırır: kapsayıcılar, veritabanı, veriler, imajlar, `coltex` komutu ve klasörü (Docker kalır); önce `uninstall` yazmanızı ister |

## Herhangi bir adresten oturum açma

Sunucu, kendi adresine yapılan oturum açma isteklerini kabul eder: onu `localhost`, bir yerel ağ IP’si, bir Tailscale adresi veya bir alan adıyla, hiçbirini önceden listelemeden açın. Başka bir sitedeki bir sayfa kimsenin oturumunu açamaz.

## Bağlantıların kullandığı adresler

Davet bağlantıları ve Git klonlama adresleri, ColTex’e erişilebilen her adres için bir kez, her biri kendi kopyalama düğmesiyle sunulur; böylece alıcının açabileceğini seçersiniz:

- **Yerel ağ** veya **Tailscale**: ColTex’i açtığınız adres (adresinden tanınır);
- **Tailscale**, **Cloudflare**: bağlıyken yerleşik Tailscale’in veya Cloudflare Tunnel’ın adresleri. Onlarla birlikte görünür ve kaybolurlar; biri kapatıldığında hiçbir şeyi değiştirmek gerekmez;
- **Genel adres**: ayarlanmışsa sunucunun `COLTEX_URL` değeri.

Bekleyen bir davetin bağlantıları, davet kullanılana veya süresi dolana kadar davet listesinde kalır.

## Tailscale

ColTex’te Tailscale yerleşiktir: tailnet’inize kendi başına bir cihaz olarak katılabilir (varsayılan adı `coltex`). Sunucuya hiçbir şey kurmak gerekmez ve masaüstü olmayan sunucularda da çalışır.

1. **Ayarlar → Ağ** bölümünde Tailscale’i açın.
2. QR kodunu bir telefonla tarayın veya bağlantıyı herhangi bir cihazda açın ve tailnet’inize oturum açın. Sayfa kendiliğinden Bağlı durumuna geçer.
3. **ColTex’i tailnet üzerinde sun** seçeneğini açın. tailnet için MagicDNS ve HTTPS etkinse adres `https://coltex.<your tailnet>.ts.net`, değilse `http://coltex.<your tailnet>.ts.net` olur.

Henüz hiçbir tarayıcı ayarlar sayfasına erişemiyorsa sunucuda şunu çalıştırın:

```sh
coltex tailscale up
```

Bu komut Tailscale’i açar, oturum açma bağlantısını ve bir QR kodunu terminale yazdırır, oturum açılmasını bekler, ardından ColTex’i tailnet üzerinde sunar. `coltex tailscale status` durumu gösterir, `coltex tailscale down` tailnet’ten ayrılır, `coltex tailscale off` onu kapatır.

`TS_HOSTNAME` cihaz adını değiştirir. Sunucu Tailscale’i kendisi çalıştırır: ek kapsayıcı veya ayrıcalık gerekmez. Cihaz anahtarları `data/tailscale` içinde tutulur ve yedeklere dahil değildir; geri yüklemeden sonra yeniden oturum açın.

Sunucu zaten Tailscale’i kendisi çalıştırıyorsa ikisi birbirine engel olmaz: yerleşik olan kendi başına bir cihazdır ve kullanıcı alanı ağı (userspace networking) kullanır; bu yüzden sunucunun ağ ayarlarının hiçbirini değiştirmez. Ona ihtiyacınız da yoktur: ColTex’i sunucunun Tailscale IP’si veya MagicDNS adı ile `:3690` kullanarak açın.

## Cloudflare Tunnel

ColTex’te Cloudflare Tunnel da yalnızca bir tünel olarak yerleşiktir: kişiler yine ColTex hesaplarıyla oturum açar; Cloudflare Access gerekmez. Sunucunun açık bir bağlantı noktasına ihtiyacı yoktur.

- **Hızlı tünel**: Cloudflare hesabı gerekmez; her başladığında değişen bir `https://<random>.trycloudflare.com` adresi alırsınız. Denemeler için.
- **Kendi alan adım**: alan adınız Cloudflare’deyken Zero Trust → Networks → Tunnels altında bir tünel oluşturun, “Run the following command” altındaki komutu kopyalayın (herhangi bir sistem için: Windows, macOS, Debian, Red Hat veya Docker); ColTex belirteci bunun içinden çıkarır. Tünele `http://localhost:3690` hizmetiyle bir genel ana makine adı ekleyin (ör. `tex.example.org`).

Onu **Ayarlar → Ağ** bölümündeki Cloudflare Tunnel kartının anahtarıyla açın, ardından geçici bir bağlantı veya bir tünel seçin (kayıtlı olanı ya da yapıştırılan komuttan yeni bir tane); veya bir terminalde `coltex cloudflare quick` / `coltex cloudflare token` kullanın. Bağlandığında adresleri davet bağlantılarında kendiliğinden görünür. Belirteç şifreli saklanır ve bir daha asla gösterilmez.

Tünel Cloudflare’e QUIC üzerinden ulaşamazsa (bir güvenlik duvarı veya UDP’yi engelleyen bir vekil sunucu), ColTex onu kendiliğinden HTTP/2’ye geçirir. trycloudflare.com geçici bağlantıları sınırladığında (429 Too Many Requests), ColTex giderek daha seyrek yeniden dener. Tüneli değiştirdiğinizde genel ana makine adlarını Cloudflare panelinde yeni tünele taşıyın; o zamana kadar bu adlar Error 1033 ile yanıt verir.

Sunucu kendi tüneli için zaten cloudflared çalıştırıyorsa ikisi çakışmaz, ancak o tünelin belirtecini ColTex’e vermeyin: Cloudflare ikisini aynı tünelin bağlayıcıları olarak görür ve istekleri aralarında paylaştırır; bu yüzden sunucunun diğer ana makine adları zaman zaman ColTex’e ulaşır ve başarısız olur (502). Ya o tünele ColTex için bir genel ana makine adı ekleyin (hizmet `http://localhost:3690`) ve yerleşik olanı kapalı bırakın ya da ColTex için ayrı bir tünel oluşturun.

## Sunucu ayarları

Bunlar sunucunun ortam değişkenleridir. Docker ile bunları `docker-compose.yml` yanındaki `.env` dosyasına koyun ve `docker compose up -d` çalıştırın.

| Değişken | Ne yapar |
| --- | --- |
| `COLTEX_PORT` | Bağlantı noktası, varsayılan 3690 |
| `COLTEX_URL` | Her bağlantıda sunulan genel bir adres, ör. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Oturum açmanın kabul ettiği diğer adresler, virgülle ayrılmış. Yalnızca sayfalar ve API farklı adreslerdeyse gerekir |
| `TRUST_PROXY` | Önünde bir ters vekil sunucu (Caddy, Nginx) varken: `uniquelocal` (özel ağdaki vekil sunucu) veya `true`. Ayarlanmazsa sunucu vekil sunucuyu ziyaretçi sanar: herkes tek bir adresi paylaşır; bu yüzden bir kişinin başarısız oturum açmaları herkesin aleyhine sayılır ve oturum açma kayıtları vekil sunucunun adresini gösterir. Yerleşik Tailscale ve Cloudflare Tunnel için burada bir şey gerekmez |
| `TS_HOSTNAME` | Yerleşik Tailscale’in cihaz adı, varsayılan `coltex` |

**Ayarlar → Ağ** sayfasının altındaki **İsteklerin gelişi**, bu ayarları ve sunucunun gördüğü IP’yi gösterir ve sorunlara dikkat çeker.

## Yaygın kurulumlar

| Kurulum | Nasıl |
| --- | --- |
| Yalnızca bu bilgisayar | Varsayılanlar: `http://localhost:3690` |
| Yerel ağ | Sunucunun yerel ağ adresiyle açın, ör. `http://192.168.1.20:3690`. Yerel ağ adresleri değişebilir; uzun süreli kullanım için yönlendiricide bir adres ayırın |
| Tailscale | Yukarıdaki Tailscale bölümüne bakın |
| Cloudflare Tunnel | Yukarıdaki Cloudflare Tunnel bölümüne bakın |
| Bulut sunucusu | Alan adıyla: `--domain tex.example.org` ile kurun (DNS kaydını sunucuya yönlendirin ve 80 ile 443 numaralı bağlantı noktalarını açın). Birlikte gelen Caddy HTTPS sertifikasını alır; 3690 numaralı bağlantı noktası bundan sonra yalnızca sunucunun kendisinde yanıt verir. Alan adı olmadan: Cloudflare Tunnel veya Tailscale |

## Güvenlik

- Küçük bir grup için ColTex’e yalnızca Tailscale veya bir VPN üzerinden erişmek en basit yoldur: internette hiç görünmez. Cloudflare Tunnel ile herkese açıktır ve ColTex’in oturum açma sistemiyle korunur.
- İnternette HTTPS kullanın (bulut kurulumundaki gibi Caddy ile).
- Sunucudaki bir güvenlik duvarı (ufw, firewalld), Docker’ın yayımladığı bağlantı noktalarını kapatmaz. `--domain` ile 3690 numaralı bağlantı noktası yalnızca sunucunun kendisinde yanıt verir; bunun yerine Tailscale veya bir Cloudflare tüneli kullanıyorsanız 3690’ı bulut sağlayıcınızın güvenlik duvarında kapatın.
- Herkese açık kayıt yoktur, yalnızca davetler vardır; parolaların güç kuralları vardır; herkes iki adımlı doğrulamayı açabilir. Başarısız oturum açmalar önce yavaşlatılır, ardından hesap tanıdık olmayan adreslere karşı kilitlenir; sürekli başarısız olan bir adres bir gün boyunca engellenir (bkz. [Yönetim](#/help/admin)).
- ColTex’in sayfaları tarayıcılara onu başka sitelerin içinde göstermemelerini (clickjacking’e karşı) ve yalnızca kendi betiklerini çalıştırmalarını söyler; `--domain` ile Caddy ayrıca yalnızca HTTPS kullanmalarını söyler (HSTS).
- Alışılmadık bir bağlantı noktası tarayıcıları durdurmaz; buna güvenmeyin.
