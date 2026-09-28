# Arquitectura — Cotizador 3D

Traduce la guía de producto (artifact "Cotizador 3D para ejecutores", **borrador v3**, 28/09/2026) a arquitectura técnica. Reemplaza a la versión basada en el borrador v2.

## 1. Qué cambió en la guía (v2 → v3) y qué implica

| v2 | v3 | Implicación técnica |
|---|---|---|
| Para arquitectos, contratistas y ejecutores | Plataforma abierta a **cualquier persona o empresa** | Registro abierto; `Cuenta` puede ser una persona o una empresa |
| Casa Castañeda era el alcance | Casa Castañeda es **un ejemplo** de cómo se ve una cotización | Nada del código puede asumir "cubierta con teja" |
| Código y datos separados (`params.js` / `structure.js`) | El proyecto es **una lista de elementos como datos**; el motor es igual para todos | Decisión cerrada: el proyecto son datos; el código (motor, formas, catálogo) lo escribimos nosotros (ver §2) |
| Solo kilos | Cinco unidades: kg, m², m³, m lineal, unidad | El cuadro de cantidades y la calculadora deben ser multiunidad |
| Perfiles de material | **Catálogo de piezas** compartido entre proyectos | Se generaliza `PerfilMaterial` |
| Planes Ejecutor / Estudio | Personal / Profesional / Empresa | Enum `Plan` |
| Siguiente paso: piloto | Siguiente paso: **separar motor del ejemplo y probar con un segundo rubro** | Es el criterio de aceptación del motor (ver `BACKLOG-MVP.md`) |

## 2. Decisión cerrada: los proyectos son datos; el código lo escribimos nosotros

Hay dos capas, con dueños distintos:

| Capa | Qué es | Quién la produce |
|---|---|---|
| **Código** (el motor) | Visor 3D, renders, PDF, links, cantidades, calculadora, marca de dato confirmado/referencia, **biblioteca de formas** (viga, panel, volumen, pieza...) y **catálogo de piezas** | **Nosotros**, a mano, versionado en este repo |
| **Datos** (el proyecto) | Lista de elementos: qué es, su forma, su pieza del catálogo, cantidad, unidad, etapa y origen (IA o usuario) | La IA los propone a partir de los planos; el usuario los revisa y corrige |

Reglas que salen de esto:

- **La IA nunca escribe ni ejecuta código.** Solo llena elementos con formas y piezas que el motor ya conoce. Se ejecuta únicamente código nuestro, revisado.
- **Si un pedido necesita una forma o una pieza que no existe**, la programamos nosotros una vez (forma en `packages/engine`, pieza en el catálogo) y desde ahí sirve a todos los proyectos. La IA no la inventa: si no encuentra una forma adecuada, marca el elemento como no reconocido y el usuario lo ve en la revisión.
- **El esquema de cada `forma` es un contrato nuestro.** Cada forma declara qué medidas pide, cómo se dibuja y cómo se calcula su cantidad. La IA y el formulario de revisión se rigen por ese contrato.
- La pantalla de revisión (etapa 02) muestra y edita datos; cada versión es un diff de datos.

**Prueba de aceptación del motor**: un segundo producto de un rubro distinto (p. ej. cocina integral o portón con reja) debe salir con el mismo motor. Como el código es nuestro, la pregunta no es "cero código" sino "cuánto motor nuevo hizo falta": lo sano es que un producto nuevo solo agregue formas o piezas *genéricas y reutilizables*, nunca lógica específica de ese producto. Si el segundo ejemplo obliga a escribir código que solo sirve para él, el motor todavía no es genérico.

## 3. Estado real del código

| Pieza | Estado |
|---|---|
| `casa-castaneda/` | Prueba de concepto artesanal, intacta. Geometría escrita a mano para esa casa. Es el primer proyecto que hay que convertir a lista de elementos. |
| `packages/engine` — `helpers.js`, `viewer.js`, `formas.js`, `interprete.js`, `vistas.js`, `pricing.js` | Genéricos. Cuatro formas (`viga`, `panel`, `volumen`, `pieza`), intérprete de elementos con cantidades por etapa en las cinco unidades y errores explícitos, y `calcCotizacion` multiunidad. Con pruebas (`npm test` en el paquete). `pricing.js::calcQuote` (solo kg y nodos) queda mientras la web no migre. |
| `packages/engine/src/kits/gableRoofTruss.js` | **Transitorio.** Es un generador específico de cubierta a dos aguas. Sirvió para validar el flujo, pero es exactamente el enfoque "una plantilla por tipo de obra" que la guía descarta como núcleo. Debe reemplazarse por el intérprete de elementos; a lo sumo sobrevive como *generador* que produce elementos. |
| `apps/web` | Login, cuentas y proyectos aislados por cuenta: funcional. Las pantallas de crear proyecto, cuadro de cantidades y visor **están atadas al kit de cubierta** y hay que rehacerlas sobre elementos. |
| `apps/pipeline` | Genérico por carpeta de proyecto. |
| PDF | Sigue siendo el script Python escrito a mano para Casa Castañeda. |

## 4. Componentes objetivo

```
casa-castaneda/     Primer ejemplo (intacto hasta convertirlo)
docs/               Esta guía técnica, modelo de datos, backlog
packages/engine/    Motor: visor, renders, cantidades multiunidad, intérprete de elementos
apps/web/           Registro, login, proyectos, revisión de elementos, cotización
apps/pipeline/      Build → render → cantidades → PDF por proyecto
prisma/             Esquema de datos
```

Mapeo a las seis etapas de la guía:

| Etapa | Componente | Estado |
|---|---|---|
| 01 Ingreso de planos, medidas e ideas | `apps/web` | Por construir (hoy: formulario a mano del kit de cubierta) |
| 02 Revisión de lo que entendió la IA | `apps/web` (editar elementos con su origen) | Por construir |
| 03 Modelo 3D | Intérprete de elementos en `packages/engine` | Hecho en el motor; falta conectarlo a la web |
| 04 Render multiángulo | `apps/pipeline/render.mjs` | Generalizado por carpeta; falta que las vistas salgan del bounding box de los elementos |
| 05 PDF y links | `apps/pipeline` | Falta generalizar plantilla |
| 06 Cantidades y cotización | `packages/engine/pricing.js::calcCotizacion` | Hecho en el motor (multiunidad, por etapa); falta conectarlo a la web |

## 5. Límites a dejar claros

- Modelos y cantidades son de referencia; no reemplazan diseño ni cálculo estructural (debe ir en términos de servicio y en cada PDF).
- Rinde mejor en productos hechos de piezas con medidas (construcción, metalmecánica, carpintería, vidrio, mobiliario). Formas orgánicas salen aproximadas; decirlo en el registro.
- Cuando llegue una pieza o forma que el motor no tiene, la agregamos nosotros una vez y queda para todos (ver §2).

## 6. Fuera de este documento

El paso de IA que lee planos y propone los elementos es el mayor desconocido de costo; el piloto (guía §10) existe para medirlo.
