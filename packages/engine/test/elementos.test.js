import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularProyecto, claveConsumo, consumoValido } from '../src/interprete.js';
import { calcCotizacion, calcPresupuesto } from '../src/pricing.js';

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
  // mano de obra como valor fijo, sumado al porcentaje
  const fija = calcCotizacion(calculo, { precios: { kg: 10 }, manoObraPct: 10, manoObraValor: 500 });
  casi(fija.manoObra, 300 * 0.1 + 500);
  casi(fija.total, 300 + 30 + 500);
  assert.equal(calcCotizacion(calculo, { manoObraValor: 500 }).tienePrecio, true);
  // un precio por pieza gana sobre el precio general de la unidad
  const porPieza = calcCotizacion(calculo, { precios: { und: 50, bisagra: 200 } });
  casi(porPieza.materiales, 200);
  assert.throws(() => calcCotizacion(calculo, { etapa: 99 }), /Etapa desconocida/);
});

// Ebanistería: un gabinete inferior de cocina de 60 × 56 × 72 cm en melamina
// de 18 mm con fondo de MDF de 3 mm. Cada tablero es una caja min/max; el
// lado más delgado es el espesor.
test('tablero: gabinete con canto, despiece y láminas', () => {
  const cat = {
    mel18: { id: 'mel18', nombre: 'Melamina blanca 18 mm', unidad: 'm2', dimensiones: { espesor: 0.018, lamina_largo: 2.44, lamina_ancho: 1.83 } },
    mdf3: { id: 'mdf3', nombre: 'MDF 3 mm', unidad: 'm2', dimensiones: { espesor: 0.003 } },
    bisagra: { id: 'bisagra', nombre: 'Bisagra cazoleta', unidad: 'und', dimensiones: {} },
  };
  const t = (id, nombre, pieza, min, max, cantos) => ({ id, nombre, forma: 'tablero', pieza, geometria: { min, max, ...(cantos && { cantos }) } });
  const elementos = [
    t('li', 'Lateral', 'mel18', [0, 0, 0], [0.018, 0.56, 0.72], [1, 0]),
    t('ld', 'Lateral', 'mel18', [0.582, 0, 0], [0.6, 0.56, 0.72], [1, 0]),
    t('pi', 'Piso', 'mel18', [0.018, 0, 0], [0.582, 0.56, 0.018], [1, 0]),
    t('te', 'Techo', 'mel18', [0.018, 0, 0.702], [0.582, 0.56, 0.72], [1, 0]),
    t('fo', 'Fondo', 'mdf3', [0, 0.56, 0], [0.6, 0.563, 0.72]),
    { id: 'b1', nombre: 'Bisagra', forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0.02, 0, 0.1], tam: [0.035, 0.035, 0.012] } },
    { id: 'b2', nombre: 'Bisagra', forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0.02, 0, 0.6], tam: [0.035, 0.035, 0.012] } },
  ];
  const r = calcularProyecto({ catalogo: cat, elementos });
  assert.equal(r.errores.length, 0);

  const linea = (id) => r.lineas.find((l) => l.piezaId === id);
  casi(linea('mel18').cantidad, 2 * 0.72 * 0.56 + 2 * 0.564 * 0.56, 'm2 melamina');
  casi(linea('mdf3').cantidad, 0.72 * 0.6, 'm2 fondo');
  casi(linea('bisagra').cantidad, 2);
  // canto: un borde largo de cada lateral (0,72) y de piso y techo (0,564)
  const canto = linea('mel18#canto');
  casi(canto.cantidad, 2 * 0.72 + 2 * 0.564, 'ml canto');
  assert.equal(canto.unidad, 'ml');
  assert.equal(canto.derivada, true);
  assert.equal(linea('mdf3#canto'), undefined); // sin cantos, sin línea

  // despiece: piezas iguales se agrupan; medidas de corte en mm, de mayor a menor
  const lat = r.despiece.find((d) => d.nombres.includes('Lateral'));
  assert.deepEqual([lat.largo, lat.ancho, lat.espesor, lat.cantidad], [720, 560, 18, 2]);
  const piso = r.despiece.find((d) => d.nombres.includes('Piso'));
  assert.deepEqual([piso.largo, piso.ancho, piso.cantidad], [564, 560, 2]); // piso y techo son el mismo corte
  assert.deepEqual(piso.nombres.sort(), ['Piso', 'Techo']);
  assert.equal(r.despiece.length, 3);

  const mel = r.laminas.find((l) => l.piezaId === 'mel18');
  assert.equal(mel.minimo, 1);
  assert.equal(mel.noCaben, 0);
  assert.equal(r.laminas.find((l) => l.piezaId === 'mdf3').minimo, null); // sin tamaño de lámina en el catálogo

  // el canto se cobra aparte, con su propio precio
  const c = calcCotizacion(r, { precios: { mel18: 100, 'mel18#canto': 10 } });
  casi(c.materiales, linea('mel18').cantidad * 100 + canto.cantidad * 10);
});

