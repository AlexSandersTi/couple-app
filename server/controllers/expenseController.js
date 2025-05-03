const pool = require("../models/database"); // Usar o pool do PostgreSQL

// --- Funções para Categorias de Despesas (PostgreSQL) ---

// Obter todas as categorias de despesas
exports.getExpenseCategories = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name FROM expense_categories ORDER BY name");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar categorias de despesas (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Criar uma nova categoria de despesa
exports.createExpenseCategory = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "O nome da categoria é obrigatório." });
    }

    try {
        const result = await pool.query("INSERT INTO expense_categories (name) VALUES ($1) RETURNING id", [name]);
        res.status(201).json({ message: "Categoria criada com sucesso!", categoryId: result.rows[0].id });
    } catch (error) {
        // Tratar erro de nome único (UNIQUE constraint)
        if (error.code === "23505") { // Código de erro do PostgreSQL para violação de unicidade
            return res.status(400).json({ message: "Categoria já existe." });
        }
        console.error("Erro ao criar categoria de despesa (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// --- Funções para Despesas (PostgreSQL) ---

// Obter todas as despesas do casal (com filtros)
exports.getExpenses = async (req, res) => {
    const coupleId = req.user.coupleId;
    const { categoryId, startDate, endDate } = req.query;

    let sql = `
        SELECT e.id, e.description, e.amount, TO_CHAR(e.date, 'YYYY-MM-DD') as date, e.created_at, 
               u.email as user_email, c.name as category_name
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN expense_categories c ON e.category_id = c.id
        WHERE e.couple_id = $1 
    `;
    let params = [coupleId];
    let paramIndex = 2;

    if (categoryId) {
        sql += ` AND e.category_id = $${paramIndex++}`;
        params.push(categoryId);
    }
    if (startDate) {
        sql += ` AND e.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND e.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += " ORDER BY e.date DESC, e.created_at DESC";

    try {
        const result = await pool.query(sql, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar despesas (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Registrar uma nova despesa
exports.createExpense = async (req, res) => {
    const coupleId = req.user.coupleId;
    const userId = req.user.userId;
    const { description, amount, category_id, date } = req.body;

    if (!description || amount === undefined || !date) {
        return res.status(400).json({ message: "Descrição, valor e data são obrigatórios." });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "O valor deve ser um número positivo." });
    }
    // Validar data (simples)
    if (isNaN(Date.parse(date))) {
        return res.status(400).json({ message: "Formato de data inválido." });
    }

    const sql = `
        INSERT INTO expenses (couple_id, user_id, description, amount, category_id, date) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const params = [coupleId, userId, description, parsedAmount, category_id || null, date];

    try {
        const result = await pool.query(sql, params);
        res.status(201).json({ message: "Despesa registrada com sucesso!", expenseId: result.rows[0].id });
    } catch (error) {
        // Verificar erro de chave estrangeira para category_id
        if (error.code === "23503") { // Código de erro do PostgreSQL para violação de FK
            return res.status(400).json({ message: "Categoria de despesa inválida." });
        }
        console.error("Erro ao registrar despesa (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Obter detalhes de uma despesa específica
exports.getExpenseById = async (req, res) => {
    const coupleId = req.user.coupleId;
    const expenseId = req.params.expenseId;

    const sql = `
        SELECT e.id, e.description, e.amount, TO_CHAR(e.date, 'YYYY-MM-DD') as date, e.created_at, e.category_id,
               u.email as user_email, c.name as category_name
        FROM expenses e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN expense_categories c ON e.category_id = c.id
        WHERE e.id = $1 AND e.couple_id = $2
    `;

    try {
        const result = await pool.query(sql, [expenseId, coupleId]);
        const expense = result.rows[0];
        if (!expense) {
            return res.status(404).json({ message: "Despesa não encontrada ou não pertence a este casal." });
        }
        res.status(200).json(expense);
    } catch (error) {
        console.error("Erro ao buscar despesa por ID (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Atualizar uma despesa
exports.updateExpense = async (req, res) => {
    const coupleId = req.user.coupleId;
    const expenseId = req.params.expenseId;
    const { description, amount, category_id, date } = req.body;

    if (!description || amount === undefined || !date) {
        return res.status(400).json({ message: "Descrição, valor e data são obrigatórios." });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: "O valor deve ser um número positivo." });
    }
    if (isNaN(Date.parse(date))) {
        return res.status(400).json({ message: "Formato de data inválido." });
    }

    const sql = `
        UPDATE expenses 
        SET description = $1, amount = $2, category_id = $3, date = $4 
        WHERE id = $5 AND couple_id = $6
    `;
    const params = [description, parsedAmount, category_id || null, date, expenseId, coupleId];

    try {
        const result = await pool.query(sql, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Despesa não encontrada ou não pertence a este casal." });
        }
        res.status(200).json({ message: "Despesa atualizada com sucesso!" });
    } catch (error) {
        if (error.code === "23503") { // Código de erro do PostgreSQL para violação de FK
            return res.status(400).json({ message: "Categoria de despesa inválida." });
        }
        console.error("Erro ao atualizar despesa (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Excluir uma despesa
exports.deleteExpense = async (req, res) => {
    const coupleId = req.user.coupleId;
    const expenseId = req.params.expenseId;

    const sql = "DELETE FROM expenses WHERE id = $1 AND couple_id = $2";
    const params = [expenseId, coupleId];

    try {
        const result = await pool.query(sql, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Despesa não encontrada ou não pertence a este casal." });
        }
        res.status(200).json({ message: "Despesa excluída com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir despesa (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

