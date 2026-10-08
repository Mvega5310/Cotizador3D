"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthState } from "@/lib/actions/auth";
import TarjetaCuenta from "@/components/TarjetaCuenta";

const initialState: AuthState = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <TarjetaCuenta titulo="Crear cuenta" subtitulo="Sube tus planos y presenta cada proyecto en 3D, con su cuadro de cantidades y su cotización.">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" type="text" required autoComplete="name" className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="campo" />
          <p className="mt-1.5 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>
        {state.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button type="submit" disabled={pending} className="boton-primario w-full">
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link href="/login" className="enlace">Entra aquí</Link>
      </p>
    </TarjetaCuenta>
  );
}
