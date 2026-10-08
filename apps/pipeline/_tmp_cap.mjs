import { chromium } from 'playwright-core';
const etiqueta = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
for (const [nombre, t] of [['completo', 'bab60bd0b7f462b17ff0c19834dc01e9'], ['cliente', 'acca0155279c0d8e8c4266986a647b28']]) {
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', (e) => console.log(nombre, 'PAGEERROR', e.message));
  await p.goto('https://app.proyects.store/p/' + t);
  await p.locator('canvas').first().waitFor({ timeout: 90000 });
  await p.waitForTimeout(5000);
  const caja = await p.locator('canvas').first().boundingBox();
  await p.screenshot({ path: 'C:/Users/ACER/AppData/Local/Temp/claude/c--Users-ACER-OneDrive---uniminuto-edu-Aplicaciones-Cotizador-3D/a2b39eeb-bfae-447e-b847-f3c59c40fd86/scratchpad/gab/h11_' + etiqueta + '_' + nombre + '.png', clip: caja });
  await p.close();
}
await b.close();
console.log('ok', etiqueta);
