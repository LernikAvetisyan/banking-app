const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Link to the User's primary key, which is accountId
  accountId: {
    type: DataTypes.CHAR(9),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  cardNumber: {
    type: DataTypes.STRING,
    //allowNull: false,
    allowNull: true,  // we should allow null so we can clear the reference
  },
  description: {
    type: DataTypes.STRING,
  },
  // New field to store the recipient's chosen card (from incoming deposit request)
  recipientCardNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Additional fields for incoming deposits
  fromAccountId: {
    type: DataTypes.CHAR(9),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'completed' // Regular deposits are completed, incoming bank-user deposits will be 'pending' until accepted.
  },
}, {
  tableName: 'transactions',
  timestamps: true,
});

module.exports = Transaction;