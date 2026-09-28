"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyecto, confirmarPieza, validarEntrada, depurarEntradaIA, type EntradaMotor } from "@/lib/proyectos";
import { EJEMPLOS, leerEjemplo } from "@/lib/ejemplos";
import { proponerElementos } from "@/lib/ia";

export type EstadoForm = { error?: string };

const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_ARCHIVOS = 6;
const MAX_BYTES_ARCHIVO = 15 * 1024 * 1024;

async function crearYRedirigir(cliente: string, tipoObra: string, entrada: EntradaMotor, aviso?: string): Promise<never> {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  const proyecto = await crearProyecto({ usuarioId: usuario.id, cuentaId: usuario.cuentaId, cliente, tipoObra, entrada });
  redirect(`/projects/${proyecto.id}${aviso ? `?aviso=${encodeURIComponent(aviso)}` : ""}`);
}

export async function crearDesdeEjemploAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requireSession();
  const clave = String(formData.get("ejemplo") || "");
  const ejemplo = EJEMPLOS.find((e) => e.clave === clave);
  if (!ejemplo) return { error: "Elige un ejemplo." };
  const cliente = String(formData.get("cliente") || "").trim() || ejemplo.cliente;

  let entrada: EntradaMotor;
  try {
    entrada = validarEntrada(leerEjemplo(ejemplo.clave));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el ejemplo." };
  }
  return crearYRedirigir(cliente, ejemplo.tipoObra, entrada);
}

export async function importarJsonAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requireSession();
  const cliente = String(formData.get("cliente") || "").trim();
  const tipoObra = String(formData.get("tipoObra") || "").trim() || "personalizado";
  const texto = String(formData.get("json") || "");
  if (!cliente) return { error: "Escribe el nombre del cliente." };
  if (!texto.trim()) return { error: "Pega el JSON del proyecto." };
  if (Buffer.byteLength(texto) > MAX_JSON_BYTES) return { error: "El JSON pesa más de 2 MB." };

  let entrada: EntradaMotor;
  try {
    entrada = validarEntrada(JSON.parse(texto));
  } catch (e) {
    return { error: e instanceof SyntaxError ? "El texto no es un JSON válido." : e instanceof Error ? e.message : "JSON inválido." };
  }
  return crearYRedirigir(cliente, tipoObra, entrada);
}

export async function crearDesdeIAAction(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await requireSession();
  const cliente = String(formData.get("cliente") || "").trim();
  const tipoObra = String(formData.get("tipoObra") || "").trim() || "personalizado";
  const descripcion = String(formData.get("descripcion") || "");
  const archivos = formData.getAll("archivos").filter((a): a is File => a instanceof File && a.size > 0);

  if (!cliente) return { error: "Escribe el nombre del cliente." };
  if (archivos.length === 0) return { error: "Sube al menos un plano, boceto o foto." };
  if (archivos.length > MAX_ARCHIVOS) return { error: `Máximo ${MAX_ARCHIVOS} archivos por proyecto.` };
  for (const a of archivos) if (a.size > MAX_BYTES_ARCHIVO) return { error: `"${a.name}" pesa más de 15 MB.` };

  let resultado;
  try {
    const propuesta = await proponerElementos({ archivos, descripcion });
    resultado = depurarEntradaIA(propuesta);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar el proyecto a partir de los planos." };
  }

  const partes = [`${resultado.entrada.elementos.length} elementos propuestos por IA, todos pendientes de confirmar`];
  if (resultado.descartados > 0) partes.push(`${resultado.descartados} no se pudieron interpretar y se descartaron`);
  if (resultado.notas) partes.push(resultado.notas);
  return crearYRedirigir(cliente, tipoObra, resultado.entrada, partes.join(" · "));
}

export async function confirmarPiezaAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  const piezaId = String(formData.get("piezaId") || "");
  if (!proyectoId || !piezaId) return;
  await confirmarPieza(proyectoId, piezaId);
  revalidatePath(`/projects/${proyectoId}`);
}
