/**
 * ShopInBitcoin Popup Script
 * Shows current BTC rate via service worker
 */

const rateElement = document.getElementById("rate");
const updatedElement = document.getElementById("updated");
const extensionToggle = document.getElementById("extensionToggle");
const copyButton = document.getElementById("copyButton");
const bitcoinAddress = document.getElementById("bitcoinAddress");

/**
 * Fetch current BTC rate via service worker
 * Uses USD pair by default for popup display
 */
async function updateRate() {
  try {
    // Always show USD rate in popup
    const rate = await new Promise((resolve) => {
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error("[ShopInBitcoin Popup] Service worker request timed out");
        resolve(null);
      }, 5000); // 5 second timeout

      try {
        chrome.runtime.sendMessage(
          {
            action: "getBtcRate",
            krakenPair: "XBTUSD",
            krakenKey: "XXBTZUSD",
          },
          (response) => {
            clearTimeout(timeout);

            if (response?.rate) {
              resolve(response.rate);
            } else {
              console.error("[ShopInBitcoin Popup] Failed to fetch rate:", response?.error);
              resolve(null);
            }
          }
        );
      } catch (error) {
        clearTimeout(timeout);
        console.error("[ShopInBitcoin Popup] Extension context error:", error);
        resolve(null);
      }
    });

    if (!rate) {
      throw new Error("Service worker returned no rate");
    }

    const now = new Date();

    // Update rate display
    rateElement.innerHTML = `$${rate.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    // Update timestamp
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    updatedElement.textContent = `Updated: ${timeString}`;
  } catch (error) {
    console.error("[ShopInBitcoin Popup] Error fetching rate:", error);
    rateElement.innerHTML = '<span class="error">Failed to load</span>';
    updatedElement.textContent = "Check your internet connection";
  }
}

/**
 * Load extension enabled state from chrome storage
 */
async function loadExtensionState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      const enabled = result.extensionEnabled !== false;
      extensionToggle.checked = enabled;
      resolve(enabled);
    });
  });
}

/**
 * Save extension enabled state
 */
async function saveExtensionState(enabled) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ extensionEnabled: enabled }, resolve);
  });
}

/**
 * Copy bitcoin address to clipboard
 */
function copyToClipboard() {
  const text = bitcoinAddress.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyButton.textContent;
    copyButton.textContent = "Copied!";
    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Update rate immediately on open
updateRate();

// Load extension state
loadExtensionState();

// Add QR code if available
if (typeof QR_CODE_PNG !== 'undefined') {
  const qrContainer = document.getElementById('qrCodeContainer');
  const qrImg = document.createElement('img');
  qrImg.src = QR_CODE_PNG;
  qrImg.alt = 'Bitcoin Address QR Code';
  qrImg.style.maxWidth = '150px';
  qrImg.style.borderRadius = '4px';
  qrContainer.appendChild(qrImg);
}

// Handle extension toggle
extensionToggle.addEventListener('change', async (e) => {
  await saveExtensionState(e.target.checked);
  console.log('[ShopInBitcoin] Extension toggled:', e.target.checked);
});

// Handle copy button
copyButton.addEventListener('click', copyToClipboard);
bitcoinAddress.addEventListener('click', copyToClipboard);

// Update rate every 60 seconds while popup is open
const interval = setInterval(updateRate, 60000);

// Clear interval when popup closes
window.addEventListener("beforeunload", () => {
  clearInterval(interval);
});
