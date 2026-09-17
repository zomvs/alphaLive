import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('renders the CA-resolved token symbol instead of its name', async () => {
  const elements = Object.fromEntries(
    ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'social-summary', 'social-picker', 'feed', 'refresh', 'sound', 'clock']
      .map(id => [id, {
        className: '', innerHTML: '', textContent: '', title: '',
        classList: { toggle() {} },
        setAttribute() {},
      }]),
  );
  let requestedUrl = '';

  class WebSocket {
    constructor() { WebSocket.instance = this; }
    close() {}
  }

  const fetch = async url => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => [{
        chainId: 'robinhood',
        dexId: 'example',
        url: 'https://dexscreener.com/ethereum/example',
        pairAddress: '0xPair',
        labels: [],
        baseToken: {
          address: '0x704aC8b6E2070A773795FDA247AdDaF3F76C1014',
          name: 'Options Market Launchpad',
          symbol: 'STRIKEPAD',
        },
        quoteToken: { address: '0xQuote', name: 'Wrapped Ether', symbol: 'WETH' },
        priceNative: '1',
        priceUsd: '1',
        txns: {},
        volume: {},
        priceChange: {},
        liquidity: {},
        fdv: 1,
        marketCap: 1,
        pairCreatedAt: 1,
        info: {},
      }],
    };
  };

  vm.runInNewContext(readFileSync(new URL('dashboard.js', import.meta.url), 'utf8'), {
    fetch,
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

  WebSocket.instance.onmessage({ data: JSON.stringify({
    chainId: 'robinhood',
    tokenAddress: '0x704ac8b6e2070a773795fda247addaf3f76c1014',
    symbol: 'OLD',
    links: [],
  }) });
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(requestedUrl, 'https://api.dexscreener.com/tokens/v1/robinhood/0x704ac8b6e2070a773795fda247addaf3f76c1014');
  assert.match(elements.feed.innerHTML, /<div class="token-name">STRIKEPAD<\/div>/);
  assert.doesNotMatch(elements.feed.innerHTML, /Options Market Launchpad/);
  assert.doesNotMatch(elements.feed.innerHTML, />OLD</);
});

test('renders chain-matched token referral links for selected DEXes', () => {
  const elements = Object.fromEntries(
    ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'social-summary', 'social-picker', 'feed', 'refresh', 'sound', 'clock']
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

test('requires every selected social link when filtering profiles', () => {
  const elements = Object.fromEntries(
    ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'social-summary', 'social-picker', 'feed', 'refresh', 'sound', 'clock']
      .map(id => [id, {
        className: '', innerHTML: '', textContent: '', title: '', attributes: {},
        classList: { toggle(name, enabled) { this[name] = enabled; } },
        setAttribute(name, value) { this.attributes[name] = value; },
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
    {
      chainId: 'ethereum', tokenAddress: '0xboth', symbol: 'BothLinks',
      links: [
        { type: 'website', label: 'Website', url: 'https://example.com' },
        { type: 'twitter', label: 'X', url: 'https://x.com/example' },
      ],
    },
    {
      chainId: 'ethereum', tokenAddress: '0xweb', symbol: 'WebsiteOnly',
      links: [{ type: 'website', label: 'Website', url: 'https://website.example' }],
    },
    {
      chainId: 'ethereum', tokenAddress: '0xtwitter', symbol: 'TwitterOnly',
      links: [{ type: 'twitter', label: 'X', url: 'https://x.com/example' }],
    },
    { chainId: 'ethereum', tokenAddress: '0xnone', symbol: 'NoSocialLinks', links: [] },
  ]) });

  assert.match(elements.feed.innerHTML, /BothLinks/);
  assert.match(elements.feed.innerHTML, /WebsiteOnly/);
  assert.match(elements.feed.innerHTML, /TwitterOnly/);
  assert.match(elements.feed.innerHTML, /NoSocialLinks/);
  assert.equal(typeof elements['social-picker'].onchange, 'function');

  elements['social-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'website' } });
  assert.match(elements.feed.innerHTML, /BothLinks/);
  assert.match(elements.feed.innerHTML, /WebsiteOnly/);
  assert.doesNotMatch(elements.feed.innerHTML, /TwitterOnly|NoSocialLinks/);

  elements['social-picker'].onchange({ target: { type: 'checkbox', checked: true, value: 'twitter' } });
  assert.match(elements.feed.innerHTML, /BothLinks/);
  assert.doesNotMatch(elements.feed.innerHTML, /WebsiteOnly|TwitterOnly|NoSocialLinks/);
});

test('keeps live status and only the reopen hint in the footer', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';

  assert.doesNotMatch(html, /class="overview"/);
  assert.match(header, /id="live"[^>]*>[\s\S]*data-i18n="connecting"/);
  assert.match(footer, /data-i18n="reopenHint"/);
  assert.doesNotMatch(footer, /LIVE PROFILE WATCH|footer-count|未读/);
});

test('provides a social-link filter matching the chain and DEX controls', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const control = html.match(/<details class="filter-select" id="social-select">[\s\S]*?<\/details>/)?.[0] ?? '';

  assert.match(control, /data-i18n-title="socialFilter"/);
  assert.match(control, /data-i18n-aria-label="socialFilter"/);
  assert.match(control, /id="social-summary"/);
  assert.match(control, /id="social-picker"/);
});