test('tablero: espesor que no coincide con la pieza, cantos inválidos y pieza que no cabe en la lámina', () => {
  const cat = { mel18: { id: 'mel18', nombre: 'Melamina 18', unidad: 'm2', dimensiones: { espesor: 0.018, lamina_largo: 2.44, lamina_ancho: 1.83 } } };
  const r = calcularProyecto({
    catalogo: cat,
    elementos: [
      { id: 'grueso', forma: 'tablero', pieza: 'mel18', geometria: { min: [0, 0, 0], max: [0.5, 0.5, 0.025] } },
      { id: 'cantos', forma: 'tablero', pieza: 'mel18', geometria: { min: [0, 0, 0], max: [0.5, 0.5, 0.018], cantos: [3, 0] } },
      { id: 'largo', forma: 'tablero', pieza: 'mel18', geometria: { min: [0, 0, 0], max: [2.6, 0.4, 0.018] } },
    ],
  });
  assert.deepEqual(r.errores.map((e) => e.elementoId), ['grueso', 'cantos']);
  assert.match(r.errores[0].mensaje, /25 mm.*18 mm/);
  assert.equal(r.laminas[0].noCaben, 1);
});

test('consumos por regla: pintura, soldadura, varilla y tornillos, juntos por nombre y redondeados', () => {
  const pintura = { nombre: 'Anticorrosivo (galón)', unidad: 'und', base: 'superficie', factor: 1 / 30, entero: true };
  const cat = {
    // tubo 50×50: superficie = 4 × 0,05 = 0,2 m² por metro
    t50: { nombre: 'Tubo 50×50', unidad: 'kg', dimensiones: { ancho: 0.05, alto: 0.05 }, factor: 3, consumos: [pintura, { nombre: 'Soldadura E6013', unidad: 'kg', base: 'kg', factor: 0.03 }] },
    // tubo 100×50: 0,3 m² por metro; mismo anticorrosivo (otro espacio/mayúsculas)
    t100: { nombre: 'Tubo 100×50', unidad: 'kg', dimensiones: { ancho: 0.1, alto: 0.05 }, factor: 5, consumos: [{ ...pintura, nombre: ' anticorrosivo  (Galón) ' }] },
    conc: { nombre: 'Concreto 3000 psi', unidad: 'm3', dimensiones: {}, consumos: [{ nombre: 'Acero de refuerzo', unidad: 'kg', base: 'm3', factor: 80 }] },
    mel: { nombre: 'Melamina 18', unidad: 'm2', dimensiones: { espesor: 0.018 }, consumos: [{ nombre: 'Tornillo 4×50', unidad: 'und', base: 'und', factor: 8 }] },
    malo: { nombre: 'Sin peso', unidad: 'ml', dimensiones: { ancho: 0.02, alto: 0.02 }, consumos: [{ nombre: 'Soldadura E6013', unidad: 'kg', base: 'kg', factor: 0.03 }, { nombre: '', unidad: 'kg', base: 'kg', factor: 1 }] },
  };
  const r = calcularProyecto({
    catalogo: cat,
    elementos: [
      { id: 1, forma: 'viga', pieza: 't50', geometria: { a: [0, 0, 0], b: [100, 0, 0] } }, // 100 m: 20 m², 300 kg
      { id: 2, forma: 'viga', pieza: 't100', geometria: { a: [0, 0, 0], b: [50, 0, 0] } }, // 50 m: 15 m²
      { id: 3, forma: 'volumen', pieza: 'conc', geometria: { min: [0, 0, 0], max: [2, 2, 0.5] } }, // 2 m³
      { id: 4, forma: 'tablero', pieza: 'mel', geometria: { min: [0, 0, 0], max: [0.6, 0.5, 0.018] } },
      { id: 5, forma: 'tablero', pieza: 'mel', geometria: { min: [0, 0, 0], max: [0.6, 0.5, 0.018] } },
      { id: 6, forma: 'viga', pieza: 'malo', geometria: { a: [0, 0, 0], b: [1, 0, 0] } },
    ],
  });
  const linea = (nombre) => r.lineas.find((l) => l.piezaId === claveConsumo(nombre));
  const pin = linea('Anticorrosivo (galón)');
  assert.equal(pin.cantidad, 2); // (20 + 15) / 30 = 1,17 → 2 galones
  assert.equal(pin.n, 2);
  assert.equal(pin.consumo, true);
  casi(linea('Soldadura E6013').cantidad, 300 * 0.03); // la del perfil sin peso no suma
  casi(linea('Acero de refuerzo').cantidad, 160);
  casi(linea('Tornillo 4×50').cantidad, 16);
  casi(r.total.kg, 300 + 250, 'la soldadura y el acero de refuerzo no se suman al peso de la estructura');
  assert.equal(r.total.und, 0); // el tornillo y la pintura tampoco
  assert.equal(r.errores.length, 0); // una regla mala no tumba el elemento
  assert.equal(r.avisos.length, 2);
  assert.match(r.avisos.join(' '), /no tiene esa medida/);
  assert.equal(consumoValido({ nombre: 'x', unidad: 'kg', base: 'pulgadas', factor: 1 }), false);
});

