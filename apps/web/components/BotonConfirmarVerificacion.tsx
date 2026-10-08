"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmarVerificacionAction, type AuthInfo } from "@/lib/actions/auth";

const inicial: AuthInfo = {};

export default function BotonConfirmarVerificacion({ token }: { token: string }) {
  const [estado, accion, pendiente] = useActionState(confirmarVerificacionAction, inicial);

  if (estado.mensaje) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{estado.mensaje}</p>
        <Link href="/dashboard" className="boton-primario w-full">Ir a tus proyectos</Link>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-slate-600">Confirma que este correo es tuyo.</p>
      {estado.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{estado.error}</p>}
      <button type="submit" disabled={pendiente} className="boton-primario w-full">
        {pendiente ? "Confirmando…" : "Confirmar mi correo"}
      </button>
    </form>
  );
}
