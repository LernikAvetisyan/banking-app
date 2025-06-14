// Global in-memory array for wallets
let wallets = [];
// Global variable to track the selected wallet’s card number (without spaces)
let selectedWalletNumber = null;

async function initWallet() {
  console.log("initWallet called");

  // Get the logged-in user from sessionStorage (set during login)
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No valid user accountId found in sessionStorage. Please log in.");
    alert("No valid user found. Please log in.");
    return;
  }
  console.log("User accountId:", user.accountId);

  // Fetch wallets from the backend API using the user's accountId
  try {
    const res = await fetch(`/api/wallet?accountId=${user.accountId}`);
    if (!res.ok) {
      console.error("Failed to fetch wallets from server. Status:", res.status);
      wallets = [];
    } else {
      wallets = await res.json();
    }
  } catch (err) {
    console.error("Error fetching wallets from server:", err);
    wallets = [];
  }
  
  // Get DOM references for wallet UI elements
  const walletList = document.getElementById('wallet-list');
  const createWalletBtn = document.getElementById('createWalletBtn');
  const addWalletBtn = document.getElementById('addWalletBtn');
  const createWalletModal = document.getElementById('createWalletModal');
  const addWalletModal = document.getElementById('addWalletModal');
  const closeCreateModal = document.getElementById('closeCreateModal');
  const closeAddModal = document.getElementById('closeAddModal');
  const createWalletForm = document.getElementById('createWalletForm');
  const addWalletForm = document.getElementById('addWalletForm');

  // --- Get references to input fields for manual wallet (Add Wallet) ---
  const cardNumberInput = document.getElementById('cardNumber');
  const cardHolderNameInput = document.getElementById('cardHolderName');
  const expirationMonthInput = document.getElementById('expirationMonth');
  const expirationYearInput = document.getElementById('expirationYear');
  const cvvInput = document.getElementById('cvv');

  // Formatting & Validation
  cardNumberInput.addEventListener('input', function () {
    console.log("cardNumberInput: input event fired");
    let digits = cardNumberInput.value.replace(/\D/g, '');
    digits = digits.substring(0, 16);
    cardNumberInput.value = digits.match(/.{1,4}/g)?.join(' ') || '';
  });

  cardHolderNameInput.addEventListener('input', function () {
    console.log("cardHolderNameInput: input event fired");
    cardHolderNameInput.value = cardHolderNameInput.value.replace(/\d/g, '');
  });

  expirationMonthInput.addEventListener('input', function () {
    console.log("expirationMonthInput: input event fired");
    let digits = expirationMonthInput.value.replace(/\D/g, '');
    digits = digits.substring(0, 2);
    if (parseInt(digits, 10) > 12) {
      digits = '12';
    }
    expirationMonthInput.value = digits;
  });

  expirationYearInput.addEventListener('input', function () {
    console.log("expirationYearInput: input event fired");
    let digits = expirationYearInput.value.replace(/\D/g, '');
    digits = digits.substring(0, 2);
    expirationYearInput.value = digits;
    
    // Dynamically create or get inline error element
    let yearError = document.getElementById('year-error');
    if (!yearError) {
      yearError = document.createElement('small');
      yearError.id = 'year-error';
      yearError.style.color = 'red';
      expirationYearInput.insertAdjacentElement('afterend', yearError);
    }
    
    if (digits !== '' && parseInt(digits, 10) < 25) {
      yearError.textContent = "Year must be >= 25";
    } else {
      yearError.textContent = "";
    }
  });

  cvvInput.addEventListener('input', function () {
    console.log("cvvInput: input event fired");
    let digits = cvvInput.value.replace(/\D/g, '');
    digits = digits.substring(0, 3);
    cvvInput.value = digits;
  });

  // Function to render wallet cards
  function renderWallets() {
    console.log("renderWallets called, wallets count:", wallets.length);
    walletList.innerHTML = '';
    if (wallets.length === 0) {
      walletList.innerHTML = '<p id="no-wallets-msg">No wallets available.</p>';
    } else {
      wallets.forEach((wallet, index) => {
        // Check if this wallet is the currently selected one
        const isSelected = selectedWalletNumber && 
          wallet.cardNumber.replace(/\s/g, '') === selectedWalletNumber;
        const card = document.createElement('div');
        card.className = 'wallet-card' + (isSelected ? ' selected' : '');
        card.innerHTML = `
          <h3>${wallet.cardType} Card - $${wallet.balance.toLocaleString()}</h3>
          <p>Cardholder: ${wallet.cardHolderName}</p>
          <p>Number: ${formatCardNumber(wallet.cardNumber)}</p>
          <p>Expires: ${wallet.expirationDate}</p>
          <p>CVV: ${wallet.cvv}</p>
          <button class="remove-btn" data-index="${index}">Remove Wallet</button>
        `;
        walletList.appendChild(card);
      });
    }
    // Reattach click handlers to allow selection of a wallet card
    addCardSelectionHandler();
    // If a wallet is selected, update its display details
    displaySelectedWallet();
  }

  // Attach Event Listener for Removing a Wallet
  if (!walletList.dataset.listenerAttached) {
    walletList.addEventListener('click', async function (e) {
      const btn = e.target.closest('.remove-btn');
      if (btn) {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        console.log("Remove Wallet clicked for index:", index);
        if (!isNaN(index)) {
          const walletToDelete = wallets[index];
          try {
            const deleteRes = await fetch(`/api/wallet/${walletToDelete.cardNumber}`, {
              method: "DELETE"
            });
            if (!deleteRes.ok) {
              console.error("Failed to delete wallet on server");
              return;
            }
            wallets.splice(index, 1);
            // If the deleted wallet was selected, clear the selection
            if (selectedWalletNumber && walletToDelete.cardNumber.replace(/\s/g, '') === selectedWalletNumber) {
              selectedWalletNumber = null;
            }
            renderWallets();
          } catch (err) {
            console.error("Error deleting wallet:", err);
          }
        }
      }
    });
    walletList.dataset.listenerAttached = "true";
  }

  // Open Modal Handlers
  createWalletBtn.addEventListener('click', () => {
    console.log("createWalletBtn clicked");
    createWalletModal.style.display = 'block';
  });
  addWalletBtn.addEventListener('click', () => {
    addWalletModal.style.display = 'block';
    const errorEl = document.getElementById("cardNumberError");
    if (errorEl) {
      errorEl.textContent = ""; // Clear old error message
    }
  });

  // Close Modal Handlers
  closeCreateModal.addEventListener('click', () => {
    console.log("closeCreateModal clicked");
    createWalletModal.style.display = 'none';
  });
  closeAddModal.addEventListener('click', () => {
    addWalletModal.style.display = 'none';
    const errorEl = document.getElementById("cardNumberError");
    if (errorEl) {
      errorEl.textContent = ""; // Clear old error message
    }
  });
  window.addEventListener('click', (event) => {
    if (event.target === createWalletModal) {
      console.log("Clicked outside createWalletModal");
      createWalletModal.style.display = 'none';
    }
    if (event.target === addWalletModal) {
      console.log("Clicked outside addWalletModal");
      addWalletModal.style.display = 'none';
    }
  });

  // Handle Create Wallet Form Submission (auto‑generate details on backend)
  async function handleCreateWallet(e) {
    e.preventDefault();
    console.log("createWalletForm submitted");

    const submitBtn = createWalletForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    
    const cardType = document.getElementById('cardType').value;
    if (!['Visa', 'Master'].includes(cardType)) {
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    const cardHolderName = user.firstName + " " + user.lastName;
    // Let the backend createWallet endpoint auto‑generate cardNumber, expirationDate, and cvv.
    const newWallet = {
      cardType,
      cardHolderName,
      expirationDate: "",
      cvv: "",
      balance: 0,
      accountId: user.accountId
    };
  
    console.log("New wallet data to send:", newWallet);
  
    try {
      // Use the dedicated create endpoint
      const response = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWallet)
      });
      console.log("Fetch response status:", response.status);
      if (!response.ok) {
        console.error("Failed to create wallet on server");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
      const createdWallet = await response.json();
      console.log("Created wallet returned from server:", createdWallet);
      wallets.unshift(createdWallet);
      renderWallets();
    } catch (err) {
      console.error("Error creating wallet on server:", err);
    }
  
    // Reset the form and close the modal
    createWalletForm.reset();
    createWalletModal.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
  }
  
  // Replace and reattach listener for createWalletForm submission
  createWalletForm.replaceWith(createWalletForm.cloneNode(true));
  const freshCreateWalletForm = document.getElementById('createWalletForm');
  freshCreateWalletForm.addEventListener('submit', handleCreateWallet);

  // Handle Add Wallet Form Submission (manual entry)
  addWalletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("addWalletForm submitted");
  
    // Get values from the form fields
    const cardType = document.getElementById('cardTypeAdd').value;
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardHolderName = document.getElementById('cardHolderName').value;
    const expMonth = document.getElementById('expirationMonth').value;
    const expYear = document.getElementById('expirationYear').value;
    const cvv = document.getElementById('cvv').value;
    const expirationDate = `${expMonth}/${expYear}`;
  
    // Validate expiration year
    if (expYear === "" || parseInt(expYear, 10) < 25) {
      console.error("Invalid expiration year");
      return;
    }
    // Validate card details
    if (!cardType || cardNumber.length !== 16 || !/^\d{2}\/\d{2}$/.test(expirationDate) || cvv.length !== 3) {
      console.error("Invalid card details");
      return;
    }
  
    // Reference to an element for showing error messages (if available)
    const errorEl = document.getElementById("cardNumberError");
  
    try {
      // Check if a wallet with this card number already exists
      const checkRes = await fetch(`/api/wallet/${cardNumber}`);
      if (checkRes.ok) {
        // A wallet with this card number already exists – show error and do not proceed
        if (errorEl) {
          errorEl.textContent = "A wallet with that card number already exists.";
        }
        return;
      } else {
        // Clear any existing error message
        if (errorEl) {
          errorEl.textContent = "";
        }
      }
    } catch (err) {
      console.error("Error checking wallet existence:", err);
    }
  
    // Build wallet data object to send to the server.
    // For "Add Wallet", set walletOption to "add". Do not include balance so the backend auto-generates it.
    const walletData = {
      cardType,
      cardNumber,
      cardHolderName,
      expirationDate,
      cvv,
      accountId: user.accountId,
      walletOption: "add"
    };
  
    console.log("Wallet data for manual entry:", walletData);
  
    try {
      const response = await fetch("/api/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletData)
      });
      console.log("Fetch response status (manual):", response.status);
      if (!response.ok) {
        if (errorEl) {
          errorEl.textContent = "Failed to create wallet on server.";
        }
        return;
      }
      const createdWallet = await response.json();
      console.log("Created wallet (manual):", createdWallet);
      // Add the new wallet at the beginning of your wallets array and re-render the UI
      wallets.unshift(createdWallet);
      renderWallets();
    } catch (err) {
      console.error("Error adding wallet on server:", err);
      if (errorEl) {
        errorEl.textContent = "Server error during wallet processing.";
      }
    }
  
    // Reset the form and close the modal
    addWalletForm.reset();
    addWalletModal.style.display = 'none';
  });
  
  // Helper Function: Format Card Number for display
  function formatCardNumber(number) {
    return number.match(/.{1,4}/g)?.join(' ') || number;
  }
  
  // Function to add click handlers to wallet cards for selection
  function addCardSelectionHandler() {
    const walletCards = document.querySelectorAll('.wallet-card');
    walletCards.forEach(card => {
      // Add click listener only if not clicking on the remove button
      card.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return;
        // Assume the card number is in the third <p> element which starts with "Number:"
        const numberParagraph = card.querySelector('p:nth-of-type(3)');
        if (!numberParagraph) return;
        const cardNumberText = numberParagraph.innerText.replace("Number: ", "").replace(/\s/g, '');
        selectedWalletNumber = cardNumberText;
        // Highlight selected card
        walletCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Update selected card display
        displaySelectedWallet();
      });
    });
  }
  
  // Function to display selected card details in a designated container
  function displaySelectedWallet() {
    const selectedWalletDisplay = document.getElementById('selectedWallet');
    if (!selectedWalletDisplay) return;
    const wallet = wallets.find(w => w.cardNumber.replace(/\s/g, '') === selectedWalletNumber);
    if (wallet) {
      selectedWalletDisplay.innerHTML = `
        <h3>Selected Card Details</h3>
        <p><strong>Card Type:</strong> ${wallet.cardType}</p>
        <p><strong>Cardholder:</strong> ${wallet.cardHolderName}</p>
        <p><strong>Number:</strong> ${formatCardNumber(wallet.cardNumber)}</p>
        <p><strong>Expires:</strong> ${wallet.expirationDate}</p>
        <p><strong>CVV:</strong> ${wallet.cvv}</p>
        <p><strong>Balance:</strong> $${wallet.balance.toLocaleString()}</p>
      `;
    } else {
      selectedWalletDisplay.innerHTML = "";
    }
  }
  
  // Function to refresh wallets from the backend and update display
  async function refreshWallets() {
    try {
      const res = await fetch(`/api/wallet?accountId=${user.accountId}`);
      if (!res.ok) {
        console.error("Failed to refresh wallets. Status:", res.status);
        return;
      }
      wallets = await res.json();
      renderWallets();
    } catch (err) {
      console.error("Error refreshing wallets:", err);
    }
  }
  
  // Initial Render
  renderWallets();
}

// Attach initWallet to window so it can be called externally
window.initWallet = initWallet;

// When the document is loaded, call initWallet
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWallet);
} else {
  initWallet();
}
