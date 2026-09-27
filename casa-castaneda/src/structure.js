import * as THREE from 'three';
import { P, PROFILES, STAGES, FRAMES_X, PURLIN_OFFS, mainZ, mainZext, gableZ, roofZ, valleyHalfW } from './params.js';
import { v, mats, beam, box, steelMat, tileTexture, addEdges } from './helpers.js';

const T_ROOF = 0.09; // teja + listón

// ============ CUBIERTA DE TEJA ============
function roofPolys() {
  const x0 = P.roofX0, x1 = P.roofX0 + P.roofL, xc = P.gableXc, hw = P.gableW / 2;
  const { yNorthEave: yNE, yKinkN, ridgeY, yKinkS, ySouthEave: ySE, yGableFront: yF } = P;
  const zMain = (x, y) => mainZ(y);
  const zExt = (x, y) => mainZext(y);
  const uvMain = (x, y, k) => [x / 0.30, (y * Math.sqrt(1 + k * k)) / 0.46];
  return [
    { poly: [[x0, yKinkN], [x1, yKinkN], [x1, ridgeY], [x0, ridgeY]], z: zMain, k: P.slopeUp },
    { poly: [[x0, yNE], [x1, yNE], [x1, yKinkN], [x0, yKinkN]], z: zMain, k: P.slopeLowN },
    { poly: [[x0, ridgeY], [x1, ridgeY], [x1, yKinkS], [x0, yKinkS]], z: zMain, k: P.slopeUp },
    { poly: [[x0, yKinkS], [xc, yKinkS], [xc - hw, yF], [xc - hw, ySE], [x0, ySE]], z: zExt, k: P.slopeLowS },
    { poly: [[xc, yKinkS], [x1, yKinkS], [x1, ySE], [xc + hw, ySE], [xc + hw, yF]], z: zExt, k: P.slopeLowS },
    { poly: [[xc, yKinkS], [xc, yF], [xc - hw, yF]], z: gableZ, gable: true },
    { poly: [[xc, yKinkS], [xc + hw, yF], [xc, yF]], z: gableZ, gable: true },
  ].map(p => ({ ...p, uv: p.gable
    ? (x, y) => [y / 0.30, (Math.abs(x - xc) * Math.sqrt(1 + P.gableSlope ** 2)) / 0.46]
    : (x, y) => uvMain(x, y, p.k) }));
}

function swapWinding(geo) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    for (const a of [pos, uv]) {
      if (!a) continue;
      const s = a.itemSize;
      for (let c = 0; c < s; c++) {
        const t = a.array[(i + 1) * s + c];
        a.array[(i + 1) * s + c] = a.array[(i + 2) * s + c];
        a.array[(i + 2) * s + c] = t;
      }
    }
  }
}

