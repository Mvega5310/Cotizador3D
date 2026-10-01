"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { crearProyecto, confirmarPieza, depurarEntradaIA, type EntradaMotor } from "@/lib/proyectos";
import { proponerElementos } from "@/lib/ia";

export type EstadoForm = { error?: string };

const MAX_ARCHIVOS = 6;
const MAX_BYTES_ARCHIVO = 15 * 1024 * 1024;

async function crearYRedirigir(cliente: string, tipoObra: string, entrada: EntradaMotor, aviso?: string): Promise<never> {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  const proyecto = await crearProyecto({ usuarioId: usuario.id, cuentaId: usuario.cuentaId, cliente, tipoObra, entrada });
  redirect(`/projects/${proyecto.id}${aviso ? `?aviso=${encodeURIComponent(aviso)}` : ""}`);
}

// Único camino para crear un proyecto: subir planos y dejar que la IA
// proponga los elementos (ver lib/ia.ts). Un usuario cualquiera nunca escribe
// datos a mano ni ve el formato interno — eso quedó solo como herramienta de
// desarrollo (packages/engine/test, projects/*, casa.test.js).
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
