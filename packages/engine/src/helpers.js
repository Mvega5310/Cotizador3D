import * as THREE from 'three';

// Modelo: ejes de plano, mano derecha — mirando el frente, X crece hacia la
// derecha, Y hacia el fondo y Z hacia arriba.  ->  three (x, y, z) = (X, Z, -Y)
// (Antes era (X, Z, Y), un sistema de mano izquierda: todo lo asimétrico —
// una puerta a la izquierda, las bisagras de un lado — se veía en espejo.)
export const v = (X, Y, Z) => new THREE.Vector3(X, Z, -Y);

export const mats = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.92, metalness: 0 }),
  wallIn: new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.95 }),
  plinth: new THREE.MeshStandardMaterial({ color: 0xc9c3b6, roughness: 0.95 }),
  floor: new THREE.MeshStandardMaterial({ color: 0xd9d3c4, roughness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fc4d8, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  frameDark: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.4 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x2b3644, roughness: 1 }),
  groundOut: new THREE.MeshStandardMaterial({ color: 0x171e29, roughness: 1 }),
  paver: new THREE.MeshStandardMaterial({ color: 0x475366, roughness: 0.95 }),
  furn: new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 0.8 }),
  furnDark: new THREE.MeshStandardMaterial({ color: 0x6d6a62, roughness: 0.8 }),
  carBody: new THREE.MeshStandardMaterial({ color: 0x8b9199, roughness: 0.35, metalness: 0.6 }),
  carGlass: new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: 0.15, metalness: 0.4 }),
  poly: new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.88 }),
  weld: new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffc93a, emissiveIntensity: 0.9, roughness: 0.4 }),
};

export function steelMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.55 });
}

// Viga rectangular entre dos puntos (three-space). w = ancho horizontal, h = peralte.
export function beam(p0, p1, w, h, material) {
  const d = new THREE.Vector3().subVectors(p1, p0);
  const L = d.length();
  const xAxis = d.clone().normalize();
  let ref = new THREE.Vector3(0, 1, 0);
  if (Math.abs(xAxis.dot(ref)) > 0.98) ref = new THREE.Vector3(1, 0, 0);
  const zAxis = new THREE.Vector3().crossVectors(xAxis, ref).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const m = new THREE.Mesh(new THREE.BoxGeometry(L, h, w), material);
  m.matrixAutoUpdate = false;
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  basis.setPosition(new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5));
  m.matrix.copy(basis);
  m.castShadow = true;
  m.receiveShadow = true;
  m.userData.length = L;
  return m;
}

export function box(X0, Y0, Z0, X1, Y1, Z1, material, edges = false) {
  const g = new THREE.BoxGeometry(Math.abs(X1 - X0), Math.abs(Z1 - Z0), Math.abs(Y1 - Y0));
  const m = new THREE.Mesh(g, material);
  m.position.copy(v((X0 + X1) / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2));
  m.castShadow = true;
  m.receiveShadow = true;
  if (edges) addEdges(m, 0x6b665b, 0.55);
  return m;
}

export function addEdges(mesh, color = 0x55524a, opacity = 0.6, angle = 30) {
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, angle),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
  mesh.add(e);
  return e;
}

// Textura procedural de teja de barro (curva española)
export function tileTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const cols = 2, rows = 2;
  const cw = 256 / cols, rh = 256 / rows;
  g.fillStyle = '#b9552f';
  g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x0 = k * cw, y0 = r * rh;
      const grd = g.createLinearGradient(x0, 0, x0 + cw, 0);
      grd.addColorStop(0, '#7e3419');
      grd.addColorStop(0.5, '#d67a4c');
      grd.addColorStop(1, '#8e3d1e');
      g.fillStyle = grd;
      g.fillRect(x0, y0, cw, rh);
      // sombra de traslape
      const ov = g.createLinearGradient(0, y0, 0, y0 + rh);
      ov.addColorStop(0, 'rgba(40,12,4,0.55)');
      ov.addColorStop(0.18, 'rgba(40,12,4,0)');
      ov.addColorStop(1, 'rgba(255,190,150,0.10)');
      g.fillStyle = ov;
      g.fillRect(x0, y0, cw, rh);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
