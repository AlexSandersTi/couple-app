const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models/database'); // Importar e inicializar o banco de dados

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Rotas de Autenticação
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// Rotas da Lista de Compras
const shoppingRoutes = require("./routes/shoppingRoutes");
app.use("/api/shopping", shoppingRoutes); // Montar as rotas de compras

// Rotas de Despesas
const expenseRoutes = require("./routes/expenseRoutes");
app.use("/api/expenses", expenseRoutes); // Montar as rotas de despesas

// Rotas Financeiras
const financeRoutes = require("./routes/financeRoutes");
app.use("/api/finance", financeRoutes); // Montar as rotas financeiras

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend está funcionando!' });
});

// Rota principal para servir o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

