import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

// Para enlaces de un solo uso (verificar correo, recuperar contraseña) — ver
// lib/actions/auth.ts y el modelo TokenAuth en prisma/schema.prisma.
export const nuevoTokenAuth = () => randomBytes(24).toString("hex");

// En producción no hay valor por defecto: con un secreto conocido cualquiera
// podría firmar una sesión válida para cualquier cuenta.
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("Falta AUTH_SECRET en producción.");
}
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-before-deploying"
);

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// sv: versión de sesión del usuario (Usuario.sesionVersion) al iniciarla.
export type SessionPayload = { userId: string; email: string; sv: number };

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
    // Los tokens emitidos antes de existir `sv` cuentan como versión 0: siguen
    // válidos hasta el primer restablecimiento de contraseña.
    return { userId: payload.userId, email: payload.email, sv: typeof payload.sv === "number" ? payload.sv : 0 };
  } catch {
    return null;
  }
}
