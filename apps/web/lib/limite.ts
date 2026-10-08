import { headers } from "next/headers";

// Límite de intentos en memoria (ventana fija por clave). Sirve mientras la
// app corra en una sola instancia; con varias réplicas habría que moverlo a
// Postgres o Redis.
// Cada entrada guarda su ventana: la purga usa la de cada una, no la de quien
// llama (AUDITORIA.md, S-11).
const intentos = new Map<string, { n: number; desde: number; ventana: number }>();

// IP del cliente: X-Real-IP, que el proxy de Railway sobrescribe siempre.
// Comprobado en producción (AUDITORIA.md, H-12): un X-Real-IP falso se
// reemplaza por la IP real. X-Forwarded-For no sirve de respaldo: Railway deja
// en el último valor la IP de su propio proxy (152.233.23.x), que metería a
// todos los usuarios en un mismo cupo. Sin X-Real-IP, null: no se aplica el
// límite por IP (se mantienen los límites por correo).
export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || null;
}

function vigente(clave: string, ventanaMs: number) {
  const r = intentos.get(clave);
  return r && Date.now() - r.desde <= ventanaMs ? r : null;
}

function contar(clave: string, ventanaMs: number) {
  const ahora = Date.now();
  if (intentos.size > 10_000) for (const [k, r] of intentos) if (ahora - r.desde > r.ventana) intentos.delete(k);
  const r = vigente(clave, ventanaMs);
  if (r) r.n += 1;
  else intentos.set(clave, { n: 1, desde: ahora, ventana: ventanaMs });
}

// true si la acción se permite; cuenta el intento.
export function permitir(clave: string, max: number, ventanaMs: number): boolean {
  contar(clave, ventanaMs);
  return (vigente(clave, ventanaMs)?.n ?? 0) <= max;
}

const MIN = 60_000;
export const DEMASIADOS = "Demasiados intentos. Espera unos minutos y vuelve a intentar.";

type Accion = "login" | "registro" | "recuperar" | "reenviar";
const REGLAS: Record<Accion, { ip: readonly [number, number]; email: readonly [number, number] | null }> = {
  login: { ip: [20, 15 * MIN], email: [10, 15 * MIN] },
  registro: { ip: [5, 60 * MIN], email: null },
  recuperar: { ip: [10, 60 * MIN], email: [3, 60 * MIN] },
  reenviar: { ip: [10, 60 * MIN], email: [5, 60 * MIN] },
};

// Claves que aplican a una acción: por IP (si se conoce: sin IP no se aplica,
// en vez de meter a todos en un solo cupo compartido) y, donde aplica, por
// correo (para que no se prueben contraseñas de una cuenta desde muchas IP,
// ni se le llene el buzón a alguien con correos de recuperación).
async function claves(accion: Accion, email?: string) {
  const ip = await ipCliente();
  const r = REGLAS[accion];
  const lista: { clave: string; max: number; ventana: number }[] = [];
  if (ip) lista.push({ clave: `${accion}:ip:${ip}`, max: r.ip[0], ventana: r.ip[1] });
  if (r.email && email) lista.push({ clave: `${accion}:email:${email}`, max: r.email[0], ventana: r.email[1] });
  return lista;
}

// Cuenta el intento y dice si se permite (registro, recuperar, reenviar:
// cada intento cuesta, salga como salga).
export async function permitirAccion(accion: Exclude<Accion, "login">, email?: string): Promise<boolean> {
  let ok = true;
  for (const c of await claves(accion, email)) ok = permitir(c.clave, c.max, c.ventana) && ok;
  return ok;
}

// Login: solo cuentan los intentos fallidos. Si contaran todos, cualquiera
// que escribiera 10 veces el correo de otra persona la dejaría sin entrar.
export async function loginBloqueado(email: string): Promise<boolean> {
  return (await claves("login", email)).some((c) => (vigente(c.clave, c.ventana)?.n ?? 0) >= c.max);
}

export async function registrarFalloLogin(email: string) {
  for (const c of await claves("login", email)) contar(c.clave, c.ventana);
}
