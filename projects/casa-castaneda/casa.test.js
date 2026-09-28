import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { calcularProyecto } from '../../packages/engine/src/interprete.js';

// Casa Castañeda expresada como datos debe dar exactamente el mismo cuadro de
// cantidades que el código artesanal original (casa-castaneda/data/bom.json).
const leer = (rel) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const proyecto = leer('./elementos.json');
const ref = leer('../../casa-castaneda/data/bom.json');

const cerca = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const claves = Object.keys(ref).filter((k) => !k.startsWith('_'));
const porUnidad = (unidad) => calcularProyecto({ ...proyecto, elementos: proyecto.elementos.map((e) => (e.forma === 'viga' ? { ...e, unidad } : e)) });

test('sin errores de interpretación', () => {
  assert.deepEqual(calcularProyecto(proyecto).errores, []);
});

test('por perfil: piezas, longitud y peso coinciden con el original', () => {
  const kg = porUnidad('kg'), ml = porUnidad('ml');
  for (const k of claves) {
    const lk = kg.lineas.find((l) => l.piezaId === k), lm = ml.lineas.find((l) => l.piezaId === k);
    assert.equal(lk.n, ref[k].n, `${k}: piezas`);
    cerca(lm.cantidad, ref[k].len, 1e-2, `${k}: longitud (m)`);
    cerca(lk.cantidad, ref[k].kg, 0.5, `${k}: peso (kg)`);
  }
});

test('por etapa: kg, longitud, piezas y nodos de soldadura', () => {
  const kg = porUnidad('kg'), ml = porUnidad('ml');
  const n = calcularProyecto(proyecto);
  for (const [etapa, clave] of [[1, 'casa'], [2, 'pergolas']]) {
    const r = ref._stage[clave];
    cerca(kg.porEtapa[etapa].totales.kg, r.kg, 1, `etapa ${etapa} kg`);
    cerca(ml.porEtapa[etapa].totales.ml, r.len, 0.05, `etapa ${etapa} longitud`);
    assert.equal(n.porEtapa[etapa].totales.und, r.nodes, `etapa ${etapa} nodos`);
    const piezas = kg.porEtapa[etapa].lineas.filter((l) => l.piezaId !== 'nodo').reduce((a, l) => a + l.n, 0);
    assert.equal(piezas, r.n, `etapa ${etapa} piezas`);
  }
  cerca(kg.total.kg, ref._total.kg, 2, 'total kg');
  assert.equal(n.total.und, ref._total.nodes, 'total nodos');
});

test('origen: lo del ejecutor confirmado, los supuestos de referencia sin confirmar', () => {
  const n = calcularProyecto(proyecto);
  const conf = (id) => n.lineas.find((l) => l.piezaId === id).confirmado;
  for (const k of ['frame', 'purlin', 'ridge', 'pergolaCol', 'pergola']) assert.equal(conf(k), true, k);
  for (const k of ['valley', 'gableRaf', 'tie']) assert.equal(conf(k), false, k);
});
