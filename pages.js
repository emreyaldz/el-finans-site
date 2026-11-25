(function () {
  'use strict';

  const docEl = document.documentElement;
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  if (embedded) {
    docEl.classList.add('embed-policy');
    // Aynı kökenli okuyucu, depolama kapalı olsa da formun dilini ve temasını alır.
    if (window.parent !== window) {
      try {
        const parentRoot = window.parent.document.documentElement;
        if (parentRoot.dataset.activeLang) docEl.dataset.embedLang = parentRoot.dataset.activeLang;
        if (parentRoot.dataset.theme) {
          docEl.dataset.theme = parentRoot.dataset.theme;
          docEl.style.colorScheme = parentRoot.dataset.theme;
        }
      } catch (error) { /* Başka kökenden gömüldüğünde kayıtlı tercihler kullanılır. */ }
    }
  }

  // ── Destek formu ve gizlilik okuyucusu ──
  function setupSupport(site) {
    document.querySelectorAll('form.contact-form').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const name = form.elements.namedItem('name').value.trim();
        const email = form.elements.namedItem('email').value.trim();
        const message = form.elements.namedItem('message').value.trim();
        const english = form.closest('section[data-lang="en"]') !== null;
        const subject = (english ? 'EL Finans Support' : 'EL Finans Destek') + (name ? ' - ' + name : '');
        const body = message + '\n\n' + (english ? 'Name: ' : 'Ad Soyad: ') + name
          + '\n' + (english ? 'Email: ' : 'E-posta: ') + email;
        location.href = 'mailto:support@elfinans.com?subject=' + encodeURIComponent(subject)
          + '&body=' + encodeURIComponent(body);
      });
    });

    const reader = document.getElementById('privacy-reader');
    if (!reader || typeof reader.showModal !== 'function') return;
    const frame = reader.querySelector('iframe');
    const closeButton = reader.querySelector('.privacy-reader-close');
    const acceptButton = reader.querySelector('.privacy-accept');
    const title = document.getElementById('privacy-reader-title');
    let opener = null;

    function closeReader() {
      site.closeOverlay(reader, opener);
    }

    document.querySelectorAll('.contact-form .privacy-modal-link').forEach(function (link) {
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = link;
        frame.title = title.textContent;
        frame.src = frame.dataset.src;
        site.openOverlay(reader, closeButton);
      });
    });
    closeButton.addEventListener('click', closeReader);
    acceptButton.addEventListener('click', function () {
      const checkbox = document.querySelector('section[data-lang]:not([hidden]) .contact-form input[name="privacy_consent"]');
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      closeReader();
    });
    reader.addEventListener('cancel', function (event) {
      event.preventDefault();
      closeReader();
    });
    reader.addEventListener('click', function (event) {
      if (event.target === reader) closeReader();
    });
    reader.addEventListener('close', function () {
      if (reader.open) return;
      frame.removeAttribute('src');
      opener = null;
    });
    frame.addEventListener('load', function () {
      // Odak iframe içindeyken Escape tuşu üst belgeye yayılmaz.
      frame.contentDocument?.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && reader.open) {
          event.preventDefault();
          closeReader();
        }
      });
    });
  }

  // ── Sık sorulan sorular ──
  function setupFaq() {
    document.querySelectorAll('.faq-acc').forEach(function (list) {
      let expanded = null;
      function setExpanded(button, open) {
        button.setAttribute('aria-expanded', String(open));
        button.closest('.faq-item').classList.toggle('open', open);
        document.getElementById(button.getAttribute('aria-controls')).inert = !open;
      }

      list.querySelectorAll('.faq-q').forEach(function (button) {
        setExpanded(button, false);
        button.disabled = false;
        button.addEventListener('click', function () {
          const open = button !== expanded;
          if (expanded) setExpanded(expanded, false);
          expanded = open ? button : null;
          if (open) setExpanded(button, true);
        });
      });
      list.classList.add('faq-ready');
    });
  }

  // ── İçindekiler ve kaydırma takibi ──
  function setupLegalToc(site) {
    const toc = document.querySelector('.legal-toc');
    if (!toc) return;
    const list = toc.querySelector('nav');
    const desktop = window.matchMedia('(min-width: 1100px)');
    const sections = document.querySelectorAll('.legal-content section[data-lang]');
    const entriesByLang = new Map();
    let entries = [];
    let current = null;
    let pinned = null;
    let frame = null;

    sections.forEach(function (section) {
      const lang = section.dataset.lang;
      const items = Array.from(section.querySelectorAll('.legal-block h2'), function (heading, index) {
        const block = heading.closest('.legal-block');
        block.id = 'bolum-' + lang + '-' + (index + 1);
        block.tabIndex = -1;
        const link = document.createElement('a');
        link.href = '#' + block.id;
        link.textContent = heading.textContent.replace(/^\d+\.\s*/, '');
        return { block, link };
      });
      entriesByLang.set(lang, items);
    });

    function setCurrent(entry) {
      if (current === entry) return;
      if (current) current.link.removeAttribute('aria-current');
      current = entry;
      current.link.setAttribute('aria-current', 'location');
      if (!desktop.matches) return;
      const linkRect = current.link.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      if (linkRect.top < listRect.top) list.scrollTop += linkRect.top - listRect.top;
      if (linkRect.bottom > listRect.bottom) list.scrollTop += linkRect.bottom - listRect.bottom;
    }

    function update() {
      frame = null;
      if (!desktop.matches || !entries.length) return;
      if (pinned) {
        setCurrent(pinned);
        return;
      }
      // Referans çizgisini geçen son bölüm, sayfa sonunda ise son madde seçilir.
      const refY = Math.max(140, window.innerHeight * .3);
      const atEnd = window.scrollY + window.innerHeight >= docEl.scrollHeight - 8;
      let visible = entries[0];
      for (const entry of entries) {
        if (!atEnd && entry.block.getBoundingClientRect().top > refY) break;
        visible = entry;
      }
      setCurrent(visible);
    }

    function queueUpdate() {
      if (frame === null) frame = requestAnimationFrame(update);
    }

    function unpin() {
      if (!pinned) return;
      pinned = null;
      queueUpdate();
    }

    function buildLegalToc(lang) {
      if (current) current.link.removeAttribute('aria-current');
      current = null;
      pinned = null;
      entries = entriesByLang.get(lang) || [];
      list.replaceChildren(...entries.map(function (entry) { return entry.link; }));
      list.scrollTop = 0;
      toc.hidden = entries.length === 0;
      queueUpdate();
    }

    list.addEventListener('click', function (event) {
      const link = event.target.closest('a');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const entry = entries.find(function (item) { return item.link === link; });
      if (!entry) return;
      event.preventDefault();
      pinned = entry;
      setCurrent(entry);
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      entry.block.focus({ preventScroll: true });
      entry.block.scrollIntoView({ behavior: 'smooth' });
    });
    window.addEventListener('scroll', queueUpdate, { passive: true });
    window.addEventListener('resize', queueUpdate, { passive: true });
    window.addEventListener('wheel', unpin, { passive: true });
    window.addEventListener('touchstart', unpin, { passive: true });
    window.addEventListener('hashchange', unpin);
    window.addEventListener('keydown', function (event) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) unpin();
    });
    site.onLangChange(buildLegalToc);
    buildLegalToc(site.lang());

    const initial = entries.find(function (entry) { return entry.link.hash === location.hash; });
    if (initial) initial.block.scrollIntoView();
  }

  // ── Görünüme giren bölümlerin animasyonu ──
  function setupReveal() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const item = entry.target;
        observer.unobserve(item);
        item.classList.add('page-entering');
        const finish = function (event) {
          if (event.target !== item) return;
          item.classList.remove('page-entering');
          item.removeEventListener('animationend', finish);
          item.removeEventListener('animationcancel', finish);
        };
        item.addEventListener('animationend', finish);
        item.addEventListener('animationcancel', finish);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-page-reveal], .legal-intro, .legal-block').forEach(function (item) {
      observer.observe(item);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const site = window.ELSite;
    if (!site || embedded) return;
    setupSupport(site);
    setupFaq();
    setupLegalToc(site);
    setupReveal();
  });
})();
