import { notFound } from "next/navigation";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { calcularProyecto, medirElemento } from "@cotizador3d/engine";
import type { RespuestaIA } from "@/lib/ia";

const nuevoToken = () => randomBytes(16).toString("hex");

const UNIDADES = ["kg", "m2", "m3", "ml", "und"] as const;
type UnidadClave = (typeof UNIDADES)[number];
export const MAX_ELEMENTOS = 3000;

export type Etapa = { numero: number; nombre: string };
export type Pieza = { id: string; nombre: string; unidad: UnidadClave; dimensiones: Record<string, unknown>; factor?: number; tipo?: string };
// Elemento en el formato del motor (packages/engine/src/interprete.js)
export type ElementoMotor = {
  id: string; nombre: string; forma: string; geometria: unknown; pieza: string;
  etapa: number; unidad?: UnidadClave; origen: "ia" | "usuario"; confirmado: boolean;
};
export type EntradaMotor = { elementos: ElementoMotor[]; catalogo: Record<string, Pieza>; etapas: Etapa[] };

const esObjeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

// Valida lo que llega de fuera (ejemplo, JSON pegado, más adelante la IA) y lo
// corre por el motor: si algún elemento no se puede interpretar, se rechaza
// con el motivo en vez de guardar un proyecto a medias.
export function validarEntrada(data: unknown): EntradaMotor {
  if (!esObjeto(data)) throw new Error("El JSON debe ser un objeto con `catalogo` y `elementos`.");
  if (!esObjeto(data.catalogo)) throw new Error("Falta `catalogo` (un objeto con las piezas).");
  if (!Array.isArray(data.elementos) || data.elementos.length === 0) throw new Error("`elementos` debe ser una lista con al menos un elemento.");
  if (data.elementos.length > MAX_ELEMENTOS) throw new Error(`Máximo ${MAX_ELEMENTOS} elementos por proyecto.`);

  const catalogo: Record<string, Pieza> = {};
  for (const [clave, p] of Object.entries(data.catalogo)) {
    if (!esObjeto(p) || typeof p.nombre !== "string" || !UNIDADES.includes(p.unidad as UnidadClave)) {
      throw new Error(`Pieza "${clave}": necesita \`nombre\` y \`unidad\` (${UNIDADES.join(", ")}).`);
    }
    catalogo[clave] = {
      id: clave,
      nombre: p.nombre,
      unidad: p.unidad as UnidadClave,
      dimensiones: esObjeto(p.dimensiones) ? p.dimensiones : {},
      factor: typeof p.factor === "number" && Number.isFinite(p.factor) ? p.factor : undefined,
      tipo: typeof p.tipo === "string" ? p.tipo : undefined,
    };
  }

  const elementos = data.elementos.map((e, i): ElementoMotor => {
    if (!esObjeto(e) || typeof e.forma !== "string" || typeof e.pieza !== "string") {
      throw new Error(`Elemento ${i + 1}: necesita \`forma\` y \`pieza\` (texto).`);
    }
    const etapa = e.etapa === undefined ? 1 : Number(e.etapa);
    if (!Number.isInteger(etapa) || etapa < 1) throw new Error(`Elemento ${i + 1}: \`etapa\` debe ser un entero de 1 o más.`);
    if (e.unidad !== undefined && !UNIDADES.includes(e.unidad as UnidadClave)) throw new Error(`Elemento ${i + 1}: unidad inválida.`);
    const origen = e.origen === "ia" ? "ia" : "usuario";
    return {
      id: typeof e.id === "string" ? e.id : `el-${i + 1}`,
      nombre: typeof e.nombre === "string" ? e.nombre : e.forma,
      forma: e.forma,
      geometria: e.geometria,
      pieza: e.pieza,
      etapa,
      unidad: e.unidad as UnidadClave | undefined,
      origen,
      confirmado: typeof e.confirmado === "boolean" ? e.confirmado : origen !== "ia",
    };
  });

  const etapas: Etapa[] = Array.isArray(data.etapas)
    ? data.etapas.filter((e): e is Etapa => esObjeto(e) && Number.isInteger(e.numero) && typeof e.nombre === "string")
    : [];
  for (const n of new Set(elementos.map((e) => e.etapa))) if (!etapas.some((e) => e.numero === n)) etapas.push({ numero: n, nombre: `Etapa ${n}` });
  etapas.sort((a, b) => a.numero - b.numero);

  const { errores } = calcularProyecto({ elementos, catalogo, etapas });
  if (errores.length) {
    const lista = errores.slice(0, 5).map((e: { elementoId: string; mensaje: string }) => `${e.elementoId}: ${e.mensaje}`).join(" · ");
    throw new Error(`${errores.length} elemento(s) no se pueden interpretar. ${lista}`);
  }
  return { elementos, catalogo, etapas };
}

