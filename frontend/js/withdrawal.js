async function initWithdrawal() {
  console.log("initWithdrawal called");

  // 1) Get the logged-in user from sessionStorage
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No valid user found in sessionStorage.");
    return;
  }
  console.log("User accountId:", user.accountId);

  // 2) Fetch wallets for the user
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

  //UI elements for withdrawal selection
  const withdrawalSelection = document.getElementById("withdrawal-selection");
  const bankUsersContainer = document.getElementById("bankUsersForm");
  const bankUserWithdrawalForm = document.getElementById("bankUserWithdrawalForm");
  const outOfBankUsersForm = document.getElementById("outOfBankUsersForm");
  const bankUsersOption = document.getElementById("bankUsersWithdrawalOption");
  const outOfBankUsersOption = document.getElementById("outOfBankUsersWithdrawalOption");

  if (bankUsersOption && outOfBankUsersOption && withdrawalSelection) {
    bankUsersOption.addEventListener("click", () => {
      withdrawalSelection.style.display = "none";
      bankUsersContainer.classList.remove("hidden");
      // Populate the sender card dropdown with user's wallets
      renderSenderCardDropdown();
    });
    outOfBankUsersOption.addEventListener("click", () => {
      withdrawalSelection.style.display = "none";
      outOfBankUsersForm.classList.remove("hidden");
    });
  }

  // Back buttons
  const backFromBankUsers = document.getElementById("backFromBankUsersWithdrawal");
  if (backFromBankUsers) {
    backFromBankUsers.addEventListener("click", () => {
      bankUsersContainer.classList.add("hidden");
      withdrawalSelection.style.display = "block";
    });
  }
  const backFromOutOfBankUsers = document.getElementById("backFromOutOfBankUsersWithdrawal");
  if (backFromOutOfBankUsers) {
    backFromOutOfBankUsers.addEventListener("click", () => {
      outOfBankUsersForm.classList.add("hidden");
      withdrawalSelection.style.display = "block";
    });
  }

   // 3) BANK USERS WITHDRAWAL FORM
  if (bankUserWithdrawalForm) {
    // Input restrictions for Recipient's Account ID and Withdrawal Amount
    const recipientIdField = document.getElementById("recipientId");
    if (recipientIdField) {
      recipientIdField.addEventListener("input", function() {
        // Allow only digits and maximum 9 characters
        this.value = this.value.replace(/\D/g, '').substring(0, 9);
      });
    }
    const withdrawalAmountField = document.getElementById("bankUserWithdrawalAmount");
    if (withdrawalAmountField) {
      withdrawalAmountField.addEventListener("input", function() {
        let raw = this.value.replace(/,/g, '').replace(/\D/g, '');
        if (raw) {
          this.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        } else {
          this.value = "";
        }
      });
    }
    bankUserWithdrawalForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const recipientId = document.getElementById("recipientId").value.trim();
      const withdrawalAmount = parseFloat(withdrawalAmountField.value.replace(/,/g, ''));
  
      const recipientIdError = document.getElementById("recipientIdError");
      const withdrawalAmountError = document.getElementById("bankUserWithdrawalAmountError");
      const bankUserWithdrawalSuccess = document.getElementById("bankUserWithdrawalSuccess");
  
      // Clear errors
      recipientIdError.textContent = "";
      withdrawalAmountError.textContent = "";
      bankUserWithdrawalSuccess.textContent = "";
  
      if (!recipientId || recipientId.length !== 9) {
        recipientIdError.textContent = "Recipient's Account ID must be exactly 9 digits.";
        return;
      }
      // Prevent self-withdrawal: user cannot withdraw to themselves
      if (recipientId === user.accountId) {
        recipientIdError.textContent = "You cannot withdraw to your own account.";
        return;
      }
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        withdrawalAmountError.textContent = "Invalid withdrawal amount.";
        return;
      }
  
      const senderCardSelect = document.getElementById("senderCardSelect");
      const senderCardNumber = senderCardSelect ? senderCardSelect.value : "";
      const senderCardSelectError = document.getElementById("senderCardSelectError");
      if (!senderCardNumber) {
        if (senderCardSelectError) {
          senderCardSelectError.textContent = "Please select a card to withdraw from.";
        }
        return;
      }
  
      // Check wallet balance before proceeding
      const normalizedSenderCard = senderCardNumber.replace(/\s/g, '');
      const senderWallet = wallets.find(wallet => wallet.cardNumber.replace(/\s/g, '') === normalizedSenderCard);
      if (!senderWallet) {
        if (senderCardSelectError) {
          senderCardSelectError.textContent = "Selected wallet not found.";
        }
        return;
      }
      if (senderWallet.balance < withdrawalAmount) {
        withdrawalAmountError.textContent = "Insufficient funds in your wallet.";
        return;
      }
  
      // Call API endpoint for bank users withdrawal request
      try {
        const response = await fetch("/api/withdrawal/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUserId: recipientId,       // Recipient's account (User 1)
            withdrawalAmount: withdrawalAmount,
            senderCardNumber: normalizedSenderCard,
            senderAccountId: user.accountId      // Logged-in user's account (User 2)
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          recipientIdError.textContent = errorData.error || "Withdrawal request failed.";
          return;
        }
        const result = await response.json();
        console.log("Withdrawal request success response:", result);
        bankUserWithdrawalSuccess.textContent = "Withdrawal request successful!";
        bankUserWithdrawalForm.reset();
      } catch (err) {
        console.error("Error in bank user withdrawal:", err);
        recipientIdError.textContent = "Server error during withdrawal.";
      }
    });
  }
  
   // 4) OUT-OF-BANK WITHDRAWAL FLOW
  const withdrawalWalletList = document.getElementById("withdrawal-wallet-list");
  function renderWithdrawalTopCards() {
    if (!withdrawalWalletList) return;
    withdrawalWalletList.innerHTML = "";
    if (wallets.length === 0) {
      withdrawalWalletList.innerHTML = "<p>No wallets available.</p>";
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
      withdrawalWalletList.appendChild(cardDiv);
    });
  }
  const withdrawalCardSelect = document.getElementById("withdrawalCardSelect");
  const outOfBankWithdrawalBox = document.getElementById("outOfBankWithdrawalBox");
  const selectedWithdrawalCardDiv = document.getElementById("selected-withdrawal-card");
  
  function renderWithdrawalCardDropdown(selectedIndex = "") {
    if (!withdrawalCardSelect) return;
    withdrawalCardSelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All Cards";
    withdrawalCardSelect.appendChild(defaultOption);
    wallets.forEach((wallet, idx) => {
      const option = document.createElement("option");
      option.value = idx;
      option.textContent = `${wallet.cardType} - $${(wallet.balance || 0).toLocaleString()} (${formatCardNumber(wallet.cardNumber)})`;
      withdrawalCardSelect.appendChild(option);
    });
    withdrawalCardSelect.value = selectedIndex;
  }
  
  function updateWithdrawalSelectedCardDisplay(idx) {
    if (isNaN(idx) || !wallets[idx]) {
      outOfBankWithdrawalBox.classList.add("hidden");
      selectedWithdrawalCardDiv.innerHTML = "";
    } else {
      outOfBankWithdrawalBox.classList.remove("hidden");
      const w = wallets[idx];
      selectedWithdrawalCardDiv.innerHTML = `
        <h3>${w.cardType} - $${(w.balance || 0).toLocaleString()}</h3>
        <p>Cardholder: ${w.cardHolderName}</p>
        <p>Number: ${formatCardNumber(w.cardNumber)}</p>
        <p>Expires: ${w.expirationDate}</p>
      `;
    }
  }
  
  if (withdrawalCardSelect) {
    withdrawalCardSelect.addEventListener("change", () => {
      const idx = parseInt(withdrawalCardSelect.value, 10);
      updateWithdrawalSelectedCardDisplay(idx);
    });
  }
  
  renderWithdrawalTopCards();
  renderWithdrawalCardDropdown();
  
  const withdrawalAmountInput = document.getElementById("withdrawalAmount");
  if (withdrawalAmountInput) {
    withdrawalAmountInput.addEventListener("input", function() {
      let raw = this.value.replace(/,/g, '').replace(/\D/g, '');
      if (raw) {
        this.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      } else {
        this.value = "";
      }
    });
  }
  
  // Handle Out-of-Bank withdrawal form submission
  const withdrawalForm = document.getElementById("withdrawalForm");
  if (withdrawalForm) {
    const sourceCardholder = document.getElementById("sourceCardholderWithdrawal");
    const sourceCardholderError = document.getElementById("sourceCardholderWithdrawalError");
    const sourceCardNumber = document.getElementById("sourceCardNumberWithdrawal");
    const sourceCardNumberError = document.getElementById("sourceCardNumberWithdrawalError");
    const sourceExpMonth = document.getElementById("sourceExpMonthWithdrawal");
    const sourceExpMonthError = document.getElementById("sourceExpMonthWithdrawalError");
    const sourceExpYear = document.getElementById("sourceExpYearWithdrawal");
    const sourceExpYearError = document.getElementById("sourceExpYearWithdrawalError");
    const sourceCVV = document.getElementById("sourceCVVWithdrawal");
    const sourceCVVError = document.getElementById("sourceCVVWithdrawalError");
    const withdrawalAmountError = document.getElementById("withdrawalAmountError");
    const withdrawalSuccessEl = document.getElementById("withdrawal-success");
  
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
  
    withdrawalForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Out-of-bank withdrawal form submitted");
      const submitButton = withdrawalForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      }
      withdrawalSuccessEl.textContent = "";
  
      const oldIndex = parseInt(withdrawalCardSelect.value, 10);
      if (isNaN(oldIndex) || !wallets[oldIndex]) {
        if (submitButton) submitButton.textContent = 'Withdraw';
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
      const withdrawalAmount = parseFloat((withdrawalAmountInput?.value || "0").replace(/,/g, ''));
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        withdrawalAmountError.textContent = "Withdrawal amount must be greater than 0.";
        hasError = true;
      }
  
      if (hasError) {
        if (submitButton) submitButton.textContent = 'Withdraw';
        return;
      }
  
      //Check if the selected wallet has sufficient balance
      const selectedWallet = wallets[oldIndex];
      if (selectedWallet.balance < withdrawalAmount) {
        withdrawalAmountError.textContent = "Insufficient funds in your wallet.";
        if (submitButton) submitButton.textContent = 'Withdraw';
        return;
      } 
  
      try {
        const response = await fetch("/api/withdrawal/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: user.accountId,
            cardNumber: selectedWallet.cardNumber,
            withdrawalAmount: withdrawalAmount
          })
        });
        if (!response.ok) {
          console.error("Failed external withdrawal. Status:", response.status);
          if (submitButton) submitButton.textContent = 'Withdraw';
          return;
        }
        const result = await response.json();
        console.log("External withdrawal success response:", result);
        if (result.updatedWallet) {
          selectedWallet.balance = result.updatedWallet.balance;
        }
        withdrawalSuccessEl.textContent = "Withdrawal successful!";
        renderWithdrawalTopCards();
        renderWithdrawalCardDropdown(oldIndex);
        updateWithdrawalSelectedCardDisplay(oldIndex);
        withdrawalForm.reset();
      } catch (err) {
        console.error("Error in external withdrawal:", err);
      } finally {
        if (submitButton) submitButton.textContent = 'Withdraw';
      }
    });
  }
}
  
// Helper function to format card numbers (in groups of 4 digits)
function formatCardNumber(num = "") {
  return num.match(/.{1,4}/g)?.join(' ') || num;
}
  
// Function to render sender's card dropdown for bank users withdrawal
function renderSenderCardDropdown() {
  const select = document.getElementById("senderCardSelect");
  if (!select) return;
  select.innerHTML = '<option value="" disabled selected>Select a card</option>';
  fetch(`/api/wallet?accountId=${JSON.parse(sessionStorage.getItem("user")).accountId}`)
    .then(res => res.json())
    .then(data => {
      data.forEach(wallet => {
        const option = document.createElement("option");
        option.value = wallet.cardNumber;
        option.textContent = `${wallet.cardType} - $${(wallet.balance || 0).toLocaleString()} (${formatCardNumber(wallet.cardNumber)})`;
        select.appendChild(option);
      });
    })
    .catch(err => console.error("Error rendering sender card dropdown:", err));
}
  
// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", initWithdrawal);