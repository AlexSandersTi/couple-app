// Lógica do frontend será adicionada aqui

console.log("Frontend carregado!");

const messageDiv = document.getElementById("message");

// --- Lógica de Autenticação ---

const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

// Função para exibir mensagens
function showMessage(msg, isError = false) {
    if (messageDiv) {
        messageDiv.textContent = msg;
        messageDiv.style.color = isError ? "red" : "green";
    }
}

// Função para salvar o token
function saveToken(token) {
    localStorage.setItem("authToken", token);
}

// Função para pegar o token
function getToken() {
    return localStorage.getItem("authToken");
}

// Função para fazer logout
function logout() {
    localStorage.removeItem("authToken");
    // Redirecionar para a página de login ou inicial
    window.location.href = "/login.html"; 
}

// Lidar com o registro
if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        showMessage("Registrando...", false);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage("Registro bem-sucedido! Redirecionando para login...", false);
                saveToken(data.token); // Salva o token
                // Opcional: redirecionar para login ou direto para o app
                setTimeout(() => { window.location.href = "/login.html"; }, 2000);
            } else {
                showMessage(`Erro no registro: ${data.message}`, true);
            }
        } catch (error) {
            console.error("Erro ao registrar:", error);
            showMessage("Erro ao conectar com o servidor.", true);
        }
    });
}

// Lidar com o login
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        showMessage("Entrando...", false);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                showMessage("Login bem-sucedido! Redirecionando...", false);
                saveToken(data.token); // Salva o token
                // Redirecionar para a página principal do aplicativo
                setTimeout(() => { window.location.href = "/index.html"; }, 1500); 
            } else {
                showMessage(`Erro no login: ${data.message}`, true);
            }
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            showMessage("Erro ao conectar com o servidor.", true);
        }
    });
}

// Verificar autenticação ao carregar páginas protegidas (ex: index.html)
// Esta lógica pode ser movida para uma função e chamada em páginas que precisam de autenticação
/*
if (window.location.pathname === '/index.html') { // Exemplo de verificação na página principal
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html'; // Redireciona se não estiver logado
    } else {
        // Opcional: Verificar validade do token no backend
        // Se válido, carregar dados do usuário/aplicativo
        console.log("Usuário autenticado.");
        // Adicionar botão de logout
        const logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.onclick = logout;
        document.body.appendChild(logoutButton);
    }
}
*/

// Exemplo: buscar dados do backend (protegido)
/*
async function fetchData() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch("/api/some-protected-route", { // Substituir pela rota real
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log("Dados protegidos:", data);
            // Atualizar a UI com os dados
        } else if (response.status === 401 || response.status === 403) {
            logout(); // Token inválido ou expirado
        } else {
            console.error("Erro ao buscar dados protegidos:", response.statusText);
        }
    } catch (error) {
        console.error("Erro de rede:", error);
    }
}
*/




// --- Lógica da Lista de Compras ---

const shoppingListSection = document.getElementById("shopping-list-section");
const createListButton = document.getElementById("create-list-button");
const newListInput = document.getElementById("new-list-name");
const shoppingListsContainer = document.getElementById("shopping-lists-container");
const shoppingListsUl = document.getElementById("shopping-lists");
const selectedListDetailsDiv = document.getElementById("selected-list-details");
const selectedListNameH4 = document.getElementById("selected-list-name");
const deleteListButton = document.getElementById("delete-list-button");
const addItemButton = document.getElementById("add-item-button");
const newItemNameInput = document.getElementById("new-item-name");
const newItemQuantityInput = document.getElementById("new-item-quantity");
const shoppingItemsUl = document.getElementById("shopping-items");
const logoutButton = document.getElementById("logout-button");

let currentSelectedListId = null;

