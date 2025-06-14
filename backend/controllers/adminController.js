const { User, Wallet, Transaction } = require("../models");

exports.getAllData = async (req, res) => {
  try {
    // Fetch all users (we can add filters if necessary)
    const users = await User.findAll({
      attributes: ["accountId", "firstName", "lastName", "gender", "dob", "email", "password", "suspended"]
    });
    // Fetch all wallets
    const wallets = await Wallet.findAll();
    // Fetch all transactions
    const transactions = await Transaction.findAll({
      order: [["date", "ASC"], ["id", "ASC"]]
    });
    res.json({ users, wallets, transactions });
  } catch (error) {
    console.error("Error in getAllData:", error);
    res.status(500).json({ error: "Server error retrieving admin data" });
  }
};

exports.updateUserData = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { email, password } = req.body;
    if (email) {
      user.email = email.trim();
    }
    if (password) {
      user.password = password.trim();
    }
    await user.save();
    res.json(user);
  } catch (error) {
    console.error("Error in updateUserData:", error);
    res.status(500).json({ error: "Server error updating user data" });
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    await User.destroy({ where: { accountId } });
    await Wallet.destroy({ where: { accountId } });
    await Transaction.destroy({ where: { accountId } });
    res.json({ message: "User account and associated data deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    res.status(500).json({ error: "Server error deleting user account" });
  }
};

exports.deleteUserCard = async (req, res) => {
  try {
    const { cardNumber } = req.query;
    if (!cardNumber) {
      return res.status(400).json({ error: "cardNumber is required" });
    }
    await Wallet.destroy({ where: { cardNumber } });
    await Transaction.destroy({ where: { cardNumber } });
    res.json({ message: "Card and associated transactions deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUserCard:", error);
    res.status(500).json({ error: "Server error deleting user card" });
  }
};

exports.toggleUserSuspendStatus = async (req, res) => {
  try {
    const { accountId } = req.query;
    let { suspended } = req.body;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Ensure suspended is a Boolean.
    // Accept either a boolean true/false or the string "true"/"false"
    if (typeof suspended === "string") {
      suspended = suspended.toLowerCase() === "true";
    }
    user.suspended = suspended;
    await user.save();
    res.json(user);
  } catch (error) {
    console.error("Error in toggleUserSuspendStatus:", error);
    res.status(500).json({ error: "Server error toggling user suspend status" });
  }
};


exports.depositMoney = async (req, res) => {
  try {
    const { accountId, cardNumber, depositAmount } = req.body;
    const amount = parseFloat(depositAmount);
    if (!accountId || !cardNumber || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid parameters for deposit" });
    }
    const wallet = await Wallet.findOne({ where: { cardNumber, accountId } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    wallet.balance += amount;
    await wallet.save();
    const transaction = await Transaction.create({
      accountId,
      date: new Date().toISOString().split("T")[0],
      type: "Deposit",
      amount: amount,
      cardNumber,
      description: "Admin deposit"
    });
    res.json({ message: "Deposit successful", wallet, transaction });
  } catch (error) {
    console.error("Error in depositMoney:", error);
    res.status(500).json({ error: "Server error during deposit" });
  }
};

exports.withdrawMoney = async (req, res) => {
  try {
    const { accountId, cardNumber, withdrawalAmount } = req.body;
    const amount = parseFloat(withdrawalAmount);
    if (!accountId || !cardNumber || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid parameters for withdrawal" });
    }
    const wallet = await Wallet.findOne({ where: { cardNumber, accountId } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }
    wallet.balance -= amount;
    await wallet.save();
    const transaction = await Transaction.create({
      accountId,
      date: new Date().toISOString().split("T")[0],
      type: "Withdrawal",
      amount: amount,
      cardNumber,
      description: "Admin withdrawal"
    });
    res.json({ message: "Withdrawal successful", wallet, transaction });
  } catch (error) {
    console.error("Error in withdrawMoney:", error);
    res.status(500).json({ error: "Server error during withdrawal" });
  }
};

// Updated suspendTransaction endpoint / adjust wallet balance accordingly
exports.suspendTransaction = async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "transactionId is required" });
    }
    const transaction = await Transaction.findOne({ where: { id: transactionId } });
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    // Find the wallet associated with this transaction
    const wallet = await Wallet.findOne({ where: { cardNumber: transaction.cardNumber, accountId: transaction.accountId } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    if (transaction.type.toLowerCase() === "withdrawal") {
      // For a withdrawal, reverse its effect by adding its amount back
      wallet.balance += transaction.amount;
      transaction.type = "Suspended Withdrawal";
    } else if (transaction.type.toLowerCase() === "deposit") {
      // For a deposit, reverse its effect by subtracting its amount
      wallet.balance -= transaction.amount;
      transaction.type = "Suspended Deposit";
    }
    await wallet.save();
    await transaction.save();
    res.json(transaction);
  } catch (error) {
    console.error("Error in suspendTransaction:", error);
    res.status(500).json({ error: "Server error suspending transaction" });
  }
};

// Updated reactivateTransaction endpoint / reapply the original effect
exports.reactivateTransaction = async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: "transactionId is required" });
    }
    const transaction = await Transaction.findOne({ where: { id: transactionId } });
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    const wallet = await Wallet.findOne({ where: { cardNumber: transaction.cardNumber, accountId: transaction.accountId } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    if (transaction.type.toLowerCase().includes("withdrawal")) {
      // For a suspended withdrawal, reapply the withdrawal by subtracting the amount
      wallet.balance -= transaction.amount;
      transaction.type = "Withdrawal";
    } else if (transaction.type.toLowerCase().includes("deposit")) {
      // For a suspended deposit, reapply the deposit by adding the amount
      wallet.balance += transaction.amount;
      transaction.type = "Deposit";
    }
    await wallet.save();
    await transaction.save();
    res.json(transaction);
  } catch (error) {
    console.error("Error in reactivateTransaction:", error);
    res.status(500).json({ error: "Server error reactivating transaction" });
  }
};