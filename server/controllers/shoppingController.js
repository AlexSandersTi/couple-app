const pool = require("../models/database"); // Usar o pool do PostgreSQL

// --- Funções para Listas de Compras (PostgreSQL) ---

// Obter todas as listas de compras do casal
exports.getShoppingLists = async (req, res) => {
    const coupleId = req.user.coupleId;
    try {
        const result = await pool.query(
            "SELECT id, name, created_at FROM shopping_lists WHERE couple_id = $1 ORDER BY created_at DESC",
            [coupleId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar listas de compras (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Criar uma nova lista de compras
exports.createShoppingList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "O nome da lista é obrigatório." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO shopping_lists (couple_id, name) VALUES ($1, $2) RETURNING id",
            [coupleId, name]
        );
        res.status(201).json({ message: "Lista de compras criada com sucesso!", listId: result.rows[0].id });
    } catch (error) {
        console.error("Erro ao criar lista de compras (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Obter uma lista de compras específica (com seus itens)
exports.getShoppingListById = async (req, res) => {
    const coupleId = req.user.coupleId;
    const listId = req.params.listId;

    try {
        // Buscar a lista
        const listResult = await pool.query(
            "SELECT id, name FROM shopping_lists WHERE id = $1 AND couple_id = $2",
            [listId, coupleId]
        );
        const list = listResult.rows[0];

        if (!list) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }

        // Buscar os itens
        const itemsResult = await pool.query(
            "SELECT id, name, quantity, purchased FROM shopping_items WHERE list_id = $1 ORDER BY id", // Adicionado ORDER BY
            [listId]
        );

        res.status(200).json({ ...list, items: itemsResult.rows });

    } catch (error) {
        console.error("Erro ao buscar lista por ID (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Atualizar uma lista de compras (ex: nome)
exports.updateShoppingList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const listId = req.params.listId;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: "O nome da lista é obrigatório." });
    }

    try {
        const result = await pool.query(
            "UPDATE shopping_lists SET name = $1 WHERE id = $2 AND couple_id = $3",
            [name, listId, coupleId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }
        res.status(200).json({ message: "Lista de compras atualizada com sucesso!" });
    } catch (error) {
        console.error("Erro ao atualizar lista de compras (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// Excluir uma lista de compras (PostgreSQL - ON DELETE CASCADE cuida dos itens)
exports.deleteShoppingList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const listId = req.params.listId;

    try {
        const result = await pool.query(
            "DELETE FROM shopping_lists WHERE id = $1 AND couple_id = $2",
            [listId, coupleId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }
        res.status(200).json({ message: "Lista de compras excluída com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir lista de compras (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// --- Funções para Itens da Lista de Compras (PostgreSQL) ---

// Adicionar um item a uma lista de compras
exports.addItemToList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const listId = req.params.listId;
    const { name, quantity } = req.body;

    if (!name) {
        return res.status(400).json({ message: "O nome do item é obrigatório." });
    }

    const client = await pool.connect();
    try {
        // Verificar se a lista pertence ao casal
        const listCheck = await client.query("SELECT id FROM shopping_lists WHERE id = $1 AND couple_id = $2", [listId, coupleId]);
        if (listCheck.rows.length === 0) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }

        // Inserir o item
        const result = await client.query(
            "INSERT INTO shopping_items (list_id, name, quantity) VALUES ($1, $2, $3) RETURNING id",
            [listId, name, quantity || null]
        );
        res.status(201).json({ message: "Item adicionado com sucesso!", itemId: result.rows[0].id });

    } catch (error) {
        console.error("Erro ao adicionar item à lista (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
};

// Atualizar um item em uma lista de compras
exports.updateItemInList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const { listId, itemId } = req.params;
    const { name, quantity, purchased } = req.body;

    // Construir a query de atualização dinamicamente
    let updates = [];
    let values = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (quantity !== undefined) { updates.push(`quantity = $${paramIndex++}`); values.push(quantity); }
    if (purchased !== undefined) { updates.push(`purchased = $${paramIndex++}`); values.push(purchased); }

    if (updates.length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar fornecido." });
    }

    values.push(itemId); // Para WHERE id = $N
    values.push(listId); // Para WHERE list_id = $N+1
    // values.push(coupleId); // Para JOIN com couples

    const client = await pool.connect();
    try {
        // Verificar se a lista pertence ao casal (segurança extra)
        const listCheck = await client.query("SELECT id FROM shopping_lists WHERE id = $1 AND couple_id = $2", [listId, coupleId]);
        if (listCheck.rows.length === 0) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }

        // Atualizar o item
        const sql = `UPDATE shopping_items SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND list_id = $${paramIndex++}`;
        const result = await client.query(sql, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Item não encontrado nesta lista." });
        }
        res.status(200).json({ message: "Item atualizado com sucesso!" });

    } catch (error) {
        console.error("Erro ao atualizar item da lista (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
};

// Excluir um item de uma lista de compras
exports.deleteItemFromList = async (req, res) => {
    const coupleId = req.user.coupleId;
    const { listId, itemId } = req.params;

    const client = await pool.connect();
    try {
        // Verificar se a lista pertence ao casal (segurança extra)
        const listCheck = await client.query("SELECT id FROM shopping_lists WHERE id = $1 AND couple_id = $2", [listId, coupleId]);
        if (listCheck.rows.length === 0) {
            return res.status(404).json({ message: "Lista de compras não encontrada ou não pertence a este casal." });
        }

        // Excluir o item
        const result = await client.query("DELETE FROM shopping_items WHERE id = $1 AND list_id = $2", [itemId, listId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Item não encontrado nesta lista." });
        }
        res.status(200).json({ message: "Item excluído com sucesso!" });

    } catch (error) {
        console.error("Erro ao excluir item da lista (PostgreSQL):", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    } finally {
        client.release();
    }
};

