import { Fragment } from "react";
import Link from "next/link";
import { obtenerEstadoProyecto, obtenerProyecto } from "@/lib/proyectos";
import { confirmarPiezaAction, reintentarGeneracionAction } from "@/lib/actions/proyectos";
import EsperandoIA from "@/components/EsperandoIA";
import { leerCotizacion } from "@/lib/cotizacion";
import { cantidadTexto } from "@/lib/format";
import VisorProyecto from "@/components/VisorProyecto";
import CotizadorProyecto from "@/components/CotizadorProyecto";
import PanelPdf from "@/components/PanelPdf";
import { pdfVencido } from "@/lib/pdf";
import EnlaceCopiable from "@/components/EnlaceCopiable";
import EditorElementos from "@/components/EditorElementos";
import Despiece from "@/components/Despiece";
import EditorConsumos from "@/components/EditorConsumos";
import SeccionesPorConfirmar from "@/components/SeccionesPorConfirmar";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; origenes: string[]; derivada?: boolean };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Mientras la IA trabaja (o si falló) el proyecto todavía no tiene versión.
  const estado = await obtenerEstadoProyecto(id);
  if (estado.estado === "procesando" || estado.estado === "error") {
    return (
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Tus proyectos</Link>
          <h1 className="text-2xl font-semibold mt-1">{estado.cliente}</h1>
          <p className="text-sm text-neutral-500">{estado.tipoObra}</p>
        </div>
        {estado.estado === "procesando" ? (
          <EsperandoIA iniciado={(estado.iniciadoIA ?? estado.creadoEn).toISOString()} />
        ) : (
          <section className="border border-red-300 bg-red-50 rounded p-4 space-y-3">
            <h2 className="font-medium text-red-800">No se pudo generar el proyecto</h2>
            <p className="text-sm text-red-700 whitespace-pre-line">{estado.errorIA ?? "Error desconocido."}</p>
            <p className="text-sm text-neutral-600">Puedes reintentar con los mismos planos y descripción. Este intento fallido no gastó cupo.</p>
            <form action={reintentarGeneracionAction}>
              <input type="hidden" name="proyectoId" value={estado.id} />
              <button className="bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium">Reintentar</button>
            </form>
          </section>
        )}
      </main>
    );
  }

  const { proyecto, version, entrada, calculo } = await obtenerProyecto(id);
  // Perfiles con sección provisional (el plano no la traía): se piden en el
  // recuadro y se avisan junto al PDF y los links (AUDITORIA.md, H-07 d).
  const provisionales = Object.values(entrada.catalogo)
    .filter((p) => (p.dimensiones as { provisional?: unknown }).provisional)
    .map((p) => ({ id: p.id, nombre: p.nombre }));
  const etapas = Object.entries(calculo.porEtapa as Record<string, EtapaCalculo>);
  const sinConfirmar = calculo.lineas.filter((l: Linea) => !l.confirmado && !l.derivada).length;

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
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Tus proyectos</Link>
        <h1 className="text-2xl font-semibold mt-1">{proyecto.cliente}</h1>
        <p className="text-sm text-neutral-500">
          {proyecto.tipoObra} · versión {version.numero} · {entrada.elementos.length} elementos
        </p>
      </div>

      {(proyecto.notasIA || proyecto.descartadosIA > 0) && (
        <section className="border border-orange-300 bg-orange-50 text-orange-800 rounded p-3 text-sm space-y-1">
          <h2 className="font-medium">Supuestos de la IA — confírmalos con el cliente o el plano</h2>
          {proyecto.notasIA && <p className="whitespace-pre-line">{proyecto.notasIA}</p>}
          {proyecto.descartadosIA > 0 && (
            <p>{proyecto.descartadosIA} elemento(s) propuestos no se pudieron interpretar y se descartaron.</p>
          )}
        </section>
      )}

      {proyecto.archivos.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Planos subidos</h2>
          <div className="flex flex-wrap gap-3">
            {proyecto.archivos.filter((a) => a.tipo !== "descripcion").map((a) => (
              <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noreferrer"
                className="block w-24 h-24 border border-neutral-200 rounded overflow-hidden hover:border-neutral-400">
                {a.tipo === "foto" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- archivo privado del usuario servido por /projects/[id]/archivos/, no una imagen pública optimizable
                  <img src={a.url ?? ""} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs text-neutral-500 bg-neutral-50">PDF</span>
                )}
              </a>
            ))}
          </div>
          {proyecto.archivos.find((a) => a.tipo === "descripcion") && (
            <p className="text-sm text-neutral-600 italic">
              &ldquo;{proyecto.archivos.find((a) => a.tipo === "descripcion")?.descripcion}&rdquo;
            </p>
          )}
        </section>
      )}

      {entrada.elementos.length === 0 ? (
        <p className="border border-neutral-200 rounded p-6 text-neutral-600">
          Este proyecto se creó con una versión anterior de la plataforma y no tiene elementos. Crea uno nuevo desde el panel.
        </p>
      ) : (
        <>
          <VisorProyecto entrada={entrada} />

          <SeccionesPorConfirmar proyectoId={proyecto.id} piezas={provisionales} />

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
              <div key={n} className="border border-neutral-200 rounded overflow-x-auto">
                <div className="bg-neutral-100 px-3 py-2 text-sm font-medium">Etapa {n} · {e.nombre}</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Pieza</th>
                      <th className="px-3 py-1.5 font-medium text-right">Cantidad</th>
                      <th className="px-3 py-1.5 font-medium text-right hidden sm:table-cell">Elementos</th>
                      <th className="px-3 py-1.5 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.lineas.map((l) => (
                      <Fragment key={`${l.piezaId}|${l.unidad}`}>
                        <tr className="border-t border-neutral-200">
                          <td className="px-3 py-1.5">{l.nombre}</td>
                          <td className="px-3 py-1.5 text-right whitespace-nowrap">{cantidadTexto(l.cantidad, l.unidad)}</td>
                          <td className="px-3 py-1.5 text-right hidden sm:table-cell">{l.n}</td>
                          <td className="px-3 py-1.5">
                            {l.derivada ? (
                              <span className={l.confirmado ? "text-green-700" : "text-amber-700"}>
                                {l.confirmado ? "Confirmado" : "Sigue a sus piezas"}
                              </span>
                            ) : l.confirmado ? (
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
                        {!l.derivada && (
                          <EditorElementos proyectoId={proyecto.id} elementos={elementosPorLinea.get(`${l.etapa}|${l.piezaId}|${l.unidad}`) ?? []} />
                        )}
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

          {calculo.avisos.length > 0 && (
            <ul className="border border-amber-300 bg-amber-50 text-amber-800 rounded p-3 text-sm list-disc pl-6 space-y-0.5">
              {calculo.avisos.map((a: string) => <li key={a}>{a}</li>)}
            </ul>
          )}

          <EditorConsumos
            proyectoId={proyecto.id}
            piezas={Object.values(entrada.catalogo).map((p) => ({ id: p.id, nombre: p.nombre, consumos: p.consumos ?? [] }))}
          />

          <Despiece despiece={calculo.despiece} laminas={calculo.laminas} conEstado />

          <CotizadorProyecto proyectoId={proyecto.id} calculo={{ lineas: calculo.lineas, porEtapa: calculo.porEtapa }} inicial={leerCotizacion(proyecto.cotizacion)} />

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
            {/* Un "generando" vencido (reinicio a mitad de camino) se muestra
                como error para que el botón se pueda volver a usar. */}
            <PanelPdf
              proyectoId={proyecto.id}
              estado={pdfVencido(version.resultado) ? "error" : version.resultado?.pdfEstado ?? null}
              error={pdfVencido(version.resultado) ? "La generación se interrumpió. Vuelve a intentarlo." : version.resultado?.pdfError ?? null}
              url={version.resultado?.pdfUrl ?? null}
              seccionesProvisionales={provisionales.length}
            />
          </section>
        </>
      )}
    </main>
  );
}
