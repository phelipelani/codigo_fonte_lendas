# 📋 HANDOFF — Módulo `/campo` (Futlendas — Analista de Campo)

Guia pra continuar o projeto em outra máquina. Tudo está na branch **`feat-campo`** do repo
`github.com/phelipelani/codigo_fonte_lendas`.

---

## 1. O que é

App de **análise de desempenho** pra times de futebol de campo (11). Cliente piloto: **Caraguatas**.
Roda sobre a infra do Futlendas (mesma hospedagem/domínio, banco separado), em
`https://futlendas.com.br/campo`.

- **Frontend**: React 18 + Vite + TypeScript + Tailwind → pasta `campo-app/` (este diretório).
- **Backend**: PHP (mesma API do Futlendas) → pasta `apihostinguer/`. Rotas do campo: `/campo/*`.
- **Banco**: MySQL **separado** do Futlendas (`u136937175_futlendas_camp`), tabelas `campo_*`.

---

## 2. Rodar o frontend localmente

```bash
cd campo-app
npm install
npm run dev          # vite em http://localhost:5173/campo/  (base = /campo/)
```
O `vite.config.ts` tem **proxy**: chamadas `/api/*` vão pra `https://futlendas.com.br` (produção).
Ou seja, no dev você já bate na API real. Abra **http://localhost:5173/campo/#/login**.

**Login de teste:** `diretor` / `diretor123`  (ou `tecnico` / `tecnico123`).

Build de produção:
```bash
npm run build        # gera campo-app/dist/
```

---

## 3. Arquitetura / decisões

- **Multi-tenant** por `clube_id` (tudo escopado pelo clube do token).
- **Auth própria** (tabela `campo_usuarios`, papéis `diretor`/`tecnico`/`jogador`), JWT com `escopo:'campo'`.
  Login por senha + **Google OAuth** + criação de conta **por convite**.
- **Banco próprio**: conexão `CampoDatabase` lê env `CAMPO_DB_*`. ⚠️ **`CAMPO_DB_HOST=localhost`**
  (usar `srv791.hstgr.io` dá *access denied* pro usuário novo).
- Frontend e API no **mesmo domínio** (`futlendas.com.br`) → sem CORS em produção.
- **HashRouter** (`/campo/#/rota`) — funciona em subpasta e no futuro APK (Capacitor).
- Paleta **night** (azul-petróleo `#080b12` + ciano `#2fe3da`) — ver `tailwind.config.js` (`night.*`).
- Inputs/selects: fundo claro + fonte `#000407` (classe `.field` em `src/index.css`).
- **Layout compartilhado** (`src/components/Layout.tsx`): sidebar + topo. Prop `bare` = sem topo (captura).

---

## 4. O que JÁ está feito (telas)

| Tela | Arquivo | Status |
|---|---|---|
| Login (estádio + card night, Google, convite) | `pages/LoginPage.tsx` | ✅ |
| Callback Google / Ativar convite | `pages/CallbackPage.tsx`, `ConvitePage.tsx` | ✅ |
| Convidar (diretor gera link) | `pages/ConvidarPage.tsx` | ✅ |
| Dashboard (sidebar, cards, resumo) | `pages/DashboardPage.tsx` | ✅ |
| Elenco (tabela + painel de detalhe) | `pages/ElencoPage.tsx` | ✅ |
| Adversários (confrontos V/E/D, GF/GS, cadastro) | `pages/AdversariosPage.tsx` | ✅ |
| Partidas (CRUD, local do jogo) | `pages/PartidasPage.tsx` | ✅ |
| Escalação (escolher 11 + formação) | `pages/EscalacaoPage.tsx` | ✅ |
| Captura ao vivo (placar, timer, totais, grid, reservas, GK) | `pages/CapturaPage.tsx` | ✅ |
| Relatórios (abas Geral/Partidas, gráficos) | `pages/RelatoriosPage.tsx` | ✅ |

