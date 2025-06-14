const { Op } = require("sequelize");
const Transaction = require("../models/Transaction");

/*
  GET /api/spend-analysis
  Query params.
    accountId   (required)
    cardNumber  (optional, "all" means ignore)
    month       (optional, in "YYYY-MM" format)
 */
exports.getSpendAnalysis = async (req, res) => {
  try {
    const { accountId, cardNumber, month } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // Build query filter using accountId
    const where = { accountId };
    if (cardNumber && cardNumber !== "all") {
      where.cardNumber = cardNumber;
    }
    if (month) {
      const [year, mon] = month.split("-");
      if (year && mon) {
        const startDate = new Date(parseInt(year), parseInt(mon) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(mon), 0);
        where.date = { [Op.between]: [startDate, endDate] };
      }
    }

    // Fetch matching transactions, ordered by date and id
    const transactions = await Transaction.findAll({
      where,
      order: [["date", "ASC"], ["id", "ASC"]]
    });

    // Build daily sums - if transaction type includes "withdraw", we should treat as spending, otherwise income
    const dailySpending = {};
    const dailyIncome = {};

    transactions.forEach(tx => {
      const d = new Date(tx.date).toISOString().split("T")[0];
      const isWithdrawal = tx.type && tx.type.toLowerCase().includes("withdraw");

      if (isWithdrawal) {
        // Summarize as spending
        dailySpending[d] = (dailySpending[d] || 0) + tx.amount;
      } else {
        // Summarize as income (deposits, etc.)
        dailyIncome[d] = (dailyIncome[d] || 0) + tx.amount;
      }
    });

    // Merge and sort all dates
    const allDates = Array.from(new Set([
      ...Object.keys(dailySpending),
      ...Object.keys(dailyIncome)
    ])).sort();

    const spendingArray = allDates.map(date => dailySpending[date] || 0);
    const incomeArray = allDates.map(date => dailyIncome[date] || 0);

    res.json({
      dates: allDates,
      spending: spendingArray,
      income: incomeArray,
      transactions
    });
  } catch (error) {
    console.error("Spend analysis error:", error);
    res.status(500).json({ error: "Server error during spend analysis" });
  }
};
