import { cantidadTexto, cop } from "@/lib/format";
import type { ResumenCotizacion } from "@/lib/cotizacion";

// Presupuesto de solo lectura (lib/cotizacion.ts::resumirCotizacion): ítems
// con su valor unitario, resumen con AIU e IVA y, si algún ítem tiene análisis
// de precio unitario, el anexo de APU. Sin estado: lo usan el link completo
// (servidor) y el documento del PDF (VisorImprimible, cliente). Las
// retenciones no van aquí: son del cotizante, no del documento para el cliente.
export default function TablaCotizacion({ cotizacion: c }: { cotizacion: ResumenCotizacion }) {
  if (!c.tienePrecio) return null;
  const sinPrecio = c.detalle.filter((d) => !d.conPrecio).length;
  const conApu = c.detalle.filter((d) => d.conApu);
  const hayAiu = c.aiu.a > 0 || c.aiu.i > 0 || c.aiu.u > 0;

  return (
    <section className="space-y-4">
      <div className="space-y-3" style={{ breakInside: "avoid" }}>
        <h2 className="font-medium text-lg">Presupuesto</h2>
        <div className="border border-neutral-200 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500 bg-neutral-50">
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
        <div className="space-y-2" style={{ breakInside: "avoid" }}>
          <h3 className="font-medium">Análisis de precios unitarios</h3>
          <div className="border border-neutral-200 rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500 bg-neutral-50">
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
