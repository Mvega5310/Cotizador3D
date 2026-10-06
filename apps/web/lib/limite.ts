import { headers } from "next/headers";

// Límite de intentos en memoria (ventana fija por clave). Sirve mientras la
// app corra en una sola instancia; con varias réplicas habría que moverlo a
// Postgres o Redis.
const intentos = new Map<string, { n: number; desde: number }>();

// IP del cliente: X-Real-IP la pone el proxy de Railway. De X-Forwarded-For
// se toma la última, la que agregó el proxy: la primera la puede escribir
// quien hace la petición.
export async function ipCliente(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",").pop()?.trim() || "desconocida";
}

// true si la acción se permite; cuenta el intento.
export function permitir(clave: string, max: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  if (intentos.size > 10_000) for (const [k, r] of intentos) if (ahora - r.desde > ventanaMs) intentos.delete(k);
  const r = intentos.get(clave);
  if (!r || ahora - r.desde > ventanaMs) {
    intentos.set(clave, { n: 1, desde: ahora });
    return true;
  }
  r.n += 1;
  return r.n <= max;
}

const MIN = 60_000;
export const DEMASIADOS = "Demasiados intentos. Espera unos minutos y vuelve a intentar.";

// Límites por acción: por IP y, donde aplica, por correo (para que no se
// pueda probar contraseñas de una cuenta desde muchas IP, ni llenarle el
// buzón a alguien con correos de recuperación).
export async function permitirAccion(accion: "login" | "registro" | "recuperar" | "reenviar", email?: string): Promise<boolean> {
  const ip = await ipCliente();
  const reglas = {
    login: { ip: [20, 15 * MIN], email: [10, 15 * MIN] },
    registro: { ip: [5, 60 * MIN], email: null },
    recuperar: { ip: [10, 60 * MIN], email: [3, 60 * MIN] },
    reenviar: { ip: [10, 60 * MIN], email: [5, 60 * MIN] },
  } as const;
  const r = reglas[accion];
  const porIp = permitir(`${accion}:ip:${ip}`, r.ip[0], r.ip[1]);
  const porEmail = !r.email || !email || permitir(`${accion}:email:${email}`, r.email[0], r.email[1]);
  return porIp && porEmail;
}
