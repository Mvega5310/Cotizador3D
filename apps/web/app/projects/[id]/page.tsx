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
import BotonRegenerarEnlaces from "@/components/BotonRegenerarEnlaces";
import { pdfVencido } from "@/lib/pdf";
import EnlaceCopiable from "@/components/EnlaceCopiable";
import EditorElementos from "@/components/EditorElementos";
import Despiece from "@/components/Despiece";
import EditorConsumos from "@/components/EditorConsumos";
import SeccionesPorConfirmar from "@/components/SeccionesPorConfirmar";
import MarcoApp from "@/components/MarcoApp";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number; confirmado: boolean; origenes: string[]; derivada?: boolean };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Mientras la IA trabaja (o si falló) el proyecto todavía no tiene versión.
  const estado = await obtenerEstadoProyecto(id);
  if (estado.estado === "procesando" || estado.estado === "error") {
    return (
      <MarcoApp>
      <div className="space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-marca-600 hover:text-acento">← Tus proyectos</Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-marca-900">{estado.cliente}</h1>
          <p className="text-sm text-slate-500">{estado.tipoObra}</p>
        </div>
        {estado.estado === "procesando" ? (
          <EsperandoIA iniciado={(estado.iniciadoIA ?? estado.creadoEn).toISOString()} />
        ) : (
          <section className="rounded-2xl border border-red-200 bg-red-50/95 p-5 space-y-3">
            <h2 className="font-medium text-red-800">No se pudo generar el proyecto</h2>
            <p className="text-sm text-red-700 whitespace-pre-line">{estado.errorIA ?? "Error desconocido."}</p>
            <p className="text-sm text-neutral-600">Puedes reintentar con los mismos planos y descripción. Este intento fallido no gastó cupo.</p>
            <form action={reintentarGeneracionAction}>
              <input type="hidden" name="proyectoId" value={estado.id} />
              <button className="boton-primario">Reintentar</button>
            </form>
          </section>
        )}
      </div>
      </MarcoApp>
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
    <MarcoApp>
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-marca-600 hover:text-acento">← Tus proyectos</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-marca-900">{proyecto.cliente}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {proyecto.tipoObra} · versión {version.numero} · {entrada.elementos.length} elementos
        </p>
      </div>

      {(proyecto.notasIA || proyecto.descartadosIA > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/95 p-5 text-sm text-amber-900 space-y-1.5">
          <h2 className="font-semibold">Supuestos de la IA — confírmalos con el cliente o el plano</h2>
          {proyecto.notasIA && <p className="whitespace-pre-line">{proyecto.notasIA}</p>}
          {proyecto.descartadosIA > 0 && (
            <p>{proyecto.descartadosIA} elemento(s) propuestos no se pudieron interpretar y se descartaron.</p>
          )}
        </section>
      )}

      {proyecto.archivos.length > 0 && (
        <section className="tarjeta p-5 space-y-3">
          <h2 className="text-lg font-semibold text-marca-900">Planos subidos</h2>
          <div className="flex flex-wrap gap-3">
            {proyecto.archivos.filter((a) => a.tipo !== "descripcion").map((a) => (
              <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noreferrer"
                className="block w-24 h-24 rounded-xl overflow-hidden ring-1 ring-marca-100 hover:ring-acento">
                {a.tipo === "foto" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- archivo privado del usuario servido por /projects/[id]/archivos/, no una imagen pública optimizable
                  <img src={a.url ?? ""} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs font-semibold text-marca-600 bg-marca-50">PDF</span>
                )}
              </a>
            ))}
          </div>
          {proyecto.archivos.find((a) => a.tipo === "descripcion") && (
            <p className="text-sm text-slate-600 italic">
              &ldquo;{proyecto.archivos.find((a) => a.tipo === "descripcion")?.descripcion}&rdquo;
            </p>
          )}
        </section>
      )}

      {entrada.elementos.length === 0 ? (
        <p className="tarjeta p-6 text-slate-600">
          Este proyecto se creó con una versión anterior de la plataforma y no tiene elementos. Crea uno nuevo desde el panel.
        </p>
      ) : (
        <>
          <section className="tarjeta p-3 sm:p-4">
            <VisorProyecto entrada={entrada} />
          </section>

          <SeccionesPorConfirmar proyectoId={proyecto.id} piezas={provisionales} />

          {calculo.errores.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50/95 p-5 space-y-2">
              <h2 className="font-medium text-red-800">{calculo.errores.length} elemento(s) sin interpretar</h2>
              <ul className="text-sm text-red-700 list-disc pl-5">
                {calculo.errores.slice(0, 10).map((e: { elementoId: string; mensaje: string }) => (
                  <li key={e.elementoId}>{e.elementoId}: {e.mensaje}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="tarjeta p-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-marca-900">Cuadro de cantidades</h2>
              {sinConfirmar > 0 && (
                <p className="text-sm text-amber-700">{sinConfirmar} pieza(s) son referencia sin confirmar. Confírmalas para que salgan como dato firme en el PDF.</p>
              )}
            </div>

            {etapas.map(([n, e]) => (
              <div key={n} className="rounded-xl border border-marca-100 overflow-x-auto">
                <div className="bg-marca-50 px-3 py-2 text-sm font-semibold text-marca-800">Etapa {n} · {e.nombre}</div>
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
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
                                <button className="rounded-md border border-marca-200 bg-white px-2 py-0.5 text-xs font-semibold text-marca-800 hover:border-acento hover:text-acento">Confirmar</button>
                              </form>
                            )}
                          </td>
                        </tr>
                        {!l.derivada && (
                          <EditorElementos proyectoId={proyecto.id} elementos={elementosPorLinea.get(`${l.etapa}|${l.piezaId}|${l.unidad}`) ?? []} />
                        )}
                      </Fragment>
                    ))}
                    <tr className="border-t border-marca-100 bg-marca-50/60 font-semibold text-marca-900">
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
            <ul className="rounded-2xl border border-amber-200 bg-amber-50/95 text-amber-900 p-4 text-sm list-disc pl-8 space-y-0.5">
              {calculo.avisos.map((a: string) => <li key={a}>{a}</li>)}
            </ul>
          )}

          <div className="tarjeta p-5">
            <EditorConsumos
              proyectoId={proyecto.id}
              piezas={Object.values(entrada.catalogo).map((p) => ({ id: p.id, nombre: p.nombre, consumos: p.consumos ?? [] }))}
            />
          </div>

          {calculo.despiece.length > 0 && (
            <div className="tarjeta p-5">
              <Despiece despiece={calculo.despiece} laminas={calculo.laminas} conEstado />
            </div>
          )}

          <CotizadorProyecto proyectoId={proyecto.id} calculo={{ lineas: calculo.lineas, porEtapa: calculo.porEtapa }} inicial={leerCotizacion(proyecto.cotizacion)} />

          <section className="tarjeta p-5 space-y-4">
            <h2 className="text-lg font-semibold text-marca-900">PDF y enlaces para presentar</h2>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">Completo — visor y cuadro de cantidades. Para ti.</p>
              <EnlaceCopiable ruta={`/p/${version.resultado?.linkCompleto}`} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-500">Solo vistas — sin cantidades. Para compartir con tu cliente.</p>
              <EnlaceCopiable ruta={`/p/${version.resultado?.linkCliente}`} />
            </div>
            <div className="text-xs text-neutral-500 space-y-1">
              <p>¿Compartiste un enlace por error? Puedes cortar el acceso: los enlaces y el PDF actuales dejan de servir.</p>
              <BotonRegenerarEnlaces proyectoId={proyecto.id} />
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
    </div>
    </MarcoApp>
  );
}
