/* ============================================================
   widont.js - no paragraph ends on a single word.

   `text-wrap: pretty` is already set on body copy, but it is a
   hint: Chrome only reflows the last few lines and it still
   leaves a lone word on the final line often enough to notice.
   The reliable fix is the old typesetting one - bind the last
   two words with a non-breaking space so they can only wrap
   together.

   Runs once, and again on `gateopen`, because the protected
   pages inject their whole body after unlock.
   ============================================================ */

const NBSP = ' ';

/* Anything that reads as a block of prose. Deliberately not <a> or
   inline elements: joining inside them moves the wrap, it does not
   remove it. */
const BLOCKS = 'p, li, figcaption, dd, blockquote, h1, h2, h3, h4';

/** Last text node inside el that carries an actual word. */
function lastWordyText(el) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last = null;
  while (walk.nextNode()) {
    if (walk.currentNode.nodeValue.trim()) last = walk.currentNode;
  }
  return last;
}

function bind(el) {
  if (el.dataset.widont) return;
  el.dataset.widont = '1';

  const text = el.textContent.replace(/\s+/g, ' ').trim();
  // One or two words cannot strand anything.
  if (text.split(' ').length < 3) return;

  const node = lastWordyText(el);
  if (!node) return;

  const words = node.nodeValue.replace(/\s+$/, '');
  const gap = words.lastIndexOf(' ');

  if (gap > 0) {
    // Ordinary case: the block ends in plain text.
    node.nodeValue = words.slice(0, gap) + NBSP + words.slice(gap + 1);
    return;
  }

  /* The tail is a single word in its own node, so the break would fall
     before it - usually after an inline <b> or <span class="num">. Join
     it to whatever precedes it instead. */
  const prevText = (() => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let prev = null;
    while (walk.nextNode()) {
      if (walk.currentNode === node) return prev;
      if (walk.currentNode.nodeValue.trim()) prev = walk.currentNode;
    }
    return null;
  })();

  if (node.nodeValue.startsWith(' ')) {
    node.nodeValue = NBSP + node.nodeValue.slice(1);
  } else if (prevText && prevText.nodeValue.endsWith(' ')) {
    prevText.nodeValue = prevText.nodeValue.slice(0, -1) + NBSP;
  }
}

const run = (root = document) => {
  root.querySelectorAll(BLOCKS).forEach(bind);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => run());
} else {
  run();
}

document.addEventListener('gateopen', () => run());
