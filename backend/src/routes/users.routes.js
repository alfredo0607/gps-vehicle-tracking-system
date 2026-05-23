const express = require("express");
const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Listar usuarios (Placeholder)
 * @access  Private
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Users endpoint - Implementar CRUD de usuarios",
    data: [],
  });
});

module.exports = router;
