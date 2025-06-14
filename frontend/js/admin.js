// Global variables – data is fetched from the database (no localStorage)
var sampleUsers = [];        // Populated from /api/admin (each user has accountId)
var sampleCards = [];        // Populated from /api/admin (wallets)
var sampleTransactions = []; // Populated from /api/admin (transactions)
var currentUser = null;      // Currently selected user (by accountId)
var userSearchInput = null;  // Reference to the search input

// We'll store these so we can restore them after each fetch or operation.
let lastSearchValue = "";      // The accountId typed in the search box
let lastSelectedCard = "all";  // The currently chosen card in the dropdown

// Global status filter array (for our 5 check mark buttons)
window.selectedStatusFilters = [];

// Global current page for pagination in transaction table
let currentPage = 1;
const transactionsPerPage = 15;

window.initAdmin = function() {
  console.log("initAdmin called");
  fetchAdminDataAndRender();

  // Auto-close modals when clicking outside them
  window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        clearAndCloseModal(modal.id);
      }
    });
  });

  // Format deposit/withdraw inputs with commas
  const depositAmountInput = document.getElementById('depositAmount');
  if (depositAmountInput) {
    depositAmountInput.addEventListener('input', function() {
      depositAmountInput.value = formatWithCommas(depositAmountInput.value);
    });
  }
  const withdrawAmountInput = document.getElementById('withdrawAmount');
  if (withdrawAmountInput) {
    withdrawAmountInput.addEventListener('input', function() {
      withdrawAmountInput.value = formatWithCommas(withdrawAmountInput.value);
    });
  }
};

function fetchAdminDataAndRender() {
  fetch("/api/admin")
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch admin data");
      return res.json();
    })
    .then(data => {
      // Map backend data into our arrays
      sampleUsers = data.users.map(u => ({
        id: u.accountId,
        firstName: u.firstName,
        lastName: u.lastName,
        gender: u.gender,
        dob: (u.dob || "").split("T")[0],
        email: u.email,
        password: u.password || "N/A",
        suspended: u.suspended || false
      }));

      sampleCards = data.wallets.map(w => ({
        userId: w.accountId,
        cardNumber: w.cardNumber,
        cardHolderName: w.cardHolderName,
        cardType: w.cardType,
        expirationDate: w.expirationDate,
        cvv: w.cvv,
        balance: w.balance
      }));

      sampleTransactions = data.transactions.map(tx => {
        const lowerType = (tx.type || "").toLowerCase();
        const lowerDesc = (tx.description || "").toLowerCase();
        const isWithdrawal = lowerType.includes("withdraw") || lowerDesc.includes("withdraw");
        
        return {
          id: tx.id,
          userId: tx.accountId,
          fromAccountId: tx.fromAccountId || null,
          date: tx.date,
          createdAt: tx.createdAt,
          type: tx.type,
          amount: isWithdrawal ? -Math.abs(tx.amount) : Math.abs(tx.amount),
          cardNumber: tx.cardNumber,
          description: tx.description,
          status: tx.status
        };
      });
      

      // Reset pagination to page 1 after data reload
      currentPage = 1;

      // Initial rendering
      document.getElementById('total-users').textContent = sampleUsers.length;
      renderUserTable(sampleUsers);
      updateFinancialStats(sampleTransactions, null, sampleCards);
      renderTransactionTable(sampleTransactions);
      buildCardFilter(null, sampleCards, null);
      showAdminExtras(true);
      buildUserCardSelects(null, sampleCards);
      buildDeleteCardSelect(null, sampleCards);
      buildTransactionSelect(null, sampleTransactions);

      // Setup the status filter buttons in the transaction history header
      setupStatusFilters();

      // Set up search and card filter listeners if not set
      if (!userSearchInput) {
        userSearchInput = document.getElementById('userSearch');
        if (userSearchInput) {
          userSearchInput.addEventListener('input', handleSearchInput);
        }
      }
      const cardFilterSelect = document.getElementById('cardFilter');
      if (cardFilterSelect && !cardFilterSelect.onchange) {
        cardFilterSelect.addEventListener('change', handleCardFilterChange);
      }

      // Restore the last search + selected card
      restoreUIState();
    })
    .catch(err => {
      console.error("Error loading admin data:", err);
    });
}

function restoreUIState() {
  if (userSearchInput) {
    userSearchInput.value = lastSearchValue;
    handleSearchInput(false);
  }
  const cardFilterSelect = document.getElementById('cardFilter');
  if (cardFilterSelect) {
    const optionsValues = Array.from(cardFilterSelect.options).map(opt => opt.value);
    if (optionsValues.includes(lastSelectedCard)) {
      cardFilterSelect.value = lastSelectedCard;
    } else {
      cardFilterSelect.value = 'all';
    }
    handleCardFilterChange(false);
  }
}

/* Updated Search and Card Filter Functions
   For the admin view we want to show only the relevant side of a bank-user transaction.
   For transactions with types:
     "requested deposit", "deposit request", "requested withdrawal", "withdrawal request"
   we include the record only if tx.userId equals the searched user id.
   For other transaction types, we include if either tx.userId OR tx.fromAccountId equals the searched id.
*/

