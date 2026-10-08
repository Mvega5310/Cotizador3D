import { Fragment } from "react";

// Lista de cortes y láminas de los tableros del proyecto (ver
// packages/engine/src/interprete.js::calcularDespiece). Sin estado ni efectos:
// la usan tanto páginas del servidor como el documento del PDF
// (VisorImprimible, que es un componente cliente).

export type FilaDespiece = {
  piezaId: string; material: string; largo: number; ancho: number; espesor: number;
  cantos: number[]; cantidad: number; nombres: string[]; confirmado: boolean;
};
export type LaminaMaterial = {
  piezaId: string; nombre: string; m2: number; piezas: number;
  lamina: [number, number] | null; minimo: number | null; noCaben: number;
};

function textoCantos([largos, cortos]: number[]) {
  const partes = [];
  if (largos) partes.push(`${largos} largo${largos > 1 ? "s" : ""}`);
  if (cortos) partes.push(`${cortos} corto${cortos > 1 ? "s" : ""}`);
  return partes.join(" · ") || "—";
}

// Piezas iguales agrupadas pueden sumar muchos nombres ("Cajón 1 - costado
// izquierdo", "Cajón 1 - costado derecho", …): se muestran dos y cuántos más.
function resumenNombres(nombres: string[]) {
  if (nombres.length === 0) return "—";
  if (nombres.length <= 2) return nombres.join(", ");
  return `${nombres.slice(0, 2).join(", ")} y ${nombres.length - 2} más`;
}

const m2Texto =(n: number) => `${n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

export default function Despiece({ despiece, laminas, conEstado = false }: { despiece: FilaDespiece[]; laminas: LaminaMaterial[]; conEstado?: boolean }) {
  if (despiece.length === 0) return null;
  const porMaterial = new Map<string, FilaDespiece[]>();
  for (const f of despiece) porMaterial.set(f.piezaId, [...(porMaterial.get(f.piezaId) ?? []), f]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-marca-900">Despiece (lista de cortes)</h2>
        <p className="text-xs text-slate-500">Medidas de corte en milímetros: largo × ancho × espesor. Cantos: bordes que llevan tapacanto.</p>
      </div>

      {/* Celular: una tarjeta por corte (prototipo móvil). La tabla, desde sm
          (y en el PDF, que se imprime a 1.400 px). */}
      <div className="space-y-3 sm:hidden">
        {[...porMaterial.entries()].map(([piezaId, filas]) => {
          const lam = laminas.find((l) => l.piezaId === piezaId);
          return (
            <div key={piezaId} className="space-y-2.5">
              <div className="rounded-xl bg-marca-100/70 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-marca-800">{filas[0].material}</p>
                {lam && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {m2Texto(lam.m2)} en {lam.piezas} pieza(s)
                    {lam.minimo !== null && lam.lamina && (
                      <> · mínimo {lam.minimo} lámina(s) de {Math.round(lam.lamina[0] * 1000).toLocaleString("es-CO")} × {Math.round(lam.lamina[1] * 1000).toLocaleString("es-CO")} mm, sin contar el desperdicio de corte</>
                    )}
                  </p>
                )}
                {lam && lam.noCaben > 0 && (
                  <p className="mt-0.5 text-xs text-red-700">{lam.noCaben} pieza(s) son más grandes que la lámina: revisa sus medidas o si van unidas.</p>
                )}
              </div>
              {filas.map((f) => (
                <div key={`${f.largo}|${f.ancho}|${f.espesor}|${f.cantos.join(",")}`} className="rounded-xl border border-marca-100 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm font-medium text-marca-900" title={f.nombres.join(", ")}>{resumenNombres(f.nombres)}</p>
                    <span className="shrink-0 rounded-full bg-acento/10 px-2.5 py-0.5 text-xs font-semibold text-acento">×{f.cantidad}</span>
                  </div>
                  <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight text-marca-900">
                    {f.largo.toLocaleString("es-CO")} × {f.ancho.toLocaleString("es-CO")} × {f.espesor}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-500">Cantos: {textoCantos(f.cantos)}</span>
                    {conEstado && (
                      <span className={`font-semibold ${f.confirmado ? "text-emerald-700" : "text-amber-700"}`}>{f.confirmado ? "Confirmado" : "Referencia"}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="hidden sm:block border border-marca-100 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 bg-marca-50/60">
            <tr>
              <th className="px-3 py-1.5 font-medium">Pieza</th>
              <th className="px-3 py-1.5 font-medium text-right">Cant.</th>
              <th className="px-3 py-1.5 font-medium text-right whitespace-nowrap">Largo × ancho × esp.</th>
              <th className="px-3 py-1.5 font-medium">Cantos</th>
              {conEstado && <th className="px-3 py-1.5 font-medium">Estado</th>}
            </tr>
          </thead>
          <tbody>
            {[...porMaterial.entries()].map(([piezaId, filas]) => {
              const lam = laminas.find((l) => l.piezaId === piezaId);
              return (
                <Fragment key={piezaId}>
                  <tr className="border-t border-marca-100 bg-marca-100/60" style={{ breakInside: "avoid" }}>
                    <td className="px-3 py-1.5 font-semibold text-marca-800" colSpan={conEstado ? 5 : 4}>
                      {filas[0].material}
                      {lam && (
                        <span className="font-normal text-neutral-600">
                          {" · "}{m2Texto(lam.m2)} en {lam.piezas} pieza(s)
                          {lam.minimo !== null && lam.lamina && (
                            <> · mínimo {lam.minimo} lámina(s) de {Math.round(lam.lamina[0] * 1000)} × {Math.round(lam.lamina[1] * 1000)} mm, sin contar el desperdicio de corte</>
                          )}
                        </span>
                      )}
                      {lam && lam.noCaben > 0 && (
                        <span className="block text-red-700 font-normal">{lam.noCaben} pieza(s) son más grandes que la lámina: revisa sus medidas o si van unidas.</span>
                      )}
                    </td>
                  </tr>
                  {filas.map((f) => (
                    <tr key={`${f.largo}|${f.ancho}|${f.espesor}|${f.cantos.join(",")}`} className="border-t border-neutral-200">
                      <td className="px-3 py-1 min-w-32" title={f.nombres.join(", ")}>{resumenNombres(f.nombres)}</td>
                      <td className="px-3 py-1 text-right">{f.cantidad}</td>
                      <td className="px-3 py-1 text-right whitespace-nowrap font-mono">{f.largo} × {f.ancho} × {f.espesor}</td>
                      <td className="px-3 py-1 whitespace-nowrap">{textoCantos(f.cantos)}</td>
                      {conEstado && (
                        <td className={`px-3 py-1 ${f.confirmado ? "text-green-700" : "text-amber-700"}`}>{f.confirmado ? "Confirmado" : "Referencia"}</td>
                      )}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
