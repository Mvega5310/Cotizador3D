"use client";

import { useFormStatus } from "react-dom";

export default function BotonPdf({ yaExiste }: { yaExiste: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-sm border border-neutral-300 rounded px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-60">
      {pending ? "Generando… (puede tardar unos segundos)" : yaExiste ? "Actualizar PDF" : "Generar PDF"}
    </button>
  );
}
