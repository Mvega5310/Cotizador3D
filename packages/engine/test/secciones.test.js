import test from 'node:test';
import assert from 'node:assert/strict';
import { seccionDesdeNombre as s } from '../src/secciones.js';

const casi = (r, ancho, alto) => {
  assert.ok(r, 'debía leer una sección');
  assert.ok(Math.abs(r.ancho - ancho) < 1e-9 && Math.abs(r.alto - alto) < 1e-9, `${JSON.stringify(r)} != ${ancho} × ${alto}`);
};

test('sección desde el nombre: tubos, madera, redondos y perfiles', () => {
  casi(s('Tubo rect. 150×50×4 mm'), 0.05, 0.15);
  casi(s('Tubo cuadrado 100x100x3 mm (LAC)'), 0.1, 0.1);
  casi(s('Viga 3″×6″'), 0.0762, 0.1524);
  casi(s('Listón 2" x 4"'), 0.0508, 0.1016);
  casi(s('Correa 10 x 5 cm'), 0.05, 0.1);
  casi(s('Tubo redondo Ø3″ x 3 mm'), 0.0762, 0.0762); // "3″ x 3 mm" también es rectangular: gana el que sea razonable
  casi(s('Tubo redondo Ø 76 mm'), 0.076, 0.076);
  casi(s('IPE 300'), 0.15, 0.3);
  casi(s('Perfil HEA 200'), 0.2, 0.2);
});

test('sección desde el nombre: lo ambiguo o absurdo no se adivina', () => {
  assert.equal(s('Viga 2x4'), null); // ¿pulgadas o mm?
  assert.equal(s('Columna principal'), null);
  assert.equal(s('Lámina 1200x2400 mm'), null); // 2,4 m no es una sección de viga
  assert.equal(s(''), null);
});
