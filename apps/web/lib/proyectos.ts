import { notFound } from "next/navigation";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { calcularProyecto, claveConsumo, consumoValido, medirElemento, seccionDesdeNombre } from "@cotizador3d/engine";
import type { RespuestaIA } from "@/lib/ia";
import { guardarArchivos } from "@/lib/archivos";
import { COTIZACION_INICIAL, leerCotizacion } from "@/lib/cotizacion";

const nuevoToken = () => randomBytes(16).toString("hex");

type UnidadClave = "kg" | "m2" | "m3" | "ml" | "und";
const MAX_ELEMENTOS = 3000;

export type Etapa = { numero: number; nombre: string };
export type Consumo = { nombre: string; unidad: UnidadClave; base: string; factor: number; entero?: boolean };
export type Pieza = {
  id: string; nombre: string; unidad: UnidadClave; dimensiones: Record<string, unknown>; factor?: number; tipo?: string;
  consumos?: Consumo[];
};

// Reglas de consumo guardadas (CatalogoPieza.consumos): solo las válidas.
export function leerConsumos(crudo: unknown): Consumo[] {
  return Array.isArray(crudo) ? (crudo.filter((c) => consumoValido(c)) as Consumo[]) : [];
}
// Elemento en el formato del motor (packages/engine/src/interprete.js)
export type ElementoMotor = {
  id: string; nombre: string; forma: string; geometria: unknown; pieza: string;
  etapa: number; unidad?: UnidadClave; origen: "ia" | "usuario"; confirmado: boolean;
};
export type EntradaMotor = { elementos: ElementoMotor[]; catalogo: Record<string, Pieza>; etapas: Etapa[] };

// Único camino de entrada de un proyecto: lo que propone la IA a partir de
// planos (lib/ia.ts). Se depura en vez de aceptarse todo o nada: los
// elementos que el motor no pueda interpretar se descartan y se cuentan, en
// vez de tumbar el proyecto completo — total, la IA se pudo haber equivocado
// en una sola pieza de cincuenta. Todo lo que entra queda con origen "ia" y
// sin confirmar: nada avanza sin que el usuario lo revise (ver
// docs/ARQUITECTURA.md, sección 2).
export function depurarEntradaIA(resp: RespuestaIA): { entrada: EntradaMotor; descartados: number; notas?: string; cotizacion?: RespuestaIA["cotizacion"] } {
  if (resp.elementos.length > MAX_ELEMENTOS) throw new Error(`La IA propuso ${resp.elementos.length} elementos; el máximo por proyecto es ${MAX_ELEMENTOS}.`);
  const catalogo: Record<string, Pieza> = Object.fromEntries(
    Object.entries(resp.catalogo).map(([clave, p]) => [
      clave,
      { id: clave, nombre: p.nombre, unidad: p.unidad, dimensiones: p.dimensiones ?? {}, factor: p.factor, consumos: leerConsumos(p.consumos) },
    ])
  );
  const elementos: ElementoMotor[] = resp.elementos.map((e) => ({
    id: e.id, nombre: e.nombre, forma: e.forma, geometria: e.geometria, pieza: e.pieza,
    etapa: e.etapa, origen: "ia", confirmado: false,
  }));
  const etapas: Etapa[] = [...resp.etapas].sort((a, b) => a.numero - b.numero);

  // Perfiles sin sección: sin ancho y alto la forma `viga` no es válida y se
  // descartaría justo la estructura. Se lee del nombre ("Tubo 150×50×4 mm");
  // si no se puede, una sección provisional marcada, que el usuario confirma.
  const provisionales: string[] = [];
  const usadasPorViga = new Set(elementos.filter((e) => e.forma === "viga").map((e) => e.pieza));
  for (const [clave, p] of Object.entries(catalogo)) {
    if (!usadasPorViga.has(clave)) continue;
    const d = p.dimensiones as { ancho?: number; alto?: number };
    if ((d.ancho ?? 0) > 0 && (d.alto ?? 0) > 0) continue;
    const s = seccionDesdeNombre(p.nombre);
    if (s) {
      p.dimensiones = { ...p.dimensiones, ...s };
    } else {
      p.dimensiones = { ...p.dimensiones, ancho: 0.05, alto: 0.05, provisional: 1 };
      provisionales.push(p.nombre);
    }
  }

  const { errores } = calcularProyecto({ elementos, catalogo, etapas });
  const invalidos = new Set(errores.map((e: { elementoId: string }) => e.elementoId));
  const validos = elementos.filter((e) => !invalidos.has(e.id));
  if (errores.length > 0) {
    console.log(`[ia] ${errores.length} elemento(s) descartados:`, errores.slice(0, 15).map((e: { elementoId: string; mensaje: string }) => `${e.elementoId}: ${e.mensaje}`).join(" · "));
  }
  if (validos.length === 0) {
    const lista = errores.slice(0, 5).map((e: { elementoId: string; mensaje: string }) => `${e.elementoId}: ${e.mensaje}`).join(" · ");
    throw new Error(`La IA no propuso ningún elemento interpretable. ${lista}`);
  }
  // Precios que la IA leyó de la descripción: solo los de piezas que existen,
  // del canto de una pieza que existe, o de un consumo que alguna pieza tiene
  // (normalizado igual que en el motor, interprete.js::claveConsumo).
  let cotizacion = resp.cotizacion;
  if (cotizacion) {
    const consumos = new Set(Object.values(catalogo).flatMap((p) => (p.consumos ?? []).map((c) => claveConsumo(c.nombre))));
    const valida = (k: string): string | null => {
      if (k.startsWith("consumo:")) {
        const clave = claveConsumo(k.slice("consumo:".length));
        return consumos.has(clave) ? clave : null;
      }
      return (k.endsWith("#canto") ? k.slice(0, -6) : k) in catalogo ? k : null;
    };
    cotizacion = { ...cotizacion, precios: filtrarClaves(cotizacion.precios, valida), apu: filtrarClaves(cotizacion.apu, valida) };
  }
  const avisoSecciones = provisionales.length
    ? `Sección por confirmar (se dibujó provisional de 50 × 50 mm porque el plano no la indica): ${provisionales.join(", ")}. Corrígela antes de presentar: cambia el dibujo y la superficie a pintar (el peso sale del factor kg/m).`
    : "";
  const notas = [resp.notas, avisoSecciones].filter(Boolean).join("\n\n") || undefined;
  return { entrada: { elementos: validos, catalogo, etapas }, descartados: invalidos.size, notas, cotizacion };
}

