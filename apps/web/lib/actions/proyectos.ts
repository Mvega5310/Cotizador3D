"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyecto, confirmarPieza, validarEntrada, type EntradaMotor } from "@/lib/proyectos";
import { EJEMPLOS, leerEjemplo } from "@/lib/ejemplos";

export type EstadoForm = { error?: string };

const MAX_JSON_BYTES = 2 * 1024 * 1024;

async function crearYRedirigir(cliente: string, tipoObra: string, entrada: EntradaMotor): Promise<never> {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  const proyecto = await crearProyecto({ usuarioId: usuario.id, cuentaId: usuario.cuentaId, cliente, tipoObra, entrada });
  redirect(`/projects/${proyecto.id}`);
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

export async function confirmarPiezaAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  const piezaId = String(formData.get("piezaId") || "");
  if (!proyectoId || !piezaId) return;
  await confirmarPieza(proyectoId, piezaId);
  revalidatePath(`/projects/${proyectoId}`);
}
