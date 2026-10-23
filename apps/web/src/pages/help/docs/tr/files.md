# Dosyalar

## Dosya ağacı

- Üst bilgisindeki düğmeler: yeni dosya, yeni klasör, yükleme ve bağlantılı dosya ekleme.
- Bir dosyayı taşımak için bir klasörün üzerine sürükleyin; yeniden adlandırmak için adına çift tıklayın. Bilgisayarınızdan bırakılan dosyalar yüklenir.
- Oluşturmak, yüklemek, yeniden adlandırmak veya silmek için bir dosyaya ya da klasöre sağ tıklayın.
- Bir dosyanın yanındaki renkli nokta, onu başka birinin açtığını gösterir.

Silinen dosyalar geçmişten geri getirilebilir.

## Bağlantılı dosyalar

Bağlantılı bir dosya başka bir yerden gelir ve istediğiniz zaman kaynağından yenilenebilir:

- **Başka bir projeden**: başka bir projenin herhangi bir dosyası veya derlenmiş PDF’i (önce derlenir). Ortak şekiller veya ortak bir `.bib` için ya da bir projenin PDF’ini başka bir projede şekil olarak kullanmak için yararlıdır.
- **Bir URL’den**: genel bir adresten indirilir (en fazla 50 MB). Yerel veya özel ağdaki adresler kullanılamaz.

> Bağlantılı dosyaların ağaçta bir bağlantı işareti vardır; nereden geldiklerini görmek için üzerine gelin. Sağ tıklayıp **Bağlantılı dosyayı yenile** seçildiğinde dosya yeniden alınır ve değiştirilir. Eklemek veya yenilemek için kaynak projeye sizin de erişiminizin olması gerekir.

## Git

Her proje git ile klonlanabilir, çekilebilir ve itilebilir:

1. **Ayarlar → Eşitleme hizmetleri** bölümünde Git için bir belirteç oluşturun (bir kez gösterilir; saklayın). **Salt okunur** bir belirteç klonlayabilir ve çekebilir, ancak itemez.
2. Klonlama adresini proje ayarlarından kopyalayın ve `git clone <address>` komutunu çalıştırın. git sorduğunda herhangi bir kullanıcı adı ve parola olarak belirteci kullanın.
3. Yerelde commit yapın ve `git push` çalıştırın: değişiklikler hemen projeye girer ve ortak çalışanlar onları görür.

Bilmekte yarar var:

- Her projenin tek bir dalı vardır: `main`.
- Son çekişinizden bu yana biri projeyi değiştirdiyse git itmeyi reddeder: önce `git pull`, ardından yeniden itin.
- Bir itme uygulanmadan önce projenin durumu bir sürüm olarak kaydedilir.
- İnceleyiciler ve görüntüleyiciler itemez.
- Belirteci her seferinde yazmamak için: `git config --global credential.helper store` (Mac’te `osxkeychain`).
