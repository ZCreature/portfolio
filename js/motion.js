/* ============================================================
   motion.js — restrained, intersection-driven motion.
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { REDUCED };
