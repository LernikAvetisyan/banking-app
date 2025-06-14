async function updateIncomingBadgeCount() {
  // Get the current user from sessionStorage (using accountId)
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  if (!currentUser || !currentUser.accountId) {
    console.log("No current user found, cannot update incoming badge.");
    return;
  }

  try {
    // Fetch deposit requests
    const depRes = await fetch(`/api/deposit/incoming-deposits?accountId=${currentUser.accountId}`);
    if (!depRes.ok) throw new Error("Failed to fetch incoming deposits");
    const deposits = await depRes.json();

    // Fetch withdrawal requests
    const witRes = await fetch(`/api/withdrawal/incoming-withdrawals?accountId=${currentUser.accountId}`);
    if (!witRes.ok) throw new Error("Failed to fetch incoming withdrawals");
    const withdrawals = await witRes.json();

    // Combine both arrays
    let allRequests = [...deposits, ...withdrawals];

    // Deduplicate transactions by their unique 'id'
    const dedupedRequests = [];
    const idsSeen = new Set();
    allRequests.forEach(tx => {
      if (!idsSeen.has(tx.id)) {
        dedupedRequests.push(tx);
        idsSeen.add(tx.id);
      }
    });
    allRequests = dedupedRequests;

    // Get the timestamp when badge was last cleared (if any)
    const clearedTimeStr = sessionStorage.getItem("badgeClearedTimestamp");
    if (clearedTimeStr) {
      const clearedTime = new Date(clearedTimeStr);
      // Filter requests to only include those created after the cleared time
      allRequests = allRequests.filter(tx => {
        const txTime = new Date(tx.createdAt || tx.date);
        return txTime > clearedTime;
      });
    }

    const count = allRequests.length;
    console.log("Badge count:", count);

    const badgeEl = document.getElementById("incomingBadge");
    if (badgeEl) {
      badgeEl.textContent = count > 0 ? count : "";
    }
  } catch (err) {
    console.error("Error fetching incoming transactions:", err);
  }
}

async function markAllIncomingAsViewed() {
  // Instead of updating the DB, we simply store the current time in sessionStorage
  const currentTime = new Date().toISOString();
  sessionStorage.setItem("badgeClearedTimestamp", currentTime);

  // Immediately clear the badge on the client side
  const badgeEl = document.getElementById("incomingBadge");
  if (badgeEl) {
    badgeEl.textContent = "";
  }
}

// Attach a click listener to the incoming deposits icon (ensure the element has id="incomingDepositsIcon")
const incomingDepositsIcon = document.getElementById("incomingDepositsIcon");
if (incomingDepositsIcon) {
  incomingDepositsIcon.addEventListener("click", markAllIncomingAsViewed);
}

// Expose the functions globally if needed elsewhere.
window.updateIncomingBadgeCount = updateIncomingBadgeCount;
window.markAllIncomingAsViewed = markAllIncomingAsViewed;