function handleSearchInput(saveState = true) {
  userSearchInput.value = userSearchInput.value.replace(/\D/g, '').slice(0, 9);
  const searchValue = userSearchInput.value.trim();
  if (saveState) {
    lastSearchValue = searchValue;
  }
  if (searchValue === "") {
    renderUserTable(sampleUsers);
    updateFinancialStats(sampleTransactions, null, sampleCards);
    renderTransactionTable(sampleTransactions);
    buildCardFilter(null, sampleCards, null);
    hideSelectedCard();
    showAdminExtras(true);
    buildUserCardSelects(null, sampleCards);
    buildDeleteCardSelect(null, sampleCards);
    buildTransactionSelect(null, sampleTransactions);
    currentUser = null;
    updateModalUserData(null);
    return;
  }
  if (searchValue.length !== 9) {
    renderUserTable([]);
    updateFinancialStats([], null, sampleCards);
    renderTransactionTable([]);
    buildCardFilter([], sampleCards, null);
    hideSelectedCard();
    showAdminExtras(false);
    buildUserCardSelects(null, sampleCards);
    buildDeleteCardSelect(null, sampleCards);
    buildTransactionSelect(null, sampleTransactions);
    currentUser = null;
    updateModalUserData(null);
    return;
  }
  const foundUser = sampleUsers.find(u => u.id.toString() === searchValue);
if (!foundUser) {
  renderUserTable([]);
  updateFinancialStats([], null, sampleCards);
  renderTransactionTable([]);
  buildCardFilter([], sampleCards, null);
  hideSelectedCard();
  showAdminExtras(false);
  buildUserCardSelects(null, sampleCards);
  buildDeleteCardSelect(null, sampleCards);
  buildTransactionSelect(null, sampleTransactions);
  currentUser = null;
  updateModalUserData(null);
} else {
  renderUserTable([foundUser]);

  // *** This part is the corrected and final implementation ***
  const userTx = sampleTransactions.filter(tx =>
    tx.userId.toString() === foundUser.id.toString()
  );

  const accountWallets = sampleCards.filter(c => c.userId.toString() === foundUser.id.toString());
  updateFinancialStats(userTx, foundUser.id, accountWallets);
  renderTransactionTable(userTx);
  buildCardFilter(null, sampleCards, foundUser.id);
  hideSelectedCard();
  showAdminExtras(true);
  buildUserCardSelects(foundUser.id, sampleCards);
  buildDeleteCardSelect(foundUser.id, sampleCards);
  buildTransactionSelect(foundUser.id, sampleTransactions);
  currentUser = foundUser;
  updateModalUserData(foundUser);
 }
}

function handleCardFilterChange(saveState = true) {
  const searchValue = userSearchInput ? userSearchInput.value.trim() : "";
  let filteredUsers = sampleUsers;
  let filteredTx    = sampleTransactions;
  let accountId     = null;

  // --- 1) If there’s a user search, filter down to that user’s transactions ---
  if (searchValue) {
    const foundUser = sampleUsers.find(u => u.id.toString() === searchValue);
    if (!foundUser) {
      // no such user → clear everything
      renderUserTable([]);
      updateFinancialStats([], null, []);
      renderTransactionTable([]);
      hideSelectedCard();
      showAdminExtras(false);
      return;
    }
    filteredUsers = [foundUser];
    filteredTx = sampleTransactions.filter(tx => {
      const t = tx.type.toLowerCase();
      if (
        t === "requested deposit"    ||
        t === "deposit request"      ||
        t === "requested withdrawal" ||
        t === "withdrawal request"
      ) {
        // only recipient’s record
        return tx.userId.toString() === foundUser.id.toString();
      }
      // otherwise include if userId or fromAccountId matches
      return (
        tx.userId.toString() === foundUser.id.toString() ||
        (tx.fromAccountId || "").toString() === foundUser.id.toString()
      );
    });
    accountId = foundUser.id;
  }

  // --- 2) Now filter by card if it's not “all” ---
  const cardFilterSelect = document.getElementById('cardFilter');
  if (!cardFilterSelect) return;
  const selectedCard = cardFilterSelect.value;
  if (saveState) lastSelectedCard = selectedCard;

  if (selectedCard && selectedCard !== 'all') {
    const want = selectedCard.replace(/\s/g, '');
    filteredTx = filteredTx.filter(tx => {
      const have = (tx.cardNumber || '').toString().replace(/\s/g, '');
      return have === want;
    });
  }

  // --- 3) Re-render everything ---
  renderUserTable(filteredUsers);

  // Which cards go into the stats box?
  let accountCards;
  if (selectedCard && selectedCard !== 'all') {
    const want = selectedCard.replace(/\s/g, '');
    accountCards = sampleCards.filter(c => c.cardNumber.toString().replace(/\s/g, '') === want);
  } else if (accountId) {
    accountCards = sampleCards.filter(c => c.userId.toString() === accountId.toString());
  } else {
    accountCards = sampleCards;
  }

  updateFinancialStats(filteredTx, accountId, accountCards);
  renderTransactionTable(filteredTx);
  showAdminExtras(true);

  // Show or hide the “selected card” detail panel
  if (selectedCard && selectedCard !== 'all') {
    const want = selectedCard.replace(/\s/g, '');
    const card = sampleCards.find(c => c.cardNumber.toString().replace(/\s/g, '') === want);
    card ? renderSelectedCard(card) : hideSelectedCard();
  } else {
    hideSelectedCard();
  }
}

