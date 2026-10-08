# Auditoría · Cotizador3D

> Repositorio: `github.com/Mvega5310/Cotizador3D`
> Documento vivo: cada ronda de auditoría actualiza esta misma página.
> Ubicación en el repo: `docs/AUDITORIA.md`

## Cómo se usa

- Cada hallazgo tiene un **identificador fijo** (`H-01`, `S-01`…) que no cambia entre rondas. Así puedes citarlo en un commit: `fix: H-10 PDF atascado`.
- **H** = hallazgo: algo que falla o es un riesgo hoy. **S** = sugerencia: algo que falta o se puede mejorar.
- **Prioridad:** P1 antes de abrir a usuarios reales · P2 durante el piloto · P3 después.
- **Estado:** `abierto` · `en curso` · `resuelto (commit)` · `descartado (motivo)`. Un `resuelto` significa que la auditoría lo comprobó en el código, no solo que se marcó.
- Cuando resuelvas algo, cambia su estado en la tabla y marca sus casillas. En la siguiente ronda se verifica contra el código.
- Para una nueva ronda: haz push y pide "auditoría del repo". Se revisa el commit más reciente y se agrega una entrada al [historial](#historial-de-rondas).

---

## Resumen

| ID | Hallazgo o sugerencia | Área | Prioridad | Estado |
|---|---|---|---|---|
| H-14 | Dos enlaces reales de producción quedaron escritos en el historial de git (repo público) | Seguridad / Privacidad | P1 | resuelto (c363353) · enlaces invalidados en producción; historial sin reescribir (decisión pendiente) |
| H-11 | El catálogo reducido del link de cliente borra las vigas del 3D (y del PDF de presentación) | Privacidad / Robustez | P1 | resuelto (a1ac8bb) · verificado, comprobado en producción por el autor |
| H-12 | Comprobar que `X-Real-IP` no se puede falsificar (de eso depende el límite de intentos); dos bordes del limitador | Seguridad | P1 | resuelto (aa8f3d8, 6aea204) · comprobado en producción |
| S-01 | Términos del servicio, política de datos (Ley 1581) y advertencia en el registro | Legal | P1 | abierto |
| H-10 | Un PDF que se queda en "generando" bloquea el botón para siempre | Robustez | P2 | resuelto (aa8f3d8) |
| H-13 | Un tubo redondo "Ø 2″ × 2,5 mm" se lee como sección rectangular, sin aviso | Motor | P2 | resuelto (aa8f3d8) |
| H-07 | Las vigas se descartan cuando falta la sección | Calidad de la IA | P2 | en curso (a, b verificados; d, e en aa8f3d8; falta c) |
| S-02 | Leer planos en DXF | Entrada de planos | P2 | abierto |
| S-03 | Unidad en pulgadas para madera | Motor | P2 | abierto |
| S-04 | Métricas del piloto más allá del costo | Producto | P2 | en curso (solo `stopReason`) |
| S-06 | Respaldos de Postgres y del volumen `/data` | Operación | P2 | abierto |
| S-12 | Anexo técnico: PDF con vistas y desglose de material **sin precios**, y Excel, para quien usa su propio formato de cotización | Producto | P2 | resuelto (c363353) · comprobado en producción |
| S-13 | Poder invalidar y regenerar los enlaces de un proyecto | Seguridad / Producto | P2 | resuelto (c363353) · comprobado en producción |
| S-07 | Exportar el modelo (GLB) y la planta (DXF); el Excel pasó a S-12 | Producto | P3 | abierto |
| S-14 | Rellenar la plantilla de cotización del propio usuario (Excel o Word) | Producto | P3 | **abierto (nuevo, ronda 4)** · decidir tras el piloto |
| S-09 | Nombre de la marca en un solo lugar | Mantenimiento | P3 | resuelto (aa8f3d8) · verificado |
| H-01 | Subidas de más de 1 MB y límites mayores que los de la API de Claude | Subida de planos | P1 | resuelto (3ba9db5) · verificado |
| H-02 | Pruebas gratis abusables (sin verificar correo, sin límite de intentos) | Costos / seguridad | P1 | resuelto (3ba9db5) · verificado, ver H-12 |
| H-03 | Restablecer la contraseña no cierra las sesiones abiertas | Seguridad | P1 | resuelto (3ba9db5) · verificado |
| H-04 | Sin `APP_URL`, los enlaces de los correos salen del encabezado `Host` | Seguridad | P1 | resuelto (3ba9db5) · verificado |
| H-05 | El PDF se genera dentro de la petición y sin límite de navegadores | Rendimiento | P1 | resuelto (3ba9db5) · verificado, ver H-10 |
| H-06 | El enlace del PDF abre la vista con cantidades y precios; el PDF muestra el APU | Privacidad del usuario | P1 | resuelto (3ba9db5) · verificado, ver H-11 |
| H-08 | El modelo de IA está fijo en el código | Calidad / costos de la IA | P2 | resuelto (3ba9db5) · verificado |
| H-09 | Respuestas largas que se cortan por `max_tokens` | Calidad de la IA | P2 | resuelto (3ba9db5) · medición verificada |
| S-05 | Integración continua (pruebas, tipos y lint en cada push) | Mantenimiento | P2 | resuelto (3ba9db5) · en verde: `c934e13`, `aa8f3d8`, `c7447fb` (incluye `6aea204`), `a1ac8bb`, `55f5a5a` |
| S-08 | Doble clic en "Generar" o "Reintentar" | Robustez | P3 | resuelto (3ba9db5) · verificado |
| S-10 | Advertencias de lint | Mantenimiento | P3 | resuelto (3ba9db5) · verificado |
| S-11 | Limitador de intentos: la purga de memoria usa la ventana equivocada | Seguridad | P3 | resuelto (a1ac8bb) · verificado |

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
- **Nuevo en la ronda 2:**
  - El PDF tiene token propio y ruta propia (`/d/<token>`), con `X-Robots-Tag`; el token cambia en cada generación y el PDF anterior se borra.
  - Los candados de generación y de PDF son atómicos (`updateMany` condicional), no un "revisar y luego actualizar".
  - La reducción de imágenes nunca deja una foto más pesada que su versión JPEG, así que no puede pasar del tope de la API.
  - La migración 5 es aditiva y limpia los `pdfUrl` viejos con una razón escrita en el SQL.
  - Todos los cambios llegaron con pruebas (`secciones.test.js`) y el CI las corre.

---

## Prioridad 1 · Antes de abrir a usuarios reales

### H-12 · Comprobar que `X-Real-IP` no se puede falsificar

**Ronda 3: verificado.** `ipCliente()` ya usa solo `X-Real-IP` y devuelve `null` si falta; sin IP no se aplica el límite por IP y quedan los de correo. El login cuenta solo los fallos (`loginBloqueado` y `registrarFalloLogin`), y `permitirAccion` ya no admite `"login"`. La ruta temporal `/ip` no existe en el repo. El resultado de producción (la tabla de abajo) lo reporta el autor: no lo repetí desde fuera, pero es coherente con el código. Dos restos menores están en S-11.
**Qué pasa:** `lib/limite.ts::ipCliente()` toma primero `X-Real-IP` y, si no existe, el último valor de `X-Forwarded-For`. Esa prioridad es correcta **solo si el proxy de Railway sobrescribe `X-Real-IP`**. El autor documenta que lo hace; yo no pude comprobarlo desde fuera. Si Railway lo deja pasar tal cual viene, quien registre cuentas en serie cambia ese encabezado en cada petición y el límite por IP (la base de H-02) no frena nada.

**Dos bordes más del limitador:**

1. Si no llega ninguno de los dos encabezados, la IP queda como `"desconocida"` y **todos** comparten un solo cupo de 5 registros por hora.
2. En el login se cuenta cada intento, también los correctos: quien escriba 10 veces el correo de otra persona la deja 15 minutos sin poder entrar.

- [x] **Comprobación de 5 minutos en producción** (ver abajo) y anotar el resultado aquí
- ~~Si `X-Real-IP` se puede falsificar: usar solo el último valor de `X-Forwarded-For`~~ No aplica: no se puede falsificar (ver resultado abajo). Y el último valor de `X-Forwarded-For` habría sido un error: es la IP del proxy de Railway.

**Resultado de la comprobación (8 de octubre, producción):**

| Petición | `x-real-ip` que llega | `x-forwarded-for` que llega |
|---|---|---|
| Normal | `181.140.5.66` (la real) | `181.140.5.66, 152.233.23.193` |
| Con `X-Real-IP: 9.9.9.9` | `181.140.5.66` | `181.140.5.66, 152.233.23.193` |
| Con `X-Forwarded-For: 8.8.8.8` | `181.140.5.66` | `181.140.5.66, 152.233.23.193` |

Railway sobrescribe los dos encabezados: **`X-Real-IP` no se puede falsificar.** En `X-Forwarded-For`, el **último** valor es la IP del propio proxy (`152.233.23.x`), igual para todos los usuarios; el respaldo que tenía `ipCliente()` (el último valor) los habría metido en un solo cupo. Se quitó ese respaldo (`6aea204`): sin `X-Real-IP` no se aplica el límite por IP. La ruta temporal `/ip` se borró en el mismo commit.
- [x] Sin IP conocida: no aplicar el límite por IP (se mantienen los límites por correo), en vez de un cubo compartido
- [x] En el login, contar solo los intentos fallidos

```ts
// apps/web/app/ip/route.ts — TEMPORAL: crear, desplegar, probar y borrar
import { ipCliente } from "@/lib/limite";
import { headers } from "next/headers";
export async function GET() {
  const h = await headers();
  return Response.json({ ip: await ipCliente(), xri: h.get("x-real-ip"), xff: h.get("x-forwarded-for") });
}
```

```bash
# Con tu IP real y con una inventada. Si "ip" devuelve 9.9.9.9 en la segunda, se puede falsificar.
curl -s https://app.proyects.store/ip
curl -s -H "X-Real-IP: 9.9.9.9" https://app.proyects.store/ip
```

```ts
// lib/limite.ts — contar solo los fallos en el login
export function excedido(clave: string, max: number, ventanaMs: number): boolean {
  const r = intentos.get(clave);
  return !!r && Date.now() - r.desde <= ventanaMs && r.n >= max;
}
export function registrarFallo(clave: string, ventanaMs: number) { /* igual que permitir(), sin devolver nada */ }
// loginAction: if (excedido(...)) return error; ...verificar...; si falla -> registrarFallo(...)
```

### H-14 · Dos enlaces reales de producción quedaron escritos en el historial de git
**Qué pasa:** el commit `a1ac8bb` incluyó por error `apps/pipeline/_tmp_cap.mjs`, un script temporal para sacar capturas que traía escritos dos enlaces de producción: uno de **vista completa** (`/p/bab60bd0…`, que muestra cantidades, presupuesto y despiece, y con `/imprimir?apu=1` también el APU) y uno de **cliente** (`/p/acca0155…`). El commit `55f5a5a` borró el archivo, pero git conserva el historial: quien clone el repo o abra el commit `a1ac8bb` los lee. El repositorio es público: lo clono sin credenciales (confírmalo en *Settings* de GitHub). Los tokens son aleatorios de 128 bits y no se pueden adivinar; la exposición viene solo de haberlos publicado. El script además deja a la vista una ruta local de Windows con el nombre de usuario del equipo y el de la cuenta institucional (menor).

**Qué tan grave es depende de qué proyecto son.** Si es una demo (por ejemplo, Casa Castañeda de prueba), basta con borrarlo o cambiarle los enlaces. Si tiene datos de un cliente real, esos enlaces dan acceso a sus cantidades y precios hasta que se invaliden.

**Reescribir el historial no basta.** Con un repo público, las copias que alguien haya hecho en el rato que estuvo no se recuperan. Lo seguro es invalidar los enlaces; limpiar el historial es un complemento. Y la app no tiene hoy cómo regenerar un enlace: se copian tal cual a cada versión nueva del proyecto (`linkCompleto ?? nuevoToken()` en `proyectos.ts`). De ahí S-13.

- [x] Decidir si ese proyecto es una demo o tiene datos reales
- [x] Invalidar los dos enlaces: borrar el proyecto, o cambiarlos en la base (SQL abajo; los enlaces viejos dejan de servir al instante)
- [ ] Opcional, después de invalidar: quitar el archivo del historial y avisar a quien tenga un clon
- [x] Prevención: `.gitignore`, scripts temporales fuera del repo, y la comprobación de CI de abajo

```sql
-- Postgres de Railway. Los nombres de tabla son los de Prisma: revísalos si usas @@map.
-- Paso 1: ver a qué proyecto pertenece cada enlace. Debe salir UN solo proyectoId; si salen dos,
-- son dos proyectos y el paso 2 se hace una vez por cada uno (no mezclar).
SELECT v."proyectoId", count(*) AS versiones
FROM "Resultado" r JOIN "VersionProyecto" v ON v.id = r."versionId"
WHERE r."linkCompleto" = '<token completo>' OR r."linkCliente" = '<token de cliente>'
GROUP BY v."proyectoId";

-- Paso 2: cambiar los dos enlaces en todas las versiones de ese proyecto (comparten el mismo par).
UPDATE "Resultado" r
SET "linkCompleto" = t.completo, "linkCliente" = t.cliente
FROM (SELECT replace(gen_random_uuid()::text, '-', '') AS completo,
             replace(gen_random_uuid()::text, '-', '') AS cliente) t
WHERE r."versionId" IN (SELECT id FROM "VersionProyecto" WHERE "proyectoId" = '<proyectoId del paso 1>');
```

```bash
# Opcional: quitar el archivo del historial (hacer una copia del repo antes; el push forzado reescribe main)
git filter-repo --path apps/pipeline/_tmp_cap.mjs --invert-paths
git push --force origin main
```

```gitignore
# .gitignore
_tmp*
**/_tmp_*
```

```yaml
# .github/workflows/ci.yml — un paso más: falla si alguien vuelve a escribir un enlace real en el repo
      - name: Sin enlaces de producción en el código
        run: "! git grep -nE 'proyects\.store/(p|d)/[0-9a-f]{32}' -- . ':!docs/AUDITORIA.md'"
```

**Prevención, con honestidad:** el "secret scanning" de GitHub no atrapa esto (es un enlace con un token aleatorio, no una clave con formato conocido). Lo que sí funciona es no guardar scripts temporales dentro del repo (la carpeta temporal del agente de código sirve para eso), añadir los archivos por ruta (`git add <archivo>`, no `git add -A`) y mirar `git status` antes de cada commit.

### S-01 · Términos del servicio y política de datos
**Qué falta:** el repo no tiene páginas de términos ni de privacidad, y el registro no pide autorización de tratamiento de datos. Los usuarios suben planos de sus clientes, que para ellos es información sensible. La advertencia de "referencia, no cálculo estructural" ya está en el link público; falta en los términos y en el registro. Lo único que se necesita de ti: los datos legales del responsable del tratamiento.

- [ ] Página de **política de tratamiento de datos** según la Ley 1581 de 2012 (habeas data), con autorización explícita en el registro (casilla obligatoria)
- [ ] Página de **términos del servicio**: quién es dueño de los planos subidos (el usuario), qué hace la plataforma con ellos, cuánto tiempo se guardan y cómo pedir que se borren
- [ ] Advertencia en el registro y en los términos: "Modelos y cantidades de referencia para visualizar y cotizar; no reemplazan el diseño ni el cálculo estructural de un profesional facultado"
- [ ] Decir en el registro dónde rinde mejor: productos hechos de piezas con medidas. Las formas orgánicas salen aproximadas.
- [ ] Antes de invertir en marca: buscar el nombre en la SIC (clase 42) y comprar el dominio `.com` y `.co`

### H-01 a H-06 · Verificados en la ronda 2

| ID | Qué se comprobó en el código | Pendiente |
|---|---|---|
| H-01 | `bodySizeLimit: "25mb"` en `next.config.ts`; tope total de 22 MB en servidor y navegador; allowlist de formatos con rechazo de HEIC y tipo deducido por extensión cuando el navegador lo manda vacío; `prepararParaIA` con `sharp`, EXIF respetado, y la regla "si no se reduce, queda el más liviano". El orden es correcto: se valida, se guarda el original y a la IA va la versión reducida. | Probar con una foto real de celular en producción |
| H-02 | Correo verificado exigido en el servidor (`proyectos.ts`) y avisado antes en `projects/new`; límites por IP y por correo en registro, login, recuperar y reenviar; sin `RESEND_API_KEY` no se exige, así que **en producción esa variable debe existir** (ya la usas). | H-12. Un correo desechable también se puede verificar: el freno real es el límite por IP, de ahí la importancia de H-12. |
| H-03 | `sv` en el token, `sesionVersion` en `Usuario`, comparación en `getSession` con `cache` de React; `restablecerAction` la sube dentro de la misma transacción que cambia la contraseña; `logoutTodosAction` existe y está conectado en el panel. Los tokens viejos cuentan como versión 0, así que desplegar no cierra sesiones. | Ninguno. Costo nuevo: una consulta por petición, ya amortiguada. |
| H-04 | `origen()` lanza error en producción si falta `APP_URL`. Está en los tres envíos de correo. | Ninguno |
| H-05 | `generarPdfAction` marca "generando" con `updateMany` condicional, responde y sigue con `after(() => enCola(...))`; `cola.ts` es correcta (`then(tarea, tarea)` y la cola nunca queda rota por un error); estados `listo`/`error` escritos; `PanelPdf` consulta cada 4 s. | H-10 |
| H-06 | Ruta `/d/[token]` con `tokenValido` y `X-Robots-Tag`; token nuevo y borrado del anterior en cada PDF; `/p/[token]/pdf` eliminada; `noindex` en `app/p/[token]/layout.tsx`; APU solo con `?apu=1` y casilla apagada por defecto; en modo cliente ya no salen `cotizacion` ni `despiece` del servidor. La migración borra los `pdfUrl` viejos. | H-11. Menor: los archivos `<linkCompleto>.pdf` antiguos quedan en `/data` sin servirse; se pueden borrar a mano. |

---

## Prioridad 2 · Durante el piloto

### H-10 · Un PDF que se queda en "generando" bloquea el botón para siempre

**Ronda 3: verificado.** `PDF_MAX_MS` (10 min) y `pdfVencido()` viven en `lib/pdf.ts`; la página muestra un "generando" vencido como error, y `PanelPdf` deja de consultar y vuelve a habilitar el botón; `generarPdfAction` usa la misma constante, y `renderizar()` reescribe `pdfIniciado` al empezar de verdad.
**Qué pasa:** si Railway reinicia el servicio mientras se genera un PDF (por ejemplo, al desplegar), `Resultado.pdfEstado` queda en `"generando"` para siempre. El servidor sí permite relanzarlo después de 5 minutos (`PDF_MAX_MS`), pero la página no lo sabe: `projects/[id]/page.tsx` le pasa a `PanelPdf` el estado crudo, y `PanelPdf` deshabilita el botón mientras `estado === "generando"` y refresca la página cada 4 s sin parar. El usuario ve "Generando…" eternamente y no puede reintentar. Con la generación de IA esto ya está resuelto (`GENERACION_MAX_MS` en `obtenerEstadoProyecto`); aquí falta lo mismo.

**Detalle relacionado:** `pdfIniciado` se escribe al encolar, no al empezar. Con varios PDF en cola, el quinto puede pasar los 5 minutos esperando y alguien lo relanza por duplicado.

- [x] Normalizar el estado en la página: un "generando" vencido se muestra como error con el mensaje "Se interrumpió. Vuelve a intentarlo"
- [x] Escribir `pdfIniciado` otra vez cuando la tarea de verdad empieza, o subir `PDF_MAX_MS` a 10 minutos

```ts
// lib/pdf.ts — la constante va aquí: un archivo "use server" solo puede exportar funciones async
export const PDF_MAX_MS = 5 * 60 * 1000;

// app/projects/[id]/page.tsx
const r = version.resultado;
const vencido = r?.pdfEstado === "generando" && !!r.pdfIniciado && Date.now() - r.pdfIniciado.getTime() > PDF_MAX_MS;
<PanelPdf
  estado={vencido ? "error" : r?.pdfEstado ?? null}
  error={vencido ? "La generación se interrumpió. Vuelve a intentarlo." : r?.pdfError ?? null}
  url={r?.pdfUrl ?? null}
  ... />

// lib/actions/pdf.ts — al empezar de verdad, dentro de renderizar()
await prisma.resultado.update({ where: { id: resultadoId }, data: { pdfIniciado: new Date() } });
```

### H-13 · Un tubo redondo "Ø 2″ × 2,5 mm" se lee como sección rectangular, sin aviso

**Ronda 3: verificado.** El diámetro se evalúa antes que el patrón rectangular y las 5 pruebas nuevas pasan (14 de 14 en el motor). Además, cada número del patrón rectangular usa su propia unidad (`Tabla 1" x 250 mm`), una mejora que no pedí.
**Qué pasa:** `seccionDesdeNombre` (`packages/engine/src/secciones.js`) prueba primero el patrón rectangular. En un tubo redondo, que se nombra "diámetro × espesor", ese patrón se come el espesor y lo toma como una segunda dimensión. Comprobado ejecutando la función:

| Nombre | Resultado | Correcto |
|---|---|---|
| `Tubo redondo Ø 2″ x 2.5 mm` | 50,8 × 63,5 mm | 50,8 × 50,8 mm |
| `Tubo redondo Ø2" x 2 mm` | 50,8 × 50,8 mm | sí, pero por casualidad |
| `Tubo redondo Ø76 mm x 3 mm` | `null` (queda provisional) | 76 × 76 mm |
| `Tubo redondo Ø 60.3 x 2.5 mm` | `null` (queda provisional) | 60,3 × 60,3 mm |

El primer caso es el peor: devuelve un número equivocado **sin marcarlo como provisional**, así que ningún aviso le llega al usuario. La prueba que existe (`Ø3″ x 3 mm`) pasa por casualidad: el espesor "3 mm" se lee como 3″ y sale un cuadrado de 76 mm que coincide con el diámetro. Importa menos de lo que parece para el peso (los kg salen de `factor` × metros), pero sí para el dibujo y para la superficie que se pinta.

- [x] Evaluar el diámetro (`Ø`, `diám.`) **antes** que el patrón rectangular
- [x] Agregar a `secciones.test.js` los tres casos de la tabla que hoy fallan

```js
// secciones.js — en seccionDesdeNombre, justo después del bloque PERFIL y antes de RECT
const d = texto.match(DIAM);
if (d) {
  const v = num(d[1]);
  if (!d[2] && v < 20) return null;
  const lado = v * factor(d[2]);
  return razonable(lado, lado) ? { ancho: lado, alto: lado } : null;
}
// ...luego el bloque RECT, y se quita el bloque DIAM del final
```

```js
// secciones.test.js
casi(s('Tubo redondo Ø 2″ x 2.5 mm'), 0.0508, 0.0508);
casi(s('Tubo redondo Ø76 mm x 3 mm'), 0.076, 0.076);
casi(s('Tubo redondo Ø 60.3 x 2.5 mm'), 0.0603, 0.0603);
```

### H-11 · El catálogo reducido del link de cliente borra las vigas del 3D

**Ronda 4: verificado.** `catalogoPublico` está en el motor (`publico.js`, exportado en `index.js`) con factor neutro (1) solo donde había factor; `proyectos.ts` lo usa y la función vieja se borró. Las dos pruebas pasan (motor 16 de 16): la de Casa Castañeda (233 de 233 elementos, 0 errores) y la de tableros y consumos, que no pedí. El autor lo comprobó además en producción con capturas del link completo y del de cliente; eso no lo repetí.
**Qué pasa:** la corrección de `aa8f3d8` logra lo que buscaba en privacidad: en modo cliente ya no salen `factor`, `consumos` ni las medidas de lámina. Pero rompe el dibujo. El visor del navegador no solo dibuja: `construirEscena` llama a `calcularProyecto` con el catálogo que recibe, y el motor descarta (no dibuja) todo elemento que no puede medir. Una viga cotizada en `kg` necesita `pieza.factor` para tener `kg` (`medirElemento`, `interprete.js` línea 39); sin él falla con `unidad_no_disponible`. Como el acero se cotiza en `kg`, desaparece justo la estructura.

**Reproducido** con Casa Castañeda y el catálogo reducido tal como lo arma `catalogoParaDibujar`:

| | Elementos que se dibujan | Errores |
|---|---|---|
| Catálogo completo (modo ejecutor) | 233 | 0 |
| Catálogo de `aa8f3d8` (modo cliente) | **139** | **94** |
| Con factor neutro (propuesta) | 233 | 0 |

Los 94 que faltan son todas las vigas: cerchas, cumbreras, correas, limahoyas, cerchuelas, soleras y las dos pérgolas. Quedan solo las 139 piezas por unidad (tejas y similares). Esto afecta al **link de cliente** y al **PDF de presentación** (que se genera desde ese mismo link). Lo comprobé con el motor, no en producción: abre un link de cliente de un proyecto con perfiles y compáralo con el link completo.

**Por qué no lo atrapó nada:** la función vive en `lib/proyectos.ts`, que importa Prisma y no se puede probar sin base de datos, y el CI solo compila y corre las pruebas existentes. Tipos y lint no ven que un dato falte.

- [x] Dejar `factor: 1` en las piezas que lo tenían, en vez de quitarlo. No revela nada: es un valor neutro, y el kg que sale con él no se muestra en ninguna parte del modo cliente.
- [x] Mover la función al motor (`packages/engine/src/publico.js`) con una prueba contra Casa Castañeda, para que el CI proteja esto en adelante
- [x] ~~Si ya está desplegado: regenerar los PDF de presentación hechos desde `aa8f3d8`, que salieron sin acero~~ No hubo ninguno: los registros del servidor no tienen ninguna línea `[pdf]` desde el despliegue de la migración 5 (6 de octubre), así que no se generó ningún PDF con el defecto.
- [x] Probar un link de cliente real después del cambio: el 3D debe verse igual que el del modo completo

```js
// packages/engine/src/publico.js
const DIBUJO = ['ancho', 'alto', 'espesor', 'color', 'opacidad'];

export function catalogoPublico(catalogo) {
  return Object.fromEntries(Object.entries(catalogo).map(([k, p]) => [k, {
    id: p.id, nombre: p.nombre, unidad: p.unidad, tipo: p.tipo,
    // Factor neutro, no el real: sin él "kg" deja de ser una unidad medible y
    // el motor descarta el elemento (la viga ya no se dibuja).
    ...(Number.isFinite(p.factor) ? { factor: 1 } : {}),
    dimensiones: Object.fromEntries(Object.entries(p.dimensiones ?? {}).filter(([d]) => DIBUJO.includes(d))),
  }]));
}
// packages/engine/src/index.js: export { catalogoPublico } from './publico.js';
// lib/proyectos.ts: en vez de catalogoParaDibujar, `import { catalogoPublico } from "@cotizador3d/engine"`
```

```js
// packages/engine/test/publico.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { calcularProyecto } from '../src/interprete.js';
import { catalogoPublico } from '../src/publico.js';

const p = JSON.parse(fs.readFileSync(new URL('../../../projects/casa-castaneda/elementos.json', import.meta.url), 'utf8'));

test('catálogo público: se dibujan los mismos elementos y no salen los datos del ejecutor', () => {
  const completo = calcularProyecto(p);
  const publico = calcularProyecto({ ...p, catalogo: catalogoPublico(p.catalogo) });
  assert.equal(publico.errores.length, 0);
  assert.deepEqual(publico.validos.map((e) => e.id), completo.validos.map((e) => e.id));
  for (const c of Object.values(catalogoPublico(p.catalogo))) {
    assert.ok(c.factor === undefined || c.factor === 1, 'el factor real no debe salir');
    assert.equal(c.consumos, undefined);
    assert.equal(c.dimensiones.lamina_largo, undefined);
  }
});
```

Ejecuté este código y esta prueba contra el repo: pasa con la corrección, y con el defecto original falla con `94 !== 0`.

### H-07 · Las vigas se descartan cuando falta la sección
**Estado ronda 2:** a y b verificados. `secciones.js` está en el motor con 13 de 13 pruebas pasando; `depurarEntradaIA` completa la sección, o la deja provisional de 50 × 50 mm y lo avisa en las notas; el recuadro "Secciones por confirmar" existe y `guardarSeccionAction` valida que la pieza sea del proyecto. El ejemplo del prompt ahora trae un tubo con `ancho` y `alto`; el factor del ejemplo (9,14 kg/m para 150×50×3) es correcto (1.164 mm² × 0,00785).

- [x] **a.** Sacar la sección del nombre de la pieza antes de validar (ver H-13 para un caso que falla)
- [x] **b.** Sección provisional marcada y recuadro para confirmarla
- [x] Ejemplo con `dimensiones` en el prompt
- [ ] **c.** Si siguen quedando errores, una llamada corta a Claude con solo la lista de errores. Sigue sin hacer; reevaluar con las métricas del piloto.
- [x] **d.** (nuevo) Avisar también donde el cliente lo ve. Hoy el aviso de "sección por confirmar" aparece solo en la página del proyecto. Se puede generar un PDF o compartir el link con una sección provisional dibujada y nadie se entera. Basta con avisar junto al botón del PDF, o pedir confirmación al generarlo.
- [x] **e.** (nuevo, texto) El aviso y el recuadro dicen que la sección cambia "el peso". No es exacto: el peso sale de `factor` × metros; la sección cambia el dibujo y la superficie a pintar. Cambiar el texto para no prometer un peso distinto.

### H-08 · El modelo de IA está fijo en el código
**Verificado:** `process.env.IA_MODELO?.trim() || "claude-opus-5"`; `lib/costos.ts` resuelve la tarifa por prefijo y `response.model` queda registrado en `GeneracionIA.modelo`.

- [x] Variable de entorno `IA_MODELO`
- [ ] Seguimiento: comparar calidad y costo por modelo con los mismos planos (necesita crédito de API; no bloquea nada)

### H-09 · Respuestas largas que se cortan
**Verificado:** `stopReason` se guarda en `GeneracionIA` (migración 5), `/admin/uso` cuenta las cortadas del mes (`cortadas`).

- [x] Medir cuántas terminan por `max_tokens`
- [ ] Seguimiento: si pasa seguido, generar por etapa en varias llamadas, o pedir elementos repetidos como una sola entrada con `repetir` que el servidor expanda

**Notas sobre la IA (no son defectos):**
- *Prompt caching:* con el volumen actual aporta poco. El caché dura 5 minutos y las generaciones llegan espaciadas; lo caro son los planos y la salida. Revisarlo cuando haya varias generaciones por hora.
- *Salida estructurada:* la razón documentada en `lib/ia.ts` para no usar `output_config.format` tiene sentido. *Tool use* con `tool_choice` forzado solo valdría tras una prueba A/B con los mismos planos.
- *Ejemplo del prompt:* ahora trae un tubo de acero concreto (`tubo150x50`). Los modelos copian los ejemplos; vigilar en las primeras generaciones de otros rubros (madera, mobiliario) que no lo repitan como clave o como material.

### S-12 · Anexo técnico y Excel para quien usa su propio formato de cotización
**La pregunta:** un usuario ya tiene su esquema de cotización (su Excel, su Word, su membrete) y de la plataforma solo necesita las imágenes 3D y el desglose de material. ¿Adjunta su esquema, o se imprime sin cotización y él la envía aparte junto con el archivo y el link?

**Recomendación: imprimir sin cotización, y que él la envíe aparte.** Por tres razones. Primero, la cotización es del ejecutor: precios, AIU y condiciones son suyos, y nuestro PDF funciona mejor como un anexo técnico que él adjunta a la suya. Segundo, leer y rellenar una plantilla ajena es lo más frágil de todo: cada ejecutor tiene un formato distinto (celdas combinadas, columnas propias, logos), y un error ahí sale en un documento que va a su cliente. Tercero, es lo que sale más barato de construir y ya está casi hecho.

**Qué existe hoy y qué falta.** `TablaCotizacion` ya devuelve `null` cuando no hay precios cargados (`if (!c.tienePrecio) return null`), así que si el ejecutor no escribe precios, el PDF "Presupuesto" ya sale con vistas, cuadro de cantidades y despiece, sin tabla de precios. Pero depende de que no haya cargado ninguno, el botón dice "cantidades y precios", y el HTML de la página de impresión sí lleva la cotización dentro. Falta un tipo de PDF explícito, **"Anexo técnico"**, que nunca imprima ni envíe precios, y un **Excel** con el desglose para que lo pegue en su formato.

Así queda el conjunto, con el link y los archivos que ya existen:

| Lo que recibe su cliente | Qué es | Dónde está |
|---|---|---|
| Link de cliente | Vistas 3D, sin cantidades | Ya existe |
| Anexo técnico (PDF) | Vistas 3D y desglose de material, sin precios | **Nuevo** (este punto) |
| Su cotización | Con su formato y sus precios | La envía él, aparte |
| Excel del desglose | Para que él lo pegue en su formato | **Nuevo** (este punto) |

- [x] Tipo de PDF "Anexo técnico": vistas, cuadro de cantidades y despiece, sin tabla de precios ni APU
- [x] No mandar la cotización dentro del HTML cuando es anexo (la lección de H-06 y H-11: lo que no se dibuja, que no viaje)
- [x] Descargar el desglose en Excel (una hoja por etapa, más el despiece)
- [ ] Rellenar su plantilla: ver S-14, y solo si el piloto lo pide

```tsx
// components/PanelPdf.tsx — un tercer tipo
const [tipo, setTipo] = useState<"presupuesto" | "anexo" | "presentacion">("presupuesto");
// ...junto a los otros dos radios:
<label className="flex items-center gap-1.5">
  <input type="radio" name="tipo" value="anexo" checked={tipo === "anexo"} onChange={() => setTipo("anexo")} />
  Anexo técnico <span className="text-neutral-400">(vistas y desglose de material, sin precios: para adjuntar a tu propia cotización)</span>
</label>
```

```ts
// lib/actions/pdf.ts — generarPdfAction
const pedido = String(formData.get("tipo"));
const tipo = pedido === "presentacion" || pedido === "anexo" ? pedido : "presupuesto";
const conApu = tipo === "presupuesto" && formData.get("apu") === "on";
const token = tipo === "presentacion" ? resultado?.linkCliente : resultado?.linkCompleto; // el anexo sale del link completo, dentro del servidor
const ruta = `/p/${token}/imprimir${conApu ? "?apu=1" : tipo === "anexo" ? "?precios=0" : ""}`;
```

```tsx
// app/p/[token]/imprimir/page.tsx
searchParams: Promise<{ apu?: string; precios?: string }>
const { apu, precios } = await searchParams;
const conPrecios = precios !== "0";
const datos = modo === "completo"
  ? {
      porEtapa: calculo.porEtapa, despiece: calculo.despiece, laminas: calculo.laminas,
      cotizacion: conPrecios ? resumirCotizacion(calculo, leerCotizacion(proyecto.cotizacion)) : null, // sin precios, ni en el HTML
    }
  : null;
// <VisorImprimible ... conApu={conPrecios && apu === "1"} />

// components/VisorImprimible.tsx
type Calculo = { /* ... */ cotizacion: ResumenCotizacion | null };
{calculo?.cotizacion && <TablaCotizacion cotizacion={calculo.cotizacion} conApu={conApu} />}
```

```ts
// app/projects/[id]/excel/route.ts — requiere `npm i exceljs -w web`. Boceto sin compilar: revisar tipos al integrarlo.
import ExcelJS from "exceljs";
import { obtenerProyecto } from "@/lib/proyectos";

type Etapa = { nombre: string; lineas: { nombre: string; unidad: string; cantidad: number; n: number }[] };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { proyecto, calculo } = await obtenerProyecto(id); // exige sesión y que el proyecto sea de la cuenta
  const libro = new ExcelJS.Workbook();
  for (const [n, e] of Object.entries(calculo.porEtapa as Record<string, Etapa>)) {
    const hoja = libro.addWorksheet(`Etapa ${n}`);
    hoja.columns = [{ header: "Pieza", width: 52 }, { header: "Unidad", width: 10 }, { header: "Cantidad", width: 12 }, { header: "Elementos", width: 11 }];
    for (const l of e.lineas) hoja.addRow([l.nombre, l.unidad, Number(l.cantidad.toFixed(3)), l.n]);
  }
  // Si hay tableros: otra hoja con calculo.despiece (largo, ancho, espesor, cantidad), igual que Despiece.tsx.
  const datos = await libro.xlsx.writeBuffer();
  return new Response(datos, { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="desglose-${proyecto.id}.xlsx"`,
  } });
}
```

### S-13 · Poder invalidar y regenerar los enlaces de un proyecto
**Qué falta:** un enlace compartido por error (o que quedó escrito donde no debía, como en H-14) no se puede invalidar desde la app. Los dos tokens se crean con el proyecto y se copian a cada versión nueva, así que ni borrar una versión ni corregir el proyecto los cambia. Hoy solo se cambian a mano en la base.

- [x] Botón "Invalidar enlaces y crear nuevos" en el proyecto, con confirmación ("quien tenga el enlace viejo dejará de poder verlo")
- [x] Que avise que el PDF ya generado tiene su propio enlace (`/d/…`) y se invalida regenerándolo

```ts
// lib/actions/proyectos.ts — requiere exportar nuevoToken desde lib/proyectos.ts
export async function regenerarEnlacesAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  await obtenerProyecto(proyectoId); // exige sesión y cuenta
  // Todas las versiones comparten el mismo par de tokens: se cambian juntas.
  await prisma.resultado.updateMany({
    where: { version: { proyectoId } },
    data: { linkCompleto: nuevoToken(), linkCliente: nuevoToken() },
  });
  revalidatePath(`/projects/${proyectoId}`);
}
```

### S-02 · Leer planos en DXF
Hoy se aceptan imágenes y PDF. Los arquitectos e ingenieros trabajan en AutoCAD: el DXF (que AutoCAD exporta con un clic) trae las coordenadas exactas, más precisas que leer una foto.

- [ ] Aceptar `.dxf`: leer líneas, polilíneas y textos por capa con `dxf-parser`, convertir a metros según `$INSUNITS` y mandarle a Claude un resumen en texto. Claude interpreta qué es cada cosa y las medidas salen exactas del archivo.
- [ ] Si llega DWG, pedir que lo exporten a DXF o PDF (mensaje en el formulario)
- [ ] Si `$INSUNITS` no viene, preguntar la unidad en la revisión
- [ ] Ojo con el diseño actual: `FORMATOS_ACEPTADOS` en `lib/imagenes.ts` y `EXT_POR_MIME` en `lib/archivos.ts` hay que ampliarlos juntos, y el DXF se manda como texto, no como imagen

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
`/admin/uso` mide el costo y ahora las generaciones cortadas. Para fijar precios y decidir qué mejorar faltan:

| Métrica | De dónde sale | Estado |
|---|---|---|
| Generaciones cortadas por `max_tokens` | `GeneracionIA.stopReason` | hecho |
| Tiempo hasta el primer 3D | `GeneracionIA.duracionMs` (existe; ya se muestra el promedio) | parcial |
| Correcciones por proyecto | Número de versiones por proyecto | falta |
| Elementos descartados por la IA | `Proyecto.descartadosIA` sobre el total | falta |
| Elementos sin confirmar al entregar | `Elemento.confirmado = false` en la última versión | falta |
| Secciones provisionales por proyecto | `dimensiones.provisional` en `CatalogoPieza` | falta (nuevo) |
| Proyectos por tipo de obra | `Proyecto.tipoObra` | falta |
| Visitas al link de cliente | Contador en `/p/[token]` (modo cliente) | falta |
| Conversión de prueba a pago | Cuando exista el cobro | falta |

- [ ] Agregar las que faltan a `/admin/uso`

### S-05 · Integración continua

**Ronda 3:** el autor reporta el run `37510609595` en verde sobre `c934e13`. No puedo verlo (esta auditoría no tiene acceso a GitHub Actions), así que se toma como dato del autor. Falta mirar los runs de `aa8f3d8`, `6aea204` y `c7447fb`: con H-11 cambió código que el CI compila.
**Verificado:** `.github/workflows/ci.yml` corre `npm ci`, `prisma generate`, `npm test`, `next typegen`, `tsc --noEmit` y `eslint`. Los comandos y rutas son correctos. Lo que no puedo ver desde aquí es que corra en verde.

- [x] Workflow en cada push y pull request
- [x] Abrir la pestaña *Actions* de GitHub y confirmar que el primer run sale en verde. Es la única prueba de que `tsc` pasa (ver verificaciones de la ronda 2).

### S-06 · Respaldos
Los planos y PDF viven en el volumen `/data` y los datos en Postgres de Railway. El volumen es de una sola instancia, así que no se puede escalar a dos réplicas mientras los archivos vivan ahí. La cola de PDF y el limitador de intentos también viven en memoria, por la misma razón: **dos réplicas los romperían**, así que mejor decidirlo antes de escalar.

- [ ] Respaldo programado de Postgres
- [ ] Respaldo del volumen `/data`
- [ ] Probar una restauración una vez (un respaldo que nunca se probó no se sabe si sirve)

---

## Prioridad 3 · Después del piloto

### S-07 · Exportar el modelo y la planta
- [ ] Descargar el modelo en GLB (`GLTFExporter` de Three.js). Se abre en SketchUp, Blender y visores web.
- [ ] Descargar la planta en DXF (elementos proyectados en planta). Se abre en AutoCAD.
- ~~Exportar el cuadro de cantidades a Excel~~ → pasó a S-12 (P2), que es lo que más piden los que usan su propio formato

### S-14 · Rellenar la plantilla de cotización del propio usuario
Es lo que sería "el cliente adjunta su esquema de cotización". Es posible, pero no es lo primero: cada plantilla es distinta y un error sale en un documento con el nombre del ejecutor. Conviene esperar a que el piloto muestre cuántos lo piden de verdad y en qué formato (casi seguro Excel).

- [ ] Solo `.xlsx` al principio. El usuario sube su plantilla una vez; Claude propone qué columna es descripción, unidad, cantidad y valor unitario, y **el usuario confirma ese mapeo antes de usarlo** (nunca se rellena a ciegas). Se guarda con su cuenta y se reutiliza.
- [ ] Rellenar con `exceljs` conservando su formato, sin crear una plantilla nueva; las filas vacías de su cuadro se llenan con el cuadro de cantidades.
- [ ] Los precios se llenan solo si el usuario los cargó; si no, esas celdas quedan vacías, nunca con un valor inventado.
- [ ] Word y PDF fuera de alcance: rellenar un PDF o una tabla de Word de forma fiable no compensa. Para esos, el camino es S-12 (Excel o anexo, y pegar).

### S-11 · Limitador de intentos: la purga usa la ventana equivocada

**Ronda 4: verificado.** Cada entrada guarda su `ventana` y la purga usa la suya (`limite.ts`).
`lib/limite.ts::contar` limpia el mapa cuando pasa de 10.000 entradas, y borra las que tengan más edad que la ventana **de la llamada actual**. Un fallo de login (ventana de 15 minutos) puede borrar contadores de registro (ventana de 60) con más de 15 minutos, antes de tiempo. Solo ocurre con el mapa lleno, es decir, justo bajo un ataque masivo; con el límite por IP funcionando (H-12) es poco probable. Corrección corta: guardar la ventana dentro de cada entrada.

- [x] Guardar `ventana` en cada entrada y purgar con la suya
- Aceptado, no es defecto: con "solo cuentan los fallos", quien escriba 10 contraseñas malas del correo de otra persona todavía la deja 15 minutos sin entrar. Es el costo de limitar por correo; el límite por IP no lo evita. Si molesta en el piloto, subir el tope por correo o avisar por correo a la persona.

```ts
// lib/limite.ts
const intentos = new Map<string, { n: number; desde: number; ventana: number }>();
// contar(): intentos.set(clave, { n: 1, desde: ahora, ventana: ventanaMs });
// purga:    for (const [k, r] of intentos) if (ahora - r.desde > r.ventana) intentos.delete(k);
```

### S-09 · Nombre de la marca en un solo lugar

**Ronda 3: verificado.** `lib/marca.ts` existe y ya no queda "Cotizador 3D" escrito fijo en `apps/web` fuera de ese archivo (comprobado con búsqueda).
"Cotizador 3D" aparece en correos, marca de agua y títulos.

- [x] Una constante `MARCA` (y `MARCA_CORTA`) usada en todos esos lugares, para cambiar el nombre definitivo con una sola edición

### S-08 y S-10 · Verificados
- **S-08:** `reintentarGeneracionAction` usa `updateMany` con `estado: "error"` y sale si `count === 0`. Sale en silencio, sin mensaje, lo cual está bien para un doble clic.
- **S-10:** `eslint .` termina sin ninguna salida (0 errores, 0 advertencias). La regla de parámetros con `_` y el comentario en `VisorImprimible.tsx` están bien explicados.

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

### Respuesta a la ronda 1 · 6 de octubre de 2026 · commit `3ba9db5` (del autor)
**Verificaciones que reportó el autor:** pruebas 17 de 17 · `tsc --noEmit` sin errores · lint 0 y 0 · `next build` correcto.

**Qué dijo haber resuelto:** H-01 a H-06, S-05, S-08 y S-10; en curso H-07 (a y b), H-08, H-09 y S-04. Explicó cada decisión en una tabla (conservada en el historial de git de este archivo).

### Ronda 2 · 6 de octubre de 2026 · commit `c934e13` (código en `3ba9db5`)
**Alcance:** diff completo desde `0074079` (38 archivos): `next.config.ts`, `lib/imagenes.ts`, `lib/limite.ts`, `lib/session.ts`, `lib/auth.ts`, `lib/actions/{auth,pdf,proyectos}.ts`, `lib/cola.ts`, `lib/pdf.ts`, `lib/ia.ts`, `lib/proyectos.ts`, `lib/costos.ts`, `lib/generacion.ts`, rutas `/d/[token]`, `/p/[token]` y su `imprimir`, `PanelPdf`, `SeccionesPorConfirmar`, `VisorImprimible`, `secciones.js` con su prueba, migración 5, `schema.prisma`, `ci.yml`, ESLint y `/admin/uso`. Lo que el autor afirma en su respuesta se comprobó leyendo el código, no confiando en el texto. **No revisé** el comportamiento en producción (proxy de Railway, Chromium en el contenedor, `sharp` dentro de la imagen de Docker) ni `next build`.

**Verificaciones:**

| Verificación | Resultado |
|---|---|
| Pruebas del motor | 13 de 13 pasan |
| Pruebas de Casa Castañeda | 4 de 4 pasan |
| Lint (`eslint .`) | 0 errores, 0 advertencias |
| Tipos (`tsc --noEmit`) | **No verificable aquí otra vez.** Los 44 errores que salen son todos consecuencia de que el cliente de Prisma no se generó (`PrismaClient` y `Prisma` sin exportar, y parámetros `any` implícitos que se desprenden de eso); ninguno es de otro tipo. Se confirma con el primer run del CI (S-05). |
| `next build` | No ejecutado |
| Dependencias | `npm ci --ignore-scripts` instala sin errores; se agregó `sharp 0.35.4` |
| Migración 5 | Revisada: aditiva, índice único sobre columna nullable (correcto en Postgres), `UPDATE` de los `pdfUrl` viejos con la razón escrita |
| Claves o `.env` en el diff | Ninguno |
| Prueba extra | `seccionDesdeNombre` ejecutada con nombres de tubos redondos: reveló H-13 |

**Cambios desde la ronda anterior:**
- **Verificados como resueltos:** H-01, H-02, H-03, H-04, H-05, H-06, H-08, H-09 (medición), S-05, S-08, S-10. Las 11 afirmaciones del autor se sostuvieron.
- **En curso:** H-07 (a y b verificados; quedan c, d y e) y S-04.
- **Siguen abiertos:** S-01, S-02, S-03, S-06, S-07, S-09, como el autor ya anotó.
- **Hallazgos nuevos:** H-10 (PDF atascado), H-11 (catálogo en el link de cliente), H-12 (comprobar `X-Real-IP` y bordes del limitador), H-13 (tubo redondo mal leído).

**Lectura general:** los arreglos de la ronda 1 están bien hechos y ninguno se reabre. Los cuatro hallazgos nuevos son huecos que esos arreglos dejaron al lado: el PDF asíncrono sin salida para un reinicio (H-10), el link de cliente que aún manda datos del catálogo (H-11), el límite de intentos que depende de un encabezado del proxy (H-12) y un caso del lector de secciones que el autor no probó (H-13).

**Orden sugerido:**
1. **H-12**, la comprobación de 5 minutos: de ella depende que el límite de H-02 sirva.
2. **H-10** y **H-13**, dos arreglos cortos y bien delimitados.
3. **H-11**, antes de compartir el primer link de cliente con alguien real.
4. **S-01**, que necesita tus datos legales.
5. **H-07** d y e, y mirar el primer run del CI.
6. **S-06** (respaldos) antes de tener datos de clientes de verdad.
7. El resto, según `/admin/uso` y lo que pase en el piloto.

### Respuesta a la ronda 2 · 8 de octubre de 2026 · commits `aa8f3d8` y `6aea204` (del autor)
**Verificaciones:** pruebas 18 de 18 (14 del motor, 4 de Casa Castañeda) · `tsc --noEmit` sin errores · lint 0 y 0. El CI corrió en verde en `c934e13` (run 37510609595): instalación, Prisma, pruebas, `next typegen`, tipos y lint.

| ID | Implementación |
|---|---|
| H-12 | Comprobado en producción con la ruta temporal: Railway sobrescribe `X-Real-IP` (ver el resultado en H-12). La comprobación encontró además que el último valor de `X-Forwarded-For` es la IP del proxy, así que se quitó ese respaldo en vez de pasar a usarlo. Sin IP conocida no se aplica el límite por IP. En el login solo cuentan los fallos (`loginBloqueado` / `registrarFalloLogin` en `lib/limite.ts`). |
| H-10 | Como se sugirió: `PDF_MAX_MS` y `pdfVencido()` en `lib/pdf.ts`; la página muestra un "generando" vencido como error y el botón vuelve a servir; `pdfIniciado` se reescribe al empezar de verdad y el tope pasó a 10 minutos. |
| H-13 | Diámetro antes que el patrón rectangular, como se sugirió. Además, en el patrón rectangular cada número usa su propia unidad ("Tabla 1″ x 250 mm" ya no aplica pulgadas a los dos). Los cuatro casos de la tabla y ese están en `secciones.test.js`. |
| H-11 | En modo cliente el catálogo se reduce a `id`, `nombre`, `unidad`, `tipo` y, de `dimensiones`, solo lo que el visor dibuja (`ancho`, `alto`, `espesor`, `color`, `opacidad`): también se quitan las medidas de lámina, que son datos de compra del ejecutor. El modo completo no cambia. |
| H-07 d | Aviso junto al botón del PDF (y los links, en la misma sección) cuando hay perfiles con sección provisional. |
| H-07 e | Los textos dicen que la sección cambia el dibujo y la superficie a pintar, y que el peso sale del factor kg/m. |
| S-09 | `lib/marca.ts` (`MARCA`, `MARCA_LEMA`), usado en correos, títulos, encabezados y marca de agua. El prompt de la IA dice "cotizador 3D" como descripción genérica y no se tocó. |

**Siguen abiertos:** S-01 (esperando los datos legales del responsable), S-06 (los respaldos se activan en el panel de Railway), H-07 c, S-02, S-03, S-04, S-07, y los seguimientos de H-08 y H-09 (necesitan crédito de API). Lo menor de H-06 (los `<linkCompleto>.pdf` viejos en `/data`) no se borró: no hay acceso de consola al volumen desde aquí, y no se sirven.

### Ronda 3 · 8 de octubre de 2026 · commit `c7447fb` (código en `6aea204`)
**Alcance:** diff desde `c934e13` (17 archivos): `lib/limite.ts`, `lib/actions/auth.ts`, `lib/actions/pdf.ts`, `lib/pdf.ts`, `lib/proyectos.ts`, `lib/marca.ts`, `lib/email.ts`, `PanelPdf`, `SeccionesPorConfirmar`, `VisorImprimible`, `projects/[id]/page.tsx`, `p/[token]/page.tsx`, `secciones.js` con sus pruebas, y la respuesta del autor en este documento. **No revisé:** el comportamiento en producción (la comprobación de `X-Real-IP` es del autor), `next build` ni el CI de GitHub (esta auditoría no tiene acceso a ese repositorio).

**Verificaciones:**

| Verificación | Resultado |
|---|---|
| Pruebas del motor | 14 de 14 pasan |
| Pruebas de Casa Castañeda | 4 de 4 pasan (18 de 18 en total, como dijo el autor) |
| Lint (`eslint .`) | 0 errores, 0 advertencias |
| Tipos (`tsc --noEmit`) | No verificable aquí otra vez (Prisma no se descarga). Falta mirar los runs del CI de los tres commits nuevos. |
| Casa Castañeda con el catálogo del modo cliente | **139 de 233 elementos, 94 errores** → H-11 reabierto. Con factor neutro: 233 de 233. |
| Corrección propuesta de H-11 | Ejecutada en una copia: la prueba pasa con la corrección y falla con el defecto |
| Ruta temporal `/ip` | Borrada |
| "Cotizador 3D" fijo en `apps/web` | Ninguno fuera de `lib/marca.ts` |
| Claves o `.env` en el diff | Ninguno |

**Cambios desde la ronda anterior:**
- **Verificados como resueltos:** H-10, H-12, H-13, H-07 (d y e) y S-09. Cada uno coincide con lo que el autor dijo.
- **Reabierto:** H-11. La parte de privacidad quedó bien hecha, pero al quitar `factor` del catálogo el motor deja de medir las vigas en `kg` y el link de cliente las deja sin dibujar. Pasó a P1 porque afecta lo que ve el cliente final.
- **Nuevo:** S-11 (menor).
- **Siguen abiertos:** S-01, S-06, H-07 c, S-02, S-03, S-04, S-07, y los seguimientos de H-08 y H-09, como el autor anotó.

**Lectura general:** el patrón de esta ronda se repite de la anterior: cada corrección resuelve el hallazgo y deja un caso al lado. Esta vez el caso es que una función que protege datos se escribió sin una prueba que dibuje el resultado. La prueba de H-11 propuesta arriba cierra eso.

**Orden sugerido:**
1. **H-11**, antes de compartir otro link de cliente o PDF de presentación. Es un cambio de dos líneas más una prueba.
2. **S-01**, que sigue esperando tus datos legales.
3. **S-06**: activar los respaldos en Railway y probar una restauración, antes de tener planos de clientes reales.
4. Confirmar en GitHub Actions que los tres commits nuevos salen en verde.
5. **H-07 c** y **S-04**, cuando el piloto dé datos.
6. S-02, S-03, S-07 y S-11, según lo que pida el piloto.

### Respuesta a la ronda 3 · 8 de octubre de 2026 · commit `a1ac8bb` (del autor)
**Verificaciones:** pruebas 20 de 20 (16 del motor, 2 nuevas en `publico.test.js`; 4 de Casa Castañeda) · `tsc --noEmit` sin errores · lint 0 y 0 · CI en verde en `a1ac8bb` y `55f5a5a`, y también en `aa8f3d8` y `c7447fb`. `6aea204` no tiene run propio: subió en el mismo push que `c7447fb`, y el CI corre sobre el último commit del push.

| ID | Implementación |
|---|---|
| H-11 | Como se propuso: `catalogoPublico` en `packages/engine/src/publico.js`, con factor neutro (1) donde había factor, y la prueba contra Casa Castañeda tal cual (más una de tableros y vigas). Reproduje antes el defecto con los mismos números (139 de 233, `unidad_no_disponible`). **Comprobado en producción** con el proyecto de la cubierta curva: antes, el link de cliente mostraba la cubierta sobre las zapatas sin una sola pieza de acero; después, se ve igual que el link completo. El HTML del link de cliente trae `factor` solo con valor 1 (7 de 7) y nada de `consumos` ni de lámina. |
| S-11 | Como se propuso: `ventana` en cada entrada y purga con la suya. |

**Error del autor en `a1ac8bb`:** se coló un script temporal de capturas (`apps/pipeline/_tmp_cap.mjs`, sin datos sensibles); se quitó en `55f5a5a`.

**Lección que queda escrita en el código:** `publico.js` explica que el visor no solo dibuja (descarta lo que no puede medir), que fue lo que hizo fallar la primera versión de H-11. Mi verificación de la ronda 2 solo buscó que `factor` no saliera en el HTML; no comparé el dibujo. Desde ahora, un cambio en lo que recibe el visor se prueba con el motor (como `publico.test.js`) y mirando el 3D.

**Siguen abiertos:** S-01 (datos legales), S-06 (respaldos en Railway), H-07 c, S-02, S-03, S-04, S-07, y los seguimientos de H-08 y H-09 (necesitan crédito de API).

### Ronda 4 · 8 de octubre de 2026 · commit `f98c2e5` (código en `a1ac8bb`)
**Alcance:** diff desde `c7447fb` (6 archivos de código y el documento): `lib/limite.ts`, `lib/proyectos.ts`, `packages/engine/src/publico.js` con su prueba y `index.js`, el script temporal `apps/pipeline/_tmp_cap.mjs` (añadido en `a1ac8bb` y borrado en `55f5a5a`), y la respuesta del autor. **No revisé:** producción (la comprobación de H-11 es del autor), `next build` ni el CI de GitHub (esta auditoría no tiene acceso).

**Verificaciones:**

| Verificación | Resultado |
|---|---|
| Pruebas del motor | 16 de 16 pasan (14 anteriores y 2 de `publico.test.js`) |
| Pruebas de Casa Castañeda | 4 de 4 pasan (20 en total) |
| Lint (`eslint .`) | 0 errores, 0 advertencias |
| Tipos (`tsc --noEmit`) | No verificable aquí (Prisma no se descarga). Mirar los runs del CI de `a1ac8bb`, `55f5a5a` y `f98c2e5`. |
| H-11: el visor de cliente dibuja lo mismo | Sí: 233 de 233 elementos, 0 errores, en la prueba contra Casa Castañeda |
| Claves o `.env` en el diff | Ninguna clave. **Sí hay dos enlaces reales de producción en `_tmp_cap.mjs`** → H-14 |
| Ruta temporal `/ip` | No existe |

**Cambios desde la ronda anterior:**
- **Verificados como resueltos:** H-11 (el arreglo es el propuesto, más una prueba de tableros que no se pidió) y S-11.
- **Nuevo, P1:** H-14, por el script temporal que dejó dos enlaces de producción en el historial de un repo público. Se corrige invalidando los enlaces, no solo borrando el archivo.
- **Nuevos, por la pregunta sobre usuarios con su propio formato de cotización:** S-12 (anexo técnico sin precios y Excel, P2), S-13 (poder regenerar enlaces, P2) y S-14 (rellenar su plantilla, P3, después del piloto). El Excel de S-07 pasó a S-12.
- **Siguen abiertos:** S-01, S-06, H-07 c, S-02, S-03, S-04, S-07 (GLB y DXF), y los seguimientos de H-08 y H-09.

**Lectura general:** el arreglo de H-11 quedó bien, con su prueba, y es el tipo de corrección que se espera de aquí en adelante. La fuga de H-14 no vino del código sino del proceso: un archivo temporal entró en un commit. Es fácil de evitar con `.gitignore` y revisando `git status`.

**Orden sugerido:**
1. **H-14**, hoy: decidir si ese proyecto es real, invalidar los dos enlaces y poner el `.gitignore`.
2. **S-12**, el anexo técnico. Es lo que más cambia lo que un ejecutor con formato propio puede entregar, y el PDF sin precios es un cambio de tres archivos.
3. **S-01**, que sigue esperando tus datos legales.
4. **S-06**: activar los respaldos en Railway y probar una restauración.
5. Confirmar en GitHub Actions que los commits nuevos salen en verde.
6. **S-13**, junto con el punto 1 si te toca invalidar enlaces a mano más de una vez.
7. **H-07 c** y **S-04** cuando el piloto dé datos; luego S-02, S-03, S-07 y S-14.

### Respuesta a la ronda 4 · 8 de octubre de 2026 · commit `c363353` (del autor)
**Verificaciones:** pruebas 20 de 20 · `tsc --noEmit` sin errores · lint 0 y 0 · CI en verde en `c363353` (run 37818249321), incluido el paso nuevo "Sin enlaces de producción en el código". También salieron en verde `a1ac8bb`, `55f5a5a` y `f98c2e5`.

| ID | Implementación |
|---|---|
| H-14 | **El proyecto era una demo**: "Cliente prueba", la cubierta curva de la primera prueba en producción, creada con una cuenta de prueba (`@example.com`) y sin precios ni datos de un cliente real. **Enlaces invalidados en producción** con el botón de S-13: los dos enlaces expuestos responden 404 y el proyecto tiene enlaces nuevos. Repo confirmado público por la API de GitHub. Los tokens solo aparecían en `a1ac8bb` y `55f5a5a`. Prevención: `.gitignore` con `_tmp*`, paso de CI que falla si aparece un enlace de producción con token, y desde ahora los commits agregan archivos por ruta y revisan `git status`. **Sin hacer:** reescribir el historial. Con los enlaces ya invalidados no expone nada, y un push forzado a `main` es una decisión del dueño del repo. |
| S-13 | Como se propuso, y además borra el PDF del proyecto (también es una forma de acceso) y lo dice en la confirmación. Las dos acciones van en una sola operación sobre todas las versiones. |
| S-12 | Tercer tipo de PDF "Anexo técnico" (`?precios=0`): vistas, cuadro de cantidades y despiece; la cotización no se calcula ni viaja en el HTML. Excel en `/projects/[id]/excel` (detrás de la sesión): una hoja por etapa con cantidad, unidad, elementos y estado, y hojas de despiece y láminas si hay tableros; sin precios. **Comprobado en producción** con el proyecto demo: el HTML del anexo trae `cotizacion: null`, el PDF se generó en segundo plano (357 KB, `/d/…`, `noindex`), y el Excel trae 4 hojas sin "$" ni "precio". Esa misma prueba cubre H-05 y H-06, que no se habían podido probar en producción por falta de crédito. |

**Siguen abiertos:** S-01 (datos legales), S-06 (respaldos en Railway), S-14 (después del piloto), H-07 c, S-02, S-03, S-04, S-07, y los seguimientos de H-08 y H-09 (necesitan crédito de API).

<!--
Plantilla para la próxima ronda:

### Ronda N · fecha · commit `xxxxxxx`
**Alcance:**
**Verificaciones:** (pruebas, lint, tipos, secretos)
**Cambios desde la ronda anterior:** IDs resueltos, IDs que siguen abiertos, hallazgos nuevos
**Orden sugerido:**
-->