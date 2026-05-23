const express = require("express");
const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login (Placeholder)
 * @access  Public
 */
router.post("/login", (req, res) => {
  res.json({
    success: true,
    message: "Login endpoint - Implementar autenticación JWT",
    token: "placeholder-token",
  });
});

/**
 * @route   POST /api/auth/register
 * @desc    Register (Placeholder)
 * @access  Public
 */
router.post("/register", (req, res) => {
  res.json({
    success: true,
    message: "Register endpoint - Implementar registro de usuarios",
  });
});

module.exports = router;
