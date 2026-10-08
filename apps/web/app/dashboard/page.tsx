import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { resumenCupo } from "@/lib/planes";
import AvisoVerificacion from "@/components/AvisoVerificacion";
import MarcoApp from "@/components/MarcoApp";
import { IconoCasaPlano, IconoMas } from "@/components/iconos";

const NOMBRE_PLAN: Record<string, string> = { prueba: "Prueba", personal: "Personal", profesional: "Profesional", empresa: "Empresa" };

export default async function DashboardPage() {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id: session.userId },
    include: { cuenta: true },
  });
  const proyectos = await prisma.proyecto.findMany({
    where: { cuentaId: usuario.cuentaId },
    orderBy: { creadoEn: "desc" },
  });
  const cupo = await resumenCupo(usuario.cuentaId);
  const agotado = cupo.usados >= cupo.cupo;

  return (
    <MarcoApp>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-marca-900">Tus proyectos</h1>
          <p className={`mt-2 inline-flex flex-wrap items-center gap-x-2 rounded-full px-3 py-1 text-sm ring-1 ${agotado ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-white/80 text-slate-600 ring-marca-100"}`}>
            <span className="font-semibold">Plan {NOMBRE_PLAN[cupo.plan] ?? cupo.plan}</span>
            <span>· {cupo.usados} de {cupo.cupo} proyecto(s) {cupo.plan === "prueba" ? "de la prueba" : "este mes"}</span>
            {cupo.plan === "prueba" && cupo.pruebaHasta && <span>· vence el {cupo.pruebaHasta.toLocaleDateString("es-CO")}</span>}
          </p>
        </div>
        {!agotado && (
          <Link href="/projects/new" className="boton-primario">
            <IconoMas className="h-[18px] w-[18px]" /> Nuevo proyecto
          </Link>
        )}
      </div>

      {!usuario.emailVerificado && <AvisoVerificacion />}

      {agotado && (
        <p className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ya usaste tu cupo {cupo.plan === "prueba" ? "de la prueba gratuita" : "de este mes"}. {cupo.plan === "prueba" ? "Mejora tu plan" : "Se renueva el 1."} para generar más proyectos.
        </p>
      )}

      {proyectos.length === 0 ? (
        <div className="tarjeta flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-acento/10 text-acento"><IconoCasaPlano className="h-8 w-8" /></span>
          <p className="mt-4 font-semibold text-marca-900">Todavía no tienes proyectos</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Sube las fotos o el PDF de un plano o un boceto y en unos minutos tienes el modelo 3D y el cuadro de cantidades.</p>
          {!agotado && <Link href="/projects/new" className="boton-primario mt-6"><IconoMas className="h-[18px] w-[18px]" /> Crear el primero</Link>}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {proyectos.map((p) => (
            <li key={p.id} className="tarjeta group relative flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600 ring-1 ring-marca-100 group-hover:text-acento">
                <IconoCasaPlano className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/projects/${p.id}`} className="font-semibold text-marca-900 after:absolute after:inset-0 hover:text-acento">
                  {p.cliente}
                </Link>
                <p className="truncate text-sm text-slate-500">{p.tipoObra}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400">{p.creadoEn.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {p.estado === "procesando" && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">La IA está leyendo los planos…</span>}
                  {p.estado === "error" && <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-red-200">No se pudo generar</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MarcoApp>
  );
}
