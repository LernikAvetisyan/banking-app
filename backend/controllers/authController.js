const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");   //for hashing passwords if we use it
// const nodemailer = require("nodemailer"); // we had issues with Google 
const User = require("../models/User");
const userConfig = require("../config/user.config");
const adminConfig = require("../config/admin.config");
const employeeConfig = require("../config/employee.config");

const JWT_SECRET         = process.env.JWT_SECRET         || "supersecretkey"; // secret key for signing access tokens
const REFRESH_SECRET     = process.env.REFRESH_SECRET     || "superrefreshsecret"; // secret key for signing refresh tokens
// Every 15 minutes your front end will see a 401 (token expired) and automatically call your /refresh endpoint with the refresh token.
const ACCESS_EXPIRES_IN  = "15m";    // short-lived access token (15 minutes)
//As long as that refresh token is valid (up to 30 days after it was issued), the client can keep minting new access tokens every quarter-hour.
const REFRESH_EXPIRES_IN = "30d";    // long-lived refresh token (30 days)

// Helper to sign both access and refresh tokens
function signTokens(payload) {
  const accessToken  = jwt.sign(payload, JWT_SECRET,    { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}


 // Helper function to generate a random 9-digit string.
function generate9Digit() {
  let str = "";
  for (let i = 0; i < 9; i++) {
    str += Math.floor(Math.random() * 10).toString();
  }
  return str;
}

/*
  Generates a unique 9-digit accountId by checking the database for collisions.
  Tries up to 10 times before throwing an error
 */
async function generateUniqueAccountId() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const candidate = generate9Digit();
    const existing = await User.findOne({ where: { accountId: candidate } });
    if (!existing) {
      // No user with this accountId, so it's safe to use
      return candidate;
    }
    // If we get here, there was a collision; try again
  }
  // If we failed to find a unique ID after 10 attempts, throw an error
  throw new Error("Could not generate a unique 9-digit accountId after 10 attempts");
}


/*
  POST /signup
  Creates a new user with a generated accountId
   This stores the password in plain text
 */
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, gender, email, password } = req.body;
    let dob = req.body.dob;

     // if dob is in MM/DD/YYYY form, convert it to ISO YYYY-MM-DD
     if (typeof dob === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      const [mo, day, yr] = dob.split("/");
      dob = `${yr}-${mo.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    
    // Check if email is already taken
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate a unique 9-digit accountId
    const accountId = await generateUniqueAccountId();
    //  const saltRounds = 10;
    //  const hashedPassword = await bcrypt.hash(password, saltRounds);


    // Create the new user (plain-text password)
    const newUser = await User.create({
      accountId,
      firstName,
      lastName,
      gender,
      dob,
      email,
      password   // password: hashedPassword, // Uncomment this line to store hashed password
    });

     // Sign access & refresh tokens
     const payload = { accountId: newUser.accountId, email: newUser.email, role: "user" };
     const { accessToken, refreshToken } = signTokens(payload);

    return res.status(201).json({
      message: "User created successfully",
      user: newUser,
      accessToken,
      refreshToken
      /*user: {
        accountId: newUser.accountId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        gender: newUser.gender,
        dob: newUser.dob,
        email: newUser.email,
        password: newUser.password
      },
      token*/
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: error.message || "Server error during signup" });
  }
};


/*
  POST /login
  Logs in a user by comparing plain-text passwords
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try to find the user in the database
    let user = await User.findOne({ where: { email } });
    
    // If not found, check against default credentials from userConfig
    if (!user && email === userConfig.defaultEmail && password === userConfig.defaultPassword) {
      // Create a temporary user object from userConfig ( not store plain text in production)
      user = {
        accountId: userConfig.defaultAccountId,
        email: userConfig.defaultEmail,
        firstName: "Default",
        lastName: "User",
        suspended: false
      };
    }
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // If user was fetched from database, check if the account is suspended
    if (user.suspended) {
      return res.status(403).json({ error: "Your account is suspended. Please contact customer service." });
    }

    /* Compare hashed password
     if (user && user.password) {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }
    */

    // If the user is from the database, compare plain-text password
    if (user && user.password && user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Sign access & refresh tokens
    const payload = { accountId: user.accountId, email: user.email, role: "user" };
    const { accessToken, refreshToken } = signTokens(payload);

    return res.json({
      token: accessToken,       // for backward compatibility
      email: user.email,
      accountId: user.accountId,  // Using accountId as the identifier
      firstName: user.firstName,
      lastName: user.lastName,
      role: "user",
      message: "Login successful!",
      refreshToken
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login" });
  }
};


/*
  POST /adminlogin
  Authenticates admin credentials using values from admin.config.js.
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email !== adminConfig.defaultEmail || password !== adminConfig.defaultPassword) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }
    const token = jwt.sign(
      { email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    return res.json({
      token,
      email,
      role: "admin",
      message: "Admin login successful!"
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ error: "Server error during admin login" });
  }
};

/*
  POST /employeelogin
  Authenticates employee credentials using values from employee.config.js.
 */
exports.employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email !== employeeConfig.defaultEmail || password !== employeeConfig.defaultPassword) {
      return res.status(401).json({ error: "Invalid employee credentials" });
    }
    const token = jwt.sign(
      { email, role: "employee" },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    return res.json({
      token,
      email,
      role: "employee",
      message: "Employee login successful!"
    });
  } catch (error) {
    console.error("Employee login error:", error);
    return res.status(500).json({ error: "Server error during employee login" });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token required" });
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }
    const { accessToken } = signTokens({
      accountId: payload.accountId,
      email:     payload.email,
      role:      payload.role
    });
    return res.json({ accessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Server error during token refresh" });
  }
};

// In authController.js
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Look up user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return 404 if user is not found
      return res.status(404).json({ error: "User not found" });
    }

    // If user exists, generate or fix the verification code
    const verificationCode = "123456"; // or a random code
    // Return it for testing (don't do this in production)
    return res.json({ code: verificationCode });
  } catch (error) {
    console.error("Forgot Password error:", error);
    return res.status(500).json({ error: "Server error during forgot password" });
  }
};



 
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // const saltRounds = 10;
    // user.password = await bcrypt.hash(newPassword, saltRounds);

    // Store the new password in plain text.
    // In production we should hash the password before saving
    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Server error during password reset" });
  }
};  
