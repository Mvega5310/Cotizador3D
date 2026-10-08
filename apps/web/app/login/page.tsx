"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import TarjetaCuenta from "@/components/TarjetaCuenta";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <TarjetaCuenta titulo="Entrar" subtitulo="Tus proyectos, modelos 3D y cotizaciones.">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="etiqueta" htmlFor="password">Contraseña</label>
            <Link href="/olvide" className="mb-1.5 text-xs enlace">¿Olvidaste tu contraseña?</Link>
          </div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="campo" />
        </div>
        {state.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button type="submit" disabled={pending} className="boton-primario w-full">
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        ¿No tienes cuenta? <Link href="/register" className="enlace">Regístrate</Link>
      </p>
    </TarjetaCuenta>
  );
}
