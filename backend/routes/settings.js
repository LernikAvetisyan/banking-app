// routes/settings.js
const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

// GET /api/settings?accountId=XXXX
// Returns the user's current email & password
router.get("/", settingsController.getUserSettings);

// PUT /api/settings/changeEmail?accountId=XXXX
router.put("/changeEmail", settingsController.changeEmail);

// PUT /api/settings/changePassword?accountId=XXXX
router.put("/changePassword", settingsController.changePassword);

module.exports = router;
