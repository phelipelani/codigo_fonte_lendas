# Migrations — FutLendas

Estado conferido em **2026-05-09** contra o banco de produção
(`u136937175_futlendas`, dump `u136937175_futlendas.sql`).

## Estado no banco de produção

| Arquivo | Status | Observação |
|---|---|---|
| `001_add_reset_token_to_usuarios.sql` | ✅ aplicada | `usuarios.reset_token` e `reset_expires` existem |
| `002_add_meta_to_notificacoes.sql` | ⚠️ **PENDENTE** | Banco ainda tem `dados_json`, código usa `meta`. Causa 500 em `/api/notificacoes`. |
| `cartolendas_patrimonio.sql` | ✅ aplicada | Todas as 3 colunas (`patrimonio`, `patrimonio_apos`, `preco_apos_rodada`) já existem |
| `presenca.sql` | ✅ aplicada | Tabelas `bot_jogadores`, `bot_config`, `lista_presenca` existem |
| `presenca_jogadores.sql` | ✅ aplicada | Tabela `jogadores_presenca` existe |

> A pasta `seeds/` contém dados de exemplo para ambiente de desenvolvimento;
> nunca rodar em produção.

## Antes do próximo deploy

Rodar manualmente no phpMyAdmin (banco `u136937175_futlendas`, aba SQL):

```sql
ALTER TABLE notificacoes CHANGE COLUMN dados_json meta TEXT NULL DEFAULT NULL;
```

A tabela está vazia em produção (0 registros), então a operação é segura.

## Limpezas opcionais (zero urgência)

A coluna `usuarios.senha_hash` é legada e não tem mais nenhuma referência no código.
Pode ser removida quando quiser:

```sql
ALTER TABLE usuarios DROP COLUMN senha_hash;
```

## Para futuras migrations

- **Sempre** registrar o estado no campo "Status" desta tabela após rodar.
- Usar prefixo numérico crescente (`003_*`, `004_*`) para preservar ordem.
- Migrations devem ser idempotentes quando possível (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`). MySQL 8 suporta `IF NOT EXISTS` em `ADD COLUMN`,
  mas não em `CHANGE COLUMN` — evite renames que possam falhar em rerun.
