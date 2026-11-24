/* ============================================================
   sunlight.js - the healthcare dashboard tile, in passing light.

   The tile is a photograph of a laptop on a wall shelf in
   dappled sun. Moving across it moves the sun: a warm hotspot
   follows the pointer, a second set of leaf shadows drifts the
   other way across the wall, and the photograph shifts a few
   pixels with the pointer, so the three read as depth.

   The leaf shadows are SVG fractal noise, thresholded into
   blobs, stretched and turned to match the angle of the
   shadows already in the photograph. They cost no download and
   are only built on devices that can hover.

   Neither the shadows nor the hotspot fall on the laptop
   screen. A lit screen barely shows a cast shadow, and the
   dashboard on it is the work, so a mask lets only a trace of
   either through there.

   Motion answers intent: nothing moves until the pointer is
   over the photograph, and the light settles back when it
   leaves. Keyboard focus brings the light up where it rests.
   With reduced motion the light fades in and out but nothing
   tracks the pointer.
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOVER = window.matchMedia('(hover: hover)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';

// Where the sun sits when nothing is steering it: the upper right, where the
// light in the photograph comes from. Fractions of the photograph.
const REST = [0.7, 0.3];

// The laptop screen in healthcare-tile.jpg, in its 1200 x 750 pixels,
// clockwise from top left. The lights are masked off it, so if the photo is
// ever re-shot or re-cropped these four corners move with it: check them
// with scripts/tile-plates/.
export const SCREEN = [[323, 146.5], [804, 124], [801, 405], [329, 427]];

// Full strength everywhere but the screen, 15% on it, with an edge softened
// by two pixels so it never reads as a cut-out.
function screenMask() {
  const d = `M${SCREEN.map((p) => p.join(' ')).join('L')}Z`;
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 750' preserveAspectRatio='none'>" +
    "<filter id='s'><feGaussianBlur stdDeviation='2'/></filter><g filter='url(#s)'>" +
    `<path fill-rule='evenodd' d='M-20-20H1220V770H-20Z${d}'/><path fill-opacity='.15' d='${d}'/>` +
    '</g></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / 100% 100% no-repeat`;
}

// The photograph eases in a little while lit, so the pointer has room to
// move it without showing an edge. Held still under reduced motion.
const ZOOM = REDUCED ? 0 : 0.045;

function gobo() {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'sunlight__gobo');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<filter id="sunlight-leaf" x="0" y="0" width="100%" height="100%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.0055 0.017" numOctaves="3" seed="7"/>' +
      // Flat warm shadow colour; alpha is the noise pushed through a steep
      // threshold, so the field breaks into separate leaves rather than haze.
      '<feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.07  9 0 0 0 -4.7"/>' +
      '<feGaussianBlur stdDeviation="5"/>' +
    '</filter>' +
    '<rect width="100%" height="100%" filter="url(#sunlight-leaf)"/>';
  return svg;
}

function init(thumb) {
  const tile = thumb.closest('.tile');
  const img = thumb.querySelector('img');
  if (!tile || !img) return;

  // Each light sits in a layer that carries its blend mode and the mask that
  // keeps it off the laptop screen, and moves with the photograph.
  const layer = (kind, child) => {
    const el = document.createElement('div');
    el.className = `sunlight__layer sunlight__layer--${kind}`;
    el.setAttribute('aria-hidden', 'true');
    el.append(child);
    return el;
  };
  const leaves = gobo();
  const sun = document.createElement('div');
  sun.className = 'sunlight__sun';
  const shade = layer('shade', leaves);
  const glow = layer('sun', sun);
  const mask = screenMask();
  for (const el of [shade, glow]) {
    el.style.setProperty('-webkit-mask', mask);
    el.style.setProperty('mask', mask);
  }
  thumb.append(shade, glow);

  let lit = 0, litTo = 0;                       // 0 dark .. 1 lit
  let px = 0, py = 0, pxTo = 0, pyTo = 0;       // pointer from centre, -0.5..0.5
  let sx = REST[0], sy = REST[1], sxTo = REST[0], syTo = REST[1];
  let running = false;
  let last = 0;

  const damp = (a, b, rate, dt) => b + (a - b) * Math.exp((-rate * dt) / 1000);

  function frame(t) {
    const dt = Math.min(64, t - last);
    last = t;
    lit = damp(lit, litTo, 6, dt);
    px = damp(px, pxTo, 3, dt);
    py = damp(py, pyTo, 3, dt);
    sx = damp(sx, sxTo, 4, dt);
    sy = damp(sy, syTo, 4, dt);

    const w = thumb.clientWidth;
    const h = thumb.clientHeight;
    // The photograph moves with the pointer, the shadows against it. The
    // layers take the photograph's own move so their masks stay on the screen.
    const photo =
      `scale(${(1 + ZOOM * lit).toFixed(4)}) ` +
      `translate(${(px * 10 * lit).toFixed(2)}px, ${(py * 6 * lit).toFixed(2)}px)`;
    img.style.transform = photo;
    shade.style.transform = photo;
    glow.style.transform = photo;
    shade.style.opacity = (0.5 * lit).toFixed(3);
    glow.style.opacity = lit.toFixed(3);
    leaves.style.transform =
      `translate(${(-px * 70).toFixed(2)}px, ${(-py * 36).toFixed(2)}px) rotate(-28deg)`;
    sun.style.transform =
      `translate(${((sx - 0.5) * w).toFixed(1)}px, ${((sy - 0.5) * h).toFixed(1)}px)`;

    const settled = litTo === 0 && lit < 0.002 &&
      Math.abs(px) < 0.002 && Math.abs(py) < 0.002;
    if (settled) {
      lit = 0; px = 0; py = 0; sx = sxTo; sy = syTo;
      img.style.transform = '';
      shade.style.opacity = '0';
      glow.style.opacity = '0';
      thumb.classList.remove('is-lighting');
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function wake() {
    if (running) return;
    running = true;
    thumb.classList.add('is-lighting');
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function light(on) {
    litTo = on ? 1 : 0;
    thumb.classList.toggle('is-lit', on);
    if (!on) { pxTo = 0; pyTo = 0; sxTo = REST[0]; syTo = REST[1]; }
    wake();
  }

  // The tile's link covers the whole card, so pointer events arrive on the
  // tile rather than the thumb. Only the photograph steers the light.
  function onPointer(e) {
    if (e.pointerType === 'touch') return;
    const r = thumb.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    if (!inside) { if (litTo) light(false); return; }
    if (!litTo) light(true);
    if (REDUCED) return;
    pxTo = x - 0.5; pyTo = y - 0.5;
    sxTo = x; syTo = y;
    wake();
  }

  tile.addEventListener('pointermove', onPointer);
  tile.addEventListener('pointerleave', () => { if (litTo) light(false); });

  // Keyboard parity: a visible focus on the tile brings the light up at rest.
  tile.addEventListener('focusin', (e) => {
    if (e.target.matches(':focus-visible')) light(true);
  });
  tile.addEventListener('focusout', () => light(false));
}

// Phones and tablets have no hover to answer, so they keep the still photo
// and never pay for the noise filter.
const thumbs = document.querySelectorAll('[data-sunlight]');
if (thumbs.length && HOVER) {
  const go = () => thumbs.forEach(init);
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2000 });
  else setTimeout(go, 200);
}
