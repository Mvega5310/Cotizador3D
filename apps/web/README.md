# apps/web

La app de suscripción sobre el motor (`@cotizador3d/engine`): cuentas, login y proyectos como lista de elementos (guía v3). Sirve para cualquier producto que el motor sepa dibujar y medir; no está atada a ningún tipo de obra.

## Qué hace hoy

- **Cuentas y aislamiento:** registro y login (bcrypt + JWT en cookie httpOnly). Cada proyecto pertenece a la cuenta que lo creó; otro usuario recibe 404 (`lib/proyectos.ts::obtenerProyecto`).
- **Crear proyecto** (`/projects/new`): subiendo planos (ver más abajo). Lo que propone la IA se corre por el motor: lo que no se pueda interpretar se descarta y se avisa, en vez de tumbar el proyecto entero.
- **Página del proyecto:** visor 3D con las etapas activables, cuadro de cantidades por etapa (kg, m², m³, m, und), estado de cada pieza (confirmada o referencia) y cotización con precio por pieza, desperdicio, mano de obra y alcance por etapa.
- **Versiones:** confirmar una pieza, o corregir la geometría de uno o varios elementos (`EditorElementos.tsx`), no edita el proyecto — crea la versión siguiente con esos cambios.
- **Login completo:** registro con verificación de correo (banner + reenviar si no llegó) y recuperar contraseña ("¿olvidaste tu contraseña?" en el login), ambos por enlaces de un solo uso que vencen (`TokenAuth` en el esquema). El correo sale por Resend — sin `RESEND_API_KEY` configurada, el registro y el login igual funcionan, solo no llega el correo (se registra en el log del servidor).
- **Límites por plan:** crear un proyecto se bloquea (antes de llamar a la IA) si se agotó el cupo del mes o, en la prueba gratuita, el cupo total de una sola vez. El panel muestra cuántos proyectos van usados (`lib/planes.ts`).
- **Guarda los planos que subes:** cada archivo (foto o PDF) y tu descripción quedan guardados en el proyecto (`ArchivoEntrada`, en disco bajo `.data/planos/<id>/`), visibles en una sección "Planos subidos" — antes se mandaban a la IA y se perdían. Solo los puede ver el dueño del proyecto (`/projects/[id]/archivos/[archivo]`), nunca por el link público.
- **Subir planos con IA (único camino para crear un proyecto):** en `/projects/new`, subir fotos o PDF de planos + una descripción libre. `lib/ia.ts` se los manda a Claude (visión, JSON pedido en el texto y validado con Zod — ver nota en el archivo sobre por qué no se usa salida estructurada) pidiendo *solo datos* — catálogo y elementos con el mismo contrato de formas del motor, nunca código. Cada elemento sale marcado `origen: "ia"` y sin confirmar; lo que no se pueda interpretar se descarta y se avisa en vez de tumbar el proyecto. Necesita `ANTHROPIC_API_KEY` en el entorno. Probado con un plano real (ver `docs/BACKLOG-MVP.md`, ítem 7): funciona bien para piezas simples, inconsistente para estructuras metálicas complejas.
- **La IA trabaja en segundo plano** (`lib/generacion.ts`): "Generar proyecto" responde al instante con el proyecto en estado `procesando`; la lectura de planos (1–4 min) corre con `after()` y la página se refresca sola (`EsperandoIA.tsx`). Si falla, el proyecto queda en `error` con el motivo y un botón "Reintentar" que usa los planos ya guardados; un intento fallido no gasta cupo. Si un despliegue corta una generación, a los 15 min se marca como interrumpida.
- **Supuestos de la IA guardados:** las notas de la IA (medidas asumidas, lo que no se pudo leer) quedan en el proyecto (`Proyecto.notasIA`) y se muestran siempre.
- **Cotización guardada** (`lib/cotizacion.ts`, `Proyecto.cotizacion`): precios por pieza, desperdicio y mano de obra (% y/o valor fijo) se guardan solos mientras se escriben y salen desglosados en el link completo y en el PDF. Si el usuario escribe precios en la descripción, la IA los asigna a cada pieza (marcados "leído de tu descripción"); nunca inventa precios.
- **APU, AIU, IVA y retenciones** (`engine/pricing.js::calcPresupuesto`): cada línea del cuadro es un ítem con valor unitario = material × (1 + desperdicio del ítem) + mano de obra + equipo + transporte, por unidad. Lo que se cuenta por unidad no lleva desperdicio salvo que el ítem lo diga. Costo directo + AIU (% de administración, imprevistos y utilidad), IVA según régimen (no responsable / sobre la utilidad en contrato de obra / sobre el total en venta) y retenciones de referencia (retefuente, reteIVA, reteICA) hasta el neto a recibir. El PDF muestra el presupuesto, el AIU, el IVA y un anexo de APU; las retenciones solo se ven en la página del proyecto.
- **Consumos por material** (`CatalogoPieza.consumos`, `EditorConsumos.tsx`): reglas tipo "anticorrosivo: 1 galón por 30 m² de superficie", "soldadura: 0,03 kg por kg de acero", "acero de refuerzo: 80 kg por m³", "8 tornillos por tablero". El motor las suma en una línea por consumo (aunque vengan de varias piezas), redondea hacia arriba lo que se compra entero y cada línea lleva su precio. La IA las propone como supuestos; el usuario las edita en la página del proyecto.
- **Carpintería / ebanistería:** forma `tablero` (pieza de mueble con su espesor real), canto en metros lineales como línea aparte, despiece (lista de cortes en mm) y mínimo de láminas por material, en la página, el link completo y el PDF (`Despiece.tsx`).
- **PDF y enlaces públicos:** cada proyecto tiene un link completo (visor + cantidades) y uno de cliente (solo visor), sin sesión, con marca de agua durante la prueba. "Generar PDF" abre `/p/<token>/imprimir` con Playwright, captura las 5 vistas de cámara y arma un PDF de varias páginas, servido en `/p/<token>/pdf`.

