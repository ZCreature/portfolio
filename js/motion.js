/* ============================================================
   motion.js - restrained, intersection-driven motion.
   No dependencies. Everything degrades to a static page if JS
   fails or the visitor prefers reduced motion.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- 1. Reveal on entry ----------------------------------
   Elements marked [data-reveal] fade up once. Siblings inside
   a [data-reveal-group] stagger by their index.            */

function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (REDUCED) {
    items.forEach((el) => el.setAttribute('data-shown', 'true'));
    return;
  }

  // Stagger children of any declared group.
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const step = Number(group.dataset.revealStep || 55);
    [...group.children].forEach((child, i) => {
      const target = child.matches('[data-reveal]')
        ? child
        : child.querySelector('[data-reveal]');
      if (target) target.style.setProperty('--reveal-delay', `${i * step}ms`);
    });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-shown', 'true');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  items.forEach((el) => io.observe(el));
}

/* ---- 2. Masthead hairline on scroll ---------------------- */

function initMasthead() {
  const bar = document.querySelector('.masthead');
  if (!bar) return;
  const sync = () => bar.setAttribute('data-scrolled', String(window.scrollY > 8));
  sync();
  window.addEventListener('scroll', sync, { passive: true });
}

/* ---- 3. Scrollytelling ------------------------------------
   Pairs .step blocks with .stage__layer visuals by index.
   Used for legacy static work that can't be rebuilt live.  */

function initScrolly() {
  document.querySelectorAll('[data-scrolly]').forEach((root) => {
    const steps = [...root.querySelectorAll('.step')];
    const layers = [...root.querySelectorAll('.stage__layer')];
    if (!steps.length || !layers.length) return;

    const show = (i) => {
      steps.forEach((s, n) => s.setAttribute('data-active', String(n === i)));
      layers.forEach((l, n) => l.setAttribute('data-active', String(n === i)));
    };

    show(0);
    if (REDUCED) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the vertical middle of the viewport.
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const mid = window.innerHeight / 2;
        const best = visible.reduce((a, b) => {
          const da = Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - mid);
          const db = Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - mid);
          return db < da ? b : a;
        });
        show(steps.indexOf(best.target));
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    steps.forEach((s) => io.observe(s));
  });
}

/* ---- 4. Boot --------------------------------------------- */

function boot() {
  initMasthead();
  initReveal();
  initScrolly();
  initLazyVideo();
  initCarousels();
}

/* ---- 3c. Carousel arrows ----------------------------------
   The strip scrolls natively; these buttons just page it. They
   disable at the ends so the state is legible without motion. */

function initCarousels() {
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    if (root.dataset.carInit) return;   // gateopen re-runs boot; bind once
    root.dataset.carInit = '1';
    const track = root.querySelector('.car__track');
    const prev = root.querySelector('[data-car-prev]');
    const next = root.querySelector('[data-car-next]');
    if (!track || !prev || !next) return;
    const step = () => Math.max(track.clientWidth * 0.85, 240);
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: REDUCED ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: REDUCED ? 'auto' : 'smooth' }));
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
    };
    track.addEventListener('scroll', sync, { passive: true });
    sync();
  });
}

/* ---- 3b. Lazy video ---------------------------------------
   A tile video is heavier than every image on the page put
   together, so nothing is fetched until the tile is actually
   on screen. Playback pauses again on the way out, and under
   reduced motion the poster frame is all anyone ever gets. */

function initLazyVideo() {
  const vids = document.querySelectorAll('video[data-lazy-video]');
  if (!vids.length) return;

  if (REDUCED) return;   // poster only; preload="none" means no fetch either

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const v = entry.target;
        if (entry.isIntersecting) {
          if (v.preload !== 'auto') v.preload = 'auto';
          if (!v.dataset.loaded) { v.load(); v.dataset.loaded = '1'; }
          // Autoplay can reject (power saving, tab in background) - a paused
          // poster is a fine outcome, so swallow it rather than log noise.
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    },
    { rootMargin: '150px 0px', threshold: 0.25 }
  );

  vids.forEach((v) => io.observe(v));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* Gate pages inject their decrypted content after boot has run, so the
   reveal observer has never seen it and it would sit at opacity 0.
   gate.js announces the unlock; run the initialisers again over the
   new markup. Reveal re-observation is idempotent and carousels guard
   themselves against double binding. */
document.addEventListener('gateopen', boot);

export { REDUCED };
