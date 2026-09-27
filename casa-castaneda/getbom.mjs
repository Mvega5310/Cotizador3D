// Lee el cuadro de cantidades del modelo 3D y lo guarda en data/bom.json
import fs from 'fs';
import path from 'path';
import { launch, viewerURL, ROOT } from './browser.mjs';
const b = await launch();
const p = await b.newPage({ viewport: { width: 600, height: 400 } });
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(viewerURL);
await p.waitForFunction(() => window.viewer && window.viewer.ready);
const bom = await p.evaluate(() => presentation.bom());
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'bom.json'), JSON.stringify(bom, null, 1));
for (const [k, v] of Object.entries(bom._stage)) console.log(k, v.n, 'piezas', v.len.toFixed(1), 'm', v.kg.toFixed(0), 'kg', v.nodes, 'nodos');
await b.close();
