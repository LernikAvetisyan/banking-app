// frontend/admin.js

// Global variables for admin section
var sampleUsers = [];
var sampleCards = [];
var sampleTransactions = [];
var currentUser = null;
var userSearchInput = null;

// Helper: Format a date string (YYYY-MM-DD) from a date value
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

window.initAdmin = async function() {
  try {
    // Fetch users, wallets, and transactions concurrently
    const [usersRes, walletsRes, transactionsRes] = await Promise.all([
      fetch("http://localhost:3000/api/admin/users"),
      fetch("http://localhost:3000/api/wallet"),
      fetch("http://localhost:3000/api/transactions")
    ]);
    // Expecting JSON arrays from each endpoint
    const usersData = await usersRes.json();
    sampleUsers = Array.isArray(usersData) ? usersData : [];

    const walletsData = await walletsRes.json();
    sampleCards = Array.isArray(walletsData) ? walletsData : [];

    const transactionsData = await transactionsRes.json();
    sampleTransactions = Array.isArray(transactionsData) ? transactionsData : [];
  } catch (err) {
    console.error("Error fetching admin data:", err);
    sampleUsers = [];
    sampleCards = [];
    sampleTransactions = [];
  }

  // Initial rendering using fetched data
  document.getElementById('total-users').textContent = sampleUsers.length;
  renderUserTable(sampleUsers);
  updateFinancialStats(sampleTransactions, null, sampleCards);
  renderTransactionTable(sampleTransactions);
  buildCardFilter(sampleTransactions, sampleCards);
  showAdminExtras(true);
  buildUserCardSelects(null, sampleCards);
  buildDeleteCardSelect(null, sampleCards);
  buildTransactionSelect(null, sampleTransactions);

  userSearchInput = document.getElementById('userSearch');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', handleSearchInput);
  }

  const cardFilterSelect = document.getElementById('cardFilter');
  if (cardFilterSelect) {
    cardFilterSelect.addEventListener('change', handleCardFilterChange);
  }

  // Auto-close modals on clicking outside modal-content
  window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        clearAndCloseModal(modal.id);
      }
    });
  });

  // Auto-format deposit and withdraw amount inputs with commas
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

function handleSearchInput() {
  const searchValue = userSearchInput.value.trim();
  if (!searchValue) {
    renderUserTable(sampleUsers);
    updateFinancialStats(sampleTransactions, null, sampleCards);
    renderTransactionTable(sampleTransactions);
    buildCardFilter(sampleTransactions, sampleCards);
    hideSelectedCard();
    showAdminExtras(true);
    buildUserCardSelects(null, sampleCards);
    buildDeleteCardSelect(null, sampleCards);
    buildTransactionSelect(null, sampleTransactions);
    currentUser = null;
    return;
  }
  const foundUser = sampleUsers.find(u => u.id.toString() === searchValue);
  if (!foundUser) {
    renderUserTable([]);
    updateFinancialStats([], null, sampleCards);
    renderTransactionTable([]);
    buildCardFilter([], sampleCards);
    hideSelectedCard();
    showAdminExtras(false);
    buildUserCardSelects(null, sampleCards);
    buildDeleteCardSelect(null, sampleCards);
    buildTransactionSelect(null, sampleTransactions);
    currentUser = null;
  } else {
    renderUserTable([foundUser]);
    const userTx = sampleTransactions.filter(tx => tx.userId === foundUser.id);
    updateFinancialStats(userTx, foundUser.id, sampleCards);
    renderTransactionTable(userTx);
    buildCardFilter(userTx, sampleCards);
    hideSelectedCard();
    showAdminExtras(true);
    buildUserCardSelects(foundUser.id, sampleCards);
    buildDeleteCardSelect(foundUser.id, sampleCards);
    buildTransactionSelect(foundUser.id, sampleTransactions);
    currentUser = foundUser;
    updateModalUserData(foundUser);
  }
}

