/**
 * ShopInBitcoin Popup Script
 * Shows current BTC rate via service worker
 */

const rateElement = document.getElementById("rate");
const updatedElement = document.getElementById("updated");

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

// Update rate immediately on open
updateRate();

// Update rate every 60 seconds while popup is open
const interval = setInterval(updateRate, 60000);

// Clear interval when popup closes
window.addEventListener("beforeunload", () => {
  clearInterval(interval);
});
