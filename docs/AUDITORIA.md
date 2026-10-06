# Auditoría · Cotizador3D

> Repositorio: `github.com/Mvega5310/Cotizador3D`
> Documento vivo: cada ronda de auditoría actualiza esta misma página.
> Ubicación en el repo: `docs/AUDITORIA.md`

## Cómo se usa

- Cada hallazgo tiene un **identificador fijo** (`H-01`, `S-01`…) que no cambia entre rondas. Así puedes citarlo en un commit: `fix: H-01 límite de subida`.
- **H** = hallazgo: algo que falla o es un riesgo hoy. **S** = sugerencia: algo que falta o se puede mejorar.
- **Prioridad:** P1 antes de abrir a usuarios reales · P2 durante el piloto · P3 después.
- **Estado:** `abierto` · `en curso` · `resuelto (commit)` · `descartado (motivo)`.
- Cuando resuelvas algo, cambia su estado en la tabla y marca sus casillas. En la siguiente ronda se verifica contra el código.
- Para una nueva ronda: haz push y pide "auditoría del repo". Se revisa el commit más reciente y se agrega una entrada al [historial](#historial-de-rondas).

---

## Resumen

| ID | Hallazgo o sugerencia | Área | Prioridad | Estado |
|---|---|---|---|---|
| H-01 | Las subidas de más de 1 MB fallan y los límites superan los de la API de Claude | Subida de planos | P1 | resuelto (3ba9db5) |
| H-02 | Las pruebas gratis se pueden abusar (sin verificar correo, sin límite de intentos) | Costos / seguridad | P1 | resuelto (3ba9db5) |
| H-03 | Restablecer la contraseña no cierra las sesiones abiertas | Seguridad | P1 | resuelto (3ba9db5) |
| H-04 | Sin `APP_URL`, los enlaces de los correos salen del encabezado `Host` | Seguridad | P1 | resuelto (3ba9db5) |
| H-05 | El PDF se genera dentro de la petición y sin límite de navegadores | Rendimiento | P1 | resuelto (3ba9db5) |
| H-06 | El enlace del PDF abre la vista con cantidades y precios; el PDF muestra el APU | Privacidad del usuario | P1 | resuelto (3ba9db5) |
| S-01 | Términos del servicio, política de datos (Ley 1581) y advertencia en el registro | Legal | P1 | abierto |
| H-07 | Las vigas se descartan cuando falta la sección | Calidad de la IA | P2 | en curso (a y b en 3ba9db5) |
| H-08 | El modelo de IA está fijo en el código | Calidad / costos de la IA | P2 | en curso (3ba9db5) |
| H-09 | Respuestas largas que se cortan por `max_tokens` | Calidad de la IA | P2 | en curso (3ba9db5) |
| S-02 | Leer planos en DXF | Entrada de planos | P2 | abierto |
| S-03 | Unidad en pulgadas para madera | Motor | P2 | abierto |
| S-04 | Métricas del piloto más allá del costo | Producto | P2 | en curso (3ba9db5) |
| S-05 | Integración continua (pruebas, tipos y lint en cada push) | Mantenimiento | P2 | resuelto (3ba9db5) |
| S-06 | Respaldos de Postgres y del volumen `/data` | Operación | P2 | abierto |
| S-07 | Exportar el modelo (GLB) y la planta (DXF) | Producto | P3 | abierto |
| S-08 | Doble clic en "Generar" o "Reintentar" | Robustez | P3 | resuelto (3ba9db5) |
| S-09 | Nombre de la marca en un solo lugar | Mantenimiento | P3 | abierto |
| S-10 | Advertencias de lint | Mantenimiento | P3 | resuelto (3ba9db5) |

---

## Lo que está bien resuelto

Para no tocarlo al arreglar lo demás:

- **La decisión de fondo:** los proyectos son datos, el código es propio y la IA nunca escribe código (`docs/ARQUITECTURA.md` §2).
- **La IA no puede saltarse la revisión:** `origen` y `confirmado` los fija el servidor (`lib/proyectos.ts::depurarEntradaIA`).
- **Lo que no se puede interpretar se descarta y se cuenta,** sin tumbar el proyecto completo.
- **El cupo se revisa antes de llamar a la IA,** y un intento fallido no gasta cupo (`lib/planes.ts`).
- **El costo de cada llamada queda registrado,** incluidas las fallidas (`GeneracionIA`, `lib/costos.ts`, `/admin/uso`).
- **La generación corre en segundo plano** con `after()`, y una generación cortada se marca como interrumpida a los 15 minutos.
- **Los proyectos están aislados por cuenta** en todas las consultas; nombres de archivo y tokens se validan antes de tocar el disco.
- **La autenticación cuida detalles:** la recuperación responde igual exista o no la cuenta, la verificación no se gasta cuando un cliente de correo escanea el enlace, y `AUTH_SECRET` es obligatorio en producción.
- **Versiones fijadas:** Playwright igual en el `Dockerfile` y en `package.json`; Prisma fijado con la razón documentada.
- **Casa Castañeda reproducida como datos,** con pruebas que comparan contra el original.

---

## Prioridad 1 · Antes de abrir a usuarios reales

### H-01 · Las subidas de más de 1 MB fallan
**Qué pasa:** en Next.js 16.3.6 las Server Actions aceptan como máximo **1 MB** por petición si no se configura otro límite (`defaultBodySizeLimit = '1 MB'` en `next/dist/server/app-render/action-handler.js`, aplica también a formularios con archivos). `next.config.ts` no lo cambia. El formulario promete "hasta 6 archivos, 15 MB cada uno"; una sola foto de celular (2 a 6 MB) daría error 413.

**Además, los límites del formulario superan los de la API de Claude:** según la documentación oficial, 10 MB por imagen en base64 (unos 7,5 MB reales) y 32 MB por petición. Y la API reduce las imágenes a 2.576 px por el lado largo en los modelos de resolución alta (Claude 4.7 en adelante, que debería incluir `claude-opus-5`), y a 1.568 px en los demás: una foto de 12 megapíxeles no aporta más detalle.

- [x] Subir el límite en `next.config.ts`
- [x] Limitar el total subido según lo que acepta la API
- [x] Reducir las imágenes a 2.576 px en el servidor antes de mandarlas a la IA (el original se guarda igual)
- [x] Rechazar con mensaje claro los formatos que la API no acepta (HEIC de iPhone). Acepta JPEG, PNG, GIF y WebP.
- [ ] Probar con una foto real de 3 a 5 MB tomada con el celular

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@cotizador3d/engine"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};
```

```ts
// apps/web/lib/actions/proyectos.ts — en lugar de MAX_BYTES_ARCHIVO por archivo
const MAX_TOTAL = 22 * 1024 * 1024; // la API acepta 32 MB por petición y el base64 suma ~33 %
const FORMATOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

for (const a of archivosForm) {
  if (!FORMATOS.has(a.type)) return { error: `"${a.name}" no es JPG, PNG, WebP o PDF. En iPhone, comparte la foto como JPG.` };
}
const total = archivosForm.reduce((s, a) => s + a.size, 0);
if (total > MAX_TOTAL) return { error: "Entre todos los archivos pasan de 22 MB. Sube menos páginas o fotos más livianas." };
```

```ts
// apps/web/lib/imagenes.ts — requiere `npm i sharp -w web`
import sharp from "sharp";

const LADO_MAX = 2576; // lado largo máximo que la API aprovecha en modelos de alta resolución

export async function prepararParaIA(a: { nombre: string; mime: string; datos: Buffer }) {
  if (!a.mime.startsWith("image/")) return a; // los PDF van tal cual
  const datos = await sharp(a.datos)
    .rotate() // respeta la orientación de la foto del celular
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  return { ...a, mime: "image/jpeg", datos };
}
// En crearDesdeIAAction: guarda los originales y manda a la IA `await Promise.all(archivos.map(prepararParaIA))`.
```

### H-02 · Las pruebas gratis se pueden abusar
**Qué pasa:** al registrarse, la cuenta puede generar de inmediato sin confirmar el correo (`registerAction`), y registro, login y recuperación no tienen límite de intentos. Cada cuenta nueva trae 2 generaciones con `claude-opus-5`. Con correos desechables, alguien puede crear cuentas en serie y gastar crédito de la API. El costo real por generación se ve en `/admin/uso`.

- [x] Exigir correo verificado antes de la primera generación (registrarse y explorar siguen sin bloqueo)
- [x] Limitar intentos por IP en registro, login y recuperar contraseña
- [ ] Opcional: en `/admin/uso`, alerta si una sola IP crea muchas cuentas

```ts
// apps/web/lib/actions/proyectos.ts — en crearDesdeIAAction, antes de chequearCupo
if (!usuario.emailVerificado && process.env.RESEND_API_KEY) {
  return { error: "Confirma tu correo antes de generar tu primer proyecto. Si no te llegó, pídelo de nuevo desde tu panel." };
}
// Sin RESEND_API_KEY (desarrollo) no se exige, porque el correo no saldría.
```

```ts
// apps/web/lib/limite.ts — limitador simple en memoria (sirve mientras haya una sola instancia)
import { headers } from "next/headers";

const intentos = new Map<string, { n: number; desde: number }>();

export async function permitir(accion: string, max = 10, ventanaMs = 15 * 60_000): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  const clave = `${accion}:${ip}`;
  const ahora = Date.now();
  const r = intentos.get(clave);
  if (!r || ahora - r.desde > ventanaMs) { intentos.set(clave, { n: 1, desde: ahora }); return true; }
  r.n += 1;
  return r.n <= max;
}
// Uso: if (!(await permitir("login"))) return { error: "Demasiados intentos. Espera unos minutos." };
// Registro: permitir("registro", 5, 60 * 60_000)
```

### H-03 · Restablecer la contraseña no cierra las sesiones abiertas
**Qué pasa:** la sesión es un JWT de 30 días que solo se verifica por firma (`lib/auth.ts`). Al restablecer la contraseña, las sesiones abiertas en otros dispositivos siguen válidas. Si alguien recupera la contraseña porque le robaron la cuenta, el intruso sigue adentro.

- [x] Agregar `sesionVersion` al usuario, guardarla en el token y compararla al leer la sesión
- [x] Subirla al restablecer la contraseña (y, si quieres, con "cerrar sesión en todos los dispositivos")

```prisma
// prisma/schema.prisma — en model Usuario
sesionVersion Int @default(0)
```

```ts
// lib/auth.ts
export type SessionPayload = { userId: string; email: string; sv: number };
// createSessionToken firma también `sv`; verifySessionToken valida typeof payload.sv === "number".

