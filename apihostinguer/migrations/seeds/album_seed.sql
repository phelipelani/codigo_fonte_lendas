-- ================================================================
-- SEED — Album de Figurinhas (DADOS COMPLETOS)
-- ================================================================
-- Roda DEPOIS das migrations 003, 004, 005 e 006.
-- Popula 16 paginas + 199 figurinhas placeholder (sem imagem real).
-- As imagens reais serao cadastradas pela tela de admin depois.
--
-- Para limpar e repopular (banco DEV):
--   SET FOREIGN_KEY_CHECKS=0;
--   TRUNCATE album_inventario; TRUNCATE album_pacote_figurinhas;
--   TRUNCATE album_pacotes; TRUNCATE album_trocas;
--   TRUNCATE album_figurinhas; TRUNCATE album_paginas;
--   SET FOREIGN_KEY_CHECKS=1;
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
(10, 'elenco',        'ELENCOS QUE DISPUTARAM', 'A 1ª EDIÇÃO', '#A855F7', NULL, NULL, NULL),
(11, 'campeonato',    '2º CAMPEONATO', 'PONTOS CORRIDOS', '#EC4899', 'SÃO PAULANDO', '12 de novembro de 2025 · 2 meses',
 'O primeiro camp deixou gosto de quero mais. Então a galera foi além, trouxe ideias, sugeriu regras, ajudou a construir. Novos capitães, sistema de rebaixamento, um período maior de campeonato. Mais tempo pra se entrosar. Mais tempo pra derreter também.\n\nE dessa vez, ninguém imaginou que tudo ficaria pra ser decidido na última rodada.\n\nShaktar com 44 pontos. São Paulando com 40. No confronto direto, último minuto, Wilian encontrou Gabriel Ferreira e a bola entrou. Vitória do São Paulando — que teria mais um jogo, só precisava de um empate e levantava o caneco.\n\nAí veio a jogada que ninguém esperava: o Shaktar, fora da briga pelo título, cedeu jogadores pro Vasco enfrentar o São Paulando. A ideia? Ajudar o adversário a tropeçar.\n\nA ironia ficou registrada pra sempre: o Shaktar ajudou o rival e perdeu o título assim mesmo — Mike perdeu um gol feito, dando a vitória ao São Paulando.\n\nCampeão: São Paulando. De virada, na raça, e com um roteiro que só o Fut Lendas escreve.'),
(12, 'elenco',        'ELENCOS QUE DISPUTARAM', 'A 2ª EDIÇÃO', '#EC4899', NULL, NULL, NULL),
(13, 'campeonato',    '3º CAMPEONATO', 'SÃO PAULANDO BI', '#EC4899', 'BI-CAMPEÃO|A LANIPULAÇÃO', '10 de fevereiro de 2026 · 2 meses',
 'Depois de um período de "férias" da competitividade, estava na hora de voltar. Com novidades: Michel e Rafael pagaram o preço do rebaixamento, renovação no elenco, e uma surpresa bem-vinda — a volta da família Castilho.\n\nO draft trouxe um detalhe que animou todo mundo: cada time tinha seus irmãos. O Real Madruga com Iago e Andrei, o São Paulando com Caio e Gabriel Ferreira, o Inter dos Molão com Higor e Dieguinho, e o Shaktar dos Leks com a dupla mais inseparável do Fut Lendas — Alan e Wagner.\n\nNas primeiras rodadas, o São Paulando foi avassalador. Abriu mais de 16 pontos de vantagem e o bi parecia passeio. Mas a arrogância precede a queda — e o campeonato virou.\n\nChegamos na última rodada com o Shaktar na liderança e o Real Madruga comendo pelas beiradas. E foi aí que aconteceu talvez a maior LANIPULAÇÃO já vista no Fut Lendas. A regra de igualar jogos na última rodada obrigou o Shaktar a disputar apenas 3 partidas, enquanto o SP jogava 6 e o Real Madruga 7. Com apenas 4 pontos de vantagem, segurar o título dependia do tropeço dos adversários — que não veio.\n\nO São Paulando voltou aos trilhos. Das seis partidas, ganhou quatro e empatou duas. Bi-campeão.\n\nO Real Madruga chegou a se igualar em pontos com o Shaktar, mas o critério de desempate foi impiedoso — terceiro lugar e rebaixamento pro capitão Victor. Já o Inter dos Molão... tava molão mesmo. Mas o capitão soube sair pela porta certa: morreu como herói, eternizado como o Pé de Rato do time.'),
