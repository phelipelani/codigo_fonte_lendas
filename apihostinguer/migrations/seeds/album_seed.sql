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
 'Em 09 de agosto de 2022, um grupo de amigos teve uma ideia simples: juntar a galera e jogar bola. Parece fácil — não foi. Para fechar um racha decente você precisa de pelo menos 15 pessoas.\n\nEngraçado, porque dava para contar nos dedos quem jogava bola: Higor, Dieguinho, Xan, Lani, Ronay, Alan, Tiago, Digo, Wagner. Sabíamos que dava nove pessoas. No desespero, começa a ventilar nomes. Afranio, que com uma mensagem já informou que levaria talvez o cara mais resenha, mais ruim e mais amado do racha, nosso querido Apolo. O Gabriel Ferreira era nossa dúvida, mas fazia parte dos planos.\n\nDe nove passamos para onze. Ainda faltava quatro. Digo então falou: vou chamar o João, que trouxe seus funcionários todos rsrs.\n\nO pontapé foi dado. Arena Caiçara ia ser o palco.'),
(3,  'rede',          'A REDE QUE CRESCEU', '2022-2024', '#FFFFFF', NULL, NULL,
 'Precisamos crescer, precisavamos de mais gente foi quando comecou os convites. Entao comeca a rede.'),
(4,  'numeros',       'OS NÚMEROS', 'DA LENDA', '#FFC400', 'ESTATÍSTICAS · RECORDES · FOLCLORE', NULL,
 'Toda Lenda vira lenda por um motivo — e o motivo só fica claro quando é contado e documentado.\n\nNa era do Fut 5, começamos a anotar o legado de nossos jogadores, escrevendo seus capítulos, suas partidas, seus lances, seus números.\n\nNo Fut 5 foram mais de 1656 partidas anotadas, mais de 685 gols registrados e mais de 472 assistências.\n\nA primeira partida do Fut 5 anotada foi em 11/06/2024. A última, em 06/05/2025.\n\nO Fut 5 nos proporcionou muitas histórias, muitos lances e gols, além de duas copas com momentos históricos.'),
(5,  'narrativa',     'Por que começamos os campeonatos?', NULL, '#FFFFFF', NULL, NULL,
 'Porque racha todo mundo faz. A gente queria mais.\n\nTinha algo que a gente sentia toda terça, aquela vontade de ganhar, aquela faísca no olhar quando a bola entrava.\n\nFoi aí que surgiu a ideia. E no dia 17 de dezembro de 2024, o que era pra ser só "o último racha do ano" virou história. A gente queria fechar 2024 com chave de ouro e fechou. Com direito a emoção, gritaria, e aquela sensação que só quem estava lá entende.\nA partir daí ficou claro: isso precisava continuar.\n\nCada campeonato, cada copa que veio depois mostrou que a decisão foi certa.\n\nPorque quando a competição começa, as Lendas se transformam.[[DIR]]O amigo vira adversário, o adversário vira inimigo, o inimigo abraça depois do jogo — todo mundo volta na semana seguinte querendo mais. Já rolou discussão, já rolou aquela "palavrinha" no calor da hora, já rolou aquele olhar de "isso não tá acabado não"... mas no fim, é exatamente isso que faz a diferença entre um racha e um campeonato de verdade.\n\nA competição revelou lados que o racha nunca mostraria. Revelou líderes, revelou guerreiros, revelou aquele cara que ninguém apostava — e que na hora H apareceu.\n\nÉ por isso que a gente compete. Não só pra ganhar. Mas pra sentir.'),
(6,  'copa',          '1ª COPA', 'FUT LENDAS', '#FFC400', 'BRACKET · 4 TIMES', '17 de dezembro de 2024',
 '## A HUMILHAÇÃO NA FASE DE GRUPOS\nO Time Amarelo não venceu um único jogo na fase de grupos. Terminou em último lugar, zoado por todo mundo como "o time dos dois pés de rato." Chegaram ao mata-mata pela matemática, não pelo mérito — e todo mundo sabia disso.\n\n## SEMIFINAL — A RESSURREIÇÃO\n3 a 0 em 3 minutos. Dois gols do Lani com passe do Apolo. O Preto acordou, buscou 2 a 3 e ainda tinha 5 minutos. A quadra inteira esperava o empate. O Amarelo se fechou e segurou.\n[[PILL]] De 0 a 3 em 3 minutos — ninguém acreditou\n\n## O PÊNALTI DO MARCELO\nDo outro lado, Azul e Rosa foram para os pênaltis. O Azul colocou Marcelo — pé de enchada — para bater o primeiro. Ele perdeu. Rosa foi direto para a final.\n[[PILL]] O pênalti mais famoso da história do Fut Lendas\n\n## A FINAL — O IMPOSSÍVEL ACONTECE\nO Rosa havia goleado o Amarelo por 4 a 1 na fase de grupos. A taça era deles, todo mundo sabia. Só que futebol não se joga no papel. O Amarelo não tomou conhecimento. Atacou. Controlou. 3 a 1.\n[[DESTAQUE]] O último seria o primeiro. Da lanterna ao título inaugural da história.'),
