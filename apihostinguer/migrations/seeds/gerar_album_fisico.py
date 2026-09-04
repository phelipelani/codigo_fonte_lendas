# -*- coding: utf-8 -*-
"""
Gera o PDF da VERSÃO FÍSICA DO ÁLBUM FUTLENDAS (Sem figurinhas).
- Formato A4 profissional de gráfica (210 x 297 mm).
- 16 páginas exatas:
    Página 01: Capa Oficial FutLendas
    Página 02: A Origem · O Começo de Tudo (Foto Fundadores #200 e #201)
    Página 03: A Rede que Cresceu (34 slots #01 a #34)
    Página 04: Os Números da Lenda · Estatísticas (4 slots #35 a #38)
    Página 05: Por que começamos os campeonatos? (4 slots #202 a #205)
    Página 06: 1ª Copa Fut Lendas (11 slots #48 a #209)
    Página 07: 2ª Copa Fut Lendas (11 slots #57 a #213)
    Página 08: 3ª Copa Fut Lendas (12 slots #66 a #232)
    Página 09: 1º Campeonato · Pontos Corridos · Vasco (4 slots #218 a #221)
    Página 10: Elencos da 1ª Edição (28 slots por time #116 a #143)
    Página 11: 2º Campeonato · Pontos Corridos · São Paulando (4 slots #222 a #225)
    Página 12: Elencos da 2ª Edição (28 slots por time #144 a #171)
    Página 13: 3º Campeonato · São Paulando Bi · Lanipulação (4 slots #226 a #229)
    Página 14: Elencos da 3ª Edição (30 slots por time #172 a #231)
    Página 15: Escudos dos Times & Fut Onze (13 slots #103 a #115)
    Página 16: Contracapa · Obrigado por Fazer Parte
"""
import os
import json
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Flowable
)
from reportlab.lib.styles import ParagraphStyle

# Paleta Oficial FutLendas
FUNDO       = HexColor("#0d1f35")
OURO        = HexColor("#FFC400")
OURO_BRILHO = HexColor("#F5D76E")
CIANO       = HexColor("#22D3EE")
BRANCO      = HexColor("#FFFFFF")
CINZA       = HexColor("#9FB4CC")
CINZA_ESC   = HexColor("#506882")
SLOT_BORDA  = HexColor("#385375")
SLOT_FUNDO  = HexColor("#0b192c")
PRETO       = HexColor("#000000")

# =====================================================================
# SLOT FLOWABLE (Espaço demarcado com número e nome para colar)
# =====================================================================
class SlotFigurinha(Flowable):
    def __init__(self, w, h, numero, nome, raridade='comum'):
        super().__init__()
        self.width = w
        self.height = h
        self.numero = numero
        self.raridade = raridade.lower() if raridade else 'comum'
        
        # Limpar / Simplificar nomes de slots de elenco
        nome_limpo = nome
        if "Logo Time" in nome:
            nome_limpo = "ESCUDO DO TIME"
        elif "Capitão Time" in nome:
            nome_limpo = "CAPITÃO"
        elif "Jogador" in nome and "Time" in nome:
            m = re.search(r"Jogador\s+(\d+)", nome)
            nome_limpo = f"Jogador {m.group(1)}" if m else "Jogador"
        elif "Campeão" in nome and "parte" in nome:
            m = re.search(r"parte\s+(\d+)", nome)
            nome_limpo = f"Foto Campeão ({m.group(1)}/4)" if m else "Foto Campeão"
        elif "Fundadores" in nome:
            m = re.search(r"parte\s+(\d+)", nome)
            nome_limpo = f"Fundadores ({m.group(1)}/2)" if m else "Fundadores"
            
        self.nome = nome_limpo

    def _quebrar_texto(self, texto, max_chars):
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
        is_lendaria = self.raridade in ('lendaria', 'rara')
        cor_destaque = OURO if is_lendaria else CIANO
        cor_borda = OURO if is_lendaria else SLOT_BORDA

        c.saveState()

        # Fundo do slot
        c.setFillColor(SLOT_FUNDO)
        c.roundRect(0, 0, self.width, self.height, 3.5, stroke=0, fill=1)

        # Borda tracejada
        c.setStrokeColor(cor_borda)
        c.setLineWidth(1.1 if is_lendaria else 0.75)
        c.setDash(3, 2)
        c.roundRect(0, 0, self.width, self.height, 3.5, stroke=1, fill=0)
        c.setDash()

        # Badge Superior com o NÚMERO DA FIGURINHA
        badge_w = min(26 * mm, self.width - 4)
        badge_h = 4.2 * mm
        c.setFillColor(cor_destaque)
        c.roundRect((self.width - badge_w) / 2, self.height - badge_h - 1.8, badge_w, badge_h, 2, stroke=0, fill=1)

        c.setFillColor(PRETO)
        c.setFont("Helvetica-Bold", 7.2)
        txt_num = f"#{self.numero:02d}" if self.numero < 100 else f"#{self.numero}"
        c.drawCentredString(self.width / 2, self.height - badge_h + 0.3, txt_num)

        # Indicador de Raridade
        if is_lendaria:
            c.setFillColor(OURO)
            c.setFont("Helvetica-Bold", 5.5)
            c.drawCentredString(self.width / 2, self.height - badge_h - 5.8, "★ LENDÁRIA ★" if self.raridade == 'lendaria' else "★ RARA ★")

        # Nome da Figurinha / Jogador
        c.setFillColor(BRANCO)
        tam_fonte = 6.5 if self.width < 30 * mm else 7.2
        c.setFont("Helvetica-Bold", tam_fonte)
        max_c = max(8, int(self.width / 2.8))
        linhas = self._quebrar_texto(self.nome, max_c)
        y_nome = self.height / 2 + (len(linhas) - 1) * 3.2
        for ln in linhas:
            c.drawCentredString(self.width / 2, y_nome, ln)
            y_nome -= 7.0

        # Rodapé: Guia "cole a figurinha aqui"
        c.setFillColor(CINZA_ESC)
        c.setFont("Helvetica-Oblique", 4.8)
        c.drawCentredString(self.width / 2, 3.5, "cole a figurinha aqui")

        c.restoreState()