// Função genérica para chamadas API
async function fetchApi(url, options = {}) {
    const token = getToken();
    if (!token) {
        logout(); // Se não há token, desloga
        return null;
    }

    const defaultHeaders = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    options.headers = { ...defaultHeaders, ...options.headers };

    try {
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            logout(); // Token inválido ou expirado
            return null;
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro ${response.status}`);
        }
        // Se for DELETE ou PUT/POST sem retorno esperado, retorna sucesso
        if (response.status === 204 || (options.method && options.method.toUpperCase() !== 'GET' && response.headers.get("content-length") === "0")) {
            return { success: true }; 
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro na chamada API para ${url}:`, error);
        showMessage(`Erro: ${error.message}`, true);
        return null;
    }
}

// Carregar listas de compras
async function loadShoppingLists() {
    const lists = await fetchApi("/api/shopping/lists");
    if (!lists) return;

    shoppingListsUl.innerHTML = ""; // Limpar lista atual
    if (lists.length === 0) {
        shoppingListsUl.innerHTML = "<li>Nenhuma lista encontrada. Crie uma!</li>";
        return;
    }

    lists.forEach(list => {
        const li = document.createElement("li");
        li.textContent = list.name;
        li.dataset.listId = list.id;
        li.style.cursor = "pointer";
        li.onclick = () => selectList(list.id, list.name);
        shoppingListsUl.appendChild(li);
    });
}

// Selecionar uma lista
async function selectList(listId, listName) {
    currentSelectedListId = listId;
    selectedListNameH4.textContent = `Itens da Lista: ${listName}`;
    selectedListDetailsDiv.style.display = "block";
    shoppingItemsUl.innerHTML = "<li>Carregando itens...</li>";

    const listDetails = await fetchApi(`/api/shopping/lists/${listId}`);
    if (!listDetails) {
        selectedListDetailsDiv.style.display = "none";
        currentSelectedListId = null;
        return;
    }

    renderItems(listDetails.items);
}

