/**
 * ShopInBitcoin Popup Script
 * Shows current BTC rate via service worker
 */

const rateElement = document.getElementById("rate");
const updatedElement = document.getElementById("updated");
const affiliateLink = document.getElementById("affiliateLink");
const affiliateDisclosure = document.querySelector(".affiliate-disclosure");
const extensionToggle = document.getElementById("extensionToggle");
const copyButton = document.getElementById("copyButton");
const bitcoinAddress = document.getElementById("bitcoinAddress");

/**
 * Build affiliate link from current Amazon page
 * @returns {string|null} Affiliate URL or null if no affiliate tag configured
 */
async function getAffiliateLink() {
  try {
    // Get the currently active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return null;

    const tabUrl = tabs[0].url;

    // Check if this is an Amazon URL
    if (!tabUrl || !tabUrl.includes("amazon.")) return null;

    // Detect locale from hostname
    let locale = 'com';
    if (tabUrl.includes("amazon.co.uk")) locale = 'uk';
    else if (tabUrl.includes("amazon.de")) locale = 'de';
    else if (tabUrl.includes("amazon.fr")) locale = 'fr';
    else if (tabUrl.includes("amazon.es")) locale = 'es';
    else if (tabUrl.includes("amazon.it")) locale = 'it';
    else if (tabUrl.includes("amazon.ca")) locale = 'ca';
    else if (tabUrl.includes("amazon.com.au")) locale = 'au';
    else if (tabUrl.includes("amazon.jp")) locale = 'jp';
    else if (tabUrl.includes("amazon.in")) locale = 'in';

    // Get config for locale
    const config = LOCALE_CONFIG[locale];
    if (!config || !config.affiliateTag) return null;

    // Build affiliate URL by adding tag parameter
    const url = new URL(tabUrl);
    url.searchParams.set("tag", config.affiliateTag);
    return url.toString();
  } catch (error) {
    console.error("[ShopInBitcoin Popup] Error building affiliate link:", error);
    return null;
  }
}

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
 * Setup affiliate link if available for current page
 */
async function setupAffiliateLink() {
  const link = await getAffiliateLink();

  if (link) {
    affiliateLink.href = link;
    affiliateLink.style.display = "block";
    affiliateDisclosure.style.display = "block";
  } else {
    affiliateLink.style.display = "none";
    affiliateDisclosure.style.display = "none";
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

// Setup affiliate link if available
setupAffiliateLink();

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
