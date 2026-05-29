# Migrations de Refatoração — FutLendas

## Estratégia: sem perda de dados, sem downtime

Cada fase é independente e pode ser executada separadamente.
Nenhum dado é deletado até a Fase 4 (validação final).

## Ordem de execução

| Arquivo | Descrição | Reversível? |
|---------|-----------|-------------|
| `fase1_grupos.sql` | Cria grupos + adiciona grupo_id nas tabelas core | ✅ Sim (DROP COLUMN) |
| `fase2_novas_tabelas.sql` | Cria competicoes, elencos, partidas, partida_stats, partida_eventos, premios | ✅ Sim (DROP TABLE) |
| `fase3_migrar_dados.sql` | Copia dados das tabelas antigas para as novas | ✅ Sim (TRUNCATE novas) |
| `fase4_indices.sql` | Cria índices de performance | ✅ Sim (DROP INDEX) |

## Como executar na Hostinger

1. Faça backup pelo painel (já feito)
2. Execute fase por fase no phpMyAdmin
3. Valide com as queries de checagem no final de cada arquivo
4. Só avance para a próxima fase se OK

## Tabelas ANTIGAS — não serão dropadas nesta migração

As tabelas antigas continuam existindo com o nome original.
Só serão removidas após validação completa (sprint seguinte).

Tabelas que serão substituídas mas mantidas:
- campeonatos → substituída por competicoes
- ligas → substituída por competicoes
- campeonato_partidas → substituída por partidas
- campeonato_elencos + campeonato_rodada_elencos + time_jogadores + rodada_jogadores + rodada_times → substituídas por elencos
- campeonato_estatisticas_partida → substituída por partida_stats
- campeonato_eventos_partida → substituída por partida_eventos
- campeonato_premios + premios_rodada → substituídas por premios
