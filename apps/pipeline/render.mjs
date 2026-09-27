// Saca las capturas de cámara de UN proyecto.
// Generalizado de casa-castaneda/render_struct.mjs: las especificaciones de
// cámara (antes un array de JS hardcodeado en el script) viven ahora en
// <projectDir>/render.config.json, como datos — no como código por proyecto.
//
// Uso: node render.mjs <projects/mi-proyecto> [nombre1 nombre2 ...]
//   Sin nombres, renderiza todas las specs del config.
//
// render.config.json:
//   {
//     "width": 1700, "height": 1050,
//     "specs": [
//       { "name": "s1_hero", "bg": "print", "js": "presentation.preset('acero'); presentation.camera([40,36,30],[9.5,4.5,1.6],16)" }
//     ]
//   }
// `js` se ejecuta en la página contra la API `presentation` que expone el
// main.js del proyecto (mismo contrato que casa-castaneda/src/main.js).
import fs from 'fs';
import path from 'path';
import { launch, viewerURL } from './browser.mjs';

const projectDir = process.argv[2];
if (!projectDir) {
  console.error('Uso: node render.mjs <carpeta-del-proyecto> [specs...]');
  process.exit(1);
}
const only = process.argv.slice(3);

const config = JSON.parse(fs.readFileSync(path.join(projectDir, 'render.config.json'), 'utf8'));
const { width: W = 1700, height: H = 1050, specs } = config;
const OUT = path.join(projectDir, 'renders');
fs.mkdirSync(OUT, { recursive: true });

const b = await launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
const logs = [];
p.on('console', m => { if (m.type() !== 'log') logs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(viewerURL(path.join(projectDir, 'dist', 'viewer_full.html')));
await p.waitForFunction(() => window.viewer && window.viewer.ready);
await p.evaluate(() => presentation.chrome(false));
await p.waitForTimeout(400);

for (const s of specs) {
  if (only.length && !only.includes(s.name)) continue;
  await p.evaluate(() => { presentation.freeze(false); presentation.cut(null); presentation.explode(0); });
  await p.evaluate(`presentation.bg('${s.bg || 'print'}')`);
  await p.evaluate(s.js);
  await p.waitForTimeout(300);
  await p.evaluate(() => presentation.freeze(true));
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, `${s.name}.jpg`), type: 'jpeg', quality: 94, clip: { x: 0, y: 0, width: W, height: H }, timeout: 120000 });
  console.log('ok', s.name);
}
console.log(logs.join('\n'));
await b.close();
