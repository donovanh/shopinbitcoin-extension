# Changelog

All notable changes to the ShopInBitcoin extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- Initial public release
- Support for 10 Amazon locales (US, UK, Germany, France, Spain, Italy, Canada, Australia, Japan, India)
- Real-time BTC exchange rates from Kraken API with Binance fallback for USD
- Direct currency pair support for all locales (no approximations)
- Inline Bitcoin price display on Amazon product pages
- Extension popup showing current BTC/USD rate
- Smart satoshi formatting (intelligent scaling: "1,234", "5.67M", etc.)
- Rate caching (60-second TTL) to reduce API calls
- Timeout handling (5 seconds) for service worker requests
- Error boundaries and graceful degradation
- Comprehensive JSDoc documentation
- No external dependencies
- MIT License
- Full privacy - no tracking or data collection

### Technical Details
- **Architecture**: MV3 (Manifest V3) compliant
- **Service Worker**: Handles all API requests, implements caching and fallbacks
- **Content Script**: Injects prices into Amazon pages, handles DOM updates
- **Configuration**: Locale-based config with Kraken trading pairs
- **DOM Selection**: Multiple fallback selectors for price extraction robustness

### Known Limitations
- Price extraction relies on CSS selectors that may change if Amazon updates their HTML
- Only supports BTC (other cryptocurrencies planned for future versions)
- Popup always shows USD rate (per-locale rates planned for 1.1)
- Direct product linking to ShopInBitcoin search temporarily disabled (route under development)

### Security & Privacy
- No authentication required - uses public APIs only
- All processing happens locally in your browser
- No external analytics or trackers
- No user data collected or transmitted
- Open source - review the code yourself

## Future Roadmap

### Version 1.1
- [ ] Per-locale rate display in popup
- [ ] Direct product search links to shopinbitcoin.com/home/[ASIN]
- [ ] Price history sparkline in popup
- [ ] Dark mode toggle
- [ ] Multiple language support

### Version 2.0
- [ ] Support for Ethereum and other cryptocurrencies
- [ ] Custom exchange rate source selection
- [ ] Price alerts and notifications
- [ ] Browser persistence of settings
- [ ] Enhanced price extraction with ML-based detection

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style (2-space indentation, JSDoc comments)
- No external dependencies added without discussion
- Tests pass and error handling is comprehensive
- Documentation is updated

## Support

For bug reports and feature requests, please open an issue on GitHub.
