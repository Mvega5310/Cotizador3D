"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthState } from "@/lib/actions/auth";

const initialState: AuthState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" required autoComplete="name"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">Correo</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
            <p className="text-xs text-neutral-500">Mínimo 8 caracteres.</p>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-neutral-900 text-white rounded px-3 py-2.5 font-medium disabled:opacity-60">
            {pending ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
        <p className="text-sm text-neutral-600">
          ¿Ya tienes cuenta? <Link href="/login" className="underline">Entra aquí</Link>
        </p>
      </div>
    </main>
  );
}
