"use client";

import { useActionState } from "react";
import { guardarSeccionAction, type EstadoForm } from "@/lib/actions/proyectos";

// Perfiles cuya sección no venía en el plano y se dibujaron con una
// provisional de 50 × 50 mm (lib/proyectos.ts::depurarEntradaIA). Hasta que se
// confirme, el dibujo y la superficie a pintar de esos perfiles son de
// referencia (el peso no: sale del factor kg/m × metros).
export default function SeccionesPorConfirmar({ proyectoId, piezas }: { proyectoId: string; piezas: { id: string; nombre: string }[] }) {
  if (piezas.length === 0) return null;
  return (
    <section className="border border-amber-300 bg-amber-50 rounded p-3 space-y-2 text-sm">
      <h2 className="font-medium text-amber-900">Secciones por confirmar</h2>
      <p className="text-amber-800">
        El plano no indica la sección de estos perfiles: se dibujaron con 50 × 50 mm. Escribe la real (ancho × alto, en mm) para que el dibujo 3D y la superficie a pintar salgan bien. El peso no cambia: sale del factor kg/m del material.
      </p>
      {piezas.map((p) => <Fila key={p.id} proyectoId={proyectoId} pieza={p} />)}
    </section>
  );
}

const inicial: EstadoForm = {};

function Fila({ proyectoId, pieza }: { proyectoId: string; pieza: { id: string; nombre: string } }) {
  const [estado, accion, pendiente] = useActionState(guardarSeccionAction, inicial);
  return (
    <form action={accion} className="flex flex-wrap items-center gap-2 bg-white border border-amber-200 rounded p-2">
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <input type="hidden" name="piezaId" value={pieza.id} />
      <span className="flex-1 min-w-40">{pieza.nombre}</span>
      <input name="ancho" type="number" min="3" step="any" required placeholder="ancho" aria-label={`Ancho de ${pieza.nombre} en mm`}
        className="w-20 border border-neutral-300 rounded px-2 py-1 text-right" />
      <span className="text-neutral-500">×</span>
      <input name="alto" type="number" min="3" step="any" required placeholder="alto" aria-label={`Alto de ${pieza.nombre} en mm`}
        className="w-20 border border-neutral-300 rounded px-2 py-1 text-right" />
      <span className="text-neutral-500">mm</span>
      <button disabled={pendiente} className="text-xs bg-neutral-900 text-white rounded px-3 py-1.5 disabled:opacity-60">{pendiente ? "Guardando…" : "Guardar"}</button>
      {estado.error && <span className="w-full text-xs text-red-600">{estado.error}</span>}
    </form>
  );
}
