# apps/web

La app de suscripción: cuentas, login y el primer flujo completo de un
proyecto (crear → modelo 3D → cuadro de cantidades → cotización), usando
`@cotizador3d/engine` y el kit `gableRoofTruss` (cubierta a dos aguas +
cerchas metálicas).

## Qué resuelve, y qué no, esta primera versión

Resuelve lo que pediste explícitamente: **cualquiera puede crear una
cuenta, y sus proyectos no se mezclan con los de otra persona** (cada
proyecto queda ligado a la cuenta de quien lo creó — ver
`lib/actions/projects.ts::getOwnedProject`).

No resuelve todavía (quedan en `docs/BACKLOG-MVP.md`):
- Subida de planos/fotos y lectura por IA — hoy las medidas se escriben a
  mano en `/projects/new`, como un paso intermedio honesto mientras el
  paso de IA no está construido.
- Cobro/suscripción real (el plan `prueba` se asigna por defecto a toda
  cuenta nueva, sin límite forzado todavía).
- PDF descargable y link público — el visor 3D y la cotización ya
  funcionan en pantalla, exportarlos es trabajo aparte.
- Solo hay un kit (cubierta + cercha). Cocheras y pérgolas necesitan su
  propio kit en `packages/engine/src/kits/`.

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
