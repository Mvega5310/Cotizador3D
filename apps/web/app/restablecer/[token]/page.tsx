"use client";

import { use, useActionState } from "react";
import { restablecerAction, type AuthState } from "@/lib/actions/auth";

const inicial: AuthState = {};

export default function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, accion, pendiente] = useActionState(restablecerAction, inicial);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold">Pon una contraseña nueva</h1>
        <form action={accion} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">Contraseña nueva</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password"
              className="w-full border border-neutral-300 rounded px-3 py-2" />
            <p className="text-xs text-neutral-500">Mínimo 8 caracteres.</p>
          </div>
          {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
          <button type="submit" disabled={pendiente}
            className="w-full bg-neutral-900 text-white rounded px-3 py-2.5 font-medium disabled:opacity-60">
            {pendiente ? "Guardando…" : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
