import { useState, useEffect } from 'react';

function Popup() {
  const [cartData, setCartData] = useState(null);
  const [pincodeInput, setPincodeInput] = useState('');
  const [savedPincode, setSavedPincode] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Debug effect to log cartData changes
  useEffect(() => {
    console.log('cartData updated:', cartData);
  }, [cartData]);

  // Keep a reference to the runtime listener so we can remove it on unmount
  useEffect(() => {
    const onMessage = (message, sender, sendResponse) => {
      console.log('Message received in React:', message);
      if (message.type === 'CART_DETECTED') {
        setCartData(message.data);
        setIsActive(true);
        chrome.action.openPopup();
      }
      if (message.type === 'RECALCULATED_ITEMS') {
        // backend returned recalculation results
        try {
          const d = message.data || {};
          console.log('Recalculated data received:', d); // Debug log
          // If backend returned augmented items, map them into cartData
          if (d.results && d.results.length > 0) {
            setCartData(prevCartData => {
              if (!prevCartData) return prevCartData;
              
              // Create a map of results by name for easier lookup
              const resultsMap = {};
              d.results.forEach(result => {
                if (result.name) {
                  resultsMap[result.name] = result;
                }
              });
              
              console.log('Results map:', resultsMap); // Debug log
              console.log('Cart items:', prevCartData.items); // Debug log
              
              const updatedItems = (prevCartData.items || []).map(item => {
                // Log the item name we're looking for
                console.log('Looking for item:', item.name);
                
                // Look for exact match first
                let found = resultsMap[item.name];
                console.log('Exact match result:', found);
                
                // If no exact match, try partial match
                if (!found) {
                  const itemNames = Object.keys(resultsMap);
                  console.log('Available result names:', itemNames);
                  found = itemNames.find(name => {
                    const isMatch = item.name.includes(name) || name.includes(item.name);
                    console.log(`Checking '${name}' against '${item.name}': ${isMatch}`);
                    return isMatch;
                  });
                  if (found) {
                    found = resultsMap[found];
                    console.log('Partial match found:', found);
                  }
                }
                
                console.log('Processing item:', item.name, 'Found result:', found); // Debug log
                
                if (found) {
                  return { 
                    ...item, 
                    distance_km: found.distance_km,
                    carbon_footprint: found.carbon_footprint,
                    estimatedCarbon: found.carbon_footprint || item.estimatedCarbon,
                    sourcePincode: found.sourcePincode || item.sourcePincode,
                    userPincode: found.userPincode || item.userPincode
                  };
                }
                return item;
              });
              
              console.log('Updated items:', updatedItems); // Debug log
              return { ...prevCartData, items: updatedItems };
            });
          }
        } catch (e) {
          console.error('Error processing RECALCULATED_ITEMS:', e);
        }
        return false;
      }
      return false;
    };

    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      try { chrome.runtime.onMessage.removeListener(onMessage); } catch (e) { /* ignore */ }
    };
  }, []);

  // On first load, check current tab for cart data
  useEffect(() => { checkCurrentTab(); }, []);

  const checkCurrentTab = async () => {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check for both BigBasket and Zepto
    if (tab.url.includes('bigbasket.com') || tab.url.includes('zepto.com')) {
      setIsActive(true);
      
      // Request current cart data
        chrome.tabs.sendMessage(tab.id, { action: 'SCAN_CART' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('SCAN_CART sendMessage error:', chrome.runtime.lastError.message);
            return;
          }
          if (response?.success) {
            setCartData({
              site: response.site,
              items: response.items
            });
          }
        });
    }
  };

  const scanNow = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    setIsScanning(true);
    chrome.tabs.sendMessage(tab.id, { action: 'SCAN_CART' }, (response) => {
          try {
            if (chrome.runtime.lastError) {
              console.warn('SCAN_CART sendMessage error:', chrome.runtime.lastError.message);
              return;
            }
            if (response?.success) {
              setCartData({ site: response.site, items: response.items });
              setIsActive(true);
            }
          } finally {
            // ensure spinner toggles off even if response is undefined
            setIsScanning(false);
          }
        });
  };

  const calculateCarbonFootprint = async () => {
    if (!savedPincode || !cartData?.items) return;
    
    setIsCalculating(true);
    try {
      chrome.runtime.sendMessage({ type: 'USER_PINCODE_SET', pincode: savedPincode, items: cartData.items || [] }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending USER_PINCODE_SET message:', chrome.runtime.lastError.message);
        }
        // Always set calculating to false when we get a response
        setIsCalculating(false);
      });
    } catch (e) {
      console.error('Error calculating carbon footprint:', e);
      setIsCalculating(false);
    }
  };

  const commonPincodeSuggestions = [
    '560001', '110001', '400001', '700001', '600001'
  ];

  // Load saved user pincode on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem('carboncart_userPincode');
      if (v) {
        setSavedPincode(v);
        setPincodeInput(v);
      }
    } catch (e) {}
  }, []);

  const saveUserPincode = (value) => {
    const pin = (value || pincodeInput || '').trim();
    if (!pin) return;
    try {
      localStorage.setItem('carboncart_userPincode', pin);
    } catch (e) {}
    setSavedPincode(pin);
    setPincodeInput(pin);
  };

  const calculateCarbon = (items) => {
    const total = items.reduce((total, item) => total + (item.carbon_footprint || item.estimatedCarbon || 0), 0);
    console.log('Calculating total carbon:', total, 'from items:', items); // Debug log
    return total;
  };

  const calculateTransportationCarbon = (items) => {
    // Calculate only transportation carbon footprint based on distance
    // Using 0.1 kg CO2 per km as a standard transportation rate
    const transportTotal = items.reduce((total, item) => {
      if (item.distance_km && item.distance_km > 0) {
        // Transportation: 0.1 kg CO2 per km (approximate)
        const transportEmissions = item.distance_km * 0.1;
        return total + transportEmissions;
      }
      return total;
    }, 0);
    console.log('Calculating transportation carbon:', transportTotal, 'from items:', items); // Debug log
    return transportTotal;
  };

  const getEcoSuggestions = (items) => {
    const highCarbonItems = items.filter(item => (item.carbon_footprint || item.estimatedCarbon || 0) > 2);
    
    if (highCarbonItems.length > 0) {
      return `Try switching ${highCarbonItems.map(item => item.name).join(', ')} for lower-carbon alternatives`;
    }
    
    return "Great job! Your cart has a relatively low carbon footprint.";
  };

  if (!isActive) {
    return (
      <div className="p-4 text-center w-80">
        <h2 className="text-lg font-bold text-green-700">🌱 CarbonCart</h2>
        <p className="text-sm text-gray-500 mt-2">
          Visit BigBasket to analyze your cart's carbon footprint
        </p>
      </div>
    );
  }

  const totalCarbon = calculateCarbon(cartData?.items || []);
  
  // Calculate carbon equivalent for better understanding
  const equivalentText = totalCarbon > 10 
    ? `Equivalent to driving ${(totalCarbon * 0.4).toFixed(1)} km by car`
    : `Equivalent to charging ${Math.round(totalCarbon * 120)} smartphones`;

  return (
    <div className="w-80 p-4">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-green-700">🌱 CarbonCart</h1>
          <p className="text-sm text-gray-600">Shopping on {cartData?.site}</p>
        </div>
        <div>
          <button
            onClick={scanNow}
            disabled={isScanning}
            className={`px-3 py-1 text-xs font-medium rounded ${isScanning ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
            {isScanning ? 'Refreshing…' : 'Refresh ⟳'}
          </button>
        </div>
      </header>

      {/* Global user pincode input (one-time) */}
      <div className="mb-3 flex items-center space-x-2">
        <input
          list="global-pin-suggestions"
          value={pincodeInput}
          onChange={(e) => setPincodeInput(e.target.value)}
          placeholder="Enter your pincode (used for all items)"
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <datalist id="global-pin-suggestions">
          {commonPincodeSuggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
        <button
          onClick={() => saveUserPincode()}
          disabled={!pincodeInput || savedPincode === pincodeInput}
          className={`px-3 py-1 text-xs rounded ${(savedPincode === pincodeInput) ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white'}`}>
          {(savedPincode === pincodeInput) ? 'Saved' : 'Save Pincode'}
        </button>
      </div>

      {/* Calculate Carbon Footprint Button */}
      <div className="mb-3">
        <button
          onClick={calculateCarbonFootprint}
          disabled={!savedPincode || isCalculating || !cartData?.items || cartData.items.length === 0}
          className={`w-full px-3 py-2 text-sm font-medium rounded ${(!savedPincode || isCalculating || !cartData?.items || cartData.items.length === 0) ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {isCalculating ? 'Calculating...' : 'Calculate Carbon Footprint'}
        </button>
      </div>

      {/* Transportation Carbon Footprint Section */}
      {cartData && cartData.items && cartData.items.some(item => item.carbon_footprint !== undefined) && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 text-sm mb-2">🚚 Transportation Carbon Footprint</h3>
          <div className="text-2xl font-bold text-blue-700">
            {calculateTransportationCarbon(cartData.items).toFixed(1)} kg CO₂
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Total carbon footprint from transporting all items
          </p>
        </div>
      )}

      {cartData && (
        <div className="space-y-3">
          {/* Carbon Footprint Card */}
          <div className={`p-3 rounded-lg text-center border ${
            totalCarbon > 15 ? 'bg-red-50 border-red-200' : 
            totalCarbon > 8 ? 'bg-yellow-50 border-yellow-200' : 
            'bg-green-50 border-green-200'
          }`}>
            <h3 className="font-semibold text-gray-700">Carbon Footprint</h3>
            <p className={`text-2xl font-bold mt-1 ${
              totalCarbon > 15 ? 'text-red-800' : 
              totalCarbon > 8 ? 'text-yellow-800' : 
              'text-green-800'
            }`}>
              {totalCarbon.toFixed(1)} kg CO₂
            </p>
            <p className="text-xs text-gray-600 mt-1">{equivalentText}</p>
          </div>

          {/* Cart Items */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-800">🛒 Cart Items</h4>
              <div className="text-xs text-gray-500">{(cartData.items || []).length} items</div>
            </div>

            {(!cartData.items || cartData.items.length === 0) ? (
              <div className="text-center py-6 text-sm text-gray-600">
                No items detected on this page.
                <div className="mt-3">
                  <button onClick={scanNow} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Scan Cart</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cartData.items.map((item, index) => {
                  // Create a unique key based on item properties to force re-render
                  const itemKey = `${item.name}-${item.carbon_footprint || 0}-${item.distance_km || 0}`;
                  console.log('Rendering item with key:', itemKey, 'Item:', item); // Debug log
                  return (
                    <div key={itemKey} className="flex items-start space-x-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
                      {item.imageUrl && (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <span className="font-medium">₹{item.price}</span>
                          <span className="mx-1">•</span>
                          <span>{item.quantity}</span>
                        </div>
                        <div className="mt-1 flex items-center">
                          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            (item.carbon_footprint || item.estimatedCarbon || 0) > 2 ? 'bg-red-100 text-red-700' : 
                            (item.carbon_footprint || item.estimatedCarbon || 0) > 1 ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-green-100 text-green-700'
                          }`}>
                            {(item.carbon_footprint || item.estimatedCarbon || 0).toFixed(1)} kg CO₂
                          </div>
                        </div>
                        {/* Source information (scraped) */}
                        <div className="mt-2 text-xs text-gray-600">
                          <div>Source: <span className="font-medium text-gray-800">{item.sourceLocation || 'Not available'}</span></div>
                          {item.countryOfOrigin && <div>Origin: <span className="font-medium">{item.countryOfOrigin}</span></div>}
                          {item.eanCode && <div>EAN: <span className="font-mono">{item.eanCode}</span></div>}
                          {item.sourcePincode && <div>Seller Pincode: <span className="font-medium">{item.sourcePincode}</span></div>}
                          {item.distance_km && (
                            <div>Distance: <span className="font-medium">{item.distance_km} km</span></div>
                          )}
                          {item.carbon_footprint && (
                            <div>Carbon Footprint: <span className="font-medium">{item.carbon_footprint.toFixed(2)} kg CO₂</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700 mb-2">💡 Eco Tips</h4>
            <p className="text-sm text-blue-800 mb-2">{getEcoSuggestions(cartData.items)}</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Choose local and seasonal produce</li>
              <li>• Opt for plant-based proteins when possible</li>
              <li>• Buy in bulk to reduce packaging waste</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Popup;