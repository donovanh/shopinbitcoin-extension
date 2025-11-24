/**
 * ShopInBitcoin - Amazon to Bitcoin
 * Content script that injects Bitcoin prices into Amazon product pages
 */

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

    try {
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
    } catch (error) {
      clearTimeout(timeout);
      console.error("[AtoB] Extension context error:", error);
      resolve(null);
    }
  });
}

/**
 * Currency detection regex patterns
 * Matches: $12.34, €12.34, EUR 12.34, £12.34, etc.
 * Handles comma and period as decimal separators, handles whitespace variations
 */
const PRICE_PATTERNS = [
  // Symbol-based: $12.34, $12,34, € 12.34, etc. (with optional space)
  /[$€£¥₹]\s*([0-9]{1,3}(?:[,. ][0-9]{3})*(?:[.,][0-9]{2})?)/g,
  // Currency code at start: USD 12.34, EUR12.34, GBP 12,34, etc.
  /(USD|EUR|GBP|CAD|AUD|JPY|INR)\s*([0-9]{1,3}(?:[,. ][0-9]{3})*(?:[.,][0-9]{2})?)/gi,
  // Numbers with currency symbol after: 12.34$, 12.34€, 12,34 EUR, etc.
  /([0-9]{1,3}(?:[,. ][0-9]{3})*(?:[.,][0-9]{2})?)\s*[$€£¥₹]/g,
  // Numbers with currency code after: 12.34 USD, 12.34EUR, 12,34 GBP, etc.
  /([0-9]{1,3}(?:[,. ][0-9]{3})*(?:[.,][0-9]{2})?)\s*(USD|EUR|GBP|CAD|AUD|JPY|INR)/gi,
];

/**
 * Extract currency from price match
 * Handles: $12.34, 12.34$, USD 12.34, 12.34 USD, etc.
 */
function getCurrencyFromMatch(match) {
  if (!match) return null;

  // Check for currency symbol (anywhere in match)
  if (match.includes('$')) return '$';
  if (match.includes('€')) return '€';
  if (match.includes('£')) return '£';
  if (match.includes('¥')) return '¥';
  if (match.includes('₹')) return '₹';

  // Check for currency code (anywhere in match)
  const currencyMatch = match.match(/(USD|EUR|GBP|CAD|AUD|JPY|INR)/i);
  return currencyMatch ? currencyMatch[1].toUpperCase() : null;
}

/**
 * Map currency to BTC rate pair
 */
function getCurrencyConfig(currency) {
  const mappings = {
    '$': { config: 'USD', pairs: ['XBTUSD'], keys: ['XXBTZUSD'] },
    'USD': { config: 'USD', pairs: ['XBTUSD'], keys: ['XXBTZUSD'] },
    '€': { config: 'EUR', pairs: ['XBTEUR'], keys: ['XXBTZEUR'] },
    'EUR': { config: 'EUR', pairs: ['XBTEUR'], keys: ['XXBTZEUR'] },
    '£': { config: 'GBP', pairs: ['XBTGBP'], keys: ['XXBTZGBP'] },
    'GBP': { config: 'GBP', pairs: ['XBTGBP'], keys: ['XXBTZGBP'] },
    '¥': { config: 'JPY', pairs: ['XBTJPY'], keys: ['XXBTZJPY'] },
    'JPY': { config: 'JPY', pairs: ['XBTJPY'], keys: ['XXBTZJPY'] },
    '₹': { config: 'INR', pairs: ['XBTINR'], keys: ['XXBTZINR'] },
    'INR': { config: 'INR', pairs: ['XBTINR'], keys: ['XXBTZINR'] },
  };
  return mappings[currency];
}

/**
 * Get BTC rate for detected currency
 */
async function getBtcRateForCurrency(currency) {
  const config = getCurrencyConfig(currency);
  if (!config) return null;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error("[AtoB] Service worker request timed out");
      resolve(null);
    }, 5000);

    try {
      chrome.runtime.sendMessage(
        {
          action: "getBtcRate",
          krakenPair: config.pairs[0],
          krakenKey: config.keys[0],
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
    } catch (error) {
      clearTimeout(timeout);
      console.error("[AtoB] Extension context error:", error);
      resolve(null);
    }
  });
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

// Keep track of processed text nodes to avoid duplicates
const processedNodes = new WeakSet();
const replacedPrices = new Set();

/**
 * Parse price amount from price match
 */
function parsePrice(priceString) {
  const normalized = priceString.replace(/[\s,]/g, "").replace(/^\./, "");
  const price = parseFloat(normalized);
  return (price > 0.01 && price < 1000000) ? price : null;
}

/**
 * Reconstruct price from Amazon's multi-span structure
 * E.g., <span class="a-price-symbol">$</span><span class="a-price-whole">6</span><span class="a-price-decimal">.</span><span class="a-price-fraction">79</span>
 */
