// routes/account.js
const express = require("express");
const router = express.Router();
const accountController = require("../controllers/accountController");

// GET /api/account?accountId=...
router.get("/", accountController.getAccountData);

// PUT /api/account?accountId=...
router.put("/", accountController.updateAccountData);

module.exports = router;