function updateModalUserData(user) {
  // Use accountId instead of the numeric id for display
  const ids = ["currentUserIdPI", "currentUserIdCE", "currentUserIdCP", "currentUserIdDA", "currentUserIdSA", "currentUserIdST", "currentUserIdDC", "currentUserIdD", "currentUserIdW"];
  ids.forEach(id => {
    let el = document.getElementById(id);
    if (el) el.textContent = user.accountId || user.id;
  });
  let emailEl = document.getElementById("currentEmail");
  if (emailEl) emailEl.textContent = user.email;
  let passEl = document.getElementById("currentPassword");
  if (passEl) passEl.textContent = user.password;
}

function handleCardFilterChange() {
  const searchValue = userSearchInput ? userSearchInput.value.trim() : "";
  let filteredUsers = sampleUsers;
  let filteredTx = sampleTransactions;
  let userId = null;
  if (searchValue) {
    const foundUser = sampleUsers.find(u => u.id.toString() === searchValue);
    if (!foundUser) return;
    filteredUsers = [foundUser];
    filteredTx = sampleTransactions.filter(tx => tx.userId === foundUser.id);
    userId = foundUser.id;
  }
  const cardFilterSelect = document.getElementById('cardFilter');
  if (!cardFilterSelect) return;
  const selectedCard = cardFilterSelect.value;
  if (selectedCard !== 'all') {
    filteredTx = filteredTx.filter(tx => tx.cardNumber === selectedCard);
  }
  renderUserTable(filteredUsers);
  updateFinancialStats(filteredTx, userId, sampleCards);
  renderTransactionTable(filteredTx);
  if (filteredTx.length === 0) {
    showAdminExtras(false);
    hideSelectedCard();
    return;
  } else {
    showAdminExtras(true);
  }
  if (selectedCard === 'all') {
    hideSelectedCard();
  } else {
    const foundCard = sampleCards.find(c => c.cardNumber === selectedCard);
    if (foundCard) {
      renderSelectedCard(foundCard);
    } else {
      hideSelectedCard();
    }
  }
}

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

// --- Rendering Functions ---
function renderUserTable(users) {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.accountId || user.id}</td>
      <td>${user.firstName}</td>
      <td>${user.lastName}</td>
      <td>${user.gender}</td>
      <td>${formatDate(user.dob)}</td>
      <td>${user.email}</td>
      <td>${user.password}</td>
    </tr>
  `).join('');
}

function renderTransactionTable(transactions) {
  const tbody = document.getElementById('transactionBody');
  if (!tbody) return;
  tbody.innerHTML = transactions.map(tx => `
    <tr>
      <td>${tx.date}</td>
      <td>${tx.type}</td>
      <td>$${tx.amount.toLocaleString('en-US')}</td>
      <td>${maskCardNumber(tx.cardNumber)}</td>
      <td>${tx.description}</td>
    </tr>
  `).join('');
}

function buildCardFilter(transactions, cards, userId) {
  const cardFilterSelect = document.getElementById('cardFilter');
  if (!cardFilterSelect) return;

  let relevantTx = userId
    ? transactions.filter(tx => tx.userId === userId)
    : transactions;

  const uniqueCards = new Set();
  relevantTx.forEach(tx => {
    if (tx.cardNumber) {
      uniqueCards.add(tx.cardNumber);
    }
  });

  cardFilterSelect.innerHTML = '';
  // "All Cards" option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All Cards';
  allOption.style.background = '#1e293b';
  allOption.style.color = '#ffffff';
  cardFilterSelect.appendChild(allOption);

  uniqueCards.forEach(cardNum => {
    const foundCard = cards.find(c => c.cardNumber === cardNum);
    let displayText = foundCard
      ? `${foundCard.cardType} ${cardNum.slice(-4)}`
      : `Unknown ${cardNum.slice(-4)}`;
    const option = document.createElement('option');
    option.value = cardNum;
    option.textContent = displayText;
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

function updateFinancialStats(transactions, userId, cards) {
  let relevantCards = userId ? cards.filter(c => c.userId === userId) : cards;
  let totalBalance = 0;
  relevantCards.forEach(card => {
    totalBalance += card.balance;
  });
  
  let totalIncome = 0, totalExpenses = 0;
  transactions.forEach(tx => {
    let type = tx.type.toLowerCase();
    if (type === 'deposit' || type === 'income' || type === 'suspended withdrawal') {
      totalIncome += tx.amount;
    } else if (type === 'withdrawal' || type === 'expense' || type === 'suspended deposit') {
      totalExpenses += tx.amount;
    }
  });
  
  document.getElementById('visa-count').textContent = relevantCards.filter(c => c.cardNumber.startsWith('4')).length;
  document.getElementById('master-count').textContent = relevantCards.filter(c => c.cardNumber.startsWith('5')).length;
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
    <p><strong>Card Type:</strong> ${card.cardType}</p>
    <p><strong>Cardholder:</strong> ${card.cardHolderName}</p>
    <p><strong>Number:</strong> ${maskCardNumber(card.cardNumber)}</p>
    <p><strong>Expires:</strong> ${card.expirationDate}</p>
    <p><strong>CVV:</strong> ${card.cvv}</p>
    <p><strong>Balance:</strong> $${card.balance.toLocaleString('en-US')}</p>
  `;
}

