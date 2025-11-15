/**
 * Service Worker for ShopInBitcoin Extension
 * Handles API requests to bypass CORS restrictions on content scripts
 * Includes rate caching to reduce API calls
 */

// Simple in-memory cache with TTL
const rateCache = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBtcRate') {
    const cacheKey = `${request.krakenPair}:${request.krakenKey}`;
    const cached = rateCache.get(cacheKey);

    // Return cached rate if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[AtoB] Using cached rate for ${request.krakenPair}: ${cached.rate}`);
      sendResponse({ rate: cached.rate });
      return true;
    }

    // Fetch fresh rate
    fetchBtcRate(request.krakenPair, request.krakenKey).then(rate => {
      // Update cache
      rateCache.set(cacheKey, { rate, timestamp: Date.now() });
      sendResponse({ rate });
    }).catch(error => {
      console.error('[AtoB Service Worker] Error fetching rate:', error);
      sendResponse({ rate: null, error: error.message });
    });

    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

/**
 * Fetch BTC rate from Kraken with Binance fallback
 * @param {string} krakenPair - Trading pair (e.g., 'XBTUSD')
 * @param {string} krakenKey - Result key in response (e.g., 'XXBTZUSD')
 * @returns {Promise<number>} Exchange rate
 */
async function fetchBtcRate(krakenPair, krakenKey) {
  // Try Kraken first
  try {
    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error && data.error.length > 0) {
      throw new Error(data.error[0]);
    }

    const rateData = data.result?.[krakenKey];
    if (!rateData) {
      throw new Error(`Invalid response format for ${krakenPair}`);
    }

    const rate = parseFloat(rateData.c[0]); // Last trade close price
    console.log(`[AtoB] Fetched ${krakenPair} from Kraken: ${rate}`);
    return rate;
  } catch (krakenError) {
    console.warn('[AtoB] Kraken fetch failed:', krakenError.message);

    // Fallback to Binance for USD pairs only
    if (krakenPair === 'XBTUSD') {
      try {
        const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');

        if (!binanceResponse.ok) {
          throw new Error(`HTTP ${binanceResponse.status}`);
        }

        const binanceData = await binanceResponse.json();

        if (binanceData.code && binanceData.code !== 0) {
          throw new Error(binanceData.msg || 'Binance API error');
        }

        if (!binanceData.price) {
          throw new Error('No price in Binance response');
        }

        const rate = parseFloat(binanceData.price);
        console.log(`[AtoB] Fetched BTCUSDT from Binance (fallback): ${rate}`);
        return rate;
      } catch (binanceError) {
        console.error('[AtoB] Binance fallback also failed:', binanceError.message);
        throw new Error(`Failed to fetch from both Kraken and Binance. Kraken: ${krakenError.message}, Binance: ${binanceError.message}`);
      }
    }

    // For non-USD pairs, just fail
    throw krakenError;
  }
}
