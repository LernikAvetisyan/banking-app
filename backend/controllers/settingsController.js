const { User } = require("../models");

// GET /api/settings?accountId=XXXX
// Return the user's current email & password
exports.getUserSettings = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: "accountId is required" });
    }
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Return user’s email/password (plain text only)
    return res.json({
      email: user.email,
      password: user.password
    });
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    return res.status(500).json({ error: "Server error retrieving user settings" });
  }
};

// PUT /api/settings/changeEmail?accountId=XXXX
exports.changeEmail = async (req, res) => {
  try {
    const { accountId } = req.query;
    const { email } = req.body;
    if (!accountId || !email) {
      return res.status(400).json({ error: "accountId and email are required" });
    }
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.email = email.trim();
    await user.save();
    return res.json({
      message: "Email updated successfully",
      email: user.email
    });
  } catch (error) {
    console.error("Error in changeEmail:", error);
    return res.status(500).json({ error: "Server error updating email" });
  }
};

// PUT /api/settings/changePassword?accountId=XXXX
exports.changePassword = async (req, res) => {
  try {
    const { accountId } = req.query;
    const { password } = req.body;
    if (!accountId || !password) {
      return res.status(400).json({ error: "accountId and password are required" });
    }
    const user = await User.findOne({ where: { accountId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.password = password.trim();
    await user.save();
    return res.json({
      message: "Password updated successfully",
      password: user.password
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    return res.status(500).json({ error: "Server error updating password" });
  }
};
