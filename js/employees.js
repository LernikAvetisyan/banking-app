// frontend/js/employees.js

// This function runs when the page loads.
// It fetches the list of all users from the backend,
// sets up the search logic, etc.
async function initEmployees() {
  try {
    // 1) Fetch all users from the backend
    const res = await fetch("http://localhost:3000/api/employees/users");
    if (!res.ok) {
      throw new Error(`Failed to fetch users. Status: ${res.status}`);
    }
    const users = await res.json();

    // 2) Render them in the main table
    renderUserTable(users);

    // 3) “Search by Account ID” logic
    const userSearchInput = document.getElementById("userSearch");
    if (userSearchInput) {
      userSearchInput.addEventListener("input", async function () {
        const searchValue = userSearchInput.value.trim();
        if (!searchValue) {
          // If empty, re-render all users and clear extra UI
          renderUserTable(users);
          clearTransactionTable();
          clearStats();
          return;
        }
        // Filter by accountId (exact match or partial, as needed)
        const filtered = users.filter(u => u.accountId.includes(searchValue));
        renderUserTable(filtered);
        // Optionally clear transaction details if no user is selected
        clearTransactionTable();
        clearStats();
      });
    }

    // 4) Attach event listener for card filter changes if needed
    const cardFilterSelect = document.getElementById("cardFilter");
    if (cardFilterSelect) {
      cardFilterSelect.addEventListener("change", function () {
        // Implement filtering logic here if you have wallet/transaction data globally
        console.log("Card filter changed:", cardFilterSelect.value);
      });
    }

    // 5) Hide the transaction details panel by default
    hideSelectedCard();

  } catch (err) {
    console.error("Error in initEmployees():", err);
  }
}

/* -------------------- Rendering & Helper Functions -------------------- */

// Renders the "Registered Users" table
function renderUserTable(users) {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.accountId || "N/A"}</td>
      <td>${u.firstName || ""}</td>
      <td>${u.lastName || ""}</td>
      <td>${u.gender || ""}</td>
      <td>${formatDate(u.dob)}</td>
      <td>${u.email || ""}</td>
    </tr>
  `).join("");
}

// Clears the transaction table
function clearTransactionTable() {
  const tbody = document.getElementById("transactionBody");
  if (tbody) tbody.innerHTML = "";
}

// Clears stats (visa/master counts, total balance, etc.)
function clearStats() {
  document.getElementById("visa-count").textContent = "0";
  document.getElementById("master-count").textContent = "0";
  document.getElementById("total-balance").textContent = "$0";
  document.getElementById("total-income").textContent = "$0";
  document.getElementById("total-expenses").textContent = "$0";
}

// Renders the transaction table
function renderTransactionTable(transactions = []) {
  const tbody = document.getElementById("transactionBody");
  if (!tbody) return;
  tbody.innerHTML = transactions.map(tx => `
    <tr>
      <td>${formatDate(tx.date)}</td>
      <td>${tx.type || ""}</td>
      <td>$${(tx.amount || 0).toLocaleString("en-US")}</td>
      <td>${maskCardNumber(tx.cardNumber || "")}</td>
      <td>${tx.description || ""}</td>
    </tr>
  `).join("");
}

// Builds the card filter <select> (with "All Cards" plus each unique card)
function buildCardFilter(transactions = [], wallets = []) {
  const cardFilterSelect = document.getElementById("cardFilter");
  if (!cardFilterSelect) return;
  const uniqueCards = new Set();
  transactions.forEach(tx => {
    if (tx.cardNumber) uniqueCards.add(tx.cardNumber);
  });
  cardFilterSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All Cards";
  cardFilterSelect.appendChild(allOption);
  uniqueCards.forEach(cardNum => {
    const w = wallets.find(wal => wal.cardNumber === cardNum);
    const option = document.createElement("option");
    option.value = cardNum;
    option.textContent = w ? `${w.cardType} ${cardNum.slice(-4)}` : `Unknown ${cardNum.slice(-4)}`;
    cardFilterSelect.appendChild(option);
  });
  cardFilterSelect.value = "all";
}

// Updates card stats & financial summary
function updateFinancialStats(transactions = [], userId, wallets = []) {
  let totalBalance = 0;
  wallets.forEach(w => {
    if (!userId || w.userId === userId) {
      totalBalance += (w.balance || 0);
    }
  });
  let totalIncome = 0, totalExpenses = 0;
  transactions.forEach(tx => {
    const t = (tx.type || "").toLowerCase();
    if (t === "deposit" || t === "income") {
      totalIncome += tx.amount || 0;
      totalBalance += tx.amount || 0;
    } else if (t === "withdrawal" || t === "expense") {
      totalExpenses += tx.amount || 0;
      totalBalance -= tx.amount || 0;
    }
  });
  document.getElementById("visa-count").textContent = wallets.filter(w => w.cardNumber && w.cardNumber.startsWith("4")).length;
  document.getElementById("master-count").textContent = wallets.filter(w => w.cardNumber && w.cardNumber.startsWith("5")).length;
  document.getElementById("total-balance").textContent = `$${totalBalance.toLocaleString("en-US")}`;
  document.getElementById("total-income").textContent = `$${totalIncome.toLocaleString("en-US")}`;
  document.getElementById("total-expenses").textContent = `$${totalExpenses.toLocaleString("en-US")}`;
}

// Masks a card number by adding spaces every 4 digits
function maskCardNumber(num) {
  if (!num) return num;
  return num.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// Formats a date string (YYYY-MM-DD)
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toISOString().split("T")[0];
}

// Initialize on DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEmployees);
} else {
  initEmployees();
}
