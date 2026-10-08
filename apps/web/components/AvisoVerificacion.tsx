"use client";

import { useActionState } from "react";
import { reenviarVerificacionAction, type AuthInfo } from "@/lib/actions/auth";

const inicial: AuthInfo = {};

export default function AvisoVerificacion() {
  const [estado, accion, pendiente] = useActionState(reenviarVerificacionAction, inicial);

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
      <span>No has confirmado tu correo. Revisa tu bandeja (y la carpeta de spam).</span>
      <form action={accion}>
        <button type="submit" disabled={pendiente} className="rounded-lg border border-amber-300 bg-white/70 px-3 py-1 text-xs font-semibold hover:bg-white disabled:opacity-60">
          {pendiente ? "Enviando…" : estado.mensaje ? "Enviado" : estado.error ? "Reintentar" : "Reenviar enlace"}
        </button>
      </form>
      {(estado.mensaje || estado.error) && (
        <span className="w-full text-xs">{estado.mensaje ?? estado.error}</span>
      )}
    </div>
  );
}
