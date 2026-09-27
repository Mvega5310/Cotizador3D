import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const tpl = fs.readFileSync('template.html', 'utf8');
const frag = tpl.replace('/*BUNDLE*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/viewer_fragment.html', frag);
// Versión completa para pruebas locales/renders
fs.writeFileSync('dist/viewer_full.html', '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + frag + '</body></html>');
console.log('ok', (frag.length / 1024).toFixed(0) + ' KB');
