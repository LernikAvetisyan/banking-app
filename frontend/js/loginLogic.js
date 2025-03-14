// frontend/js/loginLogic.js (pure logic only)
const userConfig = {
    defaultEmail: "user@example.com",
    defaultPassword: "password123"
  };
  
  function logIn({ username, password }) {
    if (username === userConfig.defaultEmail && password === userConfig.defaultPassword) {
      return { success: true, token: "dummy-token" };
    } else {
      return { success: false, error: "Invalid credentials" };
    }
  }
  
  module.exports = { logIn };
  