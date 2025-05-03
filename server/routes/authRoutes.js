const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Rota para registrar um novo usuário (e potencialmente um novo casal)
router.post("/register", authController.register);

// Rota para login de usuário
router.post("/login", authController.login);

module.exports = router;

