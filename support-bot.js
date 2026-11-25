(function () {
  'use strict';

  var docEl = document.documentElement;
  if (docEl.classList.contains('embed-policy')) return;
  var previewHost = window.location.hostname;
  var usePhysicalHtmlLinks = window.location.protocol === 'file:'
    || previewHost === 'localhost'
    || previewHost === '127.0.0.1'
    || previewHost === '[::1]';

  // ── Destek chatbotu: sağ altta açılan, kural tabanlı SSS asistanı ──
  // Sunucu/API kullanmaz; support.html SSS'i ve yasal sayfalarla tutarlı sabit
  // yanıtlardan anahtar kelime eşleştirmesiyle en uygun cevabı seçer.
  (function setupSupportBot() {
    var CHAT_KEY = 'el-finans-chat-open';
    var HISTORY_KEY = 'el-finans-chat-history';
    var MAX_TRANSCRIPT = 40;
    var supportFormAction = {
      label: { tr: 'Destek formuna git', en: 'Go to support form' },
      href: '/support#contact-form',
      run: goToSupportForm
    };
    var contactActions = [supportFormAction, {
      label: { tr: 'E-posta gönder', en: 'Send an email' },
      href: 'mailto:support@elfinans.com'
    }];
    var qa = [
      {
        id: 'account',
        question: { tr: "Hesap oluşturmadan kullanabilir miyim?", en: "Can I use it without an account?" },
        category: 'security',
        related: ['security', 'device', 'app-lock'],
        keywords: ['hesap olu', 'hesapsız', 'hesap açmadan', 'kayıt olmadan', 'create an account', 'creating an account', 'sign up', 'without an account', 'without account'],
        tr: 'Evet. Gelir-gider kaydı, bütçe ve birikim gibi temel özellikleri hesap açmadan cihazınızda kullanabilirsiniz. Premium; satın alma doğrulaması, AI hakları, şifreli bulut yedekleri ve ortak hesap yetkileri için hesap gerektirir.',
        en: 'Yes. You can use basic features like income/expense tracking, budgets and savings locally without an account. Premium requires an account for purchase verification, AI allowances, encrypted cloud backups and shared-account permissions.'
      },
      {
        id: 'security',
        question: { tr: "Verilerim güvende mi?", en: "Is my data safe?" },
        category: 'security',
        related: ['app-lock', 'shared-account', 'delete'],
        keywords: ['güvenli', 'şifreli', 'encrypt', 'safe', 'security', 'gizli', 'veri güvenliği', 'aes'],
        actions: [{ label: { tr: 'Gizlilik Politikası', en: 'Privacy Policy' }, href: '/privacy-policy' }],
        tr: 'Kişisel finans verileriniz cihazınızda ve kişisel bulut yedeklerinde AES-256-GCM ile şifrelenir; açık anahtarlar sunucuya gönderilmez. Ortak hesap senkronizasyon verileri, yetkili üyelerin birlikte kullanabilmesi için şifrelenmemiş tutulur ve rol tabanlı erişimle (RLS, üyelik, sahip/yönetici kontrolleri) korunur. Detaylar için Gizlilik Politikası sayfasına bakın.',
        en: 'Your personal financial data is protected with AES-256-GCM on-device and in personal cloud backups; plaintext keys are never sent to the server. Shared-account sync data is kept unencrypted so authorized members can collaborate, and is protected by role-based access (RLS, membership, owner/admin checks). See the Privacy Policy for details.'
      },
      {
        id: 'device',
        question: { tr: "Yeni cihaza geçersem ne olur?", en: "What happens if I switch devices?" },
        category: 'security',
        related: ['backup', 'account', 'security'],
        keywords: ['yeni cihaz', 'cihaz değiş', 'telefon değiş', 'new device', 'switch device', 'restore', 'geri yükle', 'yedek'],
        tr: 'Google/Apple hesabınızla giriş yaptığınızda bulut senkronizasyonu verilerinizi getirir. Ayrıca Ayarlar\'dan şifreli yedek dosyası (.elfb) oluşturup yeni cihazda geri yükleyebilirsiniz.',
        en: 'Signing in with your Google/Apple account restores your data via cloud sync. You can also create an encrypted backup file (.elfb) from Settings and restore it on the new device.'
      },
      {
        id: 'premium',
        question: { tr: "Premium aboneliğimi nasıl yönetirim?", en: "How do I manage my Premium subscription?" },
        category: 'premium',
        related: ['ai', 'ads', 'terms'],
        keywords: ['premium', 'abone', 'üyelik', 'subscription', 'satın al', 'purchase', 'iptal', 'cancel'],
        tr: 'Premium satın alma ve geri yükleme öncesinde EL Finans hesabınızla giriş yapmanız gerekir. Abonelik ödemesi App Store veya Google Play üzerinden yönetilir; iptal için cihazınızın abonelik ayarlarını kullanın. Uygulamada bu seçenekler Ayarlar → Hesap ve Üyelik bölümündedir.',
        en: 'You must sign in to your EL Finans account before purchasing or restoring Premium. Subscription payments are managed through the App Store or Google Play; cancel via your device\'s subscription settings. In the app, this is under Settings → Account & Membership.'
      },
      {
        id: 'plans',
        question: { tr: "Ücretsiz mi? Premium'da neler var?", en: 'Is it free? What does Premium include?' },
        category: 'premium',
        related: ['premium', 'ai', 'ads'],
        keywords: ['ücretsiz', 'bedava', 'fiyat', 'fiyatı', 'ücret', 'ne kadar', 'kaç para', 'günlük kayıt', 'kayıt sınırı', 'kayıt limiti', 'sınırsız', 'plan', 'planlar', 'abonelik ücreti', 'free', 'price', 'cost', 'how much', 'daily limit', 'entry limit', 'unlimited', 'plans'],
        actions: [{ label: { tr: 'Planları gör', en: 'See plans' }, href: '/#plans' }],
        tr: 'Temel finans özellikleri ücretsizdir ve hesap açmadan cihazınızda çalışır. Ücretsiz sürümde günde en fazla 5 yeni kayıt eklenebilir; sınıra ulaşınca ödüllü reklam izleyerek ek kayıt hakkı alabilirsiniz, banner ve ödüllü reklamlar gösterilebilir. Premium aylık veya yıllık abonelikle App Store ya da Google Play üzerinden alınır; kayıt sınırı yoktur, reklam gösterilmez, ayda 300 yapay zekâ kredisi, şifreli bulut yedeği ve ortak hesap yetkileri içerir. Güncel fiyatı mağazadaki uygulama sayfasında görebilirsiniz.',
        en: "Basic finance features are free and work on your device without an account. The free version allows up to 5 new entries per day; at the limit you can watch a rewarded ad for an extra entry, and banner and rewarded ads may be shown. Premium is a monthly or yearly subscription via the App Store or Google Play: no entry limit, no ads, 300 AI credits per month, encrypted cloud backup and shared-account permissions. You can see the current price on the app's store page."
      },
      {
        id: 'terms',
        question: { tr: "Kullanım şartları nelerdir?", en: "What are the terms of use?" },
        category: 'premium',
        related: ['premium', 'delete', 'contact'],
        keywords: ['kullanım şart', 'şartlar', 'terms', 'sorumluluk', 'fikri mülkiyet'],
        actions: [{ label: { tr: 'Kullanım Şartları', en: 'Terms of Use' }, href: '/terms' }],
        tr: 'Kullanım şartları; kullanıcı sorumlulukları, premium üyelik, reklamlar, sorumluluk sınırı ve fikri mülkiyet gibi başlıkları Kullanım Şartları sayfasında bulabilirsiniz.',
        en: 'You can find the terms of use — user responsibilities, premium membership, advertising, limitation of liability and intellectual property — on the Terms of Use page.'
      },
      {
        id: 'delete',
        question: { tr: "Hesabımı nasıl silerim?", en: "How do I delete my account?" },
        category: 'security',
        related: ['security', 'shared-account', 'contact'],
        keywords: ['hesap sil', 'veri sil', 'delete account', 'delete my data', 'delete data', 'hesabımı sil', 'hesabımı nasıl silerim', 'hesap silme', 'hesabı kapat', 'verilerimi sil', 'verileri silmek', 'silmek istiyorum', 'delete my account', 'remove account', 'close account'],
        actions: [{ label: { tr: 'Hesap Silme sayfası', en: 'Account deletion page' }, href: '/account-deletion' }],
        tr: 'Hesabınızı ve verilerinizi uygulama içinden kalıcı olarak silebilirsiniz. Adımlar için Hesap Silme sayfasına bakın. Silme işlemi kişisel Supabase verilerinizi ve özel depolama yedeklerinizi kaldırır; yalnızca yasal/mağaza doğrulama gibi zorunlu kayıtlar ve ortak hesap verileri (sahibi tarafından silinene kadar) kalabilir.',
        en: 'You can permanently delete your account and data from within the app. See the Account Deletion page for the steps. Deletion removes your user-scoped Supabase data and private storage backups; only records required for legal/store verification and shared-account data (until the owner deletes it) may remain.'
      },
      {
        id: 'ai',
        question: { tr: "Yapay zekâ özellikleri nasıl çalışır?", en: "How do the AI features work?" },
        category: 'premium',
        related: ['premium', 'reports', 'onboarding'],
        keywords: ['yapay zeka', 'ai', 'gemini', 'asistan', 'kredi', 'kaç kredi', 'credits', 'credit'],
        tr: 'Yapay zekâ özellikleri 18 yaş ve üzeri kullanıcılar için sunulur, yalnızca kullanıcı talebiyle ve ayrı bir onay sonrası çalışır; istekler kimlik doğrulamalı bir Supabase Edge Function üzerinden Google Gemini API\'ye iletilir. Ücretli Premium döneminde ayda 300 kredi tanımlanır; takvim ayı başında yenilenir ve kullanılmayan kredi devretmez. Ücretsiz denemede aylık kredi tanımlanmaz; yapay zekâ yalnızca satın alınmış ek kredi varsa kullanılabilir.',
        en: 'AI features are available for users aged 18+, run only after a user-initiated request and separate explicit consent, and route through an authenticated Supabase Edge Function to the Google Gemini API. Paid Premium includes 300 credits per month, renewed at the start of each calendar month without rollover. The free trial grants no monthly credits; AI works then only with purchased extra credits.'
      },
      {
        id: 'ads',
        question: { tr: "Uygulamada reklam var mı?", en: "Are there ads in the app?" },
        category: 'premium',
        related: ['premium', 'security'],
        keywords: ['reklam', 'ad', 'ads', 'admob', 'reklamsız', 'reklam var mı', 'ad-free', 'no ads'],
        tr: 'Ücretsiz kullanıcılar banner veya ödüllü AdMob reklamları görebilir; ancak kişisel finansal kayıtlarınız reklam hedeflemesinde kullanılmaz. Premium kullanıcılara reklam gösterilmez.',
        en: 'Free users may see banner or rewarded AdMob ads, but your personal financial records are never used for ad targeting. Premium users are not shown ads.'
      },
      {
        id: 'bug',
        question: { tr: "Bir hata buldum, nasıl bildiririm?", en: "I found a bug — how do I report it?" },
        category: 'support',
        related: ['contact'],
        keywords: ['hata', 'bug', 'çöktü', 'crash', 'sorun bildir', 'report'],
        actions: contactActions,
        tr: 'Hatanın hangi ekranda ve hangi adımlarla oluştuğunu kısaca yazıp Destek sayfasındaki formdan gönderin. Cihaz modeli ve işletim sistemi sürümünü eklerseniz çözüm süreci hızlanır.',
        en: 'Briefly describe on which screen and with which steps the bug occurs, and send it via the form on the Support page. Including your device model and OS version speeds up the resolution.'
      },
      {
        id: 'contact',
        question: { tr: "Destek ekibine nasıl ulaşırım?", en: "How do I contact support?" },
        category: 'support',
        related: ['bug', 'terms'],
        keywords: ['iletişim', 'e-posta', 'email', 'mail', 'contact', 'ulaş'],
        actions: contactActions,
        tr: 'Destek ekibine Destek sayfasındaki formdan ya da support@elfinans.com adresinden ulaşabilirsiniz.',
        en: 'You can reach the support team via the form on the Support page or at support@elfinans.com.'
      },
      {
        id: 'categories',
        question: { tr: "Kategorileri özelleştirebilir miyim?", en: "Can I customize categories?" },
        category: 'features',
        related: ['budget', 'creditcard', 'appearance'],
        keywords: ['kategori', 'category', 'categories'],
        tr: 'Gelir/gider kategorileri (Maaş, Ek Gelir, Kira, Kredi Borcu, Kredi Kartı, Market vb.) hazır renk ve emoji ile gelir; Ayarlar → Kategori Yönetimi bölümünden kendi kategorilerinizi ekleyebilir, yeniden adlandırabilir veya renk/simgesini değiştirebilirsiniz.',
        en: 'Income/expense categories (Salary, Extra Income, Rent, Loan Debt, Credit Card, Market, etc.) come with a color and emoji; you can add, rename or recolor your own categories from Settings → Category Management.'
      },
      {
        id: 'currency',
        question: { tr: "Hangi para birimlerini destekliyor?", en: "Which currencies are supported?" },
        category: 'features',
        related: ['savings', 'reports'],
        keywords: ['para birim', 'döviz', 'currency', 'usd', 'euro', 'altın', 'gümüş', 'kripto', 'crypto', 'gold', 'silver'],
        tr: 'Uygulamanın ana para birimi Türk Lirası\'dır. Ayrıca döviz (USD/EUR/GBP), altın (gram/çeyrek/yarım/tam), gümüş ve kripto (BTC/ETH/USDT) gibi varlıkları güncel piyasa kurlarıyla birikimlerinizde takip edebilirsiniz.',
        en: 'The app\'s base currency is Turkish Lira. You can also track assets like foreign currency (USD/EUR/GBP), gold (gram/quarter/half/full), silver and crypto (BTC/ETH/USDT) in your savings with live market rates.'
      },
      {
        id: 'creditcard',
        question: { tr: "Kredi kartımı nasıl takip ederim?", en: "How do I track my credit card?" },
        category: 'features',
        related: ['budget', 'categories', 'reports'],
        keywords: ['kredi kart', 'ekstre', 'limit', 'asgari ödeme', 'credit card', 'statement', 'minimum payment', 'taksit', 'installment'],
        tr: 'Kredi kartı takibinde ekstre/son ödeme tarihi, asgari ödeme tutarı, kullanılabilir/kullanılan limit, taksitli alışverişler, nakit avans ve gecikme faizi gibi tüm ekstre süreci modellenir. Yaklaşan ekstreleri önden görebilirsiniz.',
        en: 'Credit card tracking models the full statement cycle: statement/due dates, minimum payment amount, available/used limit, installment purchases, cash advances and late fees. You can preview upcoming statements in advance.'
      },
      {
        id: 'budget',
        question: { tr: "Bütçe limiti nasıl kurulur?", en: "How do I set a budget limit?" },
        category: 'features',
        related: ['categories', 'notifications', 'reports'],
        keywords: ['bütçe', 'budget', 'limit aş', 'harcama limit'],
        tr: 'Her kategori için bütçe limiti belirleyebilirsiniz; harcamalarınız limitin %80\'ine ulaştığında uyarı, %100\'üne ulaştığında ise aşım bildirimi Özet ekranındaki bütçe hedefleri kartında görünür.',
        en: 'You can set a budget limit per category; a warning appears at 80% of the limit and an over-limit alert at 100%, shown on the budget goals card in the Summary screen.'
      },
      {
        id: 'savings',
        question: { tr: "Birikim hedefi nasıl oluşturulur?", en: "How do I create a savings goal?" },
        category: 'features',
        related: ['currency', 'budget', 'reports'],
        keywords: ['birikim', 'hedef', 'saving', 'goal'],
        tr: 'Birikim sekmesinden hedef tutarlı birikim hedefleri oluşturabilir, zamanla katkı ekleyebilir ve hedef/mevcut tutarı düzenleyebilirsiniz.',
        en: 'From the Savings tab you can create goals with a target amount, contribute over time, and edit the target or current amount.'
      },
      {
        id: 'shared-account',
        question: { tr: "Ortak hesap nasıl çalışır?", en: "How do shared accounts work?" },
        category: 'features',
        related: ['security', 'delete', 'backup'],
        keywords: ['ortak hesap', 'davet', 'shared account', 'joint account', 'invite', 'rol', 'role'],
        tr: 'Ortak hesaplarda bir davet kodu (QR veya bağlantı) ile diğer kullanıcıları ekleyebilirsiniz. Sahip, Yönetici, Düzenleyici ve Görüntüleyici olmak üzere 4 rol vardır; rol değişikliği ve sahiplik devri Sahip/Yönetici tarafından yapılabilir.',
        en: 'In shared accounts, you invite other users via a code (QR or link). There are 4 roles — Owner, Admin, Editor and Viewer — and role changes or ownership transfer can be done by the Owner/Admin.'
      },
      {
        id: 'reports',
        question: { tr: "Rapor alabilir miyim?", en: "Can I export reports?" },
        category: 'features',
        related: ['ai', 'budget', 'backup'],
        keywords: ['rapor', 'analiz', 'grafik', 'report', 'analytics', 'chart', 'export', 'dışa aktar', 'excel', 'pdf'],
        tr: 'Nakit akışı ve kategori dağılımı gibi grafiklerin yanı sıra raporlarınızı Excel veya PDF olarak dışa aktarabilir, ayrıca yapay zekâ destekli bir finansal danışman özetini görüntüleyebilirsiniz.',
        en: 'Besides charts like cash flow and category distribution, you can export reports as Excel or PDF, and view an AI-powered financial advisor summary.'
      },
      {
        id: 'backup',
        question: { tr: "Verilerimi nasıl yedeklerim?", en: "How do I back up my data?" },
        category: 'features',
        related: ['device', 'security', 'shared-account'],
        keywords: ['yedek', 'backup', 'senkron', 'sync', 'aktar', 'transfer', 'qr'],
        tr: 'Verileriniz cihazda AES-256-GCM ile şifrelenir; manuel/otomatik bulut yedeği, yedek geçmişi ve QR kod ile telefondan telefona veri aktarımı desteklenir.',
        en: 'Your data is encrypted on-device with AES-256-GCM; manual/automatic cloud backup, backup history and phone-to-phone transfer via QR code are supported.'
      },
      {
        id: 'notifications',
        question: { tr: "Bildirimleri nasıl yönetirim?", en: "How do I manage notifications?" },
        category: 'features',
        related: ['budget', 'appearance', 'onboarding'],
        keywords: ['bildirim', 'hatırlat', 'notification', 'reminder'],
        tr: 'Günlük hatırlatma, haftalık/aylık özet, yedekleme hatırlatması ve sabit ödeme/taksit hatırlatmaları gibi bildirimleri Ayarlar\'dan ayrı ayrı açıp kapatabilirsiniz.',
        en: 'You can individually toggle notifications like daily reminders, weekly/monthly summaries, backup reminders and recurring payment/installment reminders from Settings.'
      },
      {
        id: 'appearance',
        question: { tr: "Karanlık mod var mı?", en: "Is there a dark mode?" },
        category: 'features',
        related: ['language', 'notifications', 'platform'],
        keywords: ['tema', 'karanlık mod', 'dark mode', 'theme', 'görünüm', 'appearance', 'renk'],
        tr: 'Açık/Koyu/Sistem tema modu ile birlikte 7 farklı vurgu rengi (Mavi, Slate, Ruby, Pembe, Mor, Teal, Altın) arasından seçim yapabilirsiniz.',
        en: 'You can choose Light/Dark/System theme mode along with 7 accent color themes (Blue, Slate, Ruby, Pink, Purple, Teal, Gold).'
      },
      {
        id: 'language',
        question: { tr: "Hangi dilleri destekliyor?", en: "Which languages are supported?" },
        category: 'features',
        related: ['appearance', 'platform', 'onboarding'],
        keywords: ['dil', 'language', 'türkçe', 'ingilizce', 'almanca', 'fransızca', 'japonca', 'çince', 'japanese', 'chinese', 'brezilya'],
        tr: 'Uygulama Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, Portekizce (Portekiz ve Brezilya), İtalyanca, Japonca ve Çince (Basitleştirilmiş) olmak üzere 10 dili destekler.',
        en: 'The app supports 10 languages: Turkish, English, German, French, Spanish, Portuguese (Portugal and Brazil), Italian, Japanese and Simplified Chinese.'
      },
      {
        id: 'app-lock',
        question: { tr: "PIN veya biyometrik kilit var mı?", en: "Is there a PIN or biometric lock?" },
        category: 'security',
        related: ['security', 'account', 'delete'],
        keywords: ['pin', 'biyometrik', 'parmak izi', 'yüz tanıma', 'biometric', 'face id', 'touch id', 'kilit'],
        tr: 'Uygulamayı 4 haneli PIN ve biyometrik kilit (Face ID/Touch ID veya Android biyometrisi) ile ek bir güvenlik katmanıyla koruyabilirsiniz.',
        en: 'You can protect the app with a 4-digit PIN and biometric lock (Face ID/Touch ID or Android biometrics) as an extra security layer.'
      },
      {
        id: 'pin-forgot',
        question: { tr: "PIN'imi unuttum, ne yapmalıyım?", en: 'I forgot my PIN — what now?' },
        category: 'security',
        related: ['device', 'backup', 'recovery'],
        keywords: ['pin unut', 'pini unuttum', 'pin kodumu unuttum', 'pin hatırlamıyorum', 'kilidi açamıyorum', 'forgot pin', 'forgot my pin', 'pin reset', 'locked out'],
        tr: 'PIN yalnızca cihazınızda saklanır; biz dahil kimse göremez veya sıfırlayamaz. PIN unutulursa kilit, yalnızca o cihazdaki EL Finans verileri silinerek kaldırılabilir; buluta eşitlenmiş veya yedeklenmiş verileriniz daha sonra geri yüklenebilir.',
        en: 'The PIN is stored only on your device; nobody, including us, can see or reset it. If you forget it, the lock can only be removed by deleting the EL Finans data on that device; data synced to the cloud or backed up can be restored afterwards.'
      },
      {
        id: 'recovery',
        question: { tr: 'Yedek parolamı veya kurtarma kodumu kaybettim', en: 'I lost my backup password or recovery code' },
        category: 'security',
        related: ['pin-forgot', 'backup', 'device'],
        keywords: ['şifremi unuttum', 'parolamı unuttum', 'şifre unut', 'parola unut', 'yedek parolası', 'kurtarma kodu', 'acil kurtarma', 'forgot password', 'backup password', 'recovery code'],
        tr: "PIN, yedek parolası ve Acil Kurtarma Kodu yalnızca sizde bulunur; bunları güvenli tutmak sizin sorumluluğunuzdadır. Platform anahtar yedeği kullanılamıyorsa ve eski cihaz, kurtarma kodu ve manuel yedek birlikte kaybedilirse şifreli kişisel bulut verileri kurtarılamaz. Uygulama kilidi PIN'ini unuttuysanız aşağıdaki seçeneğe bakın.",
        en: 'The PIN, backup password and Emergency Recovery Code are only with you, and keeping them safe is your responsibility. If the platform key backup cannot be used and the old device, recovery code and manual backup are all lost, encrypted personal cloud data cannot be recovered. If you forgot your app-lock PIN, see the option below.'
      },
      {
        id: 'platform',
        question: { tr: "Hangi cihazlarda çalışıyor?", en: "Which devices does it run on?" },
        category: 'features',
        related: ['language', 'appearance', 'onboarding'],
        keywords: ['ios', 'android', 'tablet', 'hangi cihaz', 'platform'],
        tr: 'EL Finans iOS ve Android telefonlarda kullanılabilir; tablet desteği şu an bulunmamaktadır.',
        en: 'EL Finans is available on iOS and Android phones; tablet support is not currently available.'
      },
      {
        id: 'download',
        question: { tr: 'Uygulamayı nereden indirebilirim?', en: 'Where can I download the app?' },
        category: 'support',
        keywords: ['indir', 'indirme', 'nereden indir', 'app store', 'google play', 'iphone', 'ios', 'android', 'yükle', 'kur', 'download', 'install', 'get the app'],
        actions: [
          { label: { tr: 'App Store', en: 'App Store' }, href: 'https://apps.apple.com/tr/app/el-finans/id6766858834?l=tr', external: true },
          { label: { tr: 'Google Play', en: 'Google Play' }, href: 'https://play.google.com/store/apps/details?id=com.elfinans.app', external: true }
        ],
        tr: "EL Finans'ı iPhone için App Store'dan, Android için Google Play'den ücretsiz indirebilirsiniz.",
        en: 'You can download EL Finans for free from the App Store for iPhone and from Google Play for Android.'
      },
      {
        id: 'onboarding',
        question: { tr: "Uygulamayı nasıl kullanmaya başlarım?", en: "How do I get started with the app?" },
        category: 'features',
        related: ['ai', 'savings', 'notifications'],
        keywords: ['nasıl kullan', 'başlarken', 'getting started', 'how to use', 'tanıtım turu', 'onboarding'],
        tr: 'İlk açılışta uygulama içi 11 adımlık bir tanıtım turu sizi ilk kayıt, sabit işlem, bütçe hedefleri, yapay zekâ danışmanı ve birikim hedefi oluşturma gibi temel adımlarda yönlendirir; istediğiniz zaman kaldığınız yerden devam edebilirsiniz.',
        en: 'On first launch, an in-app 11-step guided tour walks you through basics like your first transaction, recurring plans, budget goals, the AI advisor and creating a savings goal; you can resume it anytime.'
      },
      {
        id: 'hello',
        keywords: ['merhaba', 'selam', 'selamlar', 'iyi günler', 'günaydın', 'hello', 'hi', 'hey'],
        tr: 'Merhaba! Size nasıl yardımcı olabilirim? Bir konu seçebilir ya da sorunuzu yazabilirsiniz.',
        en: 'Hello! How can I help? Pick a topic or type your question.'
      },
      {
        id: 'thanks',
        keywords: ['teşekkür', 'teşekkürler', 'sağol', 'sağ ol', 'eyvallah', 'thanks', 'thank you'],
        tr: 'Rica ederim! Başka bir sorunuz olursa buradayım.',
        en: "You're welcome! I'm here if you have another question."
      }
    ];
    var byId = {};
    qa.forEach(function (entry) { byId[entry.id] = entry; });

    var categoryMeta = {
      security: { tr: 'Güvenlik', en: 'Security' },
      premium: { tr: 'Premium', en: 'Premium' },
      features: { tr: 'Uygulama Özellikleri', en: 'App Features' },
      support: { tr: 'Destek', en: 'Support' }
    };
    var categoryOrder = ['security', 'premium', 'features', 'support'];
    var categoryEntries = {};
    qa.forEach(function (entry) {
      if (!entry.category) return;
      if (!categoryEntries[entry.category]) categoryEntries[entry.category] = [];
      categoryEntries[entry.category].push(entry);
    });
    var fallback = {
      tr: 'Bunu tam olarak bilemiyorum, ama Destek sayfasındaki Sık Sorulan Sorular\'a bakabilir ya da support@elfinans.com üzerinden bize yazabilirsiniz.',
      en: 'I\'m not sure about that one, but you can check the FAQ on the Support page or reach us at support@elfinans.com.'
    };
    var greeting = {
      tr: 'Merhaba! EL Finans hakkında sorularınızı yanıtlayabilirim. Bir konu seçin ya da sorunuzu doğrudan yazın:',
      en: 'Hi! I can answer questions about EL Finans. Pick a topic below or just type your question:'
    };

    function normalize(text) {
      return text
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/â/g, 'a')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Basit Levenshtein mesafesiyle yazım hatalarını tolere eder.
    function editDistance(a, b) {
      if (a === b) return 0;
      var la = a.length, lb = b.length;
      if (!la) return lb;
      if (!lb) return la;
      var prev = [];
      for (var j = 0; j <= lb; j++) prev[j] = j;
      for (var i = 1; i <= la; i++) {
        var cur = [i];
        for (var k = 1; k <= lb; k++) {
          var cost = a[i - 1] === b[k - 1] ? 0 : 1;
          cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost);
        }
        prev = cur;
      }
      return prev[lb];
    }

    var softenedConsonants = { p: 'b', t: 'd', c: 'c', k: 'g' };

    // Ek almış sözcüklerde kökü ve ünsüzü yumuşamış biçimini dene.
    function startsWithKeyword(word, keyword) {
      if (word === keyword) return true;
      if (keyword.length < 3) return false;
      var softened = keyword.replace(/[ptck]$/, function (letter) {
        return softenedConsonants[letter];
      });
      return word.indexOf(keyword) === 0 || word.indexOf(softened) === 0;
    }

    function wordMatches(word, keyword) {
      if (startsWithKeyword(word, keyword)) return true;
      if (word.length < 4 || keyword.length < 4) return false;
      var tolerance = Math.max(word.length, keyword.length) <= 5 ? 1 : 2;
      if (Math.abs(word.length - keyword.length) > tolerance) return false;
      return editDistance(word, keyword) <= tolerance;
    }

    function findAnswer(query) {
      var normalized = normalize(query);
      if (!normalized) return null;
      var queryWords = normalized.split(' ');
      var paddedQuery = ' ' + normalized + ' ';
      var best = null;
      var bestScore = 0;
      var bestTotal = 0;
      qa.forEach(function (entry) {
        var score = 0;
        var total = 0;
        entry.keywords.forEach(function (kw) {
          var normKw = normalize(kw);
          var exact = paddedQuery.indexOf(' ' + normKw + ' ') !== -1;
          var keywordScore = 0;
          if (!entry.category) {
            if (exact && queryWords.length <= 4) keywordScore = 1;
          } else if (exact) {
            keywordScore = normKw.length * 2;
          } else {
            var kwWords = normKw.split(' ');
            if (kwWords.every(function (kwWord) {
              return queryWords.some(function (qWord) { return startsWithKeyword(qWord, kwWord); });
            })) {
              keywordScore = normKw.length * 1.5;
            } else if (kwWords.every(function (kwWord) {
              return queryWords.some(function (qWord) { return wordMatches(qWord, kwWord); });
            })) {
              keywordScore = normKw.length;
            }
          }
          score = Math.max(score, keywordScore);
          total += keywordScore;
        });
        // Eşitlikte aynı konuyu destekleyen diğer anahtar kelimeleri de hesaba kat.
        if (score > bestScore || (score === bestScore && total > bestTotal)) {
          bestScore = score;
          bestTotal = total;
          best = entry;
        }
      });
      return best;
    }

    var BOT_AVATAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.4" fill="currentColor" stroke="none"/><path d="M9 17.5h6"/></svg>';

    var root = document.createElement('div');
    root.className = 'support-bot';
    root.innerHTML =
      '<button type="button" class="support-bot-toggle" aria-haspopup="dialog" aria-expanded="false" aria-label="Destek asistanı">' +
        '<svg class="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
        '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button>' +
      '<div class="support-bot-panel" role="dialog" aria-label="Destek asistanı" aria-hidden="true">' +
        '<div class="support-bot-head">' +
          '<div class="sb-avatar">' + BOT_AVATAR_SVG + '</div>' +
          '<div class="sb-head-text"><strong class="sb-title">EL Finans Asistanı</strong><span class="sb-sub sb-bot-tag">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg>' +
            '<span class="sb-bot-tag-text">Otomatik yanıt botu</span></span></div>' +
          '<button type="button" class="support-bot-close" aria-label="Kapat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
        '</div>' +
        '<div class="support-bot-body" role="log" aria-live="polite"></div>' +
        '<form class="support-bot-form">' +
          '<input type="text" class="sb-input" autocomplete="off" maxlength="200">' +
          '<button type="submit" class="sb-send" aria-label="Gönder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg></button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(root);

    var toggle = root.querySelector('.support-bot-toggle');
    var panel = root.querySelector('.support-bot-panel');
    var body = root.querySelector('.support-bot-body');
    var form = root.querySelector('.support-bot-form');
    var input = root.querySelector('.sb-input');
    var titleEl = root.querySelector('.sb-title');
    var botTagEl = root.querySelector('.sb-bot-tag-text');
    var started = false;
    var focusTimer;
    var activeSuggestions = null; // en son gösterilen öneri bloğu; yeni mesajda kaldırılır
    var transcript = []; // Çevrilebilir mesajlarda ek olarak bir metin anahtarı saklanır.
    var currentScreen = { screen: 'categories' }; // restore sırasında hangi chip seti üretilecek
    var visitedIds = []; // bu oturumda zaten sorulmuş konu id'leri; tekrar önerilmez

    function currentLang() {
      return /^(en|pt-BR)$/.test(docEl.dataset.activeLang) ? 'en' : 'tr';
    }

    function formatTime() {
      var d = new Date();
      var h = String(d.getHours()).padStart(2, '0');
      var m = String(d.getMinutes()).padStart(2, '0');
      return h + ':' + m;
    }

    function persistHistory() {
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify({ transcript: transcript, screen: currentScreen, visited: visitedIds }));
      } catch (e) { /* gizli mod vb. */ }
    }

    function clearSuggestions() {
      if (activeSuggestions && activeSuggestions.parentNode) activeSuggestions.parentNode.removeChild(activeSuggestions);
      activeSuggestions = null;
    }

    function messageText(message, lang) {
      var entry = byId[message.id];
      var category = categoryMeta[message.catId];
      switch (message.key) {
        case 'entry': return entry ? entry[lang] : message.text;
        case 'question': return entry && entry.question ? entry.question[lang] : message.text;
        case 'greeting': return greeting[lang];
        case 'fallback': return fallback[lang];
        case 'category': return category ? category[lang] : message.text;
        case 'category-intro':
          if (!category) return message.text;
          var label = category[lang];
          return lang === 'en' ? 'Here are the topics under "' + label + '":' : '"' + label + '" altındaki konular:';
        default: return message.text;
      }
    }

    function addMessage(message, skipPersist) {
      clearSuggestions();
      var who = message.who;
      var row = document.createElement('div');
      row.className = 'sb-row sb-row-' + who;
      if (who === 'bot') {
        row.innerHTML = '<div class="sb-avatar sb-avatar-sm">' + BOT_AVATAR_SVG + '</div>';
      }
      var col = document.createElement('div');
      col.className = 'sb-col';
      var msg = document.createElement('div');
      msg.className = 'sb-msg sb-' + who;
      msg.textContent = messageText(message, currentLang());
      var timeEl = document.createElement('span');
      timeEl.className = 'sb-time';
      timeEl.textContent = message.time || formatTime();
      col.appendChild(msg);
      col.appendChild(timeEl);
      row.appendChild(col);
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      if (!skipPersist) {
        message.text = msg.textContent;
        message.time = timeEl.textContent;
        transcript.push(message);
        if (transcript.length > MAX_TRANSCRIPT) transcript = transcript.slice(transcript.length - MAX_TRANSCRIPT);
        persistHistory();
      }
    }

    function showTyping(callback) {
      var row = document.createElement('div');
      row.className = 'sb-row sb-row-bot sb-typing-row';
      row.innerHTML = '<div class="sb-avatar sb-avatar-sm">' + BOT_AVATAR_SVG + '</div>' +
        '<div class="sb-col"><div class="sb-msg sb-bot sb-typing"><span></span><span></span><span></span></div></div>';
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      window.setTimeout(function () {
        if (row.parentNode) row.parentNode.removeChild(row);
        callback();
      }, 550 + Math.random() * 350);
    }

    function renderChips(items, opts) {
      clearSuggestions();
      var all = (items || []).slice();
      var actions = opts && opts.actions || [];
      if (opts && opts.withHome) {
        var lang = currentLang();
        all.push({ label: lang === 'en' ? '← Main topics' : '← Ana konular', onClick: renderCategoryChips, isHome: true });
      }
      if (!all.length && !actions.length) return;
      var wrap = document.createElement('div');
      wrap.className = 'sb-suggestions-inline';
      if (actions.length) {
        var actionRow = document.createElement('div');
        actionRow.className = 'sb-actions';
        actions.forEach(function (action) { actionRow.appendChild(createActionChip(action)); });
        wrap.appendChild(actionRow);
      }
      all.forEach(function (item) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'sb-chip' + (item.isHome ? ' sb-chip-home' : '');
        chip.textContent = item.label;
        chip.addEventListener('click', item.onClick);
        wrap.appendChild(chip);
      });
      body.appendChild(wrap);
      body.scrollTop = body.scrollHeight;
      activeSuggestions = wrap;
    }

    function createActionChip(action) {
      var chip = document.createElement(action.href ? 'a' : 'button');
      chip.className = 'sb-chip sb-chip-link';
      chip.textContent = action.label[currentLang()];
      if (action.href) chip.href = actionHref(action.href);
      else chip.type = 'button';
      if (action.external) {
        chip.target = '_blank';
        chip.rel = 'noopener';
      }
      if (action.run) {
        chip.addEventListener('click', function (e) {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          action.run();
        });
      }
      var icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = action.external ? '↗' : '→';
      chip.appendChild(icon);
      return chip;
    }

    function actionHref(href) {
      if (href === '/#plans' && document.getElementById('plans')) return '#plans';
      if (!usePhysicalHtmlLinks || href.charAt(0) !== '/') return href;
      var parts = href.slice(1).split('#');
      var prefix = window.location.protocol !== 'file:' && document.body.classList.contains('error-page') ? '/' : '';
      return prefix + (parts[0] || 'index') + '.html' + (parts[1] ? '#' + parts[1] : '');
    }

    // Mevcut sayfada destek formu varsa oraya kaydırır; yoksa /support sayfasına yönlendirir.
    function goToSupportForm() {
      var lang = currentLang();
      var localForm = document.querySelector('section[data-lang="' + lang + '"] form.contact-form');
      if (localForm) {
        var card = localForm.closest('.form-card') || localForm;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('sb-highlight');
        window.setTimeout(function () { card.classList.remove('sb-highlight'); }, 1600);
        return;
      }
      window.location.href = actionHref(supportFormAction.href);
    }

    // related id listesinden chip tanımları üretir (askEntry'e bağlı).
    // Bu oturumda zaten sorulmuş konular tekrar önerilmez.
    function chipsForRelated(relatedIds, excludeId) {
      var lang = currentLang();
      return (relatedIds || [])
        .map(function (id) { return byId[id]; })
        .filter(function (e) { return e && e.id !== excludeId && visitedIds.indexOf(e.id) === -1; })
        .map(function (relEntry) {
          return { label: relEntry.question[lang], onClick: function () { askEntry(relEntry); } };
        });
    }

    function setScreen(screen) {
      currentScreen = screen;
      renderChipsForScreen(currentScreen);
      persistHistory();
    }

    function renderCategoryChips() {
      setScreen({ screen: 'categories' });
    }

    // Bir kategoriye girildiğinde: o kategorideki tüm soru başlıkları.
    function openCategory(catId) {
      addMessage({ who: 'user', key: 'category', catId: catId });
      showTyping(function () {
        addMessage({ who: 'bot', key: 'category-intro', catId: catId });
        setScreen({ screen: 'category', catId: catId });
      });
    }

    function askEntry(entry) {
      addMessage({ who: 'user', key: 'question', id: entry.id });
      showTyping(function () {
        replyToEntry(entry);
      });
    }

    function replyToEntry(entry) {
      addMessage({ who: 'bot', key: 'entry', id: entry.id });
      if (entry.category) {
        if (visitedIds.indexOf(entry.id) === -1) visitedIds.push(entry.id);
        setScreen({ screen: 'entry', entryId: entry.id });
      } else {
        renderCategoryChips();
      }
    }

    function refreshStrings() {
      var lang = currentLang();
      toggle.setAttribute('aria-label', lang === 'en' ? 'Support assistant' : 'Destek asistanı');
      panel.setAttribute('aria-label', lang === 'en' ? 'Support assistant' : 'Destek asistanı');
      titleEl.textContent = lang === 'en' ? 'EL Finans Assistant' : 'EL Finans Asistanı';
      botTagEl.textContent = lang === 'en' ? 'Automated reply bot' : 'Otomatik yanıt botu';
      input.setAttribute('placeholder', lang === 'en' ? 'Type your question…' : 'Sorunuzu yazın…');
    }

    function ask(text) {
      var trimmed = text.trim();
      if (!trimmed) return;
      addMessage({ text: trimmed, who: 'user' });
      input.value = '';
      showTyping(function () {
        var match = findAnswer(trimmed);
        if (match) {
          replyToEntry(match);
        } else {
          addMessage({ who: 'bot', key: 'fallback' });
          setScreen({ screen: 'fallback' });
        }
      });
    }

    // Ekran durumundan aksiyonları ve takip çiplerini yeniden üretir.
    function renderChipsForScreen(screen) {
      var lang = currentLang();
      if (screen.screen === 'category') {
        renderChips((categoryEntries[screen.catId] || [])
          .filter(function (entry) { return visitedIds.indexOf(entry.id) === -1; })
          .map(function (entry) {
            return { label: entry.question[lang], onClick: function () { askEntry(entry); } };
          }), { withHome: true });
      } else if (screen.screen === 'entry') {
        var entry = byId[screen.entryId];
        renderChips(entry ? chipsForRelated(entry.related, entry.id) : [], { withHome: true, actions: entry && entry.actions });
      } else if (screen.screen === 'fallback') {
        renderChips([], { withHome: true, actions: contactActions });
      } else {
        renderChips(categoryOrder.map(function (catId) {
          return { label: categoryMeta[catId][lang], onClick: function () { openCategory(catId); } };
        }));
      }
    }

    function restoreHistory() {
      var raw;
      try { raw = sessionStorage.getItem(HISTORY_KEY); } catch (e) { return false; }
      if (!raw) return false;
      var saved;
      try { saved = JSON.parse(raw); } catch (e) { return false; }
      if (!saved || !Array.isArray(saved.transcript) || !saved.transcript.length) return false;
      transcript = saved.transcript;
      visitedIds = Array.isArray(saved.visited) ? saved.visited : [];
      currentScreen = saved.screen || { screen: 'categories' };
      rerenderInCurrentLang();
      return true;
    }

    function openPanel() {
      root.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
      if (!started) {
        started = true;
        if (!restoreHistory()) {
          addMessage({ who: 'bot', key: 'greeting' });
          renderCategoryChips();
        }
      }
      focusTimer = window.setTimeout(function () { input.focus(); }, 260);
      try { sessionStorage.setItem(CHAT_KEY, '1'); } catch (e) { /* gizli mod vb. */ }
    }

    function closePanel() {
      window.clearTimeout(focusTimer);
      toggle.focus();
      root.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
      try { sessionStorage.removeItem(CHAT_KEY); } catch (e) { /* gizli mod vb. */ }
    }

    toggle.addEventListener('click', function () {
      if (root.classList.contains('open')) closePanel(); else openPanel();
    });
    root.querySelector('.support-bot-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('open')) closePanel();
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });

    // Geçmişi aynı zaman damgalarıyla ve mevcut dilde yeniden çiz.
    function rerenderInCurrentLang() {
      if (!started) return;
      var typingRows = body.querySelectorAll('.sb-typing-row');
      body.textContent = '';
      transcript.forEach(function (message) { addMessage(message, true); });
      renderChipsForScreen(currentScreen);
      typingRows.forEach(function (row) { body.appendChild(row); });
      body.scrollTop = body.scrollHeight;
    }

    refreshStrings();
    var previousRenderHook = window.__supportBotRefresh;
    window.__supportBotRefresh = function () {
      refreshStrings();
      rerenderInCurrentLang();
      if (previousRenderHook) previousRenderHook();
    };

    try {
      if (sessionStorage.getItem(CHAT_KEY) === '1') openPanel();
    } catch (e) { /* gizli mod vb. */ }
  })();
})();