export function buildRoofTiles() {
  const g = new THREE.Group();
  const tex = tileTexture();
  const tileMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.02 });
  const underMat = new THREE.MeshStandardMaterial({ color: 0xb59f7f, roughness: 0.9 });
  for (const rp of roofPolys()) {
    const shape = new THREE.Shape(rp.poly.map(p => new THREE.Vector2(p[0], p[1])));
    // Cara superior con textura de teja
    const top = new THREE.ShapeGeometry(shape).toNonIndexed();
    const tp = top.attributes.position, tu = top.attributes.uv;
    for (let i = 0; i < tp.count; i++) {
      const X = tp.getX(i), Y = tp.getY(i);
      const [uu, vv] = rp.uv(X, Y);
      tu.setXY(i, uu, vv);
      tp.setXYZ(i, X, rp.z(X, Y) + 0.002, Y);
    }
    swapWinding(top);
    top.computeVertexNormals();
    const mt = new THREE.Mesh(top, tileMat);
    mt.castShadow = true; mt.receiveShadow = true;
    g.add(mt);
    // Espesor + cara inferior
    const ex = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    const ep = ex.attributes.position;
    for (let i = 0; i < ep.count; i++) {
      const X = ep.getX(i), Y = ep.getY(i), vz = ep.getZ(i);
      ep.setXYZ(i, X, rp.z(X, Y) - (1 - vz) * T_ROOF, Y);
    }
    swapWinding(ex);
    ex.computeVertexNormals();
    const me = new THREE.Mesh(ex, underMat);
    me.castShadow = true;
    g.add(me);
  }
  // Cumbreras (remates de teja)
  const capMat = new THREE.MeshStandardMaterial({ color: 0x9c4425, roughness: 0.7 });
  const x0 = P.roofX0, x1 = P.roofX0 + P.roofL;
  const cap = (p0, p1) => {
    const d = new THREE.Vector3().subVectors(p1, p0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, d.length(), 14, 1, false, 0, Math.PI * 2), capMat);
    c.position.copy(p0).add(p1).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    c.castShadow = true;
    return c;
  };
  g.add(cap(v(x0, P.ridgeY, P.ridgeZ + 0.03), v(x1, P.ridgeY, P.ridgeZ + 0.03)));
  g.add(cap(v(P.gableXc, P.yKinkS, P.gableZr + 0.03), v(P.gableXc, P.yGableFront, P.gableZr + 0.03)));
  // Limahoyas (canal visible)
  const valleyMat = new THREE.MeshStandardMaterial({ color: 0x4d2416, roughness: 0.8 });
  for (const sg of [-1, 1]) {
    const a = v(P.gableXc, P.yKinkS, P.kinkZ + 0.012);
    const b = v(P.gableXc + sg * P.gableW / 2, P.yGableFront, mainZext(P.yGableFront) + 0.012);
    g.add(beam(a, b, 0.14, 0.02, valleyMat));
  }
  return g;
}

