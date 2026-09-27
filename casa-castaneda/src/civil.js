import * as THREE from 'three';
import { P, roofZ } from './params.js';
import { v, mats, box, addEdges } from './helpers.js';

const FZ = P.floorZ;

// ---------- Terreno, losa y adoquines ----------
export function buildGround() {
  const g = new THREE.Group();
  const out = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mats.groundOut);
  out.rotation.x = -Math.PI / 2;
  out.position.set(7, -0.02, 4);
  out.receiveShadow = true;
  g.add(out);
  // Lote (31.16 / 30.05 m de frente)
  const LX0 = -7.65, LX1 = 22.4, LY0 = -2.95, LY1 = 11.9;
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(LX1 - LX0, LY1 - LY0), mats.ground);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set((LX0 + LX1) / 2, -0.005, (LY0 + LY1) / 2);
  lot.receiveShadow = true;
  g.add(lot);
  const pts = [v(LX0, LY0, 0.01), v(LX1, LY0, 0.01), v(LX1, LY1, 0.01), v(LX0, LY1, 0.01), v(LX0, LY0, 0.01)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xc0392b, dashSize: 0.6, gapSize: 0.3 }));
  line.computeLineDistances();
  g.add(line);
  // Adoquines (huellas de circulación peatonal)
  const pav = new THREE.Group();
  for (let x = 4.4; x < 17.2; x += 0.6) pav.add(box(x, -1.15, 0, x + 0.45, -0.7, 0.05, mats.paver));
  for (let x = 4.4; x < 10.0; x += 0.6) pav.add(box(x, 9.35, 0, x + 0.45, 9.8, 0.05, mats.paver));
  for (let y = -0.2; y < 9.4; y += 0.6) pav.add(box(-1.3, y, 0, -0.85, y + 0.45, 0.05, mats.paver));
  g.add(pav);
  return g;
}

export function buildPlinth() {
  const g = new THREE.Group();
  g.add(box(-0.12, -0.12, 0, P.houseL + 0.12, P.houseD + 0.12, FZ, mats.plinth, true));
  // Escalones de acceso oeste
  g.add(box(-0.6, 2.2, 0, -0.12, 3.4, FZ * 0.55, mats.plinth, true));
  return g;
}

