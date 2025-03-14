/**********************************************
 * Example Incoming Deposits Data
 **********************************************/
let incomingDeposits = [
  { id: 1, date: '2023-10-15', amount: 1500, fromAccount: '987654321', toUserId: 'UABC12345', viewed: false },
  { id: 2, date: '2023-10-16', amount: 2500, fromAccount: '123123123', toUserId: 'UABC12345', viewed: false },
  { id: 3, date: '2023-10-17', amount: 3000, fromAccount: '555666777', toUserId: 'UABC12345', viewed: false }
];

// Store the sample data in localStorage if it's not already present.
if (!localStorage.getItem("incomingDeposits")) {
  localStorage.setItem("incomingDeposits", JSON.stringify(incomingDeposits));
}

/************************************************************
 * initIncomingDeposits()
 * - Retrieves current user and wallets.
 * - Renders deposits for the current user.
 * - Attaches event listeners for deposit processing.
 * - Loads transaction history.
 * - Updates badge count.
 * - Marks deposits as viewed.
 ************************************************************/
function initIncomingDeposits() {
  // 1) Retrieve current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user")) || { userId: "UABC12345" };

  // 2) Load all wallets from localStorage
  let allWallets = JSON.parse(localStorage.getItem("wallets")) || [];

  // 3) Filter wallets: if a wallet has no ownerId, assume it belongs to current user.
  let userCards = allWallets.filter(wallet => !wallet.ownerId || wallet.ownerId === currentUser.userId);

  // Get table body and clear it.
  const tbody = document.querySelector('#depositsTable tbody');
  tbody.innerHTML = '';

  // Get the deposit notification element.
  const notificationEl = document.getElementById("depositNotification");

  // 4) Render each deposit addressed to the current user.
  let deposits = JSON.parse(localStorage.getItem("incomingDeposits")) || [];
  deposits.forEach(deposit => {
    if (deposit.toUserId !== currentUser.userId) return;
    const tr = document.createElement('tr');
    if (userCards.length === 0) {
      // No cards: show message in merged columns.
      tr.innerHTML = `
        <td>${deposit.date}</td>
        <td>$${deposit.amount.toLocaleString()}</td>
        <td>${deposit.fromAccount}</td>
        <td colspan="2" style="text-align:center;">No cards available to deposit funds.</td>
      `;
    } else {
      // Otherwise, render a dropdown of cards and a "Deposit to Card" button.
      tr.innerHTML = `
        <td>${deposit.date}</td>
        <td>$${deposit.amount.toLocaleString()}</td>
        <td>${deposit.fromAccount}</td>
        <td>
          <select class="card-select" data-deposit-id="${deposit.id}">
            <option value="" disabled selected>Select a card</option>
            ${userCards.map(card => `
              <option value="${card.cardNumber}">
                ${card.cardType} ••••${card.cardNumber.slice(-4)}
              </option>`).join('')}
          </select>
        </td>
        <td>
          <button class="deposit-btn" data-deposit-id="${deposit.id}">Deposit to Card</button>
        </td>
      `;
    }
    tbody.appendChild(tr);
  });

  // 5) Attach event listeners to each "Deposit to Card" button.
  const buttons = document.querySelectorAll('.deposit-btn');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      const depositId = parseInt(this.getAttribute('data-deposit-id'), 10);
      const select = document.querySelector(`.card-select[data-deposit-id="${depositId}"]`);
      const selectedCardNumber = select ? select.value : "";

      if (!selectedCardNumber) {
        notificationEl.textContent = "Please select a card to deposit funds.";
        notificationEl.style.color = "red";
        notificationEl.style.display = "block";
        return;
      }

      // Re-read deposits from localStorage.
      let deposits = JSON.parse(localStorage.getItem("incomingDeposits")) || [];
      const depositRecord = deposits.find(d => d.id === depositId);
      if (!depositRecord) {
        notificationEl.textContent = "Deposit record not found.";
        notificationEl.style.color = "red";
        notificationEl.style.display = "block";
        return;
      }

      const cardObj = userCards.find(card => card.cardNumber === selectedCardNumber);
      if (!cardObj) {
        notificationEl.textContent = "Selected card not found.";
        notificationEl.style.color = "red";
        notificationEl.style.display = "block";
        return;
      }

      // Process the deposit: update card balance.
      cardObj.balance = (cardObj.balance || 0) + depositRecord.amount;
      const idx = allWallets.findIndex(w => w.cardNumber === cardObj.cardNumber && (!w.ownerId || w.ownerId === currentUser.userId));
      if (idx > -1) {
        allWallets[idx].balance = cardObj.balance;
        localStorage.setItem("wallets", JSON.stringify(allWallets));
      }

      // Record the deposit in the transactions.
      let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
      transactions.push({
        date: depositRecord.date,
        description: "Incoming Deposit",
        category: "Income",
        amount: depositRecord.amount,
        cardNumber: cardObj.cardNumber,
        fromAccount: depositRecord.fromAccount
      });
      localStorage.setItem("transactions", JSON.stringify(transactions));

      // Remove the processed deposit from the deposits array and update localStorage.
      deposits = deposits.filter(d => d.id !== depositId);
      localStorage.setItem("incomingDeposits", JSON.stringify(deposits));

      // Show success message in green.
      notificationEl.textContent = `Deposited $${depositRecord.amount.toLocaleString()} into ${cardObj.cardType} card ending with ${cardObj.cardNumber.slice(-4)} successfully!`;
      notificationEl.style.color = "green";
      notificationEl.style.display = "block";

      // Refresh the deposits table and transaction history.
      initIncomingDeposits();
      loadIncomingTransactionHistory();
    });
  });

  // 6) Load the incoming transaction history.
  loadIncomingTransactionHistory();

  // 7) Update the badge count.
  updateIncomingBadgeCount();

  // 8) Mark all deposits as viewed so the badge clears.
  if (typeof window.markAllIncomingAsViewed === 'function') {
    window.markAllIncomingAsViewed();
  }
}
  
/************************************************************
 * loadIncomingTransactionHistory()
 * Renders the history of processed incoming deposits.
 ************************************************************/
function loadIncomingTransactionHistory() {
  const historyTbody = document.querySelector('#incomingHistoryTable tbody');
  historyTbody.innerHTML = '';
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
  const incomingTransactions = transactions.filter(tx => tx.description === "Incoming Deposit");
  if (incomingTransactions.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4">No incoming transactions recorded.</td>`;
    historyTbody.appendChild(tr);
    return;
  }
  incomingTransactions.forEach(tx => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td>$${tx.amount.toLocaleString()}</td>
      <td>${tx.fromAccount}</td>
      <td>${tx.cardNumber.slice(-4)}</td>
    `;
    historyTbody.appendChild(tr);
  });
}
