/* site.js — universal, dependency-free page enhancer (shared across all rescue sites).
   Auto-detects structure; safe to drop on any page. */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement, body = doc.body;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Header scroll state ---------- */
  const header = $('header');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', scrollY > 24);
    const fab = $('.to-top'); if (fab) fab.classList.toggle('show', scrollY > 640);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- 2. Mobile nav drawer ---------- */
  const navLinks = $('.nav-links');
  if (header && navLinks) {
    header.classList.add('js-nav');
    const btn = doc.createElement('button');
    btn.className = 'nav-toggle'; btn.setAttribute('aria-label', 'Menu'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    // place the toggle at the end of the header bar
    const bar = header.querySelector('.nav-in, .nav-inner') || header.firstElementChild || header;
    bar.appendChild(btn);

    const drawer = doc.createElement('nav');
    drawer.className = 'mobile-drawer'; drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '<div class="drawer-panel"></div>';
    const panel = drawer.querySelector('.drawer-panel');
    $$('a', navLinks).forEach(a => {
      const l = a.cloneNode(true); l.className = a.classList.contains('active') ? 'active' : '';
      panel.appendChild(l);
    });
    body.appendChild(drawer);

    const setOpen = (o) => {
      root.classList.toggle('drawer-open', o);
      btn.setAttribute('aria-expanded', o);
      drawer.setAttribute('aria-hidden', !o);
    };
    btn.addEventListener('click', () => setOpen(!root.classList.contains('drawer-open')));
    drawer.addEventListener('click', e => { if (e.target === drawer || e.target.tagName === 'A') setOpen(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- 3. Scroll reveal (auto-tagged) ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const sel = [
      'section > .wrap > *', 'section > * > .section-head', '.hero > *', '.hero-in > *', '.hero-grid > *',
      '.grid > *', '.grid3 > *', '.cols > *', '.trust-in > *', '.footer-in > *',
      '.card', '.item', '.svc', '.dish', '.step', '.trust-item', '.mrow', '.gallery > *', '.tl-item',
      '.center-head', '.section-head', '.band-in', '.quote-band', '.visit-card', '.testi-in', '.quote', '.split-copy', '.split-art'
    ].join(',');
    $$(sel).forEach(el => {
      if (el.closest('.mobile-drawer') || el.closest('.lightbox')) return;
      el.classList.add('reveal');
    });
    // prune ancestors: keep only innermost reveal targets so parents don't double-animate
    $$('.reveal').forEach(el => { if (el.querySelector('.reveal')) el.classList.remove('reveal'); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const g = en.target.parentElement ? [...en.target.parentElement.children].filter(c => c.classList.contains('reveal')) : [en.target];
          const i = Math.max(0, g.indexOf(en.target));
          en.target.style.transitionDelay = Math.min(i * 70, 420) + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---------- 4. Count-up stats ---------- */
  if (!reduce) {
    $$('.stat').forEach(el => {
      const m = el.textContent.trim().match(/^(\D*)(\d[\d,]*)(.*)$/);
      if (!m) return;
      const pre = m[1], target = +m[2].replace(/,/g, ''), post = m[3];
      const io = new IntersectionObserver((es) => es.forEach(e => {
        if (!e.isIntersecting) return; io.disconnect();
        const t0 = performance.now(), dur = 1100;
        const tick = (t) => {
          const k = Math.min(1, (t - t0) / dur), v = Math.round((1 - Math.pow(1 - k, 3)) * target);
          el.textContent = pre + v.toLocaleString() + post;
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ---------- 5. Lightbox for galleries ---------- */
  const lbImgs = $$('.gallery img, img[data-zoom]');
  if (lbImgs.length) {
    const lb = doc.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('aria-hidden', 'true');
    lb.innerHTML = '<button class="lb-close" aria-label="Close">×</button><button class="lb-prev" aria-label="Previous">‹</button><img alt=""><button class="lb-next" aria-label="Next">›</button>';
    body.appendChild(lb);
    const lbImg = lb.querySelector('img'); let idx = 0;
    const show = i => { idx = (i + lbImgs.length) % lbImgs.length; lbImg.src = lbImgs[idx].currentSrc || lbImgs[idx].src; lbImg.alt = lbImgs[idx].alt || ''; };
    const open = i => { show(i); root.classList.add('lb-open'); lb.setAttribute('aria-hidden', 'false'); };
    const close = () => { root.classList.remove('lb-open'); lb.setAttribute('aria-hidden', 'true'); };
    lbImgs.forEach((im, i) => { im.style.cursor = 'zoom-in'; im.addEventListener('click', () => open(i)); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-next').addEventListener('click', e => { e.stopPropagation(); show(idx + 1); });
    lb.querySelector('.lb-prev').addEventListener('click', e => { e.stopPropagation(); show(idx - 1); });
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!root.classList.contains('lb-open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  /* ---------- 6. Back-to-top ---------- */
  const top = doc.createElement('button');
  top.className = 'to-top'; top.setAttribute('aria-label', 'Back to top'); top.innerHTML = '↑';
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  body.appendChild(top);

  /* ---------- 7. Sticky mobile action bar ---------- */
  const tel = $('a[href^="tel:"]');
  const maps = $('a[href*="maps.google"], a[href*="google.com/maps"]');
  if (tel) {
    const bar = doc.createElement('div');
    bar.className = 'mobile-cta';
    const num = tel.getAttribute('href');
    bar.innerHTML = `<a class="mc-call" href="${num}">Call</a>` + (maps ? `<a class="mc-dir" href="${maps.getAttribute('href')}" target="_blank" rel="noopener">Directions</a>` : '');
    body.appendChild(bar); body.classList.add('has-mobile-cta');
  }

  /* ---------- 8. Smooth-scroll same-page anchors ---------- */
  $$('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    a.addEventListener('click', e => {
      const t = $(id); if (!t) return;
      e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* ---------- 9. live open-now status ---------- */
  $$('[data-hours]').forEach(el => {
    const sched = el.getAttribute('data-hours').split(';').map(s => s.trim());
    const now = new Date(), day = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const today = sched[day]; let open = false, txt = 'Closed today';
    const fmt = t => { const hh = Math.floor(t), mm = Math.round((t - hh) * 60), ap = hh < 12 ? 'am' : 'pm'; let H = hh % 12 || 12; return H + (mm ? ':' + String(mm).padStart(2, '0') : '') + ap; };
    if (today && today !== 'x') {
      const [o, c] = today.split('-').map(Number);
      open = h >= o && h < c;
      txt = open ? ('Open now · until ' + fmt(c)) : (h < o ? ('Closed · opens ' + fmt(o)) : 'Closed for the day');
    }
    el.classList.toggle('is-open', open); el.classList.toggle('is-closed', !open);
    const dot = el.querySelector('.dot, .d'); if (dot) dot.style.background = open ? '#3FA35C' : '#D0492B';
    const s = el.querySelector('.js-status'); if (s) s.textContent = txt;
  });

  /* ---------- 10. signature motion (per-brand, opt-in by element) ---------- */
  if (!reduce) {
    // Adelyn: floating boba card drifts as you scroll off the hero
    const floatEl = $('.hero-ed-float');
    if (floatEl) addEventListener('scroll', () => {
      if (scrollY < innerHeight) floatEl.style.transform = 'translateY(' + (scrollY * -0.09) + 'px)';
    }, { passive: true });
    // DeLaughter: service-area chips stagger in
    $$('.hero-area').forEach((el, i) => {
      el.style.opacity = 0; el.style.transform = 'translateY(10px)';
      el.style.transition = 'opacity .55s var(--x-ease), transform .55s var(--x-ease)';
      el.style.transitionDelay = (0.35 + i * 0.13) + 's';
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 1; el.style.transform = 'none'; }));
    });
  }

  /* ---------- 11. year in footer ---------- */
  $$('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
