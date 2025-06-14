//incomingDeposits.js (Frontend) combines both deposit requests and withdrawal requests into a single “Incoming Transactions” table.

let currentRequest = null; // Will hold the request being confirmed in the modal

function formatDateTime(tx) {
  // If createdAt exists, use it; otherwise, if tx.date is a DATEONLY string, append 'T00:00:00'
  const raw = tx.createdAt || (tx.date + 'T00:00:00');
  const dateObj = new Date(raw);
  return dateObj.toLocaleDateString();
}

/*
  Helper function to build the description for a deposit/withdraw request
  from the perspective of the current user.
 */
function buildRequestDescription({ request, currentUserId, amountString }) {
  const { fromAccountId, recipientAccountId, status, type, accountId } = request;
  const lowerStatus = status.toLowerCase();

  /*Deposit Transactions
   For deposits, two types exist:
   - "Requested Deposit" belongs to the recipient (User 1) and shows incoming funds.
   - "Deposit Request" belongs to the payer (User 2) but we want to display it as a withdrawal.
  */
  if (type === "Requested Deposit") {
    // For the recipient’s record: deposit (incoming)
    const isOwner = currentUserId === accountId; // User1
    if (lowerStatus === "pending") {
      return isOwner
        ? `You are requesting $${amountString} from user ${fromAccountId}`
        : `User ${recipientAccountId} is requesting $${amountString} from you`;
    } else if (lowerStatus === "completed") {
      return isOwner
        ? `User ${fromAccountId} sent you $${amountString}`
        : `You received $${amountString} from user ${recipientAccountId}`;
    } else if (lowerStatus === "rejected") {
      return isOwner
        ? `User ${fromAccountId} rejected to send $${amountString}`
        : `You rejected to receive $${amountString} from user ${recipientAccountId}`;
    }
  }
  else if (type === "Deposit Request") {
    // For the payer’s record: show as withdrawal (outgoing)
    const isOwner = currentUserId === accountId; // User2
    if (lowerStatus === "pending") {
      return isOwner
        ? `You are sending $${amountString} to user ${fromAccountId}`
        : `User ${accountId} is sending $${amountString} to you`;
    } else if (lowerStatus === "completed") {
      return isOwner
        ? `You sent $${amountString} to user ${fromAccountId}`
        : `You withdrew $${amountString} from user ${accountId}`;
    } else if (lowerStatus === "rejected") {
      return isOwner
        ? `You rejected to send $${amountString} to user ${fromAccountId}`
        : `User ${accountId} rejected to send $${amountString}`;
    }
  }

  /* Withdrawal Transactions
   Two types exist:
   - "Requested Withdrawal" belongs to the sender (User 1) and shows an outgoing withdrawal.
   - "Withdrawal Request" belongs to the recipient (User 2) but we want to display it as a deposit.
  */
  else if (type === "Requested Withdrawal") {
    // For the sender’s record: withdrawal (outgoing)
    const isOwner = currentUserId === accountId; // User1
    if (lowerStatus === "pending") {
      return isOwner
        ? `You are sending $${amountString} to user ${fromAccountId}`
        : `User ${fromAccountId} is sending $${amountString} to you`;
    } else if (lowerStatus === "completed") {
      return isOwner
        ? `You sent $${amountString} to user ${fromAccountId}`
        : `You received $${amountString} from user ${fromAccountId}`;
    } else if (lowerStatus === "rejected") {
      return isOwner
        ? `User ${fromAccountId} rejected to receive $${amountString} from you`
        : `You rejected to receive $${amountString} from user ${fromAccountId}`;
    }
  }
  else if (type === "Withdrawal Request") {
    // For the recipient’s record: show as deposit (incoming)
    const isOwner = currentUserId === accountId; // User2
    if (lowerStatus === "pending") {
      return isOwner
        ? `You are receiving $${amountString} from user ${fromAccountId}`
        : `User ${fromAccountId} is receiving $${amountString} from you`;
    } else if (lowerStatus === "completed") {
      return isOwner
        ? `You received $${amountString} from user ${fromAccountId}`
        : `You sent $${amountString} to user ${accountId}`;
    } else if (lowerStatus === "rejected") {
      return isOwner
        ? `You rejected to receive $${amountString} from user ${fromAccountId}`
        : `User ${accountId} rejected to receive $${amountString} from you`;
    }
  }
  return request.description || type;
}



 // Returns a "hh:mm" string based on updatedAt if available, else createdAt
