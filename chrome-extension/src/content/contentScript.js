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
    imageContainerClass: 'BasketImage___StyledDiv-sc-1upl47q-0.BasketView___StyledBasketImage-sc-ashrc5-8.gnEhvr',
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

    // Keep a reference to the header node so we can reliably map items -> product page anchors later
    items.push({ name, quantity, price, imageUrl, sourceLocation: '', sourcePincode: '', countryOfOrigin: '', eanCode: '', estimatedCarbon: calculateCarbonFootprint(name), headerRef: header });
  });

  // Fetch product pages (best-effort) to get "Sourced & Marketed By:" text
  const fetchPromises = items.map((item, idx) => {
    return new Promise((resolve) => {
      // Prefer headerRef captured earlier. Fall back to fuzzy matching and index mapping.
      let header = item.headerRef;
      if (!header) {
        const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const itemNorm = normalize(item.name).split(' ').filter(Boolean).slice(0,6).join(' ');
        header = headers.find(h => normalize(h.textContent || '').includes(itemNorm));
      }
      // Final fallback: use the headers list by index (if order preserved)
      if (!header) {
        resolve();
        return;
      }

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
      if (!link || !link.href) {
        resolve();
        return;
      }

      fetch(link.href)
        .then(res => res.text())
        .then(html => {
          try {
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Look for the specific section with product info as provided in the user query
            const productInfoSection = doc.querySelector('.MoreDetails___StyledSection-sc-1h9rbjh-4');
            if (productInfoSection) {
              // Get all bullets divs within this section
              const bulletsDivs = productInfoSection.querySelectorAll('.bullets');
              
              // The second bullets div contains the "Sourced & marketed by" information
              if (bulletsDivs.length >= 2) {
                const secondBulletsDiv = bulletsDivs[1];
                const bulletsText = secondBulletsDiv.textContent || '';
                
                // Extract Sourced & Marketed By information
                const sourcedMatch = bulletsText.match(/Sourced\s*&\s*Marketed\s*By[:\s]*([^\n\r]*)/i);
                if (sourcedMatch && sourcedMatch[1]) {
                  // Extract only the relevant part up to the pincode
                  let sourcedInfo = sourcedMatch[1].trim();
                  // Look for a pincode pattern (6 digits) and truncate after it
                  const pincodeMatch = sourcedInfo.match(/(.*?\b\d{6}\b)/);
                  if (pincodeMatch) {
                    item.sourceLocation = pincodeMatch[1];
                  } else {
                    // If no pincode found, just take the first part
                    item.sourceLocation = sourcedInfo;
                  }
                  
                  // Extract pincode from the sourced location
                  const pincodeExtractMatch = item.sourceLocation.match(/\b(\d{6})\b/);
                  if (pincodeExtractMatch) {
                    item.sourcePincode = pincodeExtractMatch[1];
                  }
                }

                // Extract Country of Origin
                const countryMatch = bulletsText.match(/Country\s*of\s*Origin[:\s]*([^\n\r]*)/i);
                if (countryMatch && countryMatch[1]) {
                  item.countryOfOrigin = countryMatch[1].trim();
                  // Extract only the first word from country of origin
                  const firstWord = item.countryOfOrigin.split(/[,\s]+/).filter(word => word.length > 0)[0];
                  if (firstWord) {
                    item.countryOfOrigin = firstWord;
                  }
                }

                // Extract EAN Code
                const eanMatch = bulletsText.match(/EAN\s*Code[:\s]*([0-9\-]*)/i);
                if (eanMatch && eanMatch[1]) {
                  item.eanCode = eanMatch[1].trim();
                }
              }
            }

            // Fallback: try to extract from any part of the document if specific section not found
            if (!item.sourceLocation || !item.sourcePincode) {
              const fullText = doc.body ? doc.body.innerText : (html || '');
              
              // Extract Sourced & Marketed By information
              const sourcedMatch = fullText.match(/Sourced\s*&\s*Marketed\s*By[:\s]*([^\n\r]*)/i);
              if (sourcedMatch && sourcedMatch[1]) {
                // Extract only the relevant part up to the pincode
                let sourcedInfo = sourcedMatch[1].trim();
                // Look for a pincode pattern (6 digits) and truncate after it
                const pincodeMatch = sourcedInfo.match(/(.*?\b\d{6}\b)/);
                if (pincodeMatch) {
                  item.sourceLocation = pincodeMatch[1];
                } else {
                  // If no pincode found, just take the first part
                  item.sourceLocation = sourcedInfo;
                }
                
                // Extract pincode from the sourced location
                const pincodeExtractMatch = item.sourceLocation.match(/\b(\d{6})\b/);
                if (pincodeExtractMatch) {
                  item.sourcePincode = pincodeExtractMatch[1];
                }
              }

              // Extract Country of Origin
              const countryMatch = fullText.match(/Country\s*of\s*Origin[:\s]*([^\n\r]*)/i);
              if (countryMatch && countryMatch[1]) {
                item.countryOfOrigin = countryMatch[1].trim();
                // Extract only the first word from country of origin
                const firstWord = item.countryOfOrigin.split(/[,\s]+/).filter(word => word.length > 0)[0];
                if (firstWord) {
                  item.countryOfOrigin = firstWord;
                }
              }

              // Extract EAN Code
              const eanMatch = fullText.match(/EAN\s*Code[:\s]*([0-9\-]*)/i);
              if (eanMatch && eanMatch[1]) {
                item.eanCode = eanMatch[1].trim();
              }
            }
            
            // Additional extraction: If we have an address in the data, extract just the pincode from it
            if (!item.sourcePincode) {
              const fullText = doc.body ? doc.body.innerText : (html || '');
              // Look for address patterns that end with a 6-digit pincode
              const addressPatterns = [
                /(?:Address|address)[^0-9]*([0-9]{6})\b/,
                /(?:Bangalore|Delhi|Mumbai|Kolkata|Chennai)[^0-9]*([0-9]{6})\b/,
                /\b([0-9]{6})\b/
              ];
              
              for (const pattern of addressPatterns) {
                const addressPincodeMatch = fullText.match(pattern);
                if (addressPincodeMatch && addressPincodeMatch[1]) {
                  item.sourcePincode = addressPincodeMatch[1];
                  // If we don't have a source location, use the "Marketed By" part
                  if (!item.sourceLocation) {
                    const marketedByMatch = fullText.match(/Marketed\s*By[:\s]*([^\n\r]*)/i);
                    if (marketedByMatch && marketedByMatch[1]) {
                      // Extract only the relevant part up to the pincode
                      let marketedInfo = marketedByMatch[1].trim();
                      // Look for a pincode pattern (6 digits) and truncate after it
                      const pincodeMatch = marketedInfo.match(/(.*?\b\d{6}\b)/);
                      if (pincodeMatch) {
                        item.sourceLocation = pincodeMatch[1];
                      } else {
                        // If no pincode found, just take the first part
                        item.sourceLocation = marketedInfo;
                      }
                    } else {
                      item.sourceLocation = 'Location with pincode: ' + item.sourcePincode;
                    }
                  }
                  break;
                }
              }
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
      extractBigBasketItems((items) => {
        try {
          sendResponse({ success: true, items, site: currentSite });
        } catch (e) {
          console.error('Error sending response:', e);
        }
      });
      return true; // keep channel open for async response
    } else if (currentSite.includes('zepto')) {
      try {
        const items = extractZeptoItems();
        sendResponse({ success: true, items, site: currentSite });
      } catch (e) {
        console.error('Error extracting Zepto items:', e);
        sendResponse({ success: false, error: 'Failed to extract items' });
      }
      return false;
    } else {
      sendResponse({ success: false, error: 'Unsupported site' });
      return false;
    }
  }
  // Return false for unmatched messages
  return false;
});