// Rehace un objeto { clave: valor } pasando cada clave por `mapear`; las que
// devuelven null se descartan. Lo usan los precios y el APU que vienen de la IA.
function filtrarClaves<T>(obj: Record<string, T> | undefined, mapear: (k: string) => string | null): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const nueva = mapear(k);
    if (nueva) out[nueva] = v;
  }
  return out;
}

// ---------- Guardar ----------

// Guarda una versión completa (etapas, elementos y resultado) usando piezas del
// catálogo que ya existen en la base. Cada elemento guarda su cantidad calculada.
// `enlaces` se pasa igual entre versiones de un mismo proyecto, para que el
// link que ya compartiste siga mostrando la versión más reciente.
async function volcarVersion(
  tx: Prisma.TransactionClient,
  versionId: string,
  entrada: EntradaMotor,
  piezaIds: Record<string, string>,
  enlaces: { linkCompleto: string; linkCliente: string }
) {
  const catalogoPorId: Record<string, Pieza> = {};
  for (const [clave, p] of Object.entries(entrada.catalogo)) catalogoPorId[piezaIds[clave]] = { ...p, id: piezaIds[clave] };
  const elementos = entrada.elementos.map((e) => ({ ...e, pieza: piezaIds[e.pieza] }));

  const etapaIds: Record<number, string> = {};
  for (const et of entrada.etapas) {
    etapaIds[et.numero] = (await tx.etapa.create({ data: { versionId, numero: et.numero, nombre: et.nombre } })).id;
  }

  await tx.elemento.createMany({
    data: elementos.map((e) => {
      const m = medirElemento(e, catalogoPorId);
      return {
        versionId,
        etapaId: etapaIds[e.etapa],
        nombre: e.nombre,
        forma: e.forma,
        geometria: e.geometria as Prisma.InputJsonValue,
        piezaId: e.pieza,
        cantidad: m.cantidad as number,
        unidad: m.unidad as UnidadClave,
        origen: e.origen,
        confirmado: e.confirmado,
      };
    }),
  });

  const calculo = calcularProyecto({ elementos, catalogo: catalogoPorId, etapas: entrada.etapas });
  const { lineas, porEtapa, total, bbox, despiece, laminas } = calculo;
  await tx.resultado.create({
    data: {
      versionId, renders: [], bom: { lineas, porEtapa, total, bbox, despiece, laminas } as unknown as Prisma.InputJsonValue, marcaAgua: true,
      linkCompleto: enlaces.linkCompleto, linkCliente: enlaces.linkCliente,
    },
  });
}

