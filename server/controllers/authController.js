const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../models/database"); // Usar o pool do PostgreSQL

// Chave secreta para JWT (em produção, use variável de ambiente!)
const JWT_SECRET = process.env.JWT_SECRET || "seu_segredo_super_secreto_aqui";
const SALT_ROUNDS = 10;

// Função para registrar um novo usuário (PostgreSQL)
exports.register = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios." });
    }

    const client = await pool.connect();
    try {
        // Verificar se o usuário já existe
        const userCheck = await client.query("SELECT email FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "Email já cadastrado." });
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await client.query("BEGIN"); // Iniciar transação

        // Criar um novo casal
        const coupleInsert = await client.query("INSERT INTO couples (name) VALUES ($1) RETURNING id", [`Casal de ${email}`]);
        const coupleId = coupleInsert.rows[0].id;

        // Inserir novo usuário
        const userInsert = await client.query(
            "INSERT INTO users (email, password_hash, couple_id) VALUES ($1, $2, $3) RETURNING id",
            [email, passwordHash, coupleId]
        );
        const userId = userInsert.rows[0].id;

        await client.query("COMMIT"); // Finalizar transação

        // Gerar token JWT
        const token = jwt.sign({ userId: userId, coupleId: coupleId }, JWT_SECRET, { expiresIn: "1h" });

        res.status(201).json({ message: "Usuário registrado com sucesso!", token: token, userId: userId, coupleId: coupleId });

    } catch (error) {
        await client.query("ROLLBACK"); // Desfazer transação em caso de erro
        console.error("Erro no processo de registro (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
};

// Função para login de usuário (PostgreSQL)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios." });
    }

    try {
        const result = await pool.query("SELECT id, password_hash, couple_id FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas." }); // Usuário não encontrado
        }

        // Comparar senha
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: "Credenciais inválidas." }); // Senha incorreta
        }

        // Gerar token JWT
        const token = jwt.sign({ userId: user.id, coupleId: user.couple_id }, JWT_SECRET, { expiresIn: "1h" });

        res.status(200).json({ message: "Login bem-sucedido!", token: token, userId: user.id, coupleId: user.couple_id });

    } catch (error) {
        console.error("Erro no processo de login (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

