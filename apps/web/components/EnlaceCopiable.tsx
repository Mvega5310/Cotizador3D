"use client";

import { useState } from "react";

export default function EnlaceCopiable({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ruta;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // navigator.clipboard puede no estar disponible (http sin TLS, permisos);
      // el enlace sigue visible y se puede seleccionar a mano.
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <a href={ruta} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline truncate">{url}</a>
      <button type="button" onClick={copiar} className="text-xs border border-neutral-300 rounded px-2 py-0.5 hover:bg-neutral-100 shrink-0">
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
