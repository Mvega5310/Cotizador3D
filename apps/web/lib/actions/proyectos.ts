"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyectoPendiente, confirmarPieza, corregirElementos, guardarArchivosEntrada, obtenerEstadoProyecto, obtenerProyecto } from "@/lib/proyectos";
import { consumoValido } from "@cotizador3d/engine";
import type { ArchivoLeido } from "@/lib/ia";
import { generarEnSegundoPlano } from "@/lib/generacion";
import { leerArchivoGuardado } from "@/lib/archivos";
import { chequearCupo } from "@/lib/planes";
import { leerCotizacion } from "@/lib/cotizacion";
import { FORMATOS_ACEPTADOS, tipoDeArchivo } from "@/lib/imagenes";

export type EstadoForm = { error?: string };

const MAX_ARCHIVOS = 6;
// La API de Claude acepta 32 MB por petición y el base64 suma ~33 %; las
// fotos además se reducen antes de mandarlas (lib/imagenes.ts). El límite de
// las Server Actions está en next.config.ts (25 MB).
const MAX_BYTES_TOTAL = 22 * 1024 * 1024;

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
  for (const a of archivosForm) {
    if (!FORMATOS_ACEPTADOS.has(tipoDeArchivo(a.name, a.type))) {
      return { error: `"${a.name}" no es JPG, PNG, WebP o PDF. En iPhone, comparte la foto como JPG (o toma una captura de pantalla).` };
    }
  }
  if (archivosForm.reduce((s, a) => s + a.size, 0) > MAX_BYTES_TOTAL) {
    return { error: "Entre todos los archivos pasan de 22 MB. Sube menos páginas o fotos más livianas." };
  }

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  // Las pruebas gratis cuestan crédito real de IA: sin correo confirmado se
  // podrían crear cuentas en serie con correos desechables. Sin
  // RESEND_API_KEY (desarrollo) no se exige, porque el correo no saldría.
  if (!usuario.emailVerificado && process.env.RESEND_API_KEY) {
    return { error: "Confirma tu correo antes de generar tu primer proyecto. Si no te llegó, pídelo de nuevo desde tu panel." };
  }
  // Antes de la llamada a la IA (que cuesta dinero real), no después —
  // así un cupo agotado no se gasta en una generación que de todos modos
  // no se va a guardar.
  const cupo = await chequearCupo(usuario.cuentaId);
  if (!cupo.ok) return { error: cupo.motivo };

  // Se leen una sola vez a memoria: el mismo buffer se guarda en disco y se
  // manda a la IA.
  const archivos: ArchivoLeido[] = await Promise.all(
    archivosForm.map(async (a) => ({ nombre: a.name, mime: tipoDeArchivo(a.name, a.type), datos: Buffer.from(await a.arrayBuffer()) }))
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

  // Condicional y atómico: con dos clics casi simultáneos, solo uno logra
  // pasar el proyecto de "error" a "procesando"; el otro no lanza una
  // segunda generación (que se pagaría dos veces).
  const tomado = await prisma.proyecto.updateMany({
    where: { id: proyecto.id, estado: "error" },
    data: { estado: "procesando", errorIA: null, iniciadoIA: new Date() },
  });
  if (tomado.count === 0) return;
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

// Reglas de consumo de un material del proyecto (EditorConsumos.tsx). Son
// parámetros de cotización, como los precios: se editan sobre la pieza del
// catálogo y no crean una versión nueva del proyecto.
export async function guardarConsumosAction(proyectoId: string, piezaId: string, reglas: unknown): Promise<{ error?: string }> {
  const { entrada } = await obtenerProyecto(proyectoId);
  if (!entrada.catalogo[piezaId]) return { error: "Ese material no es de este proyecto." };
  if (!Array.isArray(reglas) || reglas.length > 20) return { error: "Lista de consumos inválida." };
  const limpias = reglas.map((r) => ({
    nombre: String(r?.nombre ?? "").trim().slice(0, 120), unidad: r?.unidad, base: r?.base,
    factor: Number(r?.factor), ...(r?.entero ? { entero: true } : {}),
  }));
  const mala = limpias.findIndex((r) => !consumoValido(r));
  if (mala >= 0) return { error: `El consumo ${mala + 1} está incompleto: necesita nombre y una cantidad mayor que 0.` };
  await prisma.catalogoPieza.update({ where: { id: piezaId }, data: { consumos: limpias } });
  revalidatePath(`/projects/${proyectoId}`);
  return {};
}

// Sección de un perfil (ancho × alto, en mm) que quedó provisional porque el
// plano no la indicaba (lib/proyectos.ts::depurarEntradaIA). Es un dato del
// material, como sus consumos: no crea versión nueva, y el cuadro se
// recalcula al recargar.
export async function guardarSeccionAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const proyectoId = String(formData.get("proyectoId") || "");
  const piezaId = String(formData.get("piezaId") || "");
  const ancho = Number(formData.get("ancho")) / 1000, alto = Number(formData.get("alto")) / 1000;
  if (!(ancho > 0.003 && alto > 0.003 && ancho < 2 && alto < 2)) return { error: "Escribe el ancho y el alto en milímetros (entre 3 y 2000)." };
  const { entrada } = await obtenerProyecto(proyectoId);
  const pieza = entrada.catalogo[piezaId];
  if (!pieza) return { error: "Ese material no es de este proyecto." };
  const { provisional: _provisional, ...resto } = pieza.dimensiones as Record<string, unknown>;
  await prisma.catalogoPieza.update({ where: { id: piezaId }, data: { dimensiones: { ...resto, ancho, alto } as Prisma.InputJsonValue } });
  revalidatePath(`/projects/${proyectoId}`);
  return {};
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
