"use client";
// Las <img> de este archivo son capturas del visor en `data:` para imprimir el
// PDF: next/image no aporta nada ahí (no hay nada que optimizar ni cargar).
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Viewer, construirEscena } from "@cotizador3d/engine";
import type { EntradaMotor } from "@/lib/proyectos";
import { cantidadTexto } from "@/lib/format";
import Despiece, { type FilaDespiece, type LaminaMaterial } from "@/components/Despiece";
import TablaCotizacion from "@/components/TablaCotizacion";
import type { ResumenCotizacion } from "@/lib/cotizacion";
import { MARCA } from "@/lib/marca";

type Captura = { clave: string; etiqueta: string; url: string };
type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };
type Calculo = { porEtapa: Record<string, EtapaCalculo>; despiece: FilaDespiece[]; laminas: LaminaMaterial[]; cotizacion: ResumenCotizacion };

const ORDEN_VISTAS = ["iso", "norte", "sur", "lateral", "planta"];

// Renderiza el proyecto sin interfaz, recorre las vistas de cámara y captura
// cada una como imagen (el canvas ya tiene preserveDrawingBuffer, ver
// packages/engine/src/viewer.js). Con todas las capturas listas, arma el
// documento imprimible y marca `data-listo="1"` para que el generador de PDF
// (lib/actions/pdf.ts, con Playwright) sepa que ya puede imprimir la página.
export default function VisorImprimible({
  entrada, calculo, cliente, tipoObra, marcaAgua, conApu,
}: {
  // calculo null = modo cliente: solo las vistas, sin cantidades ni precios.
  entrada: EntradaMotor; calculo: Calculo | null; cliente: string; tipoObra: string;
  marcaAgua: boolean; conApu: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [capturas, setCapturas] = useState<Captura[] | null>(null);
  const [pintado, setPintado] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    let cancelado = false;
    const esc = construirEscena(entrada);

    (async () => {
      if (!esc.bbox) { if (!cancelado) setCapturas([]); return; }
      const b = esc.bbox;
      const viewer = new Viewer(canvasRef.current!, stageRef.current!, {
        layers: esc.layers, views: esc.views, defaultView: "iso",
        sunTarget: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0],
      });
      viewer.paused = true;
      const out: Captura[] = [];
      for (const clave of ORDEN_VISTAS) {
        const vw = esc.views[clave];
        if (!vw) continue;
        viewer.setView(clave, true);
        viewer.resize();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        viewer.renderNow();
        out.push({ clave, etiqueta: vw.label, url: canvasRef.current!.toDataURL("image/jpeg", 0.92) });
      }
      if (!cancelado) setCapturas(out);
      viewer.dispose();
    })();

    return () => { cancelado = true; };
  }, [entrada]);

  useEffect(() => {
    if (capturas === null) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPintado(true)));
    return () => cancelAnimationFrame(raf);
  }, [capturas]);

  return (
    <div data-listo={pintado ? "1" : undefined}>
      {capturas === null && (
        <div ref={stageRef} style={{ position: "fixed", top: -99999, left: -99999, width: 1400, height: 900 }}>
          <canvas ref={canvasRef} width={1400} height={900} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      {capturas !== null && (
        <Documento capturas={capturas} calculo={calculo} cliente={cliente} tipoObra={tipoObra} marcaAgua={marcaAgua} conApu={conApu} />
      )}
    </div>
  );
}

function Documento({
  capturas, calculo, cliente, tipoObra, marcaAgua, conApu,
}: { capturas: Captura[]; calculo: Calculo | null; cliente: string; tipoObra: string; marcaAgua: boolean; conApu: boolean }) {
  const [hero, ...resto] = capturas;
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="bg-white text-neutral-900 max-w-[1200px] mx-auto p-10 space-y-8 relative">
      {marcaAgua && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
          <span className="text-8xl font-bold text-neutral-300/40 -rotate-45 whitespace-nowrap select-none">{MARCA.toUpperCase()} · PRUEBA</span>
        </div>
      )}

      <header className="border-b border-neutral-300 pb-4">
        <p className="text-xs font-mono uppercase tracking-widest text-orange-600">{MARCA}</p>
        <h1 className="text-3xl font-bold mt-1">{cliente}</h1>
        <p className="text-sm text-neutral-500">{tipoObra} · {fecha}</p>
      </header>

      {hero && (
        <section style={{ breakInside: "avoid" }}>
          <img src={hero.url} alt={hero.etiqueta} className="w-full rounded border border-neutral-200" />
          <p className="text-xs text-neutral-500 mt-1">{hero.etiqueta}</p>
        </section>
      )}

      {resto.length > 0 && (
        <section className="grid grid-cols-2 gap-4">
          {resto.map((c) => (
            <div key={c.clave} style={{ breakInside: "avoid" }}>
              <img src={c.url} alt={c.etiqueta} className="w-full rounded border border-neutral-200" />
              <p className="text-xs text-neutral-500 mt-1">{c.etiqueta}</p>
            </div>
          ))}
        </section>
      )}

      {calculo && (
        <section className="space-y-4">
          <h2 className="font-medium text-lg">Cuadro de cantidades</h2>
          {Object.entries(calculo.porEtapa).map(([n, e]) => (
            <div key={n} style={{ breakInside: "avoid" }}>
              <h3 className="font-medium text-sm mb-1">Etapa {n} · {e.nombre}</h3>
              <table className="w-full text-sm border border-neutral-200">
                <thead className="bg-neutral-100 text-left">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Pieza</th>
                    <th className="px-3 py-1.5 font-medium text-right">Cantidad</th>
                    <th className="px-3 py-1.5 font-medium text-right">Elementos</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lineas.map((l) => (
                    <tr key={`${l.piezaId}|${l.unidad}`} className="border-t border-neutral-200">
                      <td className="px-3 py-1">{l.nombre}</td>
                      <td className="px-3 py-1 text-right whitespace-nowrap">{cantidadTexto(l.cantidad, l.unidad)}</td>
                      <td className="px-3 py-1 text-right">{l.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {calculo && <TablaCotizacion cotizacion={calculo.cotizacion} conApu={conApu} />}

      {calculo && <Despiece despiece={calculo.despiece} laminas={calculo.laminas} />}

      <footer className="text-xs text-neutral-400 border-t border-neutral-200 pt-4">
        Este modelo y sus cantidades son de referencia para visualizar y cotizar. No reemplazan el diseño
        ni el cálculo estructural de un profesional.
      </footer>
    </div>
  );
}
