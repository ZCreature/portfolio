/* ============================================================
   gate.js - password gate for protected work.

   This does NOT hide markup and hope nobody looks. The protected
   content is stored as AES-256-GCM ciphertext; without the
   passphrase there is nothing in the page to read, in the source
   or otherwise. The key is derived with PBKDF2-SHA256 at 310,000
   iterations, so guessing is expensive.

   What it protects against: someone opening the URL, viewing
   source, or reading the deployed files.
   What it does not: a weak passphrase, or someone you gave the
   passphrase to passing it on.
   ============================================================ */

const ITERATIONS = 310000;

const b64ToBytes = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function unlock(passphrase, payload) {
  const key = await deriveKey(passphrase, b64ToBytes(payload.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    b64ToBytes(payload.data)
  );
  return new TextDecoder().decode(plain);
}

/**
 * innerHTML never executes <script>, so the decrypted document's own
 * scripts have to be re-created as live nodes to run.
 */
function activateScripts(root) {
  root.querySelectorAll('script').forEach((old) => {
    const s = document.createElement('script');
    [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
}

async function init() {
  const gate = document.querySelector('[data-gate]');
  if (!gate) return;

  const target = document.querySelector('[data-gate-target]');
  const form = gate.querySelector('form');
  const input = gate.querySelector('input[type="password"]');
  const msg = gate.querySelector('.gate__msg');

  let payload;
  try {
    payload = await (await fetch(gate.dataset.gate)).json();
  } catch {
    msg.textContent = 'Protected content could not be loaded.';
    msg.dataset.state = 'bad';
    return;
  }

  const open = async (pass, quiet) => {
    try {
      const html = await unlock(pass, payload);
      target.innerHTML = html;
      activateScripts(target);
      gate.remove();
      target.hidden = false;
      try { sessionStorage.setItem('ca-gate', pass); } catch {}
      document.dispatchEvent(new CustomEvent('gateopen'));
      return true;
    } catch {
      if (!quiet) {
        msg.textContent = 'That passphrase does not match.';
        msg.dataset.state = 'bad';
        input.select();
      }
      return false;
    }
  };

  // Don't ask again on every page view within the session.
  let remembered = null;
  try { remembered = sessionStorage.getItem('ca-gate'); } catch {}
  if (remembered && (await open(remembered, true))) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.dataset.state = '';
    msg.textContent = 'Checking…';
    await open(input.value, false);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
