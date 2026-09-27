import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { v, mats } from './helpers.js';

// Motor de escena genérico (cámara, controles, capas, cortes, explosión,
// etiquetas), extraído de casa-castaneda/src/viewer.js. No construye
// geometría ni conoce medidas de ningún proyecto: recibe capas ya armadas
// y una lista de vistas de cámara por `config`, provistas por el proyecto
// (ver projects/<slug>).
//
// config:
//   layers      { [nombre]: THREE.Object3D }  grupos ya construidos
//   views       { [nombre]: { label, pos:[x,y,z], tgt:[x,y,z], fov, planTilt? } }
//   defaultView string, clave de `views`
//   stages      { [clave]: { [nombreCapa]: boolean } }  presets de visibilidad por etapa de obra
//   dims        THREE.Object3D opcional, capa de cotas (oculta por defecto)
//   dimLabels   [{ text, pos:[x,y,z] }] opcional, etiquetas DOM de las cotas
//   roomLabels  [{ text, pos:[x,y,z] }] opcional, etiquetas DOM de espacios
//   glassLayers string[] nombres de capas con material de vidrio (mats.glass),
//               se muestran/ocultan junto con la capa indicada en `parentOf`
//   sunTarget   [x,y,z], opcional
export class Viewer {
  constructor(canvas, stageEl, config = {}) {
    this.canvas = canvas;
    this.stage = stageEl;
    this.config = config;
    this.views = config.views || {};

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
    const sunTarget = config.sunTarget || [0, 0, 0];
    sun.position.copy(v(sunTarget[0] - 22, sunTarget[1] - 24, sunTarget[2] + 22));
    sun.target.position.copy(v(...sunTarget));
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.layers = {};
    for (const [name, obj] of Object.entries(config.layers || {})) {
      this.layers[name] = obj;
      this.scene.add(obj);
    }
    this.glass = [];
    this.scene.traverse(o => { if (o.userData.isGlass) this.glass.push(o); });

    if (config.dims) {
      this.layers.dims = config.dims;
      config.dims.visible = false;
      this.scene.add(config.dims);
    }

    this.tween = null;
    this.state = { explode: 0, cut: null, view: config.defaultView || null, stage: null };
    this.shiftFrame = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(stageEl);
    if (this.state.view) this.setView(this.state.view, true);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.ready = true;
  }

  // ---------- Capas ----------
  setLayer(name, on) {
    const o = this.layers[name];
    if (!o) return;
    o.visible = on;
  }
  getLayer(name) { return this.layers[name]?.visible ?? false; }

  // Preset de visibilidad por etapa de obra, definido en config.stages.
  setStage(key) {
    const preset = this.config.stages?.[key];
    if (!preset) return;
    this.state.stage = key;
    for (const [name, on] of Object.entries(preset)) this.setLayer(name, on);
  }

  // Transparencia de una capa (p.ej. "ver a través de la cubierta"),
  // generaliza el modo ghost/solid de casa-castaneda a cualquier capa.
  setLayerOpacity(name, opacity, { depthWrite = opacity >= 1, castShadow = opacity >= 1 } = {}) {
    const g = this.layers[name];
    if (!g) return;
    const ghost = opacity < 1;
    g.traverse(o => {
      if (!o.isMesh) return;
      const mats_ = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats_) { m.transparent = ghost; m.opacity = opacity; m.depthWrite = depthWrite; m.needsUpdate = true; }
      o.castShadow = castShadow;
    });
  }

  setExplode(e, offsets = {}) {
    this.state.explode = e;
    for (const [name, factor] of Object.entries(offsets)) {
      const g = this.layers[name];
      if (g) g.position.y = e * factor;
    }
  }

  setCut(axis, pos, flip = false) {
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

  // Atenúa todas las capas de `groupNames` menos `key`, para resaltar un sistema.
  focusSystem(key, groupNames) {
    for (const name of groupNames) {
      const g = this.layers[name];
      if (!g) continue;
      g.traverse(o => {
        if (!o.isMesh) return;
        const dim = key && key !== name;
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
      this.scene.environmentIntensity = 0.7;
    } else {
      this.scene.background = new THREE.Color(0x121821);
      this.scene.fog.color.set(0x121821);
      this.scene.environmentIntensity = 0.55;
    }
  }

  // ---------- Cámara ----------
  setView(name, instant = false) {
    const vw = this.views[name];
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

  camera_(pos, tgt, fov) {
    this.tween = null;
    this.camera.position.set(pos[0], pos[2], pos[1]);
    this.controls.target.set(tgt[0], tgt[2], tgt[1]);
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  resize() {
    const r = this.stage.getBoundingClientRect();
    const w = Math.max(50, Math.floor(r.width)), h = Math.max(50, Math.floor(r.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.shiftFrame) this.camera.setViewOffset(w, h, -w * 0.02, -h * 0.07, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---------- Etiquetas DOM ----------
  registerLabels(container) {
    this.labelHost = container;
    const mk = (cls, text) => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      container.appendChild(d);
      return d;
    };
    this.roomEls = (this.config.roomLabels || []).map(({ text, pos }) => ({ el: mk('lbl room', text), pos: v(...pos) }));
    this.dimEls = (this.config.dimLabels || []).map(({ text, pos }) => ({ el: mk('lbl dim', text), pos: v(...pos) }));
    this.roomsOn = false;
  }

  setRooms(on) { this.roomsOn = on; }
  setDims(on) { if (this.layers.dims) this.layers.dims.visible = on; }

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
    this.dimEls.forEach(i => place(i, this.layers.dims?.visible));
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
