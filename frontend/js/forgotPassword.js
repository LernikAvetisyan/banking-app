document.addEventListener("DOMContentLoaded", function () {
  // Steps
  const step1 = document.getElementById("forgotPasswordStep1");
  const step2 = document.getElementById("forgotPasswordStep2");
  const step3 = document.getElementById("forgotPasswordStep3");

  // Inputs
  const fpEmail       = document.getElementById("forgotPasswordEmail");
  const fpCode        = document.getElementById("verificationCodeInput");
  const fpNewPass     = document.getElementById("newPasswordInput");
  const fpConfirmPass = document.getElementById("confirmNewPasswordInput");

  // Buttons
  const sendCodeBtn   = document.getElementById("sendVerificationCodeBtn");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const resetBtn      = document.getElementById("resetPasswordBtn");

  // Back buttons
  const backToLoginBtn  = document.getElementById("backToLoginBtn");
  const backToLoginBtn2 = document.getElementById("backToLoginBtn2");
  const backToLoginBtn3 = document.getElementById("backToLoginBtn3");

  // Notifications
  const notificationError   = document.getElementById("forgotPasswordError");
  const notificationSuccess = document.getElementById("forgotPasswordSuccess");

  // Verification code from backend
  let verificationCode = "";

  // Password requirements definition
  const requirements = [
    { id: 'length',  test: pw => pw.length >= 8,                       text: 'At least 8 characters long.' },
    { id: 'digit',   test: pw => /[0-9]/.test(pw),                     text: 'At least one numeric digit.' },
    { id: 'lower',   test: pw => /[a-z]/.test(pw),                     text: 'At least one lowercase letter.' },
    { id: 'upper',   test: pw => /[A-Z]/.test(pw),                     text: 'At least one uppercase letter.' },
    { id: 'special', test: pw => /[!@#$%^&*(),.?":{}|<>]/.test(pw),    text: 'At least one special character.' }
  ];

  // Helper to display notifications
  function showNotification(message, type = "error") {
    if (type === "success") {
      notificationSuccess.textContent = message;
      notificationError.textContent   = "";
    } else {
      notificationError.textContent   = message;
      notificationSuccess.textContent = "";
    }
  }

  // Build (hidden) requirements list below the confirm-password field
  const reqContainer = document.createElement('div');
  reqContainer.id = 'passwordRequirementsContainer';
  reqContainer.style.display = 'none';
  const ul = document.createElement('ul');
  ul.style.listStyle   = 'none';
  ul.style.paddingLeft = '0';
  requirements.forEach(r => {
    const li = document.createElement('li');
    li.id          = `req-${r.id}`;
    li.textContent = r.text;
    li.style.color = 'red';
    li.style.marginBottom = '4px';
    ul.appendChild(li);
  });
  reqContainer.appendChild(ul);
  fpConfirmPass.parentNode.insertBefore(reqContainer, fpConfirmPass.nextSibling);

  // Wrap inputs + requirements into one container for consistent show/hide
  const passwordArea = document.createElement('div');
  passwordArea.id = 'passwordArea';
  fpNewPass.parentNode.insertBefore(passwordArea, fpNewPass);
  passwordArea.appendChild(fpNewPass);
  passwordArea.appendChild(fpConfirmPass);
  passwordArea.appendChild(reqContainer);

  // Show requirements when New-Password or Confirm or list hovered/focused
  [fpNewPass, fpConfirmPass, reqContainer].forEach(el => {
    el.addEventListener('focus', () => reqContainer.style.display = 'block', true);
    el.addEventListener('mouseenter', () => reqContainer.style.display = 'block');
  });
  // Hide when clicking outside
  document.addEventListener('click', e => {
    if (!passwordArea.contains(e.target)) {
      reqContainer.style.display = 'none';
    }
  });

  // Live-check password requirements on input (dark green when passed)
  fpNewPass.addEventListener('input', () => {
    const pw = fpNewPass.value;
    requirements.forEach(r => {
      const li = document.getElementById(`req-${r.id}`);
      li.style.color = r.test(pw) ? '#006400' : 'red';
    });
  });

   // STEP 1: Request verification code
  sendCodeBtn.addEventListener("click", function () {
    const email = fpEmail.value.trim();
    if (!email) {
      showNotification("Please enter your email.");
      return;
    }
    if (!email.includes("@")) {
      showNotification("Please enter a valid email.");
      return;
    }

    fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || "Failed to send verification code");
          });
        }
        return res.json();
      })
      .then(data => {
        verificationCode = data.code || "";
        fpCode.value = "";
        showNotification("Verification code sent. Please check your email.", "success");
        step1.style.display = "none";
        step2.style.display = "block";
        fpCode.focus();
      })
      .catch(err => {
        showNotification(err.message);
      });
  });

   // STEP 2: Verify code
  verifyCodeBtn.addEventListener("click", function () {
    const codeEntered = fpCode.value.trim();
    if (!codeEntered) {
      showNotification("Please enter the verification code.");
      return;
    }
    if (codeEntered !== verificationCode) {
      showNotification("Incorrect verification code.");
      return;
    }
    showNotification("Code verified!", "success");

    // Clear password fields & reset colors
    fpNewPass.value     = "";
    fpConfirmPass.value = "";
    requirements.forEach(r => {
      document.getElementById(`req-${r.id}`).style.color = 'red';
    });

    step2.style.display = "none";
    step3.style.display = "block";
    fpNewPass.focus();
  });

   // STEP 3: Reset password
  resetBtn.addEventListener("click", function () {
    const newPassword     = fpNewPass.value.trim();
    const confirmPassword = fpConfirmPass.value.trim();

    if (requirements.some(r => !r.test(newPassword))) {
      showNotification("Please satisfy all password requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("Passwords do not match.");
      return;
    }

    fetch("/api/auth/reset-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:       fpEmail.value.trim(),
        newPassword: newPassword
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error || "Failed to reset password");
          });
        }
        return res.json();
      })
      .then(() => {
        showNotification("Password reset successfully!", "success");
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1500);
      })
      .catch(err => {
        showNotification("Error resetting password: " + err.message);
      });
  });

  
   // Helper: Back to Login
  function goBackToLogin() {
    document.getElementById("forgotPasswordBox").style.display = "none";
    document.getElementById("loginBox").style.display         = "block";
    step1.style.display = "block";
    step2.style.display = "none";
    step3.style.display = "none";
    notificationError.textContent   = "";
    notificationSuccess.textContent = "";
    fpEmail.value       = "";
    fpCode.value        = "";
    fpNewPass.value     = "";
    fpConfirmPass.value = "";
    verificationCode    = "";
    requirements.forEach(r => {
      document.getElementById(`req-${r.id}`).style.color = 'red';
    });
    reqContainer.style.display = 'none';
  }

  backToLoginBtn?.addEventListener("click", goBackToLogin);
  backToLoginBtn2?.addEventListener("click", goBackToLogin);
  backToLoginBtn3?.addEventListener("click", goBackToLogin);
});
