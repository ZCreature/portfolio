/* ============================================================
   color.js - the colour engine behind the Color Safety Lens
   case study. Implemented in the page so the argument can be
   demonstrated rather than asserted.

   Pipeline: sRGB → linear RGB → [CVD matrix] → linear RGB → sRGB
   The linearisation step is the whole point of the case study.
   ============================================================ */

/* ---- sRGB transfer function ------------------------------ */

export const toLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

export const toGamma = (l) =>
  l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;

export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3 ? h.split('').map((c) => c + c).join('') : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  ).join('');

/* ---- Machado, Oliveira & Fernandes (2009) ----------------
   Severity-1.0 matrices. The production tool interpolates
   between Machado's published per-severity tables; here we
   interpolate against identity, which tracks them closely
   enough for demonstration and is noted on the page.       */

const CVD = {
  protan: [
    [0.152286,  1.052583, -0.204868],
    [0.114503,  0.786281,  0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322,  0.860646, -0.227968],
    [0.280085,  0.672501,  0.047413],
    [-0.011820, 0.042940,  0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809,  0.147602],
    [0.004733,  0.691367,  0.303900],
  ],
};

const IDENTITY = [[1,0,0],[0,1,0],[0,0,1]];

const lerpMatrix = (m, t) =>
  m.map((row, i) => row.map((v, j) => IDENTITY[i][j] + (v - IDENTITY[i][j]) * t));

/**
 * Simulate colour vision deficiency.
 * @param {string} hex
 * @param {'protan'|'deutan'|'tritan'} type
 * @param {number} severity 0..1
 * @param {boolean} linearise  false reproduces the original bug
 */
export function simulate(hex, type, severity = 1, linearise = true) {
  if (!CVD[type] || severity === 0) return hex;
  const m = lerpMatrix(CVD[type], severity);
  const rgb = hexToRgb(hex).map((v) => v / 255);

  // The bug: applying the matrix straight to gamma-encoded values.
  const working = linearise ? rgb.map(toLinear) : rgb;

  const out = [0, 1, 2].map((i) =>
    m[i][0] * working[0] + m[i][1] * working[1] + m[i][2] * working[2]
  ).map((v) => Math.max(0, Math.min(1, v)));

  const final = linearise ? out.map(toGamma) : out;
  return rgbToHex(final.map((v) => v * 255));
}

/* ---- CIE Lab + ΔE2000 ------------------------------------ */

function rgbToXyz(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  ];
}

export function toLab(hex) {
  const [X, Y, Z] = rgbToXyz(hex);
  const wp = [0.95047, 1.0, 1.08883];
  const f = (t) => (t > 0.008856451679 ? Math.cbrt(t) : t / 0.1284185493 + 4 / 29);
  const [fx, fy, fz] = [X / wp[0], Y / wp[1], Z / wp[2]].map(f);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 colour difference. Validated against Sharma's test data. */
export function deltaE00(hexA, hexB) {
  const [L1, a1, b1] = toLab(hexA);
  const [L2, a2, b2] = toLab(hexB);
  const rad = Math.PI / 180, deg = 180 / Math.PI;

  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;
  const C7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);

  const hp = (b, ap) => {
    if (b === 0 && ap === 0) return 0;
    const h = Math.atan2(b, ap) * deg;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let hbp;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;

  const T = 1
 - 0.17 * Math.cos((hbp - 30) * rad)
    + 0.24 * Math.cos(2 * hbp * rad)
    + 0.32 * Math.cos((3 * hbp + 6) * rad)
 - 0.20 * Math.cos((4 * hbp - 63) * rad);

  const dTheta = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Cbp7 = Math.pow(Cbp, 7);
  const Rc = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
    Math.pow(dCp / Sc, 2) +
    Math.pow(dHp / Sh, 2) +
    Rt * (dCp / Sc) * (dHp / Sh)
  );
}

/* ---- Lab / LCh construction ------------------------------
   Used to build categorical palettes on a lightness ladder,
   which is what makes them survive greyscale.              */

function labToRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const f = (t) => (t > 6 / 29 ? t * t * t : 3 * Math.pow(6 / 29, 2) * (t - 4 / 29));
  const wp = [0.95047, 1, 1.08883];
  const X = wp[0] * f(fx), Y = wp[1] * f(fy), Z = wp[2] * f(fz);
  return [
     3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z,
     0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  ];
}

/** LCh → hex, or null when the colour falls outside the sRGB gamut. */
export function lchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const rgb = labToRgb(L, C * Math.cos(h), C * Math.sin(h));
  if (rgb.some((v) => v < -0.003 || v > 1.003)) return null;
  return rgbToHex(rgb.map((v) => toGamma(Math.max(0, Math.min(1, v))) * 255));
}

/** The most saturated in-gamut colour at a given lightness and hue. */
export function maxChroma(L, hDeg) {
  for (let C = 72; C >= 4; C -= 2) {
    const hex = lchToHex(L, C, hDeg);
    if (hex) return hex;
  }
  return null;
}

/**
 * Best n-series categorical palette we can construct: colours spaced on an
 * even lightness ladder - which is what carries greyscale - with the hue
 * offset searched for the arrangement that maximises the worst pair across
 * normal vision, all three CVD types, and greyscale.
 *
 * The default L* 26-86 span matches the derivation the case study cites, and
 * measures series separation ALONE. Requiring each series to also clear 3:1
 * against the page narrows the usable span and lowers the ceiling further - * which is why the chart on that page carries four series, not five.
 */
export function buildPalette(n, lo = 26, hi = 86) {
  const ladder = Array.from({ length: n }, (_, i) =>
    Math.round(n === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * i) / (n - 1)));

  const CONDS = ['none', 'deutan', 'protan', 'tritan', 'grey'];
  const shift = (hex, c) =>
    c === 'none' ? hex : c === 'grey' ? toGrey(hex) : simulate(hex, c, 1, true);
  const worstAcross = (set) =>
    Math.min(...CONDS.map((c) => minSeparation(set.map((x) => shift(x, c)))));

  let best = null, bestScore = -1;
  // Deterministic sweep of hue arrangements; the same search the offline
  // derivation used, small enough to run on every slider tick.
  for (let t = 0; t < 90; t++) {
    const set = ladder.map((L, i) =>
      maxChroma(L, Math.round((i * (360 / n) + t * 37 + i * i * 13) % 360)));
    if (set.some((c) => !c)) continue;
    const score = worstAcross(set);
    if (score > bestScore) { bestScore = score; best = set; }
  }
  return best || ladder.map((L) => maxChroma(L, 264) || '#888888');
}

/** Worst pairwise ΔE2000 in a set - the number a categorical palette lives by. */
export function minSeparation(colors) {
  let worst = Infinity;
  for (let a = 0; a < colors.length; a++)
    for (let b = a + 1; b < colors.length; b++)
      worst = Math.min(worst, deltaE00(colors[a], colors[b]));
  return worst;
}

/** Perceptual greyscale - the print and projector-washout case. */
export function toGrey(hex) {
  const g = Math.round(255 * toGamma(luminance(hex)));
  return rgbToHex([g, g, g]);
}

/* ---- WCAG contrast --------------------------------------- */

export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(hexA, hexB) {
  const a = luminance(hexA), b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Tint ramp toward white, the way brand colour actually ships. */
export function tint(hex, pct) {
  const rgb = hexToRgb(hex).map((v) => toLinear(v / 255));
  const mixed = rgb.map((v) => v * (pct / 100) + 1 * (1 - pct / 100));
  return rgbToHex(mixed.map((v) => toGamma(v) * 255));
}
