import fs from "fs";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rutaArchivo, mimePorExtension } from "@/lib/archivos";

// Sirve un plano/foto subido — solo al dueño del proyecto, nunca por el link
// público (esos son para presentar el resultado, no los insumos originales).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; archivo: string }> }) {
  const { id, archivo } = await params;
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });

  const proyecto = await prisma.proyecto.findFirst({ where: { id, cuentaId: usuario.cuentaId } });
  if (!proyecto) return new Response("No encontrado.", { status: 404 });

  let ruta: string;
  try {
    ruta = rutaArchivo(id, archivo);
  } catch {
    return new Response("Nombre de archivo inválido.", { status: 400 });
  }
  if (!fs.existsSync(ruta)) return new Response("No encontrado.", { status: 404 });

  const datos = fs.readFileSync(ruta);
  return new Response(new Uint8Array(datos), { headers: { "Content-Type": mimePorExtension(archivo) } });
}
