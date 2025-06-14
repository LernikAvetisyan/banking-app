const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");

exports.listTransactions = async (req, res) => {
  try {
    const { accountId, status, type } = req.query;
    const where = {};
    if (accountId) {
      where.accountId = accountId;
    }
    if (status) {
      where.status = status;
    }
    if (type && type !== "all") {
      where.type = type;
    }
    const transactions = await Transaction.findAll({
      where,
      order: [["date", "DESC"]]
    });
    res.json(transactions);
  } catch (error) {
    console.error("Error listing transactions:", error);
    res.status(500).json({ error: "Server error listing transactions" });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Server error fetching transaction" });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, date, type, amount, cardNumber, description } = req.body;
    const wallet = await Wallet.findOne({ where: { cardNumber } });
    if (!wallet) {
      return res.status(400).json({ error: "Wallet not found for given cardNumber" });
    }
    if (type.toLowerCase() === "withdrawal") {
      if (wallet.balance < amount) {
        return res.status(400).json({ error: "Insufficient funds" });
      }
      wallet.balance -= amount;
      await wallet.save();
    } else if (type.toLowerCase() === "deposit") {
      wallet.balance += amount;
      await wallet.save();
    }
    const newTx = await Transaction.create({
      accountId,
      date: date || new Date(),
      type,
      amount,
      cardNumber,
      description
    });
    res.status(201).json(newTx);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Server error creating transaction" });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    await transaction.update(updateData);
    res.json({ message: "Transaction updated successfully", transaction });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Server error updating transaction" });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Transaction.destroy({ where: { id } });
    if (!result) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Server error deleting transaction" });
  }
};