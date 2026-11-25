# EL Finans — Website

EL Finans kişisel finans uygulamasının tanıtım ve yasal sayfaları.

## Sayfalar

- [index.html](index.html) — Ana sayfa (özellikler, güvenlik, indirme)
- [support.html](support.html) — Destek ve SSS
- [privacy-policy.html](privacy-policy.html) — Gizlilik Politikası
- [terms.html](terms.html) — Kullanım Şartları
- [account-deletion.html](account-deletion.html) — Hesap ve veri silme adımları
- [cookie-policy.html](cookie-policy.html) — Çerez Politikası

Statik HTML/CSS/JS — derleme adımı ve kütüphane yoktur. Ortak stil ve davranış `site.css` / `site.js`, ana sayfaya özel sahneler `premium.css` / `premium.js`, alt sayfalar `pages.css` / `pages.js`, destek asistanı `support-bot.css` / `support-bot.js` içindedir. Tasarım kuralları için `SITE_CONTEXT.md` dosyasına bakın. TR/EN/pt-BR dil desteği sayfa içi dil değiştiriciyle sağlanır.

## Yasal İçerik İş Akışı

- Gizlilik Politikası ve Kullanım Şartları'nın asıl kaynağı uygulama reposundaki `src/constants/legalDocuments.js` ve `src/constants/legalTranslations.js` içindeki İngilizce karşılıklarıdır; uygulamanın diğer dilleri ayrı yerelleştirme dosyasında tutulur.
- Metin değişikliğinde uygulama reposundan `npm run legal:sync-site` çalıştırılır; `privacy-policy.html` ve `terms.html` elle farklılaştırılmaz.
- Gizlilik Politikası ve Kullanım Şartları için son güncelleme tarihi 23 Kasım 2026 olarak eşit tutulur; senkron komutu TR/EN/pt-BR tarih alanlarını da günceller. Yerel silme/bulut ayrımı, AI yanıt saklama ve kredi rezervasyonu açıklamaları uygulama kaynağıyla eşleştirildi.
- Yayın öncesinde gerçek veri sorumlusu unvanı, production Gemini billing durumu, AdMob UMP mesajı ve mağaza gizlilik formları uygulama reposundaki `docs/deploy-runbook.md` sırasıyla doğrulanır.
- Hesap silme, destek ve ana sayfadaki güvenlik ifadeleri; kişisel şifreli veri ile rol korumalı şifrelenmemiş ortak hesap istisnasını aynı biçimde açıklamalıdır.
## URL Kuralı

- Canlı sitedeki kullanıcıya açık sayfa adresleri .html uzantısı içermez:
  /support, /privacy-policy, /terms, /account-deletion ve /cookie-policy.
- Navigasyon ve içerik bağlantılarında daima bu temiz yollar kullanılmalıdır.
- Fiziksel .html dosyaları GitHub Pages kaynağı olarak korunur; yeniden adlandırılmaz.
- site.js, file://, localhost ve 127.0.0.1 önizlemelerinde temiz yolları
  otomatik olarak fiziksel .html dosyalarına eşler.
- Yeni bir sayfa eklenirse hem temiz bağlantısı hem de localizeStaticRoutes
  içindeki yerel dosya eşlemesi birlikte güncellenmelidir.