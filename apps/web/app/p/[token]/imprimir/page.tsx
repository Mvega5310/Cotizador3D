import { obtenerProyectoPorToken } from "@/lib/proyectos";
import VisorImprimible from "@/components/VisorImprimible";
import { leerCotizacion, resumirCotizacion } from "@/lib/cotizacion";

// Página sin interfaz, pensada para que Playwright la abra y genere el PDF
// (ver lib/actions/pdf.ts). No es para visitar a mano: no tiene navegación.
// ?apu=1 agrega el anexo de análisis de precios unitarios (apagado por
// defecto: muchos ejecutores no quieren mostrarle su APU al cliente).
// ?precios=0 es el anexo técnico: vistas y desglose sin ningún precio.
export default async function PaginaImprimir({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<{ apu?: string; precios?: string }> }) {
  const { token } = await params;
  const { apu, precios } = await searchParams;
  const conPrecios = precios !== "0";
  const { proyecto, entrada, calculo, modo, marcaAgua } = await obtenerProyectoPorToken(token);
  // Solo datos planos cruzan a un componente cliente: `calculo` completo trae
  // `validos[]._forma`/`_pieza` con funciones del motor, que no se pueden
  // serializar hacia el cliente. Y en modo cliente no se manda nada de
  // cantidades ni precios, ni precios en el anexo técnico: aunque no se
  // dibujara, quedaría dentro del HTML.
  const datos = modo === "completo"
    ? {
        porEtapa: calculo.porEtapa, despiece: calculo.despiece, laminas: calculo.laminas,
        cotizacion: conPrecios ? resumirCotizacion(calculo, leerCotizacion(proyecto.cotizacion)) : null,
      }
    : null;
  return (
    <VisorImprimible entrada={entrada} calculo={datos} cliente={proyecto.cliente} tipoObra={proyecto.tipoObra}
      marcaAgua={marcaAgua} conApu={conPrecios && apu === "1"} />
  );
}
