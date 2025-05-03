const express = require("express");
const router = express.Router();
const shoppingController = require("../controllers/shoppingController");
const authenticateToken = require("../middleware/authenticateToken");

// Proteger todas as rotas de lista de compras com autenticação
router.use(authenticateToken);

// --- Rotas para Listas de Compras ---

// Obter todas as listas de compras do casal
router.get("/lists", shoppingController.getShoppingLists);

// Criar uma nova lista de compras
router.post("/lists", shoppingController.createShoppingList);

// Obter uma lista de compras específica (com seus itens)
router.get("/lists/:listId", shoppingController.getShoppingListById);

// Atualizar uma lista de compras (ex: nome)
router.put("/lists/:listId", shoppingController.updateShoppingList);

// Excluir uma lista de compras
router.delete("/lists/:listId", shoppingController.deleteShoppingList);

// --- Rotas para Itens da Lista de Compras ---

// Adicionar um item a uma lista de compras
router.post("/lists/:listId/items", shoppingController.addItemToList);

// Atualizar um item em uma lista de compras (ex: marcar como comprado, mudar quantidade)
router.put("/lists/:listId/items/:itemId", shoppingController.updateItemInList);

// Excluir um item de uma lista de compras
router.delete("/lists/:listId/items/:itemId", shoppingController.deleteItemFromList);

module.exports = router;

