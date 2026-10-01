"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmarVerificacionAction, type AuthInfo } from "@/lib/actions/auth";

const inicial: AuthInfo = {};

export default function BotonConfirmarVerificacion({ token }: { token: string }) {
  const [estado, accion, pendiente] = useActionState(confirmarVerificacionAction, inicial);

  if (estado.mensaje) {
    return (
      <>
        <p className="text-sm text-green-700">{estado.mensaje}</p>
        <Link href="/dashboard" className="inline-block bg-neutral-900 text-white rounded px-5 py-2.5 font-medium">
          Ir a tus proyectos
        </Link>
      </>
    );
  }

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-neutral-600">Confirma que este correo es tuyo.</p>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      <button type="submit" disabled={pendiente} className="bg-neutral-900 text-white rounded px-5 py-2.5 font-medium disabled:opacity-60">
        {pendiente ? "Confirmando…" : "Confirmar mi correo"}
      </button>
    </form>
  );
}
