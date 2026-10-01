"use client";

import { useEffect, useState } from "react";

export default function EnlaceCopiable({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);
  // Arranca igual que el servidor (ruta relativa) para no desajustar la
  // hidratación; una vez montado en el navegador, completa con el origen.
  const [url, setUrl] = useState(ruta);
  // Lectura única de window.location tras montar; no hay forma de saberlo en
  // el primer render sin desajustar la hidratación (SSR no conoce el origen).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${window.location.origin}${ruta}`);
  }, [ruta]);

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