function setupStatusFilters() {
  const header = document.getElementById('transactionHistoryHeader');
  if (!header) return;

  header.innerHTML = `
    Transaction History
    <span class="status-filter check-button" data-filter="all">All</span>
    <span class="status-filter check-button" data-filter="incoming">Incoming</span>
    <span class="status-filter check-button" data-filter="outgoing">Outgoing</span>
    <span class="status-filter check-button" data-filter="pending">Pending</span>
    <span class="status-filter check-button" data-filter="rejected">Rejected</span>
  `;

  window.selectedStatusFilters = [];

  const filters = header.querySelectorAll('.status-filter');
  filters.forEach(f => {
    f.addEventListener('click', function() {
      const filterVal = this.getAttribute('data-filter');
      if (filterVal === "all") {
        window.selectedStatusFilters = [];
        filters.forEach(el => el.classList.remove('active'));
        this.classList.add('active');
      } else {
        const allEl = header.querySelector('[data-filter="all"]');
        if (allEl) allEl.classList.remove('active');
        const index = window.selectedStatusFilters.indexOf(filterVal);
        if (index > -1) {
          window.selectedStatusFilters.splice(index, 1);
          this.classList.remove('active');
        } else {
          window.selectedStatusFilters.push(filterVal);
          this.classList.add('active');
        }
        if (window.selectedStatusFilters.length === 0 && allEl) {
          allEl.classList.add('active');
        }
      }

      // Start with the current user's transactions subset
      let userTx = getCurrentUserTransactions();

      // Apply the status filters using getTransactionDirection
      if (window.selectedStatusFilters.length > 0) {
        userTx = userTx.filter(tx => {
          const direction = getTransactionDirection(tx);
          const txStatus = (tx.status || "").toLowerCase();
          return window.selectedStatusFilters.some(f => {
            if (f === "incoming" || f === "outgoing") {
              return direction === f;
            } else {
              return txStatus === f;
            }
          });
        });
      }

      currentPage = 1; // Reset pagination
      renderTransactionTable(userTx);
    });
  });

  // Ensure "all" is active by default if no filter is selected
  const allEl = header.querySelector('[data-filter="all"]');
  if (allEl) {
    allEl.classList.add('active');
  }
}

// --- Duplicates removed below ---
// Only the newest version of each duplicate function is kept.

function reRenderUserTable() {
  if (!userSearchInput) {
    renderUserTable(sampleUsers);
    return;
  }
  const searchValue = userSearchInput.value.trim();
  if (!searchValue) {
    renderUserTable(sampleUsers);
  } else {
    const foundUser = sampleUsers.find(u => u.id.toString() === searchValue);
    if (!foundUser) {
      renderUserTable([]);
    } else {
      renderUserTable([foundUser]);
    }
  }
}

function formatWithCommas(inputValue) {
  let raw = inputValue.replace(/\D/g, '');
  if (!raw) return '';
  let asNumber = Number(raw);
  return asNumber.toLocaleString('en-US');
}

function renderUserTable(users) {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  tbody.innerHTML = users.map(user => `
    <tr class="${user.suspended ? 'suspended-user' : 'active-user'}">
      <td>${user.id}</td>
      <td>${user.firstName}</td>
      <td>${user.lastName}</td>
      <td>${user.gender}</td>
      <td>${user.dob}</td>
      <td>${user.email}</td>
      <td>${user.password}</td>
    </tr>
  `).join('');
}

// MONEY OPERATIONS
function depositMoney() {
  const notify = document.getElementById("depositNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  const card = document.getElementById("depositCardSelect").value;
  const amountStr = document.getElementById("depositAmount").value;
  const raw = amountStr.replace(/,/g, '');
  const amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) {
    notify.textContent = "Please enter a valid deposit amount.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      accountId: currentUser.id,
      cardNumber: card,
      depositAmount: amount
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to deposit money");
    return res.json();
  })
  .then(result => {
    notify.textContent = `Deposited $${amount.toLocaleString('en-US')} successfully!`;
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error(err);
    notify.textContent = "Error depositing money.";
  });
}

function withdrawMoney() {
  const notify = document.getElementById("withdrawNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  const card = document.getElementById("withdrawCardSelect").value;
  const amountStr = document.getElementById("withdrawAmount").value;
  const raw = amountStr.replace(/,/g, '');
  const amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) {
    notify.textContent = "Please enter a valid withdrawal amount.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId: currentUser.id,
      cardNumber: card,
      withdrawalAmount: amount
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to withdraw money");
    return res.json();
  })
  .then(result => {
    notify.textContent = `Withdrew $${amount.toLocaleString('en-US')} successfully!`;
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error(err);
    notify.textContent = "Error withdrawing money.";
  });
}

// Updated getTransactionDirection function
function getTransactionDirection(tx) {
  const status = (tx.status || "").toLowerCase();
  if (status === "pending")   return "pending";
  if (status === "rejected")  return "rejected";

  const lowerType = (tx.type || "").toLowerCase();
  if (lowerType === "deposit request")       return "outgoing";
  if (lowerType === "requested deposit")     return "incoming";
  if (lowerType === "requested withdrawal")  return "outgoing";
  if (lowerType === "withdrawal request")    return "incoming";

  return tx.amount < 0 ? "outgoing" : "incoming";
}

