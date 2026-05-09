USE futlendas_dev;
SELECT 'usuarios' AS tabela, COUNT(*) AS total FROM usuarios
UNION ALL SELECT 'jogadores', COUNT(*) FROM jogadores
UNION ALL SELECT 'convites', COUNT(*) FROM convites
UNION ALL SELECT 'campeonatos', COUNT(*) FROM campeonatos
UNION ALL SELECT 'times', COUNT(*) FROM times
UNION ALL SELECT 'time_jogadores', COUNT(*) FROM time_jogadores
UNION ALL SELECT 'rodadas', COUNT(*) FROM rodadas
UNION ALL SELECT 'campeonato_partidas', COUNT(*) FROM campeonato_partidas
UNION ALL SELECT 'campeonato_elencos', COUNT(*) FROM campeonato_elencos
UNION ALL SELECT 'cartolendas_ligas', COUNT(*) FROM cartolendas_ligas
UNION ALL SELECT 'cartolendas_times', COUNT(*) FROM cartolendas_times
UNION ALL SELECT 'cartolendas_escalacao', COUNT(*) FROM cartolendas_escalacao;
