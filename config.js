/**
 * Amazon locale configuration
 * Maps Amazon domains to their currency and BTC rate API pairs
 * Uses Kraken API for direct conversions where available
 * See: https://docs.kraken.com/rest-api/
 */

const LOCALE_CONFIG = {
  // US - Direct BTC/USD pair
  'com': {
    currency: 'USD',
    symbol: '$',
    krakenPair: 'XBTUSD',
    krakenKey: 'XXBTZUSD',
    affiliateTag: 'shopireland00-20',
  },
  // UK - Direct BTC/GBP pair
  'uk': {
    currency: 'GBP',
    symbol: '£',
    krakenPair: 'XBTGBP',
    krakenKey: 'XXBTZGBP',
    affiliateTag: 'shopirelandie-21',
  },
  // Germany, France, Spain, Italy (all use EUR) - Direct BTC/EUR pair
  'de': {
    currency: 'EUR',
    symbol: '€',
    krakenPair: 'XBTEUR',
    krakenKey: 'XXBTZEUR',
    affiliateTag: 'cssanimation-21',
  },
  'fr': {
    currency: 'EUR',
    symbol: '€',
    krakenPair: 'XBTEUR',
    krakenKey: 'XXBTZEUR',
  },
  'es': {
    currency: 'EUR',
    symbol: '€',
    krakenPair: 'XBTEUR',
    krakenKey: 'XXBTZEUR',
  },
  'it': {
    currency: 'EUR',
    symbol: '€',
    krakenPair: 'XBTEUR',
    krakenKey: 'XXBTZEUR',
  },
  // Canada - Direct BTC/CAD pair
  'ca': {
    currency: 'CAD',
    symbol: '$',
    krakenPair: 'XBTCAD',
    krakenKey: 'XXBTZCAD',
  },
  // Australia - Direct BTC/AUD pair
  'au': {
    currency: 'AUD',
    symbol: '$',
    krakenPair: 'XBTAUD',
    krakenKey: 'XXBTZAUD',
  },
  // Japan - Direct BTC/JPY pair
  'jp': {
    currency: 'JPY',
    symbol: '¥',
    krakenPair: 'XBTJPY',
    krakenKey: 'XXBTZJPY',
  },
  // India - Direct BTC/INR pair
  'in': {
    currency: 'INR',
    symbol: '₹',
    krakenPair: 'XBTINR',
    krakenKey: 'XXBTZINR',
  },
};

/**
 * Get config for current Amazon locale
 * Returns null if locale is not supported (no Kraken API pair available)
 */
function getLocaleConfig() {
  const hostname = window.location.hostname;
  let locale = 'com'; // Default to US

  // Special case: amazon.com can be regional (.com.br, .com.au, etc.)
  if (hostname.includes('amazon.com.')) {
    locale = hostname.split('.')[0];
  } else if (hostname.includes('amazon.co.uk')) {
    locale = 'uk';
  } else if (hostname.includes('amazon.de')) {
    locale = 'de';
  } else if (hostname.includes('amazon.fr')) {
    locale = 'fr';
  } else if (hostname.includes('amazon.es')) {
    locale = 'es';
  } else if (hostname.includes('amazon.it')) {
    locale = 'it';
  } else if (hostname.includes('amazon.ca')) {
    locale = 'ca';
  } else if (hostname.includes('amazon.jp')) {
    locale = 'jp';
  } else if (hostname.includes('amazon.in')) {
    locale = 'in';
  }

  return LOCALE_CONFIG[locale] || null;
}
