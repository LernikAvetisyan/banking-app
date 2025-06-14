const User = require("./User.js");
const Wallet = require("./Wallet.js");
const Transaction = require("./Transaction.js");

// 1) A User has many Wallets (by accountId)
User.hasMany(Wallet, {
  foreignKey: "accountId",   // column in wallet table
  sourceKey: "accountId",    // PK in user table
  as: "wallets",
});
Wallet.belongsTo(User, {
  foreignKey: "accountId",
  targetKey: "accountId",
  as: "user",
});

// 2) A User has many Transactions (by accountId)
User.hasMany(Transaction, {
  foreignKey: "accountId",   // column in transaction table
  sourceKey: "accountId",    // user table
  as: "transactions",        // alias for user→transaction
});
Transaction.belongsTo(User, {
  foreignKey: "accountId",
  targetKey: "accountId",
  as: "user",
});

// 3) A Wallet can have many Transactions (by cardNumber)
Wallet.hasMany(Transaction, {
  foreignKey: "cardNumber",
  sourceKey: "cardNumber",
  as: "cardTransactions",    // different alias to avoid conflict
  onDelete: "SET NULL"       // when a Wallet is deleted, set cardNumber to NULL in Transactions
});
Transaction.belongsTo(Wallet, {
  foreignKey: "cardNumber",
  targetKey: "cardNumber",
  as: "wallet",
  onDelete: "SET NULL"
});

module.exports = {
  User,
  Wallet,
  Transaction
};
