const express = require("express");
const router = express.Router();
const spendAnalysisController = require("../controllers/spendAnalysisController");

// GET spend analysis data; expects query parameters: accountId, (optional) cardNumber, (optional) month
router.get("/", spendAnalysisController.getSpendAnalysis);

module.exports = router;
