(function () {
  'use strict';

  const style = function (element, property, value) { element.style.setProperty(property, value); };

  // ── Telefon gövdesi ──
  function buildPhones() {
    if (!window.CSS || !CSS.supports('color', 'color-mix(in srgb, black, white)')) return;

    function part(parent, className) {
      const element = document.createElement('span');
      element.className = className;
      parent.appendChild(element);
      return element;
    }

    const body = document.createElement('span');
    body.className = 'phone-body';
    body.setAttribute('aria-hidden', 'true');

    // İlk sınır ön yüz. 367 px genişlikte ve 12° dönüşte 10 aralığın her biri yaklaşık 0,9 px kayar.
    const contourCount = 10;
    for (let step = 1; step <= contourCount; step++) {
      const offset = .5 - step / contourCount;
      const edge = (2 * offset) ** 2;
      // Gölge en arkadaki halkada durur; ön yüzde olsaydı bandı karartırdı.
      const contour = part(body, step === contourCount ? 'phone-contour phone-contour-back' : 'phone-contour');
      style(contour, '--contour-offset', offset);
      style(contour, '--contour-light', (55 + 25 * edge) + '%');
      style(contour, '--contour-shine', (26 * edge * edge) + '%');
    }

    ['action', 'volume-up', 'volume-down', 'power'].forEach(function (key) {
      part(body, 'phone-key phone-key-' + key);
    });

    document.querySelectorAll('.phone').forEach(function (phone) {
      phone.appendChild(body.cloneNode(true));
      phone.classList.add('phone-3d');
    });
  }

  buildPhones();

  const docEl = document.documentElement;
  const site = window.ELSite;

  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  const initialHash = location.hash;
  let hashTarget = null;
  if (docEl.classList.contains('hash-jump')) {
    try {
      hashTarget = document.getElementById(decodeURIComponent(initialHash.slice(1)));
    } catch (error) { /* Hatalı kodlanmış bağlantı normal açılışa döner. */ }
    if (hero.contains(hashTarget)) hashTarget = null;
    if (!hashTarget) docEl.classList.remove('hash-jump');
  }
  const heroCopy = hero.querySelector('.hero-copy');
  const heroParallax = hero.querySelector('.hero-parallax');
  const canvas = hero.querySelector('.aurora');
  const features = document.querySelector('.showcase');
  const highlights = features.querySelector('.highlights');
  const highlightsFrame = features.querySelector('.scene-frame');
  const highlightsViewport = highlights.querySelector('.highlights-viewport');
  const highlightTrack = highlights.querySelector('.highlights-track');
  const highlightCards = Array.from(highlightTrack.querySelectorAll('.highlight-card'));
  const highlightProgress = highlights.querySelector('.highlights-dots');
  const highlightDots = Array.from(highlightProgress.querySelectorAll('.highlight-dot'));
  const highlightPlayback = highlights.querySelector('.highlight-playback');
  const aiSection = document.querySelector('.ai-section');
  const gallery = document.querySelector('.gallery');
  const galleryViewport = gallery.querySelector('.gallery-viewport');
  const galleryFrame = gallery.querySelector('.scene-frame');
  const shots = Array.from(gallery.querySelectorAll('.shot'));
  const shotModal = document.querySelector('.shot-modal');
  const modalImage = shotModal.querySelector('img');
  const modalClose = shotModal.querySelector('.shot-modal-close');
  const scenes = Array.from(document.querySelectorAll('[data-scene]'));
  const sceneFrames = Array.from(document.querySelectorAll('.viewport-stage > .scene-frame'));
  const revealByScene = new Map(scenes.map(function (scene) {
    return [scene, scene.querySelector('.section-reveal')];
  }));

  const mobile = window.matchMedia('(max-width: 900px)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hasObserver = 'IntersectionObserver' in window;
  const observed = new Set();
  const clamp = function (value, low, high) { return Math.max(low, Math.min(high, value)); };
  const unit = function (value) { return clamp(value, 0, 1); };
  const ease = function (value) { return value * value * (3 - 2 * value); };

  let frame = null;
  let lastFrame = 0;
  let layoutDirty = true;
  let scrollDirty = true;
  let hashPosition = null;
  let hashLayoutSettled = false;
  let viewportHeight = window.innerHeight;
  let navHeight = nav.offsetHeight;
  let heroOnScreen = false;
  let heroProgress = 0;
  let galleryOnScreen = false;
  let aiOnScreen = false;
  let statsOnScreen = false;
  let shotOpener = null;

  // ── Mobil kart rayları ──
  function setupRail(rail) {
    const section = rail.closest('section');
    const heading = section.getAttribute('aria-labelledby');
    const labelAttribute = heading ? 'aria-labelledby' : 'aria-label';
    let controls = null;

    function move(direction) {
      const gap = parseFloat(getComputedStyle(rail).columnGap);
      const step = rail.firstElementChild.offsetWidth + gap;
      rail.scrollBy({ left: direction * step, behavior: 'smooth' });
    }

    function updateButtons() {
      if (!controls || controls.hidden) return;
      const end = rail.scrollWidth - rail.clientWidth;
      controls.firstElementChild.disabled = rail.scrollLeft <= 1;
      controls.lastElementChild.disabled = end - rail.scrollLeft <= 1;
    }

    function createButton(direction, turkish, english) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'icon-button rail-arrow';
      button.dataset.labelTr = turkish;
      button.dataset.labelEn = english;
      button.setAttribute('aria-label', site.lang() === 'tr' ? turkish : english);
      button.setAttribute('aria-controls', rail.id);
      button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
      button.addEventListener('click', function () { move(direction); });
      return button;
    }

    function syncRail() {
      if (mobile.matches) {
        rail.tabIndex = 0;
        rail.setAttribute('role', 'region');
        rail.setAttribute(labelAttribute, heading || section.getAttribute('aria-label'));
        if (!controls && rail.dataset.rail === 'controls') {
          controls = document.createElement('div');
          controls.className = 'rail-controls';
          controls.setAttribute('role', 'group');
          controls.setAttribute('aria-labelledby', heading);
          controls.append(createButton(-1, 'Önceki', 'Previous'), createButton(1, 'Sonraki', 'Next'));
          rail.after(controls);
          rail.addEventListener('scroll', updateButtons, { passive: true });
        }
      } else {
        rail.removeAttribute('tabindex');
        rail.removeAttribute('role');
        rail.removeAttribute(labelAttribute);
      }
      if (controls) controls.hidden = !mobile.matches;
      updateButtons();
    }

    rail.addEventListener('keydown', function (event) {
      if (!mobile.matches || event.target !== rail || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    mobile.addEventListener('change', syncRail);
    if (!heading) site.onLangChange(syncRail);
    syncRail();
    return updateButtons;
  }

  const railButtonUpdates = Array.from(document.querySelectorAll('[data-rail]'), setupRail);

  // ── Galerinin büyütülmüş görüntüsü ──
  function openShot(shot) {
    shotOpener = shot;
    modalImage.alt = shot.querySelector('img').alt;
    modalImage.src = shot.dataset.full;
    site.openOverlay(shotModal, modalClose);
  }

  function closeShot() {
    site.closeOverlay(shotModal, shotOpener);
    modalImage.removeAttribute('src');
    shotOpener = null;
  }

  modalClose.addEventListener('click', closeShot);
  shotModal.addEventListener('click', function (event) {
    if (event.target === shotModal) closeShot();
  });
  shotModal.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeShot();
  });

  // ── Hero kamerası ve paralaks ──
  const heroPointer = { x: 0, y: 0, toX: 0, toY: 0 };
  const bankCard = heroParallax.querySelector('.bank-card');
  const coins = Array.from(heroParallax.querySelectorAll('.coin'));
  const chips = Array.from(heroParallax.querySelectorAll('.float-chip'));
  const coinDepths = [105, -39];
  const chipDepths = [136, 102, 164];
  let lastHeroMotion = '';
  let heroClock = 0;
  let lastAuroraDraw = -1000;
  let aurora = null;
  let canvasWidth = 0;
  let canvasHeight = 0;

  hero.addEventListener('pointermove', function (event) {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    const bounds = hero.getBoundingClientRect();
    heroPointer.toX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
    heroPointer.toY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
    requestFrame();
  }, { passive: true });

  hero.addEventListener('pointerleave', function () {
    heroPointer.toX = 0;
    heroPointer.toY = 0;
  }, { passive: true });

  function positionHero(x, y) {
    const p = ease(heroProgress);
    style(heroParallax, '--scene-x', (y * -6 * (1 - p) + p * 2) + 'deg');
    style(heroParallax, '--scene-y', (x * 10 * (1 - p)) + 'deg');
    style(heroCopy, '--copy-z', (-230 * p) + 'px');
    style(heroCopy, '--copy-y', (-24 * p) + 'px');
    style(heroCopy, '--copy-opacity', 1 - ease(unit((heroProgress - .12) / .73)));

    style(bankCard, '--card-x', (x * -14 + 85 * p) + 'px');
    style(bankCard, '--card-y', (y * -10 - 25 * p) + 'px');
    style(bankCard, '--card-z', (-110 - 260 * p) + 'px');
    style(bankCard, '--card-roll', (15 + 24 * p) + 'deg');
    bankCard.style.opacity = 1 - p * .97;
    coins.forEach(function (coin, index) {
      const direction = index === 0 ? -1 : 1;
      style(coin, '--coin-x', (x * 18 - direction * 92 * p) + 'px');
      style(coin, '--coin-y', (y * 13 + direction * 85 * p) + 'px');
      style(coin, '--coin-z', (coinDepths[index] - (280 - index * 55) * p) + 'px');
      coin.style.opacity = 1 - p * .97;
    });
    chips.forEach(function (chip, index) {
      const direction = index === 0 ? -1 : 1;
      const depth = mobile.matches ? 66 : chipDepths[index];
      style(chip, '--chip-x', (x * (9 + index * 4) + direction * 65 * p) + 'px');
      style(chip, '--chip-y', (y * (8 + index * 3) + (index - 1) * 52 * p) + 'px');
      style(chip, '--chip-z', (depth - (225 + index * 28) * p) + 'px');
      chip.style.opacity = 1 - p;
    });
  }

  function renderHero(delta, now) {
    heroClock += delta;
    const targetX = finePointer.matches ? heroPointer.toX : Math.sin(heroClock * .00135) * .25;
    const targetY = finePointer.matches ? heroPointer.toY : Math.cos(heroClock * .00112) * .16;
    const damping = 1 - Math.exp(-delta / 120);
    heroPointer.x += (targetX - heroPointer.x) * damping;
    heroPointer.y += (targetY - heroPointer.y) * damping;

    const motion = [heroPointer.x.toFixed(3), heroPointer.y.toFixed(3), heroProgress, mobile.matches].join('/');
    if (motion !== lastHeroMotion) {
      positionHero(heroPointer.x, heroPointer.y);
      lastHeroMotion = motion;
    }

    if (aurora && now - lastAuroraDraw >= 31) {
      aurora.draw(heroClock * .001, heroPointer.x, heroPointer.y, auroraLight);
      lastAuroraDraw = now;
    }
  }

  // ── WebGL aurora ve bağlam kaybı yedeği ──
  function createAurora() {
    let gl;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'
      });
    } catch (error) {
      return null;
    }
    if (!gl) return null;

    const vertexSource = [
      'attribute vec2 a_position;',
      'void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'
    ].join('\n');
    const fragmentSource = [
      '#ifdef GL_FRAGMENT_PRECISION_HIGH',
      'precision highp float;',
      '#else',
      'precision mediump float;',
      '#endif',
      'uniform vec2 u_size;',
      'uniform vec2 u_pointer;',
      'uniform float u_time;',
      'uniform float u_light;',
      'float hash(vec2 p) {',
      '  vec3 q = fract(vec3(p.xyx) * 0.1031);',
      '  q += dot(q, q.yzx + 19.19);',
      '  return fract((q.x + q.y) * q.z);',
      '}',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p);',
      '  vec2 f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
      '    mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);',
      '}',
      'void main() {',
      '  vec2 uv = gl_FragCoord.xy / u_size;',
      '  vec2 p = (uv - 0.5) * vec2(u_size.x / u_size.y, 1.0);',
      '  p -= u_pointer * vec2(0.10, -0.065);',
      '  float t = u_time * 0.18;',
      '  float bend = (noise(p * 2.3 + vec2(t * 0.31, -t * 0.24)) - 0.5) * 0.27;',
      '  bend += (noise(p * 5.1 + vec2(-t * 0.14, t * 0.37)) - 0.5) * 0.075;',
      '  float silk = p.y - 0.10 - 0.18 * sin(p.x * 1.75 - t) - bend;',
      '  float fold = p.y + 0.12 - 0.16 * sin(p.x * 2.36 + t * 0.52) + bend * 0.63;',
      '  float glow = exp(-7.1 * abs(silk));',
      '  float ridge = exp(-17.0 * abs(silk + 0.06 * sin(3.5 * p.x + t)));',
      '  float cyan = exp(-11.0 * abs(fold));',
      '  float light = smoothstep(0.03, 0.83, uv.x) * (0.55 + 0.45 * sin(uv.y * 3.14159));',
      '  vec3 color = light * (vec3(0.045, 0.12, 0.28) * glow + vec3(0.025, 0.07, 0.15) * ridge);',
      '  color += light * vec3(0.012, 0.05, 0.064) * cyan;',
      '  vec3 daylight = vec3(1.0) - light * (vec3(0.095, 0.05, 0.0) * glow',
      '    + vec3(0.04, 0.022, 0.0) * ridge + vec3(0.028, 0.008, 0.004) * cyan);',
      '  gl_FragColor = vec4(mix(color, daylight, u_light), 1.0);',
      '}'
    ].join('\n');

    function compile(type, source) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader);
      return null;
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = vertex && fragment ? gl.createProgram() : null;
    if (program) {
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
    }
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (!program || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (program) gl.deleteProgram(program);
      return null;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      return null;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const size = gl.getUniformLocation(program, 'u_size');
    const pointer = gl.getUniformLocation(program, 'u_pointer');
    const time = gl.getUniformLocation(program, 'u_time');
    const light = gl.getUniformLocation(program, 'u_light');

    return {
      resize: function (width, height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(size, width, height);
      },
      draw: function (seconds, x, y, lightTheme) {
        gl.uniform1f(light, lightTheme);
        gl.uniform1f(time, seconds);
        gl.uniform2f(pointer, x, y);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.classList.add('active');
      }
    };
  }

  let auroraLight = docEl.dataset.theme === 'light' ? 1 : 0;
  new MutationObserver(function () {
    auroraLight = docEl.dataset.theme === 'light' ? 1 : 0;
    if (aurora && canvasWidth) aurora.draw(heroClock * .001, heroPointer.x, heroPointer.y, auroraLight);
    lastAuroraDraw = -1000;
    requestFrame();
  }).observe(docEl, { attributes: true, attributeFilter: ['data-theme'] });

  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    aurora = null;
    canvas.classList.remove('active');
  });
  canvas.addEventListener('webglcontextrestored', function () {
    aurora = createAurora();
    canvasWidth = 0;
    canvasHeight = 0;
    lastAuroraDraw = -1000;
    invalidateLayout();
  });

  function syncAuroraSize() {
    if (!aurora) return;
    // Aurora zaten yumuşak bir degrade; yarım çözünürlükte çizip CSS ile
    // büyütmek görünümü bozmaz, tümleşik GPU'larda yükü ~4 kat azaltır.
    const ratio = mobile.matches ? .5 : .6;
    const width = Math.max(1, Math.round(hero.clientWidth * ratio));
    const height = Math.max(1, Math.round(hero.clientHeight * ratio));
    if (width === canvasWidth && height === canvasHeight) return;
    canvasWidth = width;
    canvasHeight = height;
    aurora.resize(width, height);
    lastAuroraDraw = -1000;
  }

  // ── Sayaçlar ve özellik vitrininin kaydırma eşlemesi ──
  const stats = document.querySelector('.stats');
  const security = document.querySelector('.security');
  const counters = Array.from(stats.querySelectorAll('[data-count]'));
  let countElapsed = 0;
  function renderCounters(delta) {
    countElapsed = Math.min(1050, countElapsed + delta);
    const progress = 1 - Math.pow(1 - countElapsed / 1050, 3);
    counters.forEach(function (counter) {
      const value = String(Math.round(Number(counter.dataset.count) * progress));
      if (counter.textContent !== value) counter.textContent = value;
    });
    return countElapsed < 1050;
  }

  // ── Öne çıkan özellikler ──
  const highlightDuration = 7000;
  const highlightPartTime = 3000;
  const hasHighlightScrollEnd = 'onscrollend' in highlightsViewport;
  const lastHighlight = highlightCards.length - 1;
  const highlightState = {
    index: 0, spacing: 0, scale: 1, elapsed: 0,
    paused: false, hovered: false, resumeWithFocus: false, drag: null, ignoreClickUntil: 0,
    motion: null, queued: null
  };
  let highlightRailDirty = false;
  let highlightSettleAt = 0;

  highlightCards.forEach(function (card, index) { card.dataset.highlightIndex = index; });

  function copyHighlight(index) {
    const card = document.createElement('div');
    card.className = 'highlight-card-copy';
    card.dataset.highlightIndex = index;
    card.setAttribute('aria-hidden', 'true');
    Array.from(highlightCards[index].children).forEach(function (child) {
      card.appendChild(child.cloneNode(true));
    });
    return card;
  }

  // Rayın iki ucundaki kopyalar, başa sararken sıradaki kartın kenarını da korur.
  highlightTrack.prepend(copyHighlight(lastHighlight));
  highlightTrack.append(copyHighlight(0), copyHighlight(1));

  function updateHighlightSelection() {
    const index = highlightState.index;
    highlightCards.forEach(function (card, number) {
      if (mobile.matches && number !== index) card.removeAttribute('aria-hidden');
      else card.setAttribute('aria-hidden', String(number !== index));
      if (number === index) highlightDots[number].setAttribute('aria-current', 'true');
      else highlightDots[number].removeAttribute('aria-current');
    });
  }

  function syncHighlightPart() {
    const card = highlightCards[highlightState.index];
    const part = highlightState.elapsed < highlightPartTime ? '0' : '1';
    if (card.dataset.hlPart !== part) card.dataset.hlPart = part;
  }

  // Çubuğun dolgusu tarayıcının animasyon motorunda çalışır; ana iş parçacığı meşgulken
  // bile akıcı kalır. JS yalnız başlatır, duraklatır ve sapma olursa konumunu düzeltir.
  let highlightFill = null;
  let highlightFillDot = -1;
  function highlightFillAnimation() {
    const index = highlightState.index;
    if (highlightFillDot === index) return highlightFill;
    if (highlightFill) highlightFill.cancel();
    highlightFill = null;
    highlightFillDot = index;
    const bar = highlightDots[index].querySelector('span');
    try {
      highlightFill = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: highlightDuration, easing: 'linear', fill: 'forwards', pseudoElement: '::after'
      });
      highlightFill.pause();
    } catch (error) {
      highlightFill = null; // Desteklenmezse CSS değişkeniyle çizime döner.
    }
    return highlightFill;
  }

  function syncHighlightFill(running) {
    const fill = highlightFillAnimation();
    const elapsed = highlightState.elapsed;
    if (!fill) {
      style(highlightProgress, '--hl-progress', unit(elapsed / highlightDuration));
      return;
    }
    if (Math.abs((fill.currentTime || 0) - elapsed) > 120) fill.currentTime = elapsed;
    if (running && fill.playState !== 'running') fill.play();
    else if (!running && fill.playState === 'running') fill.pause();
  }

  function toggleHighlightPart() {
    const state = highlightState;
    state.elapsed = state.elapsed < highlightPartTime ? highlightPartTime : 0;
    syncHighlightPart();
    const fill = highlightFillAnimation();
    syncHighlightFill(Boolean(fill && fill.playState === 'running'));
    requestFrame();
  }

  function highlightTransform(index, offset = 0) {
    return 'translate3d(' + (offset - (index + 1) * highlightState.spacing) + 'px, 0, 0)';
  }

  function finishHighlightMotion() {
    const state = highlightState;
    const queued = state.queued;
    state.motion = null;
    state.queued = null;
    if (queued !== null) showHighlight(queued);
  }

  function syncHighlightsSize() {
    const state = highlightState;
    const pans = highlightCards.map(function (card) {
      const media = card.querySelector('.highlight-media');
      const phone = media.querySelector('.highlight-phone');
      const paddingTop = parseFloat(getComputedStyle(media).paddingTop);
      return Math.min(0, media.offsetHeight - paddingTop - phone.offsetHeight - 16);
    });
    style(highlights, '--hl-pan', pans[0] + 'px');
    // Açıklama satıra sığmazsa kartın medya alanı farklı yükseklikte olabilir.
    highlightCards.forEach(function (card, index) {
      if (pans[index] === pans[0]) card.style.removeProperty('--hl-pan');
      else style(card, '--hl-pan', pans[index] + 'px');
    });
    if (mobile.matches) {
      highlightRailDirty = true;
      return;
    }
    const width = parseFloat(getComputedStyle(highlightCards[0]).width);
    const gap = parseFloat(getComputedStyle(highlightTrack).columnGap);
    state.scale = Number(highlightsFrame.style.getPropertyValue('--scale')) || 1;
    const spacing = width + gap;
    if (spacing === state.spacing) return;
    state.spacing = spacing;
    highlightTrack.style.transform = highlightTransform(state.index, state.drag?.offset);
    if (state.motion) {
      state.motion.cancel();
      finishHighlightMotion();
    }
  }

  function wrapHighlight(index) {
    return (index + highlightCards.length) % highlightCards.length;
  }

  function showHighlight(index, dragOffset = 0) {
    const state = highlightState;
    if (state.drag) return;
    if (state.motion) {
      state.queued = index;
      return;
    }
    const previous = state.index;
    const changed = index !== previous;
    let slot = index;
    if (previous === lastHighlight && index === 0) slot = highlightCards.length;
    if (previous === 0 && index === lastHighlight) slot = -1;
    const from = highlightTransform(previous, dragOffset);
    const to = highlightTransform(slot);

    if (changed) {
      state.index = index;
      state.elapsed = 0;
      const card = highlightCards[index];
      card.setAttribute('data-hl-instant', '');
      syncHighlightPart();
      // Geçişi açmadan önce telefonun üst konumunu bir kare çiz.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { card.removeAttribute('data-hl-instant'); });
      });
      updateHighlightSelection();
      syncHighlightFill(false);
    }
    // Geçiş kopyada biterse alttaki konum aynı görüntünün asıl kartına döner.
    highlightTrack.style.transform = highlightTransform(index);
    if (from !== to && typeof highlightTrack.animate === 'function') {
      state.motion = highlightTrack.animate([{ transform: from }, { transform: to }], {
        duration: changed ? 700 : 280, easing: 'cubic-bezier(.4,0,.2,1)'
      });
      state.motion.onfinish = finishHighlightMotion;
    }
    requestFrame();
  }

  function syncHighlightPlaybackLabel() {
    const data = highlightPlayback.dataset;
    const turkish = site.lang() === 'tr';
    const label = highlightState.paused
      ? (turkish ? data.labelPlayTr : data.labelPlayEn)
      : (turkish ? data.labelTr : data.labelEn);
    highlightPlayback.setAttribute('aria-label', label);
  }

  function renderHighlights(delta) {
    const state = highlightState;
    // Fare üzerindeyken durmaz: kart ekranın çoğunu kapladığı için tekerlekle
    // kaydırırken imleç hep kartın üstünde kalıyor ve çubuk takılmış gibi duruyordu.
    const focus = document.activeElement;
    const playbackResumed = focus === highlightPlayback && state.resumeWithFocus;
    if (state.paused || state.drag ||
        (!playbackResumed && highlights.contains(focus) && focus.matches(':focus-visible'))) {
      syncHighlightFill(false);
      return false;
    }
    state.elapsed += delta;
    syncHighlightPart();
    syncHighlightFill(true);
    if (state.elapsed >= highlightDuration) showHighlight(wrapHighlight(state.index + 1));
    return true;
  }

  function scrollToHighlight(index, behavior = 'smooth') {
    const left = highlightCards[index].offsetLeft - highlightCards[0].offsetLeft;
    highlightsViewport.scrollTo({ left, behavior });
  }

  function syncMobileHighlightSelection() {
    const state = highlightState;
    const center = highlightsViewport.scrollLeft + highlightsViewport.clientWidth / 2;
    let index = state.index;
    let distance = Infinity;
    highlightCards.forEach(function (card, number) {
      const offset = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (offset < distance) {
        index = number;
        distance = offset;
      }
    });
    if (index === state.index) return;
    highlightCards[state.index].dataset.hlPart = '0';
    state.index = index;
    state.elapsed = 0;
    syncHighlightPart();
    updateHighlightSelection();
  }

  function renderMobileHighlights(delta, now, visible) {
    const state = highlightState;
    if (highlightRailDirty) {
      highlightRailDirty = false;
      syncMobileHighlightSelection();
    }
    const settling = now < highlightSettleAt;
    if (!visible || (settling && state.elapsed < highlightPartTime)) {
      state.elapsed = 0;
      syncHighlightPart();
      return visible && !hasHighlightScrollEnd;
    }
    if (state.elapsed >= highlightPartTime) return false;
    state.elapsed = Math.min(highlightPartTime, state.elapsed + delta);
    syncHighlightPart();
    return state.elapsed < highlightPartTime;
  }

  function syncHighlightMode() {
    const state = highlightState;
    // Pist yerel raya dönüşürken masaüstü hareketini ve varsa yakalanan işaretçiyi bırak.
    if (state.motion) {
      state.motion.onfinish = null;
      state.motion.cancel();
    }
    if (highlightFill) highlightFill.cancel();
    highlightFill = null;
    highlightFillDot = -1;
    highlightProgress.style.removeProperty('--hl-progress');
    const drag = state.drag;
    state.drag = null;
    if (drag && highlightsViewport.hasPointerCapture(drag.id)) highlightsViewport.releasePointerCapture(drag.id);
    highlightsViewport.classList.remove('highlights-dragging');
    state.motion = null;
    state.queued = null;
    state.ignoreClickUntil = 0;
    state.elapsed = 0;
    state.spacing = 0;
    highlightSettleAt = 0;
    highlightRailDirty = false;
    highlightCards.forEach(function (card) {
      card.removeAttribute('data-hl-instant');
      card.dataset.hlPart = '0';
    });
    updateHighlightSelection();
    if (mobile.matches) {
      highlightTrack.style.removeProperty('transform');
      scrollToHighlight(state.index, 'instant');
    }
    invalidateLayout();
  }

  highlightsViewport.addEventListener('scroll', function () {
    if (!mobile.matches) return;
    highlightRailDirty = true;
    // scrollend olmayan tarayıcılarda son kaydırma olayından sonra kısa bir süre bekle.
    highlightSettleAt = hasHighlightScrollEnd ? Infinity : performance.now() + 160;
    requestFrame();
  }, { passive: true });
  highlightsViewport.addEventListener('scrollend', function () {
    if (!mobile.matches) return;
    highlightSettleAt = 0;
    requestFrame();
  });
  mobile.addEventListener('change', syncHighlightMode);

  highlightDots.forEach(function (dot, index) {
    dot.addEventListener('click', function () {
      if (mobile.matches) scrollToHighlight(index);
      else showHighlight(index);
    });
  });
  highlightPlayback.addEventListener('click', function () {
    if (mobile.matches) return;
    highlightState.paused = !highlightState.paused;
    highlightState.resumeWithFocus = !highlightState.paused;
    highlightPlayback.toggleAttribute('data-paused', highlightState.paused);
    syncHighlightPlaybackLabel();
    requestFrame();
  });
  highlightPlayback.addEventListener('blur', function () { highlightState.resumeWithFocus = false; });
  highlights.addEventListener('pointerenter', function (event) {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') highlightState.hovered = true;
  });
  highlights.addEventListener('pointerleave', function () {
    highlightState.hovered = false;
    requestFrame();
  });
  highlights.addEventListener('focusin', requestFrame);
  highlights.addEventListener('focusout', requestFrame);
  highlights.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!mobile.matches && event.target === highlights && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      toggleHighlightPart();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    if (mobile.matches) {
      scrollToHighlight(clamp(highlightState.index + direction, 0, lastHighlight));
      return;
    }
    const index = highlightState.queued ?? highlightState.index;
    showHighlight(wrapHighlight(index + direction));
  });

  highlightsViewport.addEventListener('click', function (event) {
    if (mobile.matches) return;
    if (event.detail && performance.now() < highlightState.ignoreClickUntil) return;
    const card = event.target.closest('[data-highlight-index]');
    if (!card) return;
    if (card === highlightCards[highlightState.index] && event.target.closest('.highlight-media')) toggleHighlightPart();
    else showHighlight(Number(card.dataset.highlightIndex));
  });
  highlightsViewport.addEventListener('dragstart', function (event) { event.preventDefault(); });
  highlightsViewport.addEventListener('pointerdown', function (event) {
    const state = highlightState;
    if (mobile.matches || !event.isPrimary || event.button !== 0 || state.drag) return;
    state.ignoreClickUntil = 0;
    if (state.motion) return;
    state.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, offset: 0, moved: false };
  }, { passive: true });
  window.addEventListener('pointermove', function (event) {
    const state = highlightState;
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(distance) < 8 || Math.abs(distance) <= Math.abs(event.clientY - drag.y)) return;
      drag.moved = true;
      highlightsViewport.setPointerCapture(event.pointerId);
      highlightsViewport.classList.add('highlights-dragging');
    }
    drag.offset = clamp(distance / state.scale, -state.spacing, state.spacing);
    highlightTrack.style.transform = highlightTransform(state.index, drag.offset);
  }, { passive: true });

  function finishHighlightDrag(event) {
    const state = highlightState;
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.id) return;
    state.drag = null;
    if (drag.moved) {
      highlightsViewport.classList.remove('highlights-dragging');
      state.ignoreClickUntil = performance.now() + 420;
      const distance = event.clientX - drag.x;
      const advance = event.type === 'pointerup' && Math.abs(distance) >= 40;
      const index = advance ? wrapHighlight(state.index - Math.sign(distance)) : state.index;
      showHighlight(index, drag.offset);
    }
    requestFrame();
  }

  window.addEventListener('pointerup', finishHighlightDrag, { passive: true });
  window.addEventListener('pointercancel', finishHighlightDrag, { passive: true });
  highlightsViewport.addEventListener('lostpointercapture', finishHighlightDrag);

  highlights.classList.add('highlights-ready');
  highlights.tabIndex = 0;
  syncHighlightPart();
  updateHighlightSelection();

  // ── Yapay zeka fiş taraması ve doğal dil demosu ──
  const aiLayout = aiSection.querySelector('.ai-layout');
  const aiModes = Array.from(aiLayout.querySelectorAll('.ai-mode'));
  const aiPrompts = Array.from(aiLayout.querySelectorAll('.ai-prompt'));
  const aiTyped = document.getElementById('ai-typed');
  const aiReceiptDate = aiLayout.querySelector('.ai-receipt-date');
  const aiResult = aiLayout.querySelector('.ai-result-card');
  const aiIcon = aiResult.querySelector('.ai-result-category use');
  const aiCategory = aiResult.querySelector('.ai-category');
  const aiDate = aiResult.querySelector('.ai-date');
  const aiAmount = aiResult.querySelector('.ai-amount');
  const aiType = aiResult.querySelector('.ai-type-label');
  const phrases = {
    tr: [
      { text: 'Markete 450 TL', marks: { category: 'Markete', amount: '450 TL' }, amount: 450, category: 'Market', date: 'Bugün', type: 'expense', icon: 'cart' },
      { text: 'Maaş yattı 85.000 TL', marks: { category: 'Maaş', amount: '85.000 TL' }, amount: 85000, category: 'Maaş', date: 'Bugün', type: 'income', icon: 'wallet' },
      { text: 'Dün akşam yemeği 1.250 TL', marks: { date: 'Dün', category: 'yemeği', amount: '1.250 TL' }, amount: 1250, category: 'Restoran', date: 'Dün', type: 'expense', icon: 'dining' }
    ],
    en: [
      { text: '450 TL groceries', marks: { amount: '450 TL', category: 'groceries' }, amount: 450, category: 'Groceries', date: 'Today', type: 'expense', icon: 'cart' },
      { text: 'Salary received 85,000 TL', marks: { category: 'Salary', amount: '85,000 TL' }, amount: 85000, category: 'Salary', date: 'Today', type: 'income', icon: 'wallet' },
      { text: 'Dinner last night 1,250 TL', marks: { category: 'Dinner', date: 'last night', amount: '1,250 TL' }, amount: 1250, category: 'Dining', date: 'Yesterday', type: 'expense', icon: 'dining' }
    ]
  };
  const aiTypeLabels = { tr: { expense: 'Gider', income: 'Gelir' }, en: { expense: 'Expense', income: 'Income' } };
  const aiFormatters = { tr: new Intl.NumberFormat('tr-TR'), en: new Intl.NumberFormat('en-US') };
  const aiDateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const aiDateFormatters = { tr: new Intl.DateTimeFormat('tr-TR', aiDateOptions), en: new Intl.DateTimeFormat('en-US', aiDateOptions) };
  const aiCharacterDuration = 52;
  const aiEraseDuration = 20;
  const aiAmountDelay = 300;
  const aiCountDuration = 600;
  style(aiLayout, '--ai-amount-delay', aiAmountDelay + 'ms');
  const aiResultStages = [
    ['flow', 600],
    ['result', aiAmountDelay + aiCountDuration],
    ['hold', 2600],
    ['exit', 350]
  ];

  let aiLang;
  let aiPhrase;
  let aiIndex = -1;
  let aiStages;
  let aiStage = 0;
  let aiElapsed = 0;
  let aiCount = -1;
  let aiModeMix = 0;
  let aiModeMixStart = 0;

  function setAiText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function setAiPressed(button, isPressed) {
    const pressed = String(isPressed);
    if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
  }

  function renderAiAmount(elapsed) {
    const amount = Math.round(aiPhrase.amount * ease(unit(elapsed / aiCountDuration)));
    if (amount === aiCount) return;
    aiCount = amount;
    const sign = aiPhrase.type === 'income' ? '+' : '−';
    setAiText(aiAmount, sign + '₺' + aiFormatters[aiLang].format(amount));
  }

  function showAiMarks() {
    const text = aiPhrase.text;
    const marks = Object.entries(aiPhrase.marks).map(function ([field, value]) {
      return { field, value, start: text.indexOf(value) };
    }).sort(function (a, b) { return a.start - b.start; });
    const content = document.createDocumentFragment();
    let cursor = 0;
    marks.forEach(function (mark) {
      content.append(text.slice(cursor, mark.start));
      const chip = document.createElement('span');
      chip.className = 'ai-mark';
      chip.dataset.field = mark.field;
      chip.textContent = mark.value;
      content.append(chip);
      cursor = mark.start + mark.value.length;
    });
    content.append(text.slice(cursor));
    aiTyped.replaceChildren(content);
  }

  function enterAiStage() {
    const [phase, duration] = aiStages[aiStage];
    aiLayout.dataset.phase = phase;
    style(aiLayout, '--ai-stage-time', '0ms');
    style(aiLayout, '--ai-stage-duration', duration + 'ms');
    if (phase === 'marks') showAiMarks();
  }

  function startAiStep(index) {
    // -1 fişi, diğer indeksler sıradaki doğal dil örneğini gösterir.
    const receipt = index === -1;
    aiIndex = index;
    aiStage = 0;
    aiElapsed = 0;
    aiCount = -1;
    aiModeMixStart = aiModeMix;
    aiPhrase = phrases[aiLang][receipt ? 0 : index];
    aiStages = receipt
      ? [['switch', 350], ['scan', 1600], ['pause', 250], ...aiResultStages]
      : [
          ['switch', 350],
          ['typing', aiPhrase.text.length * aiCharacterDuration],
          ['marks', 400],
          ['press', 350],
          ...aiResultStages,
          ['erase', aiPhrase.text.length * aiEraseDuration]
        ];

    aiLayout.dataset.mode = receipt ? 'receipt' : 'text';
    aiLayout.dataset.type = aiPhrase.type;
    enterAiStage();
    setAiText(aiTyped, '');
    if (receipt) setAiText(aiReceiptDate, aiDateFormatters[aiLang].format(new Date()));
    aiIcon.setAttribute('href', '#ai-icon-' + aiPhrase.icon);
    setAiText(aiCategory, aiPhrase.category);
    setAiText(aiDate, aiPhrase.date);
    setAiText(aiType, aiTypeLabels[aiLang][aiPhrase.type]);
    renderAiAmount(0);
    setAiPressed(aiModes[0], receipt);
    setAiPressed(aiModes[1], !receipt);
    aiPrompts.forEach(function (prompt, promptIndex) {
      setAiPressed(prompt, index === promptIndex);
    });
  }

  function resetAiDemo() {
    aiLang = site.lang() === 'tr' ? 'tr' : 'en';
    startAiStep(-1);
  }

  function paintAiStage(phase, duration, elapsed) {
    switch (phase) {
      case 'switch': {
        const target = aiIndex === -1 ? 0 : 1;
        const mix = aiModeMixStart + (target - aiModeMixStart) * ease(unit(elapsed / duration));
        if (mix !== aiModeMix) {
          aiModeMix = mix;
          style(aiLayout, '--ai-mode-mix', mix);
        }
        break;
      }
      case 'typing':
        setAiText(aiTyped, aiPhrase.text.slice(0, Math.floor(elapsed / aiCharacterDuration)));
        break;
      case 'erase':
        setAiText(aiTyped, aiPhrase.text.slice(0, aiPhrase.text.length - Math.floor(elapsed / aiEraseDuration)));
        break;
      case 'result':
        renderAiAmount(elapsed - aiAmountDelay);
        break;
    }
    // Duraklatılmış CSS hareketleri aynı görünürlük zaman çizelgesini izler.
    style(aiLayout, '--ai-stage-time', -elapsed + 'ms');
  }

  function renderAi(delta) {
    aiElapsed += delta;
    let [phase, duration] = aiStages[aiStage];
    while (aiElapsed >= duration) {
      const remaining = aiElapsed - duration;
      paintAiStage(phase, duration, duration);
      aiStage++;
      if (aiStage === aiStages.length) {
        const next = aiIndex + 1;
        startAiStep(next < phrases[aiLang].length ? next : -1);
      } else {
        enterAiStage();
      }
      aiElapsed = remaining;
      [phase, duration] = aiStages[aiStage];
    }
    paintAiStage(phase, duration, aiElapsed);
  }

  aiModes.forEach(function (button, index) {
    button.addEventListener('click', function () {
      startAiStep(index - 1);
      requestFrame();
    });
  });
  aiPrompts.forEach(function (prompt, index) {
    prompt.addEventListener('click', function () {
      startAiStep(index);
      requestFrame();
    });
  });

  // ── Sürüklenebilir sonsuz galeri ──
  const prevShot = gallery.querySelector('.gallery-prev');
  const nextShot = gallery.querySelector('.gallery-next');
  const pauseGallery = gallery.querySelector('.gallery-pause');
  const hasGalleryModal = typeof shotModal.showModal === 'function';
  const galleryState = {
    position: 0, lastPaint: NaN, spacing: 0, scale: 1, velocity: 0,
    goal: null, drag: null, hover: false, paused: false, focused: false, ignoreClickUntil: 0
  };

  function wrap(value, length) {
    return (value % length + length) % length;
  }

  function wrappedDistance(value, length) {
    return wrap(value + length / 2, length) - length / 2;
  }

  function paintGallery() {
    const state = galleryState;
    if (state.position === state.lastPaint || !state.spacing) return;
    state.lastPaint = state.position;
    const loop = state.spacing * shots.length;
    shots.forEach(function (shot, index) {
      const x = wrappedDistance(index * state.spacing - state.position, loop);
      const distance = Math.abs(x) / state.spacing;
      const depth = -46 * distance - 7 * distance * distance;
      const angle = -Math.sign(x) * Math.min(57, distance * 26);
      const scale = 1 - Math.min(.29, distance * .056);
      const opacity = Math.max(.30, 1 - distance * .14) * unit((7.35 - distance) / 1.05);
      shot.style.transform = 'translate(-50%, -50%) translate3d(' + x + 'px, 0, ' + depth +
        'px) rotateY(' + angle + 'deg) scale(' + scale + ')';
      shot.style.opacity = opacity;
    });
  }

  function syncGallerySize() {
    if (!hasGalleryModal) return;
    const state = galleryState;
    const spacing = shots[0].offsetWidth + (mobile.matches ? 17 : 27);
    if (state.spacing && spacing !== state.spacing) {
      state.position *= spacing / state.spacing;
      if (state.goal !== null) state.goal *= spacing / state.spacing;
    }
    state.spacing = spacing;
    state.lastPaint = NaN;
    state.scale = Number(galleryFrame.style.getPropertyValue('--scale')) || 1;
    paintGallery();
    gallery.classList.add('gallery-ready');
  }

  function renderGallery(delta) {
    const state = galleryState;
    const loop = state.spacing * shots.length;
    const autoplay = !state.paused && !state.hover && !state.focused;
    if (state.drag) {
      paintGallery();
      return false;
    }
    if (state.goal !== null) {
      const distance = wrappedDistance(state.goal - state.position, loop);
      if (Math.abs(distance) < .5) {
        state.position = state.goal;
        state.goal = null;
      } else {
        state.position += distance * (1 - Math.exp(-delta / 115));
      }
    } else if (Math.abs(state.velocity) > .016) {
      state.position += state.velocity * delta;
      state.velocity *= Math.exp(-delta / 190);
    } else if (autoplay) {
      state.position += delta * .047 / state.scale;
    }
    state.position = wrap(state.position, loop);
    paintGallery();
    return state.goal !== null || Math.abs(state.velocity) > .016 || autoplay;
  }

  function nudgeGallery(direction) {
    const state = galleryState;
    const from = state.goal === null ? state.position : state.goal;
    state.velocity = 0;
    state.goal = (Math.round(from / state.spacing) + direction) * state.spacing;
    requestFrame();
  }

  function finishDrag(event) {
    const state = galleryState;
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.id) return;
    state.drag = null;
    galleryViewport.classList.remove('dragging');
    if (drag.moved) {
      state.ignoreClickUntil = performance.now() + 420;
      state.velocity = event.type === 'pointerup' && event.timeStamp - drag.time < 90 ? drag.velocity : 0;
    }
    requestFrame();
  }

  if (hasGalleryModal) {
    galleryViewport.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || event.button !== 0 || galleryState.drag) return;
      galleryState.goal = null;
      galleryState.velocity = 0;
      galleryState.ignoreClickUntil = 0;
      galleryState.drag = {
        id: event.pointerId, startX: event.clientX, startY: event.clientY,
        x: event.clientX, time: event.timeStamp, velocity: 0, moved: false
      };
    }, { passive: true });

    window.addEventListener('pointermove', function (event) {
      const state = galleryState;
      const drag = state.drag;
      if (!drag || event.pointerId !== drag.id) return;
      const x = event.clientX;
      if (!drag.moved) {
        if (Math.abs(x - drag.startX) < 7 || Math.abs(x - drag.startX) < Math.abs(event.clientY - drag.startY)) return;
        drag.moved = true;
        galleryViewport.setPointerCapture(event.pointerId);
        galleryViewport.classList.add('dragging');
      }
      const distance = (drag.x - x) / state.scale;
      const elapsed = Math.max(8, event.timeStamp - drag.time);
      drag.velocity = clamp(drag.velocity * .43 + distance / elapsed * .57, -2.35, 2.35);
      state.position = wrap(state.position + distance, state.spacing * shots.length);
      drag.x = x;
      drag.time = event.timeStamp;
      requestFrame();
    }, { passive: true });

    window.addEventListener('pointerup', finishDrag, { passive: true });
    window.addEventListener('pointercancel', finishDrag, { passive: true });
    galleryViewport.addEventListener('lostpointercapture', finishDrag);
    galleryViewport.addEventListener('dragstart', function (event) { event.preventDefault(); });
    galleryViewport.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') galleryState.hover = true;
    });
    galleryViewport.addEventListener('pointerleave', function () {
      galleryState.hover = false;
      requestFrame();
    });

    gallery.addEventListener('focusin', function (event) {
      const index = shots.indexOf(event.target);
      galleryState.focused = index >= 0 && event.target.matches(':focus-visible');
      if (galleryState.focused && !galleryState.drag) {
        galleryState.position = index * galleryState.spacing;
        galleryState.goal = null;
        galleryState.velocity = 0;
      }
      requestFrame();
    });
    gallery.addEventListener('focusout', function () {
      galleryState.focused = false;
      requestFrame();
    });

    // 3D'de geri itilen kartlar tarayıcının isabet testinde görünüm alanının
    // arkasında kalabiliyor; tıklanan noktayı içeren kartlardan merkeze en
    // yakın olanı (yani en öndekini) geometriyle seçiyoruz.
    function shotAtPoint(x, y) {
      const bounds = galleryViewport.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      let best = null;
      let bestDistance = Infinity;
      shots.forEach(function (shot) {
        if (Number(shot.style.opacity || 1) < .05) return;
        const rect = shot.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
        const distance = Math.abs(rect.left + rect.width / 2 - centerX);
        if (distance < bestDistance) { bestDistance = distance; best = shot; }
      });
      return best;
    }

    galleryViewport.addEventListener('click', function (event) {
      if (event.detail && performance.now() < galleryState.ignoreClickUntil) return;
      const shot = event.target.closest('.shot') ||
        (event.detail ? shotAtPoint(event.clientX, event.clientY) : null);
      if (!shot) return;
      openShot(shot);
    });
    prevShot.addEventListener('click', function () { nudgeGallery(-1); });
    nextShot.addEventListener('click', function () { nudgeGallery(1); });
    pauseGallery.addEventListener('click', function () {
      galleryState.paused = !galleryState.paused;
      pauseGallery.setAttribute('aria-pressed', String(galleryState.paused));
      requestFrame();
    });
  }

  // ── Kart eğimi ──
  const tilting = new Set();
  const tiltStates = new Map();
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    const state = { x: 0, y: 0, toX: 0, toY: 0, hovered: false, bounds: null };
    tiltStates.set(card, state);
    card.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch' || (mobile.matches && !finePointer.matches)) return;
      state.bounds = card.getBoundingClientRect();
      state.hovered = true;
    }, { passive: true });
    card.addEventListener('pointermove', function (event) {
      if (!state.hovered || (mobile.matches && (!finePointer.matches || event.pointerType === 'touch'))) return;
      const bounds = state.bounds;
      const x = unit((event.clientX - bounds.left) / bounds.width);
      const y = unit((event.clientY - bounds.top) / bounds.height);
      state.toX = (1 - y * 2) * 8;
      state.toY = (x * 2 - 1) * 8;
      tilting.add(card);
      requestFrame();
    }, { passive: true });
    card.addEventListener('pointerleave', function () {
      state.hovered = false;
      state.toX = 0;
      state.toY = 0;
      requestFrame();
    });
  });

  function renderTilts(delta) {
    let moving = false;
    const damping = 1 - Math.exp(-delta / 85);
    tilting.forEach(function (card) {
      const state = tiltStates.get(card);
      const atTarget = Math.abs(state.x - state.toX) + Math.abs(state.y - state.toY) < .035;
      state.x = atTarget ? state.toX : state.x + (state.toX - state.x) * damping;
      state.y = atTarget ? state.toY : state.y + (state.toY - state.y) * damping;
      style(card, '--tilt-x', state.x + 'deg');
      style(card, '--tilt-y', state.y + 'deg');
      if (atTarget && !state.hovered) tilting.delete(card);
      if (!atTarget) moving = true;
    });
    return moving;
  }

  // ── Görünürlük, sahne ölçüleri ve tek kare döngüsü ──
  function requestFrame() {
    if (frame === null && !document.hidden) frame = requestAnimationFrame(renderFrame);
  }

  function invalidateLayout() {
    layoutDirty = true;
    scrollDirty = true;
    requestFrame();
  }

  function syncLayout() {
    viewportHeight = window.innerHeight;
    style(docEl, '--viewport-height', viewportHeight + 'px');
    docEl.classList.add('layout-ready');
    navHeight = nav.offsetHeight;
    const width = docEl.clientWidth;
    const available = Math.max(1, viewportHeight - navHeight);
    const desktopScale = Math.min(1, available / 866, width / 1680, (width - 48) / 1440);
    const sharedScale = mobile.matches ? 1 : desktopScale;
    style(docEl, '--desktop-layout-scale', sharedScale);
    const statsHeight = mobile.matches ? 0 : stats.getBoundingClientRect().height;
    style(docEl, '--stats-height', statsHeight + 'px');
    style(galleryFrame, '--gallery-width', Math.min(2200, Math.min(1730, width - 48) / sharedScale) + 'px');
    sceneFrames.forEach(function (element) {
      const inset = element.closest('.showcase, .ai-section') ? .92 : 1;
      // İstatistik şeridi ilk ekranın altında kalır; hero sahnesi tüm sahne yüksekliğini kullanır.
      const fit = Math.max(1, available - 52) / element.offsetHeight;
      const scale = mobile.matches ? 1 : Math.min(sharedScale * inset, fit);
      style(element, '--scale', scale);
    });
    syncHighlightsSize();
    syncGallerySize();
    syncAuroraSize();
    if (mobile.matches) railButtonUpdates.forEach(function (update) { update(); });
  }

  function syncHashJump() {
    if (!hashTarget) return;
    if (!hashPosition) {
      hashTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
      hashPosition = { scrollY: window.scrollY, top: hashTarget.getBoundingClientRect().top };
      requestAnimationFrame(function () { docEl.classList.remove('hash-jump'); });
    } else if (hashLayoutSettled && location.hash === initialHash && window.scrollY === hashPosition.scrollY
      && Math.abs(hashTarget.getBoundingClientRect().top - hashPosition.top) > 1) {
      hashTarget.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    if (hashLayoutSettled) hashTarget = null;
  }

  function onScreen(bounds) {
    return bounds.bottom > 0 && bounds.top < viewportHeight;
  }

  function syncScroll() {
    const heroBounds = hero.getBoundingClientRect();
    const checkScene = function (scene) {
      return (!hasObserver || observed.has(scene)) && onScreen(scene.getBoundingClientRect());
    };
    heroOnScreen = onScreen(heroBounds);
    statsOnScreen = checkScene(stats);
    galleryOnScreen = checkScene(gallery);
    aiOnScreen = checkScene(aiSection);
    const securityOnScreen = checkScene(security);
    heroProgress = mobile.matches ? 0 : unit(-heroBounds.top / (heroBounds.height * .83));
    const highlightsOnScreen = hasObserver ? observed.has(highlightsViewport) : onScreen(highlightsViewport.getBoundingClientRect());
    const revealProgress = [];
    if (hasObserver) {
      observed.forEach(function (scene) {
        const reveal = revealByScene.get(scene);
        if (!reveal) return;
        const bounds = scene.getBoundingClientRect();
        const enteringDistance = Math.min(viewportHeight * .37, bounds.height * .75);
        const progress = unit((viewportHeight - bounds.top) / enteringDistance);
        revealProgress.push([scene, reveal, progress]);
      });
    }
    hero.classList.toggle('scene-visible', heroOnScreen);
    features.classList.toggle('scene-visible', highlightsOnScreen);
    aiSection.classList.toggle('scene-visible', aiOnScreen);
    security.classList.toggle('scene-visible', securityOnScreen);
    revealProgress.forEach(function (item) {
      const [scene, reveal, progress] = item;
      style(reveal, '--p', ease(progress));
      scene.classList.toggle('revealing', progress < 1);
    });
  }

  function renderFrame(now) {
    frame = null;
    const delta = lastFrame ? Math.min(49, now - lastFrame) : 16;
    // Galeri sayacı gerçek geçen süreyle ilerler: ilk çizimde bir kare gecikirse
    // ilerleme çubuğu durup sonra devam ediyormuş gibi görünmesin.
    const clockDelta = lastFrame ? Math.min(400, now - lastFrame) : 16;
    lastFrame = now;
    if (layoutDirty) {
      layoutDirty = false;
      syncLayout();
      syncHashJump();
    }
    if (scrollDirty) {
      scrollDirty = false;
      syncScroll();
    }

    const heroActive = heroOnScreen;
    const overlayOpen = document.body.classList.contains('overlay-open');
    const aiActive = aiOnScreen && !overlayOpen;
    const statsActive = statsOnScreen && countElapsed < 1050;
    if (heroActive) renderHero(delta, now);
    if (aiActive) renderAi(delta);
    const countActive = statsActive && renderCounters(delta);
    const highlightsVisible = features.classList.contains('scene-visible') && !overlayOpen;
    const highlightsActive = mobile.matches
      ? renderMobileHighlights(delta, now, highlightsVisible)
      : highlightsVisible && renderHighlights(clockDelta);
    if (!mobile.matches && !highlightsVisible) syncHighlightFill(false);
    const galleryActive = hasGalleryModal && galleryOnScreen && !overlayOpen && renderGallery(delta);
    const tiltActive = renderTilts(delta);
    if (heroActive || aiActive || countActive || highlightsActive || galleryActive || tiltActive) requestFrame();
    else lastFrame = 0;
  }

  if (hasObserver) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          observed.add(entry.target);
        } else {
          observed.delete(entry.target);
          entry.target.classList.remove('revealing');
        }
      });
      scrollDirty = true;
      requestFrame();
    });
    scenes.forEach(function (scene) { observer.observe(scene); });
    observer.observe(highlightsViewport);
  }

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(invalidateLayout);
    sceneFrames.forEach(function (element) { resizeObserver.observe(element); });
    resizeObserver.observe(stats);
  }
  window.addEventListener('resize', invalidateLayout, { passive: true });
  window.addEventListener('scroll', function () {
    if (hashTarget && hashPosition && window.scrollY !== hashPosition.scrollY) {
      // Tarayıcı yerleşim değişirken hedefi aynı noktada tuttuysa hizalama hâlâ geçerli.
      if (hashTarget.getBoundingClientRect().top === hashPosition.top) hashPosition.scrollY = window.scrollY;
      else hashTarget = null;
    }
    scrollDirty = true;
    requestFrame();
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      lastFrame = 0;
    } else if (!document.hidden) {
      invalidateLayout();
    }
  });
  if (document.fonts) document.fonts.ready.then(invalidateLayout);
  if (hashTarget) {
    const pageLoaded = new Promise(function (resolve) {
      window.addEventListener('load', resolve, { once: true });
    });
    // Yazı tipleri ve sayfa yüklenince gerekiyorsa hedefi son kez hizala.
    Promise.all([document.fonts?.ready, pageLoaded]).then(function () {
      if (!hashTarget) return;
      hashLayoutSettled = true;
      invalidateLayout();
    });
  }

  document.addEventListener('close', requestFrame, true);
  site.onLangChange(function () {
    syncHighlightPlaybackLabel();
    resetAiDemo();
    invalidateLayout();
  });
  // Ağır işler ilk boyamadan sonraya bırakılır; açılıştaki tek uzun görev bölünür.
  const whenIdle = function (task, timeout) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(task, { timeout: timeout });
    else window.setTimeout(task, Math.min(timeout, 200));
  };
  whenIdle(function () {
    aurora = createAurora();
    invalidateLayout();
  }, 400);
  // Öne çıkanlar görselleri kart gelmeden çözülür; ilk turda kayma sırasında takılma olmaz.
  window.addEventListener('load', function () {
    whenIdle(function () {
      highlightTrack.querySelectorAll('img').forEach(function (image) {
        if (typeof image.decode === 'function') image.decode().catch(function () { /* Çözülemezse normal yükleme sürer. */ });
      });
    }, 1500);
  }, { once: true });
  resetAiDemo();
  invalidateLayout();
  if (!hashTarget) hero.classList.add('entering');
})();
