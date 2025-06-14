const { Sequelize } = require('sequelize');
require('dotenv').config();

// we create a Sequelize instance from environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME || 'banking_app',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'your_password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  }
);

// Test the connection (optional, but it is helpful)
sequelize
  .authenticate()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Unable to connect to the database:", err));

// Export the Sequelize instance so models can use it
module.exports = sequelize;
// models/User.js