// ---------- Muros ----------
// Cada muro es un polígono vertical extruido; la coronación sigue la cubierta.
function wallMesh(x0, y0, x1, y1, opts = {}) {
  const t = opts.t || P.wallT;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const doors = opts.doors || [];
  const windows = opts.windows || [];
  const flat = opts.flatTop;
  const topAt = (s) => {
    if (flat !== undefined) return flat;
    const x = x0 + (dx * s) / len, y = y0 + (dy * s) / len;
    return Math.max(FZ + 2.2, roofZ(x, y) - 0.36);
  };
  // Cortes en puertas: el muro se divide en tramos
  const cuts = [0, ...doors.flatMap(d => d), len].sort((a, b) => a - b);
  const grp = new THREE.Group();
  const step = 0.2;
  const buildPiece = (s0, s1, zb, holes = []) => {
    if (s1 - s0 < 0.01) return;
    const sh = new THREE.Shape();
    const samples = [];
    for (let s = s0; s < s1; s += step) samples.push(s);
    samples.push(s1);
    // Puntos de quiebre de cubierta para que la coronación siga el perfil
    sh.moveTo(s0, zb);
    sh.lineTo(s1, zb);
    for (let i = samples.length - 1; i >= 0; i--) sh.lineTo(samples[i], topAt(samples[i]));
    sh.lineTo(s0, zb);
    for (const h of holes) {
      const p = new THREE.Path();
      p.moveTo(h[0], h[2]); p.lineTo(h[1], h[2]); p.lineTo(h[1], h[3]); p.lineTo(h[0], h[3]); p.lineTo(h[0], h[2]);
      sh.holes.push(p);
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
    geo.translate(0, 0, -t / 2);
    const m = new THREE.Mesh(geo, mats.wall);
    m.castShadow = true; m.receiveShadow = true;
    addEdges(m, 0x77726a, 0.5, 35);
    grp.add(m);
  };
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1];
    const isDoor = doors.some(d => Math.abs(d[0] - s0) < 1e-6 && Math.abs(d[1] - s1) < 1e-6);
    if (isDoor) {
      // dintel sobre la puerta (2.10 m)
      buildPiece(s0, s1, FZ + 2.1);
      continue;
    }
    const holes = windows
      .filter(w => w[0] >= s0 - 1e-6 && w[1] <= s1 + 1e-6)
      .map(w => [w[0], w[1], FZ + w[2], FZ + w[3]]);
    buildPiece(s0, s1, FZ, holes);
  }
  // Vidrios y marcos
  for (const w of windows) {
    const wl = w[1] - w[0], wh = w[3] - w[2];
    const gm = new THREE.Mesh(new THREE.BoxGeometry(wl, wh, 0.02), mats.glass);
    gm.position.set((w[0] + w[1]) / 2, FZ + (w[2] + w[3]) / 2, 0);
    gm.userData.isGlass = true;
    grp.add(gm);
    const f = 0.05;
    const fr = [
      [wl, f, 0, wh / 2 - f / 2], [wl, f, 0, -wh / 2 + f / 2],
      [f, wh, -wl / 2 + f / 2, 0], [f, wh, wl / 2 - f / 2, 0],
    ];
    for (const q of fr) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(q[0], q[1], 0.07), mats.frameDark);
      b.position.set((w[0] + w[1]) / 2 + q[2], FZ + (w[2] + w[3]) / 2 + q[3], 0);
      grp.add(b);
    }
  }
  // Colocación: eje local x -> dirección del muro (three: dir = (dx, 0, dy))
  const ang = -Math.atan2(dy, dx);
  grp.rotation.y = ang;
  grp.position.set(x0, 0, y0);
  return grp;
}

export function buildWalls() {
  const g = new THREE.Group();
  const W = (a, b, o) => g.add(wallMesh(a[0], a[1], b[0], b[1], o));
  const L = P.houseL, D = P.houseD;
  // Perímetro
  W([0, 0], [L, 0], { windows: [[1.0, 2.4, 1.1, 2.1], [5.4, 6.6, 1.5, 2.1], [8.0, 8.8, 1.5, 2.1], [12.4, 14.4, 0.9, 2.3]] });
  W([0, 0], [0, D], { windows: [[1.2, 2.1, 1.0, 2.1], [3.7, 4.6, 1.0, 2.1]], doors: [[2.3, 3.4]] });
  W([0, D], [4.65, D], { windows: [[1.1, 3.4, 0.2, 2.3]] });
  W([9.95, D], [L, D], { windows: [[1.35, 3.45, 0.9, 2.3]] });
  W([L, 0], [L, 3.3], { windows: [[1.0, 3.0, 0.9, 2.3]] });
  W([L, 5.5], [L, D], { windows: [[1.1, 2.9, 0.9, 2.3]] });
  // Cocina / baño
  W([4.1, 0], [4.1, 2.5]);
  W([4.1, 2.5], [10.4, 2.5], { doors: [[1.3, 2.3]] });
  W([10.4, 0], [10.4, 2.5]);
  W([10.4, 2.5], [10.95, 2.5]);
  W([10.95, 2.5], [10.95, 3.3]);
  // Habitación 01
  W([12.0, 3.3], [L, 3.3]);
  W([14.8, 3.3], [14.8, 4.5]);
  // Habitación 02
  W([9.95, 5.5], [11.0, 5.5]);
  W([12.0, 5.5], [L, 5.5]);
  W([9.95, 5.5], [9.95, D]);
  // Sala y terraza
  W([4.65, 5.4], [4.65, D]);
  W([4.65, 6.8], [5.65, 6.8]);
  W([8.95, 6.8], [9.95, 6.8]);
  // Puerta corrediza a terraza
  const sd = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.2, 0.03), mats.glass);
  sd.position.set(7.3, FZ + 1.1, 6.8);
  sd.userData.isGlass = true;
  g.add(sd);
  return g;
}

