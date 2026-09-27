import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { P } from './params.js';
import { v, mats } from './helpers.js';
import { buildGround, buildPlinth, buildWalls, buildFurniture, buildBodega, buildCars, ROOM_LABELS } from './civil.js';
import { buildRoofTiles, buildSteel } from './structure.js';

export const VIEWS = {
  norte:    { label: 'Fachada norte', pos: [-2, -38, 17], tgt: [7.0, 4.5, 1.6], fov: 32 },
  sur:      { label: 'Fachada sur',   pos: [16, 36, 16],  tgt: [7.5, 4.5, 1.6], fov: 32 },
  iso:      { label: 'Isométrica',    pos: [58, 50, 47],  tgt: [8.4, 4.5, 1.2], fov: 15.5 },
  planta:   { label: 'Planta',        pos: [8.0, 4.5, 60], tgt: [8.0, 4.5, 0], fov: 26, planTilt: true },
  alzadoS:  { label: 'Alzado sur',    pos: [8.4, 76, 3.0], tgt: [8.4, 4.5, 2.4], fov: 12 },
  alzadoN:  { label: 'Alzado norte',  pos: [8.4, -68, 3.0], tgt: [8.4, 4.5, 2.4], fov: 12 },
  lateral:  { label: 'Lateral oeste', pos: [-66, 4.5, 3.0], tgt: [4.5, 4.5, 2.4], fov: 12 },
  interior: { label: 'Interior',      pos: [5.0, 4.4, 1.7], tgt: [12.5, 4.4, 2.9], fov: 58 },
  fronton:  { label: 'Frontón',       pos: [7.3, 17.5, 6.5], tgt: [7.3, 7.5, 3.4], fov: 40 },
  pergolas: { label: 'Pérgola y cochera', pos: [-19, -10, 12.5], tgt: [-3.3, 2.8, 1.0], fov: 38, stage: 'pergolas' },
};

const SYS = ['frames', 'ridge', 'purlins', 'gable', 'valleys', 'ties', 'pergolas'];

