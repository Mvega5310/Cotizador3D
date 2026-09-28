# @cotizador3d/engine

Motor 3D genérico. Los proyectos son **datos** (una lista de elementos); el código de este paquete es nuestro y es lo único que se ejecuta. Ver `docs/ARQUITECTURA.md` §2.

- `src/formas.js`: biblioteca de formas (`viga`, `panel`, `volumen`, `pieza`). Cada una declara su geometría, cómo se dibuja y cómo saca su cantidad. Una forma nueva se agrega aquí, una vez.
- `src/interprete.js`: `calcularProyecto({ elementos, catalogo, etapas })` devuelve cantidades por etapa y unidad (kg, m2, m3, ml, und), bounding box y `errores` (forma, pieza, geometría o unidad inválidas). `construirEscena(...)` (solo navegador) devuelve capas por etapa y vistas para el `Viewer`.
- `src/pricing.js`: `calcCotizacion(calculo, { precios, desperdicioPct, manoObraPct, etapa })`. Los precios pueden ir por pieza (`{ tubo50: 9000 }`) o por unidad (`{ kg: 8500 }`); el de la pieza gana.
- `src/viewer.js`, `src/helpers.js`, `src/vistas.js`: visor, primitivas y vistas de cámara calculadas del volumen del proyecto.

```js
import { calcularProyecto, construirEscena, calcCotizacion, Viewer } from '@cotizador3d/engine';

const calculo = calcularProyecto({ elementos, catalogo });   // servidor o navegador
const cot = calcCotizacion(calculo, { precios: { kg: 9000, m2: 45000 }, desperdicioPct: 8 });
const { layers, views } = construirEscena({ calculo });      // solo navegador
new Viewer(canvas, stage, { layers, views, defaultView: 'iso' });
```

Pruebas: `npm test`. Incluyen un portón con reja armado solo con datos (prueba de que el motor no depende de un producto).
