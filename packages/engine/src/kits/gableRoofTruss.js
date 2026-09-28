import * as THREE from 'three';
import { v, beam, steelMat, tileTexture } from '../helpers.js';

// Primer kit paramétrico: cubierta a dos aguas simétrica sobre cerchas
// metálicas, generalizado del patrón de casa-castaneda/src/structure.js
// (mismo mecanismo: cerchas + correas + cumbrera), pero sin el quiebre de
// pendiente, el frontón cruzado ni la pérgola de ese caso — esos quedan
// para kits futuros o para variantes de este mismo kit, no se adivinan aquí.
//
// Convención de ejes (metros), igual a casa-castaneda: X = largo, Y =
// profundidad (0 en el alero norte, `depth` en el alero sur), Z = altura.
//
// `computeBom` es matemática pura (sin Three.js): se puede llamar desde el
// servidor para guardar el cuadro de cantidades al crear un proyecto.
// `buildGableRoofTruss` sí usa Three.js/DOM (texturas por canvas) y solo
// debe llamarse en el navegador, para el visor.

export const DEFAULT_PROFILES = {
  frame: { name: 'Cercha principal', tube: 'Tubo rect. 150×50×4 mm', w: 0.05, h: 0.15, kgm: 12.06, color: 0xf26a1b },
  purlin: { name: 'Correa', tube: 'Tubo rect. 120×60×2.5 mm', w: 0.06, h: 0.12, kgm: 6.87, color: 0xffb400 },
  ridge: { name: 'Viga cumbrera', tube: 'Tubo rect. 200×70×4 mm', w: 0.07, h: 0.20, kgm: 16.45, color: 0xd9342b },
};

function geometryPlan(p) {
  const {
    length, depth, eaveHeight, ridgeHeight,
    trussCount = 5,
    purlinsPerSide = 2,
  } = p;
  if (trussCount < 2) throw new Error('trussCount debe ser al menos 2');
  if (ridgeHeight <= eaveHeight) throw new Error('ridgeHeight debe ser mayor que eaveHeight');

  const ridgeY = depth / 2;
  const slope = (ridgeHeight - eaveHeight) / ridgeY;
  const zAt = (y) => ridgeHeight - slope * Math.abs(y - ridgeY);
  const xs = Array.from({ length: trussCount }, (_, i) => (i / (trussCount - 1)) * length);
  const purlinYs = [0, depth];
  for (let k = 1; k <= purlinsPerSide; k++) {
    purlinYs.push(ridgeY - (k / (purlinsPerSide + 1)) * ridgeY);
    purlinYs.push(ridgeY + (k / (purlinsPerSide + 1)) * ridgeY);
  }
  return { length, depth, ridgeY, ridgeHeight, zAt, xs, purlinYs };
}

/** Cuadro de cantidades sin Three.js — seguro de llamar en el servidor. */
export function computeBom(p) {
  const { profiles = DEFAULT_PROFILES } = p;
  const { length, depth, ridgeY, ridgeHeight, zAt, xs, purlinYs } = geometryPlan(p);
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  const bom = { frame: { len: 0, n: 0 }, purlin: { len: 0, n: 0 }, ridge: { len: 0, n: 0 } };
  const nodeKeys = new Set();
  for (const x of xs) {
    const pts = [[x, 0, zAt(0)], [x, ridgeY, ridgeHeight], [x, depth, zAt(depth)]];
    bom.frame.len += dist(pts[0], pts[1]) + dist(pts[1], pts[2]);
    bom.frame.n += 2;
    for (const pt of pts) nodeKeys.add(pt.map(n => Math.round(n * 20)).join(','));
  }
  bom.ridge.len += length; bom.ridge.n += 1;
  for (const _y of purlinYs) { bom.purlin.len += length; bom.purlin.n += 1; }

  for (const k of Object.keys(bom)) bom[k].kg = bom[k].len * profiles[k].kgm;
  const kg = Object.values(bom).reduce((a, b) => a + b.kg, 0);
  const len = Object.values(bom).reduce((a, b) => a + b.len, 0);
  bom._total = { kg, len, nodes: nodeKeys.size };
  return bom;
}

/** Geometría Three.js para el visor — solo navegador (usa canvas para texturas). */
export function buildGableRoofTruss(p) {
  const { profiles = DEFAULT_PROFILES } = p;
  const { length, depth, ridgeY, ridgeHeight, zAt, xs, purlinYs } = geometryPlan(p);
  const bom = computeBom(p);

  const group = new THREE.Group();
  const framesGrp = new THREE.Group(), purlinsGrp = new THREE.Group(), ridgeGrp = new THREE.Group(), roofGrp = new THREE.Group(), weldGrp = new THREE.Group();
  group.add(roofGrp, framesGrp, purlinsGrp, ridgeGrp, weldGrp);

  const mat = {};
  const M = (key) => mat[key] || (mat[key] = steelMat(profiles[key].color));
  const member = (grp, key, a, b) => grp.add(beam(v(...a), v(...b), profiles[key].w, profiles[key].h, M(key)));

  const nodeKeys = new Set();
  const nodes = [];
  const addNode = (pt) => {
    const k = pt.map(n => Math.round(n * 20)).join(',');
    if (nodeKeys.has(k)) return;
    nodeKeys.add(k);
    nodes.push(pt);
  };
  for (const x of xs) {
    const pts = [[x, 0, zAt(0)], [x, ridgeY, ridgeHeight], [x, depth, zAt(depth)]];
    member(framesGrp, 'frame', pts[0], pts[1]);
    member(framesGrp, 'frame', pts[1], pts[2]);
    pts.forEach(addNode);
  }
  member(ridgeGrp, 'ridge', [0, ridgeY, ridgeHeight], [length, ridgeY, ridgeHeight]);
  for (const y of purlinYs) member(purlinsGrp, 'purlin', [0, y, zAt(y)], [length, y, zAt(y)]);

  const tex = tileTexture();
  const roofMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide });
  const ROOF_LIFT = 0.1; // la teja apoya sobre las correas, no dentro de ellas
  const roofSide = (y0, y1) => {
    const z0 = zAt(y0) + ROOF_LIFT, z1 = zAt(y1) + ROOF_LIFT;
    const slopeLen = Math.hypot(y1 - y0, z1 - z0);
    const a = v(0, y0, z0), b = v(length, y0, z0), c = v(length, y1, z1), d = v(0, y1, z1);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b, c, a, c, d]);
    const u = length / 0.30, w = slopeLen / 0.46;
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, w, 0, 0, u, w, 0, w], 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, roofMat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  };
  roofGrp.add(roofSide(0, ridgeY), roofSide(ridgeY, depth));

  const weldMat = new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffc93a, emissiveIntensity: 0.9, roughness: 0.4 });
  const sphereGeo = new THREE.SphereGeometry(0.05, 12, 10);
  for (const n of nodes) {
    const m = new THREE.Mesh(sphereGeo, weldMat);
    m.position.copy(v(...n));
    weldGrp.add(m);
  }

  const bbox = { x0: 0, x1: length, y0: 0, y1: depth, z0: 0, z1: ridgeHeight };
  return { group, bom, bbox, layers: { frames: framesGrp, purlins: purlinsGrp, ridge: ridgeGrp, roof: roofGrp, welds: weldGrp } };
}

export { defaultViewsFromBbox } from '../vistas.js';
