window.initAccountEdit = function() {
  console.log("initAccountEdit called");

  // 1) Get the logged-in user from sessionStorage
  const userData = JSON.parse(sessionStorage.getItem("user"));
  if (!userData || !userData.accountId) {
    console.error("No valid user found in sessionStorage.");
    return;
  }
  const accountId = userData.accountId;

  // --- Reference for displaying Account ID in Personal Details ---
  const displayAccountId = document.getElementById('displayAccountId');

  // 2) DOM references for personal info
  const displayFullName  = document.getElementById('displayFullName');
  const displayPhone     = document.getElementById('displayPhone');
  const displayAddress   = document.getElementById('displayAddress');
  const displayDOB       = document.getElementById('displayDOB');
  // Removed profileImage element (Profile Picture not needed)

  // 3) DOM references for edit profile modal
  const editProfileBtn   = document.getElementById('editProfileBtn');
  const editProfileModal = document.getElementById('editProfileModal');
  const closeEditModal   = document.getElementById('closeEditModal');
  const editProfileMenu  = document.getElementById('editProfileMenu');
  const editFieldContainer = document.getElementById('editFieldContainer');
  const editFieldContent = document.getElementById('editFieldContent');
  const backToMenuBtn    = document.getElementById('backToMenuBtn');
  const saveFieldBtn     = document.getElementById('saveFieldBtn');

  // 4) DOM references for wallet balances & transactions
  const visaBalanceEl   = document.getElementById('visaBalance');
  const masterBalanceEl = document.getElementById('masterBalance');
  const accountTransactionBody = document.getElementById('accountTransactionBody');

  // 6) Download statement button
  const downloadStatementBtn = document.getElementById('downloadStatementBtn');

  // Store user’s data here after fetching from DB
  let profileData = {
    firstName: "",
    lastName: "",
    // Keep email in data so saving to DB still works, but we won't display it in the UI
    email: "",
    phone: "",
    address: "",
    dob: ""
    // Removed profilePicDataUrl
  };
  let wallets = [];
  let transactions = [];

  // Fetch data from DB
  fetch(`/api/account?accountId=${accountId}`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch account data");
      return res.json();
    })
    .then(data => {
      const { user, wallets: dbWallets, transactions: dbTransactions } = data;
      if (!user || !Array.isArray(dbWallets) || !Array.isArray(dbTransactions)) {
        console.error("Invalid data structure from /api/account");
        return;
      }

      // 1) Populate user info
      profileData.firstName = user.firstName || "";
      profileData.lastName  = user.lastName  || "";
      profileData.email     = user.email     || "";
      profileData.phone     = user.phone     || "";
      profileData.address   = user.address   || "";
      profileData.dob       = user.dob       || "";
      // Removed profilePicDataUrl assignment

      // 2) Populate wallets & transactions
      wallets = dbWallets;
      transactions = dbTransactions;

      // 3) Update UI
      populateProfileUI();
      showWalletBalances();
      showTransactionHistory();
      populateEditProfileMenu();  // So the menu items show the existing info
    })
    .catch(err => {
      console.error("Error loading account data:", err);
    });

  // Populate Profile UI
  function populateProfileUI() {
    const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
    if (displayFullName)  displayFullName.innerText = fullName || "N/A";
    if (displayPhone)     displayPhone.innerText    = profileData.phone || "N/A";
    if (displayAddress)   displayAddress.innerText  = profileData.address || "N/A";
    if (displayDOB)       displayDOB.innerText      = profileData.dob || "N/A";

    // Show the user’s account ID
    if (displayAccountId) {
      displayAccountId.innerText = accountId;
    }
  }

  // Show Wallet Balances
  function showWalletBalances() {
    let totalVisa = 0;
    let totalMaster = 0;
    wallets.forEach(wallet => {
      if (wallet.cardType === 'Visa') {
        totalVisa += wallet.balance || 0;
      } else if (wallet.cardType === 'Master') {
        totalMaster += wallet.balance || 0;
      }
    });
    if (visaBalanceEl)   visaBalanceEl.textContent   = `$${totalVisa.toLocaleString()}`;
    if (masterBalanceEl) masterBalanceEl.textContent = `$${totalMaster.toLocaleString()}`;
  }

  // Format Date/Time Helper
  function formatDateTime(tx) {
    // Use createdAt if available, otherwise fallback to tx.date
    const raw = tx.createdAt || tx.date;
    const dateObj = new Date(raw);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    // 12-hour format with AM/PM
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return `${year}-${month}-${day} (at ${timeStr})`;
  }

  // Show Transaction History
  function showTransactionHistory() {
    if (!accountTransactionBody) return;

    // 1. Filter transactions to include only confirmed ones (e.g., status "completed")
    const confirmedTx = transactions.filter(tx =>
      tx.status && tx.status.toLowerCase() === "completed"
    );

    // 2. Deduplicate transactions based on unique id
    const uniqueTx = confirmedTx.filter((tx, index, self) =>
      index === self.findIndex(t => t.id === tx.id)
    );

    // 3. Sort the deduplicated transactions by full timestamp (newest first)
    const sortedTx = uniqueTx.sort((a, b) =>
      new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
    );

    // 4. (Optional) Limit the number of transactions to display (here, first 3)
    const limitedTransactions = sortedTx.slice(0, 3);

    // 5. Render the transactions in the table
    accountTransactionBody.innerHTML = limitedTransactions.map(tx => {
      const isWithdrawal = tx.type && tx.type.toLowerCase().includes("withdraw");
      const rowClass = isWithdrawal ? 'row-expense' : 'row-income';
      const displayAmount = isWithdrawal
        ? `-$${Math.abs(tx.amount).toLocaleString()}`
        : `$${tx.amount.toLocaleString()}`;

      // Custom description: Determine origin and direction
      const lowerDesc = tx.description ? tx.description.toLowerCase() : "";
      let origin, direction;
      if (lowerDesc.includes("admin deposit")) {
        origin = "Admin";
        direction = "Deposit";
      } else if (lowerDesc.includes("admin withdrawal")) {
        origin = "Admin";
        direction = "Withdrawal";
      } else if (!tx.fromAccountId || lowerDesc.includes("external")) {
        origin = "Out of Bank Users";
        direction = tx.amount < 0 ? "Outgoing" : "Incoming";
      } else {
        origin = "Bank Users";
        direction = isWithdrawal ? "Outgoing" : "Incoming";
      }
      const customDesc = `${origin} (${direction}) transaction`;

      return `
        <tr class="${rowClass}">
          <td>${formatDateTime(tx)}</td>
          <td>${customDesc}</td>
          <td>${displayAmount}</td>
          <td>•••• ${tx.cardNumber ? tx.cardNumber.slice(-4) : 'N/A'}</td>
        </tr>
      `;
    }).join('');
  }

  //Populate the "Edit Profile" Menu Items with Existing Info
  function populateEditProfileMenu() {
    const menuFullName = document.getElementById("menuFullName");
    const menuPhone    = document.getElementById("menuPhone");
    const menuAddress  = document.getElementById("menuAddress");
    const menuDOB      = document.getElementById("menuDOB");

    if (menuFullName) {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      menuFullName.innerText = fullName;
    }
    if (menuPhone)    menuPhone.innerText   = profileData.phone;
    if (menuAddress)  menuAddress.innerText = profileData.address;
    if (menuDOB)      menuDOB.innerText     = profileData.dob;
  }

  //Edit Profile Modal Logic
  function resetEditModal() {
    if (!editFieldContainer || !editProfileMenu) return;
    editFieldContainer.style.display = "none";
    editProfileMenu.style.display = "block";
    ["nameError", "emailError", "phoneError", "dobError", "errorMessage"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = "";
    });
  }

  if (editProfileBtn && editProfileModal) {
    editProfileBtn.addEventListener('click', function () {
      resetEditModal();
      editProfileModal.style.display = "block";
    });
  }
  if (closeEditModal) {
    closeEditModal.addEventListener('click', function () {
      editProfileModal.style.display = "none";
      resetEditModal();
    });
  }
  window.addEventListener('click', function (event) {
    if (event.target === editProfileModal) {
      editProfileModal.style.display = "none";
      resetEditModal();
    }
  });

  const menuItems = document.querySelectorAll("#editProfileMenu li[data-field]");
  menuItems.forEach(function(item) {
    item.addEventListener("click", function() {
      if (!editFieldContent) return;
      const field = item.getAttribute("data-field");

      if (field === "dob") {
        editFieldContent.innerHTML = `
          <label for="dobMonthInput">Month (MM):</label>
          <input type="text" id="dobMonthInput" value="" placeholder="MM" maxlength="2" />
          <label for="dobDayInput">Day (DD):</label>
          <input type="text" id="dobDayInput" value="" placeholder="DD" maxlength="2" />
          <label for="dobYearInput">Year (YYYY):</label>
          <input type="text" id="dobYearInput" value="" placeholder="YYYY" maxlength="4" />
          <div id="dobError" style="color:red; font-size:12px;"></div>
        `;
        ["dobMonthInput", "dobDayInput", "dobYearInput"].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener("input", () => {
              el.value = el.value.replace(/\D/g, '');
            });
          }
        });
      } else if (field === "address") {
        editFieldContent.innerHTML = `
          <label for="streetInput">Street Address:</label>
          <input type="text" id="streetInput" value="" />
          <label for="cityInput">City:</label>
          <input type="text" id="cityInput" value="" />
          <label for="stateSelect">State:</label>
          <select id="stateSelect"></select>
        `;
        populateStates("");
        const cityInput = document.getElementById("cityInput");
        if (cityInput) {
          cityInput.addEventListener("input", function() {
            cityInput.value = cityInput.value.replace(/\d/g, '');
          });
        }
      } else if (field === "phone") {
        editFieldContent.innerHTML = `
          <label for="phoneInput">Phone Number:</label>
          <input type="text" id="phoneInput" value="" placeholder="+1 xxx-xxx-xxxx" />
          <div id="phoneError" style="color:red; font-size:12px;"></div>
        `;
        formatPhoneInput();
      } else if (field === "fullName") {
        editFieldContent.innerHTML = `
          <label for="fullNameInput">Full Name:</label>
          <input type="text" id="fullNameInput" value="" />
          <div id="nameError" style="color:red; font-size:12px;"></div>
        `;
        const fullNameInput = document.getElementById("fullNameInput");
        if (fullNameInput) {
          fullNameInput.addEventListener("input", function() {
            fullNameInput.value = fullNameInput.value.replace(/\d/g, '');
          });
        }
      } else {
        editFieldContent.innerHTML = `
          <label for="editInput">${field}:</label>
          <input type="text" id="editInput" value="" />
        `;
      }

      editProfileMenu.style.display = "none";
      editFieldContainer.style.display = "block";
      editFieldContainer.setAttribute("data-field", field);
    });
  });

  if (backToMenuBtn) {
    backToMenuBtn.addEventListener("click", function() {
      editFieldContainer.style.display = "none";
      editProfileMenu.style.display = "block";
    });
  }

  if (saveFieldBtn) {
    saveFieldBtn.addEventListener("click", function() {
      const field = editFieldContainer.getAttribute("data-field");
      let newValue;

      if (field === "dob") {
        const m = document.getElementById("dobMonthInput").value.trim();
        const d = document.getElementById("dobDayInput").value.trim();
        const y = document.getElementById("dobYearInput").value.trim();
        const dobError = document.getElementById("dobError");
        if (!/^\d{1,2}$/.test(m) || parseInt(m, 10) < 1 || parseInt(m, 10) > 12) {
          dobError.innerText = "Month must be 1-12.";
          return;
        }
        if (!/^\d{1,2}$/.test(d) || parseInt(d, 10) < 1 || parseInt(d, 10) > 31) {
          dobError.innerText = "Day must be 1-31.";
          return;
        }
        if (!/^\d{4}$/.test(y) || parseInt(y, 10) > 2015) {
          dobError.innerText = "Year must be 4 digits and <= 2015.";
          return;
        }
        newValue = `${m.padStart(2,'0')}/${d.padStart(2,'0')}/${y}`;
        profileData.dob = newValue;

      } else if (field === "fullName") {
        const nameError = document.getElementById("nameError");
        newValue = document.getElementById("fullNameInput").value.trim();
        if (!/^[A-Za-z\s]+$/.test(newValue) || newValue.split(/\s+/).length < 2) {
          nameError.innerText = "Full Name must contain only letters and at least two words.";
          return;
        }
        const parts = newValue.split(/\s+/);
        profileData.firstName = parts[0];
        profileData.lastName  = parts.slice(1).join(" ");

      } else if (field === "phone") {
        const phoneError = document.getElementById("phoneError");
        newValue = document.getElementById("phoneInput").value.trim();
        let digits = newValue.replace(/[^\d]/g, '');
        if (digits.length !== 11 || !digits.startsWith("1")) {
          phoneError.innerText = "Phone number must be 11 digits starting with 1.";
          return;
        }
        newValue = `+1 ${digits.substring(1,4)}-${digits.substring(4,7)}-${digits.substring(7)}`;
        profileData.phone = newValue;

      } else if (field === "address") {
        const street = document.getElementById("streetInput").value.trim();
        const city   = document.getElementById("cityInput").value.trim();
        const stateSelect = document.getElementById("stateSelect");
        const state  = stateSelect ? stateSelect.value : "";
        if (!street || !city || !state) {
          alert("All address fields must be filled.");
          return;
        }
        if (!/^[A-Za-z\s]+$/.test(city)) {
          alert("City must contain only letters.");
          return;
        }
        newValue = `${street}, ${city}, ${state}`;
        profileData.address = newValue;
      }

      editFieldContainer.style.display = "none";
      editProfileMenu.style.display = "block";

      saveProfileData().then(() => {
        populateProfileUI();
        populateEditProfileMenu();
      });
    });
  }

  //Save Profile Data to DB
  function saveProfileData() {
    return new Promise((resolve, reject) => {
      const body = {
        firstName: profileData.firstName,
        lastName:  profileData.lastName,
        dob:       profileData.dob,
        email:     profileData.email,
        phone:     profileData.phone,
        address:   profileData.address
      };

      fetch(`/api/account?accountId=${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update account data");
        return res.json();
      })
      .then(updatedUser => {
        console.log("Profile updated successfully:", updatedUser);
        profileData.firstName = updatedUser.firstName || profileData.firstName;
        profileData.lastName  = updatedUser.lastName  || profileData.lastName;
        profileData.dob       = updatedUser.dob       || profileData.dob;
        profileData.email     = updatedUser.email     || profileData.email;
        profileData.phone     = updatedUser.phone     || profileData.phone;
        profileData.address   = updatedUser.address   || profileData.address;
        resolve();
      })
      .catch(err => {
        console.error("Error updating profile:", err);
        reject(err);
      });
    });
  }

  // Helper: Populate state dropdown
  function populateStates(selectedState) {
    const states = [
      "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
      "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
      "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
      "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
      "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
      "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
      "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
      "Wisconsin","Wyoming"
    ];
    const stateSelect = document.getElementById("stateSelect");
    if (!stateSelect) return;
    stateSelect.innerHTML = "";
    states.forEach(st => {
      const option = document.createElement("option");
      option.value = st;
      option.text = st;
      if (st === selectedState) option.selected = true;
      stateSelect.appendChild(option);
    });
  }

  // Helper: Auto-format phone input
  function formatPhoneInput() {
    const phoneInput = document.getElementById("phoneInput");
    if (!phoneInput) return;
    phoneInput.addEventListener("input", function() {
      let value = phoneInput.value;
      let digits = value.replace(/[^\d]/g, '');
      if (!digits.startsWith("1")) {
        digits = "1" + digits;
      }
      digits = digits.substring(0, 11);
      let formatted = "";
      if (digits.length > 1) {
        formatted = digits.substring(1, 4);
      }
      if (digits.length >= 4) {
        formatted += "-" + digits.substring(4, 7);
      }
      if (digits.length >= 7) {
        formatted += "-" + digits.substring(7);
      }
      phoneInput.value = `+1 ${formatted}`;
    });
  }

  //Download Statement
  if (downloadStatementBtn) {
    downloadStatementBtn.addEventListener('click', function() {
      // Filter transactions to only include confirmed ones (e.g., status "completed")
      const confirmedTransactions = transactions.filter(tx =>
        tx.status && tx.status.toLowerCase() === "completed"
      );
      
      // Calculate total balances from wallets
      const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  
      // Calculate total income and total expenses from confirmed transactions.
      const totals = confirmedTransactions.reduce((acc, tx) => {
        const t = tx.type.toLowerCase();
        const amt = Math.abs(tx.amount);
        if (t === 'deposit request') {
          // For User 2: deposit request is money sent (expense)
          acc.expenses += amt;
        } else if (t === 'requested deposit') {
          // For User 1: requested deposit is money received (income)
          acc.income += amt;
        } else if (t === 'withdrawal request') {
          // For User 2: withdrawal request is money received (income)
          acc.income += amt;
        } else if (t === 'requested withdrawal') {
          // For User 1: requested withdrawal is money sent (expense)
          acc.expenses += amt;
        } else {
          // Fallback: positive amount is income, negative amount is expense.
          if (tx.amount >= 0) {
            acc.income += tx.amount;
          } else {
            acc.expenses += amt;
          }
        }
        return acc;
      }, { income: 0, expenses: 0 });
  
      const visaText   = visaBalanceEl ? visaBalanceEl.textContent : "$0";
      const masterText = masterBalanceEl ? masterBalanceEl.textContent : "$0";
  
      let statementText = `ACCOUNT STATEMENT\n\n`;
      statementText += `Total Balance: $${totalBalance.toLocaleString()}\n`;
      statementText += `Total Income: $${totals.income.toLocaleString()}\n`;
      statementText += `Total Expenses: $${totals.expenses.toLocaleString()}\n\n`;
      statementText += `Account Balances:\nVisa Card: ${visaText}\nMaster Card: ${masterText}\n\n`;
      statementText += `Transaction History:\nDate, Description, Amount, Card\n`;
  
      // Use only confirmed transactions for the statement
      confirmedTransactions.forEach(tx => {
        const isWithdrawal = tx.type && tx.type.toLowerCase().includes("withdraw");
        const sign = isWithdrawal ? "-" : "";
        const amt  = Math.abs(tx.amount).toLocaleString();
        const card = tx.cardNumber ? `•••• ${tx.cardNumber.slice(-4)}` : "•••• N/A";
        // Custom origin/direction logic
        const lowerDesc = tx.description ? tx.description.toLowerCase() : "";
        let origin, direction;
        if (lowerDesc.includes("admin deposit")) {
          origin = "Admin";
          direction = "Deposit";
        } else if (lowerDesc.includes("admin withdrawal")) {
          origin = "Admin";
          direction = "Withdrawal";
        } else if (!tx.fromAccountId || lowerDesc.includes("external")) {
          origin = "Out of Bank Users";
          direction = tx.amount < 0 ? "Outgoing" : "Incoming";
        } else {
          origin = "Bank Users";
          direction = isWithdrawal ? "Outgoing" : "Incoming";
        }
        statementText += `${formatDateTime(tx)}, ${tx.description}, ${sign}$${amt}, ${card} (${origin} ${direction})\n`;
      });
  
      const blob = new Blob([statementText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'account_statement.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }  
  
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountEdit);
} else {
  initAccountEdit();
}
