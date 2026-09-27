"""Genera un PDF por etapa de obra.

Etapa 1: estructura de cubierta de la casa (se ejecuta primero).
Etapa 2: pérgola y cochera (trabajo aparte, en otro momento).
"""
import json
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
from PIL import Image as PILImage

ROOT = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(ROOT, 'renders') + os.sep
CROP = os.path.join(ROOT, 'renders', '_recortes') + os.sep
os.makedirs(CROP, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'pdf'), exist_ok=True)
OUT1 = os.path.join(ROOT, 'pdf', 'Casa_Castaneda_Etapa1_Cubierta_Casa.pdf')
OUT2 = os.path.join(ROOT, 'pdf', 'Casa_Castaneda_Etapa2_Pergola_Cochera.pdf')
bom = json.load(open(os.path.join(ROOT, 'data', 'bom.json'), encoding='utf-8'))
E1, E2 = bom['_stage']['casa'], bom['_stage']['pergolas']

pdfmetrics.registerFont(TTFont('Body', os.path.join(ROOT, 'fonts', 'LiberationSans-Regular.ttf')))
pdfmetrics.registerFont(TTFont('BodyB', os.path.join(ROOT, 'fonts', 'LiberationSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Disp', os.path.join(ROOT, 'fonts', 'DejaVuSansCondensed-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Mono', os.path.join(ROOT, 'fonts', 'LiberationMono-Regular.ttf')))
pdfmetrics.registerFont(TTFont('MonoB', os.path.join(ROOT, 'fonts', 'LiberationMono-Bold.ttf')))

INK = HexColor('#0e131a'); STEEL = HexColor('#f26a1b')
TEXT = HexColor('#1b222c'); MUTED = HexColor('#6b7686'); LINE = HexColor('#d9d6cd'); PAPER = HexColor('#f4f2ed')
W, H = landscape(A4)
M = 34
CW = (W - 2 * M - 16) / 2  # ancho de columna en páginas de dos imágenes


def fmtn(v_, d=1):
    return f'{v_:,.{d}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


class Doc:
    def __init__(self, path, title, footer, pages):
        self.c = canvas.Canvas(path, pagesize=(W, H))
        self.c.setTitle(title)
        self.path, self.footer, self.pages, self.n = path, footer, pages, 0

    def spaced(self, x, y, s, font, size, sp, color):
        c = self.c
        c.setFillColor(color)
        t = c.beginText(x, y); t.setFont(font, size); t.setCharSpace(sp); t.textOut(s); c.drawText(t)
        t0 = c.beginText(0, 0); t0.setCharSpace(0); c.drawText(t0)  # restablece el espaciado

    def page(self, eyebrow, title):
        c = self.c
        if self.n:
            c.showPage()
        self.n += 1
        c.setFillColor(PAPER); c.rect(0, 0, W, H, stroke=0, fill=1)
        self.spaced(M, H - 34, eyebrow.upper(), 'MonoB', 7.5, 1.4, STEEL)
        c.setFillColor(INK); c.setFont('Disp', 20); c.drawString(M, H - 56, title)
        c.setStrokeColor(LINE); c.setLineWidth(0.7); c.line(M, H - 66, W - M, H - 66)
        c.setFillColor(MUTED); c.setFont('Mono', 7)
        c.drawString(M, 18, self.footer)
        c.drawRightString(W - M, 18, f'{self.n:02d} / {self.pages:02d}')

    def img(self, name, x, y, w, crop=None):
        path = R + name; ratio = 1700 / 1050
        if crop:
            im = PILImage.open(path); W_, H_ = im.size
            box_ = (int(crop[0] * W_), int(crop[1] * H_), int(crop[2] * W_), int(crop[3] * H_))
            path = CROP + name
            im.crop(box_).save(path, quality=92)
            ratio = (box_[2] - box_[0]) / (box_[3] - box_[1])
        ih = w / ratio
        self.c.drawImage(path, x, y - ih, width=w, height=ih)
        self.c.setStrokeColor(LINE); self.c.setLineWidth(0.5); self.c.rect(x, y - ih, w, ih, stroke=1, fill=0)
        return ih

    def caption(self, x, y, s, w):
        self.c.setFillColor(MUTED); self.c.setFont('Mono', 7.5)
        for ln in simpleSplit(s, 'Mono', 7.5, w):
            self.c.drawString(x, y, ln); y -= 10
        return y

    def cover(self, eyebrow, title, hero, crop, cap, strip):
        """Portada: imagen principal, franja de materiales y datos clave."""
        c = self.c
        self.page(eyebrow, title)
        iw = W - 2 * M
        ih = self.img(hero, M, H - 76, iw, crop=crop)
        y = H - 76 - ih - 14
        self.caption(M, y, cap, iw)
        y -= 40
        colw = (iw - 2 * 24) / 3
        for i, (n_, t_) in enumerate(strip):
            x = M + i * (colw + 24)
            c.setFillColor(STEEL); c.rect(x, y - 2, 3, 34, stroke=0, fill=1)
            c.setFillColor(INK); c.setFont('BodyB', 11); c.drawString(x + 12, y + 20, n_)
            c.setFillColor(TEXT); c.setFont('Mono', 9.5); c.drawString(x + 12, y + 6, t_)
        assert y - 2 > 34, 'la franja de materiales choca con el pie de página'

    def save(self):
        self.c.save()
        print('ok', self.path)


# =================================================================== ETAPA 1
d = Doc(OUT1, 'Casa Castañeda · Etapa 1 · Estructura de cubierta',
        'CASA CASTAÑEDA · SANTA ROSA · ETAPA 1 · ESTRUCTURA DE CUBIERTA DE LA CASA', 3)
c = d.c

d.cover('Etapa 1 · Referencia para cotización', 'Estructura metálica de cubierta — ángulos 3D',
        's1_hero.jpg', (0.03, 0.0, 0.97, 0.80),
        'VISTA ISOMÉTRICA. Cubierta de 16,81 × 10,60 m, cumbrera a +5,35 m, 7 cerchas. Teja en transparencia para ver la estructura.',
        [('Cerchas principales', 'Tubo rect. 150 × 50 × 4 mm'),
         ('Correas', 'Tubo rect. 120 × 60 × 2,5 mm'),
         ('Cumbrera doble', 'Tubo rect. 200 × 70 × 4 mm')])

d.page('Etapa 1 · Ángulos', 'Fachadas, lateral y planta')
top = H - 78
ih1 = d.img('s2_norte.jpg', M, top, CW, crop=(0.03, 0.18, 0.97, 0.80))
d.img('s3_sur.jpg', M + CW + 16, top, CW, crop=(0.03, 0.18, 0.97, 0.80))
y = top - ih1 - 10
d.caption(M, y, 'FRENTE.', CW)
d.caption(M + CW + 16, y, 'POSTERIOR — frontón sobre la terraza.', CW)
top2 = y - 18
ih2 = d.img('s4_lateral.jpg', M, top2, CW, crop=(0.08, 0.16, 0.92, 0.82))
d.img('s5_planta.jpg', M + CW + 16, top2, CW, crop=(0.06, 0.05, 0.94, 0.85))
y2 = top2 - ih2 - 10
d.caption(M, y2, 'LATERAL.', CW)
d.caption(M + CW + 16, y2, 'PLANTA.', CW)

d.page('Etapa 1 · Detalle y materiales', 'Frontón, nodo de soldadura y cuadro de materiales')
ih = d.img('s6_fronton.jpg', M, top, CW, crop=(0.05, 0.08, 0.95, 0.88))
d.img('s7_nodo.jpg', M + CW + 16, top, CW, crop=(0.05, 0.08, 0.95, 0.88))
y = top - ih - 10
d.caption(M, y, 'FRONTÓN — limahoyas y cerchuelas.', CW)
d.caption(M + CW + 16, y, 'NODO TÍPICO — cercha, correa y cumbrera soldadas en cada cruce.', CW)
y -= 28

tx = M; ty = y; TW = 590
cols = [tx, tx + 260, tx + 340, tx + 430]
for h_, x in [('ELEMENTO', cols[0]), ('TRAMOS', cols[1] + 40), ('LONGITUD (m)', cols[2] + 50), ('PESO REF. (kg)', cols[3] + 70)]:
    c.setFillColor(MUTED); c.setFont('Mono', 7)
    (c.drawString if x == cols[0] else c.drawRightString)(x, ty, h_)
c.setStrokeColor(INK); c.setLineWidth(0.8); c.line(tx, ty - 5, tx + TW, ty - 5)
ROWS1 = [
    ('frame', 'Cerchas principales', '150×50×4', 'ejecutor', None),
    ('ridge', 'Cumbrera doble', '200×70×4 (doble)', 'ejecutor', None),
    ('purlin', 'Correas', '120×60×2,5', 'ejecutor', None),
    ('valley', 'Limahoyas', '150×50×4', 'referencia', 'cierre de aguas del frontón'),
    ('gableRaf', 'Cerchuelas de frontón', '80×40×2', 'referencia', 'arman el triángulo del frontón'),
    ('tie', 'Soleras de amarre', '100×50×2,5', 'referencia', 'amarre corto, uno por cercha'),
]
assert [r[0] for r in ROWS1] == E1['keys']
yy = ty - 24
for k, name, tube, src, descr in ROWS1:
    b = bom[k]
    c.setFillColor(TEXT); c.setFont('BodyB', 9.5); c.drawString(cols[0], yy, name)
    c.setFillColor(STEEL if src == 'ejecutor' else MUTED); c.setFont('Mono', 6.8)
    c.drawString(cols[0], yy - 10, 'tubo ' + tube + (f'  ·  {descr}' if descr else '') + '  ·  ' + src)
    c.setFillColor(TEXT); c.setFont('Mono', 9.5)
    c.drawRightString(cols[1] + 40, yy, str(b['n'])); c.drawRightString(cols[2] + 50, yy, fmtn(b['len'])); c.drawRightString(cols[3] + 70, yy, fmtn(b['kg'], 0))
    c.setStrokeColor(LINE); c.setLineWidth(0.4); c.line(tx, yy - 16, tx + TW, yy - 16)
    yy -= 26
yy -= 2
c.setFillColor(INK); c.rect(tx, yy - 6, TW, 20, stroke=0, fill=1)
c.setFillColor(white); c.setFont('BodyB', 9.5); c.drawString(tx + 8, yy, 'Total etapa 1')
c.setFont('MonoB', 9.5)
c.drawRightString(cols[1] + 40, yy, str(E1['n'])); c.drawRightString(cols[2] + 50, yy, fmtn(E1['len'])); c.drawRightString(cols[3] + 70, yy, fmtn(E1['kg'], 0))
yy -= 24
c.setFillColor(MUTED); c.setFont('Mono', 6.8)
c.drawString(tx, yy, f"{E1['nodes']} nodos de soldadura en la cubierta. En naranja: medidas dadas por el ejecutor. En gris: supuestos de referencia pendientes de confirmar.")
c.drawString(tx, yy - 10, 'La pérgola y la cochera no están incluidas: son un trabajo aparte (etapa 2), que se ejecuta y se cotiza por separado.')
d.save()

# =================================================================== ETAPA 2
d = Doc(OUT2, 'Casa Castañeda · Etapa 2 · Pérgola y cochera',
        'CASA CASTAÑEDA · SANTA ROSA · ETAPA 2 · PÉRGOLA Y COCHERA', 2)
c = d.c

d.cover('Etapa 2 · Referencia para cotización', 'Pérgola y cochera — ángulos 3D',
        'e2_hero.jpg', (0.02, 0.05, 0.97, 0.86),
        'VISTA GENERAL. Cochera de 6,81 × 2,93 m y pérgola de 4,86 × 2,80 m. La casa aparece terminada, solo como contexto.',
        [('Columnas · 12', 'Tubo cuad. 120 × 120 × 4 mm'),
         ('Vigas · 20', 'Tubo rect. 100 × 50 × 2,5 mm'),
         ('Uniones soldadas', f"{E2['nodes']} nodos en las dos estructuras")])

d.page('Etapa 2 · Detalle y materiales', 'Cochera y pérgola — columnas y vigas')
top = H - 78
ih = d.img('s8_cochera.jpg', M, top, CW, crop=(0.20, 0.06, 0.95, 0.84))
d.img('s9_pergola.jpg', M + CW + 16, top, CW, crop=(0.13, 0.08, 0.88, 0.86))
y = top - ih - 10
d.caption(M, y, 'COCHERA — 6,81 × 2,93 m. 5 vanos, eje central continuo.', CW)
d.caption(M + CW + 16, y, 'PÉRGOLA — 4,86 × 2,80 m. 4 vanos, eje central en 4 tramos.', CW)


def struct_rows(L, Wd, Hc, bays, center_pieces):
    return [
        ('Columnas', '120×120×4', 6, 6 * (Hc - 0.05)),
        ('Largueros', '100×50×2,5', 2, 2 * L),
        ('Cabezales', '100×50×2,5', 2, 2 * Wd),
        ('Travesaños', '100×50×2,5', bays - 1, (bays - 1) * Wd),
        ('Eje central', '100×50×2,5', center_pieces, L),
    ]


COCH = struct_rows(6.81, 2.93, 2.55, 5, 1)
PERG = struct_rows(4.86, 2.80, 2.40, 4, 4)
kgm = {'120×120×4': 14.57, '100×50×2,5': 5.69}
# Verificación contra el modelo 3D
colL = sum(r[3] for r in COCH + PERG if r[0] == 'Columnas')
vigL = sum(r[3] for r in COCH + PERG if r[0] != 'Columnas')
assert abs(colL - bom['pergolaCol']['len']) < 0.05, (colL, bom['pergolaCol']['len'])
assert abs(vigL - bom['pergola']['len']) < 0.05, (vigL, bom['pergola']['len'])
assert sum(r[2] for r in COCH + PERG) == E2['n']


def struct_table(x, y, title, rows_, height_note):
    w = CW
    c.setFillColor(INK); c.setFont('BodyB', 10.5); c.drawString(x, y, title)
    c.setFillColor(MUTED); c.setFont('Mono', 6.8); c.drawString(x, y - 11, height_note)
    y -= 28
    cx = [x, x + 130, x + 240, x + 290, x + w]
    c.setFont('Mono', 6.8); c.setFillColor(MUTED)
    c.drawString(cx[0], y, 'PIEZA'); c.drawString(cx[1], y, 'TUBO (mm)')
    c.drawRightString(cx[3], y, 'CANT.'); c.drawRightString(cx[3] + 50, y, 'm'); c.drawRightString(cx[4], y, 'kg')
    c.setStrokeColor(INK); c.setLineWidth(0.7); c.line(x, y - 4, x + w, y - 4)
    y -= 17
    tot = [0, 0, 0]
    for name, tube, n, L in rows_:
        kg = L * kgm[tube]; tot[0] += n; tot[1] += L; tot[2] += kg
        c.setFillColor(TEXT); c.setFont('Body', 9); c.drawString(cx[0], y, name)
        c.setFillColor(STEEL); c.setFont('Mono', 8.5); c.drawString(cx[1], y, tube)
        c.setFillColor(TEXT); c.setFont('Mono', 9)
        c.drawRightString(cx[3], y, str(n)); c.drawRightString(cx[3] + 50, y, fmtn(L, 2)); c.drawRightString(cx[4], y, fmtn(kg, 0))
        c.setStrokeColor(LINE); c.setLineWidth(0.4); c.line(x, y - 6, x + w, y - 6)
        y -= 18
    c.setFillColor(HexColor('#3a4350')); c.rect(x, y - 5, w, 17, stroke=0, fill=1)
    c.setFillColor(white); c.setFont('BodyB', 9); c.drawString(x + 6, y, 'Subtotal')
    c.setFont('MonoB', 9)
    c.drawRightString(cx[3], y, str(tot[0])); c.drawRightString(cx[3] + 50, y, fmtn(tot[1], 2)); c.drawRightString(cx[4] - 6, y, fmtn(tot[2], 0))
    return y - 22


y0 = y - 26
e1 = struct_table(M, y0, 'Cochera · 6,81 × 2,93 m', COCH, 'altura de columna 2,55 m (referencia)')
e2 = struct_table(M + CW + 16, y0, 'Pérgola · 4,86 × 2,80 m', PERG, 'altura de columna 2,40 m (referencia)')
yb = min(e1, e2)
# Total de la etapa
c.setFillColor(INK); c.rect(M, yb - 6, W - 2 * M, 20, stroke=0, fill=1)
c.setFillColor(white); c.setFont('BodyB', 9.5); c.drawString(M + 8, yb, 'Total etapa 2')
c.setFont('MonoB', 9.5)
c.drawRightString(W - M - 8, yb,
                  f"{E2['n']} piezas   ·   {fmtn(E2['len'], 2)} m   ·   {fmtn(E2['kg'], 0)} kg   ·   {E2['nodes']} nodos de soldadura")
c.setFillColor(MUTED); c.setFont('Mono', 6.8)
c.drawString(M, yb - 22, 'Perfiles y cantidad de piezas según boceto del ejecutor (25/09/2026). Alturas y posición en el lote son de referencia. Longitudes a ejes, sin desperdicio.')
assert yb - 32 > 30, 'notas sobre el pie de página'
c.drawString(M, yb - 32, 'Trabajo independiente de la cubierta de la casa (etapa 1), que se ejecuta primero y se cotiza por separado.')
d.save()
