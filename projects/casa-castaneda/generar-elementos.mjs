// Convierte la estructura de acero de Casa Castañeda (código artesanal en
// ../../casa-castaneda/src) en una lista de elementos como DATOS. Se ejecuta
// una sola vez para producir elementos.json; después el proyecto vive como
// datos y el motor (packages/engine) lo interpreta.
//
// No reescribe la geometría a mano: ejecuta buildSteel() del código original,
// lee cada viga que dibuja (extremos, sección) y cada nodo de soldadura, y los
// guarda tal cual. Así la conversión no puede diferir del modelo probado.
//
// Uso: node generar-elementos.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSteel } from '../../casa-castaneda/src/structure.js';
import { PROFILES, STAGE_INFO } from '../../casa-castaneda/src/params.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const r4 = (n) => Math.round(n * 1e4) / 1e4;
// three (x, y, z) -> modelo (X, Y, Z) = (x, z, y)
const aModelo = (x, y, z) => [r4(x), r4(z), r4(y)];

const { groups, weldGroup } = buildSteel();

// Qué perfil es cada viga: por grupo, y por sección donde un grupo mezcla dos.
function perfilDe(nombreGrupo, ancho, alto) {
  const es = (k) => Math.abs(PROFILES[k].w - ancho) < 1e-9 && Math.abs(PROFILES[k].h - alto) < 1e-9;
  switch (nombreGrupo) {
    case 'frames': return 'frame';
    case 'ridge': return 'ridge';
    case 'purlins': return 'purlin';
    case 'valleys': return 'valley';
    case 'ties': return 'tie';
    case 'gable': return es('gableRaf') ? 'gableRaf' : 'purlin';
    case 'pergolas': return es('pergolaCol') ? 'pergolaCol' : 'pergola';
    default: throw new Error(`grupo inesperado: ${nombreGrupo}`);
  }
}

const catalogo = {};
for (const [k, p] of Object.entries(PROFILES)) {
  catalogo[k] = { id: k, nombre: `${p.name} · ${p.tube}`, unidad: 'kg', dimensiones: { ancho: p.w, alto: p.h, color: p.color }, factor: p.kgm };
}
catalogo.nodo = { id: 'nodo', nombre: 'Nodo de soldadura', unidad: 'und', dimensiones: { color: 0xffc93a } };

const etapas = [
  { numero: 1, nombre: STAGE_INFO.casa.name },
  { numero: 2, nombre: STAGE_INFO.pergolas.name },
];

const elementos = [];
const contador = {};
for (const [nombreGrupo, grupo] of Object.entries(groups)) {
  for (const mesh of grupo.children) {
    const e = mesh.matrix.elements;
    const L = mesh.geometry.parameters.width;
    const h = mesh.geometry.parameters.height;
    const w = mesh.geometry.parameters.depth;
    const eje = [e[0], e[1], e[2]];
    const c = [e[12], e[13], e[14]];
    const clave = perfilDe(nombreGrupo, w, h);
    const p = PROFILES[clave];
    const n = (contador[clave] = (contador[clave] ?? 0) + 1);
    elementos.push({
      id: `${clave}-${n}`,
      nombre: p.name,
      forma: 'viga',
      pieza: clave,
      etapa: nombreGrupo === 'pergolas' ? 2 : 1,
      geometria: {
        a: aModelo(c[0] - (eje[0] * L) / 2, c[1] - (eje[1] * L) / 2, c[2] - (eje[2] * L) / 2),
        b: aModelo(c[0] + (eje[0] * L) / 2, c[1] + (eje[1] * L) / 2, c[2] + (eje[2] * L) / 2),
      },
      origen: p.source === 'ejecutor' ? 'usuario' : 'ia',
      confirmado: p.source === 'ejecutor',
    });
  }
}

// Nodos de soldadura: una pieza por nodo, contada en unidades.
for (const [etapa, subgrupo] of [[1, weldGroup.userData.casa], [2, weldGroup.userData.pergolas]]) {
  subgrupo.children.forEach((m, i) => {
    elementos.push({
      id: `nodo-${etapa}-${i + 1}`,
      nombre: 'Nodo de soldadura',
      forma: 'pieza',
      pieza: 'nodo',
      etapa,
      geometria: { pos: aModelo(m.position.x, m.position.y, m.position.z), tam: [0.11, 0.11, 0.11] },
      origen: 'usuario',
      confirmado: true,
    });
  });
}

const salida = { proyecto: 'Casa Castañeda · Santa Rosa', etapas, catalogo, elementos };
fs.writeFileSync(path.join(AQUI, 'elementos.json'), JSON.stringify(salida, null, 1));
console.log('elementos:', elementos.length, '| vigas:', elementos.filter((x) => x.forma === 'viga').length, '| nodos:', elementos.filter((x) => x.forma === 'pieza').length);