// lib/session.ts — getSession
const payload = await verifySessionToken(token);
if (!payload) return null;
const u = await prisma.usuario.findUnique({ where: { id: payload.userId }, select: { sesionVersion: true } });
if (!u || u.sesionVersion !== payload.sv) return null;
return payload;

// lib/actions/auth.ts — restablecerAction
data: { passwordHash, sesionVersion: { increment: 1 } }
// y setSessionCookie con el sv nuevo
```

### H-04 · Sin `APP_URL`, los enlaces de los correos salen del encabezado `Host`
**Qué pasa:** `origen()` usa `APP_URL` si existe; si no, arma la dirección con el encabezado `Host`, que lo controla quien envía la petición. En producción no se exige, como sí se hace con `AUTH_SECRET`. Si falta en Railway, alguien podría pedir una recuperación a nombre de otro usuario y hacer que el correo lleve un enlace a un dominio ajeno.

- [x] Hacer `APP_URL` obligatoria en producción

```ts
// lib/actions/auth.ts — origen()
if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
if (process.env.NODE_ENV === "production") throw new Error("Falta APP_URL en producción.");
```

### H-05 · El PDF se genera dentro de la petición y sin límite de navegadores
**Qué pasa:** `generarPdfAction` abre Chromium y espera hasta 3 minutos dentro de la misma petición; en el celular, si la pantalla se bloquea, parece que se quedó pegado (el mismo problema que ya se resolvió para la IA). Cada clic abre un Chromium nuevo: varios usuarios a la vez, o uno que toque el botón varias veces, pueden dejar sin memoria el servicio en Railway.

- [x] Generar el PDF con `after()` y guardar su estado en `Resultado` (generando · listo · error)
- [x] Una sola generación de PDF a la vez por instancia, en cola
- [x] Desactivar el botón mientras se genera

```ts
// lib/cola.ts — una tarea a la vez
let cola: Promise<unknown> = Promise.resolve();
export function enCola<T>(tarea: () => Promise<T>): Promise<T> {
  const r = cola.then(tarea, tarea);
  cola = r.catch(() => {});
  return r;
}
// generarPdfAction: marcar "generando", responder, y after(() => enCola(() => renderizarPdf(...)))
```

### H-06 · El enlace del PDF abre la vista con cantidades y precios
**Qué pasa:** el PDF se sirve con el token del **link completo** (`/p/<linkCompleto>/pdf`). Quien reciba el enlace del PDF puede quitar `/pdf` y entrar a la vista completa con cantidades, cotización y despiece. Además, el PDF incluye el anexo de APU (mano de obra, equipo, transporte, desperdicio), que muchos ejecutores no quieren mostrar a su cliente.

- [x] Token propio para el PDF (`Resultado.pdfToken`), distinto del link completo
- [x] Opción "incluir anexo de APU en el PDF", apagada por defecto
- [x] PDF de presentación sin precios ni cantidades para el cliente final, a partir del link de cliente
- [x] `noindex` en todas las páginas `/p/*`

```ts
// apps/web/app/p/[token]/page.tsx (y en imprimir/page.tsx)
export const metadata = { robots: { index: false, follow: false } };
// En las rutas /p/[token]/pdf: headers: { ..., "X-Robots-Tag": "noindex" }
```

### S-01 · Términos del servicio y política de datos
**Qué falta:** el repo no tiene páginas de términos ni de privacidad, y el registro no pide autorización de tratamiento de datos. Los usuarios suben planos de sus clientes, que para ellos es información sensible. La advertencia de "referencia, no cálculo estructural" ya está en el link público; falta en los términos y en el registro.

- [ ] Página de **política de tratamiento de datos** según la Ley 1581 de 2012 (habeas data), con autorización explícita en el registro (casilla obligatoria)
- [ ] Página de **términos del servicio**: quién es dueño de los planos subidos (el usuario), qué hace la plataforma con ellos, cuánto tiempo se guardan y cómo pedir que se borren
- [ ] Advertencia en el registro y en los términos: "Modelos y cantidades de referencia para visualizar y cotizar; no reemplazan el diseño ni el cálculo estructural de un profesional facultado"
- [ ] Decir en el registro dónde rinde mejor: productos hechos de piezas con medidas. Las formas orgánicas salen aproximadas.
- [ ] Antes de invertir en marca: buscar el nombre en la SIC (clase 42) y comprar el dominio `.com` y `.co`

---

## Prioridad 2 · Durante el piloto

### H-07 · Las vigas se descartan cuando falta la sección
**Qué pasa:** es el problema anotado en `BACKLOG-MVP.md` (ítem 7). El motor exige `dimensiones.ancho` y `dimensiones.alto` en cada pieza usada por una `viga`; cuando el modelo no los pone, el elemento se descarta. Desaparece justo la estructura metálica.

- [x] **a.** Sacar la sección del nombre de la pieza ("Tubo rect. 150×50×4 mm", "Viga 3″×6″") antes de validar
- [x] **b.** Si no se puede, dejar una sección provisional marcada `provisional: true`, mostrarla en la revisión como "sección por confirmar" y contarla en las notas
- [ ] **c.** Si siguen quedando errores, mandar a Claude solo la lista de errores y pedir las entradas del catálogo corregidas (llamada corta y barata)
- [x] En el ejemplo de forma exacta del prompt (`SISTEMA`), poner `"dimensiones": { "ancho": 0.05, "alto": 0.15 }` en una pieza de viga. Los modelos copian el ejemplo.

```ts
// apps/web/lib/proyectos.ts — antes de calcularProyecto en depurarEntradaIA
const SECCION = /(\d+(?:[.,]\d+)?)\s*(″|"|mm|cm)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(″|"|mm|cm)?/i;

function seccionDesdeNombre(nombre: string): { ancho: number; alto: number } | null {
  const m = nombre.match(SECCION);
  if (!m) return null;
  const unidad = (m[2] || m[4] || "").toLowerCase();
  const a = Number(m[1].replace(",", ".")), b = Number(m[3].replace(",", "."));
  if (!unidad && Math.max(a, b) < 20) return null; // "2x4" sin unidad es ambiguo: mejor provisional
  const f = unidad === "″" || unidad === '"' ? 0.0254 : unidad === "cm" ? 0.01 : 0.001; // sin unidad: mm
  const [menor, mayor] = [Math.min(a, b) * f, Math.max(a, b) * f];
  return menor > 0 && mayor < 2 ? { ancho: menor, alto: mayor } : null; // alto = peralte, el lado mayor
}

const usadasPorViga = new Set(resp.elementos.filter((e) => e.forma === "viga").map((e) => e.pieza));
for (const [clave, p] of Object.entries(catalogo)) {
  if (!usadasPorViga.has(clave)) continue;
  const d = p.dimensiones as { ancho?: number; alto?: number };
  if ((d.ancho ?? 0) > 0 && (d.alto ?? 0) > 0) continue;
  const s = seccionDesdeNombre(p.nombre);
  p.dimensiones = s ? { ...d, ...s } : { ...d, ancho: 0.05, alto: 0.05, provisional: true };
}
```

### H-08 · El modelo de IA está fijo en el código
`const MODELO = "claude-opus-5"` en `lib/ia.ts`. Para probar otro modelo, o bajar costos en un plan económico, hay que desplegar de nuevo.

- [x] Leerlo de una variable de entorno: `process.env.IA_MODELO ?? "claude-opus-5"` (`lib/costos.ts` ya resuelve la tarifa por prefijo)
- [ ] Comparar calidad y costo por modelo con los mismos planos (el modelo ya queda en `GeneracionIA.modelo`)

### H-09 · Respuestas largas que se cortan
Con `max_tokens: 32000` y JSON en texto, un mueble con muchos tableros o una estructura grande puede quedar cortada. Ya se detecta (`stop_reason === "max_tokens"`), pero el usuario pierde la generación.

- [x] Medir en `/admin/uso` cuántas generaciones terminan por `max_tokens`
- [ ] Si pasa seguido: generar por etapa en varias llamadas, o pedir elementos repetidos como una sola entrada con `repetir` (n copias y separación) que el servidor expanda

**Notas sobre la IA (no son defectos):**
- *Prompt caching:* con el volumen actual aporta poco. El caché dura 5 minutos y las generaciones llegan espaciadas; lo caro son los planos y la salida, no las instrucciones. Revisarlo cuando haya varias generaciones por hora.
- *Salida estructurada:* la razón documentada en `lib/ia.ts` para no usar `output_config.format` tiene sentido. *Tool use* con `tool_choice` forzado es otro mecanismo; solo valdría cambiarlo tras una prueba A/B con los mismos planos, comparando cuántos elementos se descartan.

### S-02 · Leer planos en DXF
Hoy se aceptan imágenes y PDF. Los arquitectos e ingenieros trabajan en AutoCAD: el DXF (que AutoCAD exporta con un clic) trae las coordenadas exactas, más precisas que leer una foto.

- [ ] Aceptar `.dxf`: leer líneas, polilíneas y textos por capa con `dxf-parser`, convertir a metros según `$INSUNITS` y mandarle a Claude un resumen en texto. Claude interpreta qué es cada cosa y las medidas salen exactas del archivo.
- [ ] Si llega DWG, pedir que lo exporten a DXF o PDF (mensaje en el formulario)
- [ ] Si `$INSUNITS` no viene, preguntar la unidad en la revisión

```ts
// apps/web/lib/dxf.ts — requiere `npm i dxf-parser -w web`
import DxfParser from "dxf-parser";

const FACTOR: Record<number, number> = { 4: 0.001, 5: 0.01, 6: 1 }; // $INSUNITS: mm, cm, m

export function resumirDxf(texto: string) {
  const dxf = new DxfParser().parseSync(texto);
  const codigo = (dxf?.header as Record<string, unknown> | undefined)?.$INSUNITS as number | undefined;
  const f = (codigo && FACTOR[codigo]) ?? 0.001; // sin dato: asumir mm y confirmar con el usuario
  const lineas: string[] = [];
  for (const e of dxf?.entities ?? []) {
    const ent = e as { type: string; layer: string; vertices?: { x: number; y: number }[]; text?: string; startPoint?: { x: number; y: number }; position?: { x: number; y: number } };
    if (ent.vertices) lineas.push(`${ent.layer} ${ent.type}: ${ent.vertices.map((v) => `(${(v.x * f).toFixed(3)},${(v.y * f).toFixed(3)})`).join(" ")}`);
    if (ent.text) { const p = ent.startPoint ?? ent.position; lineas.push(`${ent.layer} TEXTO "${ent.text}"${p ? ` en (${(p.x * f).toFixed(3)},${(p.y * f).toFixed(3)})` : ""}`); }
  }
  return { unidadesConfirmadas: !!(codigo && FACTOR[codigo]), texto: lineas.join("\n") };
}
```

### S-03 · Unidad en pulgadas para madera
Las unidades son `kg`, `m2`, `m3`, `ml` y `und` (enum `Unidad` en Prisma, `UNIDADES` en `interprete.js`, esquema en `lib/ia.ts`). La madera aserrada en Colombia se cotiza por pulgada comercial: 1″ × 1″ × 3 m = 0,001935 m³. Una viga de 3″ × 6″ de 3 m son 18 pulgadas.

- [ ] Cuando llegue el primer proyecto en madera, agregar `pulgada` en los tres lugares, con `medir` de la viga: `ancho_pulg × alto_pulg × largo_m / 3`
- [ ] Uniones en madera (pernos, herrajes, platinas) como `pieza` por unidad, igual que los herrajes de cocina

### S-04 · Métricas del piloto más allá del costo
`/admin/uso` ya mide el costo. Para fijar precios y decidir qué mejorar faltan:

| Métrica | De dónde sale |
|---|---|
| Tiempo hasta el primer 3D | `GeneracionIA.duracionMs` (ya existe; falta mostrarlo) |
| Correcciones por proyecto | Número de versiones por proyecto |
| Elementos descartados por la IA | `Proyecto.descartadosIA` sobre el total |
| Elementos sin confirmar al entregar | `Elemento.confirmado = false` en la última versión |
| Generaciones cortadas por `max_tokens` | Agregar `stopReason` a `GeneracionIA` |
| Proyectos por tipo de obra | `Proyecto.tipoObra` |
| Visitas al link de cliente | Contador en `/p/[token]` (modo cliente) |
| Conversión de prueba a pago | Cuando exista el cobro |

- [ ] Agregar estas métricas a `/admin/uso`

### S-05 · Integración continua
No hay `.github/workflows`. Las pruebas existen pero nadie las corre automáticamente.

- [x] Workflow de GitHub Actions en cada push: `npm ci`, `prisma generate`, `tsc --noEmit`, `npm test`, `eslint`. Así un cambio que rompa las cantidades de Casa Castañeda se detecta antes de desplegar.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx prisma generate --schema=prisma/schema.prisma
        working-directory: .
      - run: npx tsc --noEmit
        working-directory: apps/web
      - run: npm test
      - run: npx eslint .
        working-directory: apps/web
```

### S-06 · Respaldos
Los planos y PDF viven en el volumen `/data` y los datos en Postgres de Railway. El volumen es de una sola instancia, así que no se puede escalar a dos réplicas mientras los archivos vivan ahí. Para el piloto está bien; moverlo a un bucket ya está en el backlog.

- [ ] Respaldo programado de Postgres
- [ ] Respaldo del volumen `/data`
- [ ] Probar una restauración una vez (un respaldo que nunca se probó no se sabe si sirve)

---

## Prioridad 3 · Después del piloto

### S-07 · Exportar el modelo y la planta
- [ ] Descargar el modelo en GLB (`GLTFExporter` de Three.js). Se abre en SketchUp, Blender y visores web.
- [ ] Descargar la planta en DXF (elementos proyectados en planta). Se abre en AutoCAD.
- [ ] Exportar el cuadro de cantidades a Excel

### S-08 · Doble clic en "Generar" o "Reintentar"
El botón se desactiva, pero el servidor no impide dos generaciones casi simultáneas. Riesgo bajo, ya anotado en el backlog.

- [x] En `reintentarGeneracionAction`, cambiar el estado con un `updateMany` condicional (`where: { id, estado: "error" }`); si no actualiza ninguna fila, otro intento ya arrancó.

### S-09 · Nombre de la marca en un solo lugar
"Cotizador 3D" aparece en correos, marca de agua y títulos.

- [ ] Una constante `MARCA` (y `MARCA_CORTA`) usada en todos esos lugares, para cambiar el nombre definitivo con una sola edición

### S-10 · Advertencias de lint
- [x] Las dos `<img>` de `VisorImprimible.tsx` están bien así (capturas en `data:` para imprimir): silenciar la regla en ese archivo
- [x] Los parámetros sin usar de `reenviarVerificacionAction`: desactivar la regla con un comentario en esa línea

---

## Historial de rondas

### Ronda 1 · 6 de octubre de 2026 · commit `0074079`
**Alcance:** lectura completa de `apps/web` (acciones, librerías, rutas públicas y privadas, esquema de Prisma), del motor (`packages/engine`), `Dockerfile` y documentación.

**Verificaciones:**

| Verificación | Resultado |
|---|---|
| Pruebas del motor | 11 de 11 pasan |
| Pruebas de Casa Castañeda | 4 de 4 pasan (3.529,4 kg, igual al original) |
| Lint | 0 errores, 4 advertencias (S-10) |
| Tipos (`tsc --noEmit`) | No se pudo completar en el entorno de auditoría: no deja descargar el motor de Prisma y el cliente no se generó. Correr en local o con S-05. |
| Claves o `.env` versionados | Ninguno |
| Límite de subida de Next.js 16.3.6 | Verificado en el código fuente de Next (H-01) |
| Límites de imágenes de la API de Claude | Verificados en la documentación oficial (H-01) |

**Resultado:** 9 hallazgos (H-01 a H-09) y 10 sugerencias (S-01 a S-10). Seis de prioridad 1 son hallazgos y una es sugerencia (S-01).

**Orden sugerido:** H-01 → H-02, H-03, H-04 → H-07 (a y b) → S-01 → H-05, H-06 → el resto según `/admin/uso`.

### Respuesta a la ronda 1 · 6 de octubre de 2026 · commit `3ba9db5`
**Verificaciones:** pruebas 17 de 17 (13 del motor, 2 nuevas de secciones; 4 de Casa Castañeda) · `tsc --noEmit` sin errores · lint 0 errores, 0 advertencias · `next build` correcto.

**Cómo quedó cada punto, y en qué se apartó de lo sugerido:**

| ID | Implementación |
|---|---|
| H-01 | Como se sugirió. La foto se reduce solo si pasa de 2.576 px o si la versión reducida pesa menos (un PNG de líneas pequeño queda igual). Probado con una foto sintética de 4000 × 3000 px y 10,5 MB: queda en 2,1 MB a 1932 × 2576 y respeta la orientación EXIF. También avisa en el navegador al elegir archivos, antes de subirlos. **Falta:** probar en producción con una foto real de celular. |
| H-02 | La IP sale de `X-Real-IP` (la pone el proxy de Railway) o del **último** valor de `X-Forwarded-For`, no del primero: ese lo puede escribir quien hace la petición. Además del límite por IP hay uno **por correo** en login (contra probar contraseñas desde muchas IP) y en recuperar o reenviar (contra llenarle el buzón a alguien). La página de nuevo proyecto avisa del correo sin confirmar antes de que la persona suba sus planos. **Sin hacer:** la alerta opcional de muchas cuentas desde una IP. |
| H-03 | Los tokens emitidos antes del cambio cuentan como versión 0: desplegar no cierra la sesión de nadie, y el primer restablecimiento sí invalida todas. `getSession` usa `cache` de React para no repetir la consulta en una misma petición. Se agregó "Salir de todos los dispositivos" en el panel. |
| H-04 | Como se sugirió. `APP_URL` ya estaba en Railway (`https://app.proyects.store`). |
| H-05 | Como se sugirió, más un candado por proyecto: un `updateMany` condicional impide dos PDF a la vez del mismo proyecto, y uno que quedó "generando" más de 5 minutos se puede relanzar. |
| H-06 | Ruta nueva `/d/<pdfToken>`, separada de `/p/…`; el token cambia en cada generación y el PDF anterior se borra. Se eliminó `/p/[token]/pdf`, y la migración borra los `pdfUrl` viejos (hay que regenerar esos PDF). **Hallazgo nuevo, corregido en el mismo commit:** en modo cliente, la página de impresión mandaba al navegador la cotización y el despiece aunque no los dibujara (quedaban dentro del HTML). Ahora en modo cliente no salen del servidor. |
| H-07 | a y b, en el motor (`packages/engine/src/secciones.js`, con pruebas). Además de "150×50" y pulgadas, lee diámetros ("Ø3″") y designaciones de perfil ("IPE 300", "HEA 200"). Lo provisional se avisa en los supuestos y hay un recuadro "Secciones por confirmar" para escribir la sección real, que antes no tenía dónde editarse. **Sin hacer:** c (segunda llamada corta a la IA), mientras a y b basten. |
| H-08 | `IA_MODELO`. **Falta:** la comparación entre modelos, que necesita crédito de API. |
| H-09 | `GeneracionIA.stopReason`; `/admin/uso` muestra cuántas se cortaron en el mes. **Sin hacer:** generar por etapas o `repetir`, hasta que la métrica diga que hace falta. |
| S-04 | Por ahora solo el `stopReason`. El resto de métricas sigue abierto. |
| S-05 | `.github/workflows/ci.yml`. Corre `next typegen` antes de `tsc`, porque los tipos `LayoutProps` y `PageProps` los genera Next. |
| S-08 | Como se sugirió. |
| S-10 | En vez de un comentario por línea, la regla ignora parámetros que empiezan con `_` (la convención). Las `<img>` del PDF se silencian en ese archivo, con la razón. |

**Siguen abiertos:** S-01 (necesita los datos legales del responsable del tratamiento), S-02, S-03, S-06 (respaldos: se configuran en Railway), S-07 y S-09.

<!--
Plantilla para la próxima ronda:

### Ronda N · fecha · commit `xxxxxxx`
**Alcance:**
**Verificaciones:** (pruebas, lint, tipos, secretos)
**Cambios desde la ronda anterior:** IDs resueltos, IDs que siguen abiertos, hallazgos nuevos
**Orden sugerido:**
-->
