"use client";

import { useActionState } from "react";
import Link from "next/link";
import { solicitarRecuperacionAction, type AuthInfo } from "@/lib/actions/auth";
import TarjetaCuenta from "@/components/TarjetaCuenta";

const inicial: AuthInfo = {};

export default function OlvidePage() {
  const [estado, accion, pendiente] = useActionState(solicitarRecuperacionAction, inicial);

  return (
    <TarjetaCuenta titulo="Recuperar contraseña" subtitulo="Escribe tu correo y te mandamos un enlace para poner una contraseña nueva.">
      {estado.mensaje ? (
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{estado.mensaje}</p>
      ) : (
        <form action={accion} className="space-y-4">
          <div>
            <label htmlFor="email" className="etiqueta">Correo</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
          </div>
          {estado.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{estado.error}</p>}
          <button type="submit" disabled={pendiente} className="boton-primario w-full">
            {pendiente ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-slate-600">
        <Link href="/login" className="enlace">← Volver a entrar</Link>
      </p>
    </TarjetaCuenta>
  );
}
