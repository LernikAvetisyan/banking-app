// Global in-memory array for wallets
let wallets = [];

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

  // --- Get references to input fields ---
  const cardNumberInput = document.getElementById('cardNumber');
  const cardHolderNameInput = document.getElementById('cardHolderName');
  const expirationMonthInput = document.getElementById('expirationMonth');
  const expirationYearInput = document.getElementById('expirationYear');
  const cvvInput = document.getElementById('cvv');

  // --- Input Formatting & Validation ---
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

  // --- Function to render wallet cards ---
  function renderWallets() {
    console.log("renderWallets called, wallets count:", wallets.length);
    walletList.innerHTML = '';
    if (wallets.length === 0) {
      walletList.innerHTML = '<p id="no-wallets-msg">No wallets available.</p>';
    } else {
      wallets.forEach((wallet, index) => {
        const card = document.createElement('div');
        card.className = 'wallet-card';
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
  }

  // --- Attach Event Listener for Removing a Wallet ---
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
            renderWallets();
          } catch (err) {
            console.error("Error deleting wallet:", err);
          }
        }
      }
    });
    walletList.dataset.listenerAttached = "true";
  }

  // --- Open Modal Handlers ---
  createWalletBtn.addEventListener('click', () => {
    console.log("createWalletBtn clicked");
    createWalletModal.style.display = 'block';
  });
  addWalletBtn.addEventListener('click', () => {
    console.log("addWalletBtn clicked");
    addWalletModal.style.display = 'block';
  });

  // --- Close Modal Handlers ---
  closeCreateModal.addEventListener('click', () => {
    console.log("closeCreateModal clicked");
    createWalletModal.style.display = 'none';
  });
  closeAddModal.addEventListener('click', () => {
    console.log("closeAddModal clicked");
    addWalletModal.style.display = 'none';
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

  // --- Handle Create Wallet Form Submission (auto-generate details) ---
  createWalletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("createWalletForm submitted");
    const cardType = document.getElementById('cardType').value;
    if (!['Visa', 'Master'].includes(cardType)) return;
    const cardNumber = generateCardNumber(cardType);
    const expirationDate = generateExpirationDate();
    const cvv = generateCVV();
    const cardHolderName = "John Doe"; // Default name
    const balance = 0;

    const newWallet = {
      cardNumber,
      cardType,
      cardHolderName,
      expirationDate,
      cvv,
      balance,
      accountId: user.accountId // Use the real accountId from sessionStorage
    };

    console.log("New wallet data to send:", newWallet);

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWallet)
      });
      console.log("Fetch response status:", response.status);
      if (!response.ok) {
        console.error("Failed to create wallet on server");
        return;
      }
      const createdWallet = await response.json();
      console.log("Created wallet returned from server:", createdWallet);
      wallets.unshift(createdWallet);
      renderWallets();
    } catch (err) {
      console.error("Error creating wallet on server:", err);
    }

    createWalletForm.reset();
    createWalletModal.style.display = 'none';
  });

  // --- Handle Add Wallet Form Submission (manual entry) ---
  addWalletForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("addWalletForm submitted");
    const cardType = document.getElementById('cardTypeAdd').value;
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardHolderName = document.getElementById('cardHolderName').value;
    const expMonth = document.getElementById('expirationMonth').value;
    const expYear = document.getElementById('expirationYear').value;
    const cvv = document.getElementById('cvv').value;
    const expirationDate = `${expMonth}/${expYear}`;

    if (expYear === "" || parseInt(expYear, 10) < 25) {
      return;
    }
    if (!cardType || cardNumber.length !== 16 || !/^\d{2}\/\d{2}$/.test(expirationDate) || cvv.length !== 3) {
      return;
    }

    const balance = Math.floor(Math.random() * 401) + 100; // Random between 100 and 500

    const walletData = {
      cardType,
      cardNumber,
      cardHolderName,
      expirationDate,
      cvv,
      balance,
      accountId: user.accountId
    };

    console.log("Wallet data for manual entry:", walletData);
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletData)
      });
      console.log("Fetch response status (manual):", response.status);
      if (!response.ok) {
        console.error("Failed to add wallet on server");
        return;
      }
      const createdWallet = await response.json();
      console.log("Created wallet (manual):", createdWallet);
      wallets.unshift(createdWallet);
      renderWallets();
    } catch (err) {
      console.error("Error adding wallet on server:", err);
    }

    addWalletForm.reset();
    addWalletModal.style.display = 'none';
  });

  // --- Helper Functions ---
  function generateCardNumber(cardType) {
    let prefix = cardType === 'Visa' ? '4' : '5';
    let number = prefix;
    for (let i = 0; i < 15; i++) {
      number += Math.floor(Math.random() * 10);
    }
    return number;
  }

  function generateExpirationDate() {
    let month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    let year = new Date().getFullYear() + Math.floor(Math.random() * 5) + 1;
    let yearShort = year.toString().substr(2);
    return `${month}/${yearShort}`;
  }

  function generateCVV() {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  function formatCardNumber(number) {
    return number.match(/.{1,4}/g)?.join(' ') || number;
  }

  // --- Initial Render ---
  renderWallets();
}

// Attach initWallet to window so it can be called externally
window.initWallet = initWallet;

// Call initWallet when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWallet);
} else {
  initWallet();
}
