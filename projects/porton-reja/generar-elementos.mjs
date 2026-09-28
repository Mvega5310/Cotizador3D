// Portón con reja de 3 × 2 m como lista de elementos (datos). Ejemplo de un
// producto de otro rubro que usa el mismo motor sin código propio.
// Uso: node generar-elementos.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const W = 3, H = 2;

const catalogo = {
  tubo50: { id: 'tubo50', nombre: 'Tubo cuadrado 50×50×2 mm', unidad: 'kg', dimensiones: { ancho: 0.05, alto: 0.05, color: 0x5d6b78 }, factor: 3.0 },
  tubo25: { id: 'tubo25', nombre: 'Tubo cuadrado 25×25×1,5 mm', unidad: 'ml', dimensiones: { ancho: 0.025, alto: 0.025, color: 0x9aa3ae }, factor: 1.2 },
  lamina: { id: 'lamina', nombre: 'Lámina cold rolled cal. 18', unidad: 'm2', dimensiones: { espesor: 0.0012, color: 0xc8541c }, factor: 9.4 },
  bisagra: { id: 'bisagra', nombre: 'Bisagra de barril 5"', unidad: 'und', dimensiones: { color: 0x2a2f36 } },
};

const marco = [
  [[0, 0, 0], [W, 0, 0]], [[0, 0, H], [W, 0, H]], [[0, 0, 0], [0, 0, H]], [[W, 0, 0], [W, 0, H]],
].map(([a, b], i) => ({ id: `marco-${i + 1}`, nombre: 'Marco', forma: 'viga', pieza: 'tubo50', etapa: 1, geometria: { a, b }, origen: 'usuario', confirmado: true }));

const barrotes = [0.5, 1.0, 1.5, 2.0, 2.5].map((x, i) => ({
  id: `barrote-${i + 1}`, nombre: 'Barrote', forma: 'viga', pieza: 'tubo25', etapa: 1, geometria: { a: [x, 0, 0.5], b: [x, 0, H] }, origen: 'usuario', confirmado: true,
}));

const lamina = { id: 'lamina-1', nombre: 'Lámina inferior', forma: 'panel', pieza: 'lamina', etapa: 1, geometria: { origen: [0, 0, 0], u: [W, 0, 0], v: [0, 0, 0.5] }, origen: 'usuario', confirmado: true };

const bisagras = [0.2, 1.0, 1.8].map((z, i) => ({
  id: `bisagra-${i + 1}`, nombre: 'Bisagra', forma: 'pieza', pieza: 'bisagra', etapa: 1, geometria: { pos: [0, 0, z], tam: [0.06, 0.06, 0.13] }, origen: 'usuario', confirmado: true,
}));

const salida = {
  proyecto: 'Portón con reja 3 × 2 m',
  etapas: [{ numero: 1, nombre: 'Fabricación del portón' }],
  catalogo,
  elementos: [...marco, ...barrotes, lamina, ...bisagras],
};
fs.writeFileSync(path.join(AQUI, 'elementos.json'), JSON.stringify(salida, null, 1));
console.log('elementos:', salida.elementos.length);
