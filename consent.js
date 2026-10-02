/* EL Finans — cookie consent and Google Analytics loader.
 *
 * Google Analytics loads ONLY after the visitor accepts analytics cookies.
 * Rejecting (or not choosing) sends nothing to Google. The choice is kept for
 * 12 months and can be changed from "Çerez Tercihleri" in the footer.
 *
 * The banner is always shown so the visitor's choice is recorded in advance.
 * Analytics itself runs only when GA_MEASUREMENT_ID (G-XXXXXXXXXX) is set AND
 * the visitor accepted; with an empty ID nothing is ever sent to Google.
 */
(function () {
  'use strict';

  var GA_MEASUREMENT_ID = '';
  var STORAGE_KEY = 'el-finans-cookie-consent';
  var CONSENT_VERSION = 1;
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

  var analyticsConfigured = /^G-[A-Z0-9]{6,12}$/.test(GA_MEASUREMENT_ID);
  var settingsLinks = document.querySelectorAll('.js-cookie-settings');

  Array.prototype.forEach.call(settingsLinks, function (link) {
    link.hidden = false;
    link.addEventListener('click', function (event) {
      event.preventDefault();
      showBanner();
    });
  });

  function readChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.v !== CONSENT_VERSION || typeof saved.analytics !== 'boolean') return null;
      if (!(Date.now() - Number(saved.at) < MAX_AGE_MS)) return null;
      return saved;
    } catch (e) {
      return null;
    }
  }

  function saveChoice(analytics) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION, analytics: analytics, at: Date.now() }));
    } catch (e) { /* private mode: the banner simply asks again next visit */ }
  }

  var gaLoaded = false;
  function loadAnalytics() {
    if (gaLoaded || !analyticsConfigured) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function removeAnalyticsCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^_ga(_|$)|^_gid$|^_gat/.test(name)) return;
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '');
      });
    });
  }

  var banner = null;
  function buildBanner() {
    var el = document.createElement('div');
    el.className = 'cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', 'Çerez tercihleri');
    el.hidden = true;
    el.innerHTML =
      '<p class="cookie-banner-text" data-en="We use Google Analytics cookies to understand how the site is used, only with your consent. Necessary storage (language preference) is always on. ' +
      '&lt;a href=&quot;/cookie-policy&quot;&gt;Cookie Policy&lt;/a&gt;" data-pt-br="Usamos cookies do Google Analytics para entender como o site é usado, somente com o seu consentimento. O armazenamento necessário (preferência de idioma) fica sempre ativo. ' +
      '&lt;a href=&quot;/cookie-policy&quot;&gt;Política de Cookies&lt;/a&gt;">' +
      'Sitenin nasıl kullanıldığını anlamak için yalnızca onay vermeniz halinde Google Analytics çerezleri kullanırız. Zorunlu depolama (dil tercihi) her zaman açıktır. ' +
      '<a href="/cookie-policy">Çerez Politikası</a></p>' +
      '<div class="cookie-banner-actions">' +
      '<button type="button" class="cookie-btn" data-choice="reject" data-en="Reject" data-pt-br="Recusar">Reddet</button>' +
      '<button type="button" class="cookie-btn" data-choice="accept" data-en="Accept" data-pt-br="Aceitar">Kabul et</button>' +
      '</div>';
    el.addEventListener('click', function (event) {
      var button = event.target.closest('[data-choice]');
      if (!button) return;
      var accepted = button.getAttribute('data-choice') === 'accept';
      saveChoice(accepted);
      if (accepted) {
        loadAnalytics();
      } else {
        if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
        removeAnalyticsCookies();
      }
      el.hidden = true;
    });
    document.body.appendChild(el);
    return el;
  }

  function showBanner() {
    banner.hidden = false;
    var first = banner.querySelector('[data-choice="reject"]');
    if (first) first.focus();
  }

  // Built before script.js runs so the site's language switcher translates it.
  banner = buildBanner();
  var choice = readChoice();
  if (!choice) {
    banner.hidden = false;
  } else if (choice.analytics) {
    loadAnalytics();
  }
})();