test('uses the shared logo image for the top brand mark', () => {
  const html = readFileSync(new URL('dashboard.html', import.meta.url), 'utf8');
  const brandLockup = html.match(/<div class="brand-lockup">[\s\S]*?<\/div>\s*<div class="header-tools">/)?.[0] ?? '';

  assert.match(brandLockup, /<img[^>]+src="image\/logo\.png"/);
  assert.match(brandLockup, /alt="Alpha Live"/);
  assert.match(brandLockup, /class="brand" data-i18n="extensionName">Alpha Live/);
  assert.match(brandLockup, /class="subtitle" data-i18n="monitorSubtitle">DEX PROFILE MONITOR/);
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

test('provides localized extension metadata in English and Simplified Chinese', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', import.meta.url), 'utf8'));
  const readMessages = locale => {
    try {
      return JSON.parse(readFileSync(new URL(`_locales/${locale}/messages.json`, import.meta.url), 'utf8'));
    } catch {
      return {};
    }
  };
  const english = readMessages('en');
  const chinese = readMessages('zh_CN');

  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.name, '__MSG_extensionName__');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  assert.equal(manifest.action.default_title, '__MSG_actionTitle__');
  assert.equal(english.extensionName?.message, 'Alpha Live');
  assert.equal(chinese.extensionName?.message, 'Alpha Live');
  assert.match(english.extensionDescription?.message ?? '', /DEX Screener Token Profile/);
  assert.match(chinese.extensionDescription?.message ?? '', /实时监控 DEX Screener Token Profile/);
});

