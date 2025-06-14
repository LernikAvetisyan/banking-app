// Wait for the DOM to be fully loaded before running the signup logic.
document.addEventListener("DOMContentLoaded", function () {
 
  const signupForm = document.getElementById("signupForm");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const dobInput = document.getElementById("dob"); // Expected format: MM/DD/YYYY
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPassInput = document.getElementById("confirmPassword");

  // Error message elements for password and confirm password validations.
  const cpError = document.getElementById("confirmPasswordError");
  const passwordErrorContainer = document.getElementById("passwordError");

  // Notification element used to display signup messages to the user.
  const signupNotification = document.getElementById("signupNotification");

  // Prevent any digits from being entered in the First Name field.
  firstNameInput.addEventListener("input", function () {
    this.value = this.value.replace(/\d/g, '');
  });

  // Prevent any digits from being entered in the Last Name field.
  lastNameInput.addEventListener("input", function () {
    this.value = this.value.replace(/\d/g, '');
  });

  // Auto-format the Date of Birth (DOB) input to MM/DD/YYYY format.
  dobInput.addEventListener("input", function () {
    // Remove any non-digit characters.
    let raw = this.value.replace(/\D/g, "");
    if (raw.length > 8) {
      raw = raw.slice(0, 8);
    }
    // If more than 4 digits, split into MM/DD/YYYY.
    if (raw.length > 4) {
      this.value = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
    } else if (raw.length > 2) {
      this.value = raw.slice(0, 2) + "/" + raw.slice(2);
    } else {
      this.value = raw;
    }
  });

  /*
   * validatePassword
    Validates the provided password based on the following criteria:
     - At least 8 characters long.
     - Contains at least one numeric digit.
     - Contains at least one lowercase letter.
     - Contains at least one uppercase letter.
     - Contains at least one special character.
    Returns an array of error strings; if empty, the password passes validation.
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

  /*
    Validates the date string to ensure it is provided in MM/DD/YYYY format.
    Performs simple checks on month, day, and year to ensure a realistic date of birth.
    Returns a string with the error message if validation fails, or null if valid.
   */
  function validateDate(dateStr) {
    if (!dateStr) return "Date of birth is required.";
    const parts = dateStr.split("/");
    if (parts.length !== 3) {
      return "Please provide date in MM/DD/YYYY format.";
    }
    const [mm, dd, yyyy] = parts.map(p => parseInt(p, 10));
    if (!mm || !dd || !yyyy) {
      return "Please provide a valid date.";
    }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) {
      return "Please provide a realistic Date of Birth.";
    }
    return null;
  }

  /*
    Validates that an email string is provided and contains an "@" symbol.
    Returns an error message string if invalid, or null if valid.
   */
  function validateEmail(emailStr) {
    if (!emailStr) return "Email is required.";
    if (!emailStr.includes("@")) {
      return "Email must contain '@'.";
    }
    return null;
  }

  /*
    Displays a message in the signupNotification element.
    Type can be "success" (green text) or "error" (red text).
   */
  function showSignupNotification(message, type = "error") {
    signupNotification.textContent = message;
    signupNotification.style.color = type === "success" ? "green" : "red";
  }

  // Clear any existing notifications when focusing on any input field.
  [firstNameInput, lastNameInput, dobInput, emailInput, passwordInput, confirmPassInput].forEach(input => {
    input.addEventListener("focus", () => {
      showSignupNotification("");
    });
  });

  // Form Submission Handling
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Gather form data from input fields.
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const dob = dobInput.value.trim(); // Expected format: MM/DD/YYYY
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPassInput.value;

    // Basic required field check.
    if (!firstName || !lastName || !gender || !dob || !email || !password) {
      showSignupNotification("Please fill in all required fields.");
      return;
    }

    // Validate email format.
    const emailErr = validateEmail(email);
    if (emailErr) {
      showSignupNotification(emailErr);
      return;
    }

    // Validate date format.
    const dobErr = validateDate(dob);
    if (dobErr) {
      showSignupNotification(dobErr);
      return;
    }

    // Check that password and confirm password match.
    if (password !== confirmPassword) {
      if (cpError) cpError.innerText = "Passwords do not match!";
      showSignupNotification("Passwords do not match.");
      return;
    } else {
      if (cpError) cpError.innerText = "";
    }

    // Validate password complexity.
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length > 0) {
      if (passwordErrorContainer) {
      //  passwordErrorContainer.innerText = pwdErrors.join(" ");
      }
      showSignupNotification(pwdErrors.join(" "));
      return;
    } else {
      if (passwordErrorContainer) {
        passwordErrorContainer.innerText = "";
      }
    }

    // Build the request body with gathered data.
    const bodyData = { firstName, lastName, gender, dob, email, password };

    try {
      // Send a POST request to the signup endpoint.
      const response = await fetch("http://localhost:3000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });
      const result = await response.json();

      if (!response.ok) {
        showSignupNotification(`Signup error: ${result.error || "Unknown error"}`);
      } else {
        // On successful signup, hide the signup container and display the success message.
        const signupContainer = document.getElementById("signupContainer");
        const signupSuccess = document.getElementById("signupSuccess");
        if (signupContainer) signupContainer.style.display = "none";
        if (signupSuccess) signupSuccess.style.display = "block";

        // Optionally add a background class for visual effect.
        document.body.classList.add("signup-success-bg");

        // Attach a click listener to the "Log In" button to redirect to the login page.
        const loginBtn = document.getElementById("loginBtn");
        if (loginBtn) {
          loginBtn.addEventListener("click", () => {
            window.location.href = "../index.html";
          });
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      showSignupNotification("An error occurred during signup. Please try again later.");
    }
  });
});