// Crear un proyecto son dos pasos, porque la IA tarda minutos: primero el
// proyecto vacío en estado "procesando" (respuesta inmediata al usuario) y,
// cuando la IA termina en segundo plano (lib/generacion.ts), completarProyecto
// le agrega la versión 1.
export async function crearProyectoPendiente(args: { usuarioId: string; cuentaId: string; cliente: string; tipoObra: string }) {
  return prisma.proyecto.create({
    data: { cuentaId: args.cuentaId, creadoPorId: args.usuarioId, cliente: args.cliente, tipoObra: args.tipoObra, estado: "procesando", iniciadoIA: new Date() },
  });
}

export async function completarProyecto(args: {
  proyectoId: string; cuentaId: string; entrada: EntradaMotor; notasIA?: string; descartadosIA?: number;
  cotizacion?: RespuestaIA["cotizacion"];
}) {
  const { proyectoId, cuentaId, entrada, notasIA, descartadosIA } = args;
  return prisma.$transaction(
    async (tx) => {
      const version = await tx.versionProyecto.create({ data: { proyectoId, numero: 1 } });
      const piezaIds: Record<string, string> = {};
      for (const [clave, p] of Object.entries(entrada.catalogo)) {
        piezaIds[clave] = (
          await tx.catalogoPieza.create({
            data: {
              cuentaId, tipo: p.tipo ?? "pieza", nombre: p.nombre, unidad: p.unidad,
              dimensiones: p.dimensiones as Prisma.InputJsonValue, factor: p.factor,
              consumos: p.consumos?.length ? (p.consumos as unknown as Prisma.InputJsonValue) : undefined,
            },
          })
        ).id;
      }
      await volcarVersion(tx, version.id, entrada, piezaIds, { linkCompleto: nuevoToken(), linkCliente: nuevoToken() });

      // Los precios vienen con las claves de la IA; se guardan con los ids
      // reales del catálogo, que es como los nombra el cuadro de cantidades.
      const aId = (k: string): string | null => {
        if (k.startsWith("consumo:")) return k; // no lleva id de pieza
        const [clave, sufijo] = k.split("#");
        return piezaIds[clave] ? (sufijo ? `${piezaIds[clave]}#${sufijo}` : piezaIds[clave]) : null;
      };
      const precios = filtrarClaves(args.cotizacion?.precios, aId);
      const cotizacion = leerCotizacion({
        ...COTIZACION_INICIAL, ...args.cotizacion, precios, apu: filtrarClaves(args.cotizacion?.apu, aId),
        deDescripcion: Object.keys(precios),
      });

      return tx.proyecto.update({
        where: { id: proyectoId },
        data: {
          estado: "generado", notasIA: notasIA || null, descartadosIA: descartadosIA ?? 0, errorIA: null,
          cotizacion: cotizacion as unknown as Prisma.InputJsonValue,
        },
      });
    },
    { timeout: 120000, maxWait: 30000 }
  );
}

// Guarda en disco los planos/fotos que dieron origen al proyecto (y la
// descripción libre, si la hubo), para poder volver a verlos después — antes
// se mandaban a la IA y se perdían. Aparte de crearProyecto porque escribir
// a disco no pertenece a una transacción de base de datos.
export async function guardarArchivosEntrada(
  proyectoId: string,
  archivos: { nombre: string; mime: string; datos: Buffer }[],
  descripcion: string
) {
  const guardados = guardarArchivos(proyectoId, archivos);
  if (guardados.length) {
    await prisma.archivoEntrada.createMany({
      data: guardados.map((g) => ({ proyectoId, tipo: g.tipo, url: g.url })),
    });
  }
  if (descripcion.trim()) {
    await prisma.archivoEntrada.create({ data: { proyectoId, tipo: "descripcion", descripcion: descripcion.trim() } });
  }
}

// ---------- Cargar ----------

