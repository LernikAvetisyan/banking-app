// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

// GET /api/admin - returns all users, wallets, and transactions for admin
router.get("/", adminController.getAllData);

// PUT /api/admin/user - update user info (email, password, etc.)
router.put("/user", adminController.updateUserData);

// DELETE /api/admin/user - delete a user account (and associated wallets and transactions)
router.delete("/user", adminController.deleteUserAccount);

// DELETE /api/admin/card - delete a specific card by cardNumber
router.delete("/card", adminController.deleteUserCard);

// PATCH /api/admin/user/suspend - toggle user suspend status
router.patch("/user/suspend", adminController.toggleUserSuspendStatus);

// POST /api/admin/deposit - deposit money to a card
router.post("/deposit", adminController.depositMoney);

// POST /api/admin/withdraw - withdraw money from a card
router.post("/withdraw", adminController.withdrawMoney);

// PATCH /api/admin/transaction/suspend - suspend a transaction
router.patch("/transaction/suspend", adminController.suspendTransaction);

// PATCH /api/admin/transaction/reactivate - reactivate a suspended transaction
router.patch("/transaction/reactivate", adminController.reactivateTransaction);

module.exports = router;