# =====================================================================
# GRADE DE SLOTS
# =====================================================================
def criar_grade_slots(figurinhas, larg_util, cols=None, max_h=None):
    qtd = len(figurinhas)
    if not qtd:
        return Spacer(1, 1)

    if cols is None:
        if qtd <= 2: cols = qtd
        elif qtd <= 4: cols = 4
        elif qtd <= 8: cols = 4
        elif qtd <= 12: cols = 4
        elif qtd <= 20: cols = 5
        elif qtd <= 28: cols = 7
        elif qtd <= 30: cols = 6
        else: cols = 7

    col_w = larg_util / cols
    slot_w = col_w - 3.2 * mm
    slot_h = slot_w * 1.32
    if max_h and slot_h > max_h:
        slot_h = max_h
        slot_w = slot_h / 1.32
        col_w = larg_util / cols

    celulas = [
        SlotFigurinha(slot_w, slot_h, f['numero'], f['nome'], f.get('raridade', 'comum'))
        for f in figurinhas
    ]

    linhas = []
    for i in range(0, len(celulas), cols):
        linha = celulas[i:i + cols]
        while len(linha) < cols:
            linha.append(Spacer(slot_w, slot_h))
        linhas.append(linha)

    tbl = Table(linhas, colWidths=[col_w] * cols, rowHeights=[slot_h + 3.0 * mm] * len(linhas))
    tbl.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0.5),
    ]))
    return tbl


# =====================================================================
# FUNDO DAS PÁGINAS DO ÁLBUM
# =====================================================================
def desenhar_fundo_pagina(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(FUNDO)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)

    # Borda dupla sutil da página
    canvas.setStrokeColor(HexColor("#1b3558"))
    canvas.setLineWidth(0.8)
    canvas.rect(8 * mm, 8 * mm, A4[0] - 16 * mm, A4[1] - 16 * mm, stroke=1, fill=0)

    # Filete dourado superior
    canvas.setFillColor(OURO)
    canvas.rect(12 * mm, A4[1] - 10 * mm, A4[0] - 24 * mm, 0.6 * mm, fill=1, stroke=0)

    # Rodapé
    canvas.setFillColor(CINZA)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(14 * mm, 11 * mm, "ÁLBUM DE FIGURINHAS OFICIAL FUTLENDAS — EDIÇÃO HISTÓRICA")

    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawRightString(A4[0] - 14 * mm, 11 * mm, f"PÁGINA {doc.page:02d} DE 16")

    canvas.restoreState()


