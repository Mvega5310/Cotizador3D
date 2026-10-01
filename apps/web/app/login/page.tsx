"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
              <Link href="/olvide" className="text-xs text-neutral-500 hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
            <input id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-neutral-900 text-white rounded px-3 py-2.5 font-medium disabled:opacity-60">
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="text-sm text-neutral-600">
          ¿No tienes cuenta? <Link href="/register" className="underline">Regístrate</Link>
        </p>
      </div>
    </main>
  );
}
