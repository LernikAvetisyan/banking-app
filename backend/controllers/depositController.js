const { Wallet, Transaction, User } = require("../models");
const { Op } = require("sequelize");

/**
  POST /api/deposit/bank
  Body: { payerUserId, depositAmount, recipientCardNumber, recipientAccountId }
  Flow:
  - User 1 (the recipient) selects which of their cards should receive funds
  - They enter the payer’s account ID (User 2's ID) and the deposit amount
  - This creates two records
     1) Under User 2’s account (type "Deposit Request", status "pending") – so that user 2 sees the incoming deposit request
     2) Under User 1’s account (type "Requested Deposit", status "pending") – so user 1 sees “In Progress.”
 */
exports.depositToBankUser = async (req, res) => {
  try {
    const { payerUserId, depositAmount, recipientCardNumber, recipientAccountId } = req.body;
    if (
      !payerUserId ||
      !recipientAccountId ||
      !depositAmount ||
      depositAmount <= 0 ||
      !recipientCardNumber
    ) {
      return res.status(400).json({
        error: "Invalid payerUserId, recipientAccountId, depositAmount, or recipientCardNumber"
      });
    }

    // Normalize recipient card (remove spaces)
    const normalizedRecipientCard = recipientCardNumber.replace(/\s/g, "");

    // 1) Verify the payer (User 2) exists
    const payerUser = await User.findOne({ where: { accountId: payerUserId } });
    if (!payerUser) {
      return res.status(404).json({ error: "Payer user not found" });
    }
    // 2) Verify the recipient (User 1) exists
    const recipientUser = await User.findOne({ where: { accountId: recipientAccountId } });
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found" });
    }
    // 3) Verify the recipient's chosen wallet belongs to User 1
    const recipientWallet = await Wallet.findOne({
      where: {
        cardNumber: normalizedRecipientCard,
        accountId: recipientAccountId
      }
    });
    if (!recipientWallet) {
      console.error("No wallet found for card:", normalizedRecipientCard, "and account:", recipientAccountId);
      return res.status(404).json({ error: "Recipient wallet not found" });
    }

    // 4) Create a "Deposit Request" for User 2 (the payer)
    const payerTx = await Transaction.create({
      accountId: payerUserId,
      fromAccountId: recipientAccountId,
      date: new Date().toISOString().split("T")[0],
      type: "Deposit Request",
      amount: parseFloat(depositAmount),
      cardNumber: normalizedRecipientCard,
      recipientCardNumber: normalizedRecipientCard,
      description: "", // Set to empty so frontend builds the description
      status: "pending"
    });

    // 5) Create a corresponding "Requested Deposit" for User 1 (the recipient)
    const recipientTx = await Transaction.create({
      accountId: recipientAccountId,
      fromAccountId: payerUserId,
      date: new Date().toISOString().split("T")[0],
      type: "Requested Deposit",
      amount: parseFloat(depositAmount),
      cardNumber: normalizedRecipientCard,
      recipientCardNumber: normalizedRecipientCard,
      description: "", // Set to empty
      status: "pending"
    });

    return res.json({
      message: "Deposit request successful",
      payerTransaction: payerTx,
      recipientTransaction: recipientTx
    });
  } catch (err) {
    console.error("Error in depositToBankUser:", err);
    return res.status(500).json({ error: "Server error during bank deposit" });
  }
};

/*
  POST /api/deposit/external
  Body: { cardNumber, depositAmount }
  Creates a single "Deposit" transaction for out-of-bank deposits, no extra records.
 */
exports.depositToExternal = async (req, res) => {
  try {
    const { cardNumber, depositAmount } = req.body;
    if (!cardNumber || !depositAmount || depositAmount <= 0) {
      return res.status(400).json({ error: "Invalid cardNumber or depositAmount" });
    }
    const wallet = await Wallet.findOne({ where: { cardNumber } });
    if (!wallet) {
      return res.status(404).json({ error: "Destination wallet not found" });
    }
    // Update wallet balance
    wallet.balance += parseFloat(depositAmount);
    await wallet.save();

    // Create a single "Deposit" transaction
    await Transaction.create({
      accountId: wallet.accountId,
      date: new Date().toISOString().split("T")[0],
      type: "Deposit",
      amount: parseFloat(depositAmount),
      cardNumber: wallet.cardNumber,
      description: "", // Set to empty so frontend builds the description if needed
      status: "completed"
    });

    return res.json({
      message: "External deposit successful",
      updatedWallet: {
        cardNumber: wallet.cardNumber,
        balance: wallet.balance
      }
    });
  } catch (err) {
    console.error("Error in depositToExternal:", err);
    return res.status(500).json({ error: "Server error during external deposit" });
  }
};

