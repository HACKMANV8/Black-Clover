// Background script: listens for user pincode set and forwards to backend for recalculation

const BACKEND_URL = 'http://localhost:5000/api/recalculate'; // change if your backend runs elsewhere

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'USER_PINCODE_SET') {
    const payload = { pincode: message.pincode, items: message.items || [] };
    
    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      // Send the response back to the popup first
      sendResponse({ success: true, data });
      
      // Then send recalculated items to all popup/content listeners
      // Use setTimeout to ensure the first response has been processed
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'RECALCULATED_ITEMS', data })
          .catch(err => console.error('Failed to send RECALCULATED_ITEMS message:', err));
      }, 0);
    })
    .catch(err => {
      console.error('Background: backend recalculation failed', err);
      sendResponse({ success: false, error: err && err.message });
    });

    // Indicate we will respond asynchronously
    return true;
  }

  return false;
});

// Add an empty listener to ensure the background script stays active
chrome.runtime.onStartup.addListener(() => {
  console.log('CarbonCart background script started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('CarbonCart background script installed');
});