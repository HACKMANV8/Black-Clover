import { useState, useEffect } from 'react';

function Popup() {
  const [cartData, setCartData] = useState(null);
  const [isActive, setIsActive] = useState(false);

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
    chrome.tabs.sendMessage(tab.id, { action: 'SCAN_CART' }, (response) => {
      if (response?.success) {
        setCartData({ site: response.site, items: response.items });
        setIsActive(true);
      }
    });
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
      <header className="text-center mb-4">
        <h1 className="text-xl font-bold text-green-700">🌱 CarbonCart</h1>
        <p className="text-sm text-gray-600">Shopping on {cartData?.site}</p>
      </header>

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
              <div className="space-y-2">
                {cartData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${
                        item.estimatedCarbon > 2 ? 'text-red-600' : 
                        item.estimatedCarbon > 1 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>{(item.estimatedCarbon || 0).toFixed(2)} kg</div>
                      <div className="text-xs text-gray-400">per unit</div>
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