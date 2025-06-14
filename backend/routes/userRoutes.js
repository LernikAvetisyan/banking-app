const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET all users from the "users" table
router.get("/", (req, res) => {
  pool.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error("Error fetching users:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// POST new user (using accountId as the primary identifier)
router.post("/", (req, res) => {
  const { accountId, firstName, lastName, email, password, dob, gender } = req.body;
  const sql = "INSERT INTO users (accountId, firstName, lastName, email, password, dob, gender) VALUES (?, ?, ?, ?, ?, ?, ?)";
  pool.query(sql, [accountId, firstName, lastName, email, password, dob, gender], (err, results) => {
    if (err) {
      console.error("Error inserting user:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ message: "User created successfully", insertId: results.insertId });
  });
});

// GET user profile by accountId
router.get("/profile", (req, res) => {
  const accountId = req.query.accountId;
  if (!accountId) {
    return res.status(400).json({ error: "Missing accountId" });
  }
  pool.query("SELECT accountId, email, firstName, lastName FROM users WHERE accountId = ?", [accountId], (err, results) => {
    if (err) {
      console.error("Error fetching user profile:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(results[0]);
  });
});

module.exports = router;
