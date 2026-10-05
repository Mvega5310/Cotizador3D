import { obtenerProyectoPorToken } from "@/lib/proyectos";
import { cantidadTexto } from "@/lib/format";
import VisorProyecto from "@/components/VisorProyecto";
import Despiece from "@/components/Despiece";
import TablaCotizacion from "@/components/TablaCotizacion";
import { leerCotizacion, resumirCotizacion } from "@/lib/cotizacion";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

// Link público (guía v3, etapa 05: "un PDF... y un link para presentar").
// Sin sesión. `completo` trae cantidades; `cliente` es solo el visor.
export default async function PaginaCompartida({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { proyecto, entrada, calculo, modo, marcaAgua } = await obtenerProyectoPorToken(token);
  const etapas = Object.entries(calculo.porEtapa as Record<string, EtapaCalculo>);

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-10 space-y-8 relative">
      {marcaAgua && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
          <span className="text-8xl font-bold text-neutral-400/10 -rotate-45 whitespace-nowrap select-none">
            COTIZADOR 3D · PRUEBA
          </span>
        </div>
      )}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-orange-600">Cotizador 3D</p>
        <h1 className="text-2xl font-semibold mt-1">{proyecto.cliente}</h1>
        <p className="text-sm text-neutral-500">{proyecto.tipoObra}</p>
      </div>

      <VisorProyecto entrada={entrada} />

      {modo === "completo" && (
        <section className="space-y-4">
          <h2 className="font-medium">Cuadro de cantidades</h2>
          {etapas.map(([n, e]) => (
            <div key={n} className="border border-neutral-200 rounded overflow-x-auto">
              <div className="bg-neutral-100 px-3 py-2 text-sm font-medium">Etapa {n} · {e.nombre}</div>
              <table className="w-full text-sm">
                <tbody>
                  {e.lineas.map((l) => (
                    <tr key={`${l.piezaId}|${l.unidad}`} className="border-t border-neutral-200">
                      <td className="px-3 py-1.5">{l.nombre}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{cantidadTexto(l.cantidad, l.unidad)}</td>
                      <td className="px-3 py-1.5 text-right text-neutral-500 hidden sm:table-cell">{l.n} elemento(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {modo === "completo" && <TablaCotizacion cotizacion={resumirCotizacion(calculo, leerCotizacion(proyecto.cotizacion))} />}

      {modo === "completo" && <Despiece despiece={calculo.despiece} laminas={calculo.laminas} />}

      <p className="text-xs text-neutral-400 border-t border-neutral-200 pt-4">
        Este modelo y sus cantidades son de referencia para visualizar y cotizar. No reemplazan el diseño
        ni el cálculo estructural de un profesional.
      </p>
    </main>
  );
}