function reconstructPriceFromSpans(element) {
  const priceContainer = element.closest('[data-a-price], .a-price, [data-price]') || element.parentElement;
  if (!priceContainer) return null;

  const parts = [];
  let currency = null;

  // Get all text from relevant spans
  const symbolSpan = priceContainer.querySelector('.a-price-symbol');
  if (symbolSpan) {
    currency = getCurrencyFromMatch(symbolSpan.textContent);
    parts.push(symbolSpan.textContent);
  }

  const wholeSpan = priceContainer.querySelector('.a-price-whole');
  if (wholeSpan) {
    // Include the whole part and any decimals within it
    parts.push(wholeSpan.textContent);
  }

  const decimalSpan = priceContainer.querySelector('.a-price-decimal');
  if (decimalSpan) {
    parts.push(decimalSpan.textContent);
  }

  const fractionSpan = priceContainer.querySelector('.a-price-fraction');
  if (fractionSpan) {
    parts.push(fractionSpan.textContent);
  }

  const fullPrice = parts.join('');
  if (!fullPrice) return null;

  return {
    fullPrice,
    currency: currency || getCurrencyFromMatch(fullPrice),
    container: priceContainer,
  };
}

/**
 * Replace price in Amazon's span structure
 */
async function replacePriceInSpans(priceInfo, btcRateCache) {
  const { fullPrice, currency, container } = priceInfo;

  if (replacedPrices.has(fullPrice)) return false;
  if (!currency) return false;

  // Get BTC rate for this currency
  if (!btcRateCache[currency]) {
    btcRateCache[currency] = await getBtcRateForCurrency(currency);
  }

  const btcRate = btcRateCache[currency];
  if (!btcRate) return false;

  const price = parsePrice(fullPrice);
  if (!price) return false;

  // Convert to sats
  const sats = toSats(price, btcRate);
  if (!sats) return false;

  // Replace price with sats (original)
  const replacement = `${formatSats(sats)} sats (${fullPrice})`;
  container.textContent = replacement;
  replacedPrices.add(fullPrice);

  console.log(`[AtoB] Replaced "${fullPrice}" with "${replacement}"`);
  return true;
}

/**
 * Process text nodes and replace prices (both span-based and text-based)
 */
async function walkAndReplacePrices(node, btcRateCache) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Skip if already processed
    if (processedNodes.has(node)) return;

    let text = node.textContent;
    let hasChanges = false;

    // Try each price pattern
    for (const pattern of PRICE_PATTERNS) {
      let match;
      const matches = [];

      while ((match = pattern.exec(text)) !== null) {
        // Extract the number part (could be in group 1 or 2 depending on pattern)
        let priceStr = null;
        for (let i = 1; i < match.length; i++) {
          if (match[i] && /[0-9]/.test(match[i])) {
            priceStr = match[i];
            break;
          }
        }

        matches.push({
          fullMatch: match[0],
          priceStr,
          index: match.index,
        });
      }

      // Process matches in reverse to maintain indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const { fullMatch, priceStr } = matches[i];

        // Skip if already replaced
        if (replacedPrices.has(fullMatch)) continue;

        const currency = getCurrencyFromMatch(fullMatch);
        const price = parsePrice(priceStr);

        if (!price || !currency) continue;

        // Get BTC rate for this currency
        if (!btcRateCache[currency]) {
          btcRateCache[currency] = await getBtcRateForCurrency(currency);
        }

        const btcRate = btcRateCache[currency];
        if (!btcRate) continue;

        // Convert to sats
        const sats = toSats(price, btcRate);
        if (!sats) continue;

        // Replace price with sats (original)
        const replacement = `${formatSats(sats)} sats (${fullMatch})`;
        text = text.replace(fullMatch, replacement);
        replacedPrices.add(fullMatch);
        hasChanges = true;

        console.log(`[AtoB] Replaced "${fullMatch}" with "${replacement}"`);
      }

      pattern.lastIndex = 0;
    }

    // Update text node if changed
    if (hasChanges) {
      node.textContent = text;
      processedNodes.add(node);
    }
  } else if (
    node.nodeType === Node.ELEMENT_NODE &&
    !["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.nodeName)
  ) {
    // Check if this is an Amazon price span structure
    if (node.classList.contains('a-price-symbol') ||
        node.classList.contains('a-price-whole') ||
        node.classList.contains('a-price-fraction')) {

      const priceContainer = node.closest('[data-a-price], .a-price, [data-price]');
      if (priceContainer && !processedNodes.has(priceContainer)) {
        const priceInfo = reconstructPriceFromSpans(node);
        if (priceInfo) {
          await replacePriceInSpans(priceInfo, btcRateCache);
          processedNodes.add(priceContainer);
          return; // Skip recursion for this container
        }
      }
    }

    // Recursively process child nodes
    for (let child of Array.from(node.childNodes)) {
      await walkAndReplacePrices(child, btcRateCache);
    }
  }
}

// Main function - inject BTC prices to page
async function injectBtcPrice() {
  try {
    const btcRateCache = {};
    await walkAndReplacePrices(document.body, btcRateCache);
    console.log("[AtoB] Price injection complete");
  } catch (error) {
    console.error("[AtoB] Error injecting Bitcoin price:", error);
  }
}

// Check if extension is enabled before running
async function checkAndInject() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      const enabled = result.extensionEnabled !== false;
      if (enabled) {
        injectBtcPrice().then(resolve).catch(resolve);
      } else {
        console.log("[AtoB] Extension is disabled");
        resolve();
      }
    });
  });
}

// Run on page load with error boundary
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    try {
      checkAndInject();
    } catch (error) {
      console.error("[AtoB] Fatal error during page load injection:", error);
    }
  });
} else {
  try {
    checkAndInject();
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
        checkAndInject();
      } catch (error) {
        console.error("[AtoB] Error during dynamic injection:", error);
      }
    }, 150);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
} catch (error) {
  console.error("[AtoB] Failed to set up MutationObserver:", error);
}
