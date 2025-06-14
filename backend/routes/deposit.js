// routes/deposit.js
const express = require("express");
const router = express.Router();
const depositController = require("../controllers/depositController");

// Endpoint for bank users deposit request
router.post("/bank", depositController.depositToBankUser);

// Endpoint for external deposits (update wallet balance and record transaction)
router.post("/external", depositController.depositToExternal);

// Endpoint to accept an incoming deposit request
router.put("/incoming-deposits/:id/accept", depositController.acceptIncomingDeposit);

// Endpoint to reject an incoming deposit request
router.put("/incoming-deposits/:id/reject", depositController.rejectIncomingDeposit);

// Endpoint to get pending deposit requests (for the payer)
router.get("/incoming-deposits", depositController.getIncomingDeposits);

module.exports = router;
