// TEMPORAL (AUDITORIA.md, H-12): comprobar si el proxy de Railway sobrescribe
// X-Real-IP. Se borra en el commit siguiente, después de la prueba.
import { headers } from "next/headers";
import { ipCliente } from "@/lib/limite";

export async function GET() {
  const h = await headers();
  return Response.json({ ip: await ipCliente(), xri: h.get("x-real-ip"), xff: h.get("x-forwarded-for") });
}
