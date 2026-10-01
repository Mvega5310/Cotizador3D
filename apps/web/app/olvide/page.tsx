"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacionAction, type AuthInfo } from "@/lib/actions/auth";

const inicial: AuthInfo = {};

export default function OlvidePage() {
  const [estado, accion, pendiente] = useActionState(solicitarRecuperacionAction, inicial);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
          <p className="text-sm text-neutral-500 mt-1">Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.</p>
        </div>
        {estado.mensaje ? (
          <p className="text-sm text-green-700">{estado.mensaje}</p>
        ) : (
          <form action={accion} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">Correo</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                className="w-full border border-neutral-300 rounded px-3 py-2" />
            </div>
            {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
            <button type="submit" disabled={pendiente}
              className="w-full bg-neutral-900 text-white rounded px-3 py-2.5 font-medium disabled:opacity-60">
              {pendiente ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}
        <p className="text-sm text-neutral-600">
          <Link href="/login" className="underline">Volver a entrar</Link>
        </p>
      </div>
    </main>
  );
}
