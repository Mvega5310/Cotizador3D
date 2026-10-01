import { Fragment } from "react";
import Link from "next/link";
import { obtenerProyecto } from "@/lib/proyectos";
import { confirmarPiezaAction } from "@/lib/actions/proyectos";
import { generarPdfAction } from "@/lib/actions/pdf";
import { cantidadTexto } from "@/lib/format";
import VisorProyecto from "@/components/VisorProyecto";
import CotizadorProyecto from "@/components/CotizadorProyecto";
import BotonPdf from "@/components/BotonPdf";
import EnlaceCopiable from "@/components/EnlaceCopiable";
import EditorElementos from "@/components/EditorElementos";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; origenes: string[] };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

export default async function ProyectoPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const { proyecto, version, entrada, calculo } = await obtenerProyecto(id);
  const etapas = Object.entries(calculo.porEtapa as Record<string, EtapaCalculo>);
  const sinConfirmar = calculo.lineas.filter((l: Linea) => !l.confirmado).length;

  // Agrupa los elementos igual que el motor agrupa las líneas del cuadro de
  // cantidades (etapa + pieza + unidad resuelta), para poder editarlos en el
  // bloque que corresponde a cada línea (ver EditorElementos.tsx).
  const elementosPorLinea = new Map<string, { id: string; nombre: string; geometria: Record<string, number[]>; confirmado: boolean; origen: string }[]>();
  for (const el of entrada.elementos) {
    const unidad = el.unidad ?? entrada.catalogo[el.pieza]?.unidad;
    const clave = `${el.etapa}|${el.pieza}|${unidad}`;
    const lista = elementosPorLinea.get(clave) ?? [];
    lista.push({ id: el.id, nombre: el.nombre, geometria: el.geometria as Record<string, number[]>, confirmado: el.confirmado, origen: el.origen });
    elementosPorLinea.set(clave, lista);
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Tus proyectos</Link>
        <h1 className="text-2xl font-semibold mt-1">{proyecto.cliente}</h1>
        <p className="text-sm text-neutral-500">
          {proyecto.tipoObra} · versión {version.numero} · {entrada.elementos.length} elementos
        </p>
      </div>

      {aviso && (
        <p className="border border-orange-300 bg-orange-50 text-orange-800 rounded p-3 text-sm">{aviso}</p>
      )}

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
                      <Fragment key={`${l.piezaId}|${l.unidad}`}>
                        <tr className="border-t border-neutral-200">
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
                        <EditorElementos proyectoId={proyecto.id} elementos={elementosPorLinea.get(`${l.etapa}|${l.piezaId}|${l.unidad}`) ?? []} />
                      </Fragment>
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

          <section className="border border-neutral-200 rounded p-4 space-y-4">
            <h2 className="font-medium">PDF y enlaces para presentar</h2>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">Completo — visor y cuadro de cantidades. Para ti.</p>
              <EnlaceCopiable ruta={`/p/${version.resultado?.linkCompleto}`} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">Solo vistas — sin cantidades. Para compartir con tu cliente.</p>
              <EnlaceCopiable ruta={`/p/${version.resultado?.linkCliente}`} />
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
              <form action={generarPdfAction}>
                <input type="hidden" name="proyectoId" value={proyecto.id} />
                <BotonPdf yaExiste={!!version.resultado?.pdfUrl} />
              </form>
              {version.resultado?.pdfUrl && (
                <a href={version.resultado.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline">Ver el último PDF generado</a>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
