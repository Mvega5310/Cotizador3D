import { Viewer, VIEWS } from './viewer.js';
import { PROFILES, P, STAGE_INFO } from './params.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const fmt = (n, d = 1) => n.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const store = {
  get(k, dflt) { try { const x = localStorage.getItem('cc:' + k); return x == null ? dflt : x; } catch (e) { return dflt; } },
  set(k, val) { try { localStorage.setItem('cc:' + k, val); } catch (e) { /* sin almacenamiento */ } },
};

const stage = $('#stage');
const viewer = new Viewer($('#gl'), stage);
window.viewer = viewer;
viewer.registerLabels($('#labels'));

// ---------- Vistas ----------
const viewsBar = $('#views');
Object.entries(VIEWS).forEach(([k, vw]) => {
  const b = el('button', 'vbtn', vw.label);
  b.dataset.view = k;
  b.addEventListener('click', () => { viewer.setView(k); markView(k); });
  viewsBar.appendChild(b);
});
function markView(k) {
  if (k === 'interior') { viewer.setLayer('furniture', true); const f = $('#ck-furniture'); if (f) f.checked = true; viewer.setLayer('walls', true); } viewsBar.querySelectorAll('.vbtn').forEach(b => b.classList.toggle('on', b.dataset.view === k)); }
markView('norte');

// ---------- Modo de cubierta ----------
document.querySelectorAll('#tilemode button').forEach(b => {
  b.addEventListener('click', () => { viewer.setTiles(b.dataset.mode); syncTiles(); });
});
function syncTiles() {
  document.querySelectorAll('#tilemode button').forEach(b => b.classList.toggle('on', b.dataset.mode === viewer.state.tiles));
}
syncTiles();

// ---------- Sistemas de acero ----------
const SYSTEMS = [
  ['frames', 'frame', 'Cerchas principales'],
  ['ridge', 'ridge', 'Viga cumbrera doble'],
  ['purlins', 'purlin', 'Correas'],
  ['valleys', 'valley', 'Limahoyas'],
  ['gable', 'gableRaf', 'Cerchuelas de frontón'],
  ['ties', 'tie', 'Soleras de amarre'],
  ['pergolas', 'pergola', 'Pérgola y cochera'],
];
const sysList = $('#systems');
const bom = viewer.bom;
const checks = {};
SYSTEMS.forEach(([grp, key, name]) => {
  const p = PROFILES[key];
  const isPerg = key === 'pergola';
  const tube = isPerg ? `Col. ${PROFILES.pergolaCol.tube.replace('Tubo cuad. ', '')} · vigas ${p.tube.replace('Tubo rect. ', '')}` : p.tube;
  const count = isPerg ? bom.pergola.n + bom.pergolaCol.n : bom[key].n;
  const row = el('label', 'row sys');
  row.innerHTML = `<input type="checkbox" checked id="ck-${grp}"><span class="sw" style="background:${hex(p.color)}"></span>
    <span class="nm">${name}<small>${tube}</small></span><span class="ct">${count}</span>`;
  const cb = row.querySelector('input');
  cb.addEventListener('change', () => viewer.setLayer(grp, cb.checked));
  row.addEventListener('mouseenter', () => viewer.focusSystem(grp));
  row.addEventListener('mouseleave', () => viewer.focusSystem(null));
  checks[grp] = cb;
  sysList.appendChild(row);
});

// ---------- Otras capas ----------
const OTHER = [
  ['walls', 'Muros y ventanas'], ['furniture', 'Mobiliario de referencia'], ['ground', 'Terreno y lote'],
  ['welds', 'Nodos de soldadura'], ['dims', 'Cotas de cubierta'], ['rooms', 'Nombres de espacios'],
];
const otherList = $('#others');
const otherCk = {};
OTHER.forEach(([k, name]) => {
  const row = el('label', 'row');
  const on = viewer.getLayer(k) || k === 'rooms' ? true : false;
  row.innerHTML = `<input type="checkbox" id="ck-${k}" ${k === 'walls' || k === 'furniture' || k === 'ground' || k === 'welds' ? 'checked' : ''}><span class="nm">${name}</span>`;
  const cb = row.querySelector('input');
  otherCk[k] = cb;
  cb.addEventListener('change', () => applyOther(k, cb.checked));
  otherList.appendChild(row);
});
function applyOther(k, on) {
  if (k === 'dims') viewer.setDims(on);
  else if (k === 'rooms') viewer.setRooms(on);
  else if (k === 'ground') { viewer.setLayer('ground', on); viewer.setLayer('plinth', true); }
  else if (k === 'walls') { viewer.setLayer('walls', on); viewer.setLayer('plinth', true); }
  else viewer.setLayer(k, on);
}
['welds', 'dims', 'rooms'].forEach(k => applyOther(k, otherCk[k].checked));
viewer.setLayer('furniture', true);

