# projects/

Un folder por proyecto de cliente. Cada uno sigue la misma forma que `casa-castaneda/` en la raíz del repo, pero con dos diferencias respecto a la prueba de concepto original:

1. **Construye sus capas con `@cotizador3d/engine`** (`import { beam, box, v, mats, Viewer } from '@cotizador3d/engine'`) en vez de reimplementar esas primitivas.
2. **Las specs de cámara para renders viven en `render.config.json`** (datos), no como un array de JS en el script — ver `apps/pipeline/render.mjs`.

```
projects/mi-proyecto/
├── src/
│   ├── params.js       medidas y perfiles de ESTE proyecto (hoy: archivo; destino: fila en la tabla Parametro)
│   ├── structure.js    geometría de ESTE proyecto, usando las primitivas del engine
│   ├── main.js         interfaz del visor completo + API `presentation` (para render.mjs)
│   └── main_client.js  interfaz del visor solo-vistas
├── template.html
├── template_client.html
├── render.config.json  specs de cámara para apps/pipeline/render.mjs
└── dist/, renders/, data/, pdf/   generados por apps/pipeline — no se versionan
```

## Por qué no migramos `casa-castaneda/` a este esquema todavía

`casa-castaneda/src/structure.js` y `civil.js` son la geometría de una casa específica escrita a mano — migrarla a este esquema es la primera tarea real de validación del engine (ver `docs/BACKLOG-MVP.md`, ítem 1) y conviene hacerla con cuidado, verificando visualmente que los renders no cambien, no como parte de este scaffold inicial.
