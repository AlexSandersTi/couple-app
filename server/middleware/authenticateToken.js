const jwt = require("jsonwebtoken");

// Chave secreta para JWT (em produção, use variável de ambiente!)
const JWT_SECRET = process.env.JWT_SECRET || "seu_segredo_super_secreto_aqui";

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (token == null) {
        return res.sendStatus(401); // Se não há token, não autorizado
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Erro na verificação do token:", err);
            return res.sendStatus(403); // Token inválido ou expirado
        }
        // Adiciona os dados do usuário (payload do token) ao objeto req
        req.user = user; 
        next(); // Passa para a próxima função de middleware ou rota
    });
}

module.exports = authenticateToken;

