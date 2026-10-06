import { obtenerProyectoPorToken } from "@/lib/proyectos";
import VisorImprimible from "@/components/VisorImprimible";
import { leerCotizacion, resumirCotizacion } from "@/lib/cotizacion";

// Página sin interfaz, pensada para que Playwright la abra y genere el PDF
// (ver lib/actions/pdf.ts). No es para visitar a mano: no tiene navegación.
// ?apu=1 agrega el anexo de análisis de precios unitarios (apagado por
// defecto: muchos ejecutores no quieren mostrarle su APU al cliente).
export default async function PaginaImprimir({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<{ apu?: string }> }) {
  const { token } = await params;
  const { apu } = await searchParams;
  const { proyecto, entrada, calculo, modo, marcaAgua } = await obtenerProyectoPorToken(token);
  // Solo datos planos cruzan a un componente cliente: `calculo` completo trae
  // `validos[]._forma`/`_pieza` con funciones del motor, que no se pueden
  // serializar hacia el cliente. Y en modo cliente no se manda nada de
  // cantidades ni precios: aunque no se dibujara, quedaría dentro del HTML.
  const datos = modo === "completo"
    ? {
        porEtapa: calculo.porEtapa, despiece: calculo.despiece, laminas: calculo.laminas,
        cotizacion: resumirCotizacion(calculo, leerCotizacion(proyecto.cotizacion)),
      }
    : null;
  return (
    <VisorImprimible entrada={entrada} calculo={datos} cliente={proyecto.cliente} tipoObra={proyecto.tipoObra}
      marcaAgua={marcaAgua} conApu={apu === "1"} />
  );
}
