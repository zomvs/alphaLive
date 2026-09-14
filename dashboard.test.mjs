import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('renders selected-chain time above the action buttons', () => {
  const elements = Object.fromEntries(
    ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'footer-count', 'feed', 'refresh', 'sound', 'clock']
      .map(id => [id, {
        className: '', innerHTML: '', textContent: '', title: '',
        classList: { toggle() {} },
        setAttribute() {},
      }]),
  );

  class WebSocket {
    constructor() { WebSocket.instance = this; }
    close() {}
  }

  vm.runInNewContext(readFileSync(new URL('dashboard.js', import.meta.url), 'utf8'), {
    WebSocket,
    clearTimeout() {},
    document: {
      addEventListener() {},
      querySelector: selector => elements[selector.slice(1)],
      querySelectorAll: () => [],
    },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    setInterval() {},
    setTimeout() {},
  });

  WebSocket.instance.onmessage({ data: JSON.stringify([
    { chainId: 'robinhood', tokenAddress: 'RH1', symbol: 'Visible', links: [] },
    { chainId: 'solana', tokenAddress: 'SOL1', symbol: 'Hidden', links: [] },
  ]) });

  assert.match(elements.feed.innerHTML, /Visible/);
  assert.doesNotMatch(elements.feed.innerHTML, /Hidden/);
  assert.match(elements.feed.innerHTML, /<aside class="event-side"><time[^>]*>.*?<\/time><div class="actions">/);
  assert.doesNotMatch(elements['chain-picker'].innerHTML + elements['dex-picker'].innerHTML, /value="all"|>All</i);
});

test('keeps live status and unread count without an overview strip', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';

  assert.doesNotMatch(html, /class="overview"/);
  assert.match(header, /id="live"/);
  assert.match(footer, /id="footer-count"/);
});

test('does not draw a second divider above the controls', () => {
  const css = readFileSync(new URL('dashboard.css', import.meta.url), 'utf8');
  const workspaceRule = css.match(/\.workspace\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.doesNotMatch(workspaceRule, /border-top/);
});

test('enlarges the token icon on hover without reflow', () => {
  const css = readFileSync(new URL('dashboard.css', import.meta.url), 'utf8');
  const iconRule = css.match(/\.token\s*>\s*img\s*\{([^}]*)\}/)?.[1] ?? '';
  const hoverRule = css.match(/\.token\s*>\s*img:hover\s*\{([^}]*)\}/)?.[1] ?? '';

  assert.match(iconRule, /transition:[^;]*transform/);
  assert.match(iconRule, /transform-origin:\s*left center/);
  assert.match(hoverRule, /transform:\s*scale\(2\.3\)/);
});
