// Abre el navegador para los scripts (cantidades y renders).
// Por defecto usa Google Chrome instalado en el equipo.
// CHROMIUM_PATH=/ruta/al/navegador  -> usa ese ejecutable
// SOFTWARE_GL=1                     -> render por software (servidores sin GPU)
import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const viewerURL = pathToFileURL(path.join(ROOT, 'dist', 'viewer_full.html')).href;

export function launch() {
  const args = ['--ignore-gpu-blocklist'];
  if (process.env.SOFTWARE_GL) args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox');
  const opts = { args };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  else opts.channel = 'chrome';
  return chromium.launch(opts);
}
