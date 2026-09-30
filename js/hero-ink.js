/* ============================================================
   hero-ink.js - homepage only.

   1. Scroll ink. The intro sentence starts in --ink-3 (still AA
      on the page) and each word turns full ink as the visitor
      scrolls the first few hundred pixels, then the ink carries
      on into the specialties line. Scrolling back up reverses it.
   2. Filters. Each specialty is a link to the grid; clicking one
      dims every tile whose data-tags does not include it. Click
      it again, or press Escape, to clear.

   Without JS the sentence is plain text and the specialties are
   ordinary anchors to #dataviz. With reduced motion the ink is
   applied in full at once and never tracks scroll.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll distance over which the ink runs. Capped by viewport height so a
   short phone screen finishes inking before the hero leaves the view. */
const INK_DISTANCE = 260;

function initInk() {
  const lede = document.querySelector('[data-ink]');
  const links = [...document.querySelectorAll('.hero-filters [data-filter]')];
  if (!lede) return;

  lede.innerHTML = lede.textContent
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="ink-w">${w}</span>`)
    .join(' ');
  const steps = [...lede.querySelectorAll('.ink-w'), ...links];
  document.documentElement.classList.add('ink-ready');

  let queued = false;
  const paint = () => {
    queued = false;
    const span = Math.min(INK_DISTANCE, window.innerHeight * 0.35);
    const p = REDUCED ? 1 : Math.min(1, Math.max(0, window.scrollY / span));
    const n = Math.round(p * steps.length);
    steps.forEach((el, i) => el.classList.toggle('is-inked', i < n));
  };
  paint();
  if (REDUCED) return;
  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    },
    { passive: true }
  );
}

function initFilters() {
  const links = [...document.querySelectorAll('.hero-filters [data-filter]')];
  const grids = [...document.querySelectorAll('.tiles')];
  const tiles = [...document.querySelectorAll('.tile[data-tags]')];
  const target = document.getElementById('dataviz');
  if (!links.length || !tiles.length) return;

  let active = null;

  const apply = (filter) => {
    active = filter;
    grids.forEach((g) => g.classList.toggle('is-filtering', !!filter));
    tiles.forEach((t) =>
      t.classList.toggle('is-match', !!filter && t.dataset.tags.split(' ').includes(filter))
    );
    links.forEach((a) => a.setAttribute('aria-pressed', String(a.dataset.filter === filter)));
  };

  links.forEach((a) => {
    a.setAttribute('role', 'button');
    a.setAttribute('aria-pressed', 'false');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      apply(active === a.dataset.filter ? null : a.dataset.filter);
      // Bring the grid up if it is mostly below the fold, so the click
      // visibly does something.
      if (active && target && target.getBoundingClientRect().top > window.innerHeight * 0.6) {
        target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) apply(null);
  });
}

function boot() {
  initInk();
  initFilters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
