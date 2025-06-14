const { User, Wallet, Transaction } = require("../models");

exports.getAccountData = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // 1) Fetch the user record
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2) Fetch wallets for this user
    const wallets = await Wallet.findAll({ where: { accountId } });

    // 3) Fetch transactions, ordered by date/id
    const transactions = await Transaction.findAll({
      where: { accountId },
      order: [["date", "ASC"], ["id", "ASC"]]
    });

    // 4) Convert any "withdrawal" to negative amounts for clarity
    transactions.forEach(tx => {
      if (tx.type && tx.type.toLowerCase().includes("withdraw")) {
        tx.amount = -Math.abs(tx.amount);
      } else {
        tx.amount = Math.abs(tx.amount);
      }
    });

    // 5) Return them
    res.json({
      user,
      wallets,
      transactions
    });
  } catch (error) {
    console.error("Error in getAccountData:", error);
    res.status(500).json({ error: "Server error retrieving account data" });
  }
};

exports.updateAccountData = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }

    // 1) Fetch user
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2) Update user fields from request body
    const {
      firstName,
      lastName,
      dob,
      email,
      phone,
      address,
      profilePicDataUrl
    } = req.body;

    if (typeof firstName === "string") user.firstName = firstName.trim();
    if (typeof lastName  === "string") user.lastName  = lastName.trim();
    if (typeof dob       === "string") user.dob       = dob.trim();
    if (typeof email     === "string") user.email     = email.trim();
    if (typeof phone     === "string") user.phone     = phone.trim();
    if (typeof address   === "string") user.address   = address.trim();
    if (typeof profilePicDataUrl === "string") {
      user.profilePicDataUrl = profilePicDataUrl;
    }

    // 3) Save the user
    await user.save();

    // 4) Return the updated user
    res.json(user);
  } catch (error) {
    console.error("Error in updateAccountData:", error);
    res.status(500).json({ error: "Server error updating account data" });
  }
};
