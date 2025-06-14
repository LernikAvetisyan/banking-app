const { Op } = require("sequelize"); // For transaction usage if needed
const sequelize = require("../db");  // Make sure you import your Sequelize instance
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");


 // Generate a random 16-digit number starting with 4 (Visa) or 5 (Master)
function generateRandomCardNumber(cardType) {
  const prefix = cardType === "Visa" ? "4" : "5";
  let number = prefix;
  for (let i = 0; i < 15; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

/*
  Attempt to generate a unique 16-digit card number by checking the database
  for collisions. Tries up to 10 times before throwing an error
 */
async function generateUniqueCardNumber(cardType) {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const candidate = generateRandomCardNumber(cardType);
    const existing = await Wallet.findOne({ where: { cardNumber: candidate } });
    if (!existing) {
      return candidate;
    }
  }
  throw new Error("Could not generate a unique 16-digit card number after 10 attempts");
}


 // Generate a random expiration date in the format MM/YY.
function generateExpirationDate() {
  const month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, "0");
  const currentYear = new Date().getFullYear();
  const year = currentYear + Math.floor(Math.random() * 5) + 1;
  const yearShort = year.toString().substr(2);
  return `${month}/${yearShort}`;
}

  // Generate a random 3-digit CVV.
function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
}

// LIST & GET
exports.listWallets = async (req, res) => {
  try {
    const { accountId } = req.query;
    let wallets;
    if (accountId) {
      wallets = await Wallet.findAll({ where: { accountId } });
    } else {
      wallets = await Wallet.findAll();
    }
    res.json(wallets);
  } catch (error) {
    console.error("Error listing wallets:", error);
    res.status(500).json({ error: "Server error listing wallets" });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const wallet = await Wallet.findByPk(cardNumber);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ error: "Server error fetching wallet" });
  }
};

// ADD WALLET (Manual)
exports.addWallet = async (req, res) => {
  const t = await sequelize.transaction(); // START TRANSACTION
  try {
    const {
      cardNumber,
      cardType,
      cardHolderName,
      expirationDate,
      cvv,
      accountId,
    } = req.body;

    // Auto-generate a random deposit between $100 and $500
    const balance = Math.floor(Math.random() * 401) + 100;

    // Remove spaces just in case
    const formattedCardNumber = cardNumber.replace(/\s/g, "");

    // Check if a wallet with the same cardNumber already exists
    const existing = await Wallet.findOne({
      where: { cardNumber: formattedCardNumber },
      transaction: t, // use the same transaction
      lock: t.LOCK.UPDATE // or t.LOCK.KEY_SHARE for your DB
    });

    if (existing) {
      await t.rollback(); // ROLLBACK if we found a duplicate
      return res.status(409).json({ error: "A wallet with that card number already exists." });
    }

    // Create the wallet within the transaction
    const wallet = await Wallet.create(
      {
        cardNumber: formattedCardNumber,
        cardType,
        cardHolderName,
        expirationDate,
        cvv,
        accountId,
        balance,
      },
      { transaction: t }
    );

    // COMMIT the transaction
    await t.commit();
    res.status(201).json(wallet);
  } catch (error) {
    // ROLLBACK on error
    await t.rollback();
    console.error("Error adding wallet:", error);
    res.status(500).json({
      error: error.message || "Server error adding wallet",
    });
  }
};

// CREATE WALLET (Auto-Generate)
exports.createWallet = async (req, res) => {
  const t = await sequelize.transaction(); // START TRANSACTION
  try {
    const {
      cardType,
      cardHolderName,
      expirationDate,
      cvv,
      accountId,
      cardNumber,
    } = req.body;

    // If user provided a cardNumber, remove spaces
    let finalCardNumber = cardNumber ? cardNumber.replace(/\s/g, "") : null;

    // If user didn't provide a card number, generate
    if (!finalCardNumber) {
      finalCardNumber = await generateUniqueCardNumber(cardType);
    } else {
      // Check for duplicates if a cardNumber is explicitly provided
      const existing = await Wallet.findOne({
        where: { cardNumber: finalCardNumber },
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (existing) {
        await t.rollback();
        return res.status(409).json({ error: "A wallet with that card number already exists." });
      }
    }

    // If expirationDate is not provided, generate
    const finalExpirationDate =
      expirationDate && expirationDate.trim() !== ""
        ? expirationDate
        : generateExpirationDate();

    // If cvv is not provided, generate
    const finalCVV =
      cvv && cvv.trim() !== "" ? cvv : generateCVV();

    // For auto-generated wallets, set balance to 0
    const wallet = await Wallet.create(
      {
        cardNumber: finalCardNumber,
        cardType,
        cardHolderName,
        expirationDate: finalExpirationDate,
        cvv: finalCVV,
        accountId,
        balance: 0,
      },
      { transaction: t }
    );

    // COMMIT the transaction
    await t.commit();
    res.status(201).json(wallet);
  } catch (error) {
    // ROLLBACK on error
    await t.rollback();
    console.error("Error creating wallet:", error);
    res.status(500).json({
      error: error.message || "Server error creating wallet",
    });
  }
};

// Deposit & Withdraw
exports.depositFunds = async (req, res) => {
  try {
    const { cardNumber, amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Deposit amount must be positive." });
    }
    const wallet = await Wallet.findByPk(cardNumber);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found." });
    }

    wallet.balance += amount;
    await wallet.save();

    // Optionally record a transaction
    await Transaction.create({
      cardNumber,
      type: "deposit",
      amount,
      timestamp: new Date()
    });

    res.json({ message: "Deposit successful.", wallet });
  } catch (error) {
    console.error("Error depositing funds:", error);
    res.status(500).json({ error: "Server error depositing funds." });
  }
};

exports.withdrawFunds = async (req, res) => {
  try {
    const { cardNumber, amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Withdrawal amount must be positive." });
    }
    const wallet = await Wallet.findByPk(cardNumber);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found." });
    }
    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds." });
    }

    wallet.balance -= amount;
    await wallet.save();

    // Optionally record a transaction
    await Transaction.create({
      cardNumber,
      type: "withdrawal",
      amount,
      timestamp: new Date()
    });

    res.json({ message: "Withdrawal successful.", wallet });
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    res.status(500).json({ error: "Server error withdrawing funds." });
  }
};

// UPDATE and DELETE
exports.updateWallet = async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const updateData = req.body;
    const wallet = await Wallet.findByPk(cardNumber);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    await wallet.update(updateData);
    res.json({ message: "Wallet updated successfully", wallet });
  } catch (error) {
    console.error("Error updating wallet:", error);
    res.status(500).json({ error: "Server error updating wallet" });
  }
};

exports.deleteWallet = async (req, res) => {
  try {
    const { cardNumber } = req.params;
    await Transaction.destroy({ where: { cardNumber } });
    const result = await Wallet.destroy({ where: { cardNumber } });
    if (!result) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json({ message: "Wallet deleted successfully" });
  } catch (error) {
    console.error("Error deleting wallet:", error);
    res.status(500).json({ error: "Server error deleting wallet" });
  }
};