function getTimeString(tx) {
  const lowerStatus = tx.status.toLowerCase();
  let rawTime = lowerStatus === "pending" ? tx.createdAt : (tx.updatedAt || tx.createdAt);
  if (!rawTime) return "";
  const timeStr = new Date(rawTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return ` at ${timeStr}`;
}

async function initIncomingDeposits() {
  // 1) Retrieve current user from sessionStorage
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  if (!currentUser || !currentUser.accountId) {
    console.error("No valid user found in sessionStorage.");
    return;
  }
  console.log("Current user for incoming requests:", currentUser);

  // 2) Fetch all wallets for the current user (for the card selection in the modal)
  let userCards = [];
  try {
    const walletsRes = await fetch(`/api/wallet?accountId=${currentUser.accountId}`);
    if (walletsRes.ok) {
      userCards = await walletsRes.json();
      console.log("Fetched wallets:", userCards);
    } else {
      console.error("Failed to fetch wallets.");
    }
  } catch (err) {
    console.error("Error fetching wallets:", err);
  }

  // 3) Fetch all pending deposit requests for this user
  let pendingDeposits = [];
  try {
    const depositRes = await fetch(`/api/deposit/incoming-deposits?accountId=${currentUser.accountId}`);
    if (depositRes.ok) {
      pendingDeposits = await depositRes.json();
      pendingDeposits.forEach(d => (d.requestKind = "deposit"));
      // Filter to only include Bank Users deposit requests (exclude external deposits)
      pendingDeposits = pendingDeposits.filter(tx => {
        const type = tx.type.toLowerCase();
        return type === "deposit request" || type === "requested deposit";
      });
    } else {
      console.error("Failed to fetch deposit requests.");
    }
  } catch (err) {
    console.error("Error fetching deposit requests:", err);
  }

  // 4) Fetch pending withdrawal requests (kept for other purposes)
  let pendingWithdrawals = [];
  try {
    const withdrawalRes = await fetch(`/api/withdrawal/incoming-withdrawals?accountId=${currentUser.accountId}`);
    if (withdrawalRes.ok) {
      pendingWithdrawals = await withdrawalRes.json();
      pendingWithdrawals.forEach(w => (w.requestKind = "withdrawal"));
    } else {
      console.error("Failed to fetch withdrawal requests.");
    }
  } catch (err) {
    console.error("Error fetching withdrawal requests:", err);
  }

  // 5) Combine pending deposit and withdrawal requests from Bank Users and deduplicate them
  const pendingRequestsCombined = [...pendingDeposits, ...pendingWithdrawals];
  const pendingRequests = pendingRequestsCombined.filter((req, index, self) =>
    index === self.findIndex(r => r.id === req.id)
  );
  console.log("Combined pending Bank Users requests:", pendingRequests);

  // Filter out confirmed transactions for the pending table.
  const pendingDisplay = pendingRequests.filter(req => req.status.toLowerCase() !== "completed");

  // 6) Render the pending requests in the top table (#depositsTable)
  const tbody = document.querySelector("#depositsTable tbody");
  if (!tbody) {
    console.error("No tbody found in #depositsTable");
    return;
  }
  tbody.innerHTML = "";
  const notificationEl = document.getElementById("depositNotification");

  if (pendingDisplay.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="text-align:center;">No incoming requests found.</td>`;
    tbody.appendChild(tr);
  } else {
    pendingDisplay.forEach(request => {
      const tr = document.createElement("tr");
      const amtString = parseFloat(request.amount).toLocaleString();
      const description = buildRequestDescription({
        request,
        currentUserId: currentUser.accountId,
        amountString: amtString
      });
      let statusText = request.status + getTimeString(request);
      tr.innerHTML = `
        <td>${formatDateTime(request)}</td>
        <td>${description}</td>
        <td>${statusText}</td>
        <td>
          <button class="confirm-btn" data-request-id="${request.id}" data-kind="${request.requestKind}">Confirm</button>
          <button class="reject-btn" data-request-id="${request.id}" data-kind="${request.requestKind}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 7) Attach event listeners for Confirm and Reject buttons (these are attached fresh every time)
  const confirmButtons = document.querySelectorAll(".confirm-btn");
  const rejectButtons = document.querySelectorAll(".reject-btn");

  rejectButtons.forEach(btn => {
    btn.onclick = async function () {
      const requestId = this.getAttribute("data-request-id");
      const requestKind = this.getAttribute("data-kind");
      let endpointUrl = requestKind === "deposit"
        ? `/api/deposit/incoming-deposits/${requestId}/reject`
        : `/api/withdrawal/incoming-withdrawals/${requestId}/reject`;
      const payload = {};
      try {
        const resp = await fetch(endpointUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const errData = await resp.json();
          throw new Error(errData.error || "Error processing request");
        }
        notificationEl.textContent = requestKind === "deposit"
          ? "Deposit rejected."
          : "Withdrawal rejected.";
        notificationEl.style.color = "orange";
        notificationEl.style.display = "block";
        initIncomingDeposits();
        loadIncomingTransactionHistory();
      } catch (err) {
        console.error(err);
        notificationEl.textContent = "Failed to process request: " + err.message;
        notificationEl.style.color = "red";
        notificationEl.style.display = "block";
      }
    };
  });

  confirmButtons.forEach(btn => {
    btn.onclick = function () {
      const requestId = this.getAttribute("data-request-id");
      const requestKind = this.getAttribute("data-kind");
      const req = pendingDisplay.find(r => r.id == requestId);
      if (!req) {
        notificationEl.textContent = "Request data not found.";
        notificationEl.style.color = "red";
        notificationEl.style.display = "block";
        return;
      }
      currentRequest = req;
      const modalInstruction = document.getElementById("modalInstruction");
      modalInstruction.textContent = requestKind === "deposit"
        ? "Select a card from which you want to withdraw money."
        : "Select a card where you want to deposit money.";
      const modalCardSelect = document.getElementById("modalCardSelect");
      // Reset and populate the dropdown with full card info
      modalCardSelect.innerHTML = `<option value="" disabled selected>Select a card</option>`;
      userCards.forEach(wallet => {
        const balance = (wallet.balance || 0).toLocaleString();
        const option = document.createElement('option');
        option.value = wallet.cardNumber;
        option.textContent = `${wallet.cardType} - $${balance} (••••${wallet.cardNumber.slice(-4)})`;
        modalCardSelect.appendChild(option);
      });
      const modal = document.getElementById("actionModal");
      modal.style.display = "block";
    };
  });
  
  // 8) Set up modal overlay to close if clicked outside .modal-content
  const modal = document.getElementById("actionModal");
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeModal();
    }
  };

  // 9) Attach event listener for modal "Confirm" button (using onclick to avoid duplicates)
  const modalConfirmBtn = document.getElementById("modalConfirmBtn");
  modalConfirmBtn.onclick = async function () {
    const modalCardSelect = document.getElementById("modalCardSelect");
    const selectedCard = modalCardSelect.value;
    const modalNotification = document.getElementById("modalNotification");
    if (!selectedCard) {
      modalNotification.textContent = "Please select a card.";
      modalNotification.style.color = "red";
      modalNotification.style.display = "block";
      return;
    }
    if (currentRequest.requestKind === "deposit") {
      const selectedWallet = userCards.find(card => card.cardNumber === selectedCard);
      if (!selectedWallet) {
        modalNotification.textContent = "Selected wallet not found.";
        modalNotification.style.color = "red";
        modalNotification.style.display = "block";
        return;
      }
      if (selectedWallet.balance < parseFloat(currentRequest.amount)) {
        modalNotification.textContent = "Insufficient funds in your wallet to complete this deposit.";
        modalNotification.style.color = "red";
        modalNotification.style.display = "block";
        return;
      }
    }
    let endpointUrl = currentRequest.requestKind === "deposit"
      ? `/api/deposit/incoming-deposits/${currentRequest.id}/accept`
      : `/api/withdrawal/incoming-withdrawals/${currentRequest.id}/accept`;
    const payload = { cardNumber: selectedCard };
    try {
      const resp = await fetch(endpointUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || "Error processing request");
      }
      const confirmationMsg = currentRequest.requestKind === "deposit"
        ? "Deposit confirmed!"
        : "Withdrawal confirmed!";
      modalNotification.textContent = confirmationMsg;
      modalNotification.style.color = "green";
      modalNotification.style.display = "block";
      setTimeout(() => { closeModal(); }, 1500);
      initIncomingDeposits();
      loadIncomingTransactionHistory();
    } catch (err) {
      console.error(err);
      modalNotification.textContent = "Failed to process request: " + err.message;
      modalNotification.style.color = "red";
      modalNotification.style.display = "block";
    }
  };

  // 10) Attach event listener for modal "Cancel" button (using onclick)
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  modalCancelBtn.onclick = closeModal;

  // 11) Load the complete transaction history (for Bank Users only)
  loadIncomingTransactionHistory();

  // 12) Setup filter dropdown
  setupFilterDropdown();

  // 13) Update badge count and mark as viewed if applicable
  if (typeof window.updateIncomingBadgeCount === "function") {
    window.updateIncomingBadgeCount();
  }
  if (typeof window.markAllIncomingAsViewed === "function") {
    window.markAllIncomingAsViewed();
  }
}