(7,  'copa',          '2ª COPA', 'FUT LENDAS', '#FFC400', 'BRACKET · 5 TIMES', '08 de junho de 2025',
 '## DOMINÂNCIA TOTAL NA FASE DE GRUPOS\nO Time Preto atropelou, humilhou, dominou. O placar mais emblemático: 5 a 0 no Rosa — time que tinha Lani e André. O Time Branco foi o primeiro eliminado de uma Copa com 5 times.\n\n## A FINAL — NERVOS E O MOMENTO DE HIGOR\nEmpate no tempo normal. Pênaltis. Higor salvou em cima da linha — um daqueles momentos que ficam na memória. Na última cobrança, Diego B. perdeu. Time Preto campeão.\n[[PILL]] Higor salva em cima da linha — o momento da Copa\n[[PILL]] Tiago — primeiro Bi-campeão da história'),
(8,  'copa',          '3ª COPA', 'FUT LENDAS', '#FFC400', 'ÁRBITRO SUSPEITO', '08 de agosto de 2025',
 '## O GOL AOS 09:55\n1 a 1. Faltavam 5 segundos. Rafael toca para Lani. Lani de costas faz o pivô. Encaixa para André que vinha de frente. GOL DO TÍTULO. O cronômetro marcava 9:55 — e o jogo deveria acabar aos 10 minutos.\n[[DESTAQUE]] 9:55. Rafael toca. Lani gira. André finaliza. Gol. O título estava feito com 5 segundos de sobra.\n\n## O ÁRBITRO SUSPEITO\nO árbitro daquele jogo era Higor — irmão do Dieguinho, jogador do Time Rosa. O apito não veio aos 10 minutos. O jogo continuou por mais 1 minuto inteiro. O gol não saiu. O Amarelo segurou.\n[[PILL]] Higor apitou o jogo do próprio irmão\n[[PILL]] Lani e Rafael igualam Tiago com 2 títulos de Copa'),
(9,  'campeonato',    '1º CAMPEONATO', 'PONTOS CORRIDOS', '#A855F7', 'CAMPEÃO: VASCO', '22 de outubro de 2025 · 1 mês',
 'A ideia já vinha ventilando faz tempo. Precisava amadurecer, precisava do momento certo.\nEntão veio a decisão: vamos fazer o teste.\n\nE a emoção não esperou a bola rolar, já começou no draft. O Gambito dos Capitães: quais Lendas escolher? Como montar o time? Como pensar na estratégia sem entregar o jogo antes de começar?\n\nCampeonato rolando, cada rodada contava. Os times foram se entrosando, evoluindo ou derretendo sob pressão. Um formato mais competitivo, mais disputado, que forçava cada Lenda a dar um passo além do racha de sempre. E claro, o primeiro camp não podia ser sem polêmica.\n\nJogo entre PSV contra Vasco, PSV com 33 pontos, Vasco com 31. O PSV precisava de um empate para o título. E então veio a famosa cãibra, o lendário gol da rataria, e no fim... título pro Vascão! Coroando uma campanha sólida, construída rodada por rodada.\n\nO teste passou. A Copa virou tradição.'),
(10, 'campeonato',    '2º CAMPEONATO', 'PONTOS CORRIDOS', '#EC4899', 'SÃO PAULANDO', '12 de novembro de 2025 · 2 meses',
 'O primeiro camp deixou gosto de quero mais. Então a galera foi além, trouxe ideias, sugeriu regras, ajudou a construir. Novos capitães, sistema de rebaixamento, um período maior de campeonato. Mais tempo pra se entrosar. Mais tempo pra derreter também.\n\nE dessa vez, ninguém imaginou que tudo ficaria pra ser decidido na última rodada.\n\nShaktar com 44 pontos. São Paulando com 40. No confronto direto, último minuto, Wilian encontrou Gabriel Ferreira e a bola entrou. Vitória do São Paulando — que teria mais um jogo, só precisava de um empate e levantava o caneco.\n\nAí veio a jogada que ninguém esperava: o Shaktar, fora da briga pelo título, cedeu jogadores pro Vasco enfrentar o São Paulando. A ideia? Ajudar o adversário a tropeçar.\n\nA ironia ficou registrada pra sempre: o Shaktar ajudou o rival e perdeu o título assim mesmo — Mike perdeu um gol feito, dando a vitória ao São Paulando.\n\nCampeão: São Paulando. De virada, na raça, e com um roteiro que só o Fut Lendas escreve.'),