(14, 'elenco',        'ELENCOS QUE DISPUTARAM', 'A 3ª EDIÇÃO', '#EC4899', NULL, NULL, NULL),
(15, 'escudos',       'ESCUDOS DOS TIMES', NULL, '#FFFFFF', NULL, NULL,
 'FutLendas também fez sua primeira partida no fut onze.[[DIR]]Onde o projeto Lendas virou o berço do maior time do mundo — e há quem diga que é o Mário de Caraguatatuba. ooooooowwwwww 1, 2, 3 Caraguás!'),
(16, 'agradecimento', 'OBRIGADO', 'POR FAZER PARTE', '#FFC400', NULL, NULL,
 'Cada figurinha deste álbum é uma memória. Obrigado por construir essa história com a gente.');

-- ---------- FIGURINHAS — Pagina 3 "A Rede que Cresceu" (34) ----------
INSERT INTO album_figurinhas (numero, nome, `time`, categoria, raridade, pagina_id, slot) VALUES
(1,  'Lani',          'FutLendas', 'jogador', 'comum',    3, 1),
(2,  'Xan',           'FutLendas', 'jogador', 'lendaria', 3, 2),
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
(17, 'Alex',          'FutLendas', 'jogador', 'lendaria', 3, 17),
(18, 'Gogo',          'FutLendas', 'jogador', 'lendaria', 3, 18),
(19, 'Iago',          'FutLendas', 'jogador', 'comum',    3, 19),
(20, 'Diego Borges',  'FutLendas', 'jogador', 'comum',    3, 20),
(21, 'Leandro',       'FutLendas', 'jogador', 'comum',    3, 21),
(22, 'Mauricio',      'FutLendas', 'jogador', 'comum',    3, 22),
(23, 'André Borges',  'FutLendas', 'jogador', 'comum',    3, 23),
(24, 'Michel',        'FutLendas', 'jogador', 'comum',    3, 24),
(25, 'Zé',            'FutLendas', 'jogador', 'comum',    3, 25),
(26, 'Rafael',        'FutLendas', 'jogador', 'comum',    3, 26),
(27, 'Guedes',        'FutLendas', 'jogador', 'comum',    3, 27),
(28, 'Bora',          'FutLendas', 'jogador', 'lendaria', 3, 28),
(29, 'G. Santana',    'FutLendas', 'jogador', 'comum',    3, 29),
(30, 'Maranhão',      'FutLendas', 'jogador', 'comum',    3, 30),
(31, 'Neco',          'FutLendas', 'jogador', 'comum',    3, 31),
(32, 'Caio',          'FutLendas', 'jogador', 'comum',    3, 32),
(33, 'Bigode',        'FutLendas', 'jogador', 'comum',    3, 33),
(34, 'Luis',          'FutLendas', 'jogador', 'comum',    3, 34),
-- Pagina 4 "Os Numeros da Lenda" — 4 figurinhas de estatistica (lendarias)
(35, 'Rachas e Partidas',     NULL, 'estatistica', 'lendaria', 4, 1),
(36, 'Total de Gols',         NULL, 'estatistica', 'lendaria', 4, 2),
(37, 'Emblemático Time Azul', NULL, 'estatistica', 'lendaria', 4, 3),
(38, 'Total de Assistências', NULL, 'estatistica', 'lendaria', 4, 4),
-- Pagina 5 — foto em 2x2 (4 figurinhas raras que se juntam)
(202, 'Campeonatos — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 5, 1),
(203, 'Campeonatos — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 5, 2),
(204, 'Campeonatos — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 5, 3),
(205, 'Campeonatos — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 5, 4),
-- Pagina 6 "1a Copa Fut Lendas" — foto time campeao (2x2 rara) + 5 jogadores + chaveamento (2 partes)
(206, 'Time Campeão — 1ª Copa — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 6, 1),
(207, 'Time Campeão — 1ª Copa — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 6, 2),
(208, 'Time Campeão — 1ª Copa — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 6, 3),
(209, 'Time Campeão — 1ª Copa — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 6, 4),
(48, 'Jogador Campeão 1 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 5),
(49, 'Jogador Campeão 2 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 6),
(50, 'Jogador Campeão 3 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 7),
(51, 'Jogador Campeão 4 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 8),
(52, 'Jogador Campeão 5 — 1ª Copa', NULL, 'etiqueta', 'comum', 6, 9),
(53, 'Chaveamento 1ª Copa — parte 1', NULL, 'etiqueta', 'comum', 6, 10),
(54, 'Chaveamento 1ª Copa — parte 2', NULL, 'etiqueta', 'comum', 6, 11),
-- Pagina 7 "2a Copa Fut Lendas"
(210, 'Time Campeão — 2ª Copa — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 7, 1),
(211, 'Time Campeão — 2ª Copa — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 7, 2),
(212, 'Time Campeão — 2ª Copa — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 7, 3),
(213, 'Time Campeão — 2ª Copa — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 7, 4),
(57, 'Jogador Campeão 1 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 5),
(58, 'Jogador Campeão 2 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 6),
(59, 'Jogador Campeão 3 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 7),
(60, 'Jogador Campeão 4 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 8),
(61, 'Jogador Campeão 5 — 2ª Copa', NULL, 'etiqueta', 'comum', 7, 9),
(62, 'Chaveamento 2ª Copa — parte 1', NULL, 'etiqueta', 'comum', 7, 10),
(63, 'Chaveamento 2ª Copa — parte 2', NULL, 'etiqueta', 'comum', 7, 11),
-- Pagina 8 "3a Copa Fut Lendas" — 6 jogadores (meta_json define)
(214, 'Time Campeão — 3ª Copa — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 8, 1),
(215, 'Time Campeão — 3ª Copa — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 8, 2),
(216, 'Time Campeão — 3ª Copa — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 8, 3),
(217, 'Time Campeão — 3ª Copa — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 8, 4),
(66, 'Jogador Campeão 1 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 5),
(67, 'Jogador Campeão 2 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 6),
(68, 'Jogador Campeão 3 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 7),
(69, 'Jogador Campeão 4 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 8),
(70, 'Jogador Campeão 5 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 9),
(232, 'Jogador Campeão 6 — 3ª Copa', NULL, 'etiqueta', 'comum', 8, 10),
(71, 'Chaveamento 3ª Copa — parte 1', NULL, 'etiqueta', 'comum', 8, 11),
(72, 'Chaveamento 3ª Copa — parte 2', NULL, 'etiqueta', 'comum', 8, 12),
-- Pagina 9 "1o Campeonato Pontos Corridos" — foto campeao em 4 partes (raras)
(218, 'Campeão 1º Campeonato — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 9, 1),
(219, 'Campeão 1º Campeonato — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 9, 2),
(220, 'Campeão 1º Campeonato — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 9, 3),
(221, 'Campeão 1º Campeonato — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 9, 4),
-- Pagina 11 "2o Campeonato Pontos Corridos" — foto campeao em 4 partes (raras)
(222, 'Campeão 2º Campeonato — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 11, 1),
(223, 'Campeão 2º Campeonato — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 11, 2),
(224, 'Campeão 2º Campeonato — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 11, 3),
(225, 'Campeão 2º Campeonato — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 11, 4),
-- Pagina 13 "3o Campeonato Sao Paulando Bi" — foto campeao em 4 partes (raras)
(226, 'Campeão 3º Campeonato — parte 1 (sup. esq.)', NULL, 'foto', 'rara', 13, 1),
(227, 'Campeão 3º Campeonato — parte 2 (sup. dir.)', NULL, 'foto', 'rara', 13, 2),
(228, 'Campeão 3º Campeonato — parte 3 (inf. esq.)', NULL, 'foto', 'rara', 13, 3),
(229, 'Campeão 3º Campeonato — parte 4 (inf. dir.)', NULL, 'foto', 'rara', 13, 4),
-- Pagina 15 "Escudos dos Times" (pagina_id=15) — 9 escudos lendarios + 4 fotos
(103, 'Escudo — Não-tê-escolhi FC',         NULL, 'escudo',   'lendaria', 15, 1),
(104, 'Escudo — VS',                        NULL, 'escudo',   'lendaria', 15, 2),
(105, 'Escudo — PSV',                       NULL, 'escudo',   'lendaria', 15, 3),
(106, 'Escudo — FutLendas Vasco da Gama',   NULL, 'escudo',   'lendaria', 15, 4),
(107, 'Escudo — São Paulando',              NULL, 'escudo',   'lendaria', 15, 5),
(108, 'Escudo — Shaktar dos Leks',          NULL, 'escudo',   'lendaria', 15, 6),
(109, 'Escudo — Real Madruga',              NULL, 'escudo',   'lendaria', 15, 7),
(110, 'Escudo — Inter dos Molão',           NULL, 'escudo',   'lendaria', 15, 8),
(111, 'Escudo — Caraguás',                  NULL, 'escudo',   'lendaria', 15, 9),
(112, 'Primeira partida no Fut Onze — parte 1', NULL, 'etiqueta', 'comum', 15, 10),
(113, 'Primeira partida no Fut Onze — parte 2', NULL, 'etiqueta', 'comum', 15, 11),
(114, 'Caraguatatuba — parte 1',            NULL, 'etiqueta', 'comum', 15, 12),
(115, 'Caraguatatuba — parte 2',            NULL, 'etiqueta', 'comum', 15, 13),
-- ===============================================================
-- Pagina 10 "Elenco 1o Campeonato" (pagina_id=10) — 4 times x 7 figs = 28
-- Por time: Logo (lendaria) + Capitao (lendaria) + Jog 2-6 (comum)
-- ===============================================================
(116, 'Logo Time A — 1º Camp.',     NULL, 'escudo',  'rara',     10, 1),
(117, 'Capitão Time A — 1º Camp.',  NULL, 'jogador', 'rara',     10, 2),
(118, 'Jogador 2 Time A — 1º Camp.', NULL, 'jogador', 'comum',   10, 3),
(119, 'Jogador 3 Time A — 1º Camp.', NULL, 'jogador', 'comum',   10, 4),
(120, 'Jogador 4 Time A — 1º Camp.', NULL, 'jogador', 'comum',   10, 5),
(121, 'Jogador 5 Time A — 1º Camp.', NULL, 'jogador', 'comum',   10, 6),
(122, 'Jogador 6 Time A — 1º Camp.', NULL, 'jogador', 'comum',   10, 7),
(123, 'Logo Time B — 1º Camp.',     NULL, 'escudo',  'rara',     10, 8),
(124, 'Capitão Time B — 1º Camp.',  NULL, 'jogador', 'rara',     10, 9),
(125, 'Jogador 2 Time B — 1º Camp.', NULL, 'jogador', 'comum',   10, 10),
(126, 'Jogador 3 Time B — 1º Camp.', NULL, 'jogador', 'comum',   10, 11),
(127, 'Jogador 4 Time B — 1º Camp.', NULL, 'jogador', 'comum',   10, 12),
(128, 'Jogador 5 Time B — 1º Camp.', NULL, 'jogador', 'comum',   10, 13),
(129, 'Jogador 6 Time B — 1º Camp.', NULL, 'jogador', 'comum',   10, 14),
(130, 'Logo Time C — 1º Camp.',     NULL, 'escudo',  'rara',     10, 15),
(131, 'Capitão Time C — 1º Camp.',  NULL, 'jogador', 'rara',     10, 16),
(132, 'Jogador 2 Time C — 1º Camp.', NULL, 'jogador', 'comum',   10, 17),
(133, 'Jogador 3 Time C — 1º Camp.', NULL, 'jogador', 'comum',   10, 18),
(134, 'Jogador 4 Time C — 1º Camp.', NULL, 'jogador', 'comum',   10, 19),
(135, 'Jogador 5 Time C — 1º Camp.', NULL, 'jogador', 'comum',   10, 20),
(136, 'Jogador 6 Time C — 1º Camp.', NULL, 'jogador', 'comum',   10, 21),
(137, 'Logo Time D — 1º Camp.',     NULL, 'escudo',  'rara',     10, 22),
(138, 'Capitão Time D — 1º Camp.',  NULL, 'jogador', 'rara',     10, 23),
(139, 'Jogador 2 Time D — 1º Camp.', NULL, 'jogador', 'comum',   10, 24),
(140, 'Jogador 3 Time D — 1º Camp.', NULL, 'jogador', 'comum',   10, 25),
(141, 'Jogador 4 Time D — 1º Camp.', NULL, 'jogador', 'comum',   10, 26),
(142, 'Jogador 5 Time D — 1º Camp.', NULL, 'jogador', 'comum',   10, 27),
(143, 'Jogador 6 Time D — 1º Camp.', NULL, 'jogador', 'comum',   10, 28),
-- ===============================================================
-- Pagina 12 "Elenco 2o Campeonato" (pagina_id=12) — 28 figs
-- ===============================================================
(144, 'Logo Time A — 2º Camp.',     NULL, 'escudo',  'rara',     12, 1),
(145, 'Capitão Time A — 2º Camp.',  NULL, 'jogador', 'rara',     12, 2),
(146, 'Jogador 2 Time A — 2º Camp.', NULL, 'jogador', 'comum',   12, 3),
(147, 'Jogador 3 Time A — 2º Camp.', NULL, 'jogador', 'comum',   12, 4),
(148, 'Jogador 4 Time A — 2º Camp.', NULL, 'jogador', 'comum',   12, 5),
(149, 'Jogador 5 Time A — 2º Camp.', NULL, 'jogador', 'comum',   12, 6),
(150, 'Jogador 6 Time A — 2º Camp.', NULL, 'jogador', 'comum',   12, 7),
(151, 'Logo Time B — 2º Camp.',     NULL, 'escudo',  'rara',     12, 8),
(152, 'Capitão Time B — 2º Camp.',  NULL, 'jogador', 'rara',     12, 9),
(153, 'Jogador 2 Time B — 2º Camp.', NULL, 'jogador', 'comum',   12, 10),
(154, 'Jogador 3 Time B — 2º Camp.', NULL, 'jogador', 'comum',   12, 11),
(155, 'Jogador 4 Time B — 2º Camp.', NULL, 'jogador', 'comum',   12, 12),
(156, 'Jogador 5 Time B — 2º Camp.', NULL, 'jogador', 'comum',   12, 13),
(157, 'Jogador 6 Time B — 2º Camp.', NULL, 'jogador', 'comum',   12, 14),
(158, 'Logo Time C — 2º Camp.',     NULL, 'escudo',  'rara',     12, 15),
(159, 'Capitão Time C — 2º Camp.',  NULL, 'jogador', 'rara',     12, 16),
(160, 'Jogador 2 Time C — 2º Camp.', NULL, 'jogador', 'comum',   12, 17),
(161, 'Jogador 3 Time C — 2º Camp.', NULL, 'jogador', 'comum',   12, 18),
(162, 'Jogador 4 Time C — 2º Camp.', NULL, 'jogador', 'comum',   12, 19),
(163, 'Jogador 5 Time C — 2º Camp.', NULL, 'jogador', 'comum',   12, 20),
(164, 'Jogador 6 Time C — 2º Camp.', NULL, 'jogador', 'comum',   12, 21),
(165, 'Logo Time D — 2º Camp.',     NULL, 'escudo',  'rara',     12, 22),
(166, 'Capitão Time D — 2º Camp.',  NULL, 'jogador', 'rara',     12, 23),
(167, 'Jogador 2 Time D — 2º Camp.', NULL, 'jogador', 'comum',   12, 24),
(168, 'Jogador 3 Time D — 2º Camp.', NULL, 'jogador', 'comum',   12, 25),
(169, 'Jogador 4 Time D — 2º Camp.', NULL, 'jogador', 'comum',   12, 26),
(170, 'Jogador 5 Time D — 2º Camp.', NULL, 'jogador', 'comum',   12, 27),
(171, 'Jogador 6 Time D — 2º Camp.', NULL, 'jogador', 'comum',   12, 28),
-- ===============================================================
-- Pagina 14 "Elenco 3o Campeonato" (pagina_id=14) — 30 figs
-- Times A e C tem 8 figs (6 jogadores); times B e D tem 7 figs (5 jogadores).
-- ===============================================================
(172, 'Logo Inter dos Molão',      NULL, 'escudo',  'rara',  14, 1),
(173, 'Capitão Inter dos Molão',   NULL, 'jogador', 'rara',  14, 2),
(174, 'Jogador 2 Inter dos Molão', NULL, 'jogador', 'comum', 14, 3),
(175, 'Jogador 3 Inter dos Molão', NULL, 'jogador', 'comum', 14, 4),
(176, 'Jogador 4 Inter dos Molão', NULL, 'jogador', 'comum', 14, 5),
(177, 'Jogador 5 Inter dos Molão', NULL, 'jogador', 'comum', 14, 6),
(178, 'Jogador 6 Inter dos Molão', NULL, 'jogador', 'comum', 14, 7),
(230, 'Jogador 7 Inter dos Molão', NULL, 'jogador', 'comum', 14, 8),
(179, 'Logo Shaktar dos Leks',      NULL, 'escudo',  'rara',  14, 9),
(180, 'Capitão Shaktar dos Leks',   NULL, 'jogador', 'rara',  14, 10),
(181, 'Jogador 2 Shaktar dos Leks', NULL, 'jogador', 'comum', 14, 11),
(182, 'Jogador 3 Shaktar dos Leks', NULL, 'jogador', 'comum', 14, 12),
(183, 'Jogador 4 Shaktar dos Leks', NULL, 'jogador', 'comum', 14, 13),
(184, 'Jogador 5 Shaktar dos Leks', NULL, 'jogador', 'comum', 14, 14),
(185, 'Jogador 6 Shaktar dos Leks', NULL, 'jogador', 'comum', 14, 15),
(186, 'Logo Real Madruga',      NULL, 'escudo',  'rara',  14, 16),
(187, 'Capitão Real Madruga',   NULL, 'jogador', 'rara',  14, 17),
(188, 'Jogador 2 Real Madruga', NULL, 'jogador', 'comum', 14, 18),
(189, 'Jogador 3 Real Madruga', NULL, 'jogador', 'comum', 14, 19),
(190, 'Jogador 4 Real Madruga', NULL, 'jogador', 'comum', 14, 20),
(191, 'Jogador 5 Real Madruga', NULL, 'jogador', 'comum', 14, 21),
(192, 'Jogador 6 Real Madruga', NULL, 'jogador', 'comum', 14, 22),
(231, 'Jogador 7 Real Madruga', NULL, 'jogador', 'comum', 14, 23),
(193, 'Logo São Paulando',      NULL, 'escudo',  'rara',  14, 24),
(194, 'Capitão São Paulando',   NULL, 'jogador', 'rara',  14, 25),
(195, 'Jogador 2 São Paulando', NULL, 'jogador', 'comum', 14, 26),
(196, 'Jogador 3 São Paulando', NULL, 'jogador', 'comum', 14, 27),
(197, 'Jogador 4 São Paulando', NULL, 'jogador', 'comum', 14, 28),
(198, 'Jogador 5 São Paulando', NULL, 'jogador', 'comum', 14, 29),
(199, 'Jogador 6 São Paulando', NULL, 'jogador', 'comum', 14, 30);

-- ===============================================================
-- Pagina 2 "O Comeco de Tudo" — 2 figurinhas da foto dos fundadores
-- (parte 1 + parte 2 = juntas formam uma foto sem separador)
-- ===============================================================
INSERT INTO album_figurinhas (numero, nome, `time`, categoria, raridade, pagina_id, slot) VALUES
(200, 'Os Fundadores — parte 1', NULL, 'foto', 'rara', 2, 1),
(201, 'Os Fundadores — parte 2', NULL, 'foto', 'rara', 2, 2);

-- ===============================================================
-- Nomes e cores dos times nas paginas de Elenco (via meta_json)
-- ===============================================================
UPDATE album_paginas SET meta_json = JSON_OBJECT('jogadores', 6) WHERE id = 8;

UPDATE album_paginas SET meta_json = JSON_OBJECT(
  'times', JSON_ARRAY(
    JSON_OBJECT('nome', 'Não te escolhi FC', 'cor', '#FFC400'),
    JSON_OBJECT('nome', 'Vasco',              'cor', '#FFFFFF'),
    JSON_OBJECT('nome', 'Meninos de Vó',     'cor', '#38BDF8'),
    JSON_OBJECT('nome', 'Peguei sua Vó',     'cor', '#EC4899')
  )
) WHERE id = 10;

UPDATE album_paginas SET meta_json = JSON_OBJECT(
  'times', JSON_ARRAY(
    JSON_OBJECT('nome', 'Shaktar dos Leks', 'cor', '#FFC400'),
    JSON_OBJECT('nome', 'Vasco',             'cor', '#FFFFFF'),
    JSON_OBJECT('nome', 'São Paulando',     'cor', '#38BDF8'),
    JSON_OBJECT('nome', 'Meninos de Vó',    'cor', '#EC4899')
  )
) WHERE id = 12;

UPDATE album_paginas SET meta_json = JSON_OBJECT(
  'times', JSON_ARRAY(
    JSON_OBJECT('nome', 'Inter dos Molão',   'cor', '#FFC400', 'jogadores', 6),
    JSON_OBJECT('nome', 'Shaktar dos Leks', 'cor', '#FFFFFF', 'jogadores', 5),
    JSON_OBJECT('nome', 'Real Madruga',      'cor', '#38BDF8', 'jogadores', 6),
    JSON_OBJECT('nome', 'São Paulando',      'cor', '#EC4899', 'jogadores', 5)
  )
) WHERE id = 14;
