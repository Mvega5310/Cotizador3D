import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

// Administradores de la plataforma (no de una cuenta): ADMIN_EMAILS, correos
// separados por coma. Ven el uso y el costo de IA de todas las cuentas.
function correosAdmin(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean));
}

export function esAdmin(email: string): boolean {
  return correosAdmin().has(email.trim().toLowerCase());
}

// Para páginas solo de administración: a cualquier otro usuario le responde
// 404, como si la página no existiera.
export async function requireAdmin() {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  if (!esAdmin(usuario.email)) notFound();
  return usuario;
}
