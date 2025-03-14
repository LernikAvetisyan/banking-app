document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault(); // Prevent default form submission

      console.log("✅ Login form submitted");

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const role = document.getElementById("loginRole").value; // "user", "employee", or "admin"

      // Determine the endpoint based on the selected role.
      let endpoint = "http://localhost:3000/api/auth/login"; // default regular user endpoint
      if (role === "admin") {
        endpoint = "http://localhost:3000/api/auth/adminlogin";
      } else if (role === "employee") {
        endpoint = "http://localhost:3000/api/auth/employeelogin";
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        // Check if response is not OK or token is missing
        if (!response.ok || data.error || !data.token) {
          loginError.innerText = data.error || "Login failed. Please try again.";
          return;
        }

        // Clear any previous error message
        loginError.innerText = "";
        console.log("✅ Login successful!");

        // Store authentication token & user details in sessionStorage (do not use localStorage)
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("user", JSON.stringify({
          userId: data.userId,
          accountId: data.accountId, // Make sure backend returns accountId
          email: data.email,
          name: data.firstName || "User",
          role: data.role
        }));
        console.log("✅ Token and user stored in sessionStorage. User is logged in.");

        // Redirect based on the returned role
        if (data.role === "admin") {
          window.location.href = "pages/admin.html";
        } else if (data.role === "employee") {
          window.location.href = "pages/employees.html";
        } else {
          window.location.href = "index.html"; // main dashboard for regular users
        }
      } catch (error) {
        console.error("Login Error:", error);
        loginError.innerText = "❌ Server error. Try again later.";
      }
    });
  }

  function redirectToLearnMore() {
    window.location.href = "pages/learn-more.html";
  }

  function redirectToSignUp() {
    window.location.href = "pages/signup.html";
  }
});