(11, 'campeonato',    '3o CAMPEONATO', 'SAO PAULANDO BI', '#EC4899', 'BI-CAMPEAO', '10 de fevereiro de 2026',
 'Depois de um periodo de ferias da competitividade, estava na hora de voltar.'),
(12, 'escudos',       'ESCUDOS DOS TIMES', NULL, '#FFFFFF', NULL, NULL,
 'Os escudos eternizados das Lendas.'),
(13, 'agradecimento', 'OBRIGADO', 'POR FAZER PARTE', '#FFC400', NULL, NULL,
 'Cada figurinha desse album e uma memoria. Obrigado por construir essa historia com a gente.');

-- ---------- FIGURINHAS — Pagina 3 "A Rede que Cresceu" (34) ----------
-- Slots 1-5 vao embaixo da imagem (esquerda); 6-34 no grid da direita.
-- Apenas Apolo (#9) e lendaria. As demais paginas (4, 6, 12...) terao
-- suas figurinhas quando forem montadas.
INSERT INTO album_figurinhas (numero, nome, `time`, categoria, raridade, pagina_id, slot) VALUES
(1,  'Lani',          'FutLendas', 'jogador', 'comum',    3, 1),
(2,  'Xan',           'FutLendas', 'jogador', 'comum',    3, 2),
(3,  'Dieguinho',     'FutLendas', 'jogador', 'comum',    3, 3),
(4,  'Higor',         'FutLendas', 'jogador', 'comum',    3, 4),
(5,  'Alan',          'FutLendas', 'jogador', 'comum',    3, 5),
(6,  'Tiago',         'FutLendas', 'jogador', 'comum',    3, 6),
(7,  'Digo',          'FutLendas', 'jogador', 'comum',    3, 7),
(8,  'Wagner',        'FutLendas', 'jogador', 'comum',    3, 8),
(9,  'Apolo',         'FutLendas', 'jogador', 'lendaria', 3, 9),
(10, 'Afranio',       'FutLendas', 'jogador', 'comum',    3, 10),
(11, 'Ronay',         'FutLendas', 'jogador', 'comum',    3, 11),
(12, 'G. Ferreira',   'FutLendas', 'jogador', 'comum',    3, 12),
(13, 'Andrei',        'FutLendas', 'jogador', 'comum',    3, 13),
(14, 'Diones',        'FutLendas', 'jogador', 'comum',    3, 14),
(15, 'Victor',        'FutLendas', 'jogador', 'comum',    3, 15),
(16, 'Mike',          'FutLendas', 'jogador', 'comum',    3, 16),
(17, 'Alex',          'FutLendas', 'jogador', 'comum',    3, 17),
(18, 'Gogo',          'FutLendas', 'jogador', 'comum',    3, 18),
(19, 'Iago',          'FutLendas', 'jogador', 'comum',    3, 19),
(20, 'Diego Borges',  'FutLendas', 'jogador', 'comum',    3, 20),
(21, 'Leandro',       'FutLendas', 'jogador', 'comum',    3, 21),
(22, 'Mauricio',      'FutLendas', 'jogador', 'comum',    3, 22),
(23, 'André Borges',  'FutLendas', 'jogador', 'comum',    3, 23),
(24, 'Michel',        'FutLendas', 'jogador', 'comum',    3, 24),
(25, 'Zé',            'FutLendas', 'jogador', 'comum',    3, 25),
(26, 'Rafael',        'FutLendas', 'jogador', 'comum',    3, 26),
(27, 'Guedes',        'FutLendas', 'jogador', 'comum',    3, 27),
(28, 'Bora',          'FutLendas', 'jogador', 'comum',    3, 28),
(29, 'G. Santana',    'FutLendas', 'jogador', 'comum',    3, 29),
(30, 'Maranhão',      'FutLendas', 'jogador', 'comum',    3, 30),
(31, 'Neco',          'FutLendas', 'jogador', 'comum',    3, 31),
(32, 'Caio',          'FutLendas', 'jogador', 'comum',    3, 32),
(33, 'Bigode',        'FutLendas', 'jogador', 'comum',    3, 33),
(34, 'Luis',          'FutLendas', 'jogador', 'comum',    3, 34),
-- Pagina 4 "Os Numeros da Lenda" — 9 figurinhas de estatistica (lendarias)
(35, 'Total de Gols',         NULL, 'estatistica', 'lendaria', 4, 1),
(36, 'Total de Assistências', NULL, 'estatistica', 'lendaria', 4, 2),
(37, 'Total de Jogos',        NULL, 'estatistica', 'lendaria', 4, 3),
(38, 'Maior Artilheiro',      NULL, 'estatistica', 'lendaria', 4, 4),
(39, 'Maior Assistente',      NULL, 'estatistica', 'lendaria', 4, 5),
(40, 'Maior MVP',             NULL, 'estatistica', 'lendaria', 4, 6),
(41, 'Maior Pé de Rato',      NULL, 'estatistica', 'lendaria', 4, 7),
(42, 'Maior Vencedor',        NULL, 'estatistica', 'lendaria', 4, 8),
(43, 'Maior Perdedor',        NULL, 'estatistica', 'lendaria', 4, 9),
-- Pagina 5 — figurinha larga (foto que se divide em 2 slots)
(44, 'Campeonatos — parte 1', NULL, 'jogador', 'comum', 5, 1),
(45, 'Campeonatos — parte 2', NULL, 'jogador', 'comum', 5, 2),
-- Pagina 6 "1a Copa Fut Lendas" — campeao + trofeu + 5 jogadores + chaveamento
(46, 'Time Campeão — 1ª Copa',      NULL, 'etiqueta', 'comum', 6, 1),
(47, 'Troféu — 1ª Copa',            NULL, 'etiqueta', 'comum', 6, 2),
(48, 'Jogador Campeão 1 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 3),
(49, 'Jogador Campeão 2 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 4),
(50, 'Jogador Campeão 3 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 5),
(51, 'Jogador Campeão 4 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 6),
(52, 'Jogador Campeão 5 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 7),
(53, 'Chaveamento 1ª Copa — parte 1', NULL, 'etiqueta', 'comum', 6, 8),
(54, 'Chaveamento 1ª Copa — parte 2', NULL, 'etiqueta', 'comum', 6, 9),
-- Pagina 7 "2a Copa Fut Lendas"
(55, 'Time Campeão — 2ª Copa',      NULL, 'etiqueta', 'comum', 7, 1),
(56, 'Troféu — 2ª Copa',            NULL, 'etiqueta', 'comum', 7, 2),
(57, 'Jogador Campeão 1 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 3),
(58, 'Jogador Campeão 2 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 4),
(59, 'Jogador Campeão 3 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 5),
(60, 'Jogador Campeão 4 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 6),
(61, 'Jogador Campeão 5 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 7),
(62, 'Chaveamento 2ª Copa — parte 1', NULL, 'etiqueta', 'comum', 7, 8),
(63, 'Chaveamento 2ª Copa — parte 2', NULL, 'etiqueta', 'comum', 7, 9),
-- Pagina 8 "3a Copa Fut Lendas"
(64, 'Time Campeão — 3ª Copa',      NULL, 'etiqueta', 'comum', 8, 1),
(65, 'Troféu — 3ª Copa',            NULL, 'etiqueta', 'comum', 8, 2),
(66, 'Jogador Campeão 1 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 3),
(67, 'Jogador Campeão 2 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 4),
(68, 'Jogador Campeão 3 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 5),
(69, 'Jogador Campeão 4 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 6),
(70, 'Jogador Campeão 5 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 7),
(71, 'Chaveamento 3ª Copa — parte 1', NULL, 'etiqueta', 'comum', 8, 8),
(72, 'Chaveamento 3ª Copa — parte 2', NULL, 'etiqueta', 'comum', 8, 9),
-- Pagina 9 "1o Campeonato Pontos Corridos"
(73, 'Time Campeão — 1º Camp.',      NULL, 'etiqueta',    'comum',    9, 1),
(74, 'Jogador Campeão 6 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 2),
(75, 'Jogador Campeão 1 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 3),
(76, 'Jogador Campeão 2 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 4),
(77, 'Jogador Campeão 3 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 5),
(78, 'Jogador Campeão 4 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 6),
(79, 'Jogador Campeão 5 — 1º Camp.', NULL, 'etiqueta',    'comum',    9, 7),
(80, 'Artilheiro do Campeonato',     NULL, 'estatistica', 'lendaria', 9, 8),
(81, 'Armador do Campeonato',        NULL, 'estatistica', 'lendaria', 9, 9),
(82, 'MVP do Campeonato',            NULL, 'estatistica', 'lendaria', 9, 10),
-- Pagina 10 "2o Campeonato Pontos Corridos"
(83, 'Time Campeão — 2º Camp.',      NULL, 'etiqueta',    'comum',    10, 1),
(84, 'Jogador Campeão 6 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 2),
(85, 'Jogador Campeão 1 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 3),
(86, 'Jogador Campeão 2 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 4),
(87, 'Jogador Campeão 3 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 5),
(88, 'Jogador Campeão 4 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 6),
(89, 'Jogador Campeão 5 — 2º Camp.', NULL, 'etiqueta',    'comum',    10, 7),
(90, 'Artilheiro do 2º Campeonato', NULL, 'estatistica', 'lendaria', 10, 8),
(91, 'Armador do 2º Campeonato',    NULL, 'estatistica', 'lendaria', 10, 9),
(92, 'MVP do 2º Campeonato',        NULL, 'estatistica', 'lendaria', 10, 10);
