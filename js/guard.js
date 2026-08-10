/* ============================================================
   guard.js - deters casual copying of images and video.

   Honest scope: this stops drag-to-desktop, right-click save and
   long-press save. It cannot stop screenshots or a determined
   visitor reading the source - nothing client-side can. The work
   that actually needs protection ships encrypted (gate.js) or
   blurred into the pixels, which is the real defence.
   ============================================================ */

const MEDIA = 'img, video, svg, figure, .car__item, .tile__thumb';

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest(MEDIA)) e.preventDefault();
});

document.addEventListener('dragstart', (e) => {
  if (e.target.closest(MEDIA)) e.preventDefault();
});

/* Re-assert on content the gate injects later. */
const harden = (root) => {
  root.querySelectorAll('img, video').forEach((el) => {
    el.setAttribute('draggable', 'false');
    if (el.tagName === 'VIDEO') el.setAttribute('controlslist', 'nodownload');
  });
};
harden(document);
document.addEventListener('gateopen', () => harden(document));
