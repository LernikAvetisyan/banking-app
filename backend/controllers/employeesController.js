const { User, Wallet, Transaction } = require("../models");

exports.getAllData = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "accountId",
        "firstName",
        "lastName",
        "gender",
        "dob",
        "email"
      ],
      
    });

    // 2) Fetch all wallets
    const wallets = await Wallet.findAll({
      // add attributes if you only want certain columns
    });

    // 3) Fetch all transactions
    const transactions = await Transaction.findAll({
      // order them by date, etc.
      order: [["date", "ASC"], ["id", "ASC"]]
    });

    // 4) Return them as JSON
    res.json({
      users,
      wallets,
      transactions
    });
  } catch (error) {
    console.error("Error in employeesController.getAllData:", error);
    res.status(500).json({ error: "Server error retrieving employees data" });
  }
};