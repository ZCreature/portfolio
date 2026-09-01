/* ============================================================
   widont.js - no paragraph ends on a single word.

   `text-wrap: pretty` is already set on body copy, but it is a
   hint: Chrome only reflows the last few lines and it still
   leaves a lone word on the final line often enough to notice.
   The reliable fix is the old typesetting one - bind the last
   two words with a non-breaking space so they can only wrap
   together.

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

  /* The gap before the last word is usually a source line break plus its
     indentation, not a single space. Collapse the WHOLE run: replacing only
     the final space leaves the newline and the indent in place, and those
     collapse to a rendered space that then sits beside the nbsp. The reader
     sees a double space, which is the exact blemish this file exists to
     prevent. */
  const tail = words.match(/^([\s\S]*\S)\s+(\S+)$/);

  if (tail) {
    // Ordinary case: the block ends in plain text.
    node.nodeValue = tail[1] + NBSP + tail[2];
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

  /* Same rule on both sides: swap the entire whitespace run, never one
     character of it. */
  if (/^\s/.test(node.nodeValue)) {
    node.nodeValue = NBSP + node.nodeValue.replace(/^\s+/, '');
  } else if (prevText && /\s$/.test(prevText.nodeValue)) {
    prevText.nodeValue = prevText.nodeValue.replace(/\s+$/, '') + NBSP;
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