## Qué no hace todavía (ver `docs/BACKLOG-MVP.md`)

- Consistencia de la IA en planos técnicos complejos (ver hallazgo de calidad en `docs/BACKLOG-MVP.md`, ítem 7).
- Cambiar la contraseña ya con sesión iniciada (hoy solo existe recuperarla por correo).
- Cobro de verdad (Stripe u otro) — hoy el plan de una cuenta es siempre `prueba`, puesto por el código; el límite de proyectos ya se hace cumplir, pero no hay forma de pasar a un plan pago.
- Generar el PDF fuera de un servidor propio (ver la limitación anotada en `lib/actions/pdf.ts`).
- Guardar los planos en un storage de verdad (hoy quedan en el disco del servidor, `.data/planos/`) para cuando esto se despliegue fuera de esta máquina.
- Base de precios y APU por cuenta reutilizable entre proyectos (hoy cada proyecto guarda los suyos).
- APU con cuadrilla (rendimiento × jornal con prestaciones); hoy la mano de obra se da directo en $ por unidad.
- Formas más allá de `viga`, `panel`, `volumen`, `tablero` y `pieza`. Se agregan en `packages/engine/src/formas.js` cuando un producto las pida.

## Correr en local

```bash
# desde la raíz del repo
npm install

cd apps/web
# variables de entorno (DATABASE_URL para Prisma, AUTH_SECRET para la sesión)
cp .env.local .env            # o créalos a mano; ver abajo

npm run db:generate           # cliente de Prisma
npx prisma migrate deploy --schema=../../prisma/schema.prisma   # crea las tablas
npm run dev
```

`.env` / `.env.local` (ambos ignorados por git) con:

```
DATABASE_URL="postgresql://..."  # una base Postgres de desarrollo (NO la de producción)
AUTH_SECRET="una-cadena-larga-y-aleatoria"
ANTHROPIC_API_KEY="sk-ant-..."   # necesaria solo para "Subir planos (con IA)"
RESEND_API_KEY="re_..."          # necesaria para que lleguen los correos de verificación/recuperación
```

Abre `http://localhost:3000`, crea una cuenta y luego un proyecto. La
primera compilación de cada página tarda (30 s o más en esta carpeta).

## Producción (Railway)

Se construye con el `Dockerfile` de la raíz del repo (imagen oficial de
Playwright, que trae el Chromium que usa el PDF). Al arrancar aplica las
migraciones (`prisma migrate deploy`) y levanta `next start`.

Variables del servicio: `DATABASE_URL` (referencia al Postgres del mismo
proyecto), `AUTH_SECRET` (aleatoria; sin ella el servidor no arranca),
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, y `DATA_DIR=/data` con un Volumen
montado en `/data` para que planos y PDF sobrevivan a cada despliegue.

Notas:
- Prisma está fijado en **6.19.3**. La 7.x exige `prisma.config.ts` y un
  adaptador de base de datos; la línea "latest" del CLI hoy es un RC 8.x.
  No subir de versión sin migrar ese cambio.
- `playwright-core` está fijado en **1.63.0**, igual que la imagen del
  `Dockerfile`. Si se cambia uno, hay que cambiar el otro.
- Postgres en todos los entornos. Las migraciones de la época SQLite se
  reemplazaron por una sola `0_init` (siguen en el historial de git).