// Updated renderTransactionTable function with fixed filtering logic
function renderTransactionTable(transactions) {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;

  // Deduplicate transactions by id.
  const uniqueTransactions = transactions.filter((tx, index, self) =>
    index === self.findIndex(t => t.id === tx.id)
  );

  // Sort transactions from newest to oldest.
  uniqueTransactions.sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date);
    const dateB = new Date(b.createdAt || b.date);
    return dateB - dateA;
  });

  /* Filtering logic:
     If "incoming" filter is active, only include transactions that are incoming and completed.
     - If "outgoing" filter is active, only include transactions that are outgoing (all statuses).
     - Any additional status filters (if present) are applied as an exact match.
  */
  let filteredTx = uniqueTransactions.filter(tx => {
    const direction = getTransactionDirection(tx);
    const txStatus = (tx.status || "").toLowerCase();
    // If "incoming" is selected, require incoming AND completed.
    if (window.selectedStatusFilters.includes("incoming") && !(direction === "incoming" && txStatus === "completed")) {
      return false;
    }
    // If "outgoing" is selected, require outgoing.
    if (window.selectedStatusFilters.includes("outgoing") && direction !== "outgoing") {
      return false;
    }
    // For any other status filters, ensure tx.status exactly matches.
    const otherFilters = window.selectedStatusFilters.filter(f => f !== "incoming" && f !== "outgoing");
    if (otherFilters.length > 0 && !otherFilters.includes(txStatus)) {
      return false;
    }
    return true;
  });

  // Pagination: Calculate indices for the current page.
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const pageTx = filteredTx.slice(startIndex, endIndex);

  // Build table rows.
  tbody.innerHTML = pageTx.map(tx => {
    const lowerType = tx.type.toLowerCase();
    const lowerDesc = (tx.description || "").toLowerCase();
    let isExpense, typeString, origin, direction;

    if (lowerDesc.includes("admin deposit") || lowerType.includes("admin deposit")) {
      typeString = "Admin Deposit";
      isExpense = false;
    } else if (lowerDesc.includes("admin withdrawal") || lowerType.includes("admin withdrawal")) {
      typeString = "Admin Withdrawal";
      isExpense = true;
    } else if (lowerType === "deposit request") {
      typeString = "Withdrawal"; // Payer's record for deposit.
      isExpense = true;
    } else if (lowerType === "requested deposit") {
      typeString = "Deposit"; // Recipient's record.
      isExpense = false;
    } else if (lowerType === "requested withdrawal") {
      typeString = "Withdrawal";
      isExpense = true;
    } else if (lowerType === "withdrawal request") {
      typeString = "Deposit"; // Recipient's record is flipped.
      isExpense = false;
    } else if (lowerType.includes("withdraw")) {
      typeString = "Withdrawal";
      isExpense = true;
    } else if (lowerType.includes("deposit")) {
      typeString = "Deposit";
      isExpense = false;
    } else {
      isExpense = (parseFloat(tx.amount) < 0);
      typeString = isExpense ? "Withdrawal" : "Deposit";
    }

    // Determine origin and direction.
    if (lowerDesc.includes("admin deposit") || lowerType.includes("admin deposit")) {
      origin = "Admin";
      direction = "Deposit";
    } else if (lowerDesc.includes("admin withdrawal") || lowerType.includes("admin withdrawal")) {
      origin = "Admin";
      direction = "Withdrawal";
    } else if (lowerType === "deposit request") {
      origin = "Bank Users";
      direction = "Outgoing";
    } else if (lowerType === "requested deposit") {
      origin = "Bank Users";
      direction = "Incoming";
    } else if (lowerType === "requested withdrawal") {
      origin = "Bank Users";
      direction = "Outgoing";
    } else if (lowerType === "withdrawal request") {
      origin = "Bank Users";
      direction = "Incoming";
    } else {
      origin = (!tx.fromAccountId) ? "Out of Bank Users" : "Bank Users";
      direction = tx.amount < 0 ? "Outgoing" : "Incoming";
    }

    const rowClass = isExpense ? 'row-expense' : 'row-income';
    const displayAmount = `$${Math.abs(tx.amount).toLocaleString('en-US')}`;
    const dateTimeStr = formatDateTime(tx);
    const colorStyle = isExpense ? 'style="color: #dc3545;"' : 'style="color: #28a745;"';
    const customDesc = `<span ${colorStyle}>${origin} (${direction}) transaction "${tx.status}"</span>`;

    return `
      <tr class="${rowClass}">
        <td>${dateTimeStr}</td>
        <td>${typeString}</td>
        <td>${displayAmount}</td>
        <td>${maskCardNumber(tx.cardNumber)}</td>
        <td>${customDesc}</td>
      </tr>
    `;
  }).join('');

  // Render pagination buttons
  const paginationContainer = document.getElementById('paginationContainer');
  if (paginationContainer) {
    paginationContainer.innerHTML = "";
    const totalTransactions = filteredTx.length;
    const totalPages = Math.ceil(totalTransactions / transactionsPerPage);

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    if (currentPage === 1) {
      prevBtn.disabled = true;
    }
    prevBtn.addEventListener("click", function() {
      if (currentPage > 1) {
        currentPage--;
        renderTransactionTable(transactions);
      }
    });
    paginationContainer.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) {
        btn.disabled = true;
      }
      btn.addEventListener("click", function() {
        currentPage = i;
        renderTransactionTable(transactions);
      });
      paginationContainer.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    if (currentPage === totalPages) {
      nextBtn.disabled = true;
    }
    nextBtn.addEventListener("click", function() {
      if (currentPage < totalPages) {
        currentPage++;
        renderTransactionTable(transactions);
      }
    });
    paginationContainer.appendChild(nextBtn);
  }
}

function buildCardFilter(transactions, cards, accountId) {
  const cardFilterSelect = document.getElementById('cardFilter');
  if (!cardFilterSelect) return;
  cardFilterSelect.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All Cards';
  allOption.style.background = '#1e293b';
  allOption.style.color = '#ffffff';
  cardFilterSelect.appendChild(allOption);

  let relevantCards = accountId ? cards.filter(c => c.userId.toString() === accountId.toString()) : cards;
  relevantCards.forEach(card => {
    const option = document.createElement('option');
    option.value = card.cardNumber;
    option.textContent = `${card.cardType} – $${card.balance.toLocaleString('en-US')} (••••${card.cardNumber.slice(-4)})`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    cardFilterSelect.appendChild(option);
  });

  cardFilterSelect.value = 'all';
}

