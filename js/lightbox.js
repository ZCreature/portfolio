/* ============================================================
   lightbox.js - click any content image to study it large.

   Click opens the image over a dark scrim, sized to the
   viewport. Inside a carousel the lightbox pages through that
   carousel's slides (buttons or arrow keys) and keeps the
   strip underneath in step, so closing lands on the slide you
   were reading. Esc, the close button, or the scrim closes.
   Degrades to nothing: without JS the page is unchanged.
   ============================================================ */

(() => {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Images that qualify: carousel slides and solo figures. */
  const SLIDE = '.car__item img';
  const SOLO = '.figure__frame img';

  /* Flag the page so base.css can advertise the affordance
     (zoom-in cursor) only where this script actually runs. */
  document.documentElement.dataset.lightbox = '1';

  /* ---- Overlay, built once ------------------------------- */

  const box = document.createElement('div');
  box.className = 'lb';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Enlarged image');
  box.innerHTML = `
    <button class="lb__btn lb__close" type="button" aria-label="Close the enlarged view">
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
    </button>
    <button class="lb__btn lb__prev" type="button" aria-label="Previous slide">
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M8 1L3 6l5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
    </button>
    <button class="lb__btn lb__next" type="button" aria-label="Next slide">
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1l5 5-5 5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
    </button>
    <figure class="lb__stage">
      <img class="lb__img" alt="" draggable="false">
      <figcaption class="lb__cap"></figcaption>
    </figure>
    <p class="lb__count meta" aria-live="polite"></p>`;
  document.body.appendChild(box);

  const img = box.querySelector('.lb__img');
  const cap = box.querySelector('.lb__cap');
  const count = box.querySelector('.lb__count');
  const btnClose = box.querySelector('.lb__close');
  const btnPrev = box.querySelector('.lb__prev');
  const btnNext = box.querySelector('.lb__next');

  let group = [];      // imgs in the current carousel, or [the solo img]
  let index = 0;
  let opener = null;   // element to hand focus back to

  /* ---- Rendering ----------------------------------------- */

  function show(i) {
    index = (i + group.length) % group.length;
    const el = group[index];
    img.src = el.currentSrc || el.src;
    img.alt = el.alt || '';
    const fc = el.closest('figure')?.querySelector('figcaption');
    cap.innerHTML = fc ? fc.innerHTML : '';
    cap.hidden = !fc;

    const many = group.length > 1;
    btnPrev.hidden = btnNext.hidden = !many;
    count.hidden = !many;
    if (many) count.textContent = `${index + 1} / ${group.length}`;

    /* Keep the real carousel on the same slide, silently. */
    const item = el.closest('.car__item');
    if (item) {
      const track = item.parentElement;
      track.scrollTo({ left: item.offsetLeft - track.offsetLeft, behavior: 'instant' });
    }
  }

  function open(target) {
    const track = target.closest('.car__track');
    group = track ? [...track.querySelectorAll(SLIDE)] : [target];
    opener = document.activeElement;
    show(group.indexOf(target));
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (!REDUCED) {
      box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    }
    btnClose.focus();
  }

  function close() {
    box.hidden = true;
    img.src = '';
    document.documentElement.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus();
  }

  /* ---- Wiring -------------------------------------------- */

  document.addEventListener('click', (e) => {
    const hit = e.target.closest(`${SLIDE}, ${SOLO}`);
    if (hit) open(hit);
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  box.addEventListener('click', (e) => {
    /* The scrim closes; the image, caption and buttons do not. */
    if (e.target === box || e.target.classList.contains('lb__stage')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && group.length > 1) show(index - 1);
    else if (e.key === 'ArrowRight' && group.length > 1) show(index + 1);
    else if (e.key === 'Tab') {
      /* Keep focus inside the dialog: cycle its three buttons. */
      const focusable = [btnClose, btnPrev, btnNext].filter((b) => !b.hidden);
      const at = focusable.indexOf(document.activeElement);
      e.preventDefault();
      const step = e.shiftKey ? -1 : 1;
      focusable[(at + step + focusable.length) % focusable.length].focus();
    }
  });
})();
