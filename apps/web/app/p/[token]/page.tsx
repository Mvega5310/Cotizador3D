import { obtenerProyectoPorToken } from "@/lib/proyectos";
import { cantidadTexto } from "@/lib/format";
import VisorProyecto from "@/components/VisorProyecto";
import Despiece from "@/components/Despiece";
import TablaCotizacion from "@/components/TablaCotizacion";
import FondoArquitectonico from "@/components/FondoArquitectonico";
import { Logo } from "@/components/iconos";
import { leerCotizacion, resumirCotizacion } from "@/lib/cotizacion";
import { MARCA } from "@/lib/marca";

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number; n: number };
type EtapaCalculo = { nombre: string; lineas: Linea[]; totales: Record<string, number> };

// Link público (guía v3, etapa 05: "un PDF... y un link para presentar").
// Sin sesión. `completo` trae cantidades; `cliente` es solo el visor.
// Es lo que ve el cliente final: fondo suave y la marca, sin navegación.
export default async function PaginaCompartida({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { proyecto, entrada, calculo, modo, marcaAgua } = await obtenerProyectoPorToken(token);
  const etapas = Object.entries(calculo.porEtapa as Record<string, EtapaCalculo>);
  const cotizacion = modo === "completo" ? resumirCotizacion(calculo, leerCotizacion(proyecto.cotizacion)) : null;

  return (
    <>
      <FondoArquitectonico variante="suave" />
      {marcaAgua && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
          <span className="text-8xl font-bold text-marca-900/[0.05] -rotate-45 whitespace-nowrap select-none">
            {MARCA.toUpperCase()} · PRUEBA
          </span>
        </div>
      )}
      <header className="border-b border-marca-100/80 bg-white/75 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center gap-2.5 px-4 sm:px-6 py-3 text-marca-900">
          <Logo />
          <span className="font-semibold">{MARCA}</span>
        </div>
      </header>
      <main className="relative flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-marca-900">{proyecto.cliente}</h1>
          <p className="mt-1 text-sm text-slate-500">{proyecto.tipoObra}</p>
        </div>

        <section className="tarjeta p-3 sm:p-4">
          <VisorProyecto entrada={entrada} />
        </section>

        {modo === "completo" && (
          <section className="tarjeta p-5 space-y-4">
            <h2 className="text-lg font-semibold text-marca-900">Cuadro de cantidades</h2>
            {etapas.map(([n, e]) => (
              <div key={n} className="rounded-xl border border-marca-100 overflow-x-auto">
                <div className="bg-marca-50 px-3 py-2 text-sm font-semibold text-marca-800">Etapa {n} · {e.nombre}</div>
                <table className="w-full text-sm">
                  <tbody>
                    {e.lineas.map((l) => (
                      <tr key={`${l.piezaId}|${l.unidad}`} className="border-t border-marca-100">
                        <td className="px-3 py-1.5">{l.nombre}</td>
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">{cantidadTexto(l.cantidad, l.unidad)}</td>
                        <td className="px-3 py-1.5 text-right text-slate-400 hidden sm:table-cell">{l.n} elemento(s)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        {cotizacion?.tienePrecio && (
          <div className="tarjeta p-5"><TablaCotizacion cotizacion={cotizacion} /></div>
        )}

        {modo === "completo" && calculo.despiece.length > 0 && (
          <div className="tarjeta p-5"><Despiece despiece={calculo.despiece} laminas={calculo.laminas} /></div>
        )}

        <p className="text-xs text-slate-400 border-t border-marca-100 pt-4">
          Este modelo y sus cantidades son de referencia para visualizar y cotizar. No reemplazan el diseño
          ni el cálculo estructural de un profesional.
        </p>
      </main>
    </>
  );
}