function maskCardNumber(cardNum) {
  if (!cardNum) return cardNum;
  return cardNum.match(/.{1,4}/g).join(' ');
}

function updateFinancialStats(transactions, accountId, cards) {
  let totalBalance = 0;
  cards.forEach(card => { totalBalance += card.balance; });

  let totalIncome = 0, totalExpenses = 0;
  transactions.forEach(tx => {
    if (tx.amount >= 0) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += Math.abs(tx.amount);
    }
  });
  

  document.getElementById('visa-count').textContent = cards.filter(c => c.cardNumber.startsWith('4')).length;
  document.getElementById('master-count').textContent = cards.filter(c => c.cardNumber.startsWith('5')).length;
  document.getElementById('total-balance').textContent = `$${totalBalance.toLocaleString('en-US')}`;
  document.getElementById('total-income').textContent = `$${totalIncome.toLocaleString('en-US')}`;
  document.getElementById('total-expenses').textContent = `$${totalExpenses.toLocaleString('en-US')}`;
}

function showAdminExtras(shouldShow) {
  const adminExtras = document.getElementById('adminExtras');
  if (!adminExtras) return;
  adminExtras.style.display = shouldShow ? 'block' : 'none';
}

function renderSelectedCard(card) {
  const selectedCardDiv = document.getElementById('selectedCard');
  const infoDiv = document.getElementById('selectedCardInfo');
  if (!selectedCardDiv || !infoDiv) return;

  selectedCardDiv.style.display = 'block';
  infoDiv.innerHTML = `
    <div class="card-details">
      <p><strong>Card Type:</strong> ${card.cardType}</p>
      <p><strong>Cardholder:</strong> ${card.cardHolderName}</p>
      <p><strong>Number:</strong> ${maskCardNumber(card.cardNumber)}</p>
      <p><strong>Expires:</strong> ${card.expirationDate}</p>
      <p><strong>CVV:</strong> ${card.cvv}</p>
      <p><strong>Balance:</strong> $${card.balance.toLocaleString('en-US')}</p>
    </div>
  `;
}

function hideSelectedCard() {
  const selectedCardDiv = document.getElementById('selectedCard');
  if (selectedCardDiv) selectedCardDiv.style.display = 'none';
}

function buildUserCardSelects(accountId, allCards) {
  const depositSelect = document.getElementById('depositCardSelect');
  const withdrawSelect = document.getElementById('withdrawCardSelect');
  if (!depositSelect || !withdrawSelect) return;

  depositSelect.innerHTML = '';
  withdrawSelect.innerHTML = '';

  const depositPlaceholder = document.createElement('option');
  depositPlaceholder.value = '';
  depositPlaceholder.textContent = 'All Cards';
  depositPlaceholder.disabled = true;
  depositPlaceholder.selected = true;
  depositPlaceholder.style.background = '#1e293b';
  depositPlaceholder.style.color = '#ffffff';
  depositSelect.appendChild(depositPlaceholder);

  const withdrawPlaceholder = document.createElement('option');
  withdrawPlaceholder.value = '';
  withdrawPlaceholder.textContent = 'All Cards';
  withdrawPlaceholder.disabled = true;
  withdrawPlaceholder.selected = true;
  withdrawPlaceholder.style.background = '#1e293b';
  withdrawPlaceholder.style.color = '#ffffff';
  withdrawSelect.appendChild(withdrawPlaceholder);

  let relevantCards = accountId ? allCards.filter(c => c.userId.toString() === accountId.toString()) : allCards;
  relevantCards.forEach(card => {
    const opt1 = document.createElement('option');
    opt1.value = card.cardNumber;
    opt1.textContent = `${card.cardType} – $${card.balance.toLocaleString('en-US')} (••••${card.cardNumber.slice(-4)})`;
    opt1.style.background = '#1e293b';
    opt1.style.color = '#ffffff';
    depositSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = card.cardNumber;
    opt2.textContent = `${card.cardType} – $${card.balance.toLocaleString('en-US')} (••••${card.cardNumber.slice(-4)})`;
    opt2.style.background = '#1e293b';
    opt2.style.color = '#ffffff';
    withdrawSelect.appendChild(opt2);
  });
}

function buildDeleteCardSelect(accountId, cards) {
  const deleteCardSelect = document.getElementById("deleteCardSelect");
  if (!deleteCardSelect) return;
  deleteCardSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Cards';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  defaultOption.style.background = '#1e293b';
  defaultOption.style.color = '#ffffff';
  deleteCardSelect.appendChild(defaultOption);

  let userCards = accountId ? cards.filter(c => c.userId.toString() === accountId.toString()) : cards;
  userCards.forEach(card => {
    const option = document.createElement('option');
    option.value = card.cardNumber;
    option.textContent = `${card.cardType} – $${card.balance.toLocaleString('en-US')} (••••${card.cardNumber.slice(-4)})`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    deleteCardSelect.appendChild(option);
  });
}

