// Lee el cuadro de cantidades del visor de UN proyecto y lo guarda en
// <projectDir>/data/bom.json. Generalizado de casa-castaneda/getbom.mjs.
//
// Uso: node bom.mjs <projects/mi-proyecto>
import fs from 'fs';
import path from 'path';
import { launch, viewerURL } from './browser.mjs';

const projectDir = process.argv[2];
if (!projectDir) {
  console.error('Uso: node bom.mjs <carpeta-del-proyecto>');
  process.exit(1);
}

const b = await launch();
const p = await b.newPage({ viewport: { width: 600, height: 400 } });
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(viewerURL(path.join(projectDir, 'dist', 'viewer_full.html')));
await p.waitForFunction(() => window.viewer && window.viewer.ready);
const bom = await p.evaluate(() => presentation.bom());
const dataDir = path.join(projectDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'bom.json'), JSON.stringify(bom, null, 1));
if (bom._stage) {
  for (const [k, v] of Object.entries(bom._stage)) console.log(k, v.n, 'piezas', v.len.toFixed(1), 'm', v.kg.toFixed(0), 'kg', v.nodes, 'nodos');
}
await b.close();
