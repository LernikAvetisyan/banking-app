const { Wallet, Transaction, User } = require("../models");

/*
  POST /api/withdrawal/bank
  Body: { recipientUserId, withdrawalAmount, senderCardNumber, senderAccountId }
  Flow:
  - User 1 (the sender) initiates a withdrawal request to User 2 (the recipient).
  - This creates two records:
    1) Under User 2’s account (type "Withdrawal Request", status "pending")
       – so that User 2 sees the incoming withdrawal request.
    2) Under User 1’s account (type "Requested Withdrawal", status "pending")
       – so that User 1 sees “In Progress.”
 */
exports.withdrawalToBankUser = async (req, res) => {
  try {
    const { recipientUserId, withdrawalAmount, senderCardNumber, senderAccountId } = req.body;
    if (
      !recipientUserId ||
      !senderAccountId ||
      !withdrawalAmount ||
      withdrawalAmount <= 0 ||
      !senderCardNumber
    ) {
      return res.status(400).json({ error: "Invalid recipientUserId, senderAccountId, withdrawalAmount, or senderCardNumber" });
    }
    const normalizedSenderCard = senderCardNumber.replace(/\s/g, "");

    // Verify that the recipient (User 2) exists
    const recipientUser = await User.findOne({ where: { accountId: recipientUserId } });
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found" });
    }
    // Verify that the sender (User 1) exists
    const senderUser = await User.findOne({ where: { accountId: senderAccountId } });
    if (!senderUser) {
      return res.status(404).json({ error: "Sender user not found" });
    }
    // Verify that the sender's chosen wallet exists
    const senderWallet = await Wallet.findOne({
      where: {
        cardNumber: normalizedSenderCard,
        accountId: senderAccountId
      }
    });
    if (!senderWallet) {
      return res.status(404).json({ error: "Sender wallet not found" });
    }

    // Create a withdrawal request record for User 2 (the recipient)
    const recipientTx = await Transaction.create({
      accountId: recipientUserId,
      fromAccountId: senderAccountId,
      date: new Date().toISOString().split("T")[0],
      type: "Withdrawal Request",
      amount: parseFloat(withdrawalAmount),
      cardNumber: normalizedSenderCard,
      description: "", // Leave empty so frontend builds the text
      status: "pending"
    });

    // Create a corresponding "Requested Withdrawal" record for User 1 (the sender)
    const senderTx = await Transaction.create({
      accountId: senderAccountId,
      fromAccountId: recipientUserId,
      date: new Date().toISOString().split("T")[0],
      type: "Requested Withdrawal",
      amount: parseFloat(withdrawalAmount),
      cardNumber: normalizedSenderCard,
      description: "", // Leave empty so frontend builds the text
      status: "pending"
    });

    return res.json({
      message: "Withdrawal request successful",
      incomingRequest: recipientTx,
      outRequest: senderTx
    });
  } catch (err) {
    console.error("Error in withdrawalToBankUser:", err);
    return res.status(500).json({ error: "Server error during bank withdrawal" });
  }
};

/*
  POST /api/withdrawal/external
  Body: { cardNumber, withdrawalAmount }
  For out-of-bank withdrawals, a single "Withdraw" transaction is created.
 */
exports.withdrawalToExternal = async (req, res) => {
  try {
    const { cardNumber, withdrawalAmount } = req.body;
    if (!cardNumber || !withdrawalAmount || withdrawalAmount <= 0) {
      return res.status(400).json({ error: "Invalid cardNumber or withdrawalAmount" });
    }
    const wallet = await Wallet.findOne({ where: { cardNumber } });
    if (!wallet) {
      return res.status(404).json({ error: "Source wallet not found" });
    }
    if (wallet.balance < parseFloat(withdrawalAmount)) {
      return res.status(400).json({ error: "Insufficient funds in wallet" });
    }
    wallet.balance -= parseFloat(withdrawalAmount);
    await wallet.save();

    await Transaction.create({
      accountId: wallet.accountId,
      date: new Date().toISOString().split("T")[0],
      type: "Withdraw",
      amount: parseFloat(withdrawalAmount),
      cardNumber: wallet.cardNumber,
      description: "", // Can leave empty for external withdrawals if desired
      status: "completed"
    });
    return res.json({
      message: "External withdrawal successful",
      updatedWallet: { cardNumber: wallet.cardNumber, balance: wallet.balance }
    });
  } catch (err) {
    console.error("Error in withdrawalToExternal:", err);
    return res.status(500).json({ error: "Server error during external withdrawal" });
  }
};

/*
  PUT /api/withdrawal/incoming-withdrawals/:id/accept
  Body: { cardNumber }
  When User 2 (the recipient) accepts the withdrawal request:
   - Only update the status to "completed" (do not change the type) so that the frontend builds the correct phrase.
   - Deduct funds from the sender's wallet and credit the recipient's wallet.
 */