function buildTransactionSelect(accountId, transactions) {
  const transactionSelect = document.getElementById('transactionSelect');
  if (!transactionSelect) return;
  transactionSelect.innerHTML = '';
  let userTx = accountId ? transactions.filter(tx => 
      tx.userId.toString() === accountId.toString() ||
      (tx.fromAccountId && tx.fromAccountId.toString() === accountId.toString())
    ) : transactions;
  userTx.forEach(tx => {
    const key = tx.date + "_" + tx.cardNumber;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${tx.type} $${Math.abs(tx.amount).toLocaleString('en-US')} on ${tx.date}`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    transactionSelect.appendChild(option);
  });
}

function clearAndCloseModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const inputs = modal.querySelectorAll("input, textarea, select");
  inputs.forEach(input => { input.value = ""; });
  const notifications = modal.querySelectorAll(".modal-notification");
  notifications.forEach(n => n.textContent = "");
  modal.style.display = "none";
}

function switchModal(currentModalId, targetModalId) {
  clearAndCloseModal(currentModalId);
  openModal(targetModalId);
}

function openModal(modalId) {
  let modal = document.getElementById(modalId);
  if (!modal) return;
  if (modalId === "deleteModal") {
    resetDeleteModal();
  }
  if (currentUser) {
    let spans = modal.querySelectorAll("span[id^='currentUserId']");
    spans.forEach(span => {
      span.textContent = currentUser.id;
    });
    let emailEl = modal.querySelector("#currentEmail");
    if (emailEl) emailEl.textContent = currentUser.email;
    let passEl = modal.querySelector("#currentPassword");
    if (passEl) passEl.textContent = currentUser.password;
    if (modalId === "deleteModal") {
      buildDeleteCardSelect(currentUser.id, sampleCards);
    }
  }
  modal.style.display = "block";
}

function resetDeleteModal() {
  const deleteCardSection = document.getElementById("deleteCardSection");
  const deleteMainButtons = document.getElementById("deleteMainButtons");
  if (deleteCardSection) {
    deleteCardSection.style.display = "none";
  }
  if (deleteMainButtons) {
    deleteMainButtons.style.display = "block";
  }
}

function showDeleteCardSection() {
  document.getElementById("deleteCardSection").style.display = "block";
  document.getElementById("deleteMainButtons").style.display = "none";
  if (currentUser) {
    buildDeleteCardSelect(currentUser.id, sampleCards);
  }
}

function backDeleteSection() {
  document.getElementById("deleteCardSection").style.display = "none";
  document.getElementById("deleteMainButtons").style.display = "block";
}

function openSuspendReactivateModal() {
  let modal = document.getElementById('suspendReactivateModal');
  if (!modal) return;
  openModal('suspendReactivateModal');
  const statusDiv = document.getElementById('accountStatus');
  if (currentUser && currentUser.suspended) {
    statusDiv.textContent = "Account is currently suspended. Do you want to reactivate it?";
    document.getElementById("toggleAccountBtn").textContent = "Reactivate Account";
  } else {
    statusDiv.textContent = "Account is active. Do you want to suspend it?";
    document.getElementById("toggleAccountBtn").textContent = "Suspend Account";
  }
  const suspendCardSelect = document.getElementById('suspendCardSelect');
  suspendCardSelect.innerHTML = '';
  let relevantCards = currentUser ? sampleCards.filter(c => c.userId.toString() === currentUser.id.toString()) : [];
  
  let defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a card';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  defaultOption.style.background = '#1e293b';
  defaultOption.style.color = '#ffffff';
  suspendCardSelect.appendChild(defaultOption);
  
  relevantCards.forEach(card => {
    const option = document.createElement('option');
    option.value = card.cardNumber;
    option.textContent = `${card.cardType} – $${card.balance.toLocaleString('en-US')} (••••${card.cardNumber.slice(-4)})`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    suspendCardSelect.appendChild(option);
  });
  
  document.getElementById("txHistory").innerHTML = "";
  document.getElementById("transactionManagementSection").style.display = "none";
}

function onSuspendCardChange() {
  const suspendCardSelect = document.getElementById('suspendCardSelect');
  const selectedCard = suspendCardSelect.value;
  const txManagementSection = document.getElementById("transactionManagementSection");
  const txHistoryDiv = document.getElementById("txHistory");

  if (!selectedCard) {
    txManagementSection.style.display = "none";
    if (txHistoryDiv) txHistoryDiv.innerHTML = "";
    return;
  }
  let cardTx = sampleTransactions.filter(tx => tx.cardNumber === selectedCard && tx.userId.toString() === currentUser.id.toString());
  if (txHistoryDiv) {
    if (cardTx.length === 0) {
      txHistoryDiv.innerHTML = "<p>No transactions for this card.</p>";
    } else {
      let historyHtml = "<ul style='padding-left:20px;'>";
      cardTx.forEach(tx => {
        historyHtml += `<li>${tx.date} - ${tx.type} - $${Math.abs(tx.amount).toLocaleString('en-US')}</li>`;
      });
      historyHtml += "</ul>";
      txHistoryDiv.innerHTML = historyHtml;
    }
  }
  const suspendSection = document.getElementById("suspendSection");
  const reactivateSection = document.getElementById("reactivateSection");
  if (suspendSection) suspendSection.style.display = "none";
  if (reactivateSection) reactivateSection.style.display = "none";

  let actionButtonsDiv = document.getElementById("actionButtons");
  if (!actionButtonsDiv) {
    actionButtonsDiv = document.createElement("div");
    actionButtonsDiv.id = "actionButtons";
    actionButtonsDiv.className = "buttons-row";
    actionButtonsDiv.style.marginTop = "10px";
    txHistoryDiv.parentNode.insertBefore(actionButtonsDiv, txHistoryDiv.nextSibling);
  }
  actionButtonsDiv.innerHTML = "";

  const btnSuspend = document.createElement("button");
  btnSuspend.textContent = "Suspend Transaction";
  btnSuspend.className = "option-btn";
  btnSuspend.onclick = function() {
    showSuspendTxSection(selectedCard);
  };
  actionButtonsDiv.appendChild(btnSuspend);

  const btnReactivate = document.createElement("button");
  btnReactivate.textContent = "Reactivate Transaction";
  btnReactivate.className = "option-btn";
  btnReactivate.onclick = function() {
    showReactivateTxSection(selectedCard);
  };
  actionButtonsDiv.appendChild(btnReactivate);

  txManagementSection.style.display = "block";
}

function showSuspendTxSection(selectedCard) {
  const suspendSection = document.getElementById("suspendSection");
  const reactivateSection = document.getElementById("reactivateSection");
  if (suspendSection) suspendSection.style.display = "block";
  if (reactivateSection) reactivateSection.style.display = "none";

  const suspendTxSelect = document.getElementById("suspendTxSelect");
  const notify = document.getElementById("suspendReactivateNotification");
  if (!suspendTxSelect) return;
  suspendTxSelect.innerHTML = "";

  // Filter out transactions that are already suspended, and exclude those with status "pending" or "rejected"
  let txForSuspend = sampleTransactions.filter(tx =>
    tx.cardNumber === selectedCard &&
    tx.userId.toString() === currentUser.id.toString() &&
    !tx.type.toLowerCase().includes("suspended") &&
    !["pending", "rejected"].includes((tx.status || "").trim().toLowerCase())
  );

  if (txForSuspend.length === 0) {
    suspendTxSelect.innerHTML = "<option>No transactions available for suspension.</option>";
    notify.textContent = "";
    return;
  }

  let defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Choose a transaction to suspend";
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  suspendTxSelect.appendChild(defaultOpt);

  txForSuspend.forEach(tx => {
    const option = document.createElement("option");
    option.value = tx.id;
    option.textContent = `${tx.type} - $${Math.abs(tx.amount).toLocaleString('en-US')} on ${tx.date}`;
    suspendTxSelect.appendChild(option);
  });
  notify.textContent = "";
}

function showReactivateTxSection(selectedCard) {
  const suspendSection = document.getElementById("suspendSection");
  const reactivateSection = document.getElementById("reactivateSection");
  if (suspendSection) suspendSection.style.display = "none";
  if (reactivateSection) reactivateSection.style.display = "block";

  const reactivateTxSelect = document.getElementById("reactivateTxSelect");
  const notify = document.getElementById("suspendReactivateNotification");
  if (!reactivateTxSelect) return;
  reactivateTxSelect.innerHTML = "";

  let txForReactivate = sampleTransactions.filter(tx =>
    tx.cardNumber === selectedCard &&
    tx.userId.toString() === currentUser.id.toString() &&
    tx.type.toLowerCase().includes("suspended")
  );

  if (txForReactivate.length === 0) {
    reactivateTxSelect.innerHTML = "<option>No transactions available for reactivation.</option>";
    notify.textContent = "";
    return;
  }

  let defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Choose a transaction to reactivate";
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  reactivateTxSelect.appendChild(defaultOpt);

  txForReactivate.forEach(tx => {
    const option = document.createElement("option");
    option.value = tx.id;
    option.textContent = `${tx.type} - $${Math.abs(tx.amount).toLocaleString('en-US')} on ${tx.date}`;
    reactivateTxSelect.appendChild(option);
  });
  notify.textContent = "";
}

function suspendSelectedTransaction() {
  const suspendTxSelect = document.getElementById("suspendTxSelect");
  const notify = document.getElementById("suspendReactivateNotification");
  if (!suspendTxSelect || suspendTxSelect.options.length === 0) {
    notify.textContent = "No transaction available for suspension.";
    return;
  }
  const selectedId = parseInt(suspendTxSelect.value, 10);
  if (!selectedId) {
    notify.textContent = "Please choose a transaction to suspend.";
    return;
  }

  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";

  fetch(`/api/admin/transaction/suspend`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId: selectedId })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to suspend transaction");
    return res.json();
  })
  .then(updatedTx => {
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
    setTimeout(() => { onSuspendCardChange(); }, 500);
  })
  .catch(err => {
    notify.textContent = "Error suspending transaction.";
    console.error(err);
  });
}

function reactivateSelectedTransaction() {
  const reactivateTxSelect = document.getElementById("reactivateTxSelect");
  const notify = document.getElementById("suspendReactivateNotification");
  if (!reactivateTxSelect || reactivateTxSelect.options.length === 0) {
    notify.textContent = "No transaction available for reactivation.";
    return;
  }
  const selectedId = parseInt(reactivateTxSelect.value, 10);
  if (!selectedId) {
    notify.textContent = "Please choose a transaction to reactivate.";
    return;
  }

  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";

  fetch(`/api/admin/transaction/reactivate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId: selectedId })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to reactivate transaction");
    return res.json();
  })
  .then(updatedTx => {
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
    setTimeout(() => { onSuspendCardChange(); }, 500);
  })
  .catch(err => {
    notify.textContent = "Error reactivating transaction.";
    console.error(err);
  });
}

