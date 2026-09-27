import { Viewer, VIEWS } from './viewer.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

const stage = $('#stage');
const viewer = new Viewer($('#gl'), stage);
window.viewer = viewer;

// ---------- Vistas ----------
const viewsBar = $('#views');
Object.entries(VIEWS).forEach(([k, vw]) => {
  const b = el('button', 'vbtn', vw.label);
  b.dataset.view = k;
  b.addEventListener('click', () => { viewer.setView(k); markView(k); });
  viewsBar.appendChild(b);
});
function markView(k) {
  if (k === 'interior') viewer.setLayer('furniture', true);
  viewsBar.querySelectorAll('.vbtn').forEach(b => b.classList.toggle('on', b.dataset.view === k));
}
markView('norte');

// ---------- Escena ----------
const STEEL_GROUPS = ['frames', 'ridge', 'purlins', 'valleys', 'gable', 'ties', 'pergolas'];
const SCENES = {
  completa() {
    viewer.setTiles('solid');
    STEEL_GROUPS.forEach(g => viewer.setLayer(g, true));
    viewer.setLayer('walls', true);
    viewer.setLayer('furniture', true);
    viewer.setLayer('ground', true);
    viewer.setLayer('welds', false);
  },
  acero() {
    viewer.setTiles('ghost');
    STEEL_GROUPS.forEach(g => viewer.setLayer(g, true));
    viewer.setLayer('walls', true);
    viewer.setLayer('furniture', false);
    viewer.setLayer('ground', true);
    viewer.setLayer('welds', true);
  },
};
// ---------- Etapa de obra ----------
// Etapa 1: cubierta de la casa. Etapa 2: pérgola y cochera (otro momento).
let scene = 'completa', obra = 'casa';
function render() {
  SCENES[scene]();
  viewer.setStage(obra, { keepTiles: true });
  // En la etapa 2 la casa ya está terminada: teja sólida como contexto
  if (obra === 'pergolas') viewer.setTiles('solid');
  // En "Estructura de acero" se ve el acero limpio: sin policarbonato ni carros
  const clean = scene === 'acero';
  viewer.setLayer('cars', !clean);
  viewer.layers.carportRoof.visible = !clean && obra !== 'casa';
  document.querySelectorAll('#scene button').forEach(x => x.classList.toggle('on', x.dataset.mode === scene));
  document.querySelectorAll('#stagesel button').forEach(x => x.classList.toggle('on', x.dataset.stage === obra));
  viewsBar.querySelectorAll('.vbtn').forEach(b => { b.hidden = b.dataset.view === 'pergolas' && obra === 'casa'; });
}
document.querySelectorAll('#scene button').forEach(b => b.addEventListener('click', () => { scene = b.dataset.mode; render(); }));
document.querySelectorAll('#stagesel button').forEach(b => b.addEventListener('click', () => {
  obra = b.dataset.stage; render();
  const vw = obra === 'pergolas' ? 'pergolas' : 'iso';
  viewer.setView(vw); markView(vw);
}));
render();