test('presupuesto: APU por ítem, desperdicio por tipo, AIU, IVA según régimen y retenciones', () => {
  const calculo = calcularProyecto({
    catalogo,
    elementos: [
      { id: 1, forma: 'viga', pieza: 'tubo50', geometria: { a: [0, 0, 0], b: [10, 0, 0] } }, // 30 kg
      { id: 2, forma: 'pieza', pieza: 'bisagra', geometria: { pos: [0, 0, 0], tam: [1, 1, 1] } }, // 1 und
    ],
  });
  const p = calcPresupuesto(calculo, {
    precios: { tubo50: 10, bisagra: 100 },
    apu: { tubo50: { manoObra: 4, equipo: 1, transporte: 0.5 } },
    desperdicioPct: 10,
  });
  const tubo = p.detalle.find((d) => d.piezaId === 'tubo50');
  const bis = p.detalle.find((d) => d.piezaId === 'bisagra');
  casi(tubo.valorUnitario, 10 * 1.1 + 4 + 1 + 0.5);
  casi(tubo.subtotal, 30 * 16.5); // la cantidad no se infla: el desperdicio encarece el material
  assert.equal(bis.desperdicioPct, 0); // lo que se cuenta por unidad no lleva desperdicio por defecto
  casi(p.costoDirecto, 30 * 16.5 + 100);
  casi(p.materiales, 30 * 11 + 100);
  casi(p.manoObra, 120);
  // el desperdicio del ítem manda sobre el general
  casi(calcPresupuesto(calculo, { precios: { bisagra: 100 }, apu: { bisagra: { desperdicioPct: 5 } } }).costoDirecto, 105);

  const cd = 1000;
  const conAiu = (iva) => calcPresupuesto(calculo, { precios: { tubo50: cd / 30 }, aiu: { a: 10, i: 5, u: 10 }, iva, retenciones: { fuente: 2, iva: 15, ica: 9.66 } });
  const obra = conAiu({ regimen: 'utilidad', tarifa: 19 });
  casi(obra.subtotal, 1250);
  casi(obra.iva.valor, 100 * 0.19); // contrato de obra: IVA solo sobre la utilidad
  casi(obra.total, 1250 + 19);
  casi(obra.retenciones.fuente, 25);
  casi(obra.retenciones.iva, 19 * 0.15);
  casi(obra.retenciones.ica, 1250 * 9.66 / 1000);
  casi(obra.neto, obra.total - obra.retenciones.total);
  casi(conAiu({ regimen: 'total' }).iva.valor, 1250 * 0.19); // venta/suministro: sobre todo, tarifa 19 por defecto
  assert.equal(conAiu({}).iva.valor, 0); // no responsable de IVA
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
