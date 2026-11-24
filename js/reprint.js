/* ============================================================
   reprint.js - the newsroom tile, printed again.

   The tile is a photograph of two Data Dive pages. Hovering it
   prints their charts again: bars grow from their zero lines,
   the half donuts sweep from the top and the line charts draw
   left to right, roughly in reading order.

   Nothing is redrawn. The two pages in the photo were matched
   against the original page files (each is its file at about
   0.527 scale), every mark was measured on those files, and
   newsroom-blank.png holds the photo's own paper, lit as the
   photo lights it, over exactly those marks. A canvas shows the
   photo with that patch over it, then reveals the photo's own
   marks through growing shapes. When the last mark lands the
   canvas is the photo again, and it goes away.

   Motion answers intent: it plays when the pointer rests on the
   tile or keyboard focus reaches it, and fades back to the still
   photo if either leaves early. Devices that cannot hover, and
   visitors who ask for reduced motion, keep the still photo and
   never download the patch.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = window.matchMedia('(hover: hover)').matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);

// The pages in the photograph's 1200 x 750 pixels, found by matching each
// original page file against it; marks below are in the 910 x 1200 pixels of
// those files. Everything here is tied to newsroom.jpg: if the photo is ever
// re-shot or re-cropped, check the boxes and rebuild newsroom-blank.png with
// scripts/tile-plates/, which reads these same values.
export const PAGES = {
  L: { x: 97, y: 58, w: 480, h: 632, file: 'assets/img/work/editorial/c/dive-06.jpg' },
  R: { x: 647, y: 57, w: 479, h: 631, file: 'assets/img/work/editorial/c/dive-19.jpg' },
};
const SRC_W = 910;
const SRC_H = 1200;

// kind: down hangs from a zero line, up stands on one, across grows to the
// right, arc is a half donut (inner and outer radius) sweeping from the top
// (dir -1 sweeps left), wipe draws a line chart left to right. d is the
// start in ms.
const bars = (page, kind, rects, d0, step) =>
  rects.map((r, i) => ({ page, kind, r, d: d0 + i * step, dur: 620 }));
export const MARKS = [
  // Left: Local businesses slow to open and reopen in 2020.
  ...bars('L', 'down', [[515, 466, 41, 72], [563, 467, 43, 84], [634, 466, 42, 74], [682, 467, 43, 41], [753, 466, 42, 167], [802, 466, 43, 160]], 120, 70),
  { page: 'L', kind: 'arc', c: [248.5, 641], inner: 76, rad: 160, dir: 1, d: 260, dur: 820 },
  { page: 'L', kind: 'arc', c: [462, 1004], inner: 76, rad: 158, dir: -1, d: 760, dur: 820 },
  { page: 'L', kind: 'up', r: [515, 900, 41, 6], d: 820, dur: 420 },
  ...bars('L', 'down', [[563, 907, 43, 26], [634, 906, 37, 14], [682, 907, 43, 75], [753, 906, 42, 150], [802, 907, 43, 169]], 880, 70),
  // Right: SV real estate took minor hits overall in 2021.
  ...bars('R', 'across', [[328, 319, 421, 13], [328, 337, 176, 13], [328, 355, 10, 13], [327, 373, 4, 13]], 160, 70),
  ...bars('R', 'across', [[328, 434, 343, 13], [328, 452, 19, 13], [328, 470, 47, 13], [328, 488, 53, 13]], 380, 70),
  { page: 'R', kind: 'wipe', r: [292, 575, 234, 292], d: 620, dur: 900 },
  { page: 'R', kind: 'wipe', r: [606, 575, 232, 285], d: 760, dur: 900 },
  ...bars('R', 'across', [[328, 962, 429, 12], [328, 980, 432, 12], [328, 998, 436, 12], [328, 1015, 433, 13]], 1040, 60),
  ...bars('R', 'across', [[328, 1077, 393, 12], [328, 1095, 391, 12], [328, 1113, 413, 12], [328, 1130, 406, 13]], 1240, 60),
];
const END = Math.max(...MARKS.map((m) => m.d + m.dur));

const clamp = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// The revealed part of one mark at progress e, in page pixels. Shapes run a
// few pixels past the patch on every side, because what they uncover outside
// it is the photo over the photo.
function shape(ctx, m, e) {
  const [x, y, w, h] = m.r || [];
  if (m.kind === 'down') ctx.rect(x - 6, y - 2, w + 12, (h + 8) * e);
  else if (m.kind === 'up') ctx.rect(x - 6, y + h + 2 - (h + 8) * e, w + 12, (h + 8) * e);
  else if (m.kind === 'across') ctx.rect(x - 4, y - 6, (w + 10) * e, h + 12);
  else if (m.kind === 'wipe') ctx.rect(x - 6, y - 6, (w + 12) * e, h + 12);
  else if (m.kind === 'arc') {
    const start = -Math.PI / 2 - 0.06 * m.dir;
    const end = start + m.dir * (Math.PI + 0.12) * e;
    ctx.moveTo(m.c[0], m.c[1]);
    ctx.arc(m.c[0], m.c[1], m.rad + 8, start, end, m.dir < 0);
    ctx.closePath();
  }
}

function init(thumb) {
  const tile = thumb.closest('.tile');
  const photo = thumb.querySelector('img');
  if (!tile || !photo) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'reprint__ink';
  canvas.setAttribute('aria-hidden', 'true');
  thumb.append(canvas);
  const ctx = canvas.getContext('2d');

  let patch = null;
  const patchReady = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { patch = img; resolve(true); };
    img.onerror = () => resolve(false);
    img.src = thumb.dataset.reprint;
  });

  let wanted = false;   // pointer or focus is on the tile
  let playing = false;
  let start = 0;
  let intent = 0;
  let fade = 0;

  function draw(now) {
    const cw = canvas.width;
    const ch = canvas.height;
    const s = cw / 1200;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Match the browser's own downscale of the photo, so the hand-off is clean.
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(photo, 0, 0, cw, ch);
    ctx.drawImage(patch, 0, 0, cw, ch);
    // One clip holding every mark in progress, then the photo through it.
    ctx.save();
    ctx.beginPath();
    let any = false;
    for (const m of MARKS) {
      const raw = (now - start - m.d) / m.dur;
      if (raw <= 0) continue;
      const P = PAGES[m.page];
      const e = m.kind === 'wipe' || m.kind === 'arc' ? easeInOut(clamp(raw)) : easeOut(clamp(raw));
      ctx.setTransform((s * P.w) / SRC_W, 0, 0, (s * P.h) / SRC_H, s * P.x, s * P.y);
      shape(ctx, m, e);
      any = true;
    }
    if (any) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clip();
      ctx.drawImage(photo, 0, 0, cw, ch);
    }
    ctx.restore();
  }

  function frame(now) {
    if (!playing) return;
    draw(now);
    if (now - start >= END) {
      // Every mark is back, so the canvas is the photo: let it go.
      playing = false;
      canvas.classList.remove('is-on');
      return;
    }
    requestAnimationFrame(frame);
  }

  async function play() {
    if (!(await patchReady) || !wanted || !photo.complete || !photo.naturalWidth) return;
    clearTimeout(fade);
    canvas.width = Math.max(2, Math.round(thumb.clientWidth * DPR));
    canvas.height = Math.max(2, Math.round(thumb.clientHeight * DPR));
    start = performance.now();
    draw(start);
    canvas.classList.add('is-on');
    if (!playing) { playing = true; requestAnimationFrame(frame); }
  }

  function want(on) {
    if (on === wanted) return;
    wanted = on;
    clearTimeout(intent);
    // A short rest before playing, so sweeping the pointer across the grid
    // does not set every pass printing.
    if (on) intent = setTimeout(play, 90);
    else if (playing) {
      canvas.classList.remove('is-on');
      fade = setTimeout(() => { if (!wanted) playing = false; }, 220);
    }
  }

  tile.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') want(true); });
  tile.addEventListener('pointerleave', () => want(false));
  tile.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) want(true); });
  tile.addEventListener('focusout', () => want(false));
}

const thumbs = document.querySelectorAll('[data-reprint]');
if (thumbs.length && HOVER && !REDUCED) {
  const go = () => thumbs.forEach(init);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 200);
}
