import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

// Para enlaces de un solo uso (verificar correo, recuperar contraseña) — ver
// lib/actions/auth.ts y el modelo TokenAuth en prisma/schema.prisma.
export const nuevoTokenAuth = () => randomBytes(24).toString("hex");

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-before-deploying"
);

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = { userId: string; email: string };

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
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