exports.acceptIncomingWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { cardNumber } = req.body; // Recipient's selected card to receive funds
    if (!cardNumber) {
      return res.status(400).json({ error: "Card number is required for acceptance" });
    }

    // Find the recipient's transaction (Withdrawal Request)
    const recipientTx = await Transaction.findByPk(id);
    if (!recipientTx) {
      return res.status(404).json({ error: "Withdrawal transaction not found" });
    }
    if (recipientTx.status !== "pending" || recipientTx.type !== "Withdrawal Request") {
      return res.status(400).json({ error: "Withdrawal request is not pending" });
    }

    // Find the corresponding sender transaction (Requested Withdrawal)
    const senderTx = await Transaction.findOne({
      where: {
        accountId: recipientTx.fromAccountId,
        type: "Requested Withdrawal",
        amount: recipientTx.amount,
        cardNumber: recipientTx.cardNumber
      }
    });
    if (!senderTx) {
      return res.status(404).json({ error: "Corresponding sender transaction not found" });
    }

    const withdrawalAmount = recipientTx.amount;
    const recipientAccountId = recipientTx.accountId; // User 2 (recipient)
    const senderAccountId = recipientTx.fromAccountId;  // User 1 (sender)

    // Validate sender's wallet for deduction
    const senderWallet = await Wallet.findOne({
      where: { accountId: senderAccountId, cardNumber: recipientTx.cardNumber }
    });
    if (!senderWallet) {
      return res.status(404).json({ error: "Sender's wallet not found" });
    }
    if (senderWallet.balance < withdrawalAmount) {
      return res.status(400).json({ error: "Insufficient funds in sender's wallet" });
    }

    // Validate recipient's chosen card
    const normalizedRecipientCard = cardNumber.replace(/\s/g, "");
    const recipientWallet = await Wallet.findOne({
      where: { accountId: recipientAccountId, cardNumber: normalizedRecipientCard }
    });
    if (!recipientWallet) {
      return res.status(404).json({ error: "Recipient's wallet not found" });
    }

    // Deduct funds from sender's wallet
    senderWallet.balance -= withdrawalAmount;
    await senderWallet.save();

    // Update both records only by changing status to "completed" (type remains unchanged)
    recipientTx.status = "completed";
    await recipientTx.save();

    senderTx.status = "completed";
    await senderTx.save();

    // Credit recipient's wallet
    recipientWallet.balance += withdrawalAmount;
    await recipientWallet.save();

    return res.json({ message: "Withdrawal accepted successfully" });
  } catch (err) {
    console.error("Error accepting incoming withdrawal:", err);
    return res.status(500).json({ error: "Server error during withdrawal acceptance" });
  }
};

/*
  PUT /api/withdrawal/incoming-withdrawals/:id/reject
  Body: { }
  When User 2 (the recipient) rejects the withdrawal request:
  - Only update the status to "rejected" (do not change the type).
 */
exports.rejectIncomingWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const recipientTx = await Transaction.findByPk(id);
    if (!recipientTx) {
      return res.status(404).json({ error: "Withdrawal transaction not found" });
    }
    if (recipientTx.status !== "pending" || recipientTx.type !== "Withdrawal Request") {
      return res.status(400).json({ error: "Withdrawal request is not pending" });
    }

    const senderTx = await Transaction.findOne({
      where: {
        accountId: recipientTx.fromAccountId,
        type: "Requested Withdrawal",
        amount: recipientTx.amount,
        cardNumber: recipientTx.cardNumber
      }
    });
    if (!senderTx) {
      return res.status(404).json({ error: "Corresponding sender transaction not found" });
    }

    // Only update status to "rejected" (leave type unchanged)
    recipientTx.status = "rejected";
    senderTx.status = "rejected";

    await recipientTx.save();
    await senderTx.save();

    return res.json({ message: "Withdrawal rejected successfully" });
  } catch (err) {
    console.error("Error rejecting incoming withdrawal:", err);
    return res.status(500).json({ error: "Server error during withdrawal rejection" });
  }
};

/*
 GET /api/withdrawal/incoming-withdrawals
 Query: { accountId }
 Returns all withdrawal requests (status "pending" and type "Withdrawal Request")
 for the given recipient's account (User 2).
 */
exports.getIncomingWithdrawals = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "Missing accountId" });
    }
    const withdrawals = await Transaction.findAll({
      where: {
        accountId, // Recipient's account
        type: "Withdrawal Request",
        status: "pending"
      },
      order: [["date", "DESC"]]
    });
    return res.json(withdrawals);
  } catch (err) {
    console.error("Error fetching incoming withdrawals:", err);
    return res.status(500).json({ error: "Server error fetching incoming withdrawals" });
  }
};