/*
  PUT /api/deposit/incoming-deposits/:id/accept
  Body: { cardNumber }
  When User 2 (the payer) accepts the deposit request:
  - Update both records' status to "completed" (do not change the type).
  - Deduct funds from the payer's wallet and credit the recipient's wallet.
 */
exports.acceptIncomingDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { cardNumber } = req.body;
    if (!cardNumber) {
      return res.status(400).json({ error: "Card number is required for acceptance" });
    }

    // 1) Find the payer’s transaction (Deposit Request)
    const payerTx = await Transaction.findByPk(id);
    if (!payerTx) {
      return res.status(404).json({ error: "Deposit transaction not found" });
    }
    if (payerTx.status !== "pending" || payerTx.type !== "Deposit Request") {
      return res.status(400).json({ error: "Deposit is not pending" });
    }

    // 2) Find the corresponding "Requested Deposit" for user 1
    const recipientTx = await Transaction.findOne({
      where: {
        accountId: payerTx.fromAccountId,
        type: "Requested Deposit",
        amount: payerTx.amount,
        cardNumber: payerTx.cardNumber
      }
    });
    if (!recipientTx) {
      return res.status(404).json({ error: "Corresponding recipient transaction not found" });
    }

    const depositAmount = payerTx.amount;
    const normalizedPayerCard = cardNumber.replace(/\s/g, "");
    const payerWallet = await Wallet.findOne({ where: { cardNumber: normalizedPayerCard } });
    if (!payerWallet) {
      return res.status(404).json({ error: "Payer's wallet not found" });
    }
    if (payerWallet.balance < depositAmount) {
      return res.status(400).json({ error: "Insufficient funds in payer's wallet" });
    }

    const normalizedRecipientCard = payerTx.recipientCardNumber
      ? payerTx.recipientCardNumber.replace(/\s/g, "")
      : null;
    if (!normalizedRecipientCard) {
      return res.status(400).json({ error: "Recipient card not found in transaction" });
    }
    const recipientWallet = await Wallet.findOne({
      where: {
        cardNumber: normalizedRecipientCard,
        accountId: payerTx.fromAccountId
      }
    });
    if (!recipientWallet) {
      return res.status(404).json({ error: "Recipient wallet not found" });
    }

    // Deduct funds from payer's wallet
    payerWallet.balance -= depositAmount;
    await payerWallet.save();

    // Only update the status to "completed" (do not change the type)
    payerTx.status = "completed";
    await payerTx.save();

    recipientTx.status = "completed";
    await recipientTx.save();

    // Credit recipient's wallet
    recipientWallet.balance += depositAmount;
    await recipientWallet.save();

    return res.json({ message: "Deposit accepted successfully" });
  } catch (err) {
    console.error("Error accepting incoming deposit:", err);
    return res.status(500).json({ error: "Server error during deposit acceptance" });
  }
};

/*
 PUT /api/deposit/incoming-deposits/:id/reject
 Body: { }
 When User 2 (the payer) rejects the deposit request:
 - Update both records' status to "rejected" ( not modify description or type).
 */
exports.rejectIncomingDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Find the payer’s transaction (Deposit Request)
    const payerTx = await Transaction.findByPk(id);
    if (!payerTx) {
      return res.status(404).json({ error: "Deposit transaction not found" });
    }
    if (payerTx.status !== "pending" || payerTx.type !== "Deposit Request") {
      return res.status(400).json({ error: "Deposit is not pending" });
    }

    // 2) Find the corresponding "Requested Deposit" for user 1
    const recipientTx = await Transaction.findOne({
      where: {
        accountId: payerTx.fromAccountId,
        type: "Requested Deposit",
        amount: payerTx.amount,
        cardNumber: payerTx.cardNumber
      }
    });
    if (!recipientTx) {
      return res.status(404).json({ error: "Corresponding recipient transaction not found" });
    }

    // Update only the status to "rejected" (leaving description empty)
    payerTx.status = "rejected";
    recipientTx.status = "rejected";

    await payerTx.save();
    await recipientTx.save();

    return res.json({ message: "Deposit rejected successfully" });
  } catch (err) {
    console.error("Error rejecting incoming deposit:", err);
    return res.status(500).json({ error: "Server error during deposit rejection" });
  }
};

/*
  GET /api/deposit/incoming-deposits
  Query: { accountId }
  Returns all deposit requests (status "pending" and type "Deposit Request")
  for the given payer's account (User 2).
 */
exports.getIncomingDeposits = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "Missing accountId" });
    }
    const deposits = await Transaction.findAll({
      where: {
        accountId, // Payer's account
        type: "Deposit Request",
        status: "pending"
      },
      order: [["date", "DESC"]]
    });
    return res.json(deposits);
  } catch (err) {
    console.error("Error fetching incoming deposits:", err);
    return res.status(500).json({ error: "Server error fetching incoming deposits" });
  }
};