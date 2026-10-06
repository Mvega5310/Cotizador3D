import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, type SessionPayload } from "./auth";
import { prisma } from "./db";

export const COOKIE_NAME = "cotizador_session";

// La firma del token no basta: también se compara su versión con la del
// usuario. Restablecer la contraseña sube Usuario.sesionVersion y así cierra
// las sesiones abiertas en otros dispositivos. `cache` evita repetir la
// consulta dentro de una misma petición.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const u = await prisma.usuario.findUnique({ where: { id: payload.userId }, select: { sesionVersion: true } });
  if (!u || u.sesionVersion !== payload.sv) return null;
  return payload;
});

// Cada proyecto pertenece a una cuenta, y cada cuenta a los usuarios que la
// crearon — así los proyectos de personas distintas nunca se mezclan.
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
