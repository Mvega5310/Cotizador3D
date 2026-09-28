import * as THREE from 'three';
import { v, beam, box, steelMat } from './helpers.js';

// Biblioteca de formas del motor. Es código nuestro: la IA y los usuarios solo
// eligen una forma por su clave y llenan su `geometria` (datos). Toda forma
// nueva se agrega aquí, una vez, y queda disponible para todos los proyectos.
//
// Cada forma declara:
//   validar(g, pieza)  -> null si está bien, o un texto con el problema
//   medir(g, pieza)    -> medidas que se pueden cobrar: { ml?, m2?, m3?, und }
//   unidadBase         -> la medida sobre la que actúa `pieza.factor` para sacar kg
//   bbox(g)            -> [[xmin,ymin,zmin],[xmax,ymax,zmax]] en metros
//   dibujar(g, pieza, mat) -> THREE.Object3D (solo navegador)
//
// Coordenadas del modelo (metros): X = largo, Y = profundidad, Z = altura.

const vec3 = (a) => Array.isArray(a) && a.length === 3 && a.every(Number.isFinite);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const positivo = (n) => Number.isFinite(n) && n > 0;
const dim = (pieza) => pieza.dimensiones || {};
const color = (pieza, porDefecto) => dim(pieza).color ?? porDefecto;

function bboxDePuntos(pts) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
  return [min, max];
}

export const FORMAS = {
  // Pieza larga entre dos puntos, de sección rectangular (tubo, perfil, viga, listón).
  // geometria: { a:[x,y,z], b:[x,y,z] }   pieza.dimensiones: { ancho, alto } en m
  viga: {
    unidadBase: 'ml',
    validar(g, pieza) {
      if (!g || !vec3(g.a) || !vec3(g.b)) return 'geometria debe traer a y b como [x,y,z].';
      if (dist(g.a, g.b) < 1e-6) return 'a y b son el mismo punto.';
      if (!positivo(dim(pieza).ancho) || !positivo(dim(pieza).alto)) return 'la pieza necesita dimensiones.ancho y dimensiones.alto (m).';
      return null;
    },
    medir: (g) => ({ ml: dist(g.a, g.b), und: 1 }),
    bbox: (g) => bboxDePuntos([g.a, g.b]),
    dibujar: (g, pieza, mat) => beam(v(...g.a), v(...g.b), dim(pieza).ancho, dim(pieza).alto, mat || steelMat(color(pieza, 0x9aa3ae))),
  },

  // Superficie plana rectangular (teja, lámina, drywall, vidrio, tablero, piso).
  // geometria: { origen:[x,y,z], u:[x,y,z], v:[x,y,z] }  (u y v: vectores de los dos lados)
  // pieza.dimensiones: { espesor? (m), opacidad? (0-1) }
  panel: {
    unidadBase: 'm2',
    validar(g) {
      if (!g || !vec3(g.origen) || !vec3(g.u) || !vec3(g.v)) return 'geometria debe traer origen, u y v como [x,y,z].';
      if (norm(cross(g.u, g.v)) < 1e-9) return 'u y v no forman una superficie (son paralelos o nulos).';
      return null;
    },
    medir(g, pieza) {
      const m2 = norm(cross(g.u, g.v));
      const m = { m2, und: 1 };
      if (positivo(dim(pieza).espesor)) m.m3 = m2 * dim(pieza).espesor;
      return m;
    },
    bbox: (g) => bboxDePuntos([g.origen, sumar(g.origen, g.u), sumar(g.origen, g.v), sumar(sumar(g.origen, g.u), g.v)]),
    dibujar(g, pieza, mat) {
      const p0 = g.origen, p1 = sumar(p0, g.u), p3 = sumar(p0, g.v), p2 = sumar(p1, g.v);
      const geo = new THREE.BufferGeometry().setFromPoints([p0, p1, p2, p0, p2, p3].map((p) => v(...p)));
      geo.computeVertexNormals();
      const op = dim(pieza).opacidad ?? 1;
      const m = mat || new THREE.MeshStandardMaterial({ color: color(pieza, 0xb59f7f), roughness: 0.7, side: THREE.DoubleSide, transparent: op < 1, opacity: op });
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    },
  },

  // Sólido en forma de caja (concreto, relleno, excavación, bloque macizo).
  // geometria: { min:[x,y,z], max:[x,y,z] }
  volumen: {
    unidadBase: 'm3',
    validar(g) {
      if (!g || !vec3(g.min) || !vec3(g.max)) return 'geometria debe traer min y max como [x,y,z].';
      if (![0, 1, 2].every((i) => g.max[i] > g.min[i])) return 'max debe ser mayor que min en los tres ejes.';
      return null;
    },
    medir: (g) => ({ m3: (g.max[0] - g.min[0]) * (g.max[1] - g.min[1]) * (g.max[2] - g.min[2]), und: 1 }),
    bbox: (g) => [g.min, g.max],
    dibujar: (g, pieza, mat) => box(g.min[0], g.min[1], g.min[2], g.max[0], g.max[1], g.max[2],
      mat || new THREE.MeshStandardMaterial({ color: color(pieza, 0xc9c3b6), roughness: 0.9 })),
  },

  // Objeto que se cuenta por unidad (puerta, ventana, luminaria, mueble, equipo).
  // Se dibuja como una caja de tamaño `tam` centrada en `pos`.
  // geometria: { pos:[x,y,z], tam:[dx,dy,dz] }
  pieza: {
    unidadBase: 'und',
    validar(g) {
      if (!g || !vec3(g.pos) || !vec3(g.tam)) return 'geometria debe traer pos y tam como [x,y,z].';
      if (!g.tam.every(positivo)) return 'tam debe ser positivo en los tres ejes.';
      return null;
    },
    medir: () => ({ und: 1 }),
    bbox: (g) => [[0, 1, 2].map((i) => g.pos[i] - g.tam[i] / 2), [0, 1, 2].map((i) => g.pos[i] + g.tam[i] / 2)],
    dibujar: (g, pieza, mat) => box(
      g.pos[0] - g.tam[0] / 2, g.pos[1] - g.tam[1] / 2, g.pos[2] - g.tam[2] / 2,
      g.pos[0] + g.tam[0] / 2, g.pos[1] + g.tam[1] / 2, g.pos[2] + g.tam[2] / 2,
      mat || new THREE.MeshStandardMaterial({ color: color(pieza, 0xb8b2a4), roughness: 0.8 })),
  },
};

function sumar(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