// A diferencia de validarEntrada (todo o nada, para JSON pegado a mano), lo
// que propone la IA se depura: los elementos que el motor no pueda
// interpretar se descartan en vez de tumbar el proyecto completo — total, la
// IA se pudo haber equivocado en una sola pieza de cincuenta. Todo lo que
// entra queda con origen "ia" y sin confirmar: nada avanza sin que el usuario
// lo revise (ver docs/ARQUITECTURA.md, sección 2).
export function depurarEntradaIA(resp: RespuestaIA): { entrada: EntradaMotor; descartados: number; notas?: string } {
  const catalogo: Record<string, Pieza> = Object.fromEntries(
    Object.entries(resp.catalogo).map(([clave, p]) => [
      clave,
      { id: clave, nombre: p.nombre, unidad: p.unidad, dimensiones: p.dimensiones ?? {}, factor: p.factor },
    ])
  );
  const elementos: ElementoMotor[] = resp.elementos.map((e) => ({
    id: e.id, nombre: e.nombre, forma: e.forma, geometria: e.geometria, pieza: e.pieza,
    etapa: e.etapa, origen: "ia", confirmado: false,
  }));
  const etapas: Etapa[] = [...resp.etapas].sort((a, b) => a.numero - b.numero);

  const { errores } = calcularProyecto({ elementos, catalogo, etapas });
  const invalidos = new Set(errores.map((e: { elementoId: string }) => e.elementoId));
  const validos = elementos.filter((e) => !invalidos.has(e.id));
  if (validos.length === 0) {
    const lista = errores.slice(0, 5).map((e: { elementoId: string; mensaje: string }) => `${e.elementoId}: ${e.mensaje}`).join(" · ");
    throw new Error(`La IA no propuso ningún elemento interpretable. ${lista}`);
  }
  return { entrada: { elementos: validos, catalogo, etapas }, descartados: invalidos.size, notas: resp.notas };
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
  const { lineas, porEtapa, total, bbox } = calculo;
  await tx.resultado.create({
    data: {
      versionId, renders: [], bom: { lineas, porEtapa, total, bbox } as unknown as Prisma.InputJsonValue, marcaAgua: true,
      linkCompleto: enlaces.linkCompleto, linkCliente: enlaces.linkCliente,
    },
  });
}

export async function crearProyecto(args: { usuarioId: string; cuentaId: string; cliente: string; tipoObra: string; entrada: EntradaMotor }) {
  const { usuarioId, cuentaId, cliente, tipoObra, entrada } = args;
  return prisma.$transaction(
    async (tx) => {
      const proyecto = await tx.proyecto.create({ data: { cuentaId, creadoPorId: usuarioId, cliente, tipoObra, estado: "generado" } });
      const version = await tx.versionProyecto.create({ data: { proyectoId: proyecto.id, numero: 1 } });
      const piezaIds: Record<string, string> = {};
      for (const [clave, p] of Object.entries(entrada.catalogo)) {
        piezaIds[clave] = (
          await tx.catalogoPieza.create({
            data: {
              cuentaId, tipo: p.tipo ?? "pieza", nombre: p.nombre, unidad: p.unidad,
              dimensiones: p.dimensiones as Prisma.InputJsonValue, factor: p.factor,
            },
          })
        ).id;
      }
      await volcarVersion(tx, version.id, entrada, piezaIds, { linkCompleto: nuevoToken(), linkCliente: nuevoToken() });
      return proyecto;
    },
    { timeout: 120000, maxWait: 30000 }
  );
}

// ---------- Cargar ----------

// Arma entrada + cálculo a partir de una versión ya cargada de la base
// (con etapas, elementos y resultado). No decide permisos: eso lo hace quien
// llama (obtenerProyecto exige sesión; obtenerProyectoPorToken es público).
type VersionCargada = Prisma.VersionProyectoGetPayload<{ include: { etapas: true; elementos: true; resultado: true } }>;
async function armarEntrada(version: VersionCargada) {
  const piezas = await prisma.catalogoPieza.findMany({ where: { id: { in: [...new Set(version.elementos.map((e) => e.piezaId).filter((x): x is string => !!x))] } } });
  const catalogo: Record<string, Pieza> = Object.fromEntries(
    piezas.map((p) => [p.id, { id: p.id, nombre: p.nombre, unidad: p.unidad as UnidadClave, dimensiones: p.dimensiones as Record<string, unknown>, factor: p.factor ?? undefined, tipo: p.tipo }])
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
  return { proyecto: resultado.version.proyecto, version, entrada, calculo, modo, marcaAgua: version.resultado?.marcaAgua ?? true };
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
