"use client";

import { use, useActionState } from "react";
import { restablecerAction, type AuthState } from "@/lib/actions/auth";
import TarjetaCuenta from "@/components/TarjetaCuenta";

const inicial: AuthState = {};

export default function RestablecerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, accion, pendiente] = useActionState(restablecerAction, inicial);

  return (
    <TarjetaCuenta titulo="Pon una contraseña nueva" subtitulo="Al guardarla se cierran las sesiones abiertas en otros dispositivos.">
      <form action={accion} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label htmlFor="password" className="etiqueta">Contraseña nueva</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="campo" />
          <p className="mt-1.5 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>
        {estado.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{estado.error}</p>}
        <button type="submit" disabled={pendiente} className="boton-primario w-full">
          {pendiente ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </TarjetaCuenta>
  );
}
