"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyectoPendiente, confirmarPieza, corregirElementos, guardarArchivosEntrada, obtenerEstadoProyecto } from "@/lib/proyectos";
import type { ArchivoLeido } from "@/lib/ia";
import { generarEnSegundoPlano } from "@/lib/generacion";
import { leerArchivoGuardado } from "@/lib/archivos";
import { chequearCupo } from "@/lib/planes";
import { leerCotizacion } from "@/lib/cotizacion";

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

  // Se leen una sola vez a memoria: el mismo buffer se guarda en disco y se
  // manda a la IA.
  const archivos: ArchivoLeido[] = await Promise.all(
    archivosForm.map(async (a) => ({ nombre: a.name, mime: a.type, datos: Buffer.from(await a.arrayBuffer()) }))
  );

  // El proyecto existe desde ya (en "procesando") y la IA corre después de
  // responder: el usuario ve la página del proyecto de inmediato y esta se
  // actualiza sola cuando la IA termina (ver lib/generacion.ts).
  const proyecto = await crearProyectoPendiente({ usuarioId: usuario.id, cuentaId: usuario.cuentaId, cliente, tipoObra });
  await guardarArchivosEntrada(proyecto.id, archivos, descripcion);
  after(() => generarEnSegundoPlano({ proyectoId: proyecto.id, cuentaId: usuario.cuentaId, archivos, descripcion }));

  redirect(`/projects/${proyecto.id}`);
}

// Vuelve a mandar a la IA los planos y la descripción ya guardados de un
// proyecto cuya generación falló o se interrumpió.
export async function reintentarGeneracionAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  const proyecto = await obtenerEstadoProyecto(proyectoId);
  if (proyecto.estado !== "error") return;
  const cupo = await chequearCupo(proyecto.cuentaId);
  if (!cupo.ok) {
    await prisma.proyecto.update({ where: { id: proyecto.id }, data: { errorIA: cupo.motivo } });
    revalidatePath(`/projects/${proyecto.id}`);
    return;
  }

  const guardados = await prisma.archivoEntrada.findMany({ where: { proyectoId: proyecto.id } });
  const archivos = guardados
    .filter((a) => a.url)
    .map((a) => leerArchivoGuardado(proyecto.id, a.url!))
    .filter((a): a is ArchivoLeido => a !== null);
  const descripcion = guardados.find((a) => a.tipo === "descripcion")?.descripcion ?? "";
  if (archivos.length === 0) {
    await prisma.proyecto.update({ where: { id: proyecto.id }, data: { errorIA: "No se encontraron los planos guardados de este proyecto. Crea uno nuevo." } });
    revalidatePath(`/projects/${proyecto.id}`);
    return;
  }

  await prisma.proyecto.update({ where: { id: proyecto.id }, data: { estado: "procesando", errorIA: null, iniciadoIA: new Date() } });
  after(() => generarEnSegundoPlano({ proyectoId: proyecto.id, cuentaId: proyecto.cuentaId, archivos, descripcion }));
  revalidatePath(`/projects/${proyecto.id}`);
}

// La pantalla de cotización guarda sola mientras el usuario escribe (con una
// pausa, ver CotizadorProyecto.tsx). Se valida todo en leerCotizacion.
export async function guardarCotizacionAction(proyectoId: string, datos: unknown): Promise<{ ok: boolean }> {
  const proyecto = await obtenerEstadoProyecto(proyectoId);
  const cotizacion = leerCotizacion(datos);
  await prisma.proyecto.update({ where: { id: proyecto.id }, data: { cotizacion } });
  return { ok: true };
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
    (correcciones[id][campo] ??= [])[Number(indice)] = n;
  }
  if (Object.keys(correcciones).length === 0) return { error: "No hay cambios para guardar." };

  const resultado = await corregirElementos(proyectoId, correcciones);
  if (resultado.error) return { error: resultado.error };
  revalidatePath(`/projects/${proyectoId}`);
  return {};
}
