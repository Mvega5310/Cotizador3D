import { prisma } from "@/lib/db";
import { ErrorIA, proponerElementos, type ArchivoLeido } from "@/lib/ia";
import { completarProyecto, depurarEntradaIA } from "@/lib/proyectos";
import { costoUsd, type UsoIA } from "@/lib/costos";

// La lectura de planos con IA tarda de 1 a 4 minutos. No se hace dentro de la
// petición del usuario: en el celular, si la pantalla se bloquea o cambia de
// app, el navegador corta la espera y parece que se quedó pegado (aunque el
// servidor sí terminaba). Se corre después de responder (`after()` en
// lib/actions/proyectos.ts) y el resultado queda en el proyecto: estado
// "generado" con su versión 1, o "error" con el motivo, para reintentar.
//
// Cada llamada queda en GeneracionIA con sus tokens y su costo, salga bien o
// mal (ver /admin/uso).
//
// Nunca lanza: cualquier fallo queda guardado en el proyecto.
export async function generarEnSegundoPlano(args: {
  proyectoId: string; cuentaId: string; archivos: ArchivoLeido[]; descripcion: string;
}) {
  const { proyectoId, cuentaId, archivos, descripcion } = args;
  const inicio = Date.now();
  let uso: UsoIA | null = null;
  try {
    const r = await proponerElementos({ archivos, descripcion });
    uso = r.uso;
    const resultado = depurarEntradaIA(r.respuesta);
    await completarProyecto({
      proyectoId, cuentaId, entrada: resultado.entrada, notasIA: resultado.notas, descartadosIA: resultado.descartados,
      cotizacion: resultado.cotizacion,
    });
    await registrar({ proyectoId, cuentaId, uso, inicio, exito: true });
    console.log(`[ia] proyecto ${proyectoId} generado en ${Math.round((Date.now() - inicio) / 1000)} s`);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "No se pudo generar el proyecto a partir de los planos.";
    if (e instanceof ErrorIA) uso = e.uso;
    console.error(`[ia] proyecto ${proyectoId} falló tras ${Math.round((Date.now() - inicio) / 1000)} s:`, motivo);
    await registrar({ proyectoId, cuentaId, uso, inicio, exito: false, error: motivo });
    await prisma.proyecto
      .update({ where: { id: proyectoId }, data: { estado: "error", errorIA: motivo.slice(0, 2000) } })
      .catch((err) => console.error("[ia] no se pudo guardar el error del proyecto", proyectoId, err));
  }
}

async function registrar(a: { proyectoId: string; cuentaId: string; uso: UsoIA | null; inicio: number; exito: boolean; error?: string }) {
  const uso = a.uso ?? { modelo: "desconocido", inputTokens: 0, outputTokens: 0, cacheLectura: 0, cacheEscritura: 0 };
  const costo = costoUsd(uso);
  console.log(`[ia] costo proyecto ${a.proyectoId}: US$ ${costo.toFixed(4)} (${uso.inputTokens} entrada, ${uso.outputTokens} salida)`);
  await prisma.generacionIA
    .create({
      data: {
        proyectoId: a.proyectoId, cuentaId: a.cuentaId, modelo: uso.modelo,
        inputTokens: uso.inputTokens, outputTokens: uso.outputTokens, cacheLectura: uso.cacheLectura, cacheEscritura: uso.cacheEscritura,
        costoUsd: costo, stopReason: uso.stopReason, duracionMs: Date.now() - a.inicio, exito: a.exito, error: a.error?.slice(0, 1000),
      },
    })
    // Que falle el registro del costo no debe tumbar la generación.
    .catch((err) => console.error("[ia] no se pudo registrar el costo de", a.proyectoId, err));
}