// Helper function to close the modal and reset its state
function closeModal() {
  const modal = document.getElementById("actionModal");
  modal.style.display = "none";
  const modalNotification = document.getElementById("modalNotification");
  modalNotification.style.display = "none";
  modalNotification.textContent = "";
  const modalCardSelect = document.getElementById("modalCardSelect");
  if (modalCardSelect) {
    modalCardSelect.value = "";
  }
  currentRequest = null;
}

/*
  loadIncomingTransactionHistory: loads all relevant transactions,
  filters them, sorts newest → oldest, and renders them in the bottom table.
  This function now includes both deposit and withdrawal transactions from Bank Users,
  with further filtering based on the "incoming" or "outgoing" dropdown.
 */
async function loadIncomingTransactionHistory() {
  const historyTbody = document.querySelector("#incomingHistoryTable tbody");
  if (!historyTbody) {
    console.error("No tbody found in #incomingHistoryTable");
    return;
  }
  historyTbody.innerHTML = "";
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  if (!currentUser || !currentUser.accountId) return;

  try {
    const res = await fetch(`/api/transaction?accountId=${currentUser.accountId}`);
    if (!res.ok) {
      console.error("Failed to fetch transaction history.");
      return;
    }
    let transactions = await res.json();

    // Deduplicate transactions by id
    transactions = transactions.filter((tx, index, self) =>
      index === self.findIndex(t => t.id === tx.id)
    );

    // Filter out external deposits/withdrawals
    transactions = transactions.filter(tx => {
      if (!tx.description) return true;
      return !tx.description.toLowerCase().includes("external deposit") &&
             !tx.description.toLowerCase().includes("external withdrawal");
    });

    // Keep only Bank Users transactions (deposits and withdrawals)
    const allowedTypes = [
      "deposit request", "requested deposit",
      "withdrawal request", "requested withdrawal", "rejected"
    ];
    transactions = transactions.filter(tx => {
      const t = tx.type.toLowerCase();
      return allowedTypes.includes(t);
    });

    // Apply filter based on dropdown selection
    const filterSelect = document.getElementById("transactionFilterSelect");
    const filterValue = filterSelect ? filterSelect.value : "all";
    if (filterValue === "incoming") {
      // Incoming:
      transactions = transactions.filter(tx => {
        const t = tx.type.toLowerCase();
        if (t === "requested deposit" || t === "withdrawal request") {
          return tx.accountId === currentUser.accountId;
        }
        if (t === "deposit request" || t === "requested withdrawal") {
          return false;
        }
        if (t === "rejected") {
          return tx.recipientAccountId === currentUser.accountId;
        }
        return false;
      });
    } else if (filterValue === "outgoing") {
      // Outgoing:
      transactions = transactions.filter(tx => {
        const t = tx.type.toLowerCase();
        if (t === "deposit request" || t === "requested withdrawal") {
          return tx.accountId === currentUser.accountId;
        }
        if (t === "requested deposit" || t === "withdrawal request") {
          return false;
        }
        if (t === "rejected") {
          return tx.fromAccountId === currentUser.accountId;
        }
        return false;
      });
    }
    // If "all" is selected, no additional filtering is applied.

    // Sort newest → oldest
    transactions.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return dateB - dateA;
    });

    if (transactions.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3">No transactions recorded.</td>`;
      historyTbody.appendChild(tr);
      return;
    }

    // Render each transaction
    transactions.forEach(tx => {
      const tr = document.createElement("tr");
      const amtString = parseFloat(tx.amount).toLocaleString();
      const finalDescription = buildRequestDescription({
        request: tx,
        currentUserId: currentUser.accountId,
        amountString: amtString
      });
      let statusText = tx.status + getTimeString(tx);
      tr.innerHTML = `
        <td>${formatDateTime(tx)}</td>
        <td>${finalDescription}</td>
        <td>${statusText}</td>
      `;
      historyTbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading transaction history:", error);
  }
}

/** Called when filter changes */
function setupFilterDropdown() {
  const filterSelect = document.getElementById("transactionFilterSelect");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      loadIncomingTransactionHistory();
    });
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initIncomingDeposits);