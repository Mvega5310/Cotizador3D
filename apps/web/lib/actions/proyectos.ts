"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyecto, confirmarPieza, corregirElementos, depurarEntradaIA, guardarArchivosEntrada } from "@/lib/proyectos";
import { proponerElementos, type ArchivoLeido } from "@/lib/ia";
import { chequearCupo } from "@/lib/planes";

export type EstadoForm = { error?: string };

const MAX_ARCHIVOS = 6;
const MAX_BYTES_ARCHIVO = 15 * 1024 * 1024;

// Único camino para crear un proyecto: subir planos y dejar que la IA
// proponga los elementos (ver lib/ia.ts). Un usuario cualquiera nunca escribe
// datos a mano ni ve el formato interno — eso quedó solo como herramienta de
// desarrollo (packages/engine/test, projects/*, casa.test.js).
export async function crearDesdeIAAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const session = await requireSession();
  const cliente = String(formData.get("cliente") || "").trim();
  const tipoObra = String(formData.get("tipoObra") || "").trim() || "personalizado";
  const descripcion = String(formData.get("descripcion") || "");
  const archivosForm = formData.getAll("archivos").filter((a): a is File => a instanceof File && a.size > 0);

  if (!cliente) return { error: "Escribe el nombre del cliente." };
  if (archivosForm.length === 0) return { error: "Sube al menos un plano, boceto o foto." };
  if (archivosForm.length > MAX_ARCHIVOS) return { error: `Máximo ${MAX_ARCHIVOS} archivos por proyecto.` };
  for (const a of archivosForm) if (a.size > MAX_BYTES_ARCHIVO) return { error: `"${a.name}" pesa más de 15 MB.` };

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  // Antes de la llamada a la IA (que cuesta dinero real), no después —
  // así un cupo agotado no se gasta en una generación que de todos modos
  // no se va a guardar.
  const cupo = await chequearCupo(usuario.cuentaId);
  if (!cupo.ok) return { error: cupo.motivo };

  // Se leen una sola vez a memoria: el mismo buffer se manda a la IA y se
  // guarda en disco si el proyecto se termina creando (ver más abajo).
  const archivos: ArchivoLeido[] = await Promise.all(
    archivosForm.map(async (a) => ({ nombre: a.name, mime: a.type, datos: Buffer.from(await a.arrayBuffer()) }))
  );

  let resultado;
  try {
    const propuesta = await proponerElementos({ archivos, descripcion });
    resultado = depurarEntradaIA(propuesta);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar el proyecto a partir de los planos." };
  }

  const proyecto = await crearProyecto({ usuarioId: usuario.id, cuentaId: usuario.cuentaId, cliente, tipoObra, entrada: resultado.entrada });
  await guardarArchivosEntrada(proyecto.id, archivos, descripcion);

  const partes = [`${resultado.entrada.elementos.length} elementos propuestos por IA, todos pendientes de confirmar`];
  if (resultado.descartados > 0) partes.push(`${resultado.descartados} no se pudieron interpretar y se descartaron`);
  if (resultado.notas) partes.push(resultado.notas);
  redirect(`/projects/${proyecto.id}?aviso=${encodeURIComponent(partes.join(" · "))}`);
}

export async function confirmarPiezaAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  const piezaId = String(formData.get("piezaId") || "");
  if (!proyectoId || !piezaId) return;
  await confirmarPieza(proyectoId, piezaId);
  revalidatePath(`/projects/${proyectoId}`);
}

// Campos del formulario: "geo.<elementoId>.<campo>.<índice>" -> número.
// Un solo envío puede corregir varios elementos a la vez (ver EditorElementos.tsx).
const CAMPO_GEO = /^geo\.(.+)\.([^.]+)\.(\d)$/;

export async function corregirElementosAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const proyectoId = String(formData.get("proyectoId") || "");
  if (!proyectoId) return { error: "Falta el proyecto." };

  const correcciones: Record<string, Record<string, number[]>> = {};
  for (const [clave, valor] of formData.entries()) {
    const m = clave.match(CAMPO_GEO);
    if (!m) continue;
    const [, id, campo, indice] = m;
    const n = Number(valor);
    if (!Number.isFinite(n)) return { error: `El valor de "${campo}" en ${id} no es un número.` };
    (correcciones[id] ??= {});
    (correcciones[id][campo] ??= [0, 0, 0])[Number(indice)] = n;
  }
  if (Object.keys(correcciones).length === 0) return { error: "No hay cambios para guardar." };

  const resultado = await corregirElementos(proyectoId, correcciones);
  if (resultado.error) return { error: resultado.error };
  revalidatePath(`/projects/${proyectoId}`);
  return {};
}
