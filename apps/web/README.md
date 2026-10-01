# apps/web

La app de suscripción sobre el motor (`@cotizador3d/engine`): cuentas, login y proyectos como lista de elementos (guía v3). Sirve para cualquier producto que el motor sepa dibujar y medir; no está atada a ningún tipo de obra.

## Qué hace hoy

- **Cuentas y aislamiento:** registro y login (bcrypt + JWT en cookie httpOnly). Cada proyecto pertenece a la cuenta que lo creó; otro usuario recibe 404 (`lib/proyectos.ts::obtenerProyecto`).
- **Crear proyecto** (`/projects/new`): subiendo planos (ver más abajo). Lo que propone la IA se corre por el motor: lo que no se pueda interpretar se descarta y se avisa, en vez de tumbar el proyecto entero.
- **Página del proyecto:** visor 3D con las etapas activables, cuadro de cantidades por etapa (kg, m², m³, m, und), estado de cada pieza (confirmada o referencia) y cotización con precio por pieza, desperdicio, mano de obra y alcance por etapa.
- **Versiones:** confirmar una pieza, o corregir la geometría de uno o varios elementos (`EditorElementos.tsx`), no edita el proyecto — crea la versión siguiente con esos cambios.
- **Login completo:** registro con verificación de correo (banner + reenviar si no llegó) y recuperar contraseña ("¿olvidaste tu contraseña?" en el login), ambos por enlaces de un solo uso que vencen (`TokenAuth` en el esquema). El correo sale por Resend — sin `RESEND_API_KEY` configurada, el registro y el login igual funcionan, solo no llega el correo (se registra en el log del servidor).
- **Guarda los planos que subes:** cada archivo (foto o PDF) y tu descripción quedan guardados en el proyecto (`ArchivoEntrada`, en disco bajo `.data/planos/<id>/`), visibles en una sección "Planos subidos" — antes se mandaban a la IA y se perdían. Solo los puede ver el dueño del proyecto (`/projects/[id]/archivos/[archivo]`), nunca por el link público.
- **Subir planos con IA (único camino para crear un proyecto):** en `/projects/new`, subir fotos o PDF de planos + una descripción libre. `lib/ia.ts` se los manda a Claude (visión, JSON pedido en el texto y validado con Zod — ver nota en el archivo sobre por qué no se usa salida estructurada) pidiendo *solo datos* — catálogo y elementos con el mismo contrato de formas del motor, nunca código. Cada elemento sale marcado `origen: "ia"` y sin confirmar; lo que no se pueda interpretar se descarta y se avisa en vez de tumbar el proyecto. Necesita `ANTHROPIC_API_KEY` en el entorno. Probado con un plano real (ver `docs/BACKLOG-MVP.md`, ítem 7): funciona bien para piezas simples, inconsistente para estructuras metálicas complejas.
- **PDF y enlaces públicos:** cada proyecto tiene un link completo (visor + cantidades) y uno de cliente (solo visor), sin sesión, con marca de agua durante la prueba. "Generar PDF" abre `/p/<token>/imprimir` con Playwright, captura las 5 vistas de cámara y arma un PDF de varias páginas, servido en `/p/<token>/pdf`.

## Qué no hace todavía (ver `docs/BACKLOG-MVP.md`)

- Consistencia de la IA en planos técnicos complejos (ver hallazgo de calidad en `docs/BACKLOG-MVP.md`, ítem 7).
- Cambiar la contraseña ya con sesión iniciada (hoy solo existe recuperarla por correo).
- Cobro y límite de proyectos por plan (toda cuenta nueva queda en `prueba`, sin tope forzado).
- Generar el PDF fuera de un servidor propio (ver la limitación anotada en `lib/actions/pdf.ts`).
- Guardar los planos en un storage de verdad (hoy quedan en el disco del servidor, `.data/planos/`) para cuando esto se despliegue fuera de esta máquina.
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
ANTHROPIC_API_KEY="sk-ant-..."   # necesaria solo para "Subir planos (con IA)"
RESEND_API_KEY="re_..."          # necesaria para que lleguen los correos de verificación/recuperación
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
