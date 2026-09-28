import Link from "next/link";
import { obtenerProyecto } from "@/lib/proyectos";
import { confirmarPiezaAction } from "@/lib/actions/proyectos";
import { cantidadTexto } from "@/lib/format";
import VisorProyecto from "@/components/VisorProyecto";
import CotizadorProyecto from "@/components/CotizadorProyecto";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; origenes: string[] };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { proyecto, version, entrada, calculo } = await obtenerProyecto(id);
  const etapas = Object.entries(calculo.porEtapa as Record<string, EtapaCalculo>);
  const sinConfirmar = calculo.lineas.filter((l: Linea) => !l.confirmado).length;

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Tus proyectos</Link>
        <h1 className="text-2xl font-semibold mt-1">{proyecto.cliente}</h1>
        <p className="text-sm text-neutral-500">
          {proyecto.tipoObra} · versión {version.numero} · {entrada.elementos.length} elementos
        </p>
      </div>

      {entrada.elementos.length === 0 ? (
        <p className="border border-neutral-200 rounded p-6 text-neutral-600">
          Este proyecto se creó con una versión anterior de la plataforma y no tiene elementos. Crea uno nuevo desde el panel.
        </p>
      ) : (
        <>
          <VisorProyecto entrada={entrada} />

          {calculo.errores.length > 0 && (
            <section className="border border-red-300 bg-red-50 rounded p-4 space-y-2">
              <h2 className="font-medium text-red-800">{calculo.errores.length} elemento(s) sin interpretar</h2>
              <ul className="text-sm text-red-700 list-disc pl-5">
                {calculo.errores.slice(0, 10).map((e: { elementoId: string; mensaje: string }) => (
                  <li key={e.elementoId}>{e.elementoId}: {e.mensaje}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">Cuadro de cantidades</h2>
              {sinConfirmar > 0 && (
                <p className="text-sm text-amber-700">{sinConfirmar} pieza(s) son referencia sin confirmar. Confírmalas para que salgan como dato firme en el PDF.</p>
              )}
            </div>

            {etapas.map(([n, e]) => (
              <div key={n} className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-100 px-3 py-2 text-sm font-medium">Etapa {n} · {e.nombre}</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Pieza</th>
                      <th className="px-3 py-1.5 font-medium text-right">Cantidad</th>
                      <th className="px-3 py-1.5 font-medium text-right">Elementos</th>
                      <th className="px-3 py-1.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.lineas.map((l) => (
                      <tr key={`${l.piezaId}|${l.unidad}`} className="border-t border-neutral-200">
                        <td className="px-3 py-1.5">{l.nombre}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">{cantidadTexto(l.cantidad, l.unidad)}</td>
                        <td className="px-3 py-1.5 text-right">{l.n}</td>
                        <td className="px-3 py-1.5">
                          {l.confirmado ? (
                            <span className="text-green-700">Confirmado</span>
                          ) : (
                            <form action={confirmarPiezaAction} className="flex items-center gap-2">
                              <input type="hidden" name="proyectoId" value={proyecto.id} />
                              <input type="hidden" name="piezaId" value={l.piezaId} />
                              <span className="text-amber-700">Referencia</span>
                              <button className="text-xs border border-neutral-300 rounded px-2 py-0.5 hover:bg-neutral-100">Confirmar</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-neutral-300 bg-neutral-50 font-medium">
                      <td className="px-3 py-1.5">Total etapa</td>
                      <td className="px-3 py-1.5 text-right" colSpan={3}>
                        {Object.entries(e.totales).filter(([, v]) => v > 0).map(([u, v]) => cantidadTexto(v, u)).join(" · ")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </section>

          <CotizadorProyecto calculo={{ lineas: calculo.lineas, porEtapa: calculo.porEtapa }} />
        </>
      )}
    </main>
  );
}
