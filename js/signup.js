document.addEventListener("DOMContentLoaded", function () {
  // DOM references
  const signupForm       = document.getElementById("signupForm");
  const firstNameInput   = document.getElementById("firstName");
  const lastNameInput    = document.getElementById("lastName");
  const dobInput         = document.getElementById("dob");
  const emailInput       = document.getElementById("email");
  const passwordInput    = document.getElementById("password");
  const confirmPassInput = document.getElementById("confirmPassword");

  // Error message elements
  const cpError              = document.getElementById("confirmPasswordError");
  const passwordErrorContainer = document.getElementById("passwordError");

  // Prevent digits in First Name and Last Name
  firstNameInput.addEventListener("input", function () {
    this.value = this.value.replace(/\d/g, '');
  });
  lastNameInput.addEventListener("input", function () {
    this.value = this.value.replace(/\d/g, '');
  });

  /**
   * validatePassword
   * Checks password length & presence of digits, uppercase, special chars, etc.
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
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
      errors.push("Password must include at least one special character.");
    }
    return errors;
  }

  /**
   * validateDate
   * Checks if the date string is in a valid YYYY-MM-DD or similar format.
   * You could expand this to check if it's in the past, etc.
   */
  function validateDate(dateStr) {
    if (!dateStr) return "Date of birth is required.";
    // Basic check: must be YYYY-MM-DD or something parseable
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      return "Please provide a valid date.";
    }
    return null; // no error
  }

  /**
   * validateEmail
   * Simple check for "@" presence. For robust checks, use a regex or dedicated library.
   */
  function validateEmail(emailStr) {
    if (!emailStr) return "Email is required.";
    if (!emailStr.includes("@")) {
      return "Email must contain '@'.";
    }
    return null;
  }

  // On form submission
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Gather form data
    const firstName = firstNameInput.value.trim();
    const lastName  = lastNameInput.value.trim();
    const gender    = document.querySelector('input[name="gender"]:checked')?.value;
    const dob       = dobInput.value;
    const email     = emailInput.value.trim();
    const password  = passwordInput.value;
    const confirmPassword = confirmPassInput.value;

    // Quick checks for empty fields
    if (!firstName || !lastName || !gender || !dob || !email || !password) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate email format
    const emailErr = validateEmail(email);
    if (emailErr) {
      alert(emailErr);
      return;
    }

    // Validate date of birth
    const dobErr = validateDate(dob);
    if (dobErr) {
      alert(dobErr);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      if (cpError) cpError.innerText = "Passwords do not match!";
      return;
    } else {
      if (cpError) cpError.innerText = "";
    }

    // Validate password requirements
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      if (passwordErrorContainer) {
        passwordErrorContainer.innerText = pwdErrors.join(" ");
      }
      return;
    } else {
      if (passwordErrorContainer) {
        passwordErrorContainer.innerText = "";
      }
    }

    // Build the JSON body to send to the server
    // (We do NOT include userId or accountId—those are generated on backend.)
    const bodyData = {
      firstName,
      lastName,
      gender,
      dob,
      email,
      password
    };

    try {
      // POST the data to the backend signup endpoint
      const response = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });

      // Parse JSON response
      const result = await response.json();

      if (!response.ok) {
        // If the response has an error (4xx or 5xx), display it
        alert(`Signup error: ${result.error || "Unknown error"}`);
      } else {
        // If signup is successful
        alert("Signup successful! Redirecting to index.html");
        // Optionally, store token or user info from `result` if you want
        window.location.href = "../index.html";
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("An error occurred during signup. Check console for details.");
    }
  });
});
