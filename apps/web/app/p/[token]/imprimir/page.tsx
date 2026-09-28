import { obtenerProyectoPorToken } from "@/lib/proyectos";
import VisorImprimible from "@/components/VisorImprimible";

// Página sin interfaz, pensada para que Playwright la abra y genere el PDF
// (ver lib/actions/pdf.ts). No es para visitar a mano: no tiene navegación.
export default async function PaginaImprimir({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { proyecto, entrada, calculo, modo, marcaAgua } = await obtenerProyectoPorToken(token);
  // Solo `porEtapa` cruza a un componente cliente: `calculo` completo trae
  // `validos[]._forma`/`_pieza` con funciones del motor, que no se pueden
  // serializar hacia el cliente.
  return <VisorImprimible entrada={entrada} calculo={{ porEtapa: calculo.porEtapa }} cliente={proyecto.cliente} tipoObra={proyecto.tipoObra} modo={modo} marcaAgua={marcaAgua} />;
}