function hideSelectedCard() {
  const selectedCardDiv = document.getElementById('selectedCard');
  if (!selectedCardDiv) return;
  selectedCardDiv.style.display = 'none';
}

function buildUserCardSelects(userId, allCards) {
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

  let relevantCards = userId ? allCards.filter(c => c.userId === userId) : [];
  relevantCards.forEach(card => {
    const opt1 = document.createElement('option');
    opt1.value = card.cardNumber;
    opt1.textContent = `${card.cardType} ${card.cardNumber.slice(-4)}`;
    opt1.style.background = '#1e293b';
    opt1.style.color = '#ffffff';
    depositSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = card.cardNumber;
    opt2.textContent = `${card.cardType} ${card.cardNumber.slice(-4)}`;
    opt2.style.background = '#1e293b';
    opt2.style.color = '#ffffff';
    withdrawSelect.appendChild(opt2);
  });
}

function buildDeleteCardSelect(userId, cards) {
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

  let userCards = userId ? cards.filter(c => c.userId === userId) : [];
  userCards.forEach(card => {
    const option = document.createElement('option');
    option.value = card.cardNumber;
    option.textContent = `${card.cardType} ${card.cardNumber.slice(-4)}`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    deleteCardSelect.appendChild(option);
  });
}

function buildTransactionSelect(userId, transactions) {
  const transactionSelect = document.getElementById('transactionSelect');
  if (!transactionSelect) return;
  transactionSelect.innerHTML = '';
  let userTx = userId ? transactions.filter(tx => tx.userId === userId) : [];
  userTx.forEach(tx => {
    const key = tx.date + "_" + tx.cardNumber;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${tx.type} $${tx.amount.toLocaleString('en-US')} on ${tx.date}`;
    option.style.background = '#1e293b';
    option.style.color = '#ffffff';
    transactionSelect.appendChild(option);
  });
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

function openModal(modalId) {
  let modal = document.getElementById(modalId);
  if (!modal) return;
  if (modalId === "deleteModal") {
    resetDeleteModal();
  }
  if (currentUser) {
    let spans = modal.querySelectorAll("span[id^='currentUserId']");
    spans.forEach(span => {
      // Show the accountId (if available) instead of the numeric id
      span.textContent = currentUser.accountId || currentUser.id;
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

// --- Combined Delete Modal Logic ---
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

// --- Combined Suspend/Reactivate Modal Logic ---
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
  let relevantCards = currentUser ? sampleCards.filter(c => c.userId === currentUser.id) : [];
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
    option.textContent = `${card.cardType} ${card.cardNumber.slice(-4)}`;
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
  let cardTx = sampleTransactions.filter(tx => tx.cardNumber === selectedCard && tx.userId === currentUser.id);
  if (txHistoryDiv) {
    if (cardTx.length === 0) {
      txHistoryDiv.innerHTML = "<p>No transactions for this card.</p>";
    } else {
      let historyHtml = "<ul style='padding-left:20px;'>";
      cardTx.forEach(tx => {
        historyHtml += `<li>${tx.date} - ${tx.type} - $${tx.amount.toLocaleString('en-US')}</li>`;
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

  let txForSuspend = sampleTransactions.filter(tx =>
    tx.cardNumber === selectedCard &&
    tx.userId === currentUser.id &&
    !tx.type.toLowerCase().includes("suspended")
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
    option.textContent = `${tx.type} - $${tx.amount.toLocaleString('en-US')} on ${tx.date}`;
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
    tx.userId === currentUser.id &&
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
    option.textContent = `${tx.type} - $${tx.amount.toLocaleString('en-US')} on ${tx.date}`;
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
  let txIndex = sampleTransactions.findIndex(tx => tx.id === selectedId && tx.userId === currentUser.id);
  if (txIndex === -1) {
    notify.textContent = "Transaction not found.";
    return;
  }
  let tx = sampleTransactions[txIndex];
  let cardObj = sampleCards.find(c => c.cardNumber === tx.cardNumber);
  if (!cardObj) {
    notify.textContent = "Card for the transaction not found.";
    return;
  }
  if (tx.type.toLowerCase() === 'withdrawal') {
    cardObj.balance += tx.amount;
    tx.type = "Suspended Withdrawal";
  } else if (tx.type.toLowerCase() === 'deposit') {
    cardObj.balance -= tx.amount;
    tx.type = "Suspended Deposit";
  }
  notify.textContent = "Transaction suspended successfully!";
  handleSearchInput();
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
  let txIndex = sampleTransactions.findIndex(tx => tx.id === selectedId && tx.userId === currentUser.id);
  if (txIndex === -1) {
    notify.textContent = "Transaction not found.";
    return;
  }
  let tx = sampleTransactions[txIndex];
  let cardObj = sampleCards.find(c => c.cardNumber === tx.cardNumber);
  if (!cardObj) {
    notify.textContent = "Card for the transaction not found.";
    return;
  }
  if (tx.type.toLowerCase().includes("withdrawal")) {
    cardObj.balance -= tx.amount;
    tx.type = "Withdrawal";
  } else if (tx.type.toLowerCase().includes("deposit")) {
    cardObj.balance += tx.amount;
    tx.type = "Deposit";
  }
  notify.textContent = "Transaction reactivated successfully!";
  handleSearchInput();
}

function toggleAccountStatus() {
  const notify = document.getElementById("suspendReactivateNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  currentUser.suspended = !currentUser.suspended;
  let statusDiv = document.getElementById("accountStatus");
  if (currentUser.suspended) {
    statusDiv.textContent = "Account is now suspended.";
    document.getElementById("toggleAccountBtn").textContent = "Reactivate Account";
  } else {
    statusDiv.textContent = "Account is now active.";
    document.getElementById("toggleAccountBtn").textContent = "Suspend Account";
  }
  document.getElementById("transactionManagementSection").style.display = "none";
  if (document.getElementById("suspendTxSelect")) {
    document.getElementById("suspendTxSelect").innerHTML = "";
  }
  if (document.getElementById("reactivateTxSelect")) {
    document.getElementById("reactivateTxSelect").innerHTML = "";
  }
  handleSearchInput();
}

// --- Edit User Info Functions ---
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
  currentUser.email = newEmail;
  emailNotification.textContent = "Email updated successfully!";
  reRenderUserTable();
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
  currentUser.password = newPass;
  passwordNotification.textContent = "Password updated successfully!";
  reRenderUserTable();
}

function deleteUserCard() {
  const notify = document.getElementById("deleteNotification");
  const deleteCardSelect = document.getElementById("deleteCardSelect");
  const card = deleteCardSelect.value;

  if (!card) {
    notify.textContent = "No card selected. Please choose a card to delete.";
    return;
  }
  sampleCards = sampleCards.filter(c => c.cardNumber !== card);
  sampleTransactions = sampleTransactions.filter(tx => tx.cardNumber !== card);
  notify.textContent = "Card deleted successfully!";

  reRenderUserTable();
  updateFinancialStats(sampleTransactions, currentUser ? currentUser.id : null, sampleCards);
  renderTransactionTable(sampleTransactions);
  buildCardFilter(sampleTransactions, sampleCards, currentUser ? currentUser.id : null);
  buildUserCardSelects(currentUser ? currentUser.id : null, sampleCards);

  const cardFilterSelect = document.getElementById("cardFilter");
  if (cardFilterSelect && cardFilterSelect.value === card) {
    cardFilterSelect.value = 'all';
  }
  handleCardFilterChange();

  setTimeout(() => {
    clearAndCloseModal("deleteModal");
  }, 1000);
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

function deleteUserAccount() {
  const notify = document.getElementById("deleteNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  // Remove the user from the users array based on id
  sampleUsers = sampleUsers.filter(u => u.id !== currentUser.id);
  sampleCards = sampleCards.filter(c => c.userId !== currentUser.id);
  sampleTransactions = sampleTransactions.filter(tx => tx.userId !== currentUser.id);
  
  notify.textContent = "User account and all associated data deleted successfully!";
  currentUser = null;
  if (userSearchInput) {
    userSearchInput.value = "";
  }
  clearModalUserData();

  reRenderUserTable();
  updateFinancialStats(sampleTransactions, null, sampleCards);
  renderTransactionTable(sampleTransactions);
  buildCardFilter(sampleTransactions, sampleCards, null);
  
  setTimeout(function() { clearAndCloseModal("deleteModal"); }, 1000);
}

function suspendUserAccount() {
  const notify = document.getElementById("suspendAccountNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  currentUser.suspended = !currentUser.suspended;
  let message = currentUser.suspended ? "User account suspended. They cannot log in now." : "User account reactivated successfully.";
  notify.textContent = message;
  reRenderUserTable();
}

function depositMoney() {
  const notify = document.getElementById("depositNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  var card = document.getElementById("depositCardSelect").value;
  var amountStr = document.getElementById("depositAmount").value;
  let raw = amountStr.replace(/,/g, '');
  var amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) {
    notify.textContent = "Please enter a valid deposit amount.";
    return;
  }
  let cardObj = sampleCards.find(c => c.cardNumber === card && c.userId === currentUser.id);
  if (!cardObj) {
    notify.textContent = "Selected card does not belong to the current user.";
    return;
  }
  cardObj.balance += amount;
  let newTx = {
    userId: currentUser.id,
    id: Math.floor(Math.random() * 1000000),
    date: new Date().toISOString().split('T')[0],
    type: 'Deposit',
    amount: amount,
    cardNumber: card,
    description: 'Admin deposit'
  };
  sampleTransactions.push(newTx);
  notify.textContent = `Deposited $${amount.toLocaleString('en-US')} successfully!`;
  handleSearchInput();
}

function withdrawMoney() {
  const notify = document.getElementById("withdrawNotification");
  if (!currentUser) {
    notify.textContent = "No user selected.";
    return;
  }
  var card = document.getElementById("withdrawCardSelect").value;
  var amountStr = document.getElementById("withdrawAmount").value;
  let raw = amountStr.replace(/,/g, '');
  var amount = parseFloat(raw);
  if (isNaN(amount) || amount <= 0) {
    notify.textContent = "Please enter a valid withdrawal amount.";
    return;
  }
  let cardObj = sampleCards.find(c => c.cardNumber === card && c.userId === currentUser.id);
  if (!cardObj) {
    notify.textContent = "Selected card does not belong to the current user.";
    return;
  }
  if (cardObj.balance < amount) {
    notify.textContent = "Insufficient funds on selected card.";
    return;
  }
  cardObj.balance -= amount;
  let newTx = {
    userId: currentUser.id,
    id: Math.floor(Math.random() * 1000000),
    date: new Date().toISOString().split('T')[0],
    type: 'Withdrawal',
    amount: amount,
    cardNumber: card,
    description: 'Admin withdrawal'
  };
  sampleTransactions.push(newTx);
  notify.textContent = `Withdrew $${amount.toLocaleString('en-US')} successfully!`;
  handleSearchInput();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}