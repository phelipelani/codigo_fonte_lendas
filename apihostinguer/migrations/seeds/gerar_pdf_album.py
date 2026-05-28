# -*- coding: utf-8 -*-
"""
Gera o PDF da VERSAO FISICA do Album de Figurinhas FutLendas.
- Sem sumario: comeca direto na capa.
- Cada pagina traz os ESPACOS demarcados para colar as figurinhas.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle

# ---- Paleta FutLendas ----
FUNDO   = HexColor("#0d1f35")
OURO    = HexColor("#FFC400")
CIANO   = HexColor("#22d3ee")
BRANCO  = HexColor("#FFFFFF")
CINZA   = HexColor("#9fb4cc")
SLOT    = HexColor("#3f5f86")
SLOTTXT = HexColor("#7f95ad")

# =================================================================
# CONTEUDO DAS 13 PAGINAS
# =================================================================
PAGINAS = [
    dict(numero=1, tipo="capa", titulo="FUT LENDAS", subtitulo="COLECAO COMPLETA",
         cor="#FFC400", tag=None, data=None, texto=None),
    dict(numero=2, tipo="narrativa", titulo="O COMECO", subtitulo="DE TUDO",
         cor="#00C46A", tag="A ORIGEM", data="09 de agosto de 2022",
         texto=(
"Em 09 de agosto de 2022, um grupo de amigos teve uma ideia simples: juntar a galera e jogar bola. "
"Parece facil - nao foi. Para fechar um racha decente voce precisa de pelo menos 15 pessoas.\n\n"
"Engracado, porque dava para contar nos dedos quem jogava bola: Higor, Dieguinho, Xan, Lani, Ronay, "
"Alan, Tiago, Digo, Wagner. Sabiamos que dava nove pessoas. No desespero, comeca a ventilar nomes. "
"Afranio, que com uma mensagem ja informou que levaria talvez o cara mais resenha, mais ruim e mais "
"amado do racha, nosso querido Apolo. O Gabriel Ferreira era nossa duvida, mas fazia parte dos planos.\n\n"
"De nove passamos para onze. Ainda faltava quatro. Digo entao falou: vou chamar o Joao, que trouxe "
"seus funcionarios todos rsrs.\n\n"
"O pontape foi dado. Arena Caicara ia ser o palco.")),
    dict(numero=3, tipo="rede", titulo="A REDE QUE CRESCEU", subtitulo="2022-2024",
         cor="#FFFFFF", tag=None, data=None,
         texto="Precisamos crescer, precisavamos de mais gente foi quando comecou os convites. Entao comeca a rede."),
    dict(numero=4, tipo="numeros", titulo="OS NUMEROS", subtitulo="DA LENDA",
         cor="#FFC400", tag="ESTATISTICAS - RECORDES - FOLCLORE", data=None,
         texto=(
"Toda Lenda vira lenda por um motivo - e o motivo so fica claro quando e contado e documentado.\n\n"
"Na era do Fut 5, comecamos a anotar o legado de nossos jogadores, escrevendo seus capitulos, suas "
"partidas, seus lances, seus numeros.\n\n"
"No Fut 5 foram mais de 1656 partidas anotadas, mais de 685 gols registrados e mais de 472 assistencias.\n\n"
"A primeira partida do Fut 5 anotada foi em 11/06/2024. A ultima, em 06/05/2025.\n\n"
"O Fut 5 nos proporcionou muitas historias, muitos lances e gols, alem de duas copas com momentos historicos.")),
    dict(numero=5, tipo="narrativa", titulo="Por que comecamos os campeonatos?", subtitulo=None,
         cor="#FFFFFF", tag=None, data=None,
         texto=(
"Porque racha todo mundo faz. A gente queria mais.\n\n"
"Tinha algo que a gente sentia toda terca, aquela vontade de ganhar, aquela faisca no olhar quando a "
"bola entrava.\n\n"
"Foi ai que surgiu a ideia. E no dia 17 de dezembro de 2024, o que era pra ser so \"o ultimo racha do "
"ano\" virou historia. A gente queria fechar 2024 com chave de ouro e fechou. Com direito a emocao, "
"gritaria, e aquela sensacao que so quem estava la entende.\n"
"A partir dai ficou claro: isso precisava continuar.\n\n"
"Cada campeonato, cada copa que veio depois mostrou que a decisao foi certa.\n\n"
"Porque quando a competicao comeca, as Lendas se transformam.\n\n"
"O amigo vira adversario, o adversario vira inimigo, o inimigo abraca depois do jogo - todo mundo "
"volta na semana seguinte querendo mais. Ja rolou discussao, ja rolou aquela \"palavrinha\" no calor "
"da hora, ja rolou aquele olhar de \"isso nao ta acabado nao\"... mas no fim, e exatamente isso que "
"faz a diferenca entre um racha e um campeonato de verdade.\n\n"
"A competicao revelou lados que o racha nunca mostraria. Revelou lideres, revelou guerreiros, revelou "
"aquele cara que ninguem apostava - e que na hora H apareceu.\n\n"
"E por isso que a gente compete. Nao so pra ganhar. Mas pra sentir.")),
    dict(numero=6, tipo="copa", titulo="1a COPA", subtitulo="FUT LENDAS",
         cor="#FFC400", tag="BRACKET - 4 TIMES", data="17 de dezembro de 2024",
         texto=(
"## A HUMILHACAO NA FASE DE GRUPOS\n"
"O Time Amarelo nao venceu um unico jogo na fase de grupos. Terminou em ultimo lugar, zoado por todo "
"mundo como \"o time dos dois pes de rato.\" Chegaram ao mata-mata pela matematica, nao pelo merito - "
"e todo mundo sabia disso.\n\n"
"## SEMIFINAL - A RESSURREICAO\n"
"3 a 0 em 3 minutos. Dois gols do Lani com passe do Apolo. O Preto acordou, buscou 2 a 3 e ainda "
"tinha 5 minutos. A quadra inteira esperava o empate. O Amarelo se fechou e segurou.\n"
"[[PILL]] De 0 a 3 em 3 minutos - ninguem acreditou\n\n"
"## O PENALTI DO MARCELO\n"
"Do outro lado, Azul e Rosa foram para os penaltis. O Azul colocou Marcelo - pe de enchada - para "
"bater o primeiro. Ele perdeu. Rosa foi direto para a final.\n"
"[[PILL]] O penalti mais famoso da historia do Fut Lendas\n\n"
"## A FINAL - O IMPOSSIVEL ACONTECE\n"
"O Rosa havia goleado o Amarelo por 4 a 1 na fase de grupos. A taca era deles, todo mundo sabia. So "
"que futebol nao se joga no papel. O Amarelo nao tomou conhecimento. Atacou. Controlou. 3 a 1.\n"
"[[DESTAQUE]] O ultimo seria o primeiro. Da lanterna ao titulo inaugural da historia.")),
    dict(numero=7, tipo="copa", titulo="2a COPA", subtitulo="FUT LENDAS",
         cor="#FFC400", tag="BRACKET - 5 TIMES", data="08 de junho de 2025",
         texto=(
"## DOMINANCIA TOTAL NA FASE DE GRUPOS\n"
"O Time Preto atropelou, humilhou, dominou. O placar mais emblematico: 5 a 0 no Rosa - time que "
"tinha Lani e Andre. O Time Branco foi o primeiro eliminado de uma Copa com 5 times.\n\n"
"## A FINAL - NERVOS E O MOMENTO DE HIGOR\n"
"Empate no tempo normal. Penaltis. Higor salvou em cima da linha - um daqueles momentos que ficam "
"na memoria. Na ultima cobranca, Diego B. perdeu. Time Preto campeao.\n"
"[[PILL]] Higor salva em cima da linha - o momento da Copa\n"
"[[PILL]] Tiago - primeiro Bi-campeao da historia")),
    dict(numero=8, tipo="copa", titulo="3a COPA", subtitulo="FUT LENDAS",
         cor="#FFC400", tag="ARBITRO SUSPEITO", data="08 de agosto de 2025",
         texto=(
"## O GOL AOS 09:55\n"
"1 a 1. Faltavam 5 segundos. Rafael toca para Lani. Lani de costas faz o pivo. Encaixa para Andre "
"que vinha de frente. GOL DO TITULO. O cronometro marcava 9:55 - e o jogo deveria acabar aos 10 "
"minutos.\n"
"[[DESTAQUE]] 9:55. Rafael toca. Lani gira. Andre finaliza. Gol. O titulo estava feito com 5 "
"segundos de sobra.\n\n"
"## O ARBITRO SUSPEITO\n"
"O arbitro daquele jogo era Higor - irmao do Dieguinho, jogador do Time Rosa. O apito nao veio aos "
"10 minutos. O jogo continuou por mais 1 minuto inteiro. O gol nao saiu. O Amarelo segurou.\n"
"[[PILL]] Higor apitou o jogo do proprio irmao\n"
"[[PILL]] Lani e Rafael igualam Tiago com 2 titulos de Copa")),
    dict(numero=9, tipo="campeonato", titulo="1o CAMPEONATO", subtitulo="PONTOS CORRIDOS",
         cor="#A855F7", tag="CAMPEAO: VASCO", data="22 de outubro de 2025 - 1 mes",
         texto=(
"A ideia ja vinha ventilando faz tempo. Precisava amadurecer, precisava do momento certo.\n"
"Entao veio a decisao: vamos fazer o teste.\n\n"
"E a emocao nao esperou a bola rolar, ja comecou no draft. O Gambito dos Capitaes: quais Lendas "
"escolher? Como montar o time? Como pensar na estrategia sem entregar o jogo antes de comecar?\n\n"
"Campeonato rolando, cada rodada contava. Os times foram se entrosando, evoluindo ou derretendo sob "
"pressao. Um formato mais competitivo, mais disputado, que forcava cada Lenda a dar um passo alem do "
"racha de sempre. E claro, o primeiro camp nao podia ser sem polemica.\n\n"
"Jogo entre PSV contra Vasco, PSV com 33 pontos, Vasco com 31. O PSV precisava de um empate para o "
"titulo. E entao veio a famosa caibra, o lendario gol da rataria, e no fim... titulo pro Vascao! "
"Coroando uma campanha solida, construida rodada por rodada.\n\n"
"O teste passou. A Copa virou tradicao.")),
    dict(numero=10, tipo="campeonato", titulo="2o CAMPEONATO", subtitulo="PONTOS CORRIDOS",
         cor="#EC4899", tag="SAO PAULANDO", data="12 de novembro de 2025 - 2 meses",
         texto=(
"O primeiro camp deixou gosto de quero mais. Entao a galera foi alem, trouxe ideias, sugeriu regras, "
"ajudou a construir. Novos capitaes, sistema de rebaixamento, um periodo maior de campeonato. Mais "
"tempo pra se entrosar. Mais tempo pra derreter tambem.\n\n"
"E dessa vez, ninguem imaginou que tudo ficaria pra ser decidido na ultima rodada.\n\n"
"Shaktar com 44 pontos. Sao Paulando com 40. No confronto direto, ultimo minuto, Wilian encontrou "
"Gabriel Ferreira e a bola entrou. Vitoria do Sao Paulando - que teria mais um jogo, so precisava de "
"um empate e levantava o caneco.\n\n"
"Ai veio a jogada que ninguem esperava: o Shaktar, fora da briga pelo titulo, cedeu jogadores pro "
"Vasco enfrentar o Sao Paulando. A ideia? Ajudar o adversario a tropecar.\n\n"
"A ironia ficou registrada pra sempre: o Shaktar ajudou o rival e perdeu o titulo assim mesmo - Mike "
"perdeu um gol feito, dando a vitoria ao Sao Paulando.\n\n"
"Campeao: Sao Paulando. De virada, na raca, e com um roteiro que so o Fut Lendas escreve.")),
    dict(numero=11, tipo="campeonato", titulo="3o CAMPEONATO", subtitulo="SAO PAULANDO BI",
         cor="#EC4899", tag="BI-CAMPEAO | A LANIPULACAO", data="10 de fevereiro de 2026 - 2 meses",
         texto=(
"Depois de um periodo de \"ferias\" da competitividade, estava na hora de voltar. Com novidades: "
"Michel e Rafael pagaram o preco do rebaixamento, renovacao no elenco, e uma surpresa bem-vinda - a "
"volta da familia Castilho.\n\n"
"O draft trouxe um detalhe que animou todo mundo: cada time tinha seus irmaos. O Real Madruga com "
"Iago e Andrei, o Sao Paulando com Caio e Gabriel Ferreira, o Inter dos Molao com Higor e Dieguinho, "
"e o Shaktar dos Leks com a dupla mais inseparavel do Fut Lendas - Alan e Wagner.\n\n"
"Nas primeiras rodadas, o Sao Paulando foi avassalador. Abriu mais de 16 pontos de vantagem e o bi "
"parecia passeio. Mas a arrogancia precede a queda - e o campeonato virou.\n\n"
"Chegamos na ultima rodada com o Shaktar na lideranca e o Real Madruga comendo pelas beiradas. E foi "
"ai que aconteceu talvez a maior LANIPULACAO ja vista no Fut Lendas. A regra de igualar jogos na "
"ultima rodada obrigou o Shaktar a disputar apenas 3 partidas, enquanto o SP jogava 6 e o Real "
"Madruga 7. Com apenas 4 pontos de vantagem, segurar o titulo dependia do tropeco dos adversarios - "
"que nao veio.\n\n"
"O Sao Paulando voltou aos trilhos. Das seis partidas, ganhou quatro e empatou duas. Bi-campeao.\n\n"
"O Real Madruga chegou a se igualar em pontos com o Shaktar, mas o criterio de desempate foi "
"impiedoso - terceiro lugar e rebaixamento pro capitao Victor. Ja o Inter dos Molao... tava molao "
"mesmo. Mas o capitao soube sair pela porta certa: morreu como heroi, eternizado como o Pe de Rato "
"do time.")),
    dict(numero=12, tipo="escudos", titulo="ESCUDOS DOS TIMES", subtitulo=None,
         cor="#FFFFFF", tag=None, data=None,
         texto=(
"FutLendas tambem fez sua primeira partida no fut onze.\n\n"
"Onde o projeto Lendas virou o berco do maior time do mundo - e ha quem diga que e o Mario de "
"Caraguatatuba. ooooooowwwwww 1, 2, 3 Caraguas!")),
    dict(numero=13, tipo="agradecimento", titulo="OBRIGADO", subtitulo="POR FAZER PARTE",
         cor="#FFC400", tag=None, data=None,
         texto="Cada figurinha deste album e uma memoria. Obrigado por construir essa historia com a gente."),
]

# =================================================================
# FIGURINHAS por pagina  ->  (numero, nome, lendaria)
# =================================================================
FIGS = {
    3: [
        (1, "Lani", 0), (2, "Xan", 0), (3, "Dieguinho", 0), (4, "Higor", 0),
        (5, "Alan", 0), (6, "Tiago", 0), (7, "Digo", 0), (8, "Wagner", 0),
        (9, "Apolo", 1), (10, "Afranio", 0), (11, "Ronay", 0), (12, "G. Ferreira", 0),
        (13, "Andrei", 0), (14, "Diones", 0), (15, "Victor", 0), (16, "Mike", 0),
        (17, "Alex", 0), (18, "Gogo", 0), (19, "Iago", 0), (20, "Diego Borges", 0),
        (21, "Leandro", 0), (22, "Mauricio", 0), (23, "Andre Borges", 0), (24, "Michel", 0),
        (25, "Ze", 0), (26, "Rafael", 0), (27, "Guedes", 0), (28, "Bora", 0),
        (29, "G. Santana", 0), (30, "Maranhao", 0), (31, "Neco", 0), (32, "Caio", 0),
        (33, "Bigode", 0), (34, "Luis", 0),
    ],
    4: [
        (35, "Total de Gols", 1), (36, "Total de Assistencias", 1), (37, "Total de Jogos", 1),
        (38, "Maior Artilheiro", 1), (39, "Maior Assistente", 1), (40, "Maior MVP", 1),
        (41, "Maior Pe de Rato", 1), (42, "Maior Vencedor", 1), (43, "Maior Perdedor", 1),
    ],
    5: [
        (44, "Campeonatos - parte 1", 0), (45, "Campeonatos - parte 2", 0),
    ],
    6: [
        (46, "Time Campeao", 0), (47, "Trofeu", 0),
        (48, "Jogador Campeao 1", 0), (49, "Jogador Campeao 2", 0), (50, "Jogador Campeao 3", 0),
        (51, "Jogador Campeao 4", 0), (52, "Jogador Campeao 5", 0),
        (53, "Chaveamento - parte 1", 0), (54, "Chaveamento - parte 2", 0),
    ],
    7: [
        (55, "Time Campeao", 0), (56, "Trofeu", 0),
        (57, "Jogador Campeao 1", 0), (58, "Jogador Campeao 2", 0), (59, "Jogador Campeao 3", 0),
        (60, "Jogador Campeao 4", 0), (61, "Jogador Campeao 5", 0),
        (62, "Chaveamento - parte 1", 0), (63, "Chaveamento - parte 2", 0),
    ],
    8: [
        (64, "Time Campeao", 0), (65, "Trofeu", 0),
        (66, "Jogador Campeao 1", 0), (67, "Jogador Campeao 2", 0), (68, "Jogador Campeao 3", 0),
        (69, "Jogador Campeao 4", 0), (70, "Jogador Campeao 5", 0),
        (71, "Chaveamento - parte 1", 0), (72, "Chaveamento - parte 2", 0),
    ],
    9: [
        (73, "Time Campeao", 0), (74, "Jogador Campeao 6", 0),
        (75, "Jogador Campeao 1", 0), (76, "Jogador Campeao 2", 0), (77, "Jogador Campeao 3", 0),
        (78, "Jogador Campeao 4", 0), (79, "Jogador Campeao 5", 0),
        (80, "Artilheiro", 1), (81, "Armador", 1), (82, "MVP", 1),
    ],
    10: [
        (83, "Time Campeao", 0), (84, "Jogador Campeao 6", 0),
        (85, "Jogador Campeao 1", 0), (86, "Jogador Campeao 2", 0), (87, "Jogador Campeao 3", 0),
        (88, "Jogador Campeao 4", 0), (89, "Jogador Campeao 5", 0),
        (90, "Artilheiro", 1), (91, "Armador", 1), (92, "MVP", 1),
    ],
    11: [
        (93, "Time Campeao", 0), (94, "Jogador Campeao 6", 0),
        (95, "Jogador Campeao 1", 0), (96, "Jogador Campeao 2", 0), (97, "Jogador Campeao 3", 0),
        (98, "Jogador Campeao 4", 0), (99, "Jogador Campeao 5", 0),
        (100, "Artilheiro", 1), (101, "Armador", 1), (102, "MVP", 1),
    ],
    12: [
        (103, "Escudo - Nao-te-escolhi FC", 1), (104, "Escudo - VS", 1),
        (105, "Escudo - PSV", 1), (106, "Escudo - Vasco da Gama", 1),
        (107, "Escudo - Sao Paulando", 1), (108, "Escudo - Shaktar dos Leks", 1),
        (109, "Escudo - Real Madruga", 1), (110, "Escudo - Inter dos Molao", 1),
        (111, "Escudo - Caraguas", 1),
        (112, "Fut Onze - parte 1", 0), (113, "Fut Onze - parte 2", 0),
        (114, "Caraguatatuba - parte 1", 0), (115, "Caraguatatuba - parte 2", 0),
    ],
}

# =================================================================
# ESTILOS
# =================================================================
st_num = ParagraphStyle("num", fontName="Helvetica-Bold", fontSize=10,
                         textColor=FUNDO, alignment=TA_CENTER)
st_titulo = ParagraphStyle("titulo", fontName="Helvetica-Bold", fontSize=24,
                            textColor=OURO, leading=28, spaceBefore=4, spaceAfter=2)
st_sub = ParagraphStyle("sub", fontName="Helvetica-Bold", fontSize=13,
                         textColor=BRANCO, leading=17, spaceAfter=4)
st_meta = ParagraphStyle("meta", fontName="Helvetica-Oblique", fontSize=9,
                          textColor=CIANO, spaceAfter=2)
st_tag = ParagraphStyle("tag", fontName="Helvetica-Bold", fontSize=8,
                         textColor=OURO, spaceAfter=8)
st_corpo = ParagraphStyle("corpo", fontName="Helvetica", fontSize=10,
                           textColor=BRANCO, leading=14, alignment=TA_JUSTIFY,
                           spaceAfter=6)
st_secao = ParagraphStyle("secao", fontName="Helvetica-Bold", fontSize=11,
                           textColor=OURO, leading=15, spaceBefore=6, spaceAfter=3)
st_pill = ParagraphStyle("pill", fontName="Helvetica-Bold", fontSize=9,
                          textColor=CIANO, leading=13, leftIndent=8, spaceAfter=3)
st_dest = ParagraphStyle("dest", fontName="Helvetica-BoldOblique", fontSize=10,
                          textColor=OURO, leading=14, leftIndent=6, spaceBefore=4,
                          spaceAfter=6)
st_colar = ParagraphStyle("colar", fontName="Helvetica-Bold", fontSize=9,
                           textColor=CIANO, spaceBefore=8, spaceAfter=6)


# =================================================================
# SLOT — espaco demarcado para colar a figurinha
# =================================================================
class SlotFig(Flowable):
    def __init__(self, w, h, numero, nome, lendaria=False):
        super().__init__()
        self.width = w
        self.height = h
        self.numero = numero
        self.nome = nome
        self.lendaria = lendaria

    def _quebrar(self, texto, max_chars):
        palavras = texto.split()
        linhas, atual = [], ""
        for p in palavras:
            if len(atual) + len(p) + 1 <= max_chars:
                atual = (atual + " " + p).strip()
            else:
                if atual:
                    linhas.append(atual)
                atual = p
        if atual:
            linhas.append(atual)
        return linhas[:3]

    def draw(self):
        c = self.canv
        cor = OURO if self.lendaria else SLOT
        c.saveState()
        # contorno tracejado
        c.setStrokeColor(cor)
        c.setLineWidth(1)
        c.setDash(3, 2)
        c.roundRect(0, 0, self.width, self.height, 4, stroke=1, fill=0)
        c.setDash()
        # numero
        c.setFillColor(cor)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(3.5, self.height - 10, "#%02d" % self.numero)
        if self.lendaria:
            c.setFont("Helvetica-Bold", 8)
            c.drawRightString(self.width - 3.5, self.height - 10, "LENDARIA")
        # nome (centralizado)
        c.setFillColor(SLOTTXT)
        c.setFont("Helvetica", 7)
        linhas = self._quebrar(self.nome, max(10, int(self.width / 3.4)))
        y = self.height / 2 + (len(linhas) - 1) * 4
        for ln in linhas:
            c.drawCentredString(self.width / 2, y, ln)
            y -= 8
        # legenda
        c.setFillColor(HexColor("#4a5f7a"))
        c.setFont("Helvetica-Oblique", 5.5)
        c.drawCentredString(self.width / 2, 5, "cole a figurinha aqui")
        c.restoreState()


def n_colunas(qtd):
    if qtd <= 2:
        return qtd
    if qtd <= 9:
        return 3
    if qtd == 10:
        return 5
    return 4


def grade_slots(slots, larg_util):
    cols = n_colunas(len(slots))
    col_w = larg_util / cols
    slot_w = col_w - 6 * mm
    slot_h = min(slot_w * 1.36, 78 * mm)

    celulas = [SlotFig(slot_w, slot_h, n, nome, bool(rar)) for (n, nome, rar) in slots]
    linhas = []
    for i in range(0, len(celulas), cols):
        linha = celulas[i:i + cols]
        while len(linha) < cols:
            linha.append(Spacer(slot_w, slot_h))
        linhas.append(linha)

    tbl = Table(linhas, colWidths=[col_w] * cols,
                rowHeights=[slot_h + 6 * mm] * len(linhas))
    tbl.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return tbl


# =================================================================
# DOCUMENTO
# =================================================================
def fundo(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(FUNDO)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(CINZA)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(A4[0] / 2, 13 * mm,
                             "Album de Figurinhas FutLendas - versao para imprimir e colar")
    canvas.restoreState()


def montar():
    doc = BaseDocTemplate(
        "Album_FutLendas_fisico.pdf", pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=20 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="fl", frames=[frame], onPage=fundo)])

    story = []

    for idx, p in enumerate(PAGINAS):
        # ---------- CAPA ----------
        if p["tipo"] == "capa":
            story.append(Spacer(1, 75 * mm))
            story.append(Paragraph("FUT LENDAS", ParagraphStyle(
                "c1", fontName="Helvetica-Bold", fontSize=46, textColor=OURO,
                alignment=TA_CENTER, leading=50)))
            story.append(Paragraph("ALBUM DE FIGURINHAS", ParagraphStyle(
                "c2", fontName="Helvetica-Bold", fontSize=20, textColor=BRANCO,
                alignment=TA_CENTER, spaceBefore=8)))
            story.append(Spacer(1, 6 * mm))
            story.append(Paragraph("COLECAO COMPLETA", ParagraphStyle(
                "c3", fontName="Helvetica-Bold", fontSize=12, textColor=CIANO,
                alignment=TA_CENTER)))
            story.append(Spacer(1, 30 * mm))
            story.append(Paragraph("115 figurinhas - 13 paginas", ParagraphStyle(
                "c4", fontName="Helvetica-Oblique", fontSize=10, textColor=CINZA,
                alignment=TA_CENTER)))
            story.append(PageBreak())
            continue

        # ---------- CABECALHO ----------
        badge = Table([[Paragraph("PAGINA %02d" % p["numero"], st_num)]],
                      colWidths=[32 * mm])
        badge.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), OURO),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(badge)
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph(p["titulo"], st_titulo))
        if p["subtitulo"]:
            cor = HexColor(p["cor"]) if p["cor"] else BRANCO
            story.append(Paragraph(p["subtitulo"],
                                   ParagraphStyle("subc", parent=st_sub, textColor=cor)))
        if p["data"]:
            story.append(Paragraph(p["data"], st_meta))
        if p["tag"]:
            partes = " | ".join(t.strip() for t in p["tag"].split("|"))
            story.append(Paragraph(partes.upper(), st_tag))
        else:
            story.append(Spacer(1, 4))

        # ---------- TEXTO ----------
        if p["texto"]:
            for bloco in p["texto"].split("\n\n"):
                bloco = bloco.strip()
                if not bloco:
                    continue
                for linha in bloco.split("\n"):
                    linha = linha.strip()
                    if not linha:
                        continue
                    if linha.startswith("## "):
                        story.append(Paragraph(linha[3:].strip(), st_secao))
                    elif linha.startswith("[[PILL]]"):
                        story.append(Paragraph(
                            "&#9656; " + linha.replace("[[PILL]]", "").strip(), st_pill))
                    elif linha.startswith("[[DESTAQUE]]"):
                        story.append(Paragraph(
                            linha.replace("[[DESTAQUE]]", "").strip(), st_dest))
                    else:
                        story.append(Paragraph(linha, st_corpo))

        # ---------- SLOTS PARA COLAR ----------
        if p["numero"] in FIGS:
            slots = FIGS[p["numero"]]
            story.append(Paragraph(
                "FIGURINHAS DESTA PAGINA (%d) - cole nos espacos abaixo:" % len(slots),
                st_colar))
            story.append(grade_slots(slots, doc.width))

        if idx < len(PAGINAS) - 1:
            story.append(PageBreak())

    doc.build(story)
    print("PDF gerado: Album_FutLendas_fisico.pdf")


if __name__ == "__main__":
    montar()
