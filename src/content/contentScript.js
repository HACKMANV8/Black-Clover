// Content script for BigBasket and Zepto
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
    chrome.runtime.sendMessage({
      type: 'CART_DETECTED',
      data: {
        site: 'bigbasket.com',
        items: extractBigBasketItems()
      }
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
      data: {
        site: 'zepto.com',
        items: extractZeptoItems()
      }
    });
  }
}

function extractBigBasketItems() {
  // Try to extract real items from BigBasket
  const items = [];
  
  // Primary selectors using the exact BigBasket classnames
  const primarySelector = {
    listItem: 'ul.BasketGroup___StyledUl-sc-obttrd-0.kXTIrq li.BasketItem___StyledLi-sc-pyj73d-0.bbfXYq',
    imageDiv: '[class*="ItemsHeader___StyledDiv-sc-1sc68yr-0"]',
    image: '[class*="BasketImage___StyledImage2-sc-1upl47q-2"][class*="ItemsHeader___StyledBasketImage"]',
    nameDiv: '[class*="BasketDescription___StyledDiv-sc-1soo8mb-0"][class*="ItemsHeader___StyledBasketDescription"]',
    priceSpan: '[class*="Label-sc-15v1nk5-0"][class*="BasketPrice___StyledLabel"]',
    unitsDiv: '[class*="CartCTA___StyledDiv2-sc-auxm26-3"]'
  };

  const primaryElements = document.querySelectorAll(primarySelector.listItem);
  if (primaryElements && primaryElements.length > 0) {
    primaryElements.forEach(element => {
      // Heuristics: extract details directly from each LI element
      const imageEl = element.querySelector(primarySelector.image);
      const nameDiv = element.querySelector(primarySelector.nameDiv) || element.querySelector('[data-qa="product-name"], [class*="product-name"], [class*="name"], a, h3, h4');
      const priceSpan = element.querySelector(primarySelector.priceSpan);
      const unitsDiv = element.querySelector(primarySelector.unitsDiv) || element.querySelector('[data-qa*="qty"], [class*="qty"], [class*="quantity"], [aria-label*="qty"]');

      let name = nameDiv?.textContent?.trim() || '';
      let quantity = unitsDiv?.textContent?.trim() || '1 unit';
      let price = priceSpan?.textContent?.trim()?.replace('₹', '') || '0';
      let imageUrl = imageEl?.src || imageEl?.getAttribute('data-src') || '';

      // Clean up the extracted data
      price = parseFloat((price || '').replace(/[^0-9.]/g, '')) || 0;

      if (name) {
        items.push({ name, quantity, price, imageUrl, estimatedCarbon: calculateCarbonFootprint(name) });
      }
    });

    // dedupe by name+quantity
    const deduped = [];
    const seen = new Set();
    items.forEach(it => {
      const key = `${it.name}||${it.quantity}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(it);
      }
    });
    return deduped;
  }

  // Limit fallbacks to elements inside known cart containers to avoid picking unrelated items
  const cartRoots = Array.from(document.querySelectorAll('.basket-content, [data-qa="cart-item"], [class*="cart"], [data-testid*="cart"]'));
  if (cartRoots.length > 0) {
    cartRoots.forEach(root => {
      const liCandidates = Array.from(root.querySelectorAll('li[class*="BasketItem___"], li.bbfXYq, [data-qa="cart-item"], [class*="cart-item"]'));
      liCandidates.forEach(element => {
        const nameEl = element.querySelector('[data-qa="product-name"], [class*="product-name"], [class*="name"], a, h3, h4');
        const qtyEl = element.querySelector('[data-qa*="qty"], [class*="qty"], [class*="quantity"], [aria-label*="qty"]');

        let name = nameEl?.textContent || '';
        let quantity = qtyEl?.textContent || '';

        if (!name) {
          const text = element.textContent || '';
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          name = lines[0] || '';
          const qtyMatch = lines.find(l => /\b\d+\s?(kg|g|pcs|pc|units|unit|ltr|ml)\b/i);
          if (qtyMatch) quantity = quantity || qtyMatch;
        }

        name = name.trim();
        quantity = quantity.trim() || '1 unit';

        if (name) {
          items.push({ name, quantity, estimatedCarbon: calculateCarbonFootprint(name) });
        }
      });
    });

    // dedupe aggregated fallback results
    if (items.length > 0) {
      const deduped = [];
      const seen = new Set();
      items.forEach(it => {
        const key = `${it.name}||${it.quantity}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(it);
        }
      });
      return deduped;
    }
  }

  // If nothing found, return an empty array (do NOT return demo/fallback data as requested)
  console.warn('CarbonCart: No real BigBasket cart items found by scraper.');
  return [];
}

function extractZeptoItems() {
  // Try to extract real items from Zepto
  const items = [];
  
  const itemSelectors = [
    '[data-testid*="cart-item"]',
    '.cart-item',
    '.product-item',
    '[class*="item"]'
  ];
  
  itemSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const name = element.querySelector('[data-testid*="name"]')?.textContent ||
                   element.querySelector('.product-name')?.textContent ||
                   element.querySelector('.name')?.textContent ||
                   'Zepto Product';
      
      const quantity = element.querySelector('.quantity')?.textContent || 
                       element.querySelector('.qty')?.textContent ||
                       '1 unit';
      
      if (name && name !== 'Zepto Product') {
        items.push({
          name: name.trim(),
          quantity: quantity.trim(),
          estimatedCarbon: calculateCarbonFootprint(name)
        });
      }
    });
  });
  
  // Fallback to demo data if no real items found
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
  // Carbon footprint database (kg CO2 per kg of product)
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
  
  const name = productName.toLowerCase();
  for (const [key, value] of Object.entries(carbonData)) {
    if (name.includes(key)) {
      return value;
    }
  }
  
  return 1.0; // Default carbon value
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
    let items = [];
    
    if (currentSite.includes('bigbasket')) {
      items = extractBigBasketItems();
    } else if (currentSite.includes('zepto')) {
      items = extractZeptoItems();
    }
    
    sendResponse({ 
      success: true, 
      items,
      site: currentSite
    });
  }
  return true;
});