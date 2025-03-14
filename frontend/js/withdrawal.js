function initWithdrawal() {
  console.log("initWithdrawal called");

  // ----- Selection Screen for Withdrawal Options -----
  const withdrawalSelection = document.getElementById("withdrawal-selection");
  const bankUsersForm = document.getElementById("bankUsersForm");
  const outOfBankUsersForm = document.getElementById("outOfBankUsersForm");
  const bankUsersOption = document.getElementById("bankUsersOption");
  const outOfBankUsersOption = document.getElementById("outOfBankUsersOption");

  if (bankUsersOption && outOfBankUsersOption && withdrawalSelection) {
    bankUsersOption.addEventListener("click", function () {
      withdrawalSelection.style.display = "none";
      bankUsersForm.classList.remove("hidden");
    });
    outOfBankUsersOption.addEventListener("click", function () {
      withdrawalSelection.style.display = "none";
      outOfBankUsersForm.classList.remove("hidden");
    });
  }

  // Back buttons for both forms
  const backFromBankUsers = document.getElementById("backFromBankUsers");
  if (backFromBankUsers) {
    backFromBankUsers.addEventListener("click", function () {
      bankUsersForm.classList.add("hidden");
      withdrawalSelection.style.display = "block";
    });
  }
  const backFromOutOfBankUsers = document.getElementById("backFromOutOfBankUsers");
  if (backFromOutOfBankUsers) {
    backFromOutOfBankUsers.addEventListener("click", function () {
      outOfBankUsersForm.classList.add("hidden");
      withdrawalSelection.style.display = "block";
    });
  }

  // ----- Bank Users Withdrawal Form -----
  const bankUserWithdrawalForm = document.getElementById("bankUserWithdrawalForm");
  if (bankUserWithdrawalForm) {
    bankUserWithdrawalForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const bankUserId = document.getElementById("bankUserId").value.trim();
      const bankUserWithdrawalAmount = parseFloat(document.getElementById("bankUserWithdrawalAmount").value);
      const bankUserIdError = document.getElementById("bankUserIdError");
      const bankUserWithdrawalAmountError = document.getElementById("bankUserWithdrawalAmountError");
      const bankUserWithdrawalSuccess = document.getElementById("bankUserWithdrawalSuccess");

      // Clear previous errors
      bankUserIdError.textContent = "";
      bankUserWithdrawalAmountError.textContent = "";

      // Validate inputs
      if (!bankUserId) {
        bankUserIdError.textContent = "User ID is required.";
        return;
      }
      if (isNaN(bankUserWithdrawalAmount) || bankUserWithdrawalAmount <= 0) {
        bankUserWithdrawalAmountError.textContent = "Invalid withdrawal amount.";
        return;
      }
      // Look up the user from localStorage (users array)
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const targetUser = users.find(user => user.id === bankUserId);
      if (!targetUser) {
        bankUserIdError.textContent = "User ID not found.";
        return;
      }
      // Check for insufficient funds
      if (targetUser.balance < bankUserWithdrawalAmount) {
        bankUserWithdrawalAmountError.textContent = "Insufficient funds.";
        return;
      }
      // Subtract amount
      targetUser.balance = (targetUser.balance || 0) - bankUserWithdrawalAmount;
      localStorage.setItem("users", JSON.stringify(users));

      bankUserWithdrawalSuccess.textContent = "Withdrawal successful!";
      bankUserWithdrawalForm.reset();
    });
  }

  // ----- Out of Bank Users Withdrawal Flow -----
  // Get wallets array from localStorage
  const wallets = JSON.parse(localStorage.getItem("wallets")) || [];

  // Render top wallet cards in "withdrawal-wallet-list"
  const withdrawalWalletList = document.getElementById('withdrawal-wallet-list');
  function renderTopCards() {
    withdrawalWalletList.innerHTML = '';
    if (wallets.length === 0) {
      withdrawalWalletList.innerHTML = '<p>No wallets available.</p>';
    } else {
      wallets.forEach((wallet) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'wallet-card';
        cardDiv.innerHTML = `
          <div class="card-header">
            <i class="fa-regular fa-credit-card"></i>
            <h3>${wallet.cardType}</h3>
          </div>
          <p>Balance: $${wallet.balance.toLocaleString()}</p>
          <p>Cardholder: ${wallet.cardHolderName}</p>
          <p>Number: ${formatCardNumber(wallet.cardNumber)}</p>
          <p>Expires: ${wallet.expirationDate}</p>
        `;
        withdrawalWalletList.appendChild(cardDiv);
      });
    }
  }
  renderTopCards();

  // Setup the dropdown for Out of Bank Users
  const withdrawalCardSelect = document.getElementById('withdrawalCardSelect');
  withdrawalCardSelect.innerHTML = '';
  // Default option "All Cards"
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Cards';
  withdrawalCardSelect.appendChild(defaultOption);

  // Populate dropdown with each wallet as an option
  wallets.forEach((wallet, index) => {
    const formattedNum = formatCardNumber(wallet.cardNumber);
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${wallet.cardType} - $${wallet.balance.toLocaleString()} (${formattedNum})`;
    withdrawalCardSelect.appendChild(option);
  });

  // Show or hide the Out of Bank Withdrawal Box based on dropdown selection
  const withdrawalBox = document.getElementById('withdrawalBox');
  const selectedCardDiv = document.getElementById('selected-card');

  withdrawalCardSelect.addEventListener('change', () => {
    const idx = parseInt(withdrawalCardSelect.value, 10);
    if (isNaN(idx) || !wallets[idx]) {
      // Hide the box if "All Cards" or invalid option
      withdrawalBox.classList.add('hidden');
      selectedCardDiv.innerHTML = '';
      return;
    }
    // Otherwise, show the box and populate selected card details
    withdrawalBox.classList.remove('hidden');
    const w = wallets[idx];
    selectedCardDiv.innerHTML = `
      <h3>${w.cardType} - $${w.balance.toLocaleString()}</h3>
      <p>Cardholder: ${w.cardHolderName}</p>
      <p>Number: ${formatCardNumber(w.cardNumber)}</p>
      <p>Expires: ${w.expirationDate}</p>
    `;
  });

  // Handle the Out of Bank Withdrawal Form and validations
  const withdrawalForm = document.getElementById('withdrawalForm');
  if (withdrawalForm) {
    const sourceCardholder = document.getElementById('sourceCardholder');
    const sourceCardholderError = document.getElementById('sourceCardholderError');

    const sourceCardNumber = document.getElementById('sourceCardNumber');
    const sourceCardNumberError = document.getElementById('sourceCardNumberError');

    const sourceExpMonth = document.getElementById('sourceExpMonth');
    const sourceExpMonthError = document.getElementById('sourceExpMonthError');

    const sourceExpYear = document.getElementById('sourceExpYear');
    const sourceExpYearError = document.getElementById('sourceExpYearError');

    const sourceCVV = document.getElementById('sourceCVV');
    const sourceCVVError = document.getElementById('sourceCVVError');

    const withdrawalAmountInput = document.getElementById('withdrawalAmount');
    const withdrawalAmountError = document.getElementById('withdrawalAmountError');

    const withdrawalSuccessEl = document.getElementById('withdrawal-success');

    // Live validations
    sourceCardholder.addEventListener('input', function() {
      sourceCardholder.value = sourceCardholder.value.replace(/\d/g, '');
      sourceCardholderError.textContent = "";
    });

    sourceCardNumber.addEventListener('input', function() {
      let digits = sourceCardNumber.value.replace(/\D/g, '');
      digits = digits.substring(0, 16);
      sourceCardNumber.value = digits.match(/.{1,4}/g)?.join(' ') || '';
      sourceCardNumberError.textContent = "";
    });

    sourceExpMonth.addEventListener('input', function() {
      let digits = sourceExpMonth.value.replace(/\D/g, '');
      digits = digits.substring(0, 2);
      if (parseInt(digits, 10) > 12) {
        digits = '12';
      }
      sourceExpMonth.value = digits;
      sourceExpMonthError.textContent = "";
    });

    sourceExpYear.addEventListener('input', function() {
      let digits = sourceExpYear.value.replace(/\D/g, '');
      digits = digits.substring(0, 2);
      sourceExpYear.value = digits;
      if (parseInt(digits, 10) >= 25) {
        sourceExpYearError.textContent = "";
      }
    });

    sourceCVV.addEventListener('input', function() {
      let digits = sourceCVV.value.replace(/\D/g, '');
      digits = digits.substring(0, 3);
      sourceCVV.value = digits;
      sourceCVVError.textContent = "";
    });

    withdrawalAmountInput.addEventListener('blur', function() {
      let raw = withdrawalAmountInput.value.replace(/,/g, '').replace(/\D/g, '');
      if (!raw) {
        withdrawalAmountInput.value = '';
        return;
      }
      let asNumber = Number(raw);
      withdrawalAmountInput.value = asNumber.toLocaleString('en-US');
    });
    
    withdrawalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      withdrawalSuccessEl.textContent = "";
      const submitButton = withdrawalForm.querySelector('button[type="submit"]');
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      const idx = parseInt(withdrawalCardSelect.value, 10);
      if (isNaN(idx) || !wallets[idx]) {
        submitButton.textContent = 'Withdraw';
        return;
      }

      let hasError = false;

      if (!sourceCardholder.value.trim()) {
        sourceCardholderError.textContent = "Cardholder name is required.";
        hasError = true;
      }
      const rawNumber = sourceCardNumber.value.replace(/\s/g, '');
      if (rawNumber.length !== 16) {
        sourceCardNumberError.textContent = "Card number must be 16 digits.";
        hasError = true;
      }
      if (sourceExpMonth.value.length !== 2 ||
          parseInt(sourceExpMonth.value, 10) < 1 ||
          parseInt(sourceExpMonth.value, 10) > 12) {
        sourceExpMonthError.textContent = "Invalid month (01-12).";
        hasError = true;
      }
      if (sourceExpYear.value.length !== 2 ||
          parseInt(sourceExpYear.value, 10) < 25) {
        sourceExpYearError.textContent = "Year must be >= 25.";
        hasError = true;
      }
      if (sourceCVV.value.length !== 3) {
        sourceCVVError.textContent = "CVV must be 3 digits.";
        hasError = true;
      }
      const withdrawalAmount = parseFloat(withdrawalAmountInput.value.replace(/,/g, ''));
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        withdrawalAmountError.textContent = "Withdrawal amount must be greater than 0.";
        hasError = true;
      }
      // Check for insufficient funds
      if (!hasError && wallets[idx].balance < withdrawalAmount) {
        withdrawalAmountError.textContent = "Insufficient funds.";
        hasError = true;
      }

      if (hasError) {
        submitButton.textContent = 'Withdraw';
        return;
      }

      // Subtract withdrawal amount from chosen wallet's balance
      wallets[idx].balance = (wallets[idx].balance || 0) - withdrawalAmount;
      localStorage.setItem("wallets", JSON.stringify(wallets));

      // Re-render wallet cards and update dropdown option text
      renderTopCards();
      const newFormattedNum = formatCardNumber(wallets[idx].cardNumber);
      withdrawalCardSelect.options[idx].textContent = `${wallets[idx].cardType} - $${wallets[idx].balance.toLocaleString()} (${newFormattedNum})`;

      // Update selected card details inside the box
      selectedCardDiv.innerHTML = `
        <h3>${wallets[idx].cardType} - $${wallets[idx].balance.toLocaleString()}</h3>
        <p>Cardholder: ${wallets[idx].cardHolderName}</p>
        <p>Number: ${formatCardNumber(wallets[idx].cardNumber)}</p>
        <p>Expires: ${wallets[idx].expirationDate}</p>
      `;

      withdrawalSuccessEl.textContent = "Withdrawal successful!";

      // Record transaction as an expense
      let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
      transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: "Withdrawal",
        category: "Expenses",
        amount: -withdrawalAmount,
        cardNumber: wallets[idx].cardNumber
      });
      localStorage.setItem("transactions", JSON.stringify(transactions));

      withdrawalForm.reset();
      submitButton.textContent = 'Withdraw';
    });
  }
}

// Helper function to format card number with spaces
function formatCardNumber(num) {
  return num.match(/.{1,4}/g)?.join(' ') || num;
}

document.addEventListener("DOMContentLoaded", initWithdrawal);
