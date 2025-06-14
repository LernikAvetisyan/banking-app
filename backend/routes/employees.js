// routes/employees.js
const express = require("express");
const router = express.Router();
const employeesController = require("../controllers/employeesController");

// GET /api/employees - returns all user/wallet/transaction data for employees
router.get("/", employeesController.getAllData);

module.exports = router;