function toggleAccountStatus() {
  const notify = document.getElementById("suspendReactivateNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";

  fetch(`/api/admin/user/suspend?accountId=${currentUser.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suspended: !currentUser.suspended })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to toggle account status");
    return res.json();
  })
  .then(updatedUser => {
    currentUser.suspended = updatedUser.suspended;
    let statusDiv = document.getElementById("accountStatus");
    if (currentUser.suspended) {
      statusDiv.textContent = "Account is now suspended.";
      document.getElementById("toggleAccountBtn").textContent = "Reactivate Account";
    } else {
      statusDiv.textContent = "Account is now active.";
      document.getElementById("toggleAccountBtn").textContent = "Suspend Account";
    }
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error("Error toggling account status:", err);
    notify.textContent = "Error toggling account status.";
  });
}

function updateModalUserData(user) {
  const ids = ["currentUserIdPI", "currentUserIdCE", "currentUserIdCP", "currentUserIdDA", "currentUserIdSA", "currentUserIdST", "currentUserIdDC", "currentUserIdD", "currentUserIdW"];
  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.textContent = user ? user.id : "N/A";
  });
  let emailEl = document.getElementById("currentEmail");
  if (emailEl) emailEl.textContent = user ? user.email : "N/A";
  let passEl = document.getElementById("currentPassword");
  if (passEl) passEl.textContent = user ? user.password : "N/A";
}

function updateEmail() {
  const newEmail = document.getElementById("newEmail").value.trim();
  const emailNotification = document.getElementById("emailNotification");
  if (!newEmail) {
    emailNotification.textContent = "New Email cannot be empty.";
    return;
  }
  if (!newEmail.includes("@")) {
    emailNotification.textContent = "New Email must contain '@'.";
    return;
  }
  if (!currentUser) {
    emailNotification.textContent = "No user selected.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/user?accountId=${currentUser.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: newEmail })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to update email");
    return res.json();
  })
  .then(updatedUser => {
    currentUser.email = updatedUser.email;
    emailNotification.textContent = "Email updated successfully!";
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error(err);
    emailNotification.textContent = "Error updating email.";
  });
}

function updatePassword() {
  const newPass = document.getElementById("newPassword").value.trim();
  const passwordNotification = document.getElementById("passwordNotification");
  if (!newPass) {
    passwordNotification.textContent = "New Password cannot be empty.";
    return;
  }
  if (!currentUser) {
    passwordNotification.textContent = "No user selected.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/user?accountId=${currentUser.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPass })
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to update password");
    return res.json();
  })
  .then(updatedUser => {
    currentUser.password = updatedUser.password;
    passwordNotification.textContent = "Password updated successfully!";
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error(err);
    passwordNotification.textContent = "Error updating password.";
  });
}

function deleteUserCard() {
  const notify = document.getElementById("deleteNotification");
  const deleteCardSelect = document.getElementById("deleteCardSelect");
  const card = deleteCardSelect.value;
  if (!card) {
    notify.textContent = "No card selected. Please choose a card to delete.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/card?cardNumber=${card}`, {
    method: "DELETE"
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to delete card");
    return res.json();
  })
  .then(result => {
    notify.textContent = "Card deleted successfully!";
    lastSearchValue = oldSearchValue;
    lastSelectedCard = oldSelectedCard;
    fetchAdminDataAndRender();
  })
  .catch(err => {
    console.error(err);
    notify.textContent = "Error deleting card.";
  });
}

function deleteUserAccount() {
  const notify = document.getElementById("deleteNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  const oldSearchValue = userSearchInput ? userSearchInput.value : "";
  const cardFilterSelect = document.getElementById("cardFilter");
  const oldSelectedCard = cardFilterSelect ? cardFilterSelect.value : "all";
  fetch(`/api/admin/user?accountId=${currentUser.id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to delete user account");
    return res.json();
  })
  .then(result => {
    notify.textContent = "User account and all associated data deleted successfully!";
    currentUser = null;
    if (userSearchInput) {
      userSearchInput.value = "";
    }
    clearModalUserData();
    lastSearchValue = "";
    lastSelectedCard = "all";
    return fetch("/api/admin");
  })
  .then(res => res.json())
  .then(data => {
    fetchAdminDataAndRender();
    setTimeout(function() { clearAndCloseModal("deleteModal"); }, 1000);
  })
  .catch(err => {
    console.error(err);
    notify.textContent = "Error deleting user account.";
  });
}

function clearModalUserData() {
  const ids = ["currentUserIdPI", "currentUserIdCE", "currentUserIdCP", "currentUserIdDA", "currentUserIdSA", "currentUserIdST", "currentUserIdDC", "currentUserIdD", "currentUserIdW"];
  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.textContent = "N/A";
  });
  let emailEl = document.getElementById("currentEmail");
  if (emailEl) emailEl.textContent = "N/A";
  let passEl = document.getElementById("currentPassword");
  if (passEl) passEl.textContent = "N/A";
}

function formatDateTime(tx) {
  const raw = tx.createdAt ? tx.createdAt : tx.date;
  const dateObj = new Date(raw);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${year}-${month}-${day} (at ${timeStr})`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

function getCurrentUserTransactions() {
  // If no user is currently searched or found, return all
  if (!currentUser) return sampleTransactions;

  // Filter for the user the same way you do in handleSearchInput()
  return sampleTransactions.filter(tx => {
    const lowerType = tx.type.toLowerCase();
    if (
      lowerType === "requested deposit" ||
      lowerType === "deposit request" ||
      lowerType === "requested withdrawal" ||
      lowerType === "withdrawal request"
    ) {
      // Bank-user transactions → only if tx.userId == currentUser.id
      return tx.userId.toString() === currentUser.id.toString();
    } else {
      // Otherwise include if userId == currentUser.id OR fromAccountId == currentUser.id
      return (
        tx.userId.toString() === currentUser.id.toString() ||
        (tx.fromAccountId && tx.fromAccountId.toString() === currentUser.id.toString())
      );
    }
  });
}

