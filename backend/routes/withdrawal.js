const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");

// Endpoint for bank users withdrawal request
router.post("/bank", withdrawalController.withdrawalToBankUser);

// Endpoint for external withdrawals
router.post("/external", withdrawalController.withdrawalToExternal);

// Endpoint to accept an incoming withdrawal request
router.put("/incoming-withdrawals/:id/accept", withdrawalController.acceptIncomingWithdrawal);

// Endpoint to reject an incoming withdrawal request
router.put("/incoming-withdrawals/:id/reject", withdrawalController.rejectIncomingWithdrawal);

// Endpoint to get pending withdrawal requests for the recipient (User 2)
router.get("/incoming-withdrawals", withdrawalController.getIncomingWithdrawals);

module.exports = router;
