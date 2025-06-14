const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Wallet = sequelize.define('Wallet', {
  cardNumber: {
    type: DataTypes.STRING,
    primaryKey: true,
    set(value) {
      // we should remove all spaces before storing the card number.
      this.setDataValue('cardNumber', value.replace(/\s/g, ''));
    }
  },
  cardType: {
    type: DataTypes.ENUM('Visa', 'Master'),
    allowNull: false,
  },
  cardHolderName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expirationDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cvv: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  accountId: {
    type: DataTypes.CHAR(9),
    allowNull: false,
  }
}, {
  tableName: 'wallets',
  timestamps: true,
});

module.exports = Wallet;