**Fluxo principal:** Partidas → **Escalar** → **Anotar** (captura ao vivo) → **Encerrar**
(grava `campo_estatisticas_partida` + `campo_eventos` + placar). Isso alimenta Adversários e Relatórios.

Backend (em `apihostinguer/`):
- `config/campo_database.php`, `src/middleware/CampoMiddleware.php`
- `src/controllers/Campo{Auth,Jogador,Adversario,Partida,Convite,Relatorio}Controller.php`
- `public/index.php` → bloco de rotas `/campo` (perto do fim)
- `migrations/campo_001..004.sql`, `campo/setup.php`

---

## 5. ⚠️ DEPLOY PENDENTE (fazer ao retomar)

Deploy é **manual** pelo File Browser do Hostinger.

### 5.1 Migrações (phpMyAdmin → SQL do banco `futlendas_camp`)
```sql
ALTER TABLE campo_partidas ADD COLUMN local_nome VARCHAR(160) NULL AFTER local,
                           ADD COLUMN local_bairro VARCHAR(120) NULL AFTER local_nome;   -- campo_002
ALTER TABLE campo_adversarios ADD COLUMN competicao VARCHAR(80) NULL AFTER nome;          -- campo_004
-- campo_003: rodar o CREATE TABLE campo_convites (ver migrations/campo_003_convites.sql)
```

### 5.2 Backend → `public_html/api/`
Subir TODOS os arquivos `Campo*` + `index.php` + config/middleware:
- `public/index.php`
- `config/campo_database.php`
- `src/middleware/CampoMiddleware.php`
- `src/controllers/Campo{Auth,Jogador,Adversario,Partida,Convite,Relatorio}Controller.php`

### 5.3 Frontend → `public_html/campo/`
`npm run build` e subir **todo o conteúdo** de `dist/` (incl. `assets/`, `icon_*.png`,
`logo.png`, `hero.png`, `estadio.webp`, `manifest.webmanifest`). Apagar os assets antigos.

### 5.4 Google OAuth (1x)
No Google Cloud Console (mesmo client do Futlendas), adicionar em **URIs de redirecionamento**:
```
https://futlendas.com.br/api/campo/auth/google/callback
```

---

## 6. Próximos passos sugeridos (TODO)

1. **Elenco — números reais**: hoje Jogos/Vitórias/Derrotas estão `0` hardcoded em `ElencoPage`.
   Fazer endpoint computar de `campo_estatisticas_partida` + `campo_partidas` por jogador.
2. **Captura — mais eventos**: hoje só passe/chute/gol/assist + GK. Adicionar cartões, faltas,
   desarmes, interceptações → alimenta as métricas que ficam em 0 nos Relatórios.
3. **Agenda** (diretor): tabela `campo_agenda` já existe, falta UI (calendário/compromissos).
4. **Notificações**: o badge "3" é placeholder, sem backend.
5. **Simulador / quadro de sugestões de escalação**: tabelas `campo_simulacoes(_jogadores)` existem, sem UI.
6. **Gerenciar usuários / trocar senha** (as senhas `diretor123`/`tecnico123` são provisórias).
7. **Escudo do Caraguatas** na sidebar (hoje cai no `logo.png`; cadastrar `escudoUrl` do clube).

---

## 7. Gotchas / lembretes

- `CAMPO_DB_HOST=localhost` no `.env` (não `srv791`).
- O `index.php` do repo é base + bloco campo; **NÃO** baixe ele por cima da produção
  (a produção tem RateLimiter/CORS mais novos). Suba só o bloco `/campo` se precisar mergear.
- `.env` é gitignored — segredos nunca vão pro repo. ✅
- Endereço da API: `https://futlendas.com.br/api`. Health check: abrir `/api/` → `FutLendas API On!`.
- Há **15 jogadores de teste** já no banco (Xan, Guedes, Iago, etc.).

---

_Última atualização: handoff gerado para continuidade em outra máquina._
