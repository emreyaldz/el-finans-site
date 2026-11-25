(function () {
  'use strict';

  const docEl = document.documentElement;
  // JS'e bağlı denetimler (tema, dil menüsü) ve giriş animasyonları bu sınıfla açılır.
  docEl.classList.add('js');
  const nav = document.querySelector('.nav');
  const drawer = document.querySelector('.nav-drawer');
  const drawerToggle = nav && nav.querySelector('.nav-burger');
  const langSwitch = document.querySelector('.lang-switch');
  const langToggle = langSwitch && langSwitch.querySelector('.lang-toggle');
  const langMenu = langSwitch && langSwitch.querySelector('.lang-menu');
  const langCurrent = langSwitch && langSwitch.querySelector('.lang-current');
  const langButtons = Array.from(document.querySelectorAll('[data-set-lang]'));
  const themeToggle = document.querySelector('.theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const langKey = 'el-finans-language';
  const themeKey = 'el-finans-theme';
  const supportedLangs = ['tr', 'en', 'pt-BR'];
  const listeners = new Set();
  const openDialogs = new Set();
  let activeLang = 'tr';

  // ── Yerel önizleme yolları ──
  const usePhysicalHtmlLinks = location.protocol === 'file:'
    || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const errorPage = document.body.classList.contains('error-page');
  const physicalRoutePrefix = errorPage && location.protocol !== 'file:' ? '/' : '';
  const routeFiles = {
    '/': 'index.html',
    '/support': 'support.html',
    '/privacy-policy': 'privacy-policy.html',
    '/terms': 'terms.html',
    '/account-deletion': 'account-deletion.html',
    '/cookie-policy': 'cookie-policy.html'
  };

  function localizeStaticRoutes(root = document) {
    if (!usePhysicalHtmlLinks) return;
    root.querySelectorAll('a[href]').forEach(function (link) {
      const match = link.getAttribute('href').match(/^(\/[^?#]*)([?#].*)?$/);
      if (match && routeFiles[match[1]]) link.setAttribute('href', physicalRoutePrefix + routeFiles[match[1]] + (match[2] || ''));
    });
  }

  if (!errorPage && !usePhysicalHtmlLinks && /^https?:$/.test(location.protocol) && /\.html$/.test(location.pathname)) {
    const cleanPath = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    history.replaceState(null, '', cleanPath + location.search + location.hash);
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* Depolama kapalı olabilir. */ }
  }

  // ── Tema ──
  function localizedValue(turkish, english, portuguese) {
    if (activeLang === 'pt-BR') return portuguese ?? english ?? turkish;
    return activeLang === 'en' ? english ?? turkish : turkish;
  }

  function updateThemeLabel() {
    if (!themeToggle) return;
    const data = themeToggle.dataset;
    const label = docEl.dataset.theme === 'light'
      ? localizedValue(data.darkLabelTr, data.darkLabelEn, data.darkLabelPtBr)
      : localizedValue(data.labelTr, data.labelEn, data.labelPtBr);
    themeToggle.setAttribute('aria-label', label);
  }

  function applyTheme(theme) {
    docEl.dataset.theme = theme;
    docEl.style.colorScheme = theme;
    if (themeColor) themeColor.content = getComputedStyle(docEl).getPropertyValue('--bg').trim();
    updateThemeLabel();
  }

  if (themeToggle) {
    let selectedTheme = docEl.dataset.theme;
    themeToggle.addEventListener('click', function () {
      selectedTheme = selectedTheme === 'light' ? 'dark' : 'light';
      savePreference(themeKey, selectedTheme);
      const change = function () { applyTheme(selectedTheme); };
      if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(change).ready.catch(function () { /* Görüntü geçişi atlanabilir. */ });
      } else {
        change();
      }
    });
  }

  // ── Dil ve klavye ile gezilebilen dil menüsü ──
  function translateAttribute(attribute, prefix) {
    document.querySelectorAll('[data-' + prefix + '-en], [data-' + prefix + '-pt-br]').forEach(function (element) {
      const data = element.dataset;
      const original = prefix + 'Tr';
      if (data[original] === undefined) data[original] = element.getAttribute(attribute) || '';
      element.setAttribute(attribute, localizedValue(data[original], data[prefix + 'En'], data[prefix + 'PtBr']));
    });
  }

  function applyLang(lang) {
    const previous = activeLang;
    activeLang = lang;
    docEl.lang = lang;
    docEl.dataset.activeLang = lang;
    document.querySelectorAll('[data-en], [data-pt-br]').forEach(function (element) {
      const data = element.dataset;
      if (data.tr === undefined) data.tr = element.innerHTML;
      const html = localizedValue(data.tr, data.en, data.ptBr);
      if (element.innerHTML !== html) element.innerHTML = html;
    });
    translateAttribute('aria-label', 'label');
    translateAttribute('alt', 'alt');
    updateThemeLabel();

    const langSections = Array.from(document.querySelectorAll('[data-lang]'));
    const sectionLang = lang === 'pt-BR' && !langSections.some(function (section) { return section.dataset.lang === lang; })
      ? 'en' : lang;
    langSections.forEach(function (section) { section.hidden = section.dataset.lang !== sectionLang; });
    langButtons.forEach(function (button) {
      const checked = String(button.dataset.setLang === lang);
      button.setAttribute(button.getAttribute('role') === 'menuitemradio' ? 'aria-checked' : 'aria-pressed', checked);
    });
    if (langCurrent) langCurrent.textContent = lang.toUpperCase();

    localizeStaticRoutes();
    if (previous !== lang) {
      listeners.forEach(function (listener) { listener(lang); });
      if (typeof window.__supportBotRefresh === 'function') window.__supportBotRefresh();
    }
  }

  function closeLangMenu(returnFocus) {
    if (!langMenu || langMenu.hidden) return;
    langMenu.hidden = true;
    langToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) langToggle.focus({ preventScroll: true });
  }

  langButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const lang = button.dataset.setLang;
      if (!supportedLangs.includes(lang)) return;
      applyLang(lang);
      savePreference(langKey, lang);
      closeLangMenu(true);
    });
  });

  if (langToggle && langMenu) {
    const items = langButtons.filter(function (button) { return langMenu.contains(button); });
    const openLangMenu = function (item) {
      langMenu.hidden = false;
      langToggle.setAttribute('aria-expanded', 'true');
      item.focus({ preventScroll: true });
    };

    langToggle.addEventListener('click', function () {
      if (langMenu.hidden) {
        const current = items.find(function (item) { return item.dataset.setLang === activeLang; });
        openLangMenu(current || items[0]);
      } else {
        closeLangMenu(true);
      }
    });
    langToggle.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      openLangMenu(event.key === 'ArrowDown' ? items[0] : items[items.length - 1]);
    });
    langMenu.addEventListener('keydown', function (event) {
      const index = items.indexOf(document.activeElement);
      let next;
      switch (event.key) {
        case 'ArrowDown': next = (index + 1) % items.length; break;
        case 'ArrowUp': next = (index - 1 + items.length) % items.length; break;
        case 'Home': next = 0; break;
        case 'End': next = items.length - 1; break;
        case 'Escape':
          event.preventDefault();
          closeLangMenu(true);
          return;
        case 'Tab':
          closeLangMenu(true);
          return;
        default: return;
      }
      event.preventDefault();
      items[next].focus({ preventScroll: true });
    });
    document.addEventListener('click', function (event) {
      if (!langSwitch.contains(event.target)) closeLangMenu(langMenu.contains(document.activeElement));
    });
    document.addEventListener('focusin', function (event) {
      if (!langSwitch.contains(event.target)) closeLangMenu(false);
    });
  }

  // ── Ortak dialog yönetimi ──
  function unlockOverlay(dialog) {
    openDialogs.delete(dialog);
    document.body.classList.toggle('overlay-open', openDialogs.size > 0);
  }

  function openOverlay(dialog, initialFocus) {
    if (dialog.open) return;
    dialog.showModal();
    openDialogs.add(dialog);
    document.body.classList.add('overlay-open');
    if (initialFocus) initialFocus.focus({ preventScroll: true });
  }

  function closeOverlay(dialog, returnFocus) {
    if (!dialog.open) return;
    dialog.close();
    unlockOverlay(dialog);
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }

  document.addEventListener('close', function (event) {
    const dialog = event.target;
    if (openDialogs.has(dialog) && !dialog.open) unlockOverlay(dialog);
  }, true);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || !openDialogs.size) return;
    const dialog = event.target.closest('dialog');
    if (!openDialogs.has(dialog)) return;
    const items = Array.from(dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'))
      .filter(function (item) { return item.tabIndex >= 0 && !item.matches(':disabled') && item.getClientRects().length; });
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || document.activeElement !== (event.shiftKey ? first : last)) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  });

  if (drawer && drawerToggle && typeof drawer.showModal === 'function') {
    const drawerClose = drawer.querySelector('.drawer-close');
    const mobile = window.matchMedia('(max-width: 900px)');
    const closeDrawer = function (returnFocus) {
      drawerToggle.setAttribute('aria-expanded', 'false');
      closeOverlay(drawer, returnFocus || drawerToggle);
    };

    docEl.classList.add('drawer-ready');
    drawerToggle.addEventListener('click', function () {
      openOverlay(drawer, drawerClose);
      drawerToggle.setAttribute('aria-expanded', 'true');
    });
    drawerClose.addEventListener('click', function () { closeDrawer(); });
    drawer.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeDrawer();
    });
    drawer.addEventListener('close', function () {
      if (!drawer.open) drawerToggle.setAttribute('aria-expanded', 'false');
    });
    drawer.addEventListener('click', function (event) {
      if (event.target === drawer && event.clientX < drawer.getBoundingClientRect().left) {
        closeDrawer();
        return;
      }
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented) return;
      const target = link.getAttribute('href').startsWith('#') ? document.getElementById(link.hash.slice(1)) : null;
      closeDrawer(target);
    });
    mobile.addEventListener('change', function (event) {
      if (!event.matches && drawer.open) closeDrawer(nav.querySelector('.main-nav a'));
    });
  }

  // ── Sabit gezinme ve kaydırma ilerlemesi ──
  if (nav) {
    let scrollFrame = null;
    const syncNav = function () {
      scrollFrame = null;
      const scroll = window.scrollY;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      nav.style.setProperty('--progress', Math.max(0, Math.min(1, scroll / maxScroll)));
      nav.classList.toggle('scrolled', scroll > 12);
    };
    const queueNav = function () {
      if (scrollFrame === null) scrollFrame = requestAnimationFrame(syncNav);
    };
    window.addEventListener('scroll', queueNav, { passive: true });
    window.addEventListener('resize', queueNav, { passive: true });
    window.addEventListener('load', queueNav, { once: true });
    listeners.add(queueNav);
    if ('ResizeObserver' in window) new ResizeObserver(queueNav).observe(document.body);
    queueNav();
  }

  window.ELSite = {
    lang: function () { return activeLang; },
    onLangChange: function (listener) {
      listeners.add(listener);
      return function () { listeners.delete(listener); };
    },
    openOverlay,
    closeOverlay,
    usePhysicalHtmlLinks,
    localizeStaticRoutes
  };

  let savedLang;
  try {
    savedLang = localStorage.getItem(langKey) || localStorage.getItem('el-finans-privacy-language');
  } catch (error) { /* Depolama kapalı olabilir. */ }
  const available = langButtons.map(function (button) { return button.dataset.setLang; });
  const preferredLang = docEl.dataset.embedLang || savedLang;
  const initialLang = available.includes(preferredLang) ? preferredLang
    : preferredLang === 'pt-BR' && available.includes('en') ? 'en' : docEl.lang;
  applyLang(supportedLangs.includes(initialLang) ? initialLang : 'tr');
  applyTheme(docEl.dataset.theme === 'dark' ? 'dark' : 'light');
})();
