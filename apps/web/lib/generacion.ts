import { prisma } from "@/lib/db";
import { proponerElementos, type ArchivoLeido } from "@/lib/ia";
import { completarProyecto, depurarEntradaIA } from "@/lib/proyectos";

// La lectura de planos con IA tarda de 1 a 4 minutos. No se hace dentro de la
// petición del usuario: en el celular, si la pantalla se bloquea o cambia de
// app, el navegador corta la espera y parece que se quedó pegado (aunque el
// servidor sí terminaba). Se corre después de responder (`after()` en
// lib/actions/proyectos.ts) y el resultado queda en el proyecto: estado
// "generado" con su versión 1, o "error" con el motivo, para reintentar.
//
// Nunca lanza: cualquier fallo queda guardado en el proyecto.
export async function generarEnSegundoPlano(args: {
  proyectoId: string; cuentaId: string; archivos: ArchivoLeido[]; descripcion: string;
}) {
  const { proyectoId, cuentaId, archivos, descripcion } = args;
  const inicio = Date.now();
  try {
    const propuesta = await proponerElementos({ archivos, descripcion });
    const resultado = depurarEntradaIA(propuesta);
    await completarProyecto({
      proyectoId, cuentaId, entrada: resultado.entrada, notasIA: resultado.notas, descartadosIA: resultado.descartados,
      cotizacion: resultado.cotizacion,
    });
    console.log(`[ia] proyecto ${proyectoId} generado en ${Math.round((Date.now() - inicio) / 1000)} s`);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "No se pudo generar el proyecto a partir de los planos.";
    console.error(`[ia] proyecto ${proyectoId} falló tras ${Math.round((Date.now() - inicio) / 1000)} s:`, motivo);
    await prisma.proyecto
      .update({ where: { id: proyectoId }, data: { estado: "error", errorIA: motivo.slice(0, 2000) } })
      .catch((err) => console.error("[ia] no se pudo guardar el error del proyecto", proyectoId, err));
  }
}
