function initDeposit() {
  console.log("initDeposit called");

  // ====== Deposit Selection for Bank Users vs. Out of Bank Users =====
  const depositSelection = document.getElementById("deposit-selection");
  const bankUsersForm = document.getElementById("bankUsersForm");
  const outOfBankUsersForm = document.getElementById("outOfBankUsersForm");
  const bankUsersOption = document.getElementById("bankUsersOption");
  const outOfBankUsersOption = document.getElementById("outOfBankUsersOption");

  if (bankUsersOption && outOfBankUsersOption && depositSelection) {
    bankUsersOption.addEventListener("click", function () {
      depositSelection.style.display = "none";
      bankUsersForm.classList.remove("hidden");
    });
    outOfBankUsersOption.addEventListener("click", function () {
      depositSelection.style.display = "none";
      outOfBankUsersForm.classList.remove("hidden");
    });
  }

  // Back buttons
  const backFromBankUsers = document.getElementById("backFromBankUsers");
  if (backFromBankUsers) {
    backFromBankUsers.addEventListener("click", function () {
      bankUsersForm.classList.add("hidden");
      depositSelection.style.display = "block";
    });
  }
  const backFromOutOfBankUsers = document.getElementById("backFromOutOfBankUsers");
  if (backFromOutOfBankUsers) {
    backFromOutOfBankUsers.addEventListener("click", function () {
      outOfBankUsersForm.classList.add("hidden");
      depositSelection.style.display = "block";
    });
  }

  // ====== Bank Users deposit form ======
  const bankUserDepositForm = document.getElementById("bankUserDepositForm");
  if (bankUserDepositForm) {
    bankUserDepositForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const bankUserId = document.getElementById("bankUserId").value.trim();
      const bankUserDepositAmount = parseFloat(document.getElementById("bankUserDepositAmount").value);
      const bankUserIdError = document.getElementById("bankUserIdError");
      const bankUserDepositAmountError = document.getElementById("bankUserDepositAmountError");
      const bankUserDepositSuccess = document.getElementById("bankUserDepositSuccess");

      // Clear any previous errors
      bankUserIdError.textContent = "";
      bankUserDepositAmountError.textContent = "";

      // Validate input fields
      if (!bankUserId) {
        bankUserIdError.textContent = "User ID is required.";
        return;
      }
      if (isNaN(bankUserDepositAmount) || bankUserDepositAmount <= 0) {
        bankUserDepositAmountError.textContent = "Invalid deposit amount.";
        return;
      }
      // Look up the user from localStorage (users array)
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const recipient = users.find(user => user.id === bankUserId);
      if (!recipient) {
        bankUserIdError.textContent = "User ID not found.";
        return;
      }
      // Update recipient's balance
      recipient.balance = (recipient.balance || 0) + bankUserDepositAmount;
      localStorage.setItem("users", JSON.stringify(users));

      bankUserDepositSuccess.textContent = "Deposit successful!";
      bankUserDepositForm.reset();
    });
  }

  // ====== Out of Bank Users deposit flow ======
  const depositWalletList = document.getElementById('deposit-wallet-list');
  const wallets = JSON.parse(localStorage.getItem("wallets")) || [];

  // Render top wallet cards
  function renderTopCards() {
    depositWalletList.innerHTML = '';
    if (wallets.length === 0) {
      depositWalletList.innerHTML = '<p>No wallets available.</p>';
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
        depositWalletList.appendChild(cardDiv);
      });
    }
  }
  renderTopCards();

  const depositCardSelect = document.getElementById('depositCardSelect');
  const outOfBankBox = document.getElementById('outOfBankBox');
  const selectedCardDiv = document.getElementById('selected-card');

  // Populate the dropdown
  depositCardSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Cards';
  depositCardSelect.appendChild(defaultOption);

  // Each wallet as an option
  wallets.forEach((wallet, index) => {
    const formattedNum = formatCardNumber(wallet.cardNumber);
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${wallet.cardType} - $${wallet.balance.toLocaleString()} (${formattedNum})`;
    depositCardSelect.appendChild(option);
  });

  // Hide the entire .out-of-bank-box until a valid card is chosen
  depositCardSelect.addEventListener('change', () => {
    const idx = parseInt(depositCardSelect.value, 10);
    if (isNaN(idx) || !wallets[idx]) {
      outOfBankBox.classList.add('hidden');
      selectedCardDiv.innerHTML = '';
      return;
    }
    outOfBankBox.classList.remove('hidden');
    const w = wallets[idx];
    selectedCardDiv.innerHTML = `
      <h3>${w.cardType} - $${w.balance.toLocaleString()}</h3>
      <p>Cardholder: ${w.cardHolderName}</p>
      <p>Number: ${formatCardNumber(w.cardNumber)}</p>
      <p>Expires: ${w.expirationDate}</p>
    `;
  });

  // Handle the deposit form + validations
  const depositForm = document.getElementById('depositForm');
  if (depositForm) {
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

    const depositAmountInput = document.getElementById('depositAmount');
    const depositAmountError = document.getElementById('depositAmountError');

    const depositSuccessEl = document.getElementById('deposit-success');

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

    depositAmountInput.addEventListener('blur', function() {
      let raw = depositAmountInput.value.replace(/,/g, '').replace(/\D/g, '');
      if (!raw) {
        depositAmountInput.value = '';
        return;
      }
      let asNumber = Number(raw);
      depositAmountInput.value = asNumber.toLocaleString('en-US');
    });
    
    depositForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitButton = depositForm.querySelector('button[type="submit"]');
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      depositSuccessEl.textContent = "";

      const idx = parseInt(depositCardSelect.value, 10);
      if (isNaN(idx) || !wallets[idx]) {
        submitButton.textContent = 'Deposit';
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
      const depositAmount = parseFloat(depositAmountInput.value.replace(/,/g, ''));
      if (isNaN(depositAmount) || depositAmount <= 0) {
        depositAmountError.textContent = "Deposit amount must be greater than 0.";
        hasError = true;
      }

      if (hasError) {
        submitButton.textContent = 'Deposit';
        return;
      }

      // Proceed with deposit
      wallets[idx].balance = (wallets[idx].balance || 0) + depositAmount;
      localStorage.setItem("wallets", JSON.stringify(wallets));

      // Re-render wallet cards
      renderTopCards();

      // Update dropdown option text
      const newFormattedNum = formatCardNumber(wallets[idx].cardNumber);
      depositCardSelect.options[idx].textContent = `${wallets[idx].cardType} - $${wallets[idx].balance.toLocaleString()} (${newFormattedNum})`;

      // Update the selected card details
      selectedCardDiv.innerHTML = `
        <h3>${wallets[idx].cardType} - $${wallets[idx].balance.toLocaleString()}</h3>
        <p>Cardholder: ${wallets[idx].cardHolderName}</p>
        <p>Number: ${formatCardNumber(wallets[idx].cardNumber)}</p>
        <p>Expires: ${wallets[idx].expirationDate}</p>
      `;

      depositSuccessEl.textContent = "Deposit successful!";

      // Record as an Income transaction
      let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
      transactions.push({
        date: new Date().toISOString().split('T')[0],
        description: "Deposit",
        category: "Income",
        amount: depositAmount,
        cardNumber: wallets[idx].cardNumber
      });
      localStorage.setItem("transactions", JSON.stringify(transactions));

      depositForm.reset();
      submitButton.textContent = 'Deposit';
    });
  }
}

// Helper function to format card number with spaces
function formatCardNumber(num) {
  return num.match(/.{1,4}/g)?.join(' ') || num;
}

document.addEventListener("DOMContentLoaded", initDeposit);