test('renders the dashboard in the active Chrome UI language', () => {
  const runDashboard = locale => {
    const messages = JSON.parse(readFileSync(new URL(`_locales/${locale}/messages.json`, import.meta.url), 'utf8'));
    const elements = Object.fromEntries(
      ['live', 'chain-summary', 'chain-picker', 'dex-summary', 'dex-picker', 'social-summary', 'social-picker', 'feed', 'refresh', 'sound', 'clock']
        .map(id => [id, {
          className: '', innerHTML: '', textContent: '', title: '', dataset: {}, attributes: {},
          classList: { toggle() {} },
          setAttribute(name, value) { this.attributes[name] = value; },
        }]),
    );
    elements.refresh.dataset = { i18nTitle: 'refresh', i18nAriaLabel: 'refresh' };
    elements.sound.dataset = { i18nTitle: 'soundOff', i18nAriaLabel: 'soundOff' };
    const socialIcon = {
      title: '', dataset: { i18nTitle: 'socialFilter', i18nAriaLabel: 'socialFilter' }, attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
    };
    const brand = { textContent: '', dataset: { i18n: 'extensionName' } };
    const subtitle = { textContent: '', dataset: { i18n: 'monitorSubtitle' } };
    const connecting = { textContent: '', dataset: { i18n: 'connecting' } };
    const footer = { textContent: '', dataset: { i18n: 'reopenHint' } };
    const localizedNodes = [...Object.values(elements), socialIcon, brand, subtitle, connecting, footer];
    const document = {
      documentElement: { lang: '' },
      title: '',
      addEventListener() {},
      querySelector: selector => elements[selector.slice(1)],
      querySelectorAll: selector => localizedNodes.filter(node => {
        if (selector === '[data-i18n]') return node.dataset.i18n;
        if (selector === '[data-i18n-title]') return node.dataset.i18nTitle;
        if (selector === '[data-i18n-aria-label]') return node.dataset.i18nAriaLabel;
        return false;
      }),
    };
    const chrome = {
      i18n: {
        getUILanguage: () => locale === 'zh_CN' ? 'zh-CN' : 'en-US',
        getMessage: (key, substitutions = []) => {
          const entry = messages[key];
          if (!entry) return '';
          const values = Array.isArray(substitutions) ? substitutions : [substitutions];
          return Object.entries(entry.placeholders ?? {}).reduce((message, [name, placeholder]) => {
            const position = Number(placeholder.content.replace(/\D/g, '')) - 1;
            return message.replaceAll(`$${name.toUpperCase()}$`, values[position] ?? '');
          }, entry.message);
        },
      },
    };

    class WebSocket {
      constructor() { WebSocket.instance = this; }
      close() {}
    }

    vm.runInNewContext(readFileSync(new URL('dashboard.js', import.meta.url), 'utf8'), {
      chrome,
      WebSocket,
      clearTimeout() {},
      document,
      localStorage: { getItem: () => null, setItem() {} },
      navigator: { clipboard: { writeText: () => Promise.resolve() } },
      setInterval() {},
      setTimeout() {},
    });

    WebSocket.instance.onmessage({ data: JSON.stringify({
      chainId: 'eth', tokenAddress: '0xabc', symbol: 'Localized', links: [],
    }) });

    return { brand, connecting, document, elements, footer, socialIcon, subtitle };
  };

  const english = runDashboard('en');
  assert.equal(english.document.documentElement.lang, 'en-US');
  assert.equal(english.document.title, 'Alpha Live');
  assert.equal(english.brand.textContent, 'Alpha Live');
  assert.equal(english.subtitle.textContent, 'DEX PROFILE MONITOR');
  assert.equal(english.connecting.textContent, 'CONNECTING');
  assert.equal(english.footer.textContent, 'Click the extension icon to reopen');
  assert.equal(english.elements.sound.title, 'Turn off sound');
  assert.equal(english.socialIcon.title, 'Social links');
  assert.match(english.elements['social-picker'].innerHTML, />Website<|>Twitter</);
  assert.match(english.elements.live.innerHTML, /RECONNECTING/);
  assert.match(english.elements.feed.innerHTML, /Open GMGN/);
  assert.match(english.elements.feed.innerHTML, /Mark as read/);
  english.elements.sound.onclick();
  assert.equal(english.elements.sound.title, 'Turn on sound');

  const chinese = runDashboard('zh_CN');
  assert.equal(chinese.document.documentElement.lang, 'zh-CN');
  assert.equal(chinese.brand.textContent, 'Alpha Live');
  assert.equal(chinese.subtitle.textContent, 'DEX 资料监控');
  assert.equal(chinese.connecting.textContent, '连接中');
  assert.equal(chinese.footer.textContent, '点击插件图标可再次打开');
  assert.equal(chinese.elements.sound.title, '关闭提示音');
  assert.equal(chinese.socialIcon.title, '社交链接');
  assert.match(chinese.elements['social-picker'].innerHTML, />网站<|>推特</);
  assert.match(chinese.elements.live.innerHTML, /重新连接/);
  assert.match(chinese.elements.feed.innerHTML, /打开 GMGN/);
  assert.match(chinese.elements.feed.innerHTML, /标记已读/);
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
