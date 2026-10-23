# Geçmiş

Düzenleyicinin üstündeki **Geçmiş**, geçmiş görünümünü açar. Bir git log gibi çalışır: her sürümün kısa bir kimliği (`a1b2c3d` gibi), bir açıklaması, ne zaman ve kim tarafından oluşturulduğu bilgisi vardır.

- Sürümler, düzenlemeye ara verildikten sonra değişiklikleri kimin yaptığıyla birlikte otomatik olarak kaydedilir.
- **Sürümü kaydet**, geçerli durumu sizin açıklamanızla (bir commit mesajı gibi) hemen kaydeder. Son sürümden bu yana hiçbir şey değişmediyse açıklama o sürüme etiket olur.
- Hangi dosyaları nasıl değiştirdiğini görmek veya güncel projeyle karşılaştırmak için bir sürüm seçin.
- **Bu değişiklikleri geri al**, yalnızca o sürümün değiştirdiklerini geri alır ve sonradan değişen her şeyi korur (`git revert` gibi). Bir dosya sonradan çakışacak biçimde yeniden değiştirildiyse hiçbir şey değişmez ve dosyanın adı bildirilir.
- **Projeyi geri yükle**, her dosyayı o sürümdeki hâline döndürür; sonradan eklenen dosyalar kaldırılır. **Bu dosyayı geri yükle** bunu tek bir dosya için yapar.
- Geri almalar ve geri yüklemeler kendi başlarına birer sürümdür ("a1b2c3d geri alındı", "a1b2c3d sürümüne dönüldü"; o sürüme gitmek için kimliğe tıklayın), bu yüzden onlar da geri alınabilir.
- **Etiket ekle**, bir sürümü daha sonra bulabilmeniz için adlandırır (ör. "Gönderildi").
- Herhangi bir sürümün dosyaları .zip olarak indirilebilir.

> YZ değişiklikleri uygulanmadan önce, proje genelinde bir değiştirmeden, bir git push’tan, bir geri almadan ve bir geri yüklemeden önce de bir sürüm kaydedilir.
