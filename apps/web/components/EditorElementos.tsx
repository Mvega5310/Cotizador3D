"use client";

import { useActionState, useState } from "react";
import { corregirElementosAction, type EstadoForm } from "@/lib/actions/proyectos";
import { IconoFlechaAbajo } from "@/components/iconos";

type Elemento = { id: string; nombre: string; geometria: Record<string, number[]>; confirmado: boolean; origen: string };

const ETIQUETA_CAMPO: Record<string, string> = {
  a: "Punto A", b: "Punto B", origen: "Origen", u: "Lado U", v: "Lado V",
  min: "Mínimo", max: "Máximo", pos: "Posición", tam: "Tamaño", cantos: "Cantos",
};
// Rótulo de cada casilla: coordenadas para los puntos, y los dos números de
// los cantos de un tablero.
const ROTULOS: Record<string, string[]> = { cantos: ["Largos", "Cortos"] };
const XYZ = ["X", "Y", "Z"];

const inicial: EstadoForm = {};

// Edita la geometría de uno o varios elementos a la vez. Es genérico a
// propósito: cualquier forma del motor guarda su geometría como
// { clave: [números] } — puntos [x,y,z] o, en un tablero, cantos [largos,
// cortos] —, así que no hace falta un formulario distinto por tipo (ver
// packages/engine/src/formas.js). Cada elemento es una tarjeta (prototipo
// móvil): en el celular no hay tabla que deslizar de lado.
export default function EditorElementos({ proyectoId, elementos }: { proyectoId: string; elementos: Elemento[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState(corregirElementosAction, inicial);

  return (
    <div className="col-span-full">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        className="inline-flex items-center gap-1 py-1 text-xs font-semibold text-acento hover:underline">
        {abierto ? "Ocultar" : "Ver y corregir"} {elementos.length} elemento(s)
        <IconoFlechaAbajo className={`h-3.5 w-3.5 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <form action={accion} className="mt-2 space-y-3 rounded-xl bg-marca-50/70 p-3 ring-1 ring-marca-100">
          <input type="hidden" name="proyectoId" value={proyectoId} />
          <p className="text-xs text-slate-500">Medidas en metros. Cada elemento es una tarjeta; los puntos se editan con sus tres coordenadas.</p>
          <div className="grid gap-3 sm:grid-cols-2 sm:max-h-[32rem] sm:overflow-y-auto sm:pr-1">
            {elementos.map((el) => (
              <div key={el.id} className="rounded-xl border border-marca-100 bg-white p-3.5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-marca-900">{el.nombre}</p>
                    <p className="truncate font-mono text-xs text-slate-400">{el.id}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${el.confirmado ? "text-emerald-700" : "text-amber-700"}`}>
                    {el.confirmado ? "Confirmado" : "Referencia"}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(el.geometria).map(([campo, valor]) => (
                    <div key={campo}>
                      <p className="mb-1 text-xs font-medium text-slate-600">{ETIQUETA_CAMPO[campo] ?? campo}</p>
                      <div className={`grid gap-2 ${valor.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {valor.map((x, i) => (
                          <label key={i} className="min-w-0">
                            <span className="block text-[0.7rem] text-slate-400">{(ROTULOS[campo] ?? XYZ)[i] ?? i + 1}</span>
                            <input
                              type="number" step="any" inputMode="decimal" defaultValue={x}
                              name={`geo.${el.id}.${campo}.${i}`}
                              className="campo !px-2.5 !py-2 font-mono text-sm"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {estado.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{estado.error}</p>}
          <button type="submit" disabled={pendiente} className="boton-primario w-full sm:w-auto">
            {pendiente ? "Guardando…" : "Guardar correcciones"}
          </button>
        </form>
      )}
    </div>
  );
}
