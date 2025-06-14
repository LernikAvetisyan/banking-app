// This function retrieves the overall balance of a user by fetching their wallets from the server and summing up the balances.
async function getOverallBalance() {
  // 1) Check the logged-in user from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No valid user found in sessionStorage. Please log in.");
    return "0";
  }

  try {
    // 2) Fetch the wallets from your backend using the user’s accountId
    const res = await fetch(`/api/wallet?accountId=${encodeURIComponent(user.accountId)}`);
    if (!res.ok) {
      console.error("Failed to fetch wallets from server. Status:", res.status);
      return "0";
    }
    const wallets = await res.json();

    // 3) Sum up all wallet balances
    const total = wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

    // 4) Return the total as a comma-formatted string
    return total.toLocaleString();
  } catch (err) {
    console.error("Error fetching wallets from server:", err);
    return "0";
  }
}

// Attach to window so other scripts can call it
window.getOverallBalance = getOverallBalance;
