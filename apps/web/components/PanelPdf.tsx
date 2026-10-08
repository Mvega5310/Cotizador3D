"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { generarPdfAction } from "@/lib/actions/pdf";
import EnlaceCopiable from "@/components/EnlaceCopiable";

// Generar el PDF corre en segundo plano en el servidor (lib/actions/pdf.ts);
// mientras dice "generando", la página se vuelve a pedir cada pocos segundos.
export default function PanelPdf({ proyectoId, estado, error, url, seccionesProvisionales = 0 }: {
  proyectoId: string; estado: string | null; error: string | null; url: string | null;
  // Perfiles cuya sección no venía en el plano: se dibujan provisionales y el
  // cliente lo vería sin saberlo (AUDITORIA.md, H-07 d).
  seccionesProvisionales?: number;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"presupuesto" | "presentacion">("presupuesto");
  const generando = estado === "generando";

  useEffect(() => {
    if (!generando) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [generando, router]);

  return (
    <div className="space-y-3 pt-3 border-t border-neutral-100">
      {seccionesProvisionales > 0 && (
        <p className="text-sm border border-amber-300 bg-amber-50 text-amber-800 rounded p-2">
          {seccionesProvisionales === 1 ? "Un perfil tiene" : `${seccionesProvisionales} perfiles tienen`} la sección provisional
          (el plano no la indicaba): en el PDF y en los links se ve dibujada con 50 × 50 mm. Confírmala arriba, en
          &ldquo;Secciones por confirmar&rdquo;, antes de enviarlo.
        </p>
      )}
      <form action={generarPdfAction} className="space-y-2 text-sm">
        <input type="hidden" name="proyectoId" value={proyectoId} />
        <fieldset className="flex flex-wrap gap-x-5 gap-y-1">
          <legend className="sr-only">Tipo de PDF</legend>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="tipo" value="presupuesto" checked={tipo === "presupuesto"} onChange={() => setTipo("presupuesto")} />
            Presupuesto <span className="text-neutral-400">(vistas, cantidades y precios)</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="tipo" value="presentacion" checked={tipo === "presentacion"} onChange={() => setTipo("presentacion")} />
            Presentación <span className="text-neutral-400">(solo vistas)</span>
          </label>
        </fieldset>
        {tipo === "presupuesto" && (
          <label className="flex items-center gap-1.5 text-neutral-600">
            <input type="checkbox" name="apu" /> Incluir el anexo de APU (mano de obra, equipo, transporte)
          </label>
        )}
        <Boton generando={generando} yaExiste={!!url} />
      </form>

      {generando && <p className="text-sm text-neutral-600">Generando el PDF… suele tardar menos de un minuto. Esta sección se actualiza sola.</p>}
      {estado === "error" && error && <p className="text-sm text-red-600">{error}</p>}
      {url && !generando && (
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">PDF listo — enlace para abrirlo o enviarlo. Si lo vuelves a generar, este enlace deja de servir.</p>
          <EnlaceCopiable ruta={url} />
        </div>
      )}
    </div>
  );
}

function Boton({ generando, yaExiste }: { generando: boolean; yaExiste: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || generando} className="text-sm border border-neutral-300 rounded px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-60">
      {pending || generando ? "Generando…" : yaExiste ? "Generar de nuevo" : "Generar PDF"}
    </button>
  );
}
