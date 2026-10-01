import { notFound } from "next/navigation";
import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { calcularProyecto, medirElemento } from "@cotizador3d/engine";
import type { RespuestaIA } from "@/lib/ia";
import { guardarArchivos } from "@/lib/archivos";

const nuevoToken = () => randomBytes(16).toString("hex");

type UnidadClave = "kg" | "m2" | "m3" | "ml" | "und";
const MAX_ELEMENTOS = 3000;

export type Etapa = { numero: number; nombre: string };
export type Pieza = { id: string; nombre: string; unidad: UnidadClave; dimensiones: Record<string, unknown>; factor?: number; tipo?: string };
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
export function depurarEntradaIA(resp: RespuestaIA): { entrada: EntradaMotor; descartados: number; notas?: string } {
  if (resp.elementos.length > MAX_ELEMENTOS) throw new Error(`La IA propuso ${resp.elementos.length} elementos; el máximo por proyecto es ${MAX_ELEMENTOS}.`);
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
  if (errores.length > 0) {
    console.log(`[ia] ${errores.length} elemento(s) descartados:`, errores.slice(0, 15).map((e: { elementoId: string; mensaje: string }) => `${e.elementoId}: ${e.mensaje}`).join(" · "));
  }
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
  return { proyecto: resultado.version.proyecto, version, entrada, calculo, modo, marcaAgua: version.resultado?.marcaAgua ?? true };
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
