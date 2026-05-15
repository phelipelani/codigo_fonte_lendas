-- ================================================================
-- SEED — Album de Figurinhas (DADOS MOCKADOS para desenvolvimento)
-- ================================================================
-- Roda DEPOIS das migrations 003 e 004.
-- Popula 13 paginas + ~32 figurinhas placeholder (sem imagem real).
-- As imagens reais serao cadastradas pela tela de admin depois.
--
-- Para limpar e repopular:
--   DELETE FROM album_figurinhas; DELETE FROM album_paginas;
--   ALTER TABLE album_figurinhas AUTO_INCREMENT = 1;
--   ALTER TABLE album_paginas AUTO_INCREMENT = 1;
-- ================================================================

-- ---------- PAGINAS ----------
INSERT INTO album_paginas (numero, tipo, titulo, subtitulo, subtitulo_cor, tag, data_referencia, texto) VALUES
(1,  'capa',          'FUT LENDAS', 'COLECAO COMPLETA', '#FFC400', NULL, NULL, NULL),
(2,  'narrativa',     'O COMECO', 'DE TUDO', '#00C46A', 'A ORIGEM', '09 de agosto de 2022',
 'Em 09 de agosto de 2022, um grupo de amigos teve uma ideia simples: juntar a galera e jogar bola. Parece facil, nao foi. Para fechar um racha decente voce precisa de pelo menos 15 pessoas.'),
(3,  'rede',          'A REDE QUE CRESCEU', '2022-2024', '#FFFFFF', NULL, NULL,
 'Precisamos crescer, precisavamos de mais gente foi quando comecou os convites. Entao comeca a rede.'),
(4,  'numeros',       'OS NUMEROS', 'DA LENDA', '#FFC400', 'ESTATISTICAS - RECORDES - FOLCLORE', NULL,
 'Toda Lenda vira lenda por um motivo. No fut 5 foram mais de 1656 partidas anotadas, 685 gols e 472 assistencias.'),
(5,  'narrativa',     'POR QUE COMECAMOS OS CAMPEONATOS?', NULL, '#FFFFFF', NULL, NULL,
 'Porque racha todo mundo faz. A gente queria mais.'),
(6,  'copa',          '1a COPA', 'FUT LENDAS', '#FFC400', 'BRACKET - 4 TIMES', '17 de dezembro de 2024',
 'A historia por tras do titulo.'),
(7,  'copa',          '2a COPA', 'FUT LENDAS', '#FFFFFF', 'BRACKET - 5 TIMES', '08 de junho de 2025',
 'A historia por tras do titulo.'),
(8,  'copa',          '3a COPA', 'FUT LENDAS', '#FFC400', 'ARBITRO SUSPEITO', '08 de agosto de 2025',
 'A historia por tras do titulo.'),
(9,  'campeonato',    '1o CAMPEONATO', 'PONTOS CORRIDOS', '#A855F7', 'CAMPEAO: VASCO', '22 de outubro de 2025',
 'A ideia ja vinha ventilando faz tempo. Entao veio a decisao: vamos fazer o teste.'),
(10, 'campeonato',    '2o CAMPEONATO', 'PONTOS CORRIDOS', '#EC4899', 'SAO PAULANDO', '12 de novembro de 2025',
 'O primeiro camp deixou gosto de quero mais.'),
(11, 'campeonato',    '3o CAMPEONATO', 'SAO PAULANDO BI', '#EC4899', 'BI-CAMPEAO', '10 de fevereiro de 2026',
 'Depois de um periodo de ferias da competitividade, estava na hora de voltar.'),
(12, 'escudos',       'ESCUDOS DOS TIMES', NULL, '#FFFFFF', NULL, NULL,
 'Os escudos eternizados das Lendas.'),
(13, 'agradecimento', 'OBRIGADO', 'POR FAZER PARTE', '#FFC400', NULL, NULL,
 'Cada figurinha desse album e uma memoria. Obrigado por construir essa historia com a gente.');

-- ---------- FIGURINHAS (mockadas, sem imagem real) ----------
-- Jogadores comuns (pagina 3 - A rede que cresceu)
INSERT INTO album_figurinhas (numero, nome, time, categoria, raridade, pagina_id, slot) VALUES
(1,  'Lani',        'FutLendas', 'jogador', 'comum',    3, 1),
(2,  'Andrei',      'FutLendas', 'jogador', 'comum',    3, 2),
(3,  'Alex',        'FutLendas', 'jogador', 'comum',    3, 3),
(4,  'Gogo',        'FutLendas', 'jogador', 'comum',    3, 4),
(5,  'Victor',      'FutLendas', 'jogador', 'comum',    3, 5),
(6,  'Mauricio',    'FutLendas', 'jogador', 'comum',    3, 6),
(7,  'Andre B.',    'FutLendas', 'jogador', 'comum',    3, 7),
(8,  'Michel',      'FutLendas', 'jogador', 'comum',    3, 8),
(9,  'Neco',        'FutLendas', 'jogador', 'comum',    3, 9),
(10, 'Diones',      'FutLendas', 'jogador', 'comum',    3, 10),
(11, 'Mike',        'FutLendas', 'jogador', 'comum',    3, 11),
(12, 'Iago',        'FutLendas', 'jogador', 'comum',    3, 12),
(13, 'Luiz',        'FutLendas', 'jogador', 'comum',    3, 13),
(14, 'Guedes',      'FutLendas', 'jogador', 'comum',    3, 14),
(15, 'G. Santana',  'FutLendas', 'jogador', 'comum',    3, 15),
(16, 'Tiago',       'FutLendas', 'jogador', 'comum',    3, 16),
(17, 'Diego B.',    'FutLendas', 'jogador', 'comum',    3, 17),
(18, 'Bigode',      'FutLendas', 'jogador', 'comum',    3, 18),
(19, 'Matheus',     'FutLendas', 'jogador', 'comum',    3, 19),
(20, 'Maranhao',    'FutLendas', 'jogador', 'comum',    3, 20),
(21, 'Afranio',    'FutLendas', 'jogador', 'comum',    3, 21),
(22, 'Rafael',      'FutLendas', 'jogador', 'comum',    3, 22),
-- Lendarias
(23, 'Higor',       'FutLendas', 'jogador', 'lendaria', 3, 23),
(24, 'Dieguinho',   'FutLendas', 'jogador', 'lendaria', 3, 24),
(25, 'Ze',          'FutLendas', 'jogador', 'lendaria', 3, 25),
(26, 'Apolo',       'FutLendas', 'jogador', 'lendaria', 3, 26),
-- Estatisticas (pagina 4)
(27, 'Maior Artilheiro Fut 5',  NULL, 'estatistica', 'lendaria', 4, 1),
(28, 'Maior Pe de Rato Fut 5',  NULL, 'estatistica', 'comum',    4, 2),
-- Etiquetas de copa (pagina 6)
(29, 'Time Campeao - 1a Copa',  NULL, 'etiqueta', 'lendaria', 6, 1),
(30, 'Trofeu - 1a Copa',        NULL, 'etiqueta', 'comum',    6, 2),
-- Escudos (pagina 12)
(31, 'Escudo Real Madruga',     NULL, 'escudo',   'comum',    12, 1),
(32, 'Escudo Inter dos Molao',  NULL, 'escudo',   'comum',    12, 2);