// ---------- Explosión ----------
const ex = $('#explode');
ex.addEventListener('input', () => { viewer.setExplode(+ex.value / 100); $('#explode-v').textContent = ex.value + '%'; });

// ---------- Corte ----------
const cutAxis = $('#cutaxis'), cutPos = $('#cutpos'), cutFlip = $('#cutflip');
function applyCut() {
  const a = cutAxis.value;
  if (a === 'none') { viewer.setCut(null); $('#cutrow').hidden = true; return; }
  $('#cutrow').hidden = false;
  if (a === 'x') { cutPos.min = -1; cutPos.max = 17.8; cutPos.step = 0.05; }
  else { cutPos.min = -1.5; cutPos.max = 10.5; cutPos.step = 0.05; }
  cutPos.value = Math.min(Math.max(+cutPos.value, +cutPos.min), +cutPos.max);
  $('#cutpos-v').textContent = (+cutPos.value).toFixed(2) + ' m';
  viewer.setCut(a, +cutPos.value, cutFlip.checked);
}
cutAxis.addEventListener('change', () => {
  if (cutAxis.value === 'x') cutPos.value = 7.3;
  if (cutAxis.value === 'y') cutPos.value = 4.4;
  applyCut();
});
cutPos.addEventListener('input', applyCut);
cutFlip.addEventListener('change', applyCut);

// ---------- Giro ----------
$('#spin').addEventListener('change', e => { viewer.controls.autoRotate = e.target.checked; });

// ---------- Presets ----------
function setChecks(map) {
  for (const [k, on] of Object.entries(map)) {
    const cb = checks[k] || otherCk[k];
    if (cb) { cb.checked = on; if (checks[k]) viewer.setLayer(k, on); else applyOther(k, on); }
  }
}
const ALL_STEEL = Object.fromEntries(SYSTEMS.map(s => [s[0], true]));
const PRESETS = {
  completa: () => { viewer.setTiles('solid'); setChecks({ ...ALL_STEEL, pergolas: true, walls: true, furniture: true, ground: true, welds: false, dims: false }); ex.value = 0; ex.dispatchEvent(new Event('input')); viewer.setView('norte'); markView('norte'); },
  acero: () => { viewer.setTiles('ghost'); setChecks({ ...ALL_STEEL, walls: true, furniture: false, ground: true, welds: true }); ex.value = 0; ex.dispatchEvent(new Event('input')); viewer.setView('iso'); markView('iso'); },
  soloacero: () => { viewer.setTiles('hidden'); setChecks({ ...ALL_STEEL, walls: false, furniture: false, ground: true, welds: true }); ex.value = 0; ex.dispatchEvent(new Event('input')); viewer.setView('iso'); markView('iso'); },
  explosion: () => { viewer.setTiles('solid'); setChecks({ ...ALL_STEEL, walls: true, furniture: false, ground: true, welds: true }); ex.value = 100; ex.dispatchEvent(new Event('input')); viewer.setView('iso'); markView('iso'); },
};
document.querySelectorAll('#presets button').forEach(b => {
  b.addEventListener('click', () => {
    PRESETS[b.dataset.p]();
    applyStage(viewer.state.stage, true);
    document.querySelectorAll('#presets button').forEach(x => x.classList.toggle('on', x === b));
  });
});

