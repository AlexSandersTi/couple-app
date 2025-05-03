# Guia de Implantação - Aplicativo do Casal

Este guia descreve os passos para implantar o backend (Node.js/Express + PostgreSQL) na Render e o frontend (HTML/CSS/JS) na Vercel.

## Pré-requisitos

*   Conta no GitHub (ou GitLab/Bitbucket) para hospedar o código.
*   Conta na [Render](https://render.com/).
*   Conta na [Vercel](https://vercel.com/).

## Estrutura do Projeto (Esperada no Repositório Git)

```
/
├── server/          # Código do Backend
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── node_modules/ (não incluir no Git, usar .gitignore)
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── public/          # Código do Frontend
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── script.js
│   └── style.css
├── .gitignore       # Para ignorar node_modules, etc.
├── render.yaml      # Arquivo de configuração do Render (opcional, pode configurar via UI)
└── DEPLOYMENT_GUIDE.md # Este arquivo
```

## Passo 1: Configurar o Banco de Dados PostgreSQL na Render

1.  Faça login no seu dashboard da Render.
2.  Clique em "New" > "PostgreSQL".
3.  Escolha um nome para o banco de dados (ex: `couple-app-db`).
4.  Selecione uma região.
5.  Escolha um plano (o plano gratuito é suficiente para começar).
6.  Clique em "Create Database".
7.  Após a criação, vá até a página do banco de dados e copie a "Internal Connection String" (ou "External Connection String" se for conectar de fora da Render). Você precisará dela para o backend.

## Passo 2: Implantar o Backend na Render

Você pode usar o arquivo `render.yaml` (Blueprint) ou configurar manualmente.

**Opção A: Usando `render.yaml` (Blueprint)**

1.  No dashboard da Render, clique em "New" > "Blueprint".
2.  Conecte seu repositório Git onde o código está hospedado.
3.  O Render deve detectar o `render.yaml` e pré-configurar os serviços.
4.  **Importante:** Verifique se a variável de ambiente `DATABASE_URL` está configurada para usar o banco de dados criado no Passo 1. Se o `render.yaml` não fez isso automaticamente, edite o serviço web (`couple-app-backend`) e adicione a variável de ambiente `DATABASE_URL`, selecionando "from Database" e escolhendo o seu banco de dados (`couple-app-db`).
5.  Verifique se a variável `JWT_SECRET` está configurada (o Render pode gerar um valor seguro).
6.  Clique em "Create Blueprint Instance".

**Opção B: Configuração Manual**

1.  No dashboard da Render, clique em "New" > "Web Service".
2.  Conecte seu repositório Git.
3.  Configure as seguintes opções:
    *   **Environment:** Node
    *   **Region:** Escolha a mesma região do banco de dados.
    *   **Branch:** `main` (ou sua branch principal).
    *   **Root Directory:** `server` (se o `package.json` estiver dentro da pasta `server`). Se estiver na raiz, deixe em branco.
    *   **Build Command:** `npm install`
    *   **Start Command:** `node server.js`
    *   **Plan:** Free (ou outro)
4.  Vá para a seção "Environment".
5.  Adicione as seguintes variáveis de ambiente:
    *   `NODE_ENV`: `production`
    *   `JWT_SECRET`: Clique em "Generate" para criar um valor seguro.
    *   `DATABASE_URL`: Clique em "Add Secret File or Env Group", selecione "Database", escolha seu banco de dados (`couple-app-db`) e selecione "Connection String".
6.  Clique em "Create Web Service".

Após a implantação, anote a URL pública do seu backend (ex: `https://couple-app-backend.onrender.com`).

## Passo 3: Implantar o Frontend na Vercel

1.  Faça login no seu dashboard da Vercel.
2.  Clique em "Add New..." > "Project".
3.  Importe seu repositório Git.
4.  Configure o projeto:
    *   **Framework Preset:** Selecione "Other".
    *   **Root Directory:** Deixe como está (raiz do projeto) se a pasta `public` estiver na raiz. Se o projeto estiver em uma subpasta, ajuste.
    *   **Build and Output Settings:**
        *   Ative "Override" para "Output Directory".
        *   Defina o **Output Directory** como `public`.
        *   Deixe os comandos de Build e Install vazios ou use `echo "No build needed"`.
5.  Vá para a seção "Environment Variables".
6.  Adicione uma variável de ambiente:
    *   **Name:** `API_BASE_URL` (ou o nome que você usará no seu `script.js`)
    *   **Value:** A URL pública do seu backend na Render (ex: `https://couple-app-backend.onrender.com`).
7.  Clique em "Deploy".

## Passo 4: Ajustar o Frontend para Usar a API_BASE_URL (Importante!)

Antes de implantar na Vercel (ou depois, se precisar atualizar), modifique o arquivo `/home/ubuntu/couple-app/public/script.js` para usar a variável de ambiente `API_BASE_URL`.

Encontre a função `fetchApi` (ou onde você faz as chamadas `fetch`) e ajuste a URL:

```javascript
// No início do script.js ou em um arquivo de configuração
// Vercel não injeta variáveis de ambiente diretamente no JS do lado do cliente.
// Você precisará definir isso de outra forma, talvez hardcoded ou via um script de build se usar um.
// Para simplicidade neste exemplo, vamos assumir que você vai substituir manualmente ou usar um placeholder.
// const API_URL = 'https://seu-backend-no-render.onrender.com'; // Substitua pela sua URL real do Render
const API_URL = ''; // Deixe vazio para desenvolvimento local ou defina a URL do Render aqui

// Dentro da função fetchApi ou chamadas fetch:
async function fetchApi(url, options = {}) {
    // ... (código anterior para pegar token)
    const fullUrl = `${API_URL}${url}`; // Constrói a URL completa
    try {
        const response = await fetch(fullUrl, options); // Usa fullUrl
        // ... (restante do código)
    }
    // ... (restante do código)
}
```

**Nota:** A Vercel não injeta variáveis de ambiente diretamente no JavaScript estático do lado do cliente da mesma forma que faz em builds de frameworks como Next.js. A maneira mais simples para este projeto HTML/CSS/JS puro é substituir manualmente a `API_URL` no `script.js` pela URL do seu backend Render antes de implantar na Vercel, ou configurar um processo de build simples se preferir.

Após esses passos, seu frontend estará acessível na URL fornecida pela Vercel e se comunicará com o backend hospedado na Render.

