window.initAccountEdit = async function() {
  console.log("initAccountEdit called");

  // Get the logged‐in user from sessionStorage (set during login)
  let user = JSON.parse(sessionStorage.getItem("user"));
  if (!user || !user.accountId) {
    console.error("No logged in user found.");
    return;
  }

  // ------------------ FETCH PROFILE DATA FROM THE BACKEND ------------------
  let profileData;
  try {
    const response = await fetch(`http://localhost:3000/api/user/profile?accountId=${user.accountId}`);
    if (response.ok) {
      profileData = await response.json();
    } else {
      console.warn("Profile not found on server, using default profile data.");
      profileData = {
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 123-456-7890',
        address: '123 Main Street, Anytown, USA',
        dob: '01/01/1990',
        profilePicDataUrl: null
      };
    }
  } catch (err) {
    console.error("Error fetching profile data:", err);
    profileData = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1 123-456-7890',
      address: '123 Main Street, Anytown, USA',
      dob: '01/01/1990',
      profilePicDataUrl: null
    };
  }

  // 1) Retrieve DOM elements for personal info
  const displayFullName  = document.getElementById('displayFullName');
  const displayEmail     = document.getElementById('displayEmail');
  const displayPhone     = document.getElementById('displayPhone');
  const displayAddress   = document.getElementById('displayAddress');
  const displayDOB       = document.getElementById('displayDOB');
  const profileImage     = document.getElementById("profileImage");

  // 2) Retrieve DOM elements for Edit Profile
  const editProfileBtn     = document.getElementById('editProfileBtn');
  const editProfileModal   = document.getElementById('editProfileModal');
  const closeEditModal     = document.getElementById('closeEditModal');
  const editProfileMenu    = document.getElementById('editProfileMenu');
  const editFieldContainer = document.getElementById('editFieldContainer');
  const editFieldContent   = document.getElementById('editFieldContent');
  const errorMessage       = document.getElementById('errorMessage');
  const saveFieldBtn       = document.getElementById('saveFieldBtn');
  const backToMenuBtn      = document.getElementById('backToMenuBtn');

  // "Edit Profile" menu items
  const menuFullName  = document.getElementById('menuFullName');
  const menuEmail     = document.getElementById('menuEmail');
  const menuPhone     = document.getElementById('menuPhone');
  const menuAddress   = document.getElementById('menuAddress');
  const menuDOB       = document.getElementById('menuDOB');

  // 3) If key elements are missing, log an error and return
  if (!editProfileBtn || !editProfileModal) {
    console.error("Some Account elements not found. Ensure account.html is fully loaded and IDs match.");
    return;
  }

  // ---------- LOAD WALLETS & TRANSACTIONS FOR BALANCES & HISTORY ----------
  // Fetch wallets from backend
  let wallets = [];
  try {
    const walletsRes = await fetch(`http://localhost:3000/api/wallet?accountId=${user.accountId}`);
    if (walletsRes.ok) {
      wallets = await walletsRes.json();
    }
  } catch(err) {
    console.error("Error fetching wallets:", err);
  }
  let totalVisa = 0;
  let totalMaster = 0;
  wallets.forEach(wallet => {
    if (wallet.cardType === 'Visa') {
      totalVisa += wallet.balance || 0;
    } else if (wallet.cardType === 'Master') {
      totalMaster += wallet.balance || 0;
    }
  });
  const visaBalanceEl   = document.getElementById('visaBalance');
  const masterBalanceEl = document.getElementById('masterBalance');
  if (visaBalanceEl) {
    visaBalanceEl.textContent = `$${totalVisa.toLocaleString()}`;
  }
  if (masterBalanceEl) {
    masterBalanceEl.textContent = `$${totalMaster.toLocaleString()}`;
  }

  // Fetch transactions from backend
  let transactions = [];
  try {
    const txRes = await fetch(`http://localhost:3000/api/transaction?accountId=${user.accountId}`);
    if (txRes.ok) {
      transactions = await txRes.json();
    }
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
  const accountTransactionBody = document.getElementById('accountTransactionBody');
  if (accountTransactionBody) {
    accountTransactionBody.innerHTML = transactions.map(tx => {
      const rowClass = tx.amount < 0 ? 'row-expense' : 'row-income';
      return `
        <tr class="${rowClass}">
          <td>${tx.date}</td>
          <td>${tx.description}</td>
          <td>${tx.category || ''}</td>
          <td>$${Math.abs(tx.amount).toLocaleString()}</td>
          <td>•••• ${tx.cardNumber.slice(-4)}</td>
        </tr>
      `;
    }).join('');
  }

  // ---------- POPULATE THE CURRENT PROFILE DATA ----------
  function populateProfileUI() {
    if (displayFullName)  displayFullName.innerText = profileData.fullName;
    if (displayEmail)     displayEmail.innerText    = profileData.email;
    if (displayPhone)     displayPhone.innerText    = profileData.phone;
    if (displayAddress)   displayAddress.innerText  = profileData.address;
    if (displayDOB)       displayDOB.innerText      = profileData.dob;

    if (menuFullName)  menuFullName.innerText  = profileData.fullName;
    if (menuEmail)     menuEmail.innerText     = profileData.email;
    if (menuPhone)     menuPhone.innerText     = profileData.phone;
    if (menuAddress)   menuAddress.innerText   = profileData.address;
    if (menuDOB)       menuDOB.innerText       = profileData.dob;

    if (profileImage) {
      if (profileData.profilePicDataUrl) {
        profileImage.src = profileData.profilePicDataUrl;
      } else {
        profileImage.src = "../images/default-profile.png";
      }
    }
  }
  populateProfileUI();

  // ---------- UPLOAD PICTURE FUNCTIONALITY ----------
  const uploadPicBtn   = document.getElementById("uploadPicBtn");
  const profilePicInput = document.getElementById("profilePicInput");
  if (uploadPicBtn && profilePicInput && profileImage) {
    uploadPicBtn.addEventListener("click", function() {
      profilePicInput.click();
    });

    profilePicInput.addEventListener("change", async function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
          profileData.profilePicDataUrl = e.target.result;
          profileImage.src = e.target.result;
          // Update the profile picture on the backend
          try {
            const updateRes = await fetch("http://localhost:3000/api/user/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accountId: user.accountId, field: "profilePicDataUrl", newValue: e.target.result })
            });
            if (!updateRes.ok) {
              console.error("Failed to update profile picture on server");
            }
          } catch(err) {
            console.error("Error updating profile picture on server:", err);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ---------- EDIT PROFILE MODAL LOGIC ----------
  function resetEditModal() {
    if (!editFieldContainer || !editProfileMenu) return;
    editFieldContainer.style.display = "none";
    editProfileMenu.style.display = "block";
    ["nameError", "emailError", "phoneError", "dobError", "errorMessage"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = "";
    });
  }

  editProfileBtn.addEventListener('click', function () {
    resetEditModal();
    console.log("Edit Profile button clicked");
    editProfileModal.style.display = "block";
  });

  closeEditModal.addEventListener('click', function () {
    console.log("Close Edit Profile clicked");
    editProfileModal.style.display = "none";
    resetEditModal();
  });

  window.addEventListener('click', function (event) {
    if (event.target === editProfileModal) {
      console.log("Clicked outside Edit Profile modal");
      editProfileModal.style.display = "none";
      resetEditModal();
    }
  });

  const menuItems = document.querySelectorAll("#editProfileMenu li[data-field]");
  menuItems.forEach(function(item) {
    item.addEventListener("click", function() {
      if (!editFieldContent) return;
      const field = item.getAttribute("data-field");
      const currentValue = item.querySelector("span").innerText;
      console.log("Editing field:", field, "Current value:", currentValue);
      let fieldLabel = "";

      if (field === "fullName") {
        fieldLabel = "Full Name:";
      } else if (field === "email") {
        fieldLabel = "Email Address:";
      } else if (field === "phone") {
        fieldLabel = "Phone Number:";
      } else if (field === "address") {
        fieldLabel = "Mailing Address:";
      } else if (field === "dob") {
        fieldLabel = "Date of Birth:";
      } else {
        fieldLabel = field.charAt(0).toUpperCase() + field.slice(1) + ":";
      }

      if (field === "dob") {
        let parts = currentValue.split(/[\/-]/);
        let m = parts[0] || "";
        let d = parts[1] || "";
        let y = parts[2] || "";
        editFieldContent.innerHTML = `
          <label for="dobMonthInput">Month (MM):</label>
          <input type="text" id="dobMonthInput" value="${m}" placeholder="MM" maxlength="2" />
          <label for="dobDayInput">Day (DD):</label>
          <input type="text" id="dobDayInput" value="${d}" placeholder="DD" maxlength="2" />
          <label for="dobYearInput">Year (YYYY):</label>
          <input type="text" id="dobYearInput" value="${y}" placeholder="YYYY" maxlength="4" />
          <div id="dobError" style="color:red; font-size:12px;"></div>
        `;
        document.getElementById("dobMonthInput").addEventListener("input", function() {
          this.value = this.value.replace(/\D/g, '');
        });
        document.getElementById("dobDayInput").addEventListener("input", function() {
          this.value = this.value.replace(/\D/g, '');
        });
        document.getElementById("dobYearInput").addEventListener("input", function() {
          this.value = this.value.replace(/\D/g, '');
        });
      } else if (field === "address") {
        let parts = currentValue.split(",");
        let street = parts[0] ? parts[0].trim() : "";
        let city = parts[1] ? parts[1].trim() : "";
        let state = parts[2] ? parts[2].trim() : "";
        editFieldContent.innerHTML = `
          <label for="streetInput">Street Address:</label>
          <input type="text" id="streetInput" value="${street}" />
          <label for="cityInput">City:</label>
          <input type="text" id="cityInput" value="${city}" />
          <label for="stateSelect">State:</label>
          <select id="stateSelect"></select>
        `;
        populateStates(state);
        document.getElementById("cityInput").addEventListener("input", function() {
          this.value = this.value.replace(/\d/g, '');
        });
      } else if (field === "phone") {
        editFieldContent.innerHTML = `
          <label for="phoneInput">Phone Number:</label>
          <input type="text" id="phoneInput" value="${currentValue.startsWith('+1') ? currentValue : '+1 '}" placeholder="+1 xxx-xxx-xxxx" />
          <div id="phoneError" style="color:red; font-size:12px;"></div>
        `;
        formatPhoneInput();
      } else if (field === "fullName") {
        editFieldContent.innerHTML = `
          <label for="fullNameInput">Full Name:</label>
          <input type="text" id="fullNameInput" value="${currentValue}" />
          <div id="nameError" style="color:red; font-size:12px;"></div>
        `;
        document.getElementById("fullNameInput").addEventListener("input", function() {
          this.value = this.value.replace(/\d/g, '');
        });
      } else if (field === "email") {
        editFieldContent.innerHTML = `
          <label for="emailInput">Email Address:</label>
          <input type="email" id="emailInput" value="${currentValue}" />
          <div id="emailError" style="color:red; font-size:12px;"></div>
        `;
      } else {
        editFieldContent.innerHTML = `<label for="editInput">${fieldLabel}</label>
          <input type="text" id="editInput" value="${currentValue}" />`;
      }
      editProfileMenu.style.display = "none";
      editFieldContainer.style.display = "block";
      editFieldContainer.setAttribute("data-field", field);
    });
  });

  backToMenuBtn.addEventListener("click", function() {
    if (!editFieldContainer || !editProfileMenu) return;
    editFieldContainer.style.display = "none";
    editProfileMenu.style.display = "block";
    if (errorMessage) errorMessage.innerText = "";
  });

  saveFieldBtn.addEventListener("click", async function() {
    const field = editFieldContainer.getAttribute("data-field");
    let newValue;

    if (field === "dob") {
      let m = document.getElementById("dobMonthInput").value.trim();
      let d = document.getElementById("dobDayInput").value.trim();
      let y = document.getElementById("dobYearInput").value.trim();
      const dobError = document.getElementById("dobError");
      if (!/^\d{1,2}$/.test(m) || parseInt(m, 10) < 1 || parseInt(m, 10) > 12) {
        dobError.innerText = "Month must be between 1 and 12 (max 2 digits)";
        return;
      }
      if (!/^\d{1,2}$/.test(d) || parseInt(d, 10) < 1 || parseInt(d, 10) > 31) {
        dobError.innerText = "Day must be between 1 and 31 (max 2 digits)";
        return;
      }
      if (!/^\d{4}$/.test(y) || parseInt(y, 10) > 2010) {
        dobError.innerText = "Year must be 4 digits and not greater than 2010";
        return;
      }
      newValue = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
      profileData.dob = newValue;
      if (displayDOB) displayDOB.innerText = newValue;
      if (menuDOB) menuDOB.innerText = newValue;

    } else if (field === "fullName") {
      newValue = document.getElementById("fullNameInput").value.trim();
      const nameError = document.getElementById("nameError");
      if (!/^[A-Za-z\s]+$/.test(newValue) || newValue.split(/\s+/).length < 2) {
        nameError.innerText = "Full Name must contain only letters and at least two words.";
        return;
      } else {
        nameError.innerText = "";
      }
      profileData.fullName = newValue;
      if (displayFullName) displayFullName.innerText = newValue;
      if (menuFullName) menuFullName.innerText = newValue;

    } else if (field === "email") {
      newValue = document.getElementById("emailInput").value.trim();
      const emailError = document.getElementById("emailError");
      if (!newValue.includes("@")) {
        emailError.innerText = "Email must contain '@'.";
        return;
      } else {
        emailError.innerText = "";
      }
      profileData.email = newValue;
      if (displayEmail) displayEmail.innerText = newValue;
      if (menuEmail) menuEmail.innerText = newValue;

    } else if (field === "phone") {
      newValue = document.getElementById("phoneInput").value.trim();
      const phoneError = document.getElementById("phoneError");
      let digits = newValue.replace(/[^\d]/g, '');
      if (digits.length !== 11 || !digits.startsWith("1")) {
        phoneError.innerText = "Phone number must be 11 digits starting with 1.";
        return;
      } else {
        phoneError.innerText = "";
      }
      newValue = `+1 ${digits.substring(1,4)}-${digits.substring(4,7)}-${digits.substring(7)}`;
      profileData.phone = newValue;
      if (displayPhone) displayPhone.innerText = newValue;
      if (menuPhone) menuPhone.innerText = newValue;

    } else if (field === "address") {
      let street = document.getElementById("streetInput").value.trim();
      let city   = document.getElementById("cityInput").value.trim();
      let stateSelect = document.getElementById("stateSelect");
      let state  = stateSelect ? stateSelect.value : "";
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
      if (displayAddress) displayAddress.innerText = newValue;
      if (menuAddress) menuAddress.innerText = newValue;
    }

    // Instead of saving to localStorage, update the backend profile via API
    try {
      const updateRes = await fetch("http://localhost:3000/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: user.accountId, profileData })
      });
      if (!updateRes.ok) {
        console.error("Failed to update profile on server");
      } else {
        console.log("Profile updated successfully on server");
      }
    } catch (err) {
      console.error("Error updating profile on server:", err);
    }
  });

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
    if (stateSelect) {
      stateSelect.innerHTML = "";
      states.forEach(st => {
        const option = document.createElement("option");
        option.value = st;
        option.text = st;
        if (st === selectedState) {
          option.selected = true;
        }
        stateSelect.appendChild(option);
      });
    }
  }

  // Helper: Auto-format phone input
  function formatPhoneInput() {
    const phoneInput = document.getElementById("phoneInput");
    if (!phoneInput) return;
    phoneInput.addEventListener("input", function() {
      let value = phoneInput.value;
      if (!value.startsWith("+1 ")) {
        value = "+1 " + value.replace(/[^\d]/g, '');
      } else {
        value = "+1 " + value.slice(3).replace(/[^\d]/g, '');
      }
      let digits = value.replace("+1 ", "").substring(0, 10);
      let formatted = "";
      if (digits.length > 0) {
        formatted = digits.substring(0, 3);
      }
      if (digits.length >= 4) {
        formatted += "-" + digits.substring(3, 6);
      }
      if (digits.length >= 7) {
        formatted += "-" + digits.substring(6);
      }
      phoneInput.value = "+1 " + formatted;
    });
  }

  // NEW: Download Statement Button
  const downloadStatementBtn = document.getElementById('downloadStatementBtn');
  if (downloadStatementBtn) {
    downloadStatementBtn.addEventListener('click', function() {
      const visaText = visaBalanceEl ? visaBalanceEl.textContent : "$0";
      const masterText = masterBalanceEl ? masterBalanceEl.textContent : "$0";
      let statementText = `ACCOUNT STATEMENT\n\nAccount Balances:\nVisa Card: ${visaText}\nMaster Card: ${masterText}\n\nTransaction History:\nDate, Description, Category, Amount, Card\n`;

      transactions.forEach(tx => {
        const sign = tx.amount < 0 ? "-" : "";
        const amt  = Math.abs(tx.amount).toLocaleString();
        const card = `•••• ${tx.cardNumber.slice(-4)}`;
        statementText += `${tx.date}, ${tx.description}, ${tx.category || ''}, ${sign}$${amt}, ${card}\n`;
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
