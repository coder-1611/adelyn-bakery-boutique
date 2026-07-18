/* magic.js — Adelyn v2 interaction engine (dependency-free).
   Runs alongside site.js (which owns drawer / lightbox / reveals / hours).
   Owns: intro overlay, scroll-linked background morph, kinetic type,
   sticker parallax, giant-list cursor-follow images, pinned flavor tour,
   magnetic buttons. Everything degrades gracefully + honors reduced motion. */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- 1. intro overlay ---------- */
  const intro = $('.intro');
  if (intro) {
    const seen = sessionStorage.getItem('adelyn-intro');
    if (seen || reduce) intro.remove();
    else {
      root.style.overflow = 'hidden';
      setTimeout(() => {
        intro.classList.add('bye');
        root.style.overflow = '';
        sessionStorage.setItem('adelyn-intro', '1');
        setTimeout(() => intro.remove(), 800);
      }, 1500);
    }
  }

  /* ---------- 2. scroll-linked background morph ---------- */
  const hex2rgb = h => {
    const n = parseInt(h.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const secs = $$('[data-bg]');
  if (secs.length) {
    const m0 = getComputedStyle(doc.body).backgroundColor.match(/\d+/g);
    let cur = m0 ? m0.slice(0, 3).map(Number) : hex2rgb('#FFF9F2');
    let target = cur.slice();
    const pickTarget = () => {
      const mid = innerHeight / 2;
      let best = null, bestD = Infinity;
      for (const s of secs) {
        const r = s.getBoundingClientRect();
        if (r.bottom < -innerHeight || r.top > innerHeight * 2) continue;
        const c = r.top + r.height / 2;
        const d = Math.abs(c - mid);
        // a section covering the viewport centre always wins
        const covers = r.top <= mid && r.bottom >= mid;
        const score = covers ? -1 : d;
        if (score < bestD) { bestD = score; best = s; }
      }
      if (best) target = hex2rgb(best.getAttribute('data-bg'));
    };
    const tick = () => {
      pickTarget();
      let moved = false;
      for (let i = 0; i < 3; i++) {
        const d = target[i] - cur[i];
        if (Math.abs(d) > .4) { cur[i] += d * .07; moved = true; }
        else cur[i] = target[i];
      }
      if (moved || tick.first) {
        doc.body.style.backgroundColor = `rgb(${cur.map(Math.round).join(',')})`;
        tick.first = false;
      }
      requestAnimationFrame(tick);
    };
    tick.first = true;
    if (reduce) {
      // no animation: snap on scroll
      const snap = () => { pickTarget(); doc.body.style.backgroundColor = `rgb(${target.join(',')})`; };
      addEventListener('scroll', snap, { passive: true }); snap();
    } else requestAnimationFrame(tick);
  }

  /* ---------- 3. kinetic type (.kin → word spans, staggered) ---------- */
  $$('.kin').forEach(el => {
    if (reduce) return;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3 && ch.textContent.trim()) {
          const frag = doc.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(doc.createTextNode(part));
            else { const w = doc.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w); }
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && !ch.classList.contains('w')) walk(ch);
      });
    };
    walk(el);
    const ws = $$('.w', el);
    ws.forEach((w, i) => w.style.transitionDelay = (i * 60) + 'ms');
    new IntersectionObserver((es, io) => es.forEach(e => {
      if (e.isIntersecting) { el.classList.add('go'); io.disconnect(); }
    }), { threshold: 0.3 }).observe(el);
  });

  /* ---------- 4. sticker parallax (data-speed) ---------- */
  const floats = $$('[data-speed]');
  if (floats.length && !reduce) {
    const base = new Map(floats.map(el => [el, el.style.transform || getComputedStyle(el).transform]));
    let raf = null;
    const move = () => {
      raf = null;
      const y = scrollY;
      if (y > innerHeight * 1.4) return;
      floats.forEach(el => {
        const s = parseFloat(el.getAttribute('data-speed'));
        const b = base.get(el);
        el.style.transform = `translateY(${(y * s).toFixed(1)}px) ` + (b === 'none' ? '' : b);
      });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(move); }, { passive: true });
  }

  /* ---------- 5. giant-list cursor-follow image ---------- */
  const caseList = $('.case-list[data-follow]');
  if (caseList && fine && !reduce) {
    const fi = doc.createElement('div');
    fi.className = 'follow-img';
    fi.innerHTML = '<img alt=""><div class="fi-swatch" hidden></div>';
    doc.body.appendChild(fi);
    const im = $('img', fi), sw = $('.fi-swatch', fi);
    let x = 0, y = 0, tx = 0, ty = 0, raf = null;
    const glide = () => {
      x += (tx - x) * .18; y += (ty - y) * .18;
      fi.style.left = (x - 95) + 'px'; fi.style.top = (y - 95) + 'px';
      raf = (Math.abs(tx - x) > .5 || Math.abs(ty - y) > .5 || fi.classList.contains('on'))
        ? requestAnimationFrame(glide) : null;
    };
    caseList.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) { x = tx; y = ty; raf = requestAnimationFrame(glide); }
    });
    $$('.case-row', caseList).forEach(row => {
      row.addEventListener('mouseenter', () => {
        const src = row.getAttribute('data-img');
        const emo = row.getAttribute('data-emoji');
        if (src) { im.src = src; im.hidden = false; sw.hidden = true; }
        else { sw.textContent = emo || '🧁'; sw.style.background = row.style.getPropertyValue('--row-c') || '#F7D9DC'; sw.hidden = false; im.hidden = true; }
        fi.classList.add('on');
      });
      row.addEventListener('mouseleave', () => fi.classList.remove('on'));
    });
    caseList.addEventListener('mouseleave', () => fi.classList.remove('on'));
  }

  /* ---------- 6. pinned flavor tour ---------- */
  const tour = $('.tour');
  if (tour) {
    let flavors = [];
    try { flavors = JSON.parse(tour.getAttribute('data-flavors') || '[]'); } catch (e) {}
    const word = $('.tour-word', tour), desc = $('.tour-desc', tour),
          imgs = $$('.tour-cup img', tour), dots = $$('.tour-dots i', tour),
          count = $('.tour-count', tour);
    let active = -1;
    const setActive = i => {
      if (i === active || !flavors[i]) return;
      active = i;
      const f = flavors[i];
      word.textContent = f.name;
      word.style.color = f.deep;
      desc.textContent = f.desc;
      tour.setAttribute('data-bg', f.bg);
      imgs.forEach((im, j) => im.classList.toggle('on', j === i));
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(flavors.length).padStart(2, '0')}`;
    };
    const onScroll = () => {
      const r = tour.getBoundingClientRect();
      const total = r.height - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setActive(Math.min(flavors.length - 1, Math.floor(p * flavors.length)));
    };
    addEventListener('scroll', onScroll, { passive: true });
    setActive(0); onScroll();
  }

  /* ---------- 7. magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('.magnet').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / r.width;
        const dy = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${dx * 10}px, ${dy * 8}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }
})();
