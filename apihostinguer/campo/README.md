# Módulo `/campo` — Analista de Campo

App separado em `www.futlendas.com.br/campo`, usando a **mesma API PHP** e o **mesmo MySQL**
do Futlendas. Tudo isolado por tabelas `campo_*` e login próprio (`campo_usuarios`).

## Fase 1 — Fundação (banco + auth) ✅

Arquivos desta fase:

| Arquivo | Papel |
|---|---|
| `migrations/campo_001_fundacao.sql` | Todas as tabelas `campo_*` |
| `src/middleware/CampoMiddleware.php` | Auth por papel (diretor/tecnico/jogador) + isolamento por clube |
| `src/controllers/CampoAuthController.php` | `login` e `me` |
| `campo/setup.php` | Cria tabelas + seed (clube Caraguatas, usuários diretor/técnico) |
| `public/index.php` | Bloco de rotas `/campo/*` |

## Como subir (Hostinger)

1. **Suba os arquivos** acima para a API (mesma pasta do `apihostinguer`).
2. **Crie o banco novo** no Hostinger e adicione as credenciais no `.env` da API
   (banco SEPARADO do Futlendas — o `/campo` usa sua própria conexão):
   ```
   CAMPO_DB_HOST=localhost
   CAMPO_DB_NAME=uXXXX_campo
   CAMPO_DB_USER=uXXXX_campo
   CAMPO_DB_PASSWORD=senha-do-banco
   CAMPO_DB_PORT=3306
   CAMPO_SETUP_KEY=algumacoisa-bem-secreta
   ```
3. **Rode o setup uma vez** no navegador (cria tabelas + usuários):
   ```
   https://SEU-DOMINIO-DA-API/campo/setup?key=algumacoisa-bem-secreta
   ```
   Opcional: `&senha_diretor=...&senha_tecnico=...` para definir as senhas.
   Padrão: `diretor` / `diretor123` e `tecnico` / `tecnico123`.
4. **Teste o login**:
   ```bash
   curl -X POST https://SEU-DOMINIO-DA-API/campo/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login":"diretor","password":"diretor123"}'
   ```
   Deve retornar `{ token, user: { papel: "diretor", clube: {...} } }`.
5. **Teste a rota protegida** com o token retornado:
   ```bash
   curl https://SEU-DOMINIO-DA-API/campo/auth/me -H "Authorization: Bearer SEU_TOKEN"
   ```
6. Depois de validar, **desative a rota de setup** (remova `CAMPO_SETUP_KEY` do `.env`)
   e troque as senhas padrão.

## Token JWT do campo

Payload: `{ escopo:'campo', userId, clubeId, papel, jogadorId, nome }`.
Toda query do `/campo` filtra por `CampoMiddleware::clubeId()` (isolamento multi-tenant).

## Próximas fases

- **Fase 2** — Cadastros: elenco (com foto), adversários, partidas, escalação.
- **Fase 3** — Captura ao vivo ligada à API (eventos + ao vivo + encerrar).
- **Fase 4** — Relatórios pós-jogo + evolução de temporada + perfil do jogador.
- **Fase 5** — Simulador/quadro de sugestões + agenda.
