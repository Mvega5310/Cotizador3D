"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calcCotizacion } from "@cotizador3d/engine";
import { cantidadTexto, cop } from "@/lib/format";
import { guardarCotizacionAction } from "@/lib/actions/proyectos";
import type { Cotizacion } from "@/lib/cotizacion";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean };
type Calculo = { lineas: Linea[]; porEtapa: Record<string, { nombre: string; lineas: Linea[] }> };

const CAMPO = "w-full border border-neutral-300 rounded px-2 py-1 text-right";
const texto = (n: number) => (n > 0 ? String(n) : "");

// Precios y parámetros de la cotización. Arranca de lo guardado en el
// proyecto (incluidos los precios que la IA leyó de la descripción del
// usuario) y guarda solo, un momento después de cada cambio.
export default function CotizadorProyecto({ proyectoId, calculo, inicial }: { proyectoId: string; calculo: Calculo; inicial: Cotizacion }) {
  const [etapa, setEtapa] = useState("todo");
  const [precios, setPrecios] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(inicial.precios).map(([k, v]) => [k, String(v)]))
  );
  const [desperdicio, setDesperdicio] = useState(String(inicial.desperdicioPct));
  const [manoObra, setManoObra] = useState(texto(inicial.manoObraPct));
  const [manoObraValor, setManoObraValor] = useState(texto(inicial.manoObraValor));
  const [deDescripcion, setDeDescripcion] = useState<string[]>(inicial.deDescripcion);
  const [guardado, setGuardado] = useState<"listo" | "pendiente" | "guardando" | "error">("listo");

  const datos = useMemo(() => {
    const p: Record<string, number> = {};
    for (const [k, v] of Object.entries(precios)) if (Number(v) > 0) p[k] = Number(v);
    return {
      precios: p, desperdicioPct: Number(desperdicio) || 0, manoObraPct: Number(manoObra) || 0,
      manoObraValor: Number(manoObraValor) || 0, deDescripcion,
    };
  }, [precios, desperdicio, manoObra, manoObraValor, deDescripcion]);

  const cot = useMemo(() => calcCotizacion(calculo, { ...datos, etapa }), [calculo, datos, etapa]);

  // Guardado con pausa: no en cada tecla, sino 800 ms después del último cambio.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(async () => {
      setGuardado("guardando");
      try {
        await guardarCotizacionAction(proyectoId, datos);
        setGuardado("listo");
      } catch {
        setGuardado("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [proyectoId, datos]);

  const cambiarPrecio = (piezaId: string, valor: string) => {
    setGuardado("pendiente");
    setPrecios({ ...precios, [piezaId]: valor });
    if (deDescripcion.includes(piezaId)) setDeDescripcion(deDescripcion.filter((k) => k !== piezaId));
  };
  const cambiar = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { setGuardado("pendiente"); f(e.target.value); };

  const etapas = Object.entries(calculo.porEtapa);

  return (
    <div className="border border-neutral-200 rounded p-4 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-medium">Cotización</h2>
          <p className={`text-xs ${guardado === "error" ? "text-red-600" : "text-neutral-400"}`}>
            {guardado === "error" ? "No se pudo guardar; revisa tu conexión." : guardado === "listo" ? "Guardada en el proyecto" : "Guardando…"}
          </p>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="space-y-1">
          <span className="block text-neutral-500">Desperdicio %</span>
          <input type="number" min="0" value={desperdicio} onChange={cambiar(setDesperdicio)} className={CAMPO} />
        </label>
        <label className="space-y-1">
          <span className="block text-neutral-500">Mano de obra % sobre materiales</span>
          <input type="number" min="0" placeholder="0" value={manoObra} onChange={cambiar(setManoObra)} className={CAMPO} />
        </label>
        <label className="space-y-1">
          <span className="block text-neutral-500">Mano de obra, valor fijo $</span>
          <input type="number" min="0" placeholder="0" value={manoObraValor} onChange={cambiar(setManoObraValor)} className={CAMPO} />
        </label>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm min-w-[32rem]">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 font-medium">Pieza</th>
            <th className="py-1 font-medium text-right">Cantidad + desperdicio</th>
            <th className="py-1 font-medium text-right w-36 min-w-28">Precio por unidad</th>
            <th className="py-1 font-medium text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {cot.detalle.map((d: Linea & { cantidadConDesperdicio: number; subtotal: number }) => (
            <tr key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="border-t border-neutral-200">
              <td className="py-1.5 pr-2">
                {d.nombre}
                {deDescripcion.includes(d.piezaId) && (
                  <span className="block text-xs text-blue-700">Precio leído de tu descripción</span>
                )}
              </td>
              <td className="py-1.5 text-right whitespace-nowrap">{cantidadTexto(d.cantidadConDesperdicio, d.unidad)}</td>
              <td className="py-1.5 pl-2">
                <input type="number" min="0" placeholder="0" value={precios[d.piezaId] ?? ""}
                  onChange={(e) => cambiarPrecio(d.piezaId, e.target.value)} className={CAMPO} />
              </td>
              <td className="py-1.5 text-right whitespace-nowrap">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <div className="space-y-1 text-sm text-right">
        <p className="text-neutral-600">Materiales {cot.tienePrecio ? cop(cot.materiales) : "—"}</p>
        <p className="text-neutral-600">Mano de obra {cot.tienePrecio ? cop(cot.manoObra) : "—"}</p>
        <p className="text-2xl font-semibold">{cot.tienePrecio ? cop(cot.total) : "Ingresa tus precios"}</p>
        {cot.tienePrecio && <p className="text-xs text-neutral-400">El PDF toma estos precios al generarlo (todas las etapas).</p>}
      </div>
    </div>
  );
}
