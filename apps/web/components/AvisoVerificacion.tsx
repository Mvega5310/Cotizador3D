"use client";

import { useActionState } from "react";
import { reenviarVerificacionAction, type AuthInfo } from "@/lib/actions/auth";

const inicial: AuthInfo = {};

export default function AvisoVerificacion() {
  const [estado, accion, pendiente] = useActionState(reenviarVerificacionAction, inicial);

  return (
    <div className="mb-6 border border-amber-300 bg-amber-50 text-amber-800 rounded p-3 text-sm flex flex-wrap items-center justify-between gap-2">
      <span>No has confirmado tu correo.</span>
      <form action={accion}>
        <button type="submit" disabled={pendiente} className="text-xs border border-amber-400 rounded px-2.5 py-1 hover:bg-amber-100 disabled:opacity-60">
          {pendiente ? "Enviando…" : estado.mensaje ? "Enviado" : estado.error ? "Reintentar" : "Reenviar enlace"}
        </button>
      </form>
      {(estado.mensaje || estado.error) && (
        <span className="w-full text-xs">{estado.mensaje ?? estado.error}</span>
      )}
    </div>
  );
}
