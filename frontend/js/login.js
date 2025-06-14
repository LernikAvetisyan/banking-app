// Wait until the DOM is fully loaded before executing the login logic.
document.addEventListener("DOMContentLoaded", function () {
  
  // Get references to the login form and the element for showing errors.
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  // If a login form exists, attach an event listener for the "submit" event.
  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      // Prevent the default form submission behavior.
      event.preventDefault();
      console.log("✅ Login form submitted");

      // Retrieve the email, password, and role values from the form inputs.
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const role = document.getElementById("loginRole").value; // Expected values: "user", "employee", or "admin"

      // Determine which login endpoint to use based on the chosen role.
      let endpoint = "http://localhost:3000/api/auth/login"; // Default endpoint for regular users.
      if (role === "admin") {
        endpoint = "http://localhost:3000/api/auth/adminlogin";
      } else if (role === "employee") {
        endpoint = "http://localhost:3000/api/auth/employeelogin";
      }

      try {
        // Make a POST request to the determined login endpoint.
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        // If the response is not OK or if an error or missing token is returned, show an error message.
        if (!response.ok || data.error || !data.token) {
          loginError.innerText = data.error || "Login failed. Please try again.";
          return;
        }

        // Clear any previous error messages.
        loginError.innerText = "";
        console.log("✅ Login successful!");

        // Store the authentication token and user details (accountId, first name, last name, email, and role)
        // in the sessionStorage. This is used to keep track of the logged-in user.
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("user", JSON.stringify({
          accountId: data.accountId,   // 9-digit accountId
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role
        }));
        console.log("✅ Token and user stored in sessionStorage. User is logged in.");

        // Redirect the user to the proper page based on their role:
        // - Admins are sent to pages/admin.html.
        // - Employees to pages/employees.html.
        // - Regular users to the main dashboard (index.html).
        if (data.role === "admin") {
          window.location.href = "pages/admin.html";
        } else if (data.role === "employee") {
          window.location.href = "pages/employees.html";
        } else {
          window.location.href = "index.html"; // Main dashboard for regular users.
        }
      } catch (error) {
        // Log any error that occurs during the login process and display a generic error message.
        console.error("Login Error:", error);
        loginError.innerText = "❌ Server error. Try again later.";
      }
    });
  }

  /*
    redirectToLearnMore
    Redirects the user to the "Learn More" page.
   */
  function redirectToLearnMore() {
    window.location.href = "pages/learn-more.html";
  }

  /*
   * redirectToSignUp
    Redirects the user to the "Sign Up" page.
   */
  function redirectToSignUp() {
    window.location.href = "pages/signup.html";
  }
});