import { cantidadTexto, cop } from "@/lib/format";
import type { ResumenCotizacion } from "@/lib/cotizacion";

// Presupuesto de solo lectura (lib/cotizacion.ts::resumirCotizacion): ítems
// con su valor unitario, resumen con AIU e IVA y, si algún ítem tiene análisis
// de precio unitario, el anexo de APU. Sin estado: lo usan el link completo
// (servidor) y el documento del PDF (VisorImprimible, cliente). Las
// retenciones no van aquí: son del cotizante, no del documento para el cliente.
// conApu: mostrar el anexo de APU. En el PDF va apagado salvo que se pida
// (muchos ejecutores no quieren mostrarle su APU al cliente); en el link
// completo, que es del cotizante, va encendido.
export default function TablaCotizacion({ cotizacion: c, conApu: mostrarApu = true }: { cotizacion: ResumenCotizacion; conApu?: boolean }) {
  if (!c.tienePrecio) return null;
  const sinPrecio = c.detalle.filter((d) => !d.conPrecio).length;
  const conApu = mostrarApu ? c.detalle.filter((d) => d.conApu) : [];
  const hayAiu = c.aiu.a > 0 || c.aiu.i > 0 || c.aiu.u > 0;

  return (
    <section className="space-y-4">
      <div className="space-y-3" style={{ breakInside: "avoid" }}>
        <h2 className="text-lg font-semibold text-marca-900">Presupuesto</h2>

        {/* Celular: un ítem por tarjeta, con su análisis desplegable (prototipo
            móvil). <details> no necesita JavaScript: sirve también en el
            servidor. La tabla, desde sm y en el PDF (que se imprime a 1.400 px). */}
        <div className="space-y-2.5 sm:hidden">
          <p className="text-xs text-slate-500">Toca un ítem para ver su análisis de precio unitario.</p>
          {c.detalle.map((d) => {
            const analisis = mostrarApu && d.conPrecio;
            const cabeza = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold text-marca-900">{d.nombre}</p>
                  <p className="shrink-0 font-mono text-[0.95rem] font-bold text-marca-900">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</p>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">{cantidadTexto(d.cantidad, d.unidad)} × {d.conPrecio ? cop(d.valorUnitario) : "Por definir"}</span>
                  {analisis && <span className="shrink-0 font-semibold text-acento group-open:hidden">Ver análisis ⌄</span>}
                  {analisis && <span className="hidden shrink-0 font-semibold text-acento group-open:inline">Ocultar análisis ⌃</span>}
                </div>
              </>
            );
            return analisis ? (
              <details key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="group rounded-xl border border-marca-100 bg-white">
                <summary className="cursor-pointer list-none p-3.5 [&::-webkit-details-marker]:hidden">{cabeza}</summary>
                <dl className="space-y-1.5 border-t border-marca-100 bg-marca-50/60 px-3.5 py-3 text-sm">
                  <FilaApu t={`Material${d.desperdicioPct > 0 ? ` (+${d.desperdicioPct} % desperdicio)` : ""}`} v={d.material} />
                  {d.manoObra > 0 && <FilaApu t="Mano de obra" v={d.manoObra} />}
                  {d.equipo > 0 && <FilaApu t="Equipo" v={d.equipo} />}
                  {d.transporte > 0 && <FilaApu t="Transporte" v={d.transporte} />}
                  <div className="flex justify-between gap-3 border-t border-marca-100 pt-1.5 font-semibold text-marca-900">
                    <dt>Valor unitario</dt><dd className="font-mono">{cop(d.valorUnitario)}</dd>
                  </div>
                </dl>
              </details>
            ) : (
              <div key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="rounded-xl border border-marca-100 bg-white p-3.5">{cabeza}</div>
            );
          })}

          <dl className="space-y-1.5 rounded-xl bg-marca-900 p-4 text-sm text-white/85">
            <FilaTotal t="Costo directo" v={c.costoDirecto} />
            {c.aiu.a > 0 && <FilaTotal t={`Administración (${c.aiu.a} %)`} v={c.aiu.administracion} />}
            {c.aiu.i > 0 && <FilaTotal t={`Imprevistos (${c.aiu.i} %)`} v={c.aiu.imprevistos} />}
            {c.aiu.u > 0 && <FilaTotal t={`Utilidad (${c.aiu.u} %)`} v={c.aiu.utilidad} />}
            {hayAiu && <FilaTotal t="Subtotal" v={c.subtotal} />}
            {c.iva.regimen !== "ninguno" && (
              <FilaTotal t={`IVA ${c.iva.tarifa} % sobre ${c.iva.regimen === "utilidad" ? "la utilidad" : "el subtotal"}`} v={c.iva.valor} />
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-white/15 pt-2.5 text-white">
              <dt className="font-semibold">Total</dt>
              <dd className="font-mono text-2xl font-bold">{cop(c.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="hidden sm:block border border-marca-100 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 bg-marca-50/60">
              <tr>
                <th className="px-3 py-1.5 font-medium">Ítem</th>
                <th className="px-3 py-1.5 font-medium text-right">Cantidad</th>
                <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">Valor unitario</th>
                <th className="px-3 py-1.5 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {c.detalle.map((d) => (
                <tr key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="border-t border-neutral-200">
                  <td className="px-3 py-1">{d.nombre}</td>
                  <td className="px-3 py-1 text-right whitespace-nowrap">{cantidadTexto(d.cantidad, d.unidad)}</td>
                  <td className="px-3 py-1 text-right whitespace-nowrap">{d.conPrecio ? cop(d.valorUnitario) : "Por definir"}</td>
                  <td className="px-3 py-1 text-right whitespace-nowrap">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-neutral-300">
              <Fila t="Costo directo" v={c.costoDirecto} fuerte={!hayAiu && c.iva.regimen === "ninguno"} />
              {c.aiu.a > 0 && <Fila t={`Administración (${c.aiu.a} %)`} v={c.aiu.administracion} />}
              {c.aiu.i > 0 && <Fila t={`Imprevistos (${c.aiu.i} %)`} v={c.aiu.imprevistos} />}
              {c.aiu.u > 0 && <Fila t={`Utilidad (${c.aiu.u} %)`} v={c.aiu.utilidad} />}
              {hayAiu && <Fila t="Subtotal" v={c.subtotal} />}
              {c.iva.regimen !== "ninguno" && (
                <Fila t={`IVA ${c.iva.tarifa} % sobre ${c.iva.regimen === "utilidad" ? "la utilidad" : "el subtotal"}`} v={c.iva.valor} />
              )}
              <tr className="font-semibold text-base">
                <td className="px-3 py-1.5 text-right" colSpan={3}>Total</td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">{cop(c.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {sinPrecio > 0 && <p className="text-xs text-amber-700">{sinPrecio} ítem(s) sin precio todavía: no están sumados en el total.</p>}
      </div>

      {conApu.length > 0 && (
        <div className="hidden sm:block space-y-2" style={{ breakInside: "avoid" }}>
          <h3 className="font-medium">Análisis de precios unitarios</h3>
          <div className="border border-neutral-200 rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 bg-marca-50/60">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Ítem</th>
                  <th className="px-3 py-1.5 font-medium text-right">Material</th>
                  <th className="px-3 py-1.5 font-medium text-right">Mano de obra</th>
                  <th className="px-3 py-1.5 font-medium text-right">Equipo</th>
                  <th className="px-3 py-1.5 font-medium text-right">Transporte</th>
                  <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">Valor unitario</th>
                </tr>
              </thead>
              <tbody>
                {conApu.map((d) => (
                  <tr key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="border-t border-neutral-200">
                    <td className="px-3 py-1">{d.nombre} <span className="text-neutral-400">/ {d.unidad}</span></td>
                    <td className="px-3 py-1 text-right whitespace-nowrap">{cop(d.material)}{d.desperdicioPct > 0 && <span className="text-neutral-400"> (+{d.desperdicioPct} %)</span>}</td>
                    <td className="px-3 py-1 text-right whitespace-nowrap">{cop(d.manoObra)}</td>
                    <td className="px-3 py-1 text-right whitespace-nowrap">{cop(d.equipo)}</td>
                    <td className="px-3 py-1 text-right whitespace-nowrap">{cop(d.transporte)}</td>
                    <td className="px-3 py-1 text-right whitespace-nowrap font-medium">{cop(d.valorUnitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Fila({ t, v, fuerte }: { t: string; v: number; fuerte?: boolean }) {
  return (
    <tr className={fuerte ? "font-medium" : ""}>
      <td className="px-3 py-1 text-right text-neutral-600" colSpan={3}>{t}</td>
      <td className="px-3 py-1 text-right whitespace-nowrap">{cop(v)}</td>
    </tr>
  );
}

function FilaApu({ t, v }: { t: string; v: number }) {
  return (
    <div className="flex justify-between gap-3 text-slate-600">
      <dt>{t}</dt><dd className="font-mono text-marca-900">{cop(v)}</dd>
    </div>
  );
}

function FilaTotal({ t, v }: { t: string; v: number }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{t}</dt><dd className="font-mono font-semibold text-white">{cop(v)}</dd>
    </div>
  );
}
