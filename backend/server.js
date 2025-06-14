const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// SQL Database Setup 
const sequelize = require("./db"); // db.js that initializes Sequelize
const models = require("./models");  // models/index.js that sets up associations

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Serve Frontend Files ---
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/css", express.static(path.join(__dirname, "../frontend/css")));
app.use("/images", express.static(path.join(__dirname, "../images")));

// --- Import Routes ---
const dashboardRoutes = require("./routes/dashboard");
const depositRoutes = require("./routes/deposit");
const withdrawalRoutes = require("./routes/withdrawal");
const spendAnalysisRoutes = require("./routes/spendAnalysis");
const walletRoutes = require("./routes/wallet");
const settingsRoute = require("./routes/settings");
const accountRoutes = require("./routes/account");
const authRoutes = require("./routes/auth");
const employeesRoutes = require("./routes/employees");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transaction");

//  Use Routes 
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/spend-analysis", spendAnalysisRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/settings", settingsRoute);
app.use("/api/account", accountRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transaction", transactionRoutes);

//Default Route (Frontend Home)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

//Catch-All Route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


// Synchronize Models and Start Server 
if (process.env.INIT_DB === 'true') {
  console.log('🔧 INIT_DB=true, syncing database schema...');
  sequelize
    .sync({ alter: true })  // or { force: true } if we need to drop & recreate
    .then(() => {
      console.log("✅ Database synchronized (schema updated)");
      process.exit(0);      // exit after syncing
    })
    .catch(err => {
      console.error("❌ Error synchronizing database:", err);
      process.exit(1);
    });
} else {
  // Normal mode: skip sync, just start the server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
// Synchronize Models and Start Server 
//sequelize.sync({ alter: true })
//sequelize.sync({ force: true })
  //.then(() => {
   // console.log("✅ Database synchronized (schema updated)");
   // app.listen(PORT, () => {
    //  console.log(`🚀 Server running on http://localhost:${PORT}`);
    //});
 // })
 // .catch(err => {
  //  console.error("❌ Error synchronizing database:", err);
 //});



 //after we can start the server directly
//app.listen(PORT, () => {
 //console.log(`🚀 Server running on http://localhost:${PORT}`);
//});