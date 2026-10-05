"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer, construirEscena } from "@cotizador3d/engine";
import type { EntradaMotor } from "@/lib/proyectos";

const VISTAS = [
  ["iso", "Isométrica"], ["norte", "Frente"], ["sur", "Posterior"], ["lateral", "Lateral"], ["planta", "Planta"],
] as const;

export default function VisorProyecto({ entrada }: { entrada: EntradaMotor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<typeof Viewer> | null>(null);
  const [visibles, setVisibles] = useState<Record<number, boolean>>(() => Object.fromEntries(entrada.etapas.map((e) => [e.numero, true])));
  const visiblesRef = useRef(visibles);

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    const esc = construirEscena(entrada);
    if (!esc.bbox) return;
    const b = esc.bbox;
    const viewer = new Viewer(canvasRef.current, stageRef.current, {
      layers: esc.layers,
      views: esc.views,
      defaultView: "iso",
      sunTarget: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0],
    });
    for (const [n, on] of Object.entries(visiblesRef.current)) viewer.setLayer(`etapa-${n}`, on);
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [entrada]);

  function alternarEtapa(numero: number, on: boolean) {
    const nuevo = { ...visibles, [numero]: on };
    visiblesRef.current = nuevo;
    setVisibles(nuevo);
    viewerRef.current?.setLayer(`etapa-${numero}`, on);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-center">
        {VISTAS.map(([clave, texto]) => (
          <button key={clave} type="button" onClick={() => viewerRef.current?.setView(clave)}
            className="text-xs border border-neutral-300 rounded px-2.5 py-1 hover:bg-neutral-100">
            {texto}
          </button>
        ))}
        {entrada.etapas.length > 1 && (
          <>
            <span className="mx-2 border-l border-neutral-300 self-stretch" />
            {entrada.etapas.map((e) => (
              <label key={e.numero} className="text-xs flex items-center gap-1.5">
                <input type="checkbox" checked={visibles[e.numero] ?? true} onChange={(ev) => alternarEtapa(e.numero, ev.target.checked)} />
                {e.nombre}
              </label>
            ))}
          </>
        )}
      </div>
      <div ref={stageRef} className="w-full aspect-video bg-[#121821] rounded overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
