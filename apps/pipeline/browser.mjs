// Abre el navegador para los scripts de esta carpeta (bom, render).
// Generalizado de casa-castaneda/browser.mjs: ya no asume una sola carpeta
// de proyecto, recibe la ruta al `dist/viewer_full.html` que se quiere abrir.
//
// CHROMIUM_PATH=/ruta/al/navegador  -> usa ese ejecutable en vez de Chrome
// SOFTWARE_GL=1                     -> render por software (servidores sin GPU)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';

export function viewerURL(distHtmlPath) {
  return pathToFileURL(distHtmlPath).href;
}

export function launch() {
  const args = ['--ignore-gpu-blocklist'];
  if (process.env.SOFTWARE_GL) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox');
  const opts = { args };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  else opts.channel = 'chrome';
  return chromium.launch(opts);
}
