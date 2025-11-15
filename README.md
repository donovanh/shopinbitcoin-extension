# ShopInBitcoin - Amazon to Bitcoin Chrome Extension

See Amazon prices in Bitcoin/Satoshis on any Amazon store worldwide.

## Features

See Bitcoin prices inline below the Amazon price.

- **Real-time BTC rates** - Fetches live exchange rates from Kraken API
- **No tracking** - Completely private, no data collection
- **10+ Amazon locales** - Works on US, UK, Germany, France, Spain, Italy, Canada, Australia, Japan, and India

## Supported Amazon Locales

| Region    | Domain        | Currency |
| --------- | ------------- | -------- |
| US        | amazon.com    | USD      |
| UK        | amazon.co.uk  | GBP      |
| Germany   | amazon.de     | EUR      |
| France    | amazon.fr     | EUR      |
| Spain     | amazon.es     | EUR      |
| Italy     | amazon.it     | EUR      |
| Canada    | amazon.ca     | CAD      |
| Australia | amazon.com.au | AUD      |
| Japan     | amazon.jp     | JPY      |
| India     | amazon.in     | INR      |

## Installation

### Manual Installation (for testing)

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `shopinbitcoin-extension` directory
6. Done! The extension is now active

### Chrome Web Store

Coming soon.

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

## Privacy & Security

- Does NOT track users or collect personal data
- Only fetches public BTC rates from Kraken API
- All processing happens locally in your browser
- No external analytics or trackers
- Open source - verify the code yourself
- Only runs on Amazon product pages

## API Sources

- **Primary**: Kraken API (https://docs.kraken.com/rest-api/)

  - Direct BTC/[Currency] pairs for accurate conversion
  - No authentication required
  - Public rate data

- **Fallback** (USD only): Binance API
  - Used only if Kraken is unavailable
  - Fallback for XBTUSD pair only

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

---

**Note**: This extension is independent and not officially affiliated with Amazon or Kraken.