// ---------- Cantidades por etapa ----------
const tb = $('#bomrows');
for (const st of ['casa', 'pergolas']) {
  const S = bom._stage[st], info = STAGE_INFO[st];
  const h = el('tr', 'stagehd');
  h.innerHTML = `<td colspan="4">Etapa ${info.n} · ${info.name}</td>`;
  tb.appendChild(h);
  S.keys.forEach(k => {
    const p = PROFILES[k], b = bom[k];
    const tr = el('tr');
    tr.innerHTML = `<td><span class="sw" style="background:${hex(p.color)}"></span>${p.name}<small>${p.tube}</small></td>
      <td class="n">${b.n}</td><td class="n">${fmt(b.len, 1)}</td><td class="n">${fmt(b.kg, 0)}</td>`;
    tb.appendChild(tr);
  });
  const sub = el('tr', 'sub');
  sub.innerHTML = `<td>Subtotal etapa ${info.n}<small style="margin:0">${S.nodes} nodos de soldadura</small></td>
    <td class="n">${S.n}</td><td class="n">${fmt(S.len, 1)}</td><td class="n">${fmt(S.kg, 0)}</td>`;
  tb.appendChild(sub);
}
$('#bom-len').textContent = fmt(bom._total.len, 1);
$('#bom-kg').textContent = fmt(bom._total.kg, 0);
$('#bom-nodes').textContent = bom._total.nodes;
const inWaste = $('#waste'), inKg = $('#pkg'), inNode = $('#pnode'), inStage = $('#qstage');
inWaste.value = store.get('waste', '8'); inKg.value = store.get('pkg', ''); inNode.value = store.get('pnode', '');
function calc() {
  const st = inStage.value;
  const S = st === 'todo' ? bom._total : bom._stage[st];
  const w = Math.max(0, +inWaste.value || 0) / 100;
  const kg = S.kg * (1 + w);
  $('#kg-waste').textContent = fmt(kg, 0) + ' kg';
  const pk = +inKg.value || 0, pn = +inNode.value || 0;
  const total = kg * pk + S.nodes * pn;
  $('#total-lbl').textContent = st === 'todo' ? 'Total estimado ambas etapas (COP)' : `Total estimado etapa ${STAGE_INFO[st].n} (COP)`;
  $('#total').textContent = pk > 0 || pn > 0 ? '$ ' + Math.round(total).toLocaleString('es-CO') : 'Ingresa tus precios';
  $('#total').classList.toggle('empty', !(pk > 0 || pn > 0));
  store.set('waste', inWaste.value); store.set('pkg', inKg.value); store.set('pnode', inNode.value);
}
[inWaste, inKg, inNode].forEach(i => i.addEventListener('input', calc));
inStage.addEventListener('change', calc);

// ---------- Etapa de obra ----------
function applyStage(st, keepTiles = false) {
  viewer.setStage(st, { keepTiles });
  SYSTEMS.forEach(([grp]) => { checks[grp].checked = viewer.getLayer(grp); });
  syncTiles();
  document.querySelectorAll('#stages button').forEach(b => b.classList.toggle('on', b.dataset.s === st));
  inStage.value = st;
  calc();
  // La vista de pérgolas solo tiene sentido cuando la etapa 2 está visible
  viewsBar.querySelectorAll('.vbtn').forEach(b => { b.hidden = b.dataset.view === 'pergolas' && st === 'casa'; });
  if (!keepTiles) {
    const vw = st === 'pergolas' ? 'pergolas' : 'iso';
    viewer.setView(vw); markView(vw);
  }
}
document.querySelectorAll('#stages button').forEach(b => b.addEventListener('click', () => applyStage(b.dataset.s)));
applyStage('casa', true);
viewer.setTiles('ghost'); syncTiles();

// ---------- Pestañas ----------
const tabs = document.querySelectorAll('.tab');
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.pane').forEach(p => (p.hidden = p.id !== 'pane-' + t.dataset.tab));
}));

// ---------- Datos clave ----------
$('#k-len').textContent = P.roofL.toFixed(2) + ' m';
$('#k-dep').textContent = '10.60 m';
$('#k-rdg').textContent = '+' + P.ridgeZ.toFixed(2) + ' m';
$('#k-fr').textContent = '7';

// ---------- API de presentación (renders) ----------
window.presentation = {
  chrome(on) { document.body.classList.toggle('clean', !on); viewer.shiftFrame = on; viewer.resize(); },
  preset(name) { PRESETS[name](); applyStage(viewer.state.stage, true); },
  stage(st, keepTiles = false) { applyStage(st, keepTiles); },
  view(name) { viewer.setView(name, true); markView(name); },
  tiles(m) { viewer.setTiles(m); syncTiles(); },
  layers(map) { setChecks(map); },
  explode(e) { ex.value = e * 100; ex.dispatchEvent(new Event('input')); },
  cut(axis, pos, flip) { viewer.setCut(axis, pos, flip); },
  bg(m) { viewer.setBackground(m); },
  camera(pos, tgt, fov) {
    viewer.tween = null;
    viewer.camera.position.set(pos[0], pos[2], pos[1]); viewer.controls.target.set(tgt[0], tgt[2], tgt[1]);
    viewer.camera.fov = fov; viewer.camera.updateProjectionMatrix(); viewer.controls.update();
  },
  freeze(on) { viewer.paused = on; if (on) viewer.renderNow(); },
  bom: () => JSON.parse(JSON.stringify(viewer.bom)),
};
