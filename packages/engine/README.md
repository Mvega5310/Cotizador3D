# @cotizador3d/engine

Motor 3D genérico, generalizado a partir de la prueba de concepto en `../../casa-castaneda`.

- **`src/helpers.js`** — primitivas de geometría y materiales (`v`, `beam`, `box`, `mats`, `steelMat`, `tileTexture`, `addEdges`). Copiado tal cual: ya era 100% genérico.
- **`src/viewer.js`** — clase `Viewer`: escena, cámara, controles, cortes, explosión, etiquetas. Generalizado desde `casa-castaneda/src/viewer.js`: ya no importa `params.js`/`civil.js`/`structure.js` de un proyecto fijo, sino que recibe las capas y vistas de cámara ya construidas por `config` (ver comentario al inicio del archivo).
- **`src/pricing.js`** — `calcQuote(bom, opciones)`: misma fórmula que la calculadora de `casa-castaneda/src/main.js` (desperdicio %, $/kg, $/nodo), sin acoplar a UI.

## Lo que este paquete NO hace

No construye geometría de ningún tipo de obra (cubierta, cercha, pérgola...). Eso vive en `projects/<slug>/` — cada proyecto arma sus propias capas con las primitivas de `helpers.js` y se las pasa al `Viewer`. Ver `docs/ARQUITECTURA.md`, sección 2, sobre la decisión pendiente de si esas capas las escribe una IA en código o las arma este motor a partir de un esquema de datos.

## Uso esperado

```js
import { Viewer, calcQuote, v, beam, mats } from '@cotizador3d/engine';

const layers = { techo: buildTecho(params), acero: buildAcero(params) }; // del proyecto
const viewer = new Viewer(canvas, stageEl, {
  layers,
  views: { iso: { label: 'Isométrica', pos: [20,20,20], tgt: [0,0,0], fov: 30 } },
  defaultView: 'iso',
  stages: { etapa1: { techo: true, acero: true } },
});
```
