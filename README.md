# ShopInBitcoin - Amazon to Bitcoin Chrome Extension

See Amazon prices in Bitcoin/Satoshis on any Amazon store worldwide.

## Features

- **Real-time BTC rates** - Fetches live exchange rates from Kraken API
- **10+ Amazon locales** - Works on US, UK, Germany, France, Spain, Italy, Canada, Australia, Japan, and India
- **Accurate conversions** - Direct currency pairs (no approximations or secondary conversions)
- **Smart formatting** - Shows prices as sats with intelligent scaling (e.g., "53,000" or "1.25M")
- **Direct product links** - "shopinbitcoin.com" link goes to ShopInBitcoin home
- **Popup rate display** - See current BTC rate in extension popup
- **Clean inline display** - Bitcoin price displays inline below the Amazon price
- **No tracking** - Completely private, no data collection

## Supported Amazon Locales

| Region | Domain | Currency | Status |
|--------|--------|----------|--------|
| US | amazon.com | USD | ✅ Supported |
| UK | amazon.co.uk | GBP | ✅ Supported |
| Germany | amazon.de | EUR | ✅ Supported |
| France | amazon.fr | EUR | ✅ Supported |
| Spain | amazon.es | EUR | ✅ Supported |
| Italy | amazon.it | EUR | ✅ Supported |
| Canada | amazon.ca | CAD | ✅ Supported |
| Australia | amazon.com.au | AUD | ✅ Supported |
| Japan | amazon.jp | JPY | ✅ Supported |
| India | amazon.in | INR | ✅ Supported |

## Installation

### Manual Installation (for testing)

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `shopinbitcoin-extension` directory
6. Done! The extension is now active

### Chrome Web Store

Coming soon - submit to Chrome Web Store for public distribution.

## How It Works

### Content Script (`content.js`)
- Injects Bitcoin price inline below every Amazon product price
- Scrapes product price from page DOM using multiple fallback selectors
- Calls service worker to fetch live BTC rate from Kraken API
- Converts local currency to satoshis
- Displays formatted price with link to ShopInBitcoin

### Service Worker (`service-worker.js`)
- Handles API requests from content scripts (bypasses CORS)
- Fetches live rates from Kraken API for supported currency pairs
- Falls back to Binance for USD pair if Kraken fails
- No caching - always fresh rates

### Popup (`popup.html`, `popup.js`)
- Shows current BTC rate when extension icon is clicked
- Updates every 60 seconds while popup is open
- Links to ShopInBitcoin and GitHub

### Configuration (`config.js`)
- Maps Amazon locales to their currencies
- Defines Kraken API pairs and result keys
- Handles locale detection and config lookup

## Example

When viewing a product on Amazon:

```
Price: £11.20
9,234 SATS - shopinbitcoin.com
```

Or on a product page:

```
$49.99
53,000 SATS - shopinbitcoin.com
```

## Performance & Reliability

- ✅ **Rate caching** - Caches exchange rates for 60 seconds to reduce API calls
- ✅ **Timeout protection** - 5-second timeout on service worker requests prevents hanging
- ✅ **Error boundaries** - Gracefully handles failures without crashing
- ✅ **Fallback support** - Binance fallback for USD if Kraken unavailable
- ✅ **No dependencies** - Lightweight, fast, and secure

## Privacy & Security

- ✅ Does NOT track users or collect personal data
- ✅ Only fetches public BTC rates from Kraken API
- ✅ All processing happens locally in your browser
- ✅ No external analytics or trackers
- ✅ Open source - verify the code yourself
- ✅ Only runs on Amazon product pages

## API Sources

- **Primary**: Kraken API (https://docs.kraken.com/rest-api/)
  - Direct BTC/[Currency] pairs for accurate conversion
  - No authentication required
  - Public rate data

- **Fallback** (USD only): Binance API
  - Used only if Kraken is unavailable
  - Fallback for XBTUSD pair only

## File Structure

```
shopinbitcoin-extension/
├── manifest.json          # Extension configuration (MV3)
├── config.js              # Locale and currency configuration
├── content.js             # Main content script
├── service-worker.js      # Background worker for API requests
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic
├── icons/                 # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── README.md              # This file
├── LICENSE                # MIT License
└── .editorconfig          # Code formatting config
```

## Development

To modify the extension:

1. Edit files as needed
2. Save changes
3. Go to `chrome://extensions/`
4. Click the refresh icon on the ShopInBitcoin extension
5. Test on Amazon pages

### Code Style

- 2-space indentation
- JSDoc comments on all functions
- Clear error messages for debugging
- No external dependencies

## Future Enhancements

- [ ] Support for more cryptocurrencies
- [ ] Price history and charts
- [ ] Dark mode toggle in popup
- [ ] Multiple language support
- [ ] Custom exchange rate sources

## Contributing

Found a bug? Want a feature?

1. Check existing issues first
2. Open a new issue with details
3. Submit a pull request with your solution

## License

MIT License - See LICENSE file for details

## Support

- **Bug reports**: Open an issue on GitHub
- **Feature requests**: Open an issue on GitHub
- **Questions**: Check the FAQ section

## Author

Created by Donovan Hutchinson
Part of the ShopInBitcoin integration project

---

**Note**: This extension is independent and not officially affiliated with Amazon or Kraken. Use at your own discretion.
