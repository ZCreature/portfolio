/* ============================================================
   split-lens.js - the Color Accessibility Checker tile, split.

   Hovering the tile's recording drags a divider across it:
   normal vision on the left, a simulated colour vision
   deficiency on the right - the tool's own Split Lens, brought
   onto the tile. Each new pass shows the next deficiency, since
   a click on the tile belongs to the link to the case study.

   The right-hand side is a canvas copy of the playing video (or
   of its poster, before the video loads and under reduced
   motion), put through an SVG colour matrix. The matrices are
   Machado, Oliveira and Fernandes (2009) at full severity, the
   same ones js/color.js uses, and SVG filters work in linear RGB
   by default - which is the linearisation the case study is
   about.

   Motion answers intent: nothing moves until the pointer is
   over the recording, and the divider retracts when it leaves.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const SVGNS = 'http://www.w3.org/2000/svg';

const MODES = [
  { id: 'deutan', name: 'Deuteranopia',
    m: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0' },
  { id: 'protan', name: 'Protanopia',
    m: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0' },
  { id: 'tritan', name: 'Tritanopia',
    m: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0' },
  // Relative luminance, taken in linear light like toGrey() in js/color.js.
  { id: 'grey', name: 'Greyscale',
    m: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0' },
];

function addFilters() {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  MODES.forEach(({ id, m }) => {
    const filter = document.createElementNS(SVGNS, 'filter');
    filter.setAttribute('id', `cvd-${id}`);
    filter.setAttribute('color-interpolation-filters', 'linearRGB');
    const matrix = document.createElementNS(SVGNS, 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    matrix.setAttribute('values', m);
    filter.append(matrix);
    svg.append(filter);
  });
  document.body.append(svg);
}

function piece(tag, cls, text = '') {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function init(thumb) {
  const tile = thumb.closest('.tile');
  const video = thumb.querySelector('video');
  if (!tile || !video) return;

  const canvas = piece('canvas', 'split-lens__view');
  const line = piece('div', 'split-lens__line');
  line.append(piece('span', 'split-lens__knob', '‹ ›'));
  const left = piece('span', 'split-lens__label split-lens__label--left', 'Normal vision');
  const right = piece('span', 'split-lens__label split-lens__label--right');
  thumb.append(canvas, line, left, right);
  const ctx = canvas.getContext('2d');

  // Same file the video already shows as its poster, so this is a cache hit.
  const poster = new Image();
  poster.decoding = 'async';
  poster.src = video.poster;

  let mode = -1;
  let f = 1;          // divider position, 0..1 of the width; 1 is fully retracted
  let target = 1;
  let running = false;
  let last = 0;
  let drawnAt = null;

  const size = () => {
    canvas.width = Math.max(2, Math.round(thumb.clientWidth * DPR));
    canvas.height = Math.max(2, Math.round(thumb.clientHeight * DPR));
    drawnAt = null;
  };
  size();
  new ResizeObserver(size).observe(thumb);

  // Cover-fit, the same crop the video itself uses, so the two halves line up.
  function draw() {
    const live = video.readyState >= 2 && video.videoWidth > 0;
    const src = live ? video : poster;
    const w0 = live ? video.videoWidth : poster.naturalWidth;
    const h0 = live ? video.videoHeight : poster.naturalHeight;
    if (!w0) return;
    const stamp = live ? video.currentTime : 'poster';
    if (stamp === drawnAt) return;
    drawnAt = stamp;
    const s = Math.max(canvas.width / w0, canvas.height / h0);
    const sw = canvas.width / s;
    const sh = canvas.height / s;
    ctx.drawImage(src, (w0 - sw) / 2, (h0 - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  function next() {
    mode = (mode + 1) % MODES.length;
    canvas.style.filter = `url(#cvd-${MODES[mode].id})`;
    right.textContent = MODES[mode].name;
  }

  function frame(t) {
    const dt = Math.min(64, t - last);
    last = t;
    f = REDUCED ? target : target + (f - target) * Math.exp((-9 * dt) / 1000);
    if (target === 1 && f > 0.998) f = 1;
    if (f < 1) draw();

    canvas.style.clipPath = `inset(0 0 0 ${(f * 100).toFixed(2)}%)`;
    line.style.transform = `translateX(${(f * thumb.clientWidth).toFixed(1)}px)`;
    thumb.classList.toggle('is-split', f < 0.995);
    left.classList.toggle('is-shown', f > 0.3 && f < 0.995);
    right.classList.toggle('is-shown', f < 0.78);

    if (f === 1 && target === 1) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function aimAt(x) {
    if (target === 1) next();     // a fresh pass shows the next deficiency
    target = Math.min(0.96, Math.max(0.04, x));
    wake();
  }

  function retract() {
    target = 1;
    wake();
  }

  // The tile's link covers the whole card, so pointer events arrive on the
  // tile rather than the thumb. Only the recording itself drives the divider.
  function onPointer(e) {
    const r = thumb.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
    if (inside) aimAt((e.clientX - r.left) / r.width);
    else if (target !== 1) retract();
  }

  tile.addEventListener('pointermove', onPointer);
  tile.addEventListener('pointerdown', onPointer);
  tile.addEventListener('pointerleave', retract);
  tile.addEventListener('pointercancel', retract);

  // Keyboard parity: a visible focus on the tile opens the split halfway.
  tile.addEventListener('focusin', (e) => {
    if (e.target.matches(':focus-visible')) aimAt(0.5);
  });
  tile.addEventListener('focusout', retract);

  // A horizontal drag on a phone scrubs; vertical swipes still scroll the page.
  tile.style.touchAction = 'pan-y';
}

const thumbs = document.querySelectorAll('[data-split-lens]');
if (thumbs.length) {
  addFilters();
  thumbs.forEach(init);
}
