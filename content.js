/**
 * ShopInBitcoin - Amazon to Bitcoin
 * Content script that injects Bitcoin prices into Amazon product pages
 */

// Inject styles into page
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .atob-inline-price {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      display: block;
      font-size: 13px;
      color: #555;
      margin-top: 4px;
    }

    .atob-inline-price a {
      color: #f7931a;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }

    .atob-inline-price a:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
}

// Inject styles immediately
injectStyles();

/**
 * Convert local currency to satoshis
 * @param {number} localAmount - Price in local currency
 * @param {number} btcRate - BTC rate in local currency
 * @returns {number|null} Satoshis or null if conversion not possible
 */
function toSats(localAmount, btcRate) {
  if (!btcRate || !localAmount) return null;
  const btcAmount = localAmount / btcRate;
  return Math.round(btcAmount * 100000000);
}

/**
 * Format satoshis for display with intelligent scaling
 * @param {number} sats - Amount in satoshis
 * @returns {string} Formatted satoshis (e.g., "1,234", "5.67M")
 */
function formatSats(sats) {
  if (!sats || sats === 0) return "—";

  const BTC_IN_SATS = 100000000;

  // 1 BTC or more: show as "X" (no unit)
  if (sats >= BTC_IN_SATS) {
    const btc = sats / BTC_IN_SATS;
    return btc === Math.round(btc)
      ? Math.round(btc).toString()
      : btc.toFixed(2);
  }

  // Under 1,000,000: show full number with comma formatting
  if (sats < 1000000) {
    return `${Math.round(sats).toLocaleString("en-US")}`;
  }

  // 1,000,000 - 99,999,999: show as "X.XXM"
  const m = sats / 1000000;
  return `${m.toFixed(2)}M`;
}

/**
 * Fetch BTC rate via service worker to bypass CORS
 * @returns {Promise<number|null>} Exchange rate or null on error
 */
async function getBtcRate() {
  return new Promise((resolve) => {
    const config = getLocaleConfig();

    if (!config) {
      console.error("[AtoB] No configuration for this locale");
      resolve(null);
      return;
    }

    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error("[AtoB] Service worker request timed out");
      resolve(null);
    }, 5000); // 5 second timeout

    chrome.runtime.sendMessage(
      {
        action: "getBtcRate",
        krakenPair: config.krakenPair,
        krakenKey: config.krakenKey,
      },
      (response) => {
        clearTimeout(timeout);

        if (response?.rate) {
          resolve(response.rate);
        } else {
          console.error("[AtoB] Failed to fetch BTC rate:", response?.error);
          resolve(null);
        }
      }
    );
  });
}

/**
 * Extract product price from Amazon page DOM
 * @returns {Object|null} Object with {price, element} or null if not found
 */
function getAmazonPrice() {
  // Comprehensive selector list covering different Amazon layouts
  const selectors = [
    // Desktop product page - main price
    "span.a-price.a-text-price.a-size-medium.a-color-base",
    "span.a-price-whole",
    "span[data-a-color='price']",
    ".a-price-whole",
    // Alternative markup variations
    "span[data-a-price-whole]",
    ".a-price .a-price-whole",
    // Offer listings
    "span.a-color-price",
    // Any span with currency followed by number
    "span[data-a-size-base][data-a-color-base]",
  ];

  // Try each selector
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      // Skip hidden elements
      if (element.offsetHeight === 0 || element.offsetWidth === 0) continue;

      const text = element.textContent.trim();

      // Match currency symbol + number (allows for various formats)
      const match = text.match(
        /[^\d]*([0-9]{1,3}(?:[,. ][0-9]{3})*(?:[.,][0-9]{2})?)/
      );

      if (match && match[1]) {
        // Normalize: remove spaces, convert comma to period for parsing
        const normalized = match[1].replace(/[\s,]/g, "").replace(/^\./, "");
        const price = parseFloat(normalized);

        // Sanity check: price should be reasonable
        if (price > 0.01 && price < 100000) {
          console.log("[AtoB] Found price:", price, "in element:", element);
          return { price, element };
        }
      }
    }
  }

  // Debug: log what we're seeing
  console.log(
    "[AtoB] Price search - total elements checked:",
    document.querySelectorAll("span").length
  );
  console.log(
    "[AtoB] Visible spans:",
    document.querySelectorAll("span:not([style*='display: none'])").length
  );

  return null;
}

