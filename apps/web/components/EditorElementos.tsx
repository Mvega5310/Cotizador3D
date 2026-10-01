"use client";

import { useActionState, useState } from "react";
import { corregirElementosAction, type EstadoForm } from "@/lib/actions/proyectos";

type Elemento = { id: string; nombre: string; geometria: Record<string, number[]>; confirmado: boolean; origen: string };

const ETIQUETA_CAMPO: Record<string, string> = {
  a: "Punto A", b: "Punto B", origen: "Origen", u: "Lado U", v: "Lado V",
  min: "Mínimo", max: "Máximo", pos: "Posición", tam: "Tamaño",
};

const inicial: EstadoForm = {};

// Edita las coordenadas [x,y,z] de uno o varios elementos a la vez. Es
// genérico a propósito: cualquier forma del motor (viga, panel, volumen,
// pieza) guarda su geometría como { clave: [x,y,z] }, así que no hace falta
// un formulario distinto por tipo — ver packages/engine/src/formas.js.
export default function EditorElementos({ proyectoId, elementos }: { proyectoId: string; elementos: Elemento[] }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState(corregirElementosAction, inicial);

  return (
    <tr className="border-t border-neutral-100">
      <td colSpan={4} className="px-3 py-1.5">
        <button type="button" onClick={() => setAbierto((v) => !v)} className="text-xs text-blue-700 hover:underline">
          {abierto ? "Ocultar" : "Ver y corregir"} {elementos.length} elemento(s)
        </button>
        {abierto && (
          <form action={accion} className="mt-2 space-y-2">
            <input type="hidden" name="proyectoId" value={proyectoId} />
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {elementos.map((el) => (
                <div key={el.id} className="border border-neutral-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{el.nombre} <span className="text-neutral-400">· {el.id}</span></span>
                    <span className={`text-xs ${el.confirmado ? "text-green-700" : "text-amber-700"}`}>
                      {el.confirmado ? "Confirmado" : "Referencia"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(el.geometria).map(([campo, valor]) => (
                      <div key={campo} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 text-neutral-500">{ETIQUETA_CAMPO[campo] ?? campo}</span>
                        {[0, 1, 2].map((i) => (
                          <input
                            key={i} type="number" step="any" defaultValue={valor[i]}
                            name={`geo.${el.id}.${campo}.${i}`}
                            className="w-20 border border-neutral-300 rounded px-1.5 py-0.5"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {estado.error && <p className="text-xs text-red-600">{estado.error}</p>}
            <button type="submit" disabled={pendiente} className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 disabled:opacity-60">
              {pendiente ? "Guardando…" : "Guardar correcciones"}
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