// ============ ESTRUCTURA DE ACERO ============
export function buildSteel() {
  const groups = {
    frames: new THREE.Group(), ridge: new THREE.Group(), purlins: new THREE.Group(),
    gable: new THREE.Group(), valleys: new THREE.Group(), ties: new THREE.Group(), pergolas: new THREE.Group(),
  };
  const bom = {};
  for (const k of ['frame', 'ridge', 'purlin', 'valley', 'gableRaf', 'tie', 'pergolaCol', 'pergola']) bom[k] = { len: 0, n: 0 };
  // Nodos de soldadura, separados por etapa de obra
  const nodeSet = () => {
    const list = [], keys = new Set();
    const add = (X, Y, Z) => {
      const k = [X, Y, Z].map(n => Math.round(n * 20)).join(',');
      if (keys.has(k)) return;
      keys.add(k);
      list.push([X, Y, Z]);
    };
    return { list, add };
  };
  const roofNodes = nodeSet(), pergNodes = nodeSet();
  const addNode = roofNodes.add;
  const M = (key, grp) => {
    grp.userData.mats = grp.userData.mats || {};
    return grp.userData.mats[key] || (grp.userData.mats[key] = steelMat(PROFILES[key].color));
  };
  const member = (grp, key, a, b, w, h) => {
    const p = PROFILES[key];
    const bm = beam(v(...a), v(...b), w ?? p.w, h ?? p.h, M(key, grp));
    grp.add(bm);
    bom[key].len += bm.userData.length;
    bom[key].n += 1;
    return bm;
  };

  const x0 = P.roofX0 + 0.02, x1 = P.roofX0 + P.roofL - 0.02;
  const { yNorthEave: yNE, yKinkN, ridgeY, yKinkS, ySouthEave: ySE, yGableFront: yF } = P;
  const xc = P.gableXc, hwF = P.gableW / 2;

  // --- Cerchas principales (7) ---
  const zFrame = (x, y) => roofZ(x, y) - 0.21;
  FRAMES_X.forEach((fx, i) => {
    const ys = [yNE, yKinkN, ridgeY, yKinkS, ySE];
    if (i >= 2 && i <= 4) ys.push(yF);
    const pts = ys.map(y => [fx, y, zFrame(fx, y)]);
    for (let k = 0; k < pts.length - 1; k++) member(groups.frames, 'frame', pts[k], pts[k + 1]);
    for (let k = 1; k < pts.length - 1; k++) addNode(...pts[k]);
  });

  // --- Viga cumbrera doble ---
  for (const dy of [-0.09, 0.09]) {
    member(groups.ridge, 'ridge', [x0, ridgeY + dy, P.ridgeZ - 0.11], [x1, ridgeY + dy, P.ridgeZ - 0.11]);
  }
  FRAMES_X.forEach(fx => addNode(fx, ridgeY - 0.09, P.ridgeZ - 0.13));

  // --- Correas ---
  const purlinAt = (y, offLabel) => {
    const z = mainZ(y) - 0.15;
    let ints = [[x0, x1]];
    if (y > yKinkS + 1e-6) {
      const hw = valleyHalfW(y);
      if (hw > 0) ints = [[x0, xc - hw], [xc + hw, x1]];
    }
    for (const [a, b] of ints) {
      if (b - a < 0.1) continue;
      member(groups.purlins, 'purlin', [a, y, z], [b, y, z]);
      FRAMES_X.forEach(fx => { if (fx > a + 0.01 && fx < b - 0.01) addNode(fx, y, zFrame(fx, y) + 0.1); });
      if (Math.abs(a - x0) > 1e-6) addNode(a, y, z);
      if (Math.abs(b - x1) > 1e-6) addNode(b, y, z);
    }
  };
  for (const sg of [-1, 1]) {
    for (const off of [...PURLIN_OFFS, P.eaveOff - 0.06]) purlinAt(ridgeY + sg * off);
  }

  // --- Limahoyas ---
  for (const sg of [-1, 1]) {
    const a = [xc, yKinkS, P.kinkZ - 0.21];
    const b = [xc + sg * hwF, yF, mainZext(yF) - 0.21];
    member(groups.valleys, 'valley', a, b);
    addNode(...a); addNode(...b);
  }

  // --- Frontón: cerchuelas (x) y correas (y) ---
  const gz = (x, y) => gableZ(x, y);
  for (const yy of [yF, yF - 1.25, yF - 2.45]) {
    const hw = valleyHalfW(yy);
    for (const sg of [-1, 1]) {
      const a = [xc, yy, gz(xc, yy) - 0.21], b = [xc + sg * hw, yy, gz(xc + sg * hw, yy) - 0.21];
      member(groups.gable, 'gableRaf', a, b);
      addNode(...b);
    }
    addNode(xc, yy, gz(xc, yy) - 0.21);
  }
  for (const dx of [-2.16, -1.0, 1.0, 2.16]) {
    const yStart = yKinkS + (Math.abs(dx) / hwF) * (yF - yKinkS);
    const a = [xc + dx, yStart, gz(xc + dx, yStart) - 0.15];
    const b = [xc + dx, yF, gz(xc + dx, yF) - 0.15];
    member(groups.gable, 'purlin', a, b);
    for (const yy of [yF, yF - 1.25, yF - 2.45]) if (yy > yStart + 0.05) addNode(xc + dx, yy, gz(xc + dx, yy) - 0.15);
  }

  // --- Soleras de amarre: un amarre corto (2 m) por cada cercha, sobre la
  // cumbrera, uniendo los dos faldones a la altura del nudo superior.
  // Referencia de 24/09/2026: 7 tramos de ~2 m (antes 9 tramos largos de
  // muro, que sobreestimaban la longitud real).
  const TIE_HALF = 1.0;
  const tieLines = FRAMES_X.map(fx => [fx, ridgeY - TIE_HALF, fx, ridgeY + TIE_HALF]);
  for (const [ax, ay, bx, by] of tieLines) {
    const za = roofZ(ax, ay) - 0.31, zb = roofZ(bx, by) - 0.31;
    member(groups.ties, 'tie', [ax, ay, za], [bx, by, zb]);
  }

  // --- Pérgola oeste y cochera (boceto del ejecutor, 25/09/2026) ---
  // Columnas: tubo cuadrado 120×120×4. Todo lo demás (marco perimetral,
  // travesaños y eje central): tubo rectangular 100×50×2.5, en la misma
  // cantidad de piezas que aparecen en el dibujo.
  const col = (px, py, H) => member(groups.pergolas, 'pergolaCol', [px, py, 0.05], [px, py, H]);
  const vg = (a, b) => member(groups.pergolas, 'pergola', a, b);
  // Marco rectangular con el lado largo en `long` ('x' o 'y').
  const frameRect = ({ X0, X1, Y0, Y1, H, long, bays, centerPieces }) => {
    const z = H + 0.05;
    const L0 = long === 'x' ? X0 : Y0, L1 = long === 'x' ? X1 : Y1;
    const S0 = long === 'x' ? Y0 : X0, S1 = long === 'x' ? Y1 : X1;
    const P = (l, s) => (long === 'x' ? [l, s, z] : [s, l, z]);
    const Lm = (L0 + L1) / 2, Sm = (S0 + S1) / 2;
    // 6 columnas: 4 esquinas + 2 intermedias en los lados largos
    for (const [l, s] of [[L0, S0], [L1, S0], [L0, S1], [L1, S1], [Lm, S0], [Lm, S1]]) {
      const [px, py] = long === 'x' ? [l, s] : [s, l];
      col(px, py, H);
      pergNodes.add(...P(l, s));
    }
    // Marco perimetral: 2 largueros + 2 cabezales
    vg(P(L0, S0), P(L1, S0)); vg(P(L0, S1), P(L1, S1));
    vg(P(L0, S0), P(L0, S1)); vg(P(L1, S0), P(L1, S1));
    // Travesaños interiores, repartidos en `bays` vanos iguales
    const stations = [];
    for (let k = 1; k < bays; k++) stations.push(L0 + (k * (L1 - L0)) / bays);
    for (const l of stations) {
      vg(P(l, S0), P(l, S1));
      pergNodes.add(...P(l, S0)); pergNodes.add(...P(l, S1)); pergNodes.add(...P(l, Sm));
    }
    pergNodes.add(...P(L0, Sm)); pergNodes.add(...P(L1, Sm));
    // Eje central: una pieza continua o una por vano
    if (centerPieces === 1) vg(P(L0, Sm), P(L1, Sm));
    else {
      const cuts = [L0, ...stations, L1];
      for (let k = 0; k < cuts.length - 1; k++) vg(P(cuts[k], Sm), P(cuts[k + 1], Sm));
    }
  };
  // Cochera 6.81 × 2.93 m: 5 vanos, 4 travesaños, eje central continuo
  frameRect({ X0: -6.91, X1: -0.10, Y0: -2.90, Y1: 0.03, H: 2.55, long: 'x', bays: 5, centerPieces: 1 });
  // Pérgola oeste 4.86 × 2.80 m: 4 vanos, 3 travesaños, eje central en 4 tramos
  frameRect({ X0: -3.15, X1: -0.35, Y0: 3.745, Y1: 8.605, H: 2.40, long: 'y', bays: 4, centerPieces: 4 });
  // Techo de policarbonato de la cochera (no cuenta en acero)
  const carportRoof = box(-6.96, -2.95, 2.66, -0.05, 0.08, 2.70, mats.poly);
  carportRoof.userData.carport = true;

  // --- Nodos de soldadura ---
  const weldGroup = new THREE.Group();
  const sg = new THREE.SphereGeometry(0.055, 12, 10);
  const weldSub = (list) => {
    const g = new THREE.Group();
    for (const n of list) {
      const m = new THREE.Mesh(sg, mats.weld);
      m.position.copy(v(...n));
      g.add(m);
    }
    weldGroup.add(g);
    return g;
  };
  weldGroup.userData.casa = weldSub(roofNodes.list);
  weldGroup.userData.pergolas = weldSub(pergNodes.list);

  // Totales por elemento, por etapa y generales
  let kg = 0, len = 0;
  for (const k of Object.keys(bom)) {
    bom[k].kg = bom[k].len * PROFILES[k].kgm;
    kg += bom[k].kg; len += bom[k].len;
  }
  const stage = (keys, nodeList) => ({
    keys,
    kg: keys.reduce((a, k) => a + bom[k].kg, 0),
    len: keys.reduce((a, k) => a + bom[k].len, 0),
    n: keys.reduce((a, k) => a + bom[k].n, 0),
    nodes: nodeList.length,
  });
  bom._stage = {
    casa: stage(STAGES.casa, roofNodes.list),
    pergolas: stage(STAGES.pergolas, pergNodes.list),
  };
  bom._total = { kg, len, nodes: roofNodes.list.length + pergNodes.list.length };
  return { groups, bom, weldGroup, carportRoof };
}
