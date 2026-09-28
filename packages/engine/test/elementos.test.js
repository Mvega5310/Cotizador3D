import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularProyecto } from '../src/interprete.js';
import { calcCotizacion } from '../src/pricing.js';

const casi = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg ?? ''} ${a} != ${b}`);

const catalogo = {
  tubo50: { id: 'tubo50', nombre: 'Tubo cuad. 50×50×2 mm', unidad: 'kg', dimensiones: { ancho: 0.05, alto: 0.05 }, factor: 3.0 },
  tubo25: { id: 'tubo25', nombre: 'Tubo cuad. 25×25×1.5 mm', unidad: 'ml', dimensiones: { ancho: 0.025, alto: 0.025 }, factor: 1.2 },
  lamina: { id: 'lamina', nombre: 'Lámina cold rolled cal. 18', unidad: 'm2', dimensiones: { espesor: 0.0012 }, factor: 9.4 },
  bisagra: { id: 'bisagra', nombre: 'Bisagra de barril 5"', unidad: 'und', dimensiones: {} },
  concreto: { id: 'concreto', nombre: 'Concreto 3000 psi', unidad: 'm3', dimensiones: {} },
};

test('viga: longitud 3-4-5 y kg por factor', () => {
  const r = calcularProyecto({
    catalogo,
    elementos: [{ id: 1, forma: 'viga', pieza: 'tubo50', geometria: { a: [0, 0, 0], b: [3, 4, 0] }, unidad: 'ml' }],
  });
  casi(r.total.ml, 5);
  const kg = calcularProyecto({
    catalogo,
    elementos: [{ id: 1, forma: 'viga', pieza: 'tubo50', geometria: { a: [0, 0, 0], b: [3, 4, 0] } }],
  });
  casi(kg.total.kg, 15); // 5 m × 3.0 kg/m, unidad por defecto de la pieza
});

test('panel: área por producto cruz, m3 por espesor y kg por factor de m2', () => {
  const g = { origen: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0] };
  const m2 = calcularProyecto({ catalogo, elementos: [{ id: 1, forma: 'panel', pieza: 'lamina', geometria: g }] });
  casi(m2.total.m2, 6);
  const m3 = calcularProyecto({ catalogo, elementos: [{ id: 1, forma: 'panel', pieza: 'lamina', geometria: g, unidad: 'm3' }] });
  casi(m3.total.m3, 6 * 0.0012);
  const kg = calcularProyecto({ catalogo, elementos: [{ id: 1, forma: 'panel', pieza: 'lamina', geometria: g, unidad: 'kg' }] });
  casi(kg.total.kg, 6 * 9.4);
});

test('volumen y pieza', () => {
  const r = calcularProyecto({
    catalogo,
    elementos: [
      { id: 1, forma: 'volumen', pieza: 'concreto', geometria: { min: [0, 0, 0], max: [2, 3, 0.5] } },
      { id: 2, forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0, 0, 1], tam: [0.1, 0.05, 0.13] } },
    ],
  });
  casi(r.total.m3, 3);
  casi(r.total.und, 1);
});

test('errores explícitos: forma, pieza, geometría y unidad no disponibles', () => {
  const r = calcularProyecto({
    catalogo,
    elementos: [
      { id: 'a', forma: 'esfera', pieza: 'tubo50', geometria: {} },
      { id: 'b', forma: 'viga', pieza: 'no_existe', geometria: { a: [0, 0, 0], b: [1, 0, 0] } },
      { id: 'c', forma: 'viga', pieza: 'tubo50', geometria: { a: [0, 0, 0], b: [0, 0, 0] } },
      { id: 'd', forma: 'viga', pieza: 'bisagra', geometria: { a: [0, 0, 0], b: [1, 0, 0] } },
      { id: 'e', forma: 'viga', pieza: 'tubo25', geometria: { a: [0, 0, 0], b: [1, 0, 0] }, unidad: 'm2' },
    ],
  });
  assert.deepEqual(r.errores.map((e) => [e.elementoId, e.codigo]), [
    ['a', 'forma_desconocida'], ['b', 'pieza_desconocida'], ['c', 'geometria_invalida'],
    ['d', 'geometria_invalida'], ['e', 'unidad_no_disponible'],
  ]);
  assert.equal(r.lineas.length, 0);
  assert.equal(r.bbox, null);
});

test('etapas: cantidades separadas, con origen y estado de confirmación', () => {
  const r = calcularProyecto({
    catalogo,
    etapas: [{ numero: 1, nombre: 'Estructura' }],
    elementos: [
      { id: 1, etapa: 1, forma: 'viga', pieza: 'tubo25', geometria: { a: [0, 0, 0], b: [2, 0, 0] }, origen: 'usuario', confirmado: true },
      { id: 2, etapa: 1, forma: 'viga', pieza: 'tubo25', geometria: { a: [0, 0, 0], b: [3, 0, 0] }, origen: 'ia', confirmado: false },
      { id: 3, etapa: 2, forma: 'viga', pieza: 'tubo25', geometria: { a: [0, 0, 0], b: [4, 0, 0] } },
    ],
  });
  casi(r.porEtapa[1].totales.ml, 5);
  casi(r.porEtapa[2].totales.ml, 4);
  assert.equal(r.porEtapa[1].nombre, 'Estructura');
  assert.equal(r.porEtapa[2].nombre, 'Etapa 2');
  const l1 = r.porEtapa[1].lineas[0];
  assert.equal(l1.n, 2);
  assert.equal(l1.confirmado, false); // basta un elemento sin confirmar
  assert.deepEqual(l1.origenes.sort(), ['ia', 'usuario']);
});

test('cotización: precio por unidad, desperdicio y mano de obra', () => {
  const calculo = calcularProyecto({
    catalogo,
    elementos: [
      { id: 1, forma: 'viga', pieza: 'tubo50', geometria: { a: [0, 0, 0], b: [10, 0, 0] } }, // 30 kg
      { id: 2, forma: 'panel', pieza: 'lamina', geometria: { origen: [0, 0, 0], u: [2, 0, 0], v: [0, 0, 1] } }, // 2 m2
      { id: 3, forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0, 0, 0], tam: [1, 1, 1] } }, // 1 und
    ],
  });
  const c = calcCotizacion(calculo, { precios: { kg: 10, m2: 100, und: 50 }, desperdicioPct: 10, manoObraPct: 20 });
  casi(c.materiales, 30 * 1.1 * 10 + 2 * 1.1 * 100 + 1 * 1.1 * 50);
  casi(c.manoObra, c.materiales * 0.2);
  casi(c.total, c.materiales * 1.2);
  assert.equal(c.tienePrecio, true);
  assert.equal(calcCotizacion(calculo).tienePrecio, false);
  // un precio por pieza gana sobre el precio general de la unidad
  const porPieza = calcCotizacion(calculo, { precios: { und: 50, bisagra: 200 } });
  casi(porPieza.materiales, 200);
  assert.throws(() => calcCotizacion(calculo, { etapa: 99 }), /Etapa desconocida/);
});

// Prueba de aceptación (guía v3, §10): un producto de otro rubro, sin una
// sola línea de código propia. Portón con reja de 3 × 2 m: marco, barrotes,
// lámina inferior y bisagras, todo con las formas que ya existen.
test('portón con reja: otro rubro, solo datos', () => {
  const W = 3, H = 2;
  const marco = [
    [[0, 0, 0], [W, 0, 0]], [[0, 0, H], [W, 0, H]], [[0, 0, 0], [0, 0, H]], [[W, 0, 0], [W, 0, H]],
  ].map(([a, b], i) => ({ id: `m${i}`, nombre: 'Marco', forma: 'viga', pieza: 'tubo50', geometria: { a, b } }));
  const barrotes = [0.5, 1.0, 1.5, 2.0, 2.5].map((x, i) => ({
    id: `b${i}`, nombre: 'Barrote', forma: 'viga', pieza: 'tubo25', geometria: { a: [x, 0, 0.5], b: [x, 0, H] },
  }));
  const lamina = { id: 'l', nombre: 'Lámina inferior', forma: 'panel', pieza: 'lamina', geometria: { origen: [0, 0, 0], u: [W, 0, 0], v: [0, 0, 0.5] } };
  const bisagras = [0.2, 1.0, 1.8].map((z, i) => ({ id: `h${i}`, nombre: 'Bisagra', forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0, 0, z], tam: [0.05, 0.05, 0.13] } }));

  const r = calcularProyecto({ catalogo, elementos: [...marco, ...barrotes, lamina, ...bisagras] });
  assert.equal(r.errores.length, 0);
  casi(r.total.kg, 10 * 3.0); // marco: 3+3+2+2 = 10 m × 3.0 kg/m
  casi(r.total.ml, 5 * 1.5); // 5 barrotes de 1.5 m
  casi(r.total.m2, 1.5);
  casi(r.total.und, 3);
  casi(r.bbox.x0, -0.025); // las bisagras (0,05 m) están centradas en x=0
  casi(r.bbox.x1, 3);
  casi(r.bbox.z1, 2);
});
