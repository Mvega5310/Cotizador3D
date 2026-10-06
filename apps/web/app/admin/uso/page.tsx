import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// Uso y costo de la IA en toda la plataforma (GeneracionIA). Mes calendario
// en UTC, igual que el corte del tope de gasto de Anthropic.
const usd = (n: number) => `US$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd4 = (n: number) => `US$ ${n.toLocaleString("es-CO", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
const miles = (n: number) => n.toLocaleString("es-CO");

export default async function UsoIAPage() {
  await requireAdmin();
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
  const inicioMesAnterior = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 1));

  const [delMes, mesAnterior, porCuenta, ultimas] = await Promise.all([
    prisma.generacionIA.findMany({ where: { creadoEn: { gte: inicioMes } }, select: { costoUsd: true, exito: true, duracionMs: true, outputTokens: true, stopReason: true } }),
    prisma.generacionIA.aggregate({ where: { creadoEn: { gte: inicioMesAnterior, lt: inicioMes } }, _sum: { costoUsd: true }, _count: true }),
    prisma.generacionIA.groupBy({ by: ["cuentaId"], where: { creadoEn: { gte: inicioMes } }, _sum: { costoUsd: true }, _count: true, orderBy: { _sum: { costoUsd: "desc" } }, take: 50 }),
    prisma.generacionIA.findMany({ orderBy: { creadoEn: "desc" }, take: 30, include: { proyecto: { select: { id: true, cliente: true, tipoObra: true } } } }),
  ]);

  const total = delMes.reduce((s, g) => s + g.costoUsd, 0);
  const exitosas = delMes.filter((g) => g.exito);
  const promedio = exitosas.length ? exitosas.reduce((s, g) => s + g.costoUsd, 0) / exitosas.length : 0;
  const maximo = exitosas.reduce((m, g) => Math.max(m, g.costoUsd), 0);
  const duracion = exitosas.length ? exitosas.reduce((s, g) => s + g.duracionMs, 0) / exitosas.length / 1000 : 0;
  const fallidas = delMes.length - exitosas.length;
  const gastoFallidas = delMes.filter((g) => !g.exito).reduce((s, g) => s + g.costoUsd, 0);
  // Respuestas que llegaron al tope de salida: si pasa seguido, conviene
  // generar por etapas (ver AUDITORIA.md, H-09).
  const cortadas = delMes.filter((g) => g.stopReason === "max_tokens").length;

  const cuentas = await prisma.cuenta.findMany({
    where: { id: { in: porCuenta.map((c) => c.cuentaId) } },
    include: { usuarios: { select: { email: true }, take: 1, orderBy: { creadoEn: "asc" } } },
  });
  const cuentaDe = new Map(cuentas.map((c) => [c.id, c]));

  return (
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Panel</Link>
        <h1 className="text-2xl font-semibold mt-1">Uso de IA</h1>
        <p className="text-sm text-neutral-500">
          Mes en curso (desde el {inicioMes.toLocaleDateString("es-CO", { timeZone: "UTC" })}, UTC). Costos estimados con la tarifa pública de Anthropic
          (lib/costos.ts); la factura real está en la consola de Anthropic.
        </p>
      </div>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Dato t="Gasto del mes" v={usd(total)} />
        <Dato t="Proyectos generados" v={`${exitosas.length}`} sub={fallidas ? `${fallidas} fallidos (${usd(gastoFallidas)})` : undefined} />
        <Dato t="Promedio por proyecto" v={usd4(promedio)} sub={exitosas.length ? `máximo ${usd4(maximo)}` : undefined} />
        <Dato t="Duración promedio" v={`${Math.round(duracion)} s`} sub={`${cortadas} cortada(s) por largo · mes anterior: ${usd(mesAnterior._sum.costoUsd ?? 0)}`} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Por cuenta (mes en curso)</h2>
        <div className="border border-neutral-200 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500 bg-neutral-50">
              <tr><th className="px-3 py-1.5 font-medium">Cuenta</th><th className="px-3 py-1.5 font-medium">Plan</th><th className="px-3 py-1.5 font-medium text-right">Generaciones</th><th className="px-3 py-1.5 font-medium text-right">Gasto</th></tr>
            </thead>
            <tbody>
              {porCuenta.map((c) => {
                const cuenta = cuentaDe.get(c.cuentaId);
                return (
                  <tr key={c.cuentaId} className="border-t border-neutral-200">
                    <td className="px-3 py-1">{cuenta?.nombre ?? c.cuentaId} <span className="text-neutral-400">{cuenta?.usuarios[0]?.email}</span></td>
                    <td className="px-3 py-1">{cuenta?.plan}</td>
                    <td className="px-3 py-1 text-right">{c._count}</td>
                    <td className="px-3 py-1 text-right whitespace-nowrap">{usd4(c._sum.costoUsd ?? 0)}</td>
                  </tr>
                );
              })}
              {porCuenta.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-neutral-500">Sin generaciones este mes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Últimas generaciones</h2>
        <div className="border border-neutral-200 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500 bg-neutral-50">
              <tr>
                <th className="px-3 py-1.5 font-medium">Fecha</th><th className="px-3 py-1.5 font-medium">Proyecto</th>
                <th className="px-3 py-1.5 font-medium text-right">Entrada</th><th className="px-3 py-1.5 font-medium text-right">Salida</th>
                <th className="px-3 py-1.5 font-medium text-right">Costo</th><th className="px-3 py-1.5 font-medium text-right">Tiempo</th><th className="px-3 py-1.5 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {ultimas.map((g) => (
                <tr key={g.id} className="border-t border-neutral-200 align-top">
                  <td className="px-3 py-1 whitespace-nowrap">{g.creadoEn.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="px-3 py-1">{g.proyecto.cliente} <span className="text-neutral-400">{g.proyecto.tipoObra}</span></td>
                  <td className="px-3 py-1 text-right">{miles(g.inputTokens + g.cacheLectura + g.cacheEscritura)}</td>
                  <td className="px-3 py-1 text-right">{miles(g.outputTokens)}</td>
                  <td className="px-3 py-1 text-right whitespace-nowrap">{usd4(g.costoUsd)}</td>
                  <td className="px-3 py-1 text-right">{Math.round(g.duracionMs / 1000)} s</td>
                  <td className={`px-3 py-1 ${g.exito ? "text-green-700" : "text-red-700"}`}>{g.exito ? "OK" : g.error?.slice(0, 80) ?? "Falló"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Dato({ t, v, sub }: { t: string; v: string; sub?: string }) {
  return (
    <div className="border border-neutral-200 rounded p-3">
      <p className="text-xs text-neutral-500">{t}</p>
      <p className="text-xl font-semibold">{v}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