// Get ASIN from URL or page data
function getASIN() {
  // Extract ASIN from URL: /dp/B00XXXXXX or /gp/product/B00XXXXXX
  const match = window.location.pathname.match(
    /(?:dp|product)[/]+([A-Z0-9]{10})/
  );
  if (match && match[1]) return match[1];

  // Try to find ASIN in page data
  const asinElement = document.querySelector("[data-asin]");
  if (asinElement) {
    return asinElement.getAttribute("data-asin");
  }

  return null;
}

// Create inline Bitcoin price text
function createInlinePriceText(sats) {
  const div = document.createElement("div");
  div.className = "atob-inline-price";
  div.setAttribute("data-atob-price", "true");

  // Link to shopinbitcoin home page
  // TODO: Direct product links via ASIN once shopinbitcoin.com/home/[ASIN] is ready
  // const asin = getASIN();
  // const shopLink = asin
  //   ? `https://shopinbitcoin.com/home/${asin}`
  //   : 'https://shopinbitcoin.com/';
  const shopLink = "https://shopinbitcoin.com/";

  div.innerHTML = `${formatSats(
    sats
  )} SATS - <a href="${shopLink}" target="_blank">shopinbitcoin.com</a>`;
  return div;
}

// Keep track of processed price elements to avoid duplicates
const processedElements = new WeakSet();

// Main function - inject BTC price to page
async function injectBtcPrice() {
  try {
    // Get BTC rate
    const btcRate = await getBtcRate();
    if (!btcRate) {
      console.log("[AtoB] Could not fetch BTC rate");
      return;
    }

    // Get product price
    const priceData = getAmazonPrice();
    if (!priceData) {
      console.log("[AtoB] Could not find product price");
      return;
    }

    const { price: usdPrice, element: priceElement } = priceData;

    // Skip if we've already processed this element
    if (processedElements.has(priceElement)) {
      return;
    }
    processedElements.add(priceElement);

    // Get config for this locale
    const config = getLocaleConfig();
    if (!config) {
      console.log("[AtoB] Locale not supported (no Kraken API pair available)");
      return;
    }

    // Convert to sats
    const sats = toSats(usdPrice, btcRate);
    if (!sats) {
      console.log("[AtoB] Could not convert price to sats");
      return;
    }

    // Remove any existing price text we added next to this element
    const existingPrice = priceElement.parentElement?.querySelector(
      '[data-atob-price="true"]'
    );
    if (existingPrice) {
      existingPrice.remove();
    }

    // Create and insert inline price text
    const priceText = createInlinePriceText(sats);
    if (priceElement && priceElement.parentElement) {
      priceElement.parentElement.insertAdjacentElement("afterend", priceText);
    } else {
      document.body.insertAdjacentElement("afterbegin", priceText);
    }

    console.log("[AtoB] Bitcoin price injected:", formatSats(sats));
  } catch (error) {
    console.error("[AtoB] Error injecting Bitcoin price:", error);
  }
}

// Run on page load with error boundary
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      injectBtcPrice();
    } catch (error) {
      console.error("[AtoB] Fatal error during page load injection:", error);
    }
  });
} else {
  try {
    injectBtcPrice();
  } catch (error) {
    console.error("[AtoB] Fatal error during initial injection:", error);
  }
}

// Also listen for dynamic page changes (Amazon uses client-side routing)
try {
  const observer = new MutationObserver(() => {
    // Debounce to avoid running too many times
    clearTimeout(window.atobTimeout);
    window.atobTimeout = setTimeout(() => {
      try {
        injectBtcPrice();
      } catch (error) {
        console.error("[AtoB] Error during dynamic injection:", error);
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} catch (error) {
  console.error("[AtoB] Failed to set up MutationObserver:", error);
}
