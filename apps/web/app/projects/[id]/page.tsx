import Link from "next/link";
import { getOwnedProject } from "@/lib/actions/projects";
import { DEFAULT_PROFILES } from "@cotizador3d/engine";
import Viewer3D, { type GableRoofParams } from "@/components/Viewer3D";
import QuoteCalculator from "@/components/QuoteCalculator";
import type { Bom } from "@/lib/bom";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyecto = await getOwnedProject(id);
  const version = proyecto.versiones[0];
  const paramMap = Object.fromEntries(version.parametros.map((p) => [p.clave, p.valor]));

  const gableParams: GableRoofParams = {
    length: Number(paramMap.length),
    depth: Number(paramMap.depth),
    eaveHeight: Number(paramMap.eaveHeight),
    ridgeHeight: Number(paramMap.ridgeHeight),
    trussCount: Number(paramMap.trussCount),
    purlinsPerSide: Number(paramMap.purlinsPerSide),
  };
  const bom = version.resultado?.bom as unknown as Bom;

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">
          ← Tus proyectos
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{proyecto.cliente}</h1>
        <p className="text-sm text-neutral-500">
          {proyecto.tipoObra} · versión {version.numero}
        </p>
      </div>

      <Viewer3D params={gableParams} />

      <div>
        <h2 className="font-medium mb-2">Cuadro de cantidades</h2>
        <table className="w-full text-sm border border-neutral-200 rounded overflow-hidden">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="p-2 font-medium">Elemento</th>
              <th className="p-2 font-medium text-right">Piezas</th>
              <th className="p-2 font-medium text-right">Longitud (m)</th>
              <th className="p-2 font-medium text-right">Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEFAULT_PROFILES).map(([key, prof]) => {
              const row = bom[key];
              return (
                <tr key={key} className="border-t border-neutral-200">
                  <td className="p-2">
                    {prof.name}
                    <div className="text-xs text-neutral-400">{prof.tube}</div>
                  </td>
                  <td className="p-2 text-right">{row.n}</td>
                  <td className="p-2 text-right">{row.len.toFixed(1)}</td>
                  <td className="p-2 text-right">{row.kg.toFixed(0)}</td>
                </tr>
              );
            })}
            <tr className="border-t border-neutral-300 bg-neutral-50 font-medium">
              <td className="p-2">Total</td>
              <td className="p-2" />
              <td className="p-2 text-right">{bom._total.len.toFixed(1)}</td>
              <td className="p-2 text-right">{bom._total.kg.toFixed(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <QuoteCalculator bom={bom} />
    </main>
  );
}