def desenhar_fundo_capa(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(FUNDO)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    # Moldura dupla dourada na capa
    canvas.setStrokeColor(OURO)
    canvas.setLineWidth(1.6)
    canvas.rect(10 * mm, 10 * mm, A4[0] - 20 * mm, A4[1] - 20 * mm, stroke=1, fill=0)
    canvas.setLineWidth(0.6)
    canvas.rect(12 * mm, 12 * mm, A4[0] - 24 * mm, A4[1] - 24 * mm, stroke=1, fill=0)
    canvas.restoreState()


# =====================================================================
# MONTAGEM DO ÁLBUM FÍSICO
# =====================================================================
def gerar_album_pdf():
    pdf_path = "Album_FutLendas_Sem_Figurinhas.pdf"

    with open('scratch/album_perfeito.json', 'r', encoding='utf-8') as f:
        paginas = json.load(f)

    doc = BaseDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=15 * mm,
        bottomMargin=16 * mm,
    )

    frame_corpo = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="corpo")
    doc.addPageTemplates([
        PageTemplate(id="capa_tpl", frames=[frame_corpo], onPage=desenhar_fundo_capa),
        PageTemplate(id="interna_tpl", frames=[frame_corpo], onPage=desenhar_fundo_pagina),
    ])

    # Estilos
    st_capa_badge = ParagraphStyle("capa_badge", fontName="Helvetica-Bold", fontSize=10, textColor=OURO, alignment=TA_CENTER, spaceAfter=8)
    st_capa_tit = ParagraphStyle("capa_tit", fontName="Helvetica-Bold", fontSize=42, textColor=OURO, alignment=TA_CENTER, leading=44)
    st_capa_sub = ParagraphStyle("capa_sub", fontName="Helvetica-Bold", fontSize=18, textColor=BRANCO, alignment=TA_CENTER, spaceBefore=6, spaceAfter=4)
    st_capa_desc = ParagraphStyle("capa_desc", fontName="Helvetica", fontSize=11, textColor=CIANO, alignment=TA_CENTER, spaceAfter=12)
    st_capa_meta = ParagraphStyle("capa_meta", fontName="Helvetica-Oblique", fontSize=9, textColor=CINZA, alignment=TA_CENTER)

    st_pag_badge = ParagraphStyle("p_badge", fontName="Helvetica-Bold", fontSize=8, textColor=PRETO, alignment=TA_CENTER)
    st_pag_tit = ParagraphStyle("p_tit", fontName="Helvetica-Bold", fontSize=18, textColor=OURO, leading=20, spaceBefore=2, spaceAfter=1)
    st_pag_sub = ParagraphStyle("p_sub", fontName="Helvetica-Bold", fontSize=11, textColor=BRANCO, leading=13, spaceAfter=2)
    st_pag_meta = ParagraphStyle("p_meta", fontName="Helvetica-Oblique", fontSize=8, textColor=CIANO, spaceAfter=1)

    st_corpo = ParagraphStyle("corpo", fontName="Helvetica", fontSize=8.5, textColor=BRANCO, leading=11.5, alignment=TA_JUSTIFY, spaceAfter=4)
    st_secao = ParagraphStyle("secao", fontName="Helvetica-Bold", fontSize=9.5, textColor=OURO, leading=12, spaceBefore=4, spaceAfter=2)
    st_pill = ParagraphStyle("pill", fontName="Helvetica-Bold", fontSize=8, textColor=CIANO, leading=10, leftIndent=6, spaceAfter=2)
    st_dest = ParagraphStyle("dest", fontName="Helvetica-BoldOblique", fontSize=8.5, textColor=OURO_BRILHO, leading=11, leftIndent=6, spaceBefore=3, spaceAfter=4)
    st_colar = ParagraphStyle("colar", fontName="Helvetica-Bold", fontSize=8, textColor=CIANO, spaceBefore=4, spaceAfter=3)

    story = []

    for idx, p in enumerate(paginas):
        num = p['numero']

        # -------------------------------------------------------------
        # PÁGINA 1: CAPA
        # -------------------------------------------------------------
        if p['tipo'] == 'capa':
            story.append(Spacer(1, 40 * mm))
            story.append(Paragraph("★ ÁLBUM OFICIAL DE COLECIONADOR ★", st_capa_badge))
            story.append(Spacer(1, 6 * mm))
            story.append(Paragraph("FUT LENDAS", st_capa_tit))
            story.append(Paragraph("ÁLBUM DE FIGURINHAS", st_capa_sub))
            story.append(Paragraph("COLEÇÃO COMPLETA · EDIÇÃO HISTÓRICA", st_capa_desc))

            capa_img = 'src/features/album/assets/capa-hero.png'
            if os.path.exists(capa_img):
                from reportlab.platypus import Image as RLImage
                story.append(Spacer(1, 5 * mm))
                img_flow = RLImage(capa_img, width=120 * mm, height=75 * mm)
                story.append(img_flow)
                story.append(Spacer(1, 10 * mm))
            else:
                story.append(Spacer(1, 60 * mm))

            story.append(Paragraph("189 FIGURINHAS · 16 PÁGINAS · 2022 - 2026", ParagraphStyle("c_stats", fontName="Helvetica-Bold", fontSize=11, textColor=OURO, alignment=TA_CENTER, spaceAfter=4)))
            story.append(Paragraph("A história viva, os craques, as copas, os campeonatos e o folclore do FutLendas.", st_capa_meta))
            story.append(PageBreak())
            continue

        # -------------------------------------------------------------
        # PÁGINA 16: CONTRACAPA / AGRADECIMENTO
        # -------------------------------------------------------------
        if p['tipo'] == 'agradecimento':
            story.append(Spacer(1, 50 * mm))
            badge = Table([[Paragraph("CONTRACAPA", st_pag_badge)]], colWidths=[28 * mm])
            badge.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), OURO),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]))
            story.append(badge)
            story.append(Spacer(1, 6 * mm))

            story.append(Paragraph("OBRIGADO", ParagraphStyle("ob_tit", fontName="Helvetica-Bold", fontSize=36, textColor=OURO, alignment=TA_CENTER, leading=38)))
            story.append(Paragraph("POR FAZER PARTE DESSA HISTÓRIA", ParagraphStyle("ob_sub", fontName="Helvetica-Bold", fontSize=15, textColor=BRANCO, alignment=TA_CENTER, spaceBefore=4, spaceAfter=14)))

            story.append(Spacer(1, 8 * mm))
            story.append(Paragraph(
                "Cada figurinha colada neste álbum representa mais do que um gol, uma vitória ou uma resenha de terça-feira.<br/><br/>"
                "Representa a amizade, o compromisso e a paixão de cada um de vocês que transformou um racha improvisado no "
                "maior projeto de futebol entre amigos do Brasil.<br/><br/>"
                "Obrigado a cada Lenda que suou a camisa, vibrou, discutiu, comemorou e construiu esse legado inesquecível.",
                ParagraphStyle("ob_txt", fontName="Helvetica", fontSize=11, textColor=CINZA, leading=16, alignment=TA_CENTER)
            ))

            story.append(Spacer(1, 20 * mm))
            story.append(Paragraph("DIRETORIA FUTLENDAS", ParagraphStyle("ob_dir", fontName="Helvetica-Bold", fontSize=12, textColor=CIANO, alignment=TA_CENTER)))
            story.append(Paragraph("2022 — 2026", ParagraphStyle("ob_ano", fontName="Helvetica-Oblique", fontSize=9, textColor=OURO, alignment=TA_CENTER)))
            continue

        # -------------------------------------------------------------
        # PÁGINAS INTERNAS (Páginas 2 a 15)
        # -------------------------------------------------------------
        badge = Table([[Paragraph(f"PÁGINA {num:02d}", st_pag_badge)]], colWidths=[24 * mm])
        cor_badge = HexColor(p['subtitulo_cor']) if p.get('subtitulo_cor') else OURO
        badge.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), cor_badge),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        story.append(badge)
        story.append(Spacer(1, 2 * mm))

        story.append(Paragraph(p['titulo'], st_pag_tit))
        if p.get('subtitulo'):
            cor_sub = HexColor(p['subtitulo_cor']) if p.get('subtitulo_cor') else BRANCO
            story.append(Paragraph(p['subtitulo'], ParagraphStyle(f"sub_{num}", parent=st_pag_sub, textColor=cor_sub)))

        meta_line = []
        if p.get('data_referencia'):
            meta_line.append(p['data_referencia'])
        if p.get('tag'):
            meta_line.append(p['tag'])
        if meta_line:
            story.append(Paragraph(" · ".join(meta_line), st_pag_meta))
        else:
            story.append(Spacer(1, 2))

        # Texto Narrativo
        if p.get('texto'):
            blocos = p['texto'].split("\n\n")
            for b in blocos:
                b = b.strip()
                if not b:
                    continue
                for linha in b.split("\n"):
                    linha = linha.strip()
                    if not linha:
                        continue
                    if linha.startswith("## "):
                        story.append(Paragraph(linha[3:].strip(), st_secao))
                    elif linha.startswith("[[PILL]]"):
                        story.append(Paragraph("▸ " + linha.replace("[[PILL]]", "").strip(), st_pill))
                    elif linha.startswith("[[DESTAQUE]]"):
                        story.append(Paragraph(linha.replace("[[DESTAQUE]]", "").strip(), st_dest))
                    else:
                        story.append(Paragraph(linha, st_corpo))

        # Slots de Figurinhas
        figs = p.get('figurinhas', [])

        if p['tipo'] == 'elenco':
            # Agrupamento por time nas páginas 10, 12, 14
            story.append(Spacer(1, 1.5 * mm))
            grupos = []
            if num == 10:
                nomes_times = [
                    ("Não te escolhi FC", "#FFC400"),
                    ("Vasco", "#FFFFFF"),
                    ("Peguei sua Vó", "#EC4899"),
                    ("Meninos de Vó", "#38BDF8"),
                ]
                tam = 7
                for i, (t_nome, t_cor) in enumerate(nomes_times):
                    grupos.append((t_nome, t_cor, figs[i * tam:(i + 1) * tam]))
            elif num == 12:
                nomes_times = [
                    ("Shaktar dos Leks", "#FFC400"),
                    ("Vasco", "#FFFFFF"),
                    ("Meninos de Vó", "#EC4899"),
                    ("São Paulando", "#38BDF8"),
                ]
                tam = 7
                for i, (t_nome, t_cor) in enumerate(nomes_times):
                    grupos.append((t_nome, t_cor, figs[i * tam:(i + 1) * tam]))
            elif num == 14:
                t_configs = [
                    ("Inter dos Molão", "#FFC400", 8),
                    ("Shaktar dos Leks", "#FFFFFF", 7),
                    ("Real Madruga", "#38BDF8", 8),
                    ("São Paulando", "#EC4899", 7),
                ]
                pos = 0
                for t_nome, t_cor, t_qtd in t_configs:
                    grupos.append((t_nome, t_cor, figs[pos:pos + t_qtd]))
                    pos += t_qtd
            else:
                grupos.append(("Elenco Geral", "#FFC400", figs))

            for t_nome, t_cor, t_figs in grupos:
                story.append(Paragraph(f"★ {t_nome.upper()} ({len(t_figs)} figurinhas)", ParagraphStyle(f"t_{t_nome}", fontName="Helvetica-Bold", fontSize=7.5, textColor=HexColor(t_cor), leading=9, spaceBefore=2, spaceAfter=1)))
                story.append(criar_grade_slots(t_figs, doc.width, cols=len(t_figs)))

        elif num == 3:
            # Página 3: A Rede que Cresceu (34 figurinhas em grade 7 colunas)
            story.append(Paragraph(f"FIGURINHAS DESTA PÁGINA ({len(figs)}) — cole nos espaços abaixo:", st_colar))
            story.append(criar_grade_slots(figs, doc.width, cols=7, max_h=28 * mm))

        elif num == 2:
            # Página 2: Os Fundadores (2 figurinhas foto dividida)
            story.append(Spacer(1, 4 * mm))
            story.append(Paragraph("FOTO HISTÓRICA DOS FUNDADORES — COLE AS DUAS PARTES:", st_colar))
            story.append(criar_grade_slots(figs, doc.width, cols=2, max_h=65 * mm))

        elif num in (6, 7, 8):
            # Copas (11 a 12 figurinhas)
            story.append(Paragraph(f"FIGURINHAS DA COPA ({len(figs)}) — cole nos espaços abaixo:", st_colar))
            story.append(criar_grade_slots(figs, doc.width, cols=4, max_h=38 * mm))

        elif num == 15:
            # Escudos dos Times (13 figurinhas)
            story.append(Paragraph(f"ESCUDOS E MOMENTOS ({len(figs)}) — cole nos espaços abaixo:", st_colar))
            story.append(criar_grade_slots(figs, doc.width, cols=5, max_h=36 * mm))

        else:
            # Páginas 4, 5, 9, 11, 13 (4 figurinhas cada)
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(f"FIGURINHAS DESTA PÁGINA ({len(figs)}) — cole nos espaços abaixo:", st_colar))
            story.append(criar_grade_slots(figs, doc.width, cols=4, max_h=45 * mm))

        if idx < len(paginas) - 1:
            story.append(PageBreak())

    doc.build(story)
    print(f"PDF gerado com sucesso: {pdf_path}")


if __name__ == "__main__":
    gerar_album_pdf()