export class Viewer {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.localClippingEnabled = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121821);
    this.scene.fog = new THREE.Fog(0x121821, 70, 190);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 400);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.499;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 120;
    this.controls.autoRotateSpeed = 0.9;

    this.scene.add(new THREE.HemisphereLight(0xe4edf8, 0x8a8577, 0.75));
    const sun = new THREE.DirectionalLight(0xfff3e0, 2.4);
    sun.position.copy(v(-14, -20, 26));
    sun.target.position.copy(v(8.4, 4.5, 0));
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.build();
    this.tween = null;
    this.labels = [];
    this.state = { tiles: 'ghost', explode: 0, cut: null, view: 'norte', stage: 'todo' };
    this.shiftFrame = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(stage);
    this.setView('norte', true);
    this.setTiles('ghost');
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.ready = true;
  }

  build() {
    const L = (this.layers = {});
    const add = (name, obj) => { L[name] = obj; this.scene.add(obj); return obj; };
    add('ground', buildGround());
    add('plinth', buildPlinth());
    add('walls', buildWalls());
    add('furniture', buildFurniture());
    add('bodega', buildBodega());
    add('cars', buildCars());
    add('tiles', buildRoofTiles());
    const st = buildSteel();
    this.bom = st.bom;
    for (const k of SYS) add(k, st.groups[k]);
    add('welds', st.weldGroup);
    add('carportRoof', st.carportRoof);
    this.tileMats = [];
    L.tiles.traverse(o => { if (o.isMesh) { this.tileMats.push(o.material); } });
    this.glass = [];
    this.scene.traverse(o => { if (o.userData.isGlass) this.glass.push(o); });
    this.buildDims();
  }

  // ---------- Cotas ----------
  buildDims() {
    const g = new THREE.Group();
    this.dimLabels = [];
    const mat = new THREE.LineBasicMaterial({ color: 0xffc93a });
    const dim = (a, b, text, o = {}) => {
      const pa = v(...a), pb = v(...b);
      const pts = [pa, pb];
      const dir = new THREE.Vector3().subVectors(pb, pa).normalize();
      const perp = o.tick ? new THREE.Vector3(...o.tick) : new THREE.Vector3(0, 0.25, 0);
      for (const p of [pa, pb]) {
        pts.push(p.clone().add(perp), p.clone().sub(perp));
      }
      const geo = new THREE.BufferGeometry();
      const seg = [pa, pb, pa.clone().add(perp), pa.clone().sub(perp), pb.clone().add(perp), pb.clone().sub(perp)];
      geo.setFromPoints(seg);
      geo.setIndex([0, 1, 2, 3, 4, 5]);
      g.add(new THREE.LineSegments(geo, mat));
      this.dimLabels.push({ text, pos: pa.clone().add(pb).multiplyScalar(0.5), kind: 'dim' });
    };
    const x0 = P.roofX0, x1 = P.roofX0 + P.roofL;
    const zg = 0.04;
    // Largo de cubierta con cadena 4.34 / 5.91 / 6.56
    const yA = P.yGableFront + 1.5;
    dim([x0, yA, zg], [x1, yA, zg], '16.81 m', { tick: [0, 0, 0.25] });
    dim([x0, yA + 1.0, zg], [P.gableX0, yA + 1.0, zg], '4.34', { tick: [0, 0, 0.2] });
    dim([P.gableX0, yA + 1.0, zg], [P.gableX0 + P.gableW, yA + 1.0, zg], '5.91', { tick: [0, 0, 0.2] });
    dim([P.gableX0 + P.gableW, yA + 1.0, zg], [x1, yA + 1.0, zg], '6.56', { tick: [0, 0, 0.2] });
    // Profundidad de cubierta
    dim([x1 + 1.3, P.yNorthEave, zg], [x1 + 1.3, P.ySouthEave, zg], '10.60 m', { tick: [0.25, 0, 0] });
    // Cumbrera
    dim([x1 + 4.2, P.ridgeY, 0.02], [x1 + 4.2, P.ridgeY, P.ridgeZ], '+5.35 m', { tick: [0.25, 0, 0] });
    // Frontón al frente
    dim([P.gableX0, P.yGableFront + 0.5, zg], [P.gableX0 + P.gableW, P.yGableFront + 0.5, zg], '', { tick: [0, 0, 0.15] });
    this.dimLabels.pop();
    this.layers.dims = g;
    this.scene.add(g);
    g.visible = false;
  }

  // ---------- Estado ----------
  setLayer(name, on) {
    const o = this.layers[name];
    if (!o) return;
    o.visible = on;
    if (name === 'walls') this.glass.forEach(gm => (gm.visible = on));
    if (name === 'cars') this.layers.carportRoof.visible = this.layers.pergolas.visible;
    if (name === 'pergolas') this.layers.carportRoof.visible = on;
  }
  getLayer(name) { return this.layers[name]?.visible ?? false; }

  // Etapa de obra: 'casa' (etapa 1), 'pergolas' (etapa 2) o 'todo'.
  // En la etapa 2 la casa queda como contexto terminado (teja sólida).
  setStage(stage, { keepTiles = false } = {}) {
    this.state.stage = stage;
    const casa = stage !== 'pergolas', perg = stage !== 'casa';
    for (const k of ['frames', 'ridge', 'purlins', 'gable', 'valleys', 'ties']) this.layers[k].visible = casa;
    this.setLayer('pergolas', perg);
    const w = this.layers.welds.userData;
    w.casa.visible = casa;
    w.pergolas.visible = perg;
    if (!keepTiles) this.setTiles(stage === 'pergolas' ? 'solid' : 'ghost');
  }

  setTiles(mode) {
    this.state.tiles = mode;
    const t = this.layers.tiles;
    t.visible = mode !== 'hidden';
    const ghost = mode === 'ghost';
    this.tileMats.forEach(m => {
      m.transparent = ghost;
      m.opacity = ghost ? 0.2 : 1;
      m.depthWrite = !ghost;
      m.needsUpdate = true;
    });
    t.traverse(o => { if (o.isMesh) o.castShadow = !ghost; });
  }

  setExplode(e) {
    this.state.explode = e;
    const L = this.layers;
    L.tiles.position.y = e * 3.6;
    for (const k of ['frames', 'ridge', 'purlins', 'gable', 'valleys', 'welds']) L[k].position.y = e * 1.7;
    L.ties.position.y = e * 0.6;
  }

  setCut(axis, pos, flip = false) {
    // axis: 'x' | 'y' (modelo) o null. El terreno nunca se corta.
    const planes = [];
    if (axis) {
      const n = axis === 'x' ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1);
      if (flip) n.negate();
      planes.push(new THREE.Plane(n, flip ? -pos : pos));
    }
    this.state.cut = axis ? { axis, pos, flip } : null;
    const seen = new Set();
    for (const [name, obj] of Object.entries(this.layers)) {
      if (name === 'ground' || name === 'dims') continue;
      obj.traverse(o => {
        if (!o.isMesh && !o.isLine) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) {
          if (!m || seen.has(m)) continue;
          seen.add(m);
          m.clippingPlanes = planes.length ? planes : null;
          if (m.isMeshStandardMaterial && !o.userData.isGlass && m !== mats.glass) m.side = axis ? THREE.DoubleSide : THREE.FrontSide;
          m.needsUpdate = true;
        }
      });
    }
  }

  focusSystem(key) {
    for (const k of SYS) {
      const g = this.layers[k];
      g.traverse(o => {
        if (!o.isMesh) return;
        const dim = key && key !== k;
        o.material.transparent = !!dim;
        o.material.opacity = dim ? 0.12 : 1;
        o.material.depthWrite = !dim;
      });
    }
  }

  setBackground(mode) {
    if (mode === 'print') {
      this.scene.background = new THREE.Color(0xf4f2ed);
      this.scene.fog.color.set(0xf4f2ed);
      mats.groundOut.color.set(0xe9e6de);
      mats.ground.color.set(0xf7f5f0);
      mats.paver.color.set(0xc9c4b8);
      this.scene.environmentIntensity = 0.7;
    } else {
      this.scene.background = new THREE.Color(0x121821);
      this.scene.fog.color.set(0x121821);
      mats.groundOut.color.set(0x171e29);
      mats.ground.color.set(0x2b3644);
      mats.paver.color.set(0x475366);
      this.scene.environmentIntensity = 0.55;
    }
  }

  // ---------- Cámara ----------
  setView(name, instant = false) {
    const vw = VIEWS[name];
    if (!vw) return;
    this.state.view = name;
    const pos = v(...vw.pos);
    const tgt = v(...vw.tgt);
    if (vw.planTilt) pos.z += 0.6;
    const go = { pos, tgt, fov: vw.fov };
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(tgt);
      this.camera.fov = vw.fov;
      this.camera.updateProjectionMatrix();
      this.controls.update();
      this.tween = null;
      return;
    }
    this.tween = {
      t0: performance.now(), dur: 1000,
      p0: this.camera.position.clone(), g0: this.controls.target.clone(), f0: this.camera.fov, ...go,
    };
  }

  resize() {
    const r = this.stage.getBoundingClientRect();
    const w = Math.max(50, Math.floor(r.width)), h = Math.max(50, Math.floor(r.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Desplaza el encuadre hacia abajo/derecha para no chocar con el título
    if (this.shiftFrame) this.camera.setViewOffset(w, h, -w * 0.02, -h * 0.07, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // Proyección de etiquetas DOM
  registerLabels(container) {
    this.labelHost = container;
    const mk = (cls, text) => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      container.appendChild(d);
      return d;
    };
    this.roomEls = ROOM_LABELS.map(([t, x, y]) => ({
      el: mk('lbl room', t), pos: v(x, y, P.floorZ + 0.05),
    }));
    this.dimEls = this.dimLabels.map(d => ({ el: mk('lbl dim', d.text), pos: d.pos }));
    this.roomsOn = false;
  }

  setRooms(on) { this.roomsOn = on; }
  setDims(on) { this.layers.dims.visible = on; }

  updateLabels() {
    if (!this.roomEls) return;
    const tmp = new THREE.Vector3();
    const place = (item, show) => {
      if (!show) { item.el.style.display = 'none'; return; }
      tmp.copy(item.pos).project(this.camera);
      const off = tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05;
      if (off) { item.el.style.display = 'none'; return; }
      item.el.style.display = 'block';
      item.el.style.transform = `translate(-50%,-50%) translate(${((tmp.x + 1) / 2) * this.w}px, ${((1 - tmp.y) / 2) * this.h}px)`;
    };
    this.roomEls.forEach(i => place(i, this.roomsOn));
    this.dimEls.forEach(i => place(i, this.layers.dims.visible));
  }

  renderNow() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }

  loop(now) {
    if (this.paused) { requestAnimationFrame(this.loop); return; }
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(this.tween.p0, this.tween.pos, e);
      this.controls.target.lerpVectors(this.tween.g0, this.tween.tgt, e);
      this.camera.fov = this.tween.f0 + (this.tween.fov - this.tween.f0) * e;
      this.camera.updateProjectionMatrix();
      if (k >= 1) this.tween = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
    requestAnimationFrame(this.loop);
  }
}