// Arma entrada + cálculo a partir de una versión ya cargada de la base
// (con etapas, elementos y resultado). No decide permisos: eso lo hace quien
// llama (obtenerProyecto exige sesión; obtenerProyectoPorToken es público).
type VersionCargada = Prisma.VersionProyectoGetPayload<{ include: { etapas: true; elementos: true; resultado: true } }>;
async function armarEntrada(version: VersionCargada) {
  const piezas = await prisma.catalogoPieza.findMany({ where: { id: { in: [...new Set(version.elementos.map((e) => e.piezaId).filter((x): x is string => !!x))] } } });
  const catalogo: Record<string, Pieza> = Object.fromEntries(
    piezas.map((p) => [p.id, { id: p.id, nombre: p.nombre, unidad: p.unidad as UnidadClave, dimensiones: p.dimensiones as Record<string, unknown>, factor: p.factor ?? undefined, tipo: p.tipo, consumos: leerConsumos(p.consumos) }])
  );
  const numeroDe = new Map(version.etapas.map((e) => [e.id, e.numero]));
  const etapas: Etapa[] = version.etapas.map((e) => ({ numero: e.numero, nombre: e.nombre }));
  const elementos: ElementoMotor[] = version.elementos.map((e) => ({
    id: e.id, nombre: e.nombre, forma: e.forma, geometria: e.geometria, pieza: e.piezaId ?? "",
    etapa: (e.etapaId && numeroDe.get(e.etapaId)) || 1, unidad: e.unidad as UnidadClave, origen: e.origen as "ia" | "usuario", confirmado: e.confirmado,
  }));
  const entrada: EntradaMotor = { elementos, catalogo, etapas };
  return { entrada, calculo: calcularProyecto(entrada) };
}

// Una generación que lleva más que esto en "procesando" se cortó (p. ej. un
// despliegue reinició el servidor a mitad de camino): la IA nunca tarda tanto.
const GENERACION_MAX_MS = 15 * 60 * 1000;

// Solo el proyecto y su estado, sin versión — para la página mientras la IA
// trabaja o si falló. Mismo aislamiento por cuenta que obtenerProyecto.
export async function obtenerEstadoProyecto(projectId: string) {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  let proyecto = await prisma.proyecto.findFirst({ where: { id: projectId, cuentaId: usuario.cuentaId } });
  if (!proyecto) notFound();
  if (proyecto.estado === "procesando" && proyecto.iniciadoIA && Date.now() - proyecto.iniciadoIA.getTime() > GENERACION_MAX_MS) {
    proyecto = await prisma.proyecto.update({
      where: { id: proyecto.id },
      data: { estado: "error", errorIA: "La lectura de los planos se interrumpió antes de terminar." },
    });
  }
  return proyecto;
}

// Siempre restringido a la cuenta del usuario en sesión: es lo que separa los
// proyectos de personas distintas (ver lib/session.ts::requireSession).
export async function obtenerProyecto(projectId: string) {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });

  const proyecto = await prisma.proyecto.findFirst({
    where: { id: projectId, cuentaId: usuario.cuentaId },
    include: {
      versiones: {
        orderBy: { numero: "desc" },
        take: 1,
        include: { etapas: { orderBy: { numero: "asc" } }, elementos: true, resultado: true },
      },
      archivos: { orderBy: { subidoEn: "asc" } },
    },
  });
  if (!proyecto || !proyecto.versiones[0]) notFound();

  const version = proyecto.versiones[0];
  const { entrada, calculo } = await armarEntrada(version);
  return { proyecto, version, entrada, calculo };
}

// Página pública (sin sesión): busca por el token de cualquier versión del
// proyecto y muestra la versión MÁS RECIENTE, para que un link compartido no
// quede pegado a una versión vieja. `modo` decide qué se muestra: la
// "completo" trae cantidades, la "cliente" es solo el visor (guía v3, §06).
export async function obtenerProyectoPorToken(token: string) {
  const resultado = await prisma.resultado.findFirst({
    where: { OR: [{ linkCompleto: token }, { linkCliente: token }] },
    include: { version: { include: { proyecto: true } } },
  });
  if (!resultado) notFound();
  const modo: "completo" | "cliente" = resultado.linkCompleto === token ? "completo" : "cliente";

  const version = await prisma.versionProyecto.findFirst({
    where: { proyectoId: resultado.version.proyecto.id },
    orderBy: { numero: "desc" },
    include: { etapas: { orderBy: { numero: "asc" } }, elementos: true, resultado: true },
  });
  if (!version) notFound();

  const { entrada, calculo } = await armarEntrada(version);
  // En modo cliente, la entrada va a un componente de navegador (el visor):
  // del catálogo solo sale lo que hace falta para dibujar. El factor kg/m, los
  // consumos y el tamaño de lámina son datos del ejecutor con los que calcula
  // sus cantidades, y "ver código fuente" los mostraría (AUDITORIA.md, H-11).
  // `calculo` se calculó con la entrada completa; en modo cliente no se dibuja.
  const publica: EntradaMotor = modo === "cliente" ? { ...entrada, catalogo: catalogoParaDibujar(entrada.catalogo) } : entrada;
  return { proyecto: resultado.version.proyecto, version, entrada: publica, calculo, modo, marcaAgua: version.resultado?.marcaAgua ?? true };
}