// ---------- Mobiliario (referencia de escala) ----------
export function buildFurniture() {
  const g = new THREE.Group();
  const F = mats.furn, D = mats.furnDark;
  const add = (x0, y0, x1, y1, h, m = F, z0 = FZ) => g.add(box(x0, y0, z0, x1, y1, z0 + h, m, true));
  // Camas
  add(12.6, 0.35, 14.4, 2.35, 0.45); add(12.6, 0.35, 14.4, 0.55, 1.05, D);
  add(12.6, 6.6, 14.4, 8.6, 0.45); add(12.6, 8.4, 14.4, 8.6, 1.05, D);
  // Escritorio (estudio)
  add(11.4, 3.5, 13.9, 4.05, 0.75, D);
  // Comedor
  add(6.6, 3.9, 8.0, 5.0, 0.75, D);
  for (const [cx, cy] of [[6.9, 3.7], [7.7, 3.7], [6.9, 5.2], [7.7, 5.2]]) add(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 0.45);
  // Sala
  add(0.4, 7.6, 2.9, 8.5, 0.5, D);
  add(3.7, 5.6, 4.5, 8.4, 0.5, D);
  add(0.8, 4.6, 1.7, 5.4, 0.45); add(2.4, 4.6, 3.3, 5.4, 0.45);
  // Cocina (mesón)
  add(0.2, 0.2, 3.9, 0.85, 0.9, D);
  add(3.5, 0.85, 3.9, 2.3, 0.9, D);
  // Baño
  add(5.2, 0.2, 6.3, 0.75, 0.85, D);
  return g;
}

// ---------- Bodega ----------
export function buildBodega() {
  const g = new THREE.Group();
  const x0 = 20.4, x1 = 22.1, y0 = -1.5, y1 = 0.5;
  g.add(box(x0, y0, 0, x1, y1, 2.35, mats.wall, true));
  // Cubierta a una agua
  const roof = box(x0 - 0.15, y0 - 0.15, 2.35, x1 + 0.15, y1 + 0.15, 2.45, mats.plinth, true);
  g.add(roof);
  return g;
}

// ---------- Vehículos ----------
export function buildCars() {
  const g = new THREE.Group();
  const prof = new THREE.Shape();
  const pts = [[-2.35, 0.22], [2.35, 0.22], [2.35, 0.62], [1.75, 0.78], [0.95, 0.86], [0.55, 1.36], [-0.95, 1.36], [-1.45, 0.92], [-2.35, 0.82]];
  prof.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) prof.lineTo(pts[i][0], pts[i][1]);
  prof.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(prof, { depth: 1.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  bodyGeo.translate(0, 0, -0.85);
  const car = (cx, cy, color) => {
    const c = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.65 }));
    body.castShadow = true;
    c.add(body);
    for (const [wx, wz] of [[-1.45, -0.82], [1.45, -0.82], [-1.45, 0.82], [1.45, 0.82]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18), mats.frameDark);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.33, wz);
      c.add(w);
    }
    c.position.set(cx, 0, cy);
    return c;
  };
  g.add(car(-4.5, -1.6, 0x4b5563), car(-1.9, -1.6, 0x8b3a3a));
  return g;
}

// Etiquetas de espacios (x, y, texto)
export const ROOM_LABELS = [
  ['Cocina', 2.0, 1.6], ['Baño', 7.3, 1.3], ['Sala', 2.2, 6.4], ['Comedor', 7.3, 4.4],
  ['Estudio', 12.6, 4.4], ['Labores', 15.7, 4.4], ['Hab. 01', 14.6, 1.5], ['Hab. 02', 14.4, 7.4],
  ['Terraza', 7.3, 8.0], ['Cochera', -3.25, -1.6], ['Bodega', 21.25, -0.5], ['Pérgola', -1.75, 6.15],
];