// Renderizar itens da lista selecionada
function renderItems(items) {
    shoppingItemsUl.innerHTML = ""; // Limpar itens atuais
    if (!items || items.length === 0) {
        shoppingItemsUl.innerHTML = "<li>Nenhum item nesta lista. Adicione um!</li>";
        return;
    }

    items.forEach(item => {
        const li = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.purchased;
        checkbox.dataset.itemId = item.id;
        checkbox.onchange = () => toggleItemPurchased(item.id, checkbox.checked);

        const text = document.createElement("span");
        text.textContent = ` ${item.name}${item.quantity ? ' (' + item.quantity + ')' : ''}`;
        if (item.purchased) {
            text.style.textDecoration = "line-through";
            text.style.color = "grey";
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = " X ";
        deleteButton.style.marginLeft = "10px";
        deleteButton.style.cursor = "pointer";
        deleteButton.dataset.itemId = item.id;
        deleteButton.onclick = () => deleteItem(item.id);

        li.appendChild(checkbox);
        li.appendChild(text);
        li.appendChild(deleteButton);
        shoppingItemsUl.appendChild(li);
    });
}

// Criar nova lista
async function createList() {
    const name = newListInput.value.trim();
    if (!name) {
        showMessage("Por favor, insira um nome para a lista.", true);
        return;
    }

    const result = await fetchApi("/api/shopping/lists", {
        method: "POST",
        body: JSON.stringify({ name })
    });

    if (result && result.listId) {
        showMessage("Lista criada com sucesso!", false);
        newListInput.value = "";
        loadShoppingLists(); // Recarregar listas
    }
}

// Excluir lista selecionada
async function deleteList() {
    if (!currentSelectedListId) return;

    if (!confirm(`Tem certeza que deseja excluir a lista "${selectedListNameH4.textContent.split(': ')[1]}" e todos os seus itens?`)) {
        return;
    }

    const result = await fetchApi(`/api/shopping/lists/${currentSelectedListId}`, {
        method: "DELETE"
    });

    if (result && result.success) {
        showMessage("Lista excluída com sucesso!", false);
        selectedListDetailsDiv.style.display = "none";
        currentSelectedListId = null;
        loadShoppingLists(); // Recarregar listas
    }
}

// Adicionar item à lista selecionada
async function addItem() {
    if (!currentSelectedListId) return;

    const name = newItemNameInput.value.trim();
    const quantity = newItemQuantityInput.value.trim();

    if (!name) {
        showMessage("Por favor, insira o nome do item.", true);
        return;
    }

    const result = await fetchApi(`/api/shopping/lists/${currentSelectedListId}/items`, {
        method: "POST",
        body: JSON.stringify({ name, quantity })
    });

    if (result && result.itemId) {
        showMessage("Item adicionado com sucesso!", false);
        newItemNameInput.value = "";
        newItemQuantityInput.value = "";
        // Recarregar apenas os itens da lista atual
        selectList(currentSelectedListId, selectedListNameH4.textContent.split(': ')[1]); 
    }
}

// Marcar/desmarcar item como comprado
async function toggleItemPurchased(itemId, purchased) {
    if (!currentSelectedListId) return;

    const result = await fetchApi(`/api/shopping/lists/${currentSelectedListId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ purchased })
    });

    if (result && result.success) {
        showMessage(`Item ${purchased ? 'marcado' : 'desmarcado'} como comprado.`, false);
        // Recarregar itens para refletir a mudança visualmente
        selectList(currentSelectedListId, selectedListNameH4.textContent.split(': ')[1]);
    }
}

// Excluir item
async function deleteItem(itemId) {
    if (!currentSelectedListId) return;

    if (!confirm("Tem certeza que deseja excluir este item?")) {
        return;
    }

    const result = await fetchApi(`/api/shopping/lists/${currentSelectedListId}/items/${itemId}`, {
        method: "DELETE"
    });

    if (result && result.success) {
        showMessage("Item excluído com sucesso!", false);
        // Recarregar itens
        selectList(currentSelectedListId, selectedListNameH4.textContent.split(': ')[1]);
    }
}

// --- Inicialização e Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticação ao carregar a página principal
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        const token = getToken();
        if (!token) {
            window.location.href = '/login.html'; // Redireciona se não estiver logado
        } else {
            console.log("Usuário autenticado.");
            logoutButton.style.display = 'inline-block'; // Mostrar botão de logout
            logoutButton.onclick = logout;
            // Carregar dados iniciais (listas de compras)
            loadShoppingLists();
        }
    }

    // Adicionar event listeners para os botões da lista de compras
    if (createListButton) {
        createListButton.onclick = createList;
    }
    if (deleteListButton) {
        deleteListButton.onclick = deleteList;
    }
    if (addItemButton) {
        addItemButton.onclick = addItem;
    }
});




// --- Lógica de Registro de Despesas ---

const expenseSection = document.getElementById("expense-tracking-section");
const addExpenseButton = document.getElementById("add-expense-button");
const expenseDescriptionInput = document.getElementById("expense-description");
const expenseAmountInput = document.getElementById("expense-amount");
const expenseDateInput = document.getElementById("expense-date");
const expenseCategorySelect = document.getElementById("expense-category");
const expenseListUl = document.getElementById("expense-list");

// Carregar categorias de despesas
async function loadExpenseCategories() {
    const categories = await fetchApi("/api/expenses/categories");
    if (!categories) return;

    // Limpar opções existentes (exceto a primeira "Selecione")
    while (expenseCategorySelect.options.length > 1) {
        expenseCategorySelect.remove(1);
    }

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        expenseCategorySelect.appendChild(option);
    });
}

// Carregar histórico de despesas
async function loadExpenses() {
    // Adicionar lógica de filtro se necessário (usando query params)
    const expenses = await fetchApi("/api/expenses"); 
    if (!expenses) return;

    expenseListUl.innerHTML = ""; // Limpar lista atual
    if (expenses.length === 0) {
        expenseListUl.innerHTML = "<li>Nenhuma despesa registrada ainda.</li>";
        return;
    }

    expenses.forEach(expense => {
        const li = document.createElement("li");
        const dateFormatted = new Date(expense.date).toLocaleDateString("pt-BR");
        const amountFormatted = parseFloat(expense.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        
        li.innerHTML = `
            <strong>${expense.description}</strong> - ${amountFormatted} em ${dateFormatted}
            ${expense.category_name ? 
                `<span style="background-color: #eee; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; margin-left: 5px;">${expense.category_name}</span>` : ""}
            <span style="font-size: 0.8em; color: grey; margin-left: 10px;">(Registrado por: ${expense.user_email})</span>
            <button data-expense-id="${expense.id}" onclick="deleteExpense(this.dataset.expenseId)" style="margin-left: 10px; cursor: pointer;">Excluir</button>
        `;
        // Adicionar botão de editar aqui se necessário
        expenseListUl.appendChild(li);
    });
}

// Registrar nova despesa
async function addExpense() {
    const description = expenseDescriptionInput.value.trim();
    const amount = expenseAmountInput.value;
    const date = expenseDateInput.value;
    const category_id = expenseCategorySelect.value;

    if (!description || !amount || !date) {
        showMessage("Por favor, preencha descrição, valor e data.", true);
        return;
    }

    const expenseData = {
        description,
        amount: parseFloat(amount),
        date,
        category_id: category_id ? parseInt(category_id) : null
    };

    const result = await fetchApi("/api/expenses", {
        method: "POST",
        body: JSON.stringify(expenseData)
    });

    if (result && result.expenseId) {
        showMessage("Despesa registrada com sucesso!", false);
        // Limpar formulário
        expenseDescriptionInput.value = "";
        expenseAmountInput.value = "";
        expenseDateInput.value = "";
        expenseCategorySelect.value = "";
        // Recarregar lista de despesas
        loadExpenses();
    }
}

// Excluir despesa
async function deleteExpense(expenseId) {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) {
        return;
    }

    const result = await fetchApi(`/api/expenses/${expenseId}`, {
        method: "DELETE"
    });

    if (result && result.success) {
        showMessage("Despesa excluída com sucesso!", false);
        loadExpenses(); // Recarregar lista
    }
}


// --- Atualização na Inicialização e Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticação ao carregar a página principal
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        const token = getToken();
        if (!token) {
            window.location.href = '/login.html'; // Redireciona se não estiver logado
        } else {
            console.log("Usuário autenticado.");
            logoutButton.style.display = 'inline-block'; // Mostrar botão de logout
            logoutButton.onclick = logout;
            
            // Carregar dados iniciais
            loadShoppingLists();
            loadExpenseCategories();
            loadExpenses();
        }
    }

    // Adicionar event listeners para os botões da lista de compras
    if (createListButton) {
        createListButton.onclick = createList;
    }
    if (deleteListButton) {
        deleteListButton.onclick = deleteList;
    }
    if (addItemButton) {
        addItemButton.onclick = addItem;
    }

    // Adicionar event listener para o botão de adicionar despesa
    if (addExpenseButton) {
        addExpenseButton.onclick = addExpense;
    }
});




// --- Lógica de Gestão Financeira ---

const financialSummaryDiv = document.getElementById("financial-summary");
const summaryTotalSpentSpan = document.getElementById("summary-total-spent");
const summarySpentByCategoryUl = document.getElementById("summary-spent-by-category");

// Carregar resumo financeiro
async function loadFinancialSummary() {
    const summary = await fetchApi("/api/finance/summary");
    if (!summary) {
        summaryTotalSpentSpan.textContent = "Erro ao carregar";
        summarySpentByCategoryUl.innerHTML = "<li>Erro ao carregar categorias.</li>";
        return;
    }

    // Exibir total gasto
    summaryTotalSpentSpan.textContent = parseFloat(summary.totalSpentThisMonth || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    // Exibir gasto por categoria
    summarySpentByCategoryUl.innerHTML = ""; // Limpar lista
    if (summary.spentByCategoryThisMonth && summary.spentByCategoryThisMonth.length > 0) {
        summary.spentByCategoryThisMonth.forEach(item => {
            const li = document.createElement("li");
            const amountFormatted = parseFloat(item.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            li.textContent = `${item.category}: ${amountFormatted}`;
            summarySpentByCategoryUl.appendChild(li);
        });
    } else {
        summarySpentByCategoryUl.innerHTML = "<li>Nenhum gasto registrado este mês.</li>";
    }
}

// --- Atualização na Inicialização e Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticação ao carregar a página principal
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        const token = getToken();
        if (!token) {
            window.location.href = '/login.html'; // Redireciona se não estiver logado
        } else {
            console.log("Usuário autenticado.");
            logoutButton.style.display = 'inline-block'; // Mostrar botão de logout
            logoutButton.onclick = logout;
            
            // Carregar todos os dados iniciais
            loadShoppingLists();
            loadExpenseCategories();
            loadExpenses();
            loadFinancialSummary(); // Carregar resumo financeiro
        }
    }

    // Adicionar event listeners para os botões da lista de compras
    if (createListButton) {
        createListButton.onclick = createList;
    }
    if (deleteListButton) {
        deleteListButton.onclick = deleteList;
    }
    if (addItemButton) {
        addItemButton.onclick = addItem;
    }

    // Adicionar event listener para o botão de adicionar despesa
    if (addExpenseButton) {
        addExpenseButton.onclick = addExpense;
    }
});




// --- Lógica de Relatórios Analíticos ---

const spendingTrendChartDiv = document.getElementById("spending-trend-chart");
const spendingTrendDataUl = document.getElementById("spending-trend-data");

// Carregar e exibir tendência de gastos
async function loadSpendingTrend() {
    const trendData = await fetchApi("/api/finance/spending-trend");
    if (!trendData) {
        spendingTrendChartDiv.innerHTML = "Erro ao carregar dados de tendência.";
        spendingTrendDataUl.innerHTML = "<li>Erro ao carregar dados.</li>";
        return;
    }

    spendingTrendChartDiv.innerHTML = ""; // Limpar mensagem de carregamento
    spendingTrendDataUl.innerHTML = ""; // Limpar dados brutos

    if (trendData.length === 0) {
        spendingTrendChartDiv.innerHTML = "Nenhum dado de gasto encontrado para gerar tendência.";
        spendingTrendDataUl.innerHTML = "<li>Nenhum dado encontrado.</li>";
        return;
    }

    // Exibir dados brutos (lista)
    trendData.forEach(item => {
        const li = document.createElement("li");
        const amountFormatted = parseFloat(item.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        li.textContent = `${item.month}: ${amountFormatted}`;
        spendingTrendDataUl.appendChild(li);
    });

    // TODO: Implementar gráfico aqui (usando uma biblioteca como Chart.js ou similar)
    // Por enquanto, apenas exibimos os dados brutos.
    // Exemplo de como preparar dados para Chart.js:
    /*
    const labels = trendData.map(item => item.month);
    const data = trendData.map(item => item.total);
    
    // Código para criar o gráfico com Chart.js
    const ctx = document.createElement("canvas");
    spendingTrendChartDiv.appendChild(ctx);
    new Chart(ctx, {
        type: 'line', // ou 'bar'
        data: {
            labels: labels,
            datasets: [{
                label: 'Gasto Mensal',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    */
   spendingTrendChartDiv.innerHTML = "Gráfico será implementado aqui. Veja os dados abaixo."; // Placeholder

}

// --- Atualização na Inicialização e Event Listeners ---

document.addEventListener("DOMContentLoaded", () => {
    // Verificar autenticação ao carregar a página principal
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        const token = getToken();
        if (!token) {
            window.location.href = '/login.html'; // Redireciona se não estiver logado
        } else {
            console.log("Usuário autenticado.");
            logoutButton.style.display = 'inline-block'; // Mostrar botão de logout
            logoutButton.onclick = logout;
            
            // Carregar todos os dados iniciais
            loadShoppingLists();
            loadExpenseCategories();
            loadExpenses();
            loadFinancialSummary(); 
            loadSpendingTrend(); // Carregar dados de tendência de gastos
        }
    }

    // Adicionar event listeners para os botões da lista de compras
    if (createListButton) {
        createListButton.onclick = createList;
    }
    if (deleteListButton) {
        deleteListButton.onclick = deleteList;
    }
    if (addItemButton) {
        addItemButton.onclick = addItem;
    }

    // Adicionar event listener para o botão de adicionar despesa
    if (addExpenseButton) {
        addExpenseButton.onclick = addExpense;
    }
});

