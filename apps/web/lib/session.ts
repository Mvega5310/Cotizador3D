import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, type SessionPayload } from "./auth";

export const COOKIE_NAME = "cotizador_session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// Cada proyecto pertenece a una cuenta, y cada cuenta a los usuarios que la
// crearon — así los proyectos de personas distintas nunca se mezclan.
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
