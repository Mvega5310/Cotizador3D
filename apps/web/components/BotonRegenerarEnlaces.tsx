"use client";

import { useFormStatus } from "react-dom";
import { regenerarEnlacesAction } from "@/lib/actions/proyectos";

// Invalida los enlaces del proyecto y su PDF (AUDITORIA.md, S-13). Pide
// confirmación: quien tenga los enlaces viejos deja de poder verlos.
export default function BotonRegenerarEnlaces({ proyectoId }: { proyectoId: string }) {
  return (
    <form
      action={regenerarEnlacesAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          "Se invalidan los dos enlaces y el PDF de este proyecto, y se crean enlaces nuevos.\n\n" +
          "Quien tenga los enlaces o el PDF anteriores dejará de poder verlos. Después tendrás que compartir los nuevos y volver a generar el PDF."
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <Boton />
    </form>
  );
}

function Boton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-xs text-red-700 underline hover:text-red-800 disabled:opacity-60">
      {pending ? "Invalidando…" : "Invalidar enlaces y crear nuevos"}
    </button>
  );
}
