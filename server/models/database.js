const { Pool } = require("pg");

// Configurar o pool de conexões usando a variável de ambiente DATABASE_URL
// Render e Railway fornecem essa variável automaticamente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Adicionar ssl: { rejectUnauthorized: false } se conectar a bancos de dados externos
    // que exigem SSL, comum em plataformas como Heroku, Render, Railway.
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
    console.log("Conectado ao banco de dados PostgreSQL.");
});

pool.on("error", (err) => {
    console.error("Erro inesperado no cliente PostgreSQL", err);
    process.exit(-1);
});

// Função para inicializar o banco de dados e criar tabelas (PostgreSQL)
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log("Verificando/Criando tabelas no PostgreSQL...");

        // Tabela de Casais
        await client.query(`
            CREATE TABLE IF NOT EXISTS couples (
                id SERIAL PRIMARY KEY,
                name TEXT
            )
        `);
        console.log("Tabela 'couples' verificada/criada.");

        // Tabela de Usuários
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                couple_id INTEGER REFERENCES couples(id) ON DELETE SET NULL
            )
        `);
        console.log("Tabela 'users' verificada/criada.");

        // Tabela de Listas de Compras
        await client.query(`
            CREATE TABLE IF NOT EXISTS shopping_lists (
                id SERIAL PRIMARY KEY,
                couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabela 'shopping_lists' verificada/criada.");

        // Tabela de Itens da Lista de Compras
        await client.query(`
            CREATE TABLE IF NOT EXISTS shopping_items (
                id SERIAL PRIMARY KEY,
                list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                quantity TEXT,
                purchased BOOLEAN DEFAULT FALSE
            )
        `);
        console.log("Tabela 'shopping_items' verificada/criada.");

        // Tabela de Categorias de Despesas
        await client.query(`
            CREATE TABLE IF NOT EXISTS expense_categories (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            )
        `);
        console.log("Tabela 'expense_categories' verificada/criada.");

        // Tabela de Despesas
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                couple_id INTEGER NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Quem registrou
                description TEXT NOT NULL,
                amount NUMERIC(10, 2) NOT NULL, -- Usar NUMERIC para valores monetários
                category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
                date DATE NOT NULL, -- Usar DATE se não precisar de hora
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Tabela 'expenses' verificada/criada.");

        console.log("Inicialização do banco de dados PostgreSQL concluída.");

    } catch (err) {
        console.error("Erro durante a inicialização do banco de dados PostgreSQL:", err);
    } finally {
        client.release();
    }
}

// Executar a inicialização ao iniciar
initializeDatabase().catch(console.error);

// Exportar o pool para que possa ser usado em outros módulos para executar queries
module.exports = pool;

