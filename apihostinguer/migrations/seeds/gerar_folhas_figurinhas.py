# -*- coding: utf-8 -*-
"""
Gera o PDF com TODAS AS 189 FIGURINHAS do FutLendas para impressão em papel adesivo.
- Folhas A4 com grade otimizada de corte (3 colunas x 4 linhas = 12 figurinhas por folha).
- Cada figurinha traz sua imagem oficial em alta resolução.
- Cada figurinha traz sua identificação de corte:
    - Número em destaque (#01 a #232)
    - Nome do jogador/item
    - Indicação da página onde deve ser colada ("PÁG. 03")
    - Marcas de corte (cut marks) e borda de segurança.
"""
import os
import json
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

# Cores
FUNDO_FOLHA = HexColor("#0a1524")
FUNDO_CARD  = HexColor("#132742")
OURO        = HexColor("#FFC400")
OURO_BRILHO = HexColor("#F5D76E")
CIANO       = HexColor("#22D3EE")
BRANCO      = HexColor("#FFFFFF")
CINZA       = HexColor("#9FB4CC")
CINZA_GUIA  = HexColor("#475569")
PRETO       = HexColor("#000000")

IMG_DIR = os.path.abspath('scratch/figurinhas_img')

def gerar_pdf_figurinhas():
    pdf_path = "Figurinhas_FutLendas_Para_Imprimir.pdf"

    with open('scratch/album_clean.json', 'r', encoding='utf-8') as f:
        paginas = json.load(f)

    # Coletar todas as 189 figurinhas ordenadas pelo número
    figurinhas = []
    for p in paginas:
        p_num = p['numero']
        for f in p.get('figurinhas', []):
            num = f['numero']
            ext = os.path.splitext(f['imagem_url'].split('?')[0])[1] or '.png'
            local_img = os.path.join(IMG_DIR, f"fig_{num:03d}{ext}")
            figurinhas.append({
                'numero': num,
                'nome': f['nome'],
                'raridade': f.get('raridade', 'comum'),
                'pagina': p_num,
                'img_path': local_img
            })

    # Ordenar por número da figurinha para facilitar a organização
    figurinhas.sort(key=lambda x: x['numero'])
    total_figs = len(figurinhas)
    print(f"Total de figurinhas a incluir no PDF: {total_figs}")

    # Configurações da Grade A4
    # A4 = 210 x 297 mm
    page_w, page_h = A4
    cols = 3
    rows = 4
    figs_per_page = cols * rows  # 12 por página

    # Dimensões de cada card adesivo
    # Margens da folha A4
    margin_x = 12 * mm
    margin_top = 18 * mm
    margin_bottom = 12 * mm

    larg_util = page_w - (2 * margin_x)
    alt_util = page_h - margin_top - margin_bottom

    gap_x = 7 * mm   # espaço entre colunas para passar a tesoura/estilete
    gap_y = 6 * mm   # espaço entre linhas

    card_w = (larg_util - (cols - 1) * gap_x) / cols  # ~57.3 mm
    card_h = (alt_util - (rows - 1) * gap_y) / rows  # ~62.2 mm

    # O card adesivo terá:
    # - Uma tarja superior de 7 mm com: "#XX • NOME • PÁG. YY"
    # - A imagem do card ocupando o restante com proporção preservada
    header_h = 6.5 * mm
    img_box_h = card_h - header_h

    c = canvas.Canvas(pdf_path, pagesize=A4)

    total_paginas = (total_figs + figs_per_page - 1) // figs_per_page

    for page_idx in range(total_paginas):
        # -------------------------------------------------------------
        # Fundo da folha (Cinza bem escuro profissional, economiza corte)
        # -------------------------------------------------------------
        c.setFillColor(HexColor("#08121f"))
        c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

        # Cabeçalho da folha de impressão
        c.setFillColor(OURO)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin_x, page_h - 10 * mm, "FUTLENDAS — FOLHA DE FIGURINHAS ADESIVAS OFICIAL")

        c.setFillColor(CINZA)
        c.setFont("Helvetica", 8)
        c.drawString(margin_x, page_h - 14 * mm, "Papel recomendado: Adesivo Fotográfico / Couchê Adesivo A4 • Cortar nas linhas de guia")

        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(page_w - margin_x, page_h - 10 * mm, f"FOLHA {page_idx + 1:02d} DE {total_paginas:02d}")

        # Linha divisória superior
        c.setStrokeColor(HexColor("#1e334d"))
        c.setLineWidth(0.8)
        c.line(margin_x, page_h - 15.5 * mm, page_w - margin_x, page_h - 15.5 * mm)

        # Rodapé da folha
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(HexColor("#64748b"))
        c.drawString(margin_x, 6 * mm, "FutLendas Coleção Oficial — Todas as figurinhas são numeradas de acordo com os slots do álbum.")
        c.drawRightString(page_w - margin_x, 6 * mm, f"Figurinhas {(page_idx * figs_per_page) + 1} a {min((page_idx + 1) * figs_per_page, total_figs)} de {total_figs}")

        # -------------------------------------------------------------
        # Desenhar as figurinhas da página atual
        # -------------------------------------------------------------
        page_figs = figurinhas[page_idx * figs_per_page : (page_idx + 1) * figs_per_page]

        for i, fig in enumerate(page_figs):
            col = i % cols
            row = i // cols

            # Coordenadas do card (canto inferior esquerdo)
            x = margin_x + col * (card_w + gap_x)
            # No ReportLab, y=0 é embaixo. As linhas vão de cima para baixo:
            y = page_h - margin_top - ((row + 1) * card_h + row * gap_y)

            num = fig['numero']
            is_lendaria = fig['raridade'] in ('lendaria', 'rara')

            # 1. Linhas de corte / Cut Marks nos 4 cantos da figurinha (fora do card)
            c.setStrokeColor(HexColor("#94a3b8"))
            c.setLineWidth(0.4)
            c.setDash(2, 2)
            c.rect(x - 1, y - 1, card_w + 2, card_h + 2, stroke=1, fill=0)
            c.setDash()

            # 2. Fundo do Card
            c.setFillColor(HexColor("#0f1e31"))
            c.roundRect(x, y, card_w, card_h, 3, stroke=0, fill=1)

            # 3. Tarja Superior de Identificação (Para quem for colar nunca errar o número e a página!)
            cor_tarja = OURO if is_lendaria else CIANO
            c.setFillColor(cor_tarja)
            c.roundRect(x, y + card_h - header_h, card_w, header_h, 2, stroke=0, fill=1)

            # Texto do Número em destaque
            c.setFillColor(PRETO)
            c.setFont("Helvetica-Bold", 8)
            str_num = f"#{num:02d}" if num < 100 else f"#{num}"
            c.drawString(x + 2 * mm, y + card_h - header_h + 1.8 * mm, str_num)

            # Indicação da Página
            c.setFont("Helvetica-Bold", 7)
            c.drawRightString(x + card_w - 2 * mm, y + card_h - header_h + 1.8 * mm, f"PÁG. {fig['pagina']:02d}")

            # 4. Imagem da Figurinha
            img_path = fig['img_path']
            if os.path.exists(img_path) and os.path.getsize(img_path) > 500:
                try:
                    # Obter proporção da imagem
                    with Image.open(img_path) as im:
                        orig_w, orig_h = im.size
                    
                    aspect = orig_w / orig_h
                    # Ajustar dentro da área da imagem (com margem de 1.5mm)
                    box_w = card_w - 3 * mm
                    box_h = img_box_h - 2.5 * mm

                    if box_w / box_h > aspect:
                        # Limitado pela altura
                        draw_h = box_h
                        draw_w = draw_h * aspect
                    else:
                        # Limitado pela largura
                        draw_w = box_w
                        draw_h = draw_w / aspect

                    # Centralizar dentro da área de imagem
                    draw_x = x + (card_w - draw_w) / 2
                    draw_y = y + (img_box_h - draw_h) / 2 + 0.5 * mm

                    c.drawImage(img_path, draw_x, draw_y, width=draw_w, height=draw_h, preserveAspectRatio=True, mask='auto')
                except Exception as e:
                    print(f"Erro ao desenhar imagem fig {num}: {e}")
            else:
                # Fallback se imagem não existir
                c.setFillColor(HexColor("#1e293b"))
                c.rect(x + 2, y + 2, card_w - 4, img_box_h - 4, fill=1, stroke=0)
                c.setFillColor(BRANCO)
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(x + card_w / 2, y + img_box_h / 2, f"FIGURINHA #{num}")

            # 5. Moldura externa elegante da figurinha
            c.setStrokeColor(OURO if is_lendaria else HexColor("#254060"))
            c.setLineWidth(1 if is_lendaria else 0.6)
            c.roundRect(x, y, card_w, card_h, 3, stroke=1, fill=0)

        c.showPage()

    c.save()
    print(f"PDF das Figurinhas gerado com sucesso: {pdf_path}")


if __name__ == "__main__":
    gerar_pdf_figurinhas()
