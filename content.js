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

          // Check if extension context is still valid
          if (chrome.runtime.lastError) {
            console.error("[AtoB] Extension context error:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }

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
      console.error("[AtoB] Extension context error:", error.message);
      resolve(null);
    }
  });
}

/**
 * Currency detection regex patterns
 * Matches: $12.34, €12.34, EUR 12.34, £12.34, etc.
 * Handles comma and period as decimal separators, handles whitespace variations
 * Pattern: optional thousands with separator, then optional decimal part
 */
const PRICE_PATTERNS = [
  // Symbol-based: $12.34, $ 12.34, €12,34, € 25.50
  /[$€£¥₹]\s*([0-9]+(?:[,.][0-9]+)*)/g,
  // Currency code at start: USD 12.34, EUR 25,50 (requires space)
  /(USD|EUR|GBP|CAD|AUD|JPY|INR)\s+([0-9]+(?:[,.][0-9]+)*)/gi,
  // Numbers with currency symbol after: 12.34$, 25,50€
  /([0-9]+(?:[,.][0-9]+)*)\s*[$€£¥₹]/g,
  // Numbers with currency code after: 12.34 USD, 25,50 GBP (requires space)
  /([0-9]+(?:[,.][0-9]+)*)\s+(USD|EUR|GBP|CAD|AUD|JPY|INR)/gi,
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
          // Check if extension context is still valid
          if (chrome.runtime.lastError) {
            console.error("[AtoB] Extension context error:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
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
      console.error("[AtoB] Extension context error:", error.message);
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
 * Parse price amount from price match or full price string
 * Handles both "12.34" and "EUR12.34" or "$12.34"
 */
function parsePrice(priceString) {
  // Remove currency symbols and codes, keep only numbers and decimal points
  const normalized = priceString
    .replace(/[A-Z]/gi, '') // Remove currency codes (USD, EUR, etc)
    .replace(/[$€£¥₹]/g, '') // Remove currency symbols
    .replace(/[\s,]/g, '') // Remove spaces and thousand separators
    .replace(/^\./, ''); // Remove leading decimal point

  const price = parseFloat(normalized);
  return (price > 0.01 && price < 1000000) ? price : null;
}

/**
 * Reconstruct price from Amazon's multi-span structure
 * E.g., <span class="a-price-symbol">$</span><span class="a-price-whole">6</span><span class="a-price-decimal">.</span><span class="a-price-fraction">79</span>
 * Also handles: <span class="a-price-whole">13<span class="a-price-decimal">.</span></span>
 */
function reconstructPriceFromSpans(element) {
  const priceContainer = element.closest('[data-a-price], .a-price, [data-price]') || element.parentElement;
  if (!priceContainer) return null;

  const parts = [];
  let currency = null;

  // Get symbol (usually currency code or symbol)
  const symbolSpan = priceContainer.querySelector('.a-price-symbol');
  if (symbolSpan) {
    const symbolText = symbolSpan.textContent.trim();
    currency = getCurrencyFromMatch(symbolText);
    parts.push(symbolText);
  }

  // Get the whole number part (may contain decimal span inside)
  const wholeSpan = priceContainer.querySelector('.a-price-whole');
  if (wholeSpan) {
    // Use full textContent which includes nested decimal span
    const wholeText = wholeSpan.textContent;
    if (wholeText) {
      parts.push(wholeText);
    }
  }

  // Get decimal point (but only if not already in whole span)
  const decimalSpan = priceContainer.querySelector('.a-price-decimal');
  if (decimalSpan && !wholeSpan?.contains(decimalSpan)) {
    parts.push(decimalSpan.textContent);
  }

  // Get fraction part
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

  // Create a new div with bold sats conversion on a new line
  const satsDiv = document.createElement('div');
  satsDiv.style.fontSize = 'inherit';
  satsDiv.style.color = 'inherit';
  satsDiv.style.fontFamily = 'inherit';
  satsDiv.style.marginTop = '2px';

  const boldSpan = document.createElement('strong');
  boldSpan.textContent = `${formatSats(sats)} sats`;
  satsDiv.appendChild(boldSpan);

  // Insert after the price container
  if (container.parentElement) {
    container.parentElement.insertAdjacentElement('afterend', satsDiv);
  }

  replacedPrices.add(fullPrice);

  console.log(`[AtoB] Added sats for "${fullPrice}": ${formatSats(sats)} sats`);
  return true;
}

/**
 * Find all price containers on the page
 */
function findAllPriceContainers(root) {
  const containers = new Set();

  // Find by Amazon price classes
  document.querySelectorAll('.a-price-symbol, .a-price-whole, .a-price-fraction').forEach(el => {
    const container = el.closest('[data-a-price], .a-price, [data-price]');
    if (container) containers.add(container);
  });

  // Find by looking for elements that contain price patterns
  document.querySelectorAll('span, div, p').forEach(el => {
    if (!el.querySelector('script, style, noscript')) {
      const text = el.textContent;
      // Quick check if contains what looks like a price
      if (/[$€£¥₹]|USD|EUR|GBP|JPY|INR/.test(text) && /[0-9]+[.,][0-9]+/.test(text)) {
        // Check if it's a small, focused element (likely a price)
        if (text.length < 100) {
          containers.add(el);
        }
      }
    }
  });

  return containers;
}

/**
 * Process text nodes and replace prices (both span-based and text-based)
 */
async function walkAndReplacePrices(node, btcRateCache) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Skip text nodes - span-based prices are handled separately
    // Text node prices are harder to inject without breaking layout
    processedNodes.add(node);
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

    // First, handle Amazon's structured price elements
    await walkAndReplacePrices(document.body, btcRateCache);

    // Then, catch any remaining prices by aggressive search
    const priceContainers = findAllPriceContainers(document.body);
    for (const container of priceContainers) {
      if (!processedNodes.has(container)) {
        // Try to extract price from this element
        const text = container.textContent.trim();

        // Try to find price pattern
        for (const pattern of PRICE_PATTERNS) {
          const match = pattern.exec(text);
          if (match) {
            const fullMatch = match[0];
            if (!replacedPrices.has(fullMatch)) {
              const currency = getCurrencyFromMatch(fullMatch);
              const price = parsePrice(fullMatch);

              if (price && currency) {
                // Get BTC rate for this currency
                if (!btcRateCache[currency]) {
                  btcRateCache[currency] = await getBtcRateForCurrency(currency);
                }

                const btcRate = btcRateCache[currency];
                if (btcRate) {
                  const sats = toSats(price, btcRate);
                  if (sats) {
                    // Create a new div with bold sats
                    const satsDiv = document.createElement('div');
                    satsDiv.style.fontSize = 'inherit';
                    satsDiv.style.color = 'inherit';
                    satsDiv.style.fontFamily = 'inherit';
                    satsDiv.style.marginTop = '2px';

                    const boldSpan = document.createElement('strong');
                    boldSpan.textContent = `${formatSats(sats)} sats`;
                    satsDiv.appendChild(boldSpan);

                    if (container.parentElement) {
                      container.parentElement.insertAdjacentElement('afterend', satsDiv);
                    }

                    replacedPrices.add(fullMatch);
                    processedNodes.add(container);
                    console.log(`[AtoB] Added sats for "${fullMatch}": ${formatSats(sats)} sats`);
                    break;
                  }
                }
              }
            }
          }
          pattern.lastIndex = 0;
        }
      }
    }

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
