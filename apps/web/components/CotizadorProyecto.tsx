"use client";

import { useMemo, useState } from "react";
import { calcCotizacion } from "@cotizador3d/engine";
import { cantidadTexto, cop } from "@/lib/format";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean };
type Calculo = { lineas: Linea[]; porEtapa: Record<string, { nombre: string; lineas: Linea[] }> };

const CAMPO = "w-full border border-neutral-300 rounded px-2 py-1 text-right";

export default function CotizadorProyecto({ calculo }: { calculo: Calculo }) {
  const [etapa, setEtapa] = useState("todo");
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [desperdicio, setDesperdicio] = useState("8");
  const [manoObra, setManoObra] = useState("0");

  const cot = useMemo(() => {
    const p: Record<string, number> = {};
    for (const [k, v] of Object.entries(precios)) if (Number(v) > 0) p[k] = Number(v);
    return calcCotizacion(calculo, { precios: p, desperdicioPct: Number(desperdicio) || 0, manoObraPct: Number(manoObra) || 0, etapa });
  }, [calculo, precios, desperdicio, manoObra, etapa]);

  const etapas = Object.entries(calculo.porEtapa);

  return (
    <div className="border border-neutral-200 rounded p-4 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-medium">Cotización</h2>
        {etapas.length > 1 && (
          <label className="text-sm flex items-center gap-2">
            Alcance
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className="border border-neutral-300 rounded px-2 py-1">
              <option value="todo">Todas las etapas</option>
              {etapas.map(([n, e]) => (
                <option key={n} value={n}>Etapa {n} · {e.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="block text-neutral-500">Desperdicio %</span>
          <input type="number" min="0" value={desperdicio} onChange={(e) => setDesperdicio(e.target.value)} className={CAMPO} />
        </label>
        <label className="space-y-1">
          <span className="block text-neutral-500">Mano de obra % sobre materiales</span>
          <input type="number" min="0" value={manoObra} onChange={(e) => setManoObra(e.target.value)} className={CAMPO} />
        </label>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 font-medium">Pieza</th>
            <th className="py-1 font-medium text-right">Cantidad + desperdicio</th>
            <th className="py-1 font-medium text-right w-36">Precio por unidad</th>
            <th className="py-1 font-medium text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {cot.detalle.map((d: Linea & { cantidadConDesperdicio: number; subtotal: number }) => (
            <tr key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="border-t border-neutral-200">
              <td className="py-1.5 pr-2">{d.nombre}</td>
              <td className="py-1.5 text-right whitespace-nowrap">{cantidadTexto(d.cantidadConDesperdicio, d.unidad)}</td>
              <td className="py-1.5 pl-2">
                <input type="number" min="0" placeholder="0" value={precios[d.piezaId] ?? ""}
                  onChange={(e) => setPrecios({ ...precios, [d.piezaId]: e.target.value })} className={CAMPO} />
              </td>
              <td className="py-1.5 text-right whitespace-nowrap">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-sm text-right">
        <p className="text-neutral-600">Materiales {cot.tienePrecio ? cop(cot.materiales) : "—"}</p>
        <p className="text-neutral-600">Mano de obra {cot.tienePrecio ? cop(cot.manoObra) : "—"}</p>
        <p className="text-2xl font-semibold">{cot.tienePrecio ? cop(cot.total) : "Ingresa tus precios"}</p>
      </div>
    </div>
  );
}
