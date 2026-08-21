# EL Finans — Website

EL Finans kişisel finans uygulamasının tanıtım ve yasal sayfaları.

## Sayfalar

- [index.html](index.html) — Ana sayfa (özellikler, güvenlik, indirme)
- [support.html](support.html) — Destek ve SSS
- [privacy-policy.html](privacy-policy.html) — Gizlilik Politikası
- [terms.html](terms.html) — Kullanım Şartları
- [account-deletion.html](account-deletion.html) — Hesap ve veri silme adımları

Statik HTML/CSS/JS — kaynak dosyalar doğrudan düzenlenir, derleyici veya paket
yöneticisi yoktur. TR/EN dil desteği sayfa içi dil değiştiriciyle sağlanır.

## Yayın

- Site Cloudflare Pages üzerinde barınır; domain GoDaddy'de kayıtlı, DNS
  Cloudflare'de yönetilir.
- `main` dalına her push otomatik yayına çıkar.
- `build.sh` gerçek bir derleme yapmaz; yalnızca yayına çıkacak dosyaları
  `dist/` altında toplar ve iç dokümanları (`AGENTS.md`, `README.md`,
  `SITE_CONTEXT.md`) dışarıda bırakır. Repo private olduğu için bu notların
  elfinans.com üzerinden servis edilmemesi gerekir.
- Yeni sayfa veya görsel eklerken `build.sh` düzenlenmez; dosya otomatik
  yayına dahil olur. Yalnızca yayına çıkmaması gereken bir dosya eklenirse
  `build.sh` içindeki `EXCLUDE` listesine yazılır.
- `CNAME` dosyası GitHub Pages'ten kalan artifakttır ve `dist/` içine
  kopyalanmaz; Cloudflare'de özel alan adı panelden tanımlıdır.

## Yasal İçerik İş Akışı

- Gizlilik Politikası ve Kullanım Şartları'nın asıl kaynağı uygulama reposundaki `src/constants/legalDocuments.js` ve `src/constants/legalTranslations.js` içindeki İngilizce karşılıklarıdır; uygulamanın diğer dilleri ayrı yerelleştirme dosyasında tutulur.
- Metin değişikliğinde uygulama reposundan `npm run legal:sync-site` çalıştırılır; `privacy-policy.html` ve `terms.html` elle farklılaştırılmaz.
- Gizlilik Politikası ve Kullanım Şartları için son güncelleme tarihi 21 Temmuz 2026 olarak eşit tutulur; senkron komutu TR/EN tarih alanlarını da günceller.
- Yayın öncesinde gerçek veri sorumlusu unvanı, production Gemini billing durumu, AdMob UMP mesajı ve mağaza gizlilik formları uygulama reposundaki `docs/deploy-runbook.md` sırasıyla doğrulanır.
- Hesap silme, destek ve ana sayfadaki güvenlik ifadeleri; kişisel şifreli veri ile rol korumalı şifrelenmemiş ortak hesap istisnasını aynı biçimde açıklamalıdır.
## URL Kuralı

- Canlı sitedeki kullanıcıya açık sayfa adresleri .html uzantısı içermez:
  /support, /privacy-policy, /terms ve /account-deletion.
- Navigasyon ve içerik bağlantılarında daima bu temiz yollar kullanılmalıdır.
- Fiziksel .html dosyaları yayın kaynağı olarak korunur; yeniden adlandırılmaz.
  Cloudflare Pages `/support` isteğini `support.html` ile karşılar ve
  `/support.html` adresini `/support`'a yönlendirir.
- script.js, file://, localhost ve 127.0.0.1 önizlemelerinde temiz yolları
  otomatik olarak fiziksel .html dosyalarına eşler.
- Yeni bir sayfa eklenirse hem temiz bağlantısı hem de localizeStaticRoutes
  içindeki yerel dosya eşlemesi birlikte güncellenmelidir.