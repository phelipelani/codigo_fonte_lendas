# API FutLendas - Versão PHP

Esta é a versão em PHP da API FutLendas, convertida a partir da API original em Node.js. O objetivo foi manter 100% de compatibilidade com as rotas e funcionalidades existentes para garantir que o frontend continue funcionando sem alterações.

## Estrutura do Projeto

A estrutura do projeto foi organizada para seguir as melhores práticas de desenvolvimento PHP, separando as responsabilidades em diferentes diretórios:

```
api_php/
├── config/             # Arquivos de configuração (banco de dados, .env)
│   ├── database.php
│   └── env.php
├── public/             # Ponto de entrada da API (acessível publicamente)
│   ├── .htaccess       # Regras de reescrita para URLs amigáveis
│   └── index.php       # Roteador principal que processa todas as requisições
├── src/                # Código-fonte da aplicação
│   ├── controllers/    # Lógica de negócio e controle das rotas
│   ├── middleware/     # Camadas intermediárias (ex: autenticação)
│   ├── models/         # (Opcional) Lógica de acesso a dados
│   └── utils/          # Classes e funções utilitárias (JWT, S3, etc.)
├── vendor/             # Dependências instaladas pelo Composer
├── .env                # Variáveis de ambiente (NÃO versionar)
├── composer.json       # Definição das dependências do projeto
└── README.md           # Este arquivo
```

## Tecnologias e Bibliotecas

- **PHP 8.0+**
- **PDO (PHP Data Objects)**: Para conexão segura com o banco de dados MySQL.
- **[aws/aws-sdk-php](https://github.com/aws/aws-sdk-php)**: SDK oficial da AWS para integração com o S3.
- **Composer**: Para gerenciamento de dependências.
- **JWT (JSON Web Tokens)**: Implementação manual para autenticação, compatível com a biblioteca `jsonwebtoken` do Node.js.

## Instalação e Configuração

Siga os passos abaixo para configurar e rodar a API em seu ambiente de hospedagem (Hostinger).

### 1. Pré-requisitos

- **Servidor Web**: Apache ou Nginx (a Hostinger geralmente usa Apache ou LiteSpeed, que é compatível).
- **PHP**: Versão 8.0 ou superior.
- **Composer**: Ferramenta para gerenciamento de dependências em PHP. A Hostinger geralmente permite a instalação via SSH.
- **Banco de Dados MySQL**: Já configurado na sua conta Hostinger.

### 2. Envio dos Arquivos

- Envie todos os arquivos e pastas do diretório `api_php` para o diretório raiz da sua aplicação no servidor de hospedagem (geralmente `public_html` ou um subdomínio específico).

### 3. Instalação das Dependências

- Acesse seu servidor via **SSH** (a Hostinger oferece esse acesso).
- Navegue até o diretório onde você enviou os arquivos.
- Execute o comando para instalar as dependências:

```bash
composer install
```

Isso criará o diretório `vendor` com a SDK da AWS.

### 4. Configuração do Ambiente

- Renomeie o arquivo `.env.example` para `.env` (se aplicável) ou crie um novo arquivo `.env` na raiz do projeto.
- Preencha as variáveis de ambiente com as suas credenciais. Este arquivo é idêntico ao `.env` da sua aplicação Node.js:

```ini
# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Chave secreta para assinar os tokens JWT
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# Configurações AWS S3
AWS_ACCESS_KEY_ID=SUA_CHAVE_DE_ACESSO_AWS
AWS_SECRET_ACCESS_KEY=SUA_CHAVE_SECRETA_AWS
AWS_REGION=sa-east-1
AWS_BUCKET_NAME=bucketfutlendas

# Banco de Dados (HOSTINGER)
DB_HOST=srv791.hstgr.io
DB_USER=u136937175_laniphelipe
DB_NAME=u136937175_futlendas
DB_PASSWORD=SUA_SENHA_DO_BANCO
DB_PORT=3306

FRONTEND_URL=https://www.futlendas.com.br
```

**Importante**: Certifique-se de que o arquivo `.env` nunca seja acessível publicamente e não seja versionado no Git.

### 5. Configuração do Servidor Web (Apache)

O arquivo `public/.htaccess` já está configurado para redirecionar todas as requisições para o `index.php`, criando URLs amigáveis (ex: `/api/jogadores` em vez de `/api/public/index.php/jogadores`).

```apache
RewriteEngine On

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

Verifique se o `mod_rewrite` do Apache está ativado na sua hospedagem (geralmente está por padrão na Hostinger).

## Endpoints da API

A API mantém exatamente os mesmos endpoints da versão Node.js. Todas as rotas são prefixadas com o diretório onde a API está instalada. Se você instalou na raiz do subdomínio `api.seusite.com.br`, as rotas serão:

- `POST https://api.seusite.com.br/auth/login`
- `GET https://api.seusite.com.br/jogadores`
- `GET https://api.seusite.com.br/times`
- etc.

Para uma lista completa de todas as rotas, consulte o arquivo `api_routes_complete.md`.

## Testando a API

Após a configuração, você pode testar a API usando ferramentas como Postman, Insomnia ou diretamente pelo seu frontend.

1.  **Health Check**: Acesse a URL raiz da sua API no navegador (ex: `https://api.seusite.com.br/`). Você deve ver a seguinte resposta:

    ```json
    {
        "status": "ok",
        "message": "API FutLendas está no ar!",
        "docs": "/api-docs",
        "version": "1.0.0"
    }
    ```

2.  **Login**: Faça uma requisição `POST` para a rota `/auth/login` com o `username` e `password` no corpo da requisição para obter um token JWT.

3.  **Rotas Protegidas**: Para acessar rotas de administrador (ex: `POST /jogadores`), inclua o token JWT no cabeçalho da requisição:

    ```
    Authorization: Bearer seu_token_jwt_aqui
    ```