const DIMENSIONES_DE_DIBUJO = ["ancho", "alto", "espesor", "color", "opacidad"];

function catalogoParaDibujar(catalogo: Record<string, Pieza>): Record<string, Pieza> {
  return Object.fromEntries(
    Object.entries(catalogo).map(([k, p]) => [
      k,
      {
        id: p.id, nombre: p.nombre, unidad: p.unidad, tipo: p.tipo,
        dimensiones: Object.fromEntries(Object.entries(p.dimensiones).filter(([d]) => DIMENSIONES_DE_DIBUJO.includes(d))),
      },
    ])
  );
}

// Corregir la geometría de uno o más elementos: igual que confirmarPieza, no
// se edita la versión existente — se crea la siguiente con esos elementos
// con su geometría nueva, confirmados y con origen "usuario" (ya lo revisó
// una persona, deja de ser un supuesto de la IA). Se valida cada elemento
// tocado con el motor antes de guardar nada: si una corrección no tiene
// sentido (p. ej. un punto repetido), se avisa cuál y por qué, sin tumbar
// las demás correcciones de la misma tanda.
export async function corregirElementos(projectId: string, correcciones: Record<string, Record<string, number[]>>): Promise<{ error?: string }> {
  const { proyecto, version, entrada } = await obtenerProyecto(projectId);
  const idsValidos = new Set(entrada.elementos.map((e) => e.id));
  const idsCorregir = Object.keys(correcciones).filter((id) => idsValidos.has(id));
  if (idsCorregir.length === 0) return { error: "No hay ningún elemento para corregir." };

  const elementos = entrada.elementos.map((e) =>
    correcciones[e.id] ? { ...e, geometria: correcciones[e.id], confirmado: true, origen: "usuario" as const } : e
  );
  for (const id of idsCorregir) {
    const el = elementos.find((e) => e.id === id)!;
    const m = medirElemento(el, entrada.catalogo);
    if (!m.ok) return { error: `${el.nombre} (${id}): ${m.mensaje}` };
  }

  const piezaIds = Object.fromEntries(Object.keys(entrada.catalogo).map((k) => [k, k]));
  const enlaces = { linkCompleto: version.resultado?.linkCompleto ?? nuevoToken(), linkCliente: version.resultado?.linkCliente ?? nuevoToken() };
  await prisma.$transaction(
    async (tx) => {
      const v = await tx.versionProyecto.create({ data: { proyectoId: proyecto.id, numero: version.numero + 1 } });
      await volcarVersion(tx, v.id, { ...entrada, elementos }, piezaIds, enlaces);
    },
    { timeout: 120000, maxWait: 30000 }
  );
  return {};
}

// Confirmar una pieza es una corrección: no se edita la versión existente, se
// crea la siguiente con esos elementos marcados como confirmados por el usuario.
export async function confirmarPieza(projectId: string, piezaId: string) {
  const { proyecto, version, entrada } = await obtenerProyecto(projectId);
  if (!entrada.elementos.some((e) => e.pieza === piezaId && !e.confirmado)) return;

  const piezaIds = Object.fromEntries(Object.keys(entrada.catalogo).map((k) => [k, k]));
  const nueva: EntradaMotor = {
    ...entrada,
    elementos: entrada.elementos.map((e) => (e.pieza === piezaId ? { ...e, confirmado: true, origen: "usuario" as const } : e)),
  };
  const enlaces = { linkCompleto: version.resultado?.linkCompleto ?? nuevoToken(), linkCliente: version.resultado?.linkCliente ?? nuevoToken() };
  await prisma.$transaction(
    async (tx) => {
      const v = await tx.versionProyecto.create({ data: { proyectoId: proyecto.id, numero: version.numero + 1 } });
      await volcarVersion(tx, v.id, nueva, piezaIds, enlaces);
    },
    { timeout: 120000, maxWait: 30000 }
  );
}
