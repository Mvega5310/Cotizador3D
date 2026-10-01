"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, createSessionToken, nuevoTokenAuth } from "@/lib/auth";
import { requireSession, COOKIE_NAME } from "@/lib/session";
import { enviarCorreo, correoVerificacion, correoRecuperacion } from "@/lib/email";

export type AuthState = { error?: string };
export type AuthInfo = { error?: string; mensaje?: string };

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

async function origen() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${h.get("host")}`;
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

  // La cuenta queda usable de inmediato (no bloqueamos por correo sin
  // verificar); el correo de verificación es best-effort — si falla el
  // envío, el usuario igual puede pedir que se lo reenvíen después.
  try {
    const token = nuevoTokenAuth();
    await prisma.tokenAuth.create({
      data: { usuarioId: usuario.id, tipo: "verificacion", token, expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await enviarCorreo({
      to: usuario.email,
      subject: "Confirma tu correo — Cotizador 3D",
      html: correoVerificacion(`${await origen()}/verificar/${token}`),
    });
  } catch (e) {
    console.error("[auth] no se pudo enviar el correo de verificación:", e instanceof Error ? e.message : e);
  }

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

// ---------- Verificación de correo ----------

export async function reenviarVerificacionAction(_prev: AuthInfo, _formData: FormData): Promise<AuthInfo> {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });
  if (usuario.emailVerificado) return { mensaje: "Tu correo ya está verificado." };

  const reciente = await prisma.tokenAuth.findFirst({
    where: { usuarioId: usuario.id, tipo: "verificacion", creadoEn: { gt: new Date(Date.now() - 60 * 1000) } },
    orderBy: { creadoEn: "desc" },
  });
  if (reciente) return { error: "Ya te enviamos uno hace un momento — espera un minuto antes de pedir otro." };

  try {
    const token = nuevoTokenAuth();
    await prisma.tokenAuth.create({
      data: { usuarioId: usuario.id, tipo: "verificacion", token, expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await enviarCorreo({
      to: usuario.email,
      subject: "Confirma tu correo — Cotizador 3D",
      html: correoVerificacion(`${await origen()}/verificar/${token}`),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo enviar el correo." };
  }
  return { mensaje: "Te enviamos un correo de verificación." };
}

// Solo mira si el token serviría — no lo gasta. La página de verificación la
// usa para decidir qué mostrar sin consumir el enlace con una simple carga
// (algunos clientes de correo visitan los enlaces por adelantado al
// escanearlos). Consumirlo de verdad es confirmarVerificacionAction, detrás
// de un botón.
export async function tokenVerificacionValido(token: string): Promise<boolean> {
  const registro = await prisma.tokenAuth.findUnique({ where: { token } });
  return !!registro && registro.tipo === "verificacion" && !registro.usadoEn && registro.expiraEn > new Date();
}

// Consume el token (un solo uso): si es válido, marca el correo como
// verificado y el token como usado; si no, dice por qué.
export async function confirmarVerificacionAction(_prev: AuthInfo, formData: FormData): Promise<AuthInfo> {
  const token = String(formData.get("token") || "");
  const registro = await prisma.tokenAuth.findUnique({ where: { token } });
  if (!registro || registro.tipo !== "verificacion") return { error: "El enlace no es válido." };
  if (registro.usadoEn) return { error: "Este enlace ya se usó." };
  if (registro.expiraEn < new Date()) return { error: "El enlace venció. Pide uno nuevo desde tu panel." };

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: registro.usuarioId }, data: { emailVerificado: true } }),
    prisma.tokenAuth.update({ where: { id: registro.id }, data: { usadoEn: new Date() } }),
  ]);
  return { mensaje: "Tu correo quedó verificado." };
}

// ---------- Recuperar contraseña ----------

// Responde igual exista o no la cuenta — si no, cualquiera podría usar el
// formulario para averiguar qué correos están registrados.
export async function solicitarRecuperacionAction(_prev: AuthInfo, formData: FormData): Promise<AuthInfo> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Correo inválido." };

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (usuario) {
    try {
      const token = nuevoTokenAuth();
      await prisma.tokenAuth.create({
        data: { usuarioId: usuario.id, tipo: "recuperacion", token, expiraEn: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await enviarCorreo({
        to: usuario.email,
        subject: "Recupera tu contraseña — Cotizador 3D",
        html: correoRecuperacion(`${await origen()}/restablecer/${token}`),
      });
    } catch (e) {
      console.error("[auth] no se pudo enviar el correo de recuperación:", e instanceof Error ? e.message : e);
    }
  }
  return { mensaje: "Si ese correo tiene una cuenta, te enviamos un enlace para poner una contraseña nueva." };
}

export async function restablecerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const registro = await prisma.tokenAuth.findUnique({ where: { token } });
  if (!registro || registro.tipo !== "recuperacion") return { error: "El enlace no es válido." };
  if (registro.usadoEn) return { error: "Este enlace ya se usó. Pide uno nuevo." };
  if (registro.expiraEn < new Date()) return { error: "El enlace venció. Pide uno nuevo." };

  const passwordHash = await hashPassword(password);
  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.update({ where: { id: registro.usuarioId }, data: { passwordHash } });
    await tx.tokenAuth.update({ where: { id: registro.id }, data: { usadoEn: new Date() } });
    return u;
  });

  await setSessionCookie(usuario.id, usuario.email);
  redirect("/dashboard");
}
