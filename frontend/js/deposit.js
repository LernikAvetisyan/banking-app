async function initDeposit() {
  console.log("initDeposit called");

  // 1) Get the logged-in user from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No valid user found in sessionStorage.");
    return;
  }
  console.log("User accountId:", user.accountId);

  // 2) Fetch wallets from the backend API using the user's accountId
  let wallets = [];
  try {
    const res = await fetch(`/api/wallet?accountId=${user.accountId}`);
    if (!res.ok) {
      console.error("Failed to fetch wallets from server. Status:", res.status);
      wallets = [];
    } else {
      wallets = await res.json();
      console.log("Wallets from server:", wallets);
    }
  } catch (err) {
    console.error("Error fetching wallets from server:", err);
    wallets = [];
  }

  // UI elements for deposit selection
  const depositSelection = document.getElementById("deposit-selection");
  const bankUsersForm = document.getElementById("bankUsersForm");
  const outOfBankUsersForm = document.getElementById("outOfBankUsersForm");
  const bankUsersOption = document.getElementById("bankUsersOption");
  const outOfBankUsersOption = document.getElementById("outOfBankUsersOption");

  if (bankUsersOption && outOfBankUsersOption && depositSelection) {
    bankUsersOption.addEventListener("click", () => {
      depositSelection.style.display = "none";
      bankUsersForm.classList.remove("hidden");
      // Populate the recipient card dropdown with the logged-in user's cards
      renderRecipientCardDropdown();
    });
    outOfBankUsersOption.addEventListener("click", () => {
      depositSelection.style.display = "none";
      outOfBankUsersForm.classList.remove("hidden");
    });
  }

  // Back buttons
  const backFromBankUsers = document.getElementById("backFromBankUsers");
  if (backFromBankUsers) {
    backFromBankUsers.addEventListener("click", () => {
      bankUsersForm.classList.add("hidden");
      depositSelection.style.display = "block";
    });
  }
  const backFromOutOfBankUsers = document.getElementById("backFromOutOfBankUsers");
  if (backFromOutOfBankUsers) {
    backFromOutOfBankUsers.addEventListener("click", () => {
      outOfBankUsersForm.classList.add("hidden");
      depositSelection.style.display = "block";
    });
  }

  // 3) BANK USERS DEPOSIT FORM
  const bankUserDepositForm = document.getElementById("bankUserDepositForm");
  // --- Add input restrictions for User ID and Deposit Amount ---
  const bankUserIdField = document.getElementById("bankUserId");
  if (bankUserIdField) {
    bankUserIdField.addEventListener("input", function() {
      // Allow only digits and maximum 9 characters
      this.value = this.value.replace(/\D/g, '').substring(0, 9);
    });
  }
  const bankUserAmountField = document.getElementById("bankUserDepositAmount");
  if (bankUserAmountField) {
    bankUserAmountField.addEventListener("input", function() {
      // Remove commas and non-digit characters, then insert commas immediately using regex
      let raw = this.value.replace(/,/g, '').replace(/\D/g, '');
      if (raw) {
        this.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      } else {
        this.value = "";
      }
    });
  }
  if (bankUserDepositForm) {
    bankUserDepositForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const bankUserId = bankUserIdField.value.trim();
      const bankUserDepositAmount = parseFloat(bankUserAmountField.value.replace(/,/g, ''));

      const bankUserIdError = document.getElementById("bankUserIdError");
      const bankUserDepositAmountError = document.getElementById("bankUserDepositAmountError");
      const bankUserDepositSuccess = document.getElementById("bankUserDepositSuccess");

      // Clear errors
      bankUserIdError.textContent = "";
      bankUserDepositAmountError.textContent = "";
      bankUserDepositSuccess.textContent = "";

      // Validate input: User ID must be exactly 9 digits
      if (!bankUserId || bankUserId.length !== 9) {
        bankUserIdError.textContent = "User ID must be exactly 9 digits.";
        return;
      }
      // Prevent self-deposit: User 1 should not deposit to themselves
      if (bankUserId === user.accountId) {
        bankUserIdError.textContent = "You cannot deposit to your own account.";
        return;
      }
      if (isNaN(bankUserDepositAmount) || bankUserDepositAmount <= 0) {
        bankUserDepositAmountError.textContent = "Invalid deposit amount.";
        return;
      }

      // Get the selected recipient card from the new dropdown
      const recipientCardSelect = document.getElementById("recipientCardSelect");
      const recipientCardNumber = recipientCardSelect ? recipientCardSelect.value : "";
      const recipientCardSelectError = document.getElementById("recipientCardSelectError");
      if (!recipientCardNumber) {
        if (recipientCardSelectError) {
          recipientCardSelectError.textContent = "Please select a card.";
        }
        return;
      }

      // Normalize the recipient card number (remove spaces)
      const normalizedRecipientCard = recipientCardNumber.replace(/\s/g, '');

      // Make API call for bank users deposit request
      // Note: The server creates a deposit request with status "In Progress" so it won't affect Dashboard totals until confirmed.
      try {
        const response = await fetch("/api/deposit/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payerUserId: bankUserId,                 // Payer's account id (User 2)
            depositAmount: bankUserDepositAmount,
            recipientCardNumber: normalizedRecipientCard,
            recipientAccountId: user.accountId         // Logged-in user's account (User 1)
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          bankUserIdError.textContent = errorData.error || "Deposit failed.";
          return;
        }

        const result = await response.json();
        console.log("Bank deposit success response:", result);
        bankUserDepositSuccess.textContent = "Deposit request successful!";
        bankUserDepositForm.reset();
      } catch (err) {
        console.error("Error in bank user deposit:", err);
        bankUserIdError.textContent = "Server error during deposit.";
      }
    });
  }

   // 4) OUT-OF-BANK DEPOSIT FLOW
  // Render wallet cards (from backend data) at the top
  const depositWalletList = document.getElementById("deposit-wallet-list");
  function renderTopCards() {
    if (!depositWalletList) return;
    depositWalletList.innerHTML = "";
    if (wallets.length === 0) {
      depositWalletList.innerHTML = "<p>No wallets available.</p>";
      return;
    }
    wallets.forEach((wallet) => {
      const cardDiv = document.createElement("div");
      cardDiv.className = "wallet-card";
      cardDiv.innerHTML = `
        <div class="card-header">
          <i class="fa-regular fa-credit-card"></i>
          <h3>${wallet.cardType}</h3>
        </div>
        <p>Balance: $${(wallet.balance || 0).toLocaleString()}</p>
        <p>Cardholder: ${wallet.cardHolderName}</p>
        <p>Number: ${formatCardNumber(wallet.cardNumber)}</p>
        <p>Expires: ${wallet.expirationDate}</p>
      `;
      depositWalletList.appendChild(cardDiv);
    });
  }

  // Dropdown references for Out-of-Bank deposit
  const depositCardSelect = document.getElementById("depositCardSelect");
  const outOfBankBox = document.getElementById("outOfBankBox");
  const selectedCardDiv = document.getElementById("selected-card");

  function renderCardDropdown(selectedIndex = "") {
    if (!depositCardSelect) return;
    depositCardSelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All Cards";
    depositCardSelect.appendChild(defaultOption);
    wallets.forEach((wallet, idx) => {
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = `${wallet.cardType} - $${(wallet.balance || 0).toLocaleString()} (${formatCardNumber(wallet.cardNumber)})`;
      depositCardSelect.appendChild(option);
    });
    depositCardSelect.value = selectedIndex;
  }

  function updateSelectedCardDisplay(idx) {
    if (isNaN(idx) || !wallets[idx]) {
      outOfBankBox.classList.add("hidden");
      selectedCardDiv.innerHTML = "";
    } else {
      outOfBankBox.classList.remove("hidden");
      const w = wallets[idx];
      selectedCardDiv.innerHTML = `
        <h3>${w.cardType} - $${(w.balance || 0).toLocaleString()}</h3>
        <p>Cardholder: ${w.cardHolderName}</p>
        <p>Number: ${formatCardNumber(w.cardNumber)}</p>
        <p>Expires: ${w.expirationDate}</p>
      `;
    }
  }

  if (depositCardSelect) {
    depositCardSelect.addEventListener("change", () => {
      const idx = parseInt(depositCardSelect.value, 10);
      updateSelectedCardDisplay(idx);
    });
  }

  // Show the top cards and build the dropdown initially (for Out-of-Bank section)
  renderTopCards();
  renderCardDropdown();

  // For Out-of-Bank deposit amount, use the same immediate formatting function as in Bank Users deposit
  const depositAmountInput = document.getElementById("depositAmount");
  if (depositAmountInput) {
    depositAmountInput.addEventListener("input", function() {
      let raw = this.value.replace(/,/g, '').replace(/\D/g, '');
      if (raw) {
        this.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      } else {
        this.value = "";
      }
    });
  }

  // Handle Out-of-Bank deposit form submission
  const depositForm = document.getElementById("depositForm");
  if (depositForm) {
    const sourceCardholder = document.getElementById("sourceCardholder");
    const sourceCardholderError = document.getElementById("sourceCardholderError");
    const sourceCardNumber = document.getElementById("sourceCardNumber");
    const sourceCardNumberError = document.getElementById("sourceCardNumberError");
    const sourceExpMonth = document.getElementById("sourceExpMonth");
    const sourceExpMonthError = document.getElementById("sourceExpMonthError");
    const sourceExpYear = document.getElementById("sourceExpYear");
    const sourceExpYearError = document.getElementById("sourceExpYearError");
    const sourceCVV = document.getElementById("sourceCVV");
    const sourceCVVError = document.getElementById("sourceCVVError");
    const depositAmountError = document.getElementById("depositAmountError");
    const depositSuccessEl = document.getElementById("deposit-success");

    sourceCardholder?.addEventListener("input", () => {
      sourceCardholder.value = sourceCardholder.value.replace(/\d/g, '');
      sourceCardholderError.textContent = "";
    });
    sourceCardNumber?.addEventListener("input", () => {
      let digits = sourceCardNumber.value.replace(/\D/g, '');
      digits = digits.substring(0, 16);
      sourceCardNumber.value = digits.match(/.{1,4}/g)?.join(' ') || '';
      sourceCardNumberError.textContent = "";
    });
    sourceExpMonth?.addEventListener("input", () => {
      let digits = sourceExpMonth.value.replace(/\D/g, '');
      digits = digits.substring(0, 2);
      if (parseInt(digits, 10) > 12) digits = '12';
      sourceExpMonth.value = digits;
      sourceExpMonthError.textContent = "";
    });
    sourceExpYear?.addEventListener("input", () => {
      let digits = sourceExpYear.value.replace(/\D/g, '');
      digits = digits.substring(0, 2);
      sourceExpYear.value = digits;
      if (parseInt(digits, 10) >= 25) sourceExpYearError.textContent = "";
    });
    sourceCVV?.addEventListener("input", () => {
      let digits = sourceCVV.value.replace(/\D/g, '');
      digits = digits.substring(0, 3);
      sourceCVV.value = digits;
      sourceCVVError.textContent = "";
    });

    depositForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Out-of-bank deposit form submitted");
      const submitButton = depositForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      }
      depositSuccessEl.textContent = "";

      const oldIndex = parseInt(depositCardSelect.value, 10);
      if (isNaN(oldIndex) || !wallets[oldIndex]) {
        if (submitButton) submitButton.textContent = 'Deposit';
        return;
      }

      let hasError = false;
      const rawHolder = sourceCardholder?.value.trim() || "";
      if (!rawHolder) {
        sourceCardholderError.textContent = "Cardholder name is required.";
        hasError = true;
      }
      const rawNumber = (sourceCardNumber?.value || "").replace(/\s/g, '');
      if (rawNumber.length !== 16) {
        sourceCardNumberError.textContent = "Card number must be 16 digits.";
        hasError = true;
      }
      if (!sourceExpMonth.value || sourceExpMonth.value.length !== 2 ||
          parseInt(sourceExpMonth.value, 10) < 1 || parseInt(sourceExpMonth.value, 10) > 12) {
        sourceExpMonthError.textContent = "Invalid month (01-12).";
        hasError = true;
      }
      if (!sourceExpYear.value || sourceExpYear.value.length !== 2 ||
          parseInt(sourceExpYear.value, 10) < 25) {
        sourceExpYearError.textContent = "Year must be >= 25.";
        hasError = true;
      }
      if (!sourceCVV.value || sourceCVV.value.length !== 3) {
        sourceCVVError.textContent = "CVV must be 3 digits.";
        hasError = true;
      }
      const depositAmount = parseFloat((depositAmountInput?.value || "0").replace(/,/g, ''));
      if (isNaN(depositAmount) || depositAmount <= 0) {
        depositAmountError.textContent = "Deposit amount must be greater than 0.";
        hasError = true;
      }

      if (hasError) {
        if (submitButton) submitButton.textContent = 'Deposit';
        return;
      }

      try {
        const selectedWallet = wallets[oldIndex];
        const response = await fetch("/api/deposit/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: user.accountId,
            cardNumber: selectedWallet.cardNumber,
            depositAmount: depositAmount
          })
        });
        if (!response.ok) {
          console.error("Failed external deposit. Status:", response.status);
          if (submitButton) submitButton.textContent = 'Deposit';
          return;
        }
        const result = await response.json();
        console.log("External deposit success response:", result);
        if (result.updatedWallet) {
          selectedWallet.balance = result.updatedWallet.balance;
        }
        depositSuccessEl.textContent = "Deposit successful!";
        renderTopCards();
        renderCardDropdown(oldIndex);
        updateSelectedCardDisplay(oldIndex);
        depositForm.reset();
      } catch (err) {
        console.error("Error in external deposit:", err);
      } finally {
        if (submitButton) submitButton.textContent = 'Deposit';
      }
    });
  }

  // Function to render the recipient's card dropdown for Bank Users deposit
  function renderRecipientCardDropdown() {
    const select = document.getElementById("recipientCardSelect");
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Select a card</option>';
    wallets.forEach((wallet) => {
      const option = document.createElement("option");
      option.value = wallet.cardNumber;
      option.textContent = `${wallet.cardType} - $${(wallet.balance || 0).toLocaleString()} (••••${wallet.cardNumber.slice(-4)})`;
      select.appendChild(option);
    });
  }
}

// Helper function to format card numbers (in groups of 4 digits)
function formatCardNumber(num = "") {
  return num.match(/.{1,4}/g)?.join(' ') || num;
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initDeposit);
