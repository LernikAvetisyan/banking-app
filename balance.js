// balance.js
function getOverallBalance() {
  // Retrieve wallets from localStorage.
  const wallets = JSON.parse(localStorage.getItem("wallets")) || [];
  // Sum all wallet balances.
  const total = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

  // Return the total as a string with commas, e.g. "101,031"
  return total.toLocaleString();
}

// Attach the function to window so it can be accessed globally.
window.getOverallBalance = getOverallBalance;
