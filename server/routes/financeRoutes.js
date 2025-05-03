const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financeController");
const authenticateToken = require("../middleware/authenticateToken");

// Proteger todas as rotas financeiras com autenticação
router.use(authenticateToken);

// Rota para obter um resumo financeiro (ex: total gasto no mês, por categoria)
router.get("/summary", financeController.getFinancialSummary);

// Rota para obter dados de tendência de gastos (ex: últimos 6 meses)
router.get("/spending-trend", financeController.getSpendingTrend);

// Outras rotas financeiras podem ser adicionadas aqui (ex: orçamentos)

module.exports = router;

