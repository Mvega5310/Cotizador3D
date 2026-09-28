# projects/

Un proyecto = **datos**, no código (ver `docs/ARQUITECTURA.md` §2). Cada carpeta trae un `elementos.json` con la forma que interpreta `packages/engine`:

```json
{
  "proyecto": "Nombre",
  "etapas": [{ "numero": 1, "nombre": "..." }],
  "catalogo": { "tubo50": { "id": "tubo50", "nombre": "...", "unidad": "kg", "dimensiones": { "ancho": 0.05, "alto": 0.05 }, "factor": 3.0 } },
  "elementos": [{ "id": "m1", "forma": "viga", "pieza": "tubo50", "etapa": 1, "geometria": { "a": [0,0,0], "b": [3,0,0] }, "origen": "usuario", "confirmado": true }]
}
```

## casa-castaneda/

Primer proyecto convertido. `elementos.json` se generó con `generar-elementos.mjs`, que ejecuta el código artesanal original (`../../casa-castaneda/src`) y guarda cada viga y nodo que dibuja; no reescribe la geometría a mano. `casa.test.js` verifica que el motor obtiene exactamente el mismo cuadro de cantidades que `casa-castaneda/data/bom.json`.

```bash
node projects/casa-castaneda/generar-elementos.mjs    # regenerar elementos.json
node --test projects/casa-castaneda/casa.test.js      # verificar contra el original
```

Falta convertir teja, muros, terreno y mobiliario (ver `docs/BACKLOG-MVP.md`, ítem 3).
