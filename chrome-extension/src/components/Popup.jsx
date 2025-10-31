import { useState, useEffect } from 'react';

function Popup() {
  const [cartData, setCartData] = useState(null);
  const [pincode, setPincode] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Keep a reference to the runtime listener so we can remove it on unmount
  useEffect(() => {
    const onMessage = (message, sender, sendResponse) => {
      console.log('Message received in React:', message);
      if (message.type === 'CART_DETECTED') {
        setCartData(message.data);
        setIsActive(true);
        chrome.action.openPopup();
      }
      return true;
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

  const commonPincodeSuggestions = [
    '560001', '110001', '400001', '700001', '600001'
  ];

  // Load saved user pincode on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem('carboncart_userPincode');
      if (v) setPincode(v);
    } catch (e) {}
  }, []);

  const saveUserPincode = (value) => {
    const pin = (value || pincode || '').trim();
    if (!pin) return;
    try {
      localStorage.setItem('carboncart_userPincode', pin);
    } catch (e) {}
    setPincode(pin);
    // Send user pincode and current items to background for further processing (e.g., Gemini)
    try {
      chrome.runtime.sendMessage({ type: 'USER_PINCODE_SET', pincode: pin, items: cartData?.items || [] });
    } catch (e) {
      // ignore
    }
  };

  const calculateCarbon = (items) => {
    return items.reduce((total, item) => total + (item.estimatedCarbon || 0), 0);
  };

  const getEcoSuggestions = (items) => {
    const highCarbonItems = items.filter(item => item.estimatedCarbon > 2);
    
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
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Enter your pincode (used for all items)"
          className="flex-1 px-2 py-1 border rounded text-xs"
        />
        <datalist id="global-pin-suggestions">
          {commonPincodeSuggestions.map((s, i) => <option key={i} value={s} />)}
        </datalist>
        <button
          onClick={() => saveUserPincode()}
          disabled={!!pincode}
          className={`px-3 py-1 text-xs rounded ${pincode ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white'}`}>
          {pincode ? 'Saved' : 'Save Pincode'}
        </button>
      </div>

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
                {cartData.items.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
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
                          item.estimatedCarbon > 2 ? 'bg-red-100 text-red-700' : 
                          item.estimatedCarbon > 1 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {(item.estimatedCarbon || 0).toFixed(1)} kg CO₂
                        </div>
                      </div>
                      {/* Source information (scraped) */}
                      <div className="mt-2 text-xs text-gray-600">
                        <div>Source: <span className="font-medium text-gray-800">{item.sourceLocation || 'Not available'}</span></div>
                        {item.countryOfOrigin && <div>Origin: <span className="font-medium">{item.countryOfOrigin}</span></div>}
                        {item.eanCode && <div>EAN: <span className="font-mono">{item.eanCode}</span></div>}
                        {item.sourcePincode && <div>Seller Pincode: <span className="font-medium">{item.sourcePincode}</span></div>}
                        {item.sourcePincode && pincode && (
                          <div>Distance: <span className="font-medium">Calculating…</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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