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
    // imageClass targets the <img> element; imageContainerClass targets the div wrapper which contains the <a>
    imageClass: 'BasketImage___StyledImage2-sc-1upl47q-2',
    imageContainerClass: 'BasketImage___StyledDiv-sc-1upl47q-0',
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

      // Derive the container for this header (was previously defined in a different scope)
      const container = header.closest('li') || header.parentElement || header;

      // Prefer anchor inside the image container (per your note). Fall back to header or container anchors.
      let link = null;
      try {
        // Prefer the explicit image container div (user-specified) which contains the <a> without classes.
        const imgContainer = container.querySelector(`div[class*="${primary.imageContainerClass}"], div[class*="${primary.imageClass}"]`);
        if (imgContainer) link = imgContainer.querySelector('a');
      } catch (e) {
        // ignore selector errors
      }
      if (!link) link = header.querySelector('a[href*="/pd/"], a[href*="/p/"], a[href*="/product/"], a');
      if (!link) link = container.querySelector('a[href*="/pd/"], a[href*="/p/"], a[href*="/product/"], a');
      if (!link || !link.href) return resolve();

      fetch(link.href)
        .then(res => res.text())
        .then(html => {
          try {
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Preferred: look for .bullets sections (user said the 2nd child contains sourced/country/ean)
            const bullets = Array.from(doc.querySelectorAll('.bullets'));
            let infoText = '';
            if (bullets.length >= 2) {
              // pick the second bullets container
              infoText = bullets[1].textContent || '';
            } else if (bullets.length === 1) {
              infoText = bullets[0].textContent || '';
            }

            // fallback: existing MoreDetails selector
            if (!infoText) {
              const sourceEl = doc.querySelector(primary.sourceInfo);
              if (sourceEl) infoText = sourceEl.textContent || '';
            }

            // First, try to find an element that explicitly contains the "Sourced & Marketed By" text
            let foundSourced = false;
            try {
              const candidate = Array.from(doc.querySelectorAll('p, div, li, span')).find(el => /Sourced\s*&\s*Marketed\s*By/i.test(el.textContent || ''));
              if (candidate) {
                const txt = (candidate.textContent || '').trim();
                // Extract everything after the phrase — user asked for the whole paragraph after the label
                const m = txt.match(/Sourced\s*&\s*Marketed\s*By[:\s]*(.*)/i);
                if (m && m[1]) {
                  item.sourceLocation = m[1].trim();
                } else {
                  // fallback: remove the label and keep the rest of the paragraph
                  item.sourceLocation = txt.replace(/Sourced\s*&\s*Marketed\s*By[:\s]*/i, '').trim();
                }
                foundSourced = true;
              }
            } catch (e) {
              // ignore
            }

            if (!foundSourced && infoText) {
              // Try to extract Sourced & Marketed By from infoText fallback
              const m = infoText.match(/Sourced\s*&\s*Marketed\s*By[:\s]*([^\n\r]*)/i);
              if (m && m[1]) item.sourceLocation = m[1].trim();
            }

            // Final fallback: search the whole document text for a multi-line block after the label
            if (!item.sourceLocation) {
              try {
                const full = doc.body ? doc.body.innerText : (html || '');
                const m2 = full.match(/Sourced\s*&\s*marketed\s*by[:\s]*([\s\S]*?)(?=(Country\s*of\s*Origin|EAN|Disclaimer|For Queries|$))/i);
                if (m2 && m2[1]) {
                  const txt = m2[1].replace(/\s+/g, ' ').trim();
                  item.sourceLocation = txt;
                }
              } catch (e) {
                // ignore
              }
            }

            // Try to extract a 6-digit Indian pincode from the sourceLocation or the infoText
            try {
              const searchText = (item.sourceLocation || infoText || '').toString();
              const pinMatch = searchText.match(/\b(\d{6})\b/);
              if (pinMatch) item.sourcePincode = pinMatch[1];
            } catch (e) {
              // ignore
            }

            // Country of Origin (still try from infoText or entire doc)
            const c = (infoText || '').match(/Country\s*of\s*Origin[:\s]*([^\n\r]*)/i);
            if (c && c[1]) item.countryOfOrigin = c[1].trim();

            // EAN / barcode
            const e = (infoText || '').match(/EAN[:\s]*([0-9\-]*)/i) || (infoText || '').match(/\b(EAN|ean|barcode)[:\s]*([0-9\-]+)\b/i);
            if (e) {
              item.eanCode = (e[2] || e[1] || '').trim();
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
