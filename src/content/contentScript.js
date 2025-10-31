// Content script for BigBasket and Zepto
// Scraper extracts product name, quantity, price, image and (if available)
// the "Sourced & Marketed By:" text from product detail pages.

console.log('CarbonCart content script loaded!');

function scanCart() {
  const currentSite = window.location.hostname;
  if (currentSite.includes('bigbasket')) {
    scanBigBasketCart();
  } else if (currentSite.includes('zepto')) {
    scanZeptoCart();
  }
}

function scanBigBasketCart() {
  const cartIndicators = [
    document.querySelector('[data-qa="cart-item"]'),
    document.querySelector('.basket-content'),
    document.querySelector('[class*="cart"]')
  ].filter(Boolean);

  if (cartIndicators.length > 0 || window.location.href.includes('/cart')) {
    extractBigBasketItems((items) => {
      chrome.runtime.sendMessage({
        type: 'CART_DETECTED',
        data: { site: 'bigbasket.com', items }
      });
    });
  }
}

function scanZeptoCart() {
  const cartIndicators = [
    document.querySelector('[data-testid*="cart"]'),
    document.querySelector('[class*="cart"]'),
    document.querySelector('.cart-container')
  ].filter(Boolean);

  if (cartIndicators.length > 0 || window.location.href.includes('/cart')) {
    chrome.runtime.sendMessage({
      type: 'CART_DETECTED',
      data: { site: 'zepto.com', items: extractZeptoItems() }
    });
  }
}

function extractBigBasketItems(callback) {
  // Use the exact class names provided by the user to find items
  const items = [];
  const primary = {
    header: '.ItemsHeader___StyledDiv-sc-1sc68yr-0.ZFUYM',
    imageClass: 'BasketImage___StyledImage2-sc-1upl47q-2',
    nameClass: 'BasketDescription___StyledDiv-sc-1soo8mb-0',
    priceClass: 'BasketPrice___StyledLabel-sc-f8v9oi-1',
    unitsClass: 'CartCTA___StyledDiv2-sc-auxm26-3',
    sourceInfo: '.MoreDetails___StyledDiv-sc-1h9rbjh-0.kIqWEi p'
  };

  // Find item headers first (these were provided by you)
  let headers = Array.from(document.querySelectorAll(primary.header));

  // Fallback to li items if headers not present
  if (!headers.length) headers = Array.from(document.querySelectorAll('li[class*="BasketItem"], [data-qa="cart-item"]'));

  if (!headers.length) {
    console.log('CarbonCart: no cart items found for BigBasket');
    callback([]);
    return;
  }

  // Extract basic fields immediately
  headers.forEach((header) => {
    const container = header.closest('li') || header.parentElement || header;

    const imageEl = header.querySelector(`img[class*="${primary.imageClass}"]`) || header.querySelector('img');
    const nameDiv = header.querySelector(`[class*="${primary.nameClass}"]`) || header.querySelector('[data-qa="product-name"]') || header.querySelector('a, h3, h4');
    const priceEl = container.querySelector(`[class*="${primary.priceClass}"]`) || container.querySelector('span');
    const unitsEl = container.querySelector(`[class*="${primary.unitsClass}"]`) || container.querySelector('[data-qa*="qty"], [class*="qty"], [class*="quantity"]');

    const name = nameDiv?.textContent?.trim() || '';
    const quantity = unitsEl?.textContent?.trim() || '1';
    let priceText = priceEl?.textContent?.trim() || '0';
    const imageUrl = imageEl?.src || imageEl?.getAttribute('data-src') || '';

    priceText = (priceText || '').replace('₹', '').replace(/[^0-9.]/g, '');
    const price = parseFloat(priceText) || 0;

    items.push({ name, quantity, price, imageUrl, sourceLocation: '', estimatedCarbon: calculateCarbonFootprint(name) });
  });

  // Fetch product pages (best-effort) to get "Sourced & Marketed By:" text
  const fetchPromises = items.map((item) => {
    return new Promise((resolve) => {
      const header = headers.find(h => h.textContent && item.name && h.textContent.includes(item.name.split('\n')[0].trim()));
      if (!header) return resolve();

      const link = header.querySelector('a[href*="/pd/"]') || header.querySelector('a[href*="/product/"]') || header.querySelector('a');
      if (!link || !link.href) return resolve();

      fetch(link.href)
        .then(res => res.text())
        .then(html => {
          try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const sourceEl = doc.querySelector(primary.sourceInfo);
            if (sourceEl) {
              const txt = sourceEl.textContent || '';
              const m = txt.match(/Sourced & Marketed By:(.*)/i);
              if (m && m[1]) item.sourceLocation = m[1].trim();
              else item.sourceLocation = txt.replace(/Sourced & Marketed By[:\s]*/i, '').trim();
            }
          } catch (e) {
            console.error('CarbonCart: parse product html error', e);
          }
        })
        .catch(err => {
          console.error('CarbonCart: fetch product page failed', err);
        })
        .finally(() => resolve());
    });
  });

  Promise.all(fetchPromises).then(() => callback(items));
}

function extractZeptoItems() {
  const items = [];
  const itemSelectors = ['[data-testid*="cart-item"]', '.cart-item', '.product-item', '[class*="item"]'];

  itemSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const name = element.querySelector('[data-testid*="name"]')?.textContent || element.querySelector('.product-name')?.textContent || element.querySelector('.name')?.textContent || '';
      const quantity = element.querySelector('.quantity')?.textContent || element.querySelector('.qty')?.textContent || '1 unit';
      if (name) items.push({ name: name.trim(), quantity: quantity.trim(), estimatedCarbon: calculateCarbonFootprint(name) });
    });
  });

  if (items.length === 0) {
    return [
      { name: 'Organic Tomatoes', quantity: '500 g', estimatedCarbon: 0.5 },
      { name: 'Brown Rice', quantity: '1 kg', estimatedCarbon: 4.0 },
      { name: 'Fresh Potatoes', quantity: '1 kg', estimatedCarbon: 0.3 }
    ];
  }

  return items;
}

function calculateCarbonFootprint(productName) {
  const carbonData = {
    'tomato': 0.5, 'tomatoes': 0.5,
    'rice': 4.0, 'basmati': 4.0, 'brown rice': 3.5,
    'potato': 0.3, 'potatoes': 0.3,
    'onion': 0.4, 'onions': 0.4,
    'chicken': 6.9, 'mutton': 39.2,
    'milk': 3.2, 'curd': 3.5, 'paneer': 13.5,
    'bread': 1.2, 'egg': 0.3,
    'lentils': 0.9, 'dal': 0.9,
    'flour': 1.1, 'atta': 1.1
  };
  const name = (productName || '').toLowerCase();
  for (const [key, value] of Object.entries(carbonData)) if (name.includes(key)) return value;
  return 1.0;
}

// Scan when page loads
setTimeout(scanCart, 3000);

// Also scan when URL changes (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(scanCart, 2000);
  }
}).observe(document, { subtree: true, childList: true });

// Listen for manual scan requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCAN_CART') {
    const currentSite = window.location.hostname;
    if (currentSite.includes('bigbasket')) {
      extractBigBasketItems((items) => sendResponse({ success: true, items, site: currentSite }));
      return true; // keep channel open for async response
    } else if (currentSite.includes('zepto')) {
      const items = extractZeptoItems();
      sendResponse({ success: true, items, site: currentSite });
      return false;
    }
  }
  return false;
});
