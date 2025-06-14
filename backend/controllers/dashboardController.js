const { Wallet, Transaction } = require("../models");

exports.getDashboardData = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "Missing accountId" });
    }
    // Fetch all wallets for the user
    const wallets = await Wallet.findAll({ where: { accountId } });
    // Fetch only transactions with status "completed" for totals
    const transactions = await Transaction.findAll({
      where: { accountId, status: "completed" },
      order: [["date", "ASC"], ["id", "ASC"]]
    });
    transactions.forEach(tx => {
      if (tx.type && tx.type.toLowerCase().includes("withdraw")) {
        tx.amount = -Math.abs(tx.amount);
      } else {
        tx.amount = Math.abs(tx.amount);
      }
    });
    res.json({ wallets, transactions });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    res.status(500).json({ error: "Server error retrieving dashboard data" });
  }
};
