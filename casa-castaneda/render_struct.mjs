import fs from 'fs';
import path from 'path';
import { launch, viewerURL, ROOT } from './browser.mjs';
const OUT = path.join(ROOT, 'renders');
fs.mkdirSync(OUT, { recursive: true });
const W = 1700, H = 1050;
const hideExtra = "viewer.setLayer('cars', false); viewer.setLayer('bodega', false);";
const hideAllCtx = hideExtra + " viewer.setLayer('ground', false); viewer.setLayer('plinth', false);";
const E1 = "presentation.stage('casa', true);";
const E2 = "presentation.stage('pergolas', true); viewer.setTiles('solid'); viewer.layers.carportRoof.visible = false;";
const specs = [
  // Etapa 1 · estructura de cubierta de la casa (sin pérgolas)
  { n: 's1_hero', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.camera([40, 36, 30], [9.5, 4.5, 1.6], 16)` },
  { n: 's2_norte', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.view('alzadoN')` },
  { n: 's3_sur', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.view('alzadoS')` },
  { n: 's4_lateral', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.view('lateral')` },
  { n: 's5_planta', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.camera([8.2, 4.6, 46], [8.2, 4.6, 0], 25)` },
  { n: 's6_fronton', bg: 'print', js: `presentation.preset('acero'); ${E1} ${hideExtra}; presentation.view('fronton')` },
  { n: 's7_nodo', bg: 'print', js: `presentation.preset('soloacero'); ${E1} ${hideAllCtx}; presentation.camera([16.9, -1.3, 6.9], [13.53, 2.14, 3.71], 22)` },
  // Etapa 2 · pérgola y cochera (la casa como contexto terminado)
  { n: 'e2_hero', bg: 'print', js: `presentation.preset('completa'); ${E2} ${hideExtra}; viewer.setLayer('furniture', false); viewer.layers.carportRoof.visible = false; presentation.camera([-20, -11, 13], [-3.3, 2.8, 1.0], 33)` },
  { n: 's8_cochera', bg: 'print', js: `presentation.preset('completa'); ${E2} ${hideExtra}; viewer.setLayer('furniture', false); viewer.layers.carportRoof.visible = false; presentation.camera([-13.5, -11.5, 8.5], [-3.5, -1.3, 1.1], 30)` },
  { n: 's9_pergola', bg: 'print', js: `presentation.preset('completa'); ${E2} ${hideExtra}; viewer.setLayer('furniture', false); viewer.layers.carportRoof.visible = false; presentation.camera([-12.5, 13.5, 7.5], [-1.75, 6.2, 1.1], 30)` },
];
const b = await launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
const logs = [];
p.on('console', m => { if (m.type() !== 'log' && !m.text().includes('ERR_TUNNEL')) logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(viewerURL);
await p.waitForFunction(() => window.viewer && window.viewer.ready);
await p.evaluate(() => presentation.chrome(false));
await p.waitForTimeout(400);
const only = process.argv.slice(2);
for (const s of specs) {
  if (only.length && !only.includes(s.n)) continue;
  await p.evaluate(() => { presentation.freeze(false); presentation.cut(null); presentation.explode(0); document.querySelector('#cutaxis').value = 'none'; });
  await p.evaluate(`presentation.bg('${s.bg}')`);
  await p.evaluate(`document.querySelector('#ck-dims') && document.querySelector('#ck-dims').checked && document.querySelector('#ck-dims').click(); document.querySelector('#ck-rooms') && document.querySelector('#ck-rooms').checked && document.querySelector('#ck-rooms').click();`);
  await p.evaluate(s.js);
  await p.waitForTimeout(300);
  await p.evaluate(() => presentation.freeze(true));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${s.n}.jpg`, type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: W, height: H }, timeout: 120000 });
  console.log('ok', s.n);
}
console.log(logs.join('\n'));
await b.close();
