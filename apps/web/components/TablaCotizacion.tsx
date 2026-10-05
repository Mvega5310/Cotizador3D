import { cantidadTexto, cop } from "@/lib/format";
import type { ResumenCotizacion } from "@/lib/cotizacion";

// Cotización de solo lectura, con precios ya calculados (lib/cotizacion.ts::
// resumirCotizacion). Sin estado: la usan el link completo (servidor) y el
// documento del PDF (VisorImprimible, cliente). No se muestra si el proyecto
// todavía no tiene ningún precio.
export default function TablaCotizacion({ cotizacion }: { cotizacion: ResumenCotizacion }) {
  if (!cotizacion.tienePrecio) return null;
  const sinPrecio = cotizacion.detalle.filter((d) => !(d.precio > 0)).length;

  return (
    <section className="space-y-3" style={{ breakInside: "avoid" }}>
      <h2 className="font-medium text-lg">Cotización</h2>
      <div className="border border-neutral-200 rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500 bg-neutral-50">
            <tr>
              <th className="px-3 py-1.5 font-medium">Pieza</th>
              <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">Cantidad{cotizacion.desperdicioPct > 0 && ` (+${cotizacion.desperdicioPct} % desp.)`}</th>
              <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">Precio unitario</th>
              <th className="px-3 py-1.5 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.detalle.map((d) => (
              <tr key={`${d.etapa}|${d.piezaId}|${d.unidad}`} className="border-t border-neutral-200">
                <td className="px-3 py-1">{d.nombre}</td>
                <td className="px-3 py-1 text-right whitespace-nowrap">{cantidadTexto(d.cantidad, d.unidad)}</td>
                <td className="px-3 py-1 text-right whitespace-nowrap">{d.precio > 0 ? cop(d.precio) : "Por definir"}</td>
                <td className="px-3 py-1 text-right whitespace-nowrap">{d.subtotal > 0 ? cop(d.subtotal) : "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-neutral-300">
            <tr>
              <td className="px-3 py-1 text-right text-neutral-600" colSpan={3}>Materiales</td>
              <td className="px-3 py-1 text-right whitespace-nowrap">{cop(cotizacion.materiales)}</td>
            </tr>
            <tr>
              <td className="px-3 py-1 text-right text-neutral-600" colSpan={3}>Mano de obra</td>
              <td className="px-3 py-1 text-right whitespace-nowrap">{cop(cotizacion.manoObra)}</td>
            </tr>
            <tr className="font-semibold text-base">
              <td className="px-3 py-1.5 text-right" colSpan={3}>Total</td>
              <td className="px-3 py-1.5 text-right whitespace-nowrap">{cop(cotizacion.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {sinPrecio > 0 && (
        <p className="text-xs text-amber-700">{sinPrecio} pieza(s) sin precio todavía: no están sumadas en el total.</p>
      )}
    </section>
  );
}
