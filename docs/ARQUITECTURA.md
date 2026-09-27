# Arquitectura — Cotizador 3D para ejecutores

Este documento traduce la idea de producto (ver artifact "Cotizador 3D para ejecutores", borrador v2) en una arquitectura técnica concreta, a partir de lo que ya probamos en `casa-castaneda/`.

## 1. Punto de partida: qué es realmente `casa-castaneda/` hoy

Es una prueba de concepto **artesanal de un solo proyecto**, no un motor genérico:

| Archivo | Qué tan genérico es |
|---|---|
| `src/helpers.js` | **100% genérico.** Primitivas de geometría (`beam`, `box`, `v`), materiales, texturas. No conoce nada de Casa Castañeda. |
| `src/viewer.js` | **Mayormente genérico, pero acoplado.** El motor de escena (cámara, controles, cortes, explosión, etiquetas) es reutilizable; las vistas (`VIEWS`), los nombres de capas y las cotas (`buildDims`) están escritos a mano para esta casa. |
| `src/params.js` | **100% específico.** Cada medida es un número sacado de un plano concreto. |
| `src/structure.js`, `src/civil.js` | **100% específico.** Geometría de ESTA cubierta, ESTA pérgola, ESTOS muros — con coordenadas literales, no parametrizadas por tipo de obra. |
| `main.js` (calculadora de precio) | **Genérico en su lógica** (desperdicio %, $/kg, $/nodo), acoplado en la UI. |
| `build.mjs`, `render_struct.mjs`, `getbom.mjs`, `browser.mjs` | **El patrón es genérico** (bundle → capturas con Playwright → cuadro de cantidades), pero las rutas y specs de cámara están hardcodeadas a este proyecto. |
| `build_pdfs_etapas.py` | **100% específico.** Texto, layout y hasta los `assert` de verificación están escritos para las dos etapas de esta obra puntual. |

**Conclusión clave:** lo que se probó y funciona es el *patrón* (datos separados de geometría, render headless, PDF armado desde un cuadro de cantidades), no un producto que sirva para cualquier obra sin reescribir código. Convertir esto en SaaS no es "conectarle una base de datos": es construir, por primera vez, la capa que hoy hace una persona a mano (leer el plano y escribir `params.js`/`structure.js`).

## 2. Decisión de fondo que ya tomamos (sección 04 del plan)

El plan descarta **plantillas fijas** (una plantilla por tipo de obra, llenada con un formulario) y elige **generación asistida bajo demanda**: una IA lee planos/bocetos/notas y arma el modelo de ESE proyecto, con revisión humana antes de generar nada.

Esto tiene una consecuencia de diseño que hay que decidir pronto, porque cambia todo lo de abajo:

| Camino | Cómo funciona | Riesgo | Control del usuario |
|---|---|---|---|
| **A. IA genera código** | La IA escribe el equivalente de `params.js` + `structure.js` en JS/Three.js para cada proyecto, igual a como se hizo a mano con Casa Castañeda. | Ejecutar código generado por IA en el servidor (aunque sea sandboxed) es más difícil de asegurar y de versionar/diff. | Difícil de mostrar "qué cambió" entre versiones; revisar código no es revisar medidas. |
| **B. IA genera datos, un motor interpreta** *(recomendado)* | La IA llena un **esquema de parámetros** (JSON: medidas, perfiles, tipo de cubierta, vanos de pérgola...) que un motor genérico (`packages/engine`) interpreta para construir la escena. | Requiere diseñar el esquema y ampliarlo a medida que aparecen tipos de obra nuevos (más trabajo de ingeniería por adelantado). | Total: la pantalla de revisión (etapa 02) muestra y edita datos, no código; cada versión es un diff de JSON. |

Este documento y el scaffold que sigue **asumen el camino B**, porque es el único que sostiene "el usuario tiene el control final sobre las medidas" (sección 04 del plan) y porque ejecutar JS arbitrario generado por IA por cada suscriptor es un riesgo de seguridad que conviene evitar mientras el negocio no lo exija. Si se decide lo contrario, este documento debe revisarse antes de construir más.

## 3. Componentes del sistema objetivo

```
Cotizador 3D/
├── casa-castaneda/     Prueba de concepto, intacta — referencia y semilla
├── docs/               Este documento + modelo de datos + backlog
├── packages/
│   └── engine/         Motor 3D genérico (Three.js): primitivas, Viewer, pricing
├── apps/
│   ├── pipeline/       Build → render → BOM → PDF, generalizado por proyecto
│   └── web/            (por crear) App de suscripción: carga, revisión, dashboard
├── projects/           Un folder por proyecto de cliente (como casa-castaneda,
│                       pero con params/structure como DATOS, no código a mano)
└── prisma/             Esquema de base de datos (ver MODELO-DE-DATOS.md)
```

Mapeo directo a las 6 etapas del plan:

| Etapa del plan | Componente | Estado |
|---|---|---|
| 01 · Ingreso de planos | `apps/web` (subida + descripción libre) | Por construir |
| 02 · Revisión de medidas | `apps/web` (pantalla de confirmación de parámetros) | Por construir |
| 03 · Modelo 3D | `packages/engine` + parámetros del proyecto | Motor extraído y generalizado en este scaffold; falta el paso IA que llena los parámetros |
| 04 · Render multiángulo | `apps/pipeline/render.mjs` | Generalizado en este scaffold a partir de `render_struct.mjs` |
| 05 · PDF y link | `apps/pipeline` (pendiente migrar de Python a datos) | Patrón probado; falta generalizar plantilla |
| 06 · Cantidades y cotización | `packages/engine/pricing.js` | Lógica extraída de `main.js`, ya genérica |

## 4. Qué cambia respecto al patrón original

- **`params.js` deja de ser código fuente y pasa a ser un registro en base de datos** (tabla `parametros`, ver modelo de datos), con el origen de cada medida (`ia` o `usuario`) — esto es literalmente lo que pide la sección 08 del plan.
- **`structure.js`/`civil.js` se reemplazan por un intérprete genérico** en `packages/engine` que arma geometría a partir de un esquema de "kits" (cubierta a dos aguas, cercha metálica, pérgola/cochera, muros...). El primer kit a construir es el que ya conocemos: cubierta + cerchas + pérgola, calcado del patrón de Casa Castañeda pero parametrizado.
- **`viewer.js` se generaliza**: las vistas de cámara, las capas y las cotas ya no están escritas a mano por proyecto, sino que el motor las deriva del esquema de parámetros (p. ej. "vista de fachada norte" se calcula desde el bounding box del proyecto, no desde coordenadas fijas de esta casa).
- **El PDF deja de tener texto y layout hardcodeados por proyecto** y pasa a una plantilla que recibe: nombre del proyecto, etapas, filas del BOM, lista de renders — sin `assert` a medida.

## 5. Lo que NO se resuelve en este scaffold

- El paso de IA que lee planos/fotos/bocetos y propone los parámetros (etapa 01→02). Es el corazón del producto y el mayor desconocido de costo/tiempo — por eso el piloto (sección 09 del plan) existe.
- Autenticación, suscripciones y cobro.
- Storage de archivos (planos subidos, renders, PDFs).
- El esquema exacto de "kits" para tipos de obra más allá de cubierta/cercha/pérgola.

Ver `docs/BACKLOG-MVP.md` para el orden sugerido de ataque.
