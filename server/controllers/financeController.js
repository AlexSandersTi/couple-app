const pool = require("../models/database"); // Usar o pool do PostgreSQL

// Obter um resumo financeiro para o casal (PostgreSQL)
exports.getFinancialSummary = async (req, res) => {
    const coupleId = req.user.coupleId;
    // Permitir que o usuário passe parâmetros de data (ex: ?year=2024&month=05)
    const year = req.query.year || new Date().getFullYear();
    const month = req.query.month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Validar ano e mês se fornecidos
    if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
        return res.status(400).json({ message: "Ano ou mês inválido." });
    }

    const startDate = `${year}-${month}-01`;
    // Calcular o último dia do mês corretamente
    const lastDay = new Date(year, parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

    // Query para calcular o total gasto no mês especificado
    const totalSpentSql = `
        SELECT SUM(amount) as total_spent 
        FROM expenses 
        WHERE couple_id = $1 AND date BETWEEN $2 AND $3
    `;

    // Query para calcular o total gasto por categoria no mês especificado
    const spentByCategorySql = `
        SELECT c.name as category_name, SUM(e.amount) as total_spent
        FROM expenses e
        LEFT JOIN expense_categories c ON e.category_id = c.id
        WHERE e.couple_id = $1 AND e.date BETWEEN $2 AND $3
        GROUP BY c.name
        ORDER BY total_spent DESC
    `;

    const client = await pool.connect();
    try {
        let summary = {};

        // Obter total gasto
        const totalResult = await client.query(totalSpentSql, [coupleId, startDate, endDate]);
        summary.totalSpentThisMonth = parseFloat(totalResult.rows[0]?.total_spent || 0);

        // Obter gasto por categoria
        const categoryResult = await client.query(spentByCategorySql, [coupleId, startDate, endDate]);
        summary.spentByCategoryThisMonth = categoryResult.rows.map(r => ({ 
            category: r.category_name || 'Sem Categoria',
            total: parseFloat(r.total_spent || 0)
        }));

        // Retornar o resumo completo
        res.status(200).json(summary);

    } catch (error) {
        console.error("Erro ao calcular resumo financeiro (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
};

// Obter dados de tendência de gastos (PostgreSQL)
exports.getSpendingTrend = async (req, res) => {
    const coupleId = req.user.coupleId;
    const numberOfMonths = parseInt(req.query.months) || 6; // Permitir definir período via query param

    if (isNaN(numberOfMonths) || numberOfMonths <= 0) {
         return res.status(400).json({ message: "Número de meses inválido." });
    }

    // Calcular a data de início (primeiro dia de N meses atrás)
    const today = new Date();
    const startMonthDate = new Date(today.getFullYear(), today.getMonth() - numberOfMonths + 1, 1);
    const startDate = startMonthDate.toISOString().split("T")[0]; // Formato YYYY-MM-DD

    // Query para agrupar gastos por mês (usando DATE_TRUNC no PostgreSQL)
    const sql = `
        SELECT 
            TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') as month, 
            SUM(amount) as total_spent
        FROM expenses
        WHERE couple_id = $1 AND date >= $2
        GROUP BY month
        ORDER BY month ASC
    `;

    try {
        const result = await pool.query(sql, [coupleId, startDate]);

        // Preencher meses sem gastos com 0
        let trendData = {};
        for (let i = 0; i < numberOfMonths; i++) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`;
            trendData[monthKey] = 0;
        }

        result.rows.forEach(row => {
            if (trendData.hasOwnProperty(row.month)) {
                trendData[row.month] = parseFloat(row.total_spent || 0);
            }
        });

        // Converter para array ordenado
        const sortedTrend = Object.entries(trendData)
                                .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
                                .map(([month, total]) => ({ month, total }));

        res.status(200).json(sortedTrend);

    } catch (error) {
        console.error("Erro ao buscar tendência de gastos (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno ao buscar tendência de gastos." });
    }
};

