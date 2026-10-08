"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Mientras la IA lee los planos en el servidor (lib/generacion.ts), vuelve a
// pedir la página cada pocos segundos; cuando el proyecto deja de estar en
// "procesando", el servidor ya entrega la página completa. El usuario puede
// cerrar la pestaña o bloquear el celular: el trabajo sigue en el servidor.
export default function EsperandoIA({ iniciado }: { iniciado: string }) {
  const router = useRouter();
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const refresco = setInterval(() => router.refresh(), 5000);
    return () => { clearInterval(reloj); clearInterval(refresco); };
  }, [router]);

  const segundos = ahora === null ? 0 : Math.max(0, Math.round((ahora - new Date(iniciado).getTime()) / 1000));
  const transcurrido = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <section className="tarjeta p-8 space-y-3 text-center">
      <div className="mx-auto h-10 w-10 rounded-full border-4 border-marca-100 border-t-acento animate-spin" aria-hidden />
      <h2 className="text-lg font-semibold text-marca-900">La IA está leyendo tus planos</h2>
      <p className="text-sm text-neutral-600">
        Suele tardar entre 1 y 4 minutos. Esta página se actualiza sola cuando termine.
      </p>
      <p className="text-sm text-neutral-500">
        Puedes cerrarla o bloquear el celular: el proyecto queda en tu panel.
      </p>
      {ahora !== null && <p className="text-xs font-mono text-neutral-400">{transcurrido}</p>}
    </section>
  );
}
