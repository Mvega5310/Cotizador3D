// Empaqueta el visor de UN proyecto en un solo HTML.
// Generalizado de casa-castaneda/build.mjs + build_client.mjs: recibe la
// carpeta del proyecto por argumento en vez de asumir el directorio actual.
//
// Uso: node build.mjs <projects/mi-proyecto> [--client]
//   --client  empaqueta template_client.html / src/main_client.js (visor solo-vistas)
//             en vez de template.html / src/main.js (visor completo)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const projectDir = process.argv[2];
if (!projectDir) {
  console.error('Uso: node build.mjs <carpeta-del-proyecto> [--client]');
  process.exit(1);
}
const client = process.argv.includes('--client');

const entry = path.join(projectDir, 'src', client ? 'main_client.js' : 'main.js');
const templatePath = path.join(projectDir, client ? 'template_client.html' : 'template.html');
const outName = client ? 'viewer_client' : 'viewer';

const r = await build({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const tpl = fs.readFileSync(templatePath, 'utf8');
const frag = tpl.replace('/*BUNDLE*/', () => js);

const distDir = path.join(projectDir, 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, `${outName}_fragment.html`), frag);
fs.writeFileSync(
  path.join(distDir, `${outName}_full.html`),
  '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + frag + '</body></html>'
);
console.log('ok', outName, (frag.length / 1024).toFixed(0) + ' KB');
