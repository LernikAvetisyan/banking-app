const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// List wallets
router.get("/", walletController.listWallets);

// Get a single wallet
router.get("/:cardNumber", walletController.getWallet);

// ADD WALLET (Manual)
router.post("/add", walletController.addWallet);

// CREATE WALLET (Auto-generate)
router.post("/create", walletController.createWallet);

// Update wallet
router.put("/:cardNumber", walletController.updateWallet);

// Delete wallet
router.delete("/:cardNumber", walletController.deleteWallet);

module.exports = router;
