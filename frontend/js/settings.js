function initSettings() {
  console.log("initSettings called");

  // 1) Get references to the buttons that open the modals
  const changeEmailBtn = document.getElementById('changeEmailBtn');
  const changePasswordBtn = document.getElementById('changePasswordBtn');

  // 2) Get references to the modals themselves
  const changeEmailModal = document.getElementById('changeEmailModal');
  const changePasswordModal = document.getElementById('changePasswordModal');

  // 3) Get references to the close buttons inside the modals
  const closeEmailModalBtn = document.getElementById('closeEmailModal');
  const closePasswordModalBtn = document.getElementById('closePasswordModal');

  // 4) References to input fields and notification spans
  const newEmailInput = document.getElementById('newEmailInput');
  const emailModalNotification = document.getElementById('emailModalNotification');
  const settingsNewPasswordInput = document.getElementById('settingsNewPasswordInput');
  const passwordModalNotification = document.getElementById('passwordModalNotification');

  /*
    validateEmailFormat
    Checks for a basic pattern "something@something.something"
   */
  function validateEmailFormat(email) {
    if (!email) {
      return "New Email cannot be empty.";
    }
    // A simple regex that checks something@something.something
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Invalid email format. Must contain '@' and '.' in correct places.";
    }
    return "";
  }

  /*
    validatePassword
    - ≥ 8 characters
    - at least 1 digit, 1 uppercase, 1 lowercase, 1 special char
   */
  function validatePassword(password) {
    const errors = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must include at least one numeric digit.");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must include at least one lowercase letter.");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must include at least one uppercase letter.");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must include at least one special character.");
    }
    return errors;
  }

  //FETCH & DISPLAY CURRENT EMAIL/PASSWORD

  function fetchAndDisplaySettings() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user || !user.accountId) {
      console.error("No valid user found for settings.");
      return;
    }
    fetch(`/api/settings?accountId=${user.accountId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      })
      .then(data => {
        // Update the displayed email & password
        const currentEmailDisplay = document.getElementById("currentEmailDisplay");
        const currentPasswordDisplay = document.getElementById("currentPasswordDisplay");
        if (currentEmailDisplay) {
          currentEmailDisplay.textContent = data.email || "N/A";
        }
        if (currentPasswordDisplay) {
          currentPasswordDisplay.textContent = data.password || "N/A"; // plain text for testing
        }
      })
      .catch(err => console.error("Error fetching settings:", err));
  }

  //OPEN MODALS

  if (changeEmailBtn && changeEmailModal) {
    changeEmailBtn.addEventListener('click', () => {
      console.log("changeEmailBtn clicked");
      // Fetch current settings before showing the modal
      fetchAndDisplaySettings();
      // Clear old notifications/fields
      if (emailModalNotification) {
        emailModalNotification.textContent = "";
      }
      if (newEmailInput) {
        newEmailInput.value = "";
      }
      changeEmailModal.style.display = 'block';
    });
  }

  if (changePasswordBtn && changePasswordModal) {
    changePasswordBtn.addEventListener('click', () => {
      console.log("changePasswordBtn clicked");
      fetchAndDisplaySettings();
      // Clear old notifications/fields
      if (passwordModalNotification) {
        passwordModalNotification.textContent = "";
      }
      if (settingsNewPasswordInput) {
        settingsNewPasswordInput.value = "";
      }
      changePasswordModal.style.display = 'block';
    });
  }

  //CLOSE MODALS

  if (closeEmailModalBtn && changeEmailModal) {
    closeEmailModalBtn.addEventListener('click', () => {
      console.log("closeEmailModal clicked");
      changeEmailModal.style.display = 'none';
      // Clear input & notification
      if (newEmailInput) newEmailInput.value = "";
      if (emailModalNotification) {
        emailModalNotification.textContent = "";
      }
    });
  }
  if (closePasswordModalBtn && changePasswordModal) {
    closePasswordModalBtn.addEventListener('click', () => {
      console.log("closePasswordModal clicked");
      changePasswordModal.style.display = 'none';
      // Clear input & notification
      if (settingsNewPasswordInput) settingsNewPasswordInput.value = "";
      if (passwordModalNotification) {
        passwordModalNotification.textContent = "";
      }
    });
  }

  // Close modal if user clicks outside
  window.addEventListener('click', (event) => {
    if (event.target === changeEmailModal) {
      console.log("Clicked outside changeEmailModal");
      changeEmailModal.style.display = 'none';
      // Clear input & notification
      if (newEmailInput) newEmailInput.value = "";
      if (emailModalNotification) {
        emailModalNotification.textContent = "";
      }
    }
    if (event.target === changePasswordModal) {
      console.log("Clicked outside changePasswordModal");
      changePasswordModal.style.display = 'none';
      // Clear input & notification
      if (settingsNewPasswordInput) settingsNewPasswordInput.value = "";
      if (passwordModalNotification) {
        passwordModalNotification.textContent = "";
      }
    }
  });

  //SAVE NEW EMAIL

  const saveEmailBtn = document.getElementById('saveEmailBtn');
  if (saveEmailBtn) {
    saveEmailBtn.addEventListener('click', () => {
      const user = JSON.parse(sessionStorage.getItem("user"));
      if (!user || !user.accountId) {
        console.error("No valid user for updating email.");
        return;
      }
      const newEmail = newEmailInput.value.trim();
      if (!emailModalNotification) return;

      // Validate email
      const emailError = validateEmailFormat(newEmail);
      if (emailError) {
        emailModalNotification.textContent = emailError;
        emailModalNotification.style.color = "red";
        return;
      }

      // Send to backend
      fetch(`/api/settings/changeEmail?accountId=${user.accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail })
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update email");
        return res.json();
      })
      .then(data => {
        emailModalNotification.textContent = "Email updated successfully!";
        emailModalNotification.style.color = "green";
        fetchAndDisplaySettings();
      })
      .catch(err => {
        emailModalNotification.textContent = "Error updating email.";
        emailModalNotification.style.color = "red";
        console.error(err);
      });
    });
  }

  // SAVE NEW PASSWORD
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', () => {
      const user = JSON.parse(sessionStorage.getItem("user"));
      if (!user || !user.accountId) {
        console.error("No valid user for updating password.");
        return;
      }
      const newPassword = settingsNewPasswordInput.value.trim();
      if (!passwordModalNotification) return;

      // Validate password
      if (!newPassword) {
        passwordModalNotification.textContent = "New password cannot be empty.";
        passwordModalNotification.style.color = "red";
        return;
      }
      const pwdErrors = validatePassword(newPassword);
      if (pwdErrors.length > 0) {
        passwordModalNotification.innerHTML = pwdErrors.join("<br>");
        passwordModalNotification.style.color = "red";
        return;
      }

      // Send to backend
      fetch(`/api/settings/changePassword?accountId=${user.accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update password");
        return res.json();
      })
      .then(data => {
        passwordModalNotification.textContent = "Password updated successfully!";
        passwordModalNotification.style.color = "green";
        fetchAndDisplaySettings();
      })
      .catch(err => {
        passwordModalNotification.textContent = "Error updating password.";
        passwordModalNotification.style.color = "red";
        console.error(err);
      });
    });
  }
}

// Attach initSettings to the window so other scripts can call it
window.initSettings = initSettings;

// Call initSettings on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
