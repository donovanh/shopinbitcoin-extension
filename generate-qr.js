#!/usr/bin/env node

/**
 * Generate QR code for Bitcoin address
 * Outputs as base64 PNG that can be embedded in HTML
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const bitcoinAddress = 'bitcoin:BC1QARH9CQG2PGQF4CNEYEKH9J83KT34M93KUSDX06';

// Generate QR code as data URL
QRCode.toDataURL(bitcoinAddress, {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  quality: 0.95,
  margin: 1,
  width: 200,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
}, (err, url) => {
  if (err) {
    console.error('Error generating QR code:', err);
    process.exit(1);
  }

  // Create a simple HTML file with the QR code embedded
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Bitcoin QR Code</title>
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    img { background: white; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <img src="${url}" alt="Bitcoin Address QR Code" />
</body>
</html>`;

  // Save as base64 string for embedding
  const base64Data = url.split(',')[1];

  // Write to a JS file that exports the QR code
  const jsOutput = `// Generated QR code for Bitcoin address\n// Run: node generate-qr.js\n\nconst QR_CODE_PNG = '${url}';\n`;

  fs.writeFileSync(path.join(__dirname, 'qr-code.js'), jsOutput);
  console.log('✓ Generated qr-code.js with embedded QR code PNG');
  console.log('  QR code PNG size:', Math.round(url.length / 1024), 'KB');
});
