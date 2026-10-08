"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { calcPresupuesto } from "@cotizador3d/engine";
import { cantidadTexto, cop } from "@/lib/format";
import { guardarCotizacionAction } from "@/lib/actions/proyectos";
import { NOMBRE_REGIMEN, type ApuItem, type Cotizacion, type RegimenIva } from "@/lib/cotizacion";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean };
type Calculo = { lineas: Linea[]; porEtapa: Record<string, { nombre: string; lineas: Linea[] }> };
type Detalle = Linea & { desperdicioPct: number; material: number; valorUnitario: number; subtotal: number; conApu: boolean };

const CAMPO = "w-full min-w-0 border border-neutral-300 rounded px-2 py-1 text-right";
// Columnas de un ítem desde sm: nombre, cantidad, material, valor unitario, subtotal.
const COLS = "sm:grid-cols-[minmax(0,1fr)_6rem_8rem_7.5rem_7.5rem]";


// Campo numérico que deja escribir decimales a medias ("0,") sin perder lo
// tecleado: guarda el texto y reporta el número.
function Num({ valor, onCambio, placeholder = "0", className = CAMPO, label }: { valor: number | undefined; onCambio: (n: number | undefined) => void; placeholder?: string; className?: string; label?: string }) {
  const [texto, setTexto] = useState(valor !== undefined && valor !== 0 ? String(valor) : "");
  return (
    <input type="number" min="0" step="any" inputMode="decimal" placeholder={placeholder} aria-label={label} value={texto} className={className}
      onChange={(e) => { setTexto(e.target.value); onCambio(e.target.value === "" ? undefined : Number(e.target.value)); }} />
  );
}

