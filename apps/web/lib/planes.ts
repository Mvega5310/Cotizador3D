import { prisma } from "@/lib/db";

// Cada proyecto generado tiene un costo real (la llamada a la IA) — por eso
// el cupo se cuenta por proyectos, no por días (guía v3, sección 07).
//
// "prueba" se agota por conteo TOTAL de proyectos, no mensual: es una
// ventana de una sola vez (14 días o `cupoMes` proyectos, lo que llegue
// primero), no algo que se renueve cada mes. Los planes pagos sí son
// mensuales: el cupo se cuenta desde el día 1 del mes en curso.
function inicioDelPeriodo(plan: string): Date {
  return plan === "prueba" ? new Date(0) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
}

export async function resumenCupo(cuentaId: string) {
  const cuenta = await prisma.cuenta.findUniqueOrThrow({ where: { id: cuentaId } });
  const usados = await prisma.proyecto.count({ where: { cuentaId, creadoEn: { gte: inicioDelPeriodo(cuenta.plan) } } });
  return { plan: cuenta.plan, cupo: cuenta.cupoMes, usados, pruebaHasta: cuenta.pruebaHasta };
}

// Se llama antes de generar un proyecto (que cuesta dinero real) — nunca
// después. Bloquea solo la creación de proyectos nuevos; ver, editar,
// cotizar o exportar los que ya existen sigue funcionando aunque el cupo o
// la prueba se hayan agotado.
export async function chequearCupo(cuentaId: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const { plan, cupo, usados, pruebaHasta } = await resumenCupo(cuentaId);

  if (plan === "prueba" && pruebaHasta && pruebaHasta < new Date()) {
    return { ok: false, motivo: `Tu prueba gratuita venció el ${pruebaHasta.toLocaleDateString("es-CO")}. Mejora tu plan para seguir generando proyectos.` };
  }
  if (usados >= cupo) {
    const sugerencia = plan === "prueba" ? "Mejora tu plan" : "Tu cupo se renueva el día 1 del próximo mes";
    return { ok: false, motivo: `Ya usaste los ${cupo} proyectos de ${plan === "prueba" ? "tu prueba gratuita" : "este mes"}. ${sugerencia}.` };
  }
  return { ok: true };
}
