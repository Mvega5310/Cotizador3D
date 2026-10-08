import { cantidadTexto } from "@/lib/format";
import { confirmarPiezaAction } from "@/lib/actions/proyectos";
import EditorElementos from "@/components/EditorElementos";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; derivada?: boolean };
type Etapa = { nombre: string; lineas: Linea[]; totales: Record<string, number> };
type ElementoEditable = { id: string; nombre: string; geometria: Record<string, number[]>; confirmado: boolean; origen: string };

// Cuadro de cantidades por etapa. Una sola grilla que en el celular se ve como
// tarjetas (nombre, "N elemento(s)" y la cantidad a la derecha; prototipo
// móvil) y desde sm como tabla. No es una <table>: en el celular una tabla
// queda más ancha que la pantalla y sus últimas columnas se esconden.
//
// editable: en la página del proyecto (estado, "Confirmar" y "Ver y
// corregir"); sin él, solo lectura (link completo).
const COLS = "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_8rem_6.5rem_13rem]";
const COLS_LECTURA = "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_8rem_8rem]";

export default function CuadroCantidades({ etapas, editable }: {
  etapas: [string, Etapa][];
  editable?: { proyectoId: string; elementosPorLinea: Record<string, ElementoEditable[]> };
}) {
  const cols = editable ? COLS : COLS_LECTURA;
  return (
    <div className="space-y-4">
      {etapas.map(([n, e]) => (
        <div key={n} className="rounded-xl border border-marca-100 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 bg-marca-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-marca-800">Etapa {n} · {e.nombre}</p>
            <p className="shrink-0 text-xs text-slate-500">{e.lineas.length} {e.lineas.length === 1 ? "línea" : "líneas"}</p>
          </div>

          <div className={`hidden sm:grid ${cols} gap-x-3 border-b border-marca-100 px-4 py-2 text-xs font-medium text-slate-500`}>
            <span>Pieza</span><span className="text-right">Cantidad</span><span className="text-right">Elementos</span>
            {editable && <span>Estado</span>}
          </div>

          {e.lineas.map((l) => (
            <div key={`${l.piezaId}|${l.unidad}`} className={`grid ${cols} items-center gap-x-3 gap-y-1.5 border-b border-marca-100 px-4 py-3 last:border-b-0`}>
              <div className="min-w-0">
                <p className="text-sm text-marca-900">{l.nombre}</p>
                <p className="text-xs text-slate-400 sm:hidden">{l.n} elemento(s)</p>
              </div>
              <p className="text-right font-mono text-[0.95rem] font-semibold whitespace-nowrap text-marca-900">{cantidadTexto(l.cantidad, l.unidad)}</p>
              <p className="hidden sm:block text-right text-sm text-slate-500">{l.n}</p>

              {editable && (
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-sm">
                  {l.derivada ? (
                    <span className={l.confirmado ? "text-emerald-700" : "text-amber-700"}>{l.confirmado ? "Confirmado" : "Sigue a sus piezas"}</span>
                  ) : l.confirmado ? (
                    <span className="text-emerald-700">Confirmado</span>
                  ) : (
                    <form action={confirmarPiezaAction} className="flex items-center gap-2">
                      <input type="hidden" name="proyectoId" value={editable.proyectoId} />
                      <input type="hidden" name="piezaId" value={l.piezaId} />
                      <span className="text-amber-700">Referencia</span>
                      <button className="rounded-md border border-marca-200 bg-white px-2.5 py-1 text-xs font-semibold text-marca-800 hover:border-acento hover:text-acento">Confirmar</button>
                    </form>
                  )}
                </div>
              )}
              {editable && !l.derivada && (
                <EditorElementos proyectoId={editable.proyectoId} elementos={editable.elementosPorLinea[`${l.etapa}|${l.piezaId}|${l.unidad}`] ?? []} />
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-marca-50/60 px-4 py-2.5 text-sm font-semibold text-marca-900">
            <span>Total etapa</span>
            <span className="font-mono text-right">
              {Object.entries(e.totales).filter(([, v]) => v > 0).map(([u, v]) => cantidadTexto(v, u)).join(" · ")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
