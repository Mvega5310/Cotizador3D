"use client";

import { useState, useTransition } from "react";
import { guardarConsumosAction } from "@/lib/actions/proyectos";
import type { Consumo } from "@/lib/proyectos";

// Reglas de consumo de cada material del proyecto (pintura por superficie,
// soldadura por kg, tornillos por tablero...). La IA las propone como
// supuestos; aquí el usuario las ajusta. Guardar recalcula el cuadro de
// cantidades (las líneas salen del motor, engine/interprete.js).

const BASES: [string, string][] = [
  ["superficie", "m² de superficie (pintura)"], ["ml", "metro de largo"], ["m2", "m² de área"],
  ["m3", "m³ de volumen"], ["kg", "kg de peso"], ["und", "cada pieza"],
];
const UNIDADES = ["und", "kg", "ml", "m2", "m3"];
const CAMPO = "border border-neutral-300 rounded px-1.5 py-1 text-sm";
const nuevo = (): Consumo => ({ nombre: "", unidad: "und", base: "superficie", factor: 0, entero: false });

type PiezaConsumos = { id: string; nombre: string; consumos: Consumo[] };

export default function EditorConsumos({ proyectoId, piezas }: { proyectoId: string; piezas: PiezaConsumos[] }) {
  const conReglas = piezas.filter((p) => p.consumos.length > 0).length;
  return (
    <section className="space-y-2">
      <div>
        <h2 className="font-medium">Consumos por material</h2>
        <p className="text-xs text-neutral-500">
          Lo que no se dibuja pero se gasta en proporción: pintura, soldadura, tornillería, acero de refuerzo… {conReglas > 0 ? "Revisa los rendimientos que propuso la IA." : "Agrega los que necesites."}
        </p>
      </div>
      <div className="border border-neutral-200 rounded divide-y divide-neutral-200">
        {piezas.map((p) => <Material key={p.id} proyectoId={proyectoId} pieza={p} />)}
      </div>
    </section>
  );
}

function Material({ proyectoId, pieza }: { proyectoId: string; pieza: PiezaConsumos }) {
  const [abierto, setAbierto] = useState(false);
  const [reglas, setReglas] = useState<Consumo[]>(pieza.consumos);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (i: number, cambio: Partial<Consumo>) => setReglas(reglas.map((r, j) => (j === i ? { ...r, ...cambio } : r)));
  const guardar = () => iniciar(async () => {
    const r = await guardarConsumosAction(proyectoId, pieza.id, reglas);
    setMensaje(r.error ?? "Guardado. El cuadro de cantidades ya está recalculado.");
  });

  return (
    <div className="px-3 py-2 text-sm">
      <button type="button" onClick={() => setAbierto(!abierto)} className="w-full flex justify-between gap-2 text-left">
        <span>{pieza.nombre}</span>
        <span className="text-xs text-blue-700 shrink-0">{pieza.consumos.length ? `${pieza.consumos.length} consumo(s)` : "Agregar"} {abierto ? "▲" : "▼"}</span>
      </button>
      {abierto && (
        <div className="mt-2 space-y-2">
          {reglas.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5 border border-neutral-200 rounded p-2">
              <input value={r.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} placeholder="Anticorrosivo (galón)" className={`${CAMPO} flex-1 min-w-40`} />
              <input type="number" step="any" min="0" value={r.factor || ""} onChange={(e) => cambiar(i, { factor: Number(e.target.value) })} className={`${CAMPO} w-20 text-right`} aria-label="Cantidad" />
              <select value={r.unidad} onChange={(e) => cambiar(i, { unidad: e.target.value as Consumo["unidad"] })} className={CAMPO} aria-label="Unidad">
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <span className="text-neutral-500">por</span>
              <select value={r.base} onChange={(e) => cambiar(i, { base: e.target.value })} className={CAMPO} aria-label="Base">
                {BASES.map(([b, t]) => <option key={b} value={b}>{t}</option>)}
              </select>
              <label className="flex items-center gap-1 text-xs text-neutral-600">
                <input type="checkbox" checked={!!r.entero} onChange={(e) => cambiar(i, { entero: e.target.checked })} /> redondear a entero
              </label>
              <button type="button" onClick={() => setReglas(reglas.filter((_, j) => j !== i))} className="text-xs text-red-700 hover:underline ml-auto">Quitar</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setReglas([...reglas, nuevo()])} className="text-xs border border-neutral-300 rounded px-2 py-1 hover:bg-neutral-100">+ Agregar consumo</button>
            <button type="button" onClick={guardar} disabled={pendiente} className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 disabled:opacity-60">
              {pendiente ? "Guardando…" : "Guardar"}
            </button>
            {mensaje && <span className="text-xs text-neutral-600">{mensaje}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
