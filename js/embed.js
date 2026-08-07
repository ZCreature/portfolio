/* ============================================================
   embed.js - fit a fixed-size embedded tool into whatever width
   the page can spare.

   Both tools are built for a single viewport size: no media
   queries, several position:fixed panels. Narrowing the iframe
   clips them. So each iframe is given its natural dimensions and
   scaled to fit, and the wrapper's height is set to match the
   scaled result so no space is left over.
   ============================================================ */

function fit(box) {
  const frame = box.querySelector('.embed__frame');
  const iframe = box.querySelector('iframe');
  if (!frame || !iframe) return;

  const w = Number(box.dataset.embedW || 1440);
  const h = Number(box.dataset.embedH || 900);

  // Measure the wrapper, not the frame - the frame's own width is about to
  // be set from this and would otherwise feed back into the next reading.
  const available = box.clientWidth;
  if (!available) return;

  // Never scale up past 1:1 - a stretched tool looks broken, not big.
  const scale = Math.min(available / w, 1);

  frame.style.setProperty('--embed-w', w + 'px');
  frame.style.setProperty('--embed-h', h + 'px');
  frame.style.setProperty('--embed-scale', String(scale));
  frame.style.height = Math.round(h * scale) + 'px';
  // Hug the scaled content so no dead space is left beside it.
  frame.style.width = Math.round(w * scale) + 'px';
  frame.style.marginInline = 'auto';

  box.dataset.scale = scale.toFixed(2);
}

function init() {
  const boxes = [...document.querySelectorAll('.embed--fit')];
  if (!boxes.length) return;

  boxes.forEach((box) => {
    fit(box);

    const iframe = box.querySelector('iframe');
    iframe?.addEventListener('load', () => {
      box.setAttribute('data-loaded', 'true');
      fit(box);
    });

    // Report the scale so the caption can be honest about it.
    const out = box.querySelector('[data-scale-out]');
    if (out) {
      const show = () => {
        const s = Number(box.dataset.scale || 1);
        out.textContent = s < 0.995 ? `Shown at ${Math.round(s * 100)}% of actual size.` : '';
      };
      new ResizeObserver(show).observe(box);
      show();
    }
  });

  const ro = new ResizeObserver(() => boxes.forEach(fit));
  boxes.forEach((b) => ro.observe(b));
  addEventListener('resize', () => boxes.forEach(fit), { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
