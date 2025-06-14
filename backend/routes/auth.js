const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.loginUser);
router.post("/adminlogin", authController.adminLogin);
router.post("/employeelogin", authController.employeeLogin);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password", authController.resetPassword);
module.exports = router;