import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('renders chain-matched token referral links for selected DEXes', () => {
  const elements = Object.fromEntries(
    ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'feed', 'refresh', 'sound', 'clock']
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
    { chainId: 'ethereum', tokenAddress: '0xabc/def', symbol: 'EthVisible', links: [] },
    { chainId: 'solana', tokenAddress: 'SOL1', symbol: 'SolHidden', links: [] },
    { chainId: 'arbitrum', tokenAddress: 'ARB1', symbol: 'ArbVisible', links: [] },
    { chainId: 'xlayer', tokenAddress: 'XL1', symbol: 'XlayerHidden', links: [] },
    { chainId: 'avalanche', tokenAddress: 'AVAX1', symbol: 'Unsupported', links: [] },
  ]) });

  assert.match(elements.feed.innerHTML, /Visible/);
  assert.match(elements.feed.innerHTML, /EthVisible/);
  assert.doesNotMatch(elements.feed.innerHTML, /SolHidden|Unsupported/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/gmgn\.ai\/robinhood\/token\/GTWdnLSv_RH1"/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/gmgn\.ai\/eth\/token\/GTWdnLSv_0xabc%2Fdef"/);
  assert.match(elements.feed.innerHTML, /<aside class="event-side"><time[^>]*>.*?<\/time><div class="actions">/);
  assert.doesNotMatch(elements['chain-picker'].innerHTML + elements['dex-picker'].innerHTML, /value="all"|>All</i);
  const chainValues = [...elements['chain-picker'].innerHTML.matchAll(/value="([^"]+)"/g)]
    .map(([, value]) => value)
    .sort();
  assert.deepEqual(chainValues, ['arbitrum', 'arc', 'base', 'bsc', 'eth', 'hyperevm', 'robinhood', 'sol', 'xlayer']);

  elements['chain-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'sol' } });
  assert.match(elements.feed.innerHTML, /SolHidden/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/gmgn\.ai\/sol\/token\/GTWdnLSv_SOL1"/);
  assert.doesNotMatch(elements.feed.innerHTML, /Unsupported/);

  elements['dex-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'binance' } });
  assert.match(elements.feed.innerHTML, /href="https:\/\/web3\.binance\.com\/token\/robinhood\/RH1\?ref=PZGZ6O5N"/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/web3\.binance\.com\/token\/eth\/0xabc%2Fdef\?ref=PZGZ6O5N"/);

  elements['dex-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'debot' } });
  assert.match(elements.feed.innerHTML, /href="https:\/\/debot\.ai\/token\/robinhood\/325634_RH1"/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/debot\.ai\/token\/eth\/325634_0xabc%2Fdef"/);

  elements['dex-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'okx' } });
  assert.match(elements['dex-picker'].innerHTML, /value="okx"/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/web3\.okx\.com\/token\/robinhood-chain\/RH1\?ref=ALPHALIVE"/);
  assert.match(elements.feed.innerHTML, /src="image\/OKX_logo\.jpg" alt="OKX"/);

  elements['chain-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'xlayer' } });
  const xlayerRow = [...elements.feed.innerHTML.matchAll(/<article class="event">[\s\S]*?<\/article>/g)]
    .map(match => match[0])
    .find(row => row.includes('title="XL1"')) ?? '';
  assert.match(xlayerRow, /href="https:\/\/web3\.okx\.com\/token\/xlayer\/XL1\?ref=ALPHALIVE"/);
  assert.doesNotMatch(xlayerRow, /dex-action debot/);

  assert.match(elements.feed.innerHTML, /href="https:\/\/debot\.ai\/token\/solana\/325634_SOL1"/);
  assert.match(elements.feed.innerHTML, /href="https:\/\/web3\.okx\.com\/token\/solana\/SOL1\?ref=ALPHALIVE"/);

  elements['chain-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'arbitrum' } });
  const arbitrumRow = [...elements.feed.innerHTML.matchAll(/<article class="event">[\s\S]*?<\/article>/g)]
    .map(match => match[0])
    .find(row => row.includes('title="ARB1"')) ?? '';
  assert.match(arbitrumRow, /ArbVisible/);
  assert.match(arbitrumRow, /href="https:\/\/gmgn\.ai\/arbitrum\/token\/GTWdnLSv_ARB1"/);
  assert.doesNotMatch(arbitrumRow, /dex-action binance/);
});

test('keeps live status and only the reopen hint in the footer', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';

  assert.doesNotMatch(html, /class="overview"/);
  assert.match(header, /id="live"/);
  assert.match(footer, /点击插件图标可再次打开/);
  assert.doesNotMatch(footer, /LIVE PROFILE WATCH|footer-count|未读/);
});

test('uses the shared logo image for the top brand mark', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const brandLockup = html.match(/<div class="brand-lockup">[\s\S]*?<\/div>\s*<div class="header-tools">/)?.[0] ?? '';

  assert.match(brandLockup, /<img[^>]+src="image\/logo\.png"/);
  assert.match(brandLockup, /alt="ALPHA LIVE"/);
});

test('declares the shared logo image as the extension icon', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', import.meta.url), 'utf8'));

  assert.deepEqual(manifest.icons, {
    "16": "image/logo.png",
    "32": "image/logo.png",
    "48": "image/logo.png",
    "128": "image/logo.png",
  });
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
