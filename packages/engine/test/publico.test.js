import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { calcularProyecto } from '../src/interprete.js';
import { catalogoPublico } from '../src/publico.js';

// AUDITORIA.md, H-11 (ronda 3): con el catálogo del link de cliente se debe
// dibujar exactamente lo mismo que con el completo, sin sacar los datos del
// ejecutor. Antes, quitar `factor` dejaba fuera 94 de 233 elementos (todas las
// vigas cotizadas en kg).
const p = JSON.parse(fs.readFileSync(new URL('../../../projects/casa-castaneda/elementos.json', import.meta.url), 'utf8'));

test('catálogo público: se dibujan los mismos elementos y no salen los datos del ejecutor', () => {
  const completo = calcularProyecto(p);
  const publico = calcularProyecto({ ...p, catalogo: catalogoPublico(p.catalogo) });
  assert.equal(publico.errores.length, 0);
  assert.deepEqual(publico.validos.map((e) => e.id), completo.validos.map((e) => e.id));
  for (const c of Object.values(catalogoPublico(p.catalogo))) {
    assert.ok(c.factor === undefined || c.factor === 1, 'el factor real no debe salir');
    assert.equal(c.consumos, undefined);
    assert.equal(c.dimensiones.lamina_largo, undefined);
  }
});

test('catálogo público: tableros y consumos', () => {
  const cat = {
    mel: { id: 'mel', nombre: 'Melamina 18', unidad: 'm2', dimensiones: { espesor: 0.018, lamina_largo: 2.44, lamina_ancho: 1.83, color: 0xffffff }, consumos: [{ nombre: 'Tornillo', unidad: 'und', base: 'und', factor: 8 }] },
    t50: { id: 't50', nombre: 'Tubo 50', unidad: 'kg', dimensiones: { ancho: 0.05, alto: 0.05 }, factor: 3.67 },
  };
  const elementos = [
    { id: 'a', forma: 'tablero', pieza: 'mel', geometria: { min: [0, 0, 0], max: [0.6, 0.5, 0.018], cantos: [1, 0] } },
    { id: 'b', forma: 'viga', pieza: 't50', geometria: { a: [0, 0, 0], b: [2, 0, 0] } },
  ];
  const r = calcularProyecto({ elementos, catalogo: catalogoPublico(cat) });
  assert.equal(r.errores.length, 0);
  assert.equal(r.validos.length, 2); // el tablero valida su espesor: se conserva
  const pub = catalogoPublico(cat);
  assert.deepEqual(pub.mel.dimensiones, { espesor: 0.018, color: 0xffffff });
  assert.equal(pub.t50.factor, 1);
});