// Presupuesto del proyecto: APU por ítem, AIU, IVA y retenciones
// (engine/pricing.js::calcPresupuesto). Arranca de lo guardado y guarda solo,
// un momento después de cada cambio.
export default function CotizadorProyecto({ proyectoId, calculo, inicial }: { proyectoId: string; calculo: Calculo; inicial: Cotizacion }) {
  const [etapa, setEtapa] = useState("todo");
  const [cot, setCot] = useState<Cotizacion>(inicial);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [guardado, setGuardado] = useState<"listo" | "pendiente" | "guardando" | "error">("listo");

  const r = useMemo(() => calcPresupuesto(calculo, { ...cot, etapa }), [calculo, cot, etapa]);

  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(async () => {
      setGuardado("guardando");
      try {
        await guardarCotizacionAction(proyectoId, cot);
        setGuardado("listo");
      } catch {
        setGuardado("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [proyectoId, cot]);

  const actualizar = (f: (c: Cotizacion) => Cotizacion) => { setGuardado("pendiente"); setCot(f); };
  const cambiarPrecio = (k: string, n: number | undefined) => actualizar((c) => {
    const precios = { ...c.precios };
    if (n && n > 0) precios[k] = n; else delete precios[k];
    return { ...c, precios, deDescripcion: c.deDescripcion.filter((x) => x !== k) };
  });
  const cambiarApu = (k: string, campo: keyof ApuItem, n: number | undefined) => actualizar((c) => {
    const item = { ...c.apu[k] };
    if (n === undefined) delete item[campo]; else item[campo] = n;
    return { ...c, apu: { ...c.apu, [k]: item } };
  });
  const alternar = (k: string) => setAbiertos((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const etapas = Object.entries(calculo.porEtapa);

  return (
    <div className="tarjeta p-5 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marca-900">Cotización (APU)</h2>
          <p className={`text-xs ${guardado === "error" ? "text-red-600" : "text-neutral-400"}`}>
            {guardado === "error" ? "No se pudo guardar; revisa tu conexión." : guardado === "listo" ? "Guardada en el proyecto" : "Guardando…"}
          </p>
        </div>
        {/* min-w-0 y max-w-full: la opción más larga ("Etapa 2 · Estructura
            metálica: columnas y arcos…") no debe ensanchar la página en el celular. */}
        {etapas.length > 1 && (
          <label className="text-sm flex items-center gap-2 min-w-0 w-full sm:w-auto sm:max-w-sm">
            <span className="shrink-0 text-slate-500">Alcance</span>
            <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className="campo !py-1.5 min-w-0 flex-1 text-ellipsis">
              <option value="todo">Todas las etapas</option>
              {etapas.map(([n, e]) => (
                <option key={n} value={n}>Etapa {n} · {e.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <label className="space-y-1 min-w-0">
          <span className="block text-neutral-500">Desperdicio general %</span>
          <Num valor={cot.desperdicioPct} onCambio={(n) => actualizar((c) => ({ ...c, desperdicioPct: n ?? 0 }))} />
          <span className="block text-xs text-neutral-400">No aplica a lo que se cuenta por unidad.</span>
        </label>
        <label className="space-y-1 min-w-0">
          <span className="block text-neutral-500">Mano de obra global, % sobre materiales</span>
          <Num valor={cot.manoObraPct} onCambio={(n) => actualizar((c) => ({ ...c, manoObraPct: n ?? 0 }))} />
        </label>
        <label className="space-y-1 min-w-0">
          <span className="block text-neutral-500">Mano de obra global, valor fijo $</span>
          <Num valor={cot.manoObraValor} onCambio={(n) => actualizar((c) => ({ ...c, manoObraValor: n ?? 0 }))} />
        </label>
      </div>

      {/* Ítems: tarjetas en el celular (un dato debajo de otro, con su
          rótulo) y filas de tabla desde sm. Es una sola lista con grid, no
          dos versiones: los campos tienen estado propio (Num) y no deben
          duplicarse. */}
      <div className="text-sm">
        <div className={`hidden sm:grid ${COLS} gap-x-3 pb-1 text-slate-500 font-medium`}>
          <span>Ítem</span><span className="text-right">Cantidad</span><span className="text-right">Material $/u</span>
          <span className="text-right">Valor unitario</span><span className="text-right">Subtotal</span>
        </div>
        {(r.detalle as Detalle[]).map((d) => {
          const k = d.piezaId;
          const abierto = abiertos.has(k);
          return (
            <div key={`${d.etapa}|${k}|${d.unidad}`} className={`grid grid-cols-[minmax(0,1fr)_auto] ${COLS} gap-x-3 gap-y-1.5 py-3 border-t border-marca-100 sm:items-start`}>
              <div className="order-1 sm:order-none min-w-0">
                <span className="font-semibold text-marca-900 sm:font-normal">{d.nombre}</span>
                {cot.deDescripcion.includes(k) && <span className="block text-xs text-acento">Precio leído de tu descripción</span>}
                <button type="button" onClick={() => alternar(k)} aria-expanded={abierto} className="hidden sm:block text-xs font-semibold text-acento hover:underline py-0.5">
                  {abierto ? "Ocultar APU" : d.conApu || cot.apu[k]?.desperdicioPct !== undefined ? "APU ✓" : "APU"} {abierto ? "▲" : "▼"}
                </button>
              </div>
              <p className="order-2 sm:order-5 text-right font-mono font-bold whitespace-nowrap text-marca-900 sm:pt-1 sm:font-semibold">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</p>
              <div className="order-3 col-span-2 flex items-center justify-between gap-3 text-xs sm:hidden">
                <span className="text-slate-500">{cantidadTexto(d.cantidad, d.unidad)} × {d.valorUnitario > 0 ? cop(d.valorUnitario) : "Por definir"}</span>
                <button type="button" onClick={() => alternar(k)} aria-expanded={abierto} className="shrink-0 font-semibold text-acento">
                  {abierto ? "Ocultar análisis ⌃" : d.conApu ? "Ver análisis ✓ ⌄" : "Ver análisis ⌄"}
                </button>
              </div>
              <p className="hidden sm:block sm:order-2 text-right whitespace-nowrap sm:pt-1">{cantidadTexto(d.cantidad, d.unidad)}</p>
              <label className="order-4 sm:order-3 col-span-2 sm:col-span-1 min-w-0">
                <span className="sm:hidden block text-xs text-slate-500">Material $/{d.unidad}</span>
                <Num valor={cot.precios[k]} onCambio={(n) => cambiarPrecio(k, n)} label={`Precio de ${d.nombre}`} />
              </label>
              <p className="hidden sm:block sm:order-4 text-right whitespace-nowrap sm:pt-1">{d.valorUnitario > 0 ? cop(d.valorUnitario) : "—"}</p>
              {abierto && (
                <div className="order-5 sm:order-6 col-span-full grid grid-cols-2 sm:grid-cols-4 gap-2 bg-marca-50/70 ring-1 ring-marca-100 rounded-xl p-3 text-xs">
                  <label className="min-w-0 space-y-0.5"><span className="block text-slate-500">Desperdicio % (ahora {d.desperdicioPct})</span>
                    <Num valor={cot.apu[k]?.desperdicioPct} placeholder="general" onCambio={(n) => cambiarApu(k, "desperdicioPct", n)} /></label>
                  <label className="min-w-0 space-y-0.5"><span className="block text-slate-500">Mano de obra $/{d.unidad}</span>
                    <Num valor={cot.apu[k]?.manoObra} onCambio={(n) => cambiarApu(k, "manoObra", n)} /></label>
                  <label className="min-w-0 space-y-0.5"><span className="block text-slate-500">Equipo y herram. $/{d.unidad}</span>
                    <Num valor={cot.apu[k]?.equipo} onCambio={(n) => cambiarApu(k, "equipo", n)} /></label>
                  <label className="min-w-0 space-y-0.5"><span className="block text-slate-500">Transporte $/{d.unidad}</span>
                    <Num valor={cot.apu[k]?.transporte} onCambio={(n) => cambiarApu(k, "transporte", n)} /></label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div className="space-y-3 min-w-0">
          <h3 className="font-semibold text-marca-900">AIU e impuestos</h3>
          <div className="grid grid-cols-3 gap-2 items-end">
            {([["a", "Administración %"], ["i", "Imprevistos %"], ["u", "Utilidad %"]] as const).map(([campo, texto]) => (
              <label key={campo} className="space-y-1 min-w-0">
                <span className="block text-neutral-500 text-xs">{texto}</span>
                <Num valor={cot.aiu[campo]} onCambio={(n) => actualizar((c) => ({ ...c, aiu: { ...c.aiu, [campo]: n ?? 0 } }))} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 items-end">
            <label className="col-span-2 space-y-1 min-w-0">
              <span className="block text-neutral-500 text-xs">Régimen de IVA</span>
              <select value={cot.iva.regimen} onChange={(e) => actualizar((c) => ({ ...c, iva: { ...c.iva, regimen: e.target.value as RegimenIva } }))}
                className="w-full min-w-0 max-w-full border border-neutral-300 rounded px-2 py-1 text-ellipsis">
                {(Object.keys(NOMBRE_REGIMEN) as RegimenIva[]).map((k) => <option key={k} value={k}>{NOMBRE_REGIMEN[k]}</option>)}
              </select>
            </label>
            <label className="space-y-1 min-w-0">
              <span className="block text-neutral-500 text-xs">Tarifa IVA %</span>
              <Num valor={cot.iva.tarifa} onCambio={(n) => actualizar((c) => ({ ...c, iva: { ...c.iva, tarifa: n ?? 0 } }))} />
            </label>
          </div>
          <div>
            <span className="block text-neutral-500 text-xs mb-1">Retenciones que te practica el cliente (referencia)</span>
            <div className="grid grid-cols-3 gap-2 items-end">
              <label className="space-y-1 min-w-0"><span className="block text-neutral-400 text-xs">Retefuente %</span>
                <Num valor={cot.retenciones.fuente} onCambio={(n) => actualizar((c) => ({ ...c, retenciones: { ...c.retenciones, fuente: n ?? 0 } }))} /></label>
              <label className="space-y-1 min-w-0"><span className="block text-neutral-400 text-xs">ReteIVA % del IVA</span>
                <Num valor={cot.retenciones.iva} onCambio={(n) => actualizar((c) => ({ ...c, retenciones: { ...c.retenciones, iva: n ?? 0 } }))} /></label>
              <label className="space-y-1 min-w-0"><span className="block text-neutral-400 text-xs">ReteICA por mil</span>
                <Num valor={cot.retenciones.ica} onCambio={(n) => actualizar((c) => ({ ...c, retenciones: { ...c.retenciones, ica: n ?? 0 } }))} /></label>
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            Las tarifas y bases dependen de tu régimen, del tipo de contrato y del municipio: confírmalas con tu contador.
          </p>
        </div>

        <dl className="space-y-1.5 self-end min-w-0 rounded-xl bg-marca-900 p-4 text-sm text-white/85">
          <Fila t="Materiales" v={r.materiales} />
          <Fila t="Mano de obra" v={r.manoObra} />
          {r.equipo > 0 && <Fila t="Equipo y herramienta" v={r.equipo} />}
          {r.transporte > 0 && <Fila t="Transporte" v={r.transporte} />}
          <Fila t="Costo directo" v={r.costoDirecto} fuerte />
          {cot.aiu.a > 0 && <Fila t={`Administración (${cot.aiu.a} %)`} v={r.administracion} />}
          {cot.aiu.i > 0 && <Fila t={`Imprevistos (${cot.aiu.i} %)`} v={r.imprevistos} />}
          {cot.aiu.u > 0 && <Fila t={`Utilidad (${cot.aiu.u} %)`} v={r.utilidad} />}
          {(cot.aiu.a > 0 || cot.aiu.i > 0 || cot.aiu.u > 0) && <Fila t="Subtotal" v={r.subtotal} fuerte />}
          {r.iva.regimen !== "ninguno" && <Fila t={`IVA ${r.iva.tarifa} % sobre ${r.iva.regimen === "utilidad" ? "la utilidad" : "el total"}`} v={r.iva.valor} />}
          <div className="flex justify-between items-baseline gap-3 pt-2.5 border-t border-white/15 text-white">
            <dt className="font-semibold">Total</dt>
            <dd className={r.tienePrecio ? "font-mono text-2xl font-bold" : "text-base font-semibold"}>{r.tienePrecio ? cop(r.total) : "Ingresa tus precios"}</dd>
          </div>
          {r.retenciones.total > 0 && (
            <>
              {r.retenciones.fuente > 0 && <Fila t="− Retefuente" v={r.retenciones.fuente} gris />}
              {r.retenciones.iva > 0 && <Fila t="− ReteIVA" v={r.retenciones.iva} gris />}
              {r.retenciones.ica > 0 && <Fila t="− ReteICA" v={r.retenciones.ica} gris />}
              <Fila t="Neto a recibir" v={r.neto} fuerte />
            </>
          )}
          {r.tienePrecio && <p className="pt-1 text-xs text-white/50 text-right">El PDF toma estos valores al generarlo (todas las etapas).</p>}
        </dl>
      </div>
    </div>
  );
}

function Fila({ t, v, fuerte, gris }: { t: string; v: number; fuerte?: boolean; gris?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${fuerte ? "font-semibold text-white" : ""} ${gris ? "text-white/55" : ""}`}>
      <dt>{t}</dt>
      <dd className="whitespace-nowrap font-mono">{cop(v)}</dd>
    </div>
  );
}
