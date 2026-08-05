/* ============================================================
   theme.js — light/dark switch.

   The site enters LIGHT for every first-time visitor regardless
   of their OS setting; dark is a deliberate choice that is then
   remembered. The pre-paint snippet in each <head> applies the
   stored value before first paint, so this file only has to
   wire up the control.
   ============================================================ */

const STORE = 'ca-theme';

const current = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

function set(mode) {
  const dark = mode === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

  try {
    localStorage.setItem(STORE, dark ? 'dark' : 'light');
  } catch {
    // Private browsing or storage disabled — the choice just won't persist.
  }

  // Keep the address-bar / system chrome in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b0b0c' : '#fbfbfa');

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  });

  // Charts carry their own per-theme palettes — a single series palette can't
  // clear contrast against both papers — so they need to know when to repaint.
  document.dispatchEvent(
    new CustomEvent('themechange', { detail: { theme: dark ? 'dark' : 'light' } })
  );
}

function init() {
  // Reflect whatever the pre-paint snippet decided.
  set(current());

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark'));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
