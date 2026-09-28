"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSessionToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/session";

export type AuthState = { error?: string };

async function setSessionCookie(userId: string, email: string) {
  const token = await createSessionToken({ userId, email });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!nombre) return { error: "Escribe tu nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Correo inválido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese correo." };

  const passwordHash = await hashPassword(password);
  // Cada usuario nuevo arranca con su propia cuenta (plan Prueba). El plan
  // Estudio (varias cuentas compartiendo una Cuenta) es un paso posterior,
  // no algo que se resuelva aquí.
  const cuenta = await prisma.cuenta.create({
    data: {
      nombre,
      plan: "prueba",
      cupoMes: 2,
      pruebaHasta: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  const usuario = await prisma.usuario.create({
    data: { nombre, email, passwordHash, cuentaId: cuenta.id },
  });

  await setSessionCookie(usuario.id, usuario.email);
  redirect("/dashboard");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !(await verifyPassword(password, usuario.passwordHash))) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await setSessionCookie(usuario.id, usuario.email);
  redirect("/dashboard");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/login");
}
