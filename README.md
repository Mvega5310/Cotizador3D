# Cotizador 3D para ejecutores

Espacio de trabajo por suscripción donde arquitectos, contratistas y ejecutores suben planos, medidas e ideas, y reciben un esquema 3D de su obra desde varios ángulos, un PDF listo para presentar y, cuando lo necesitan, una cotización con las cantidades sacadas del plano.

Este repo tiene dos partes:

## `casa-castaneda/` — la prueba de concepto
Todo el camino recorrido a mano para un cliente real (Casa Castañeda, Santa Rosa): lectura de planos, modelo 3D paramétrico, renders multiángulo y PDF técnico-comercial. **Intacta, no se toca** — es la referencia de lo que ya se sabe que funciona. Ver su propio `README.md`.

## El resto — el producto
Estructura nueva que generaliza el patrón probado en Casa Castañeda para que sirva a cualquier proyecto, no solo a uno:

| Carpeta | Qué es |
|---|---|
| `docs/` | Análisis y decisiones: `ARQUITECTURA.md`, `MODELO-DE-DATOS.md`, `BACKLOG-MVP.md`. **Empieza por aquí.** |
| `packages/engine/` | Motor 3D genérico (Three.js), extraído y generalizado de `casa-castaneda/src`. |
| `apps/pipeline/` | Build → render → cuadro de cantidades, generalizado por proyecto. |
| `apps/web/` | La app de suscripción: cuentas, login, y el flujo crear proyecto → modelo 3D → cotización, ya funcional para un primer tipo de obra (cubierta + cercha). Falta subir planos con lectura por IA — ver su propio `README.md` y `docs/BACKLOG-MVP.md`, ítem 4. |
| `projects/` | Un folder por proyecto de cliente, con la forma de `casa-castaneda/` pero usando `packages/engine`. |
| `prisma/schema.prisma` | Esquema de base de datos: usuarios, suscripción, proyectos, versiones, parámetros, resultados. |

## Por dónde seguir

1. Lee `docs/ARQUITECTURA.md` — en particular la sección 2, sobre una decisión de fondo aún abierta (¿la IA genera código o datos?) que cambia el resto del diseño.
2. Revisa `docs/BACKLOG-MVP.md` para el orden de construcción hacia el piloto de la sección 09 del plan de producto.

## Instalar

```bash
npm install   # instala los workspaces de packages/ y apps/
```

`casa-castaneda/` tiene su propia instalación independiente (`cd casa-castaneda && npm install && pip install -r requirements.txt`) — sigue siendo un proyecto aparte, no un workspace de este repo.
