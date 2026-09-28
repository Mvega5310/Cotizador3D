# apps/web

La app de suscripción sobre el motor (`@cotizador3d/engine`): cuentas, login y proyectos como lista de elementos (guía v3). Sirve para cualquier producto que el motor sepa dibujar y medir; no está atada a ningún tipo de obra.

## Qué hace hoy

- **Cuentas y aislamiento:** registro y login (bcrypt + JWT en cookie httpOnly). Cada proyecto pertenece a la cuenta que lo creó; otro usuario recibe 404 (`lib/proyectos.ts::obtenerProyecto`).
- **Crear proyecto** (`/projects/new`): desde un ejemplo (`projects/casa-castaneda`, `projects/porton-reja`) o pegando una lista de elementos en JSON. Lo que entra se valida y se corre por el motor: si un elemento no se puede interpretar, se rechaza diciendo cuál y por qué.
- **Página del proyecto:** visor 3D con las etapas activables, cuadro de cantidades por etapa (kg, m², m³, m, und), estado de cada pieza (confirmada o referencia) y cotización con precio por pieza, desperdicio, mano de obra y alcance por etapa.
- **Versiones:** confirmar una pieza de referencia no edita el proyecto; crea la versión siguiente con esos elementos confirmados.
- **PDF y enlaces públicos:** cada proyecto tiene un link completo (visor + cantidades) y uno de cliente (solo visor), sin sesión, con marca de agua durante la prueba. "Generar PDF" abre `/p/<token>/imprimir` con Playwright, captura las 5 vistas de cámara y arma un PDF de varias páginas, servido en `/p/<token>/pdf`.

## Qué no hace todavía (ver `docs/BACKLOG-MVP.md`)

- Subir planos y que una IA proponga los elementos (hoy se crea desde un ejemplo o JSON).
- Editar la geometría de un elemento en pantalla (solo se confirma).
- Cobro y límite de proyectos por plan (toda cuenta nueva queda en `prueba`, sin tope forzado).
- Generar el PDF fuera de un servidor propio (ver la limitación anotada en `lib/actions/pdf.ts`).
- Formas más allá de `viga`, `panel`, `volumen` y `pieza`. Se agregan en `packages/engine/src/formas.js` cuando un producto las pida.

## Correr en local

```bash
# desde la raíz del repo
npm install

cd apps/web
# variables de entorno (DATABASE_URL para Prisma, AUTH_SECRET para la sesión)
cp .env.local .env            # o créalos a mano; ver abajo

npm run db:generate           # cliente de Prisma
npm run db:migrate -- --name init   # crea prisma/dev.db (sqlite)
npm run dev
```

`.env` / `.env.local` (ambos ignorados por git) con:

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="una-cadena-larga-y-aleatoria"
```

Abre `http://localhost:3000`, crea una cuenta y luego un proyecto. La
primera compilación de cada página tarda (30 s o más en esta carpeta).

Notas:
- Prisma está fijado en **6.19.3**. La 7.x exige `prisma.config.ts` y un
  adaptador de base de datos; la línea "latest" del CLI hoy es un RC 8.x.
  No subir de versión sin migrar ese cambio.
- La base de datos vive en `prisma/dev.db` (raíz del repo). Para
  producción, cambiar `provider` en `prisma/schema.prisma` a
  `postgresql` y `DATABASE_URL` a la conexión real.
- Cambiar `AUTH_SECRET` antes de desplegar; el valor por defecto es solo
  para desarrollo.
