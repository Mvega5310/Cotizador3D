# Casa Castañeda · Estructura metálica

Modelo 3D paramétrico de la estructura metálica de Casa Castañeda (Santa Rosa). Con él se generan el visor web completo, el visor de solo vistas para el cliente, los renders y un PDF por etapa de obra:

- **Etapa 1:** estructura de cubierta de la casa.
- **Etapa 2:** pérgola y cochera.

## Requisitos

- Node.js 18 o superior
- Python 3.10 o superior
- Google Chrome instalado, para las cantidades y los renders

```bash
npm install
pip install -r requirements.txt
```

## Uso

| Comando | Qué hace |
|---|---|
| `npm run build` | Arma los dos visores en `dist/` |
| `npm run cantidades` | Lee el cuadro de cantidades del modelo y lo guarda en `data/bom.json` |
| `npm run renders` | Saca las 10 imágenes de `renders/`. Se puede pasar solo algunas: `node render_struct.mjs s1_hero e2_hero` |
| `npm run pdf` | Genera los dos PDF en `pdf/` |
| `npm run todo` | Corre los cuatro pasos en orden |

Para ver los visores sin instalar nada, abre `dist/viewer_full.html` (el completo) o `dist/viewer_client_full.html` (el del cliente) en el navegador.

En Mac o Linux, si `python` no existe, corre el último paso como `python3 build_pdfs_etapas.py`.

Variables opcionales para los scripts con navegador:

- `CHROMIUM_PATH=/ruta/a/chrome`: usa otro navegador en lugar de Chrome.
- `SOFTWARE_GL=1`: renderiza por software, para servidores sin tarjeta gráfica.

## Cómo cambiar una medida

Todas las medidas y perfiles están en **`src/params.js`**:

- `P`: medidas de la cubierta, tomadas de los planos (largo, cumbrera, quiebre, aleros, frontón).
- `FRAMES_X`: posición de las 7 cerchas.
- `PROFILES`: el perfil de cada elemento. Cada uno trae sus dimensiones (`w`, `h` en metros), su peso por metro (`kgm`) y su origen (`ejecutor` o `referencia`).
- `STAGES`: qué elementos pertenecen a cada etapa.

El peso por metro de un tubo rectangular sale de:

```
área (mm²) = B·H − (B − 2t)·(H − 2t)
kg/m       = área × 0,00785
```

Por ejemplo, un tubo de 100×50×2,5 da 725 mm², o sea 5,69 kg/m.

Después de cambiar algo, corre `npm run todo` para regenerar visores, cantidades, renders y PDF.

La geometría de la pérgola y la cochera (dimensiones, vanos y piezas del eje central) está en `src/structure.js`, en las dos llamadas a `frameRect`. Si la cambias, ajusta también `struct_rows` en `build_pdfs_etapas.py`. El script compara esa tabla con el modelo y se detiene si no coinciden.

## Estructura del proyecto

```
src/
  params.js        medidas, perfiles y etapas
  structure.js     cubierta de teja y estructura de acero; calcula las cantidades por etapa
  civil.js         terreno, muros, ventanas, mobiliario, bodega y carros (contexto)
  helpers.js       materiales y utilidades de geometría
  viewer.js        escena Three.js, cámaras, capas, cortes y etapas
  main.js          interfaz del visor completo (capas, cantidades, calculadora de precio)
  main_client.js   interfaz del visor del cliente (solo vistas)
template.html          HTML y estilos del visor completo
template_client.html   HTML y estilos del visor del cliente
build.mjs / build_client.mjs   empaquetan cada visor en un solo HTML
browser.mjs      abre Chrome para los scripts
getbom.mjs       exporta el cuadro de cantidades
render_struct.mjs  define las cámaras de cada imagen y las captura
build_pdfs_etapas.py  arma los dos PDF
fonts/           tipografías del PDF (Liberation y DejaVu, licencias libres)
```

## Coordenadas del modelo

Todo está en metros. X va de oeste (0) a este (16,7); Y de norte, eje A (0), a sur, eje D (9,0); Z es la altura sobre el terreno. Three.js usa Y como eje vertical, así que `helpers.js` convierte con `v(X, Y, Z)`.

## Límites

Los modelos y cantidades son de referencia para visualizar y cotizar. No reemplazan el diseño ni el cálculo estructural de un profesional. Limahoyas, cerchuelas de frontón y soleras de amarre siguen siendo supuestos pendientes de confirmar con el ejecutor, igual que la altura de las columnas de la pérgola y la cochera.
