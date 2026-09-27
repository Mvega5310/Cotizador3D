# @cotizador3d/pipeline

Los mismos cuatro pasos que ya funcionan en `casa-castaneda/` (bundle → cantidades → renders → PDF), generalizados para operar sobre cualquier carpeta en `projects/` en vez de un proyecto fijo.

```bash
npm run build  -- ../../projects/mi-proyecto            # visor completo
npm run build  -- ../../projects/mi-proyecto --client   # visor solo-vistas
npm run bom    -- ../../projects/mi-proyecto
npm run render -- ../../projects/mi-proyecto             # todas las specs de render.config.json
npm run render -- ../../projects/mi-proyecto s1_hero     # solo algunas
```

Cada proyecto necesita, dentro de su carpeta, la misma forma que `casa-castaneda/` ya tiene: `src/main.js`, `template.html`, y ahora además `render.config.json` con las specs de cámara como datos (ver comentario al inicio de `render.mjs`). El PDF (`pdf.mjs` o equivalente) todavía no está generalizado — hoy sigue siendo el script Python de `casa-castaneda/build_pdfs_etapas.py`, escrito a mano por proyecto; generalizarlo es una tarea pendiente en `docs/BACKLOG-MVP.md`.

Requiere Google Chrome instalado (o `CHROMIUM_PATH`) para `bom` y `render`, igual que la prueba de concepto original.
