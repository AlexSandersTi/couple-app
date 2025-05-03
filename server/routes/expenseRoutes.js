const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authenticateToken = require("../middleware/authenticateToken");

// Proteger todas as rotas de despesas com autenticação
router.use(authenticateToken);

// --- Rotas para Categorias de Despesas (Opcional, mas útil) ---

// Obter todas as categorias de despesas
router.get("/categories", expenseController.getExpenseCategories);

// Criar uma nova categoria de despesa
router.post("/categories", expenseController.createExpenseCategory);

// --- Rotas para Despesas ---

// Obter todas as despesas do casal (com filtros opcionais, ex: por período, categoria)
router.get("/", expenseController.getExpenses);

// Registrar uma nova despesa
router.post("/", expenseController.createExpense);

// Obter detalhes de uma despesa específica
router.get("/:expenseId", expenseController.getExpenseById);

// Atualizar uma despesa
router.put("/:expenseId", expenseController.updateExpense);

// Excluir uma despesa
router.delete("/:expenseId", expenseController.deleteExpense);

module.exports = router;

