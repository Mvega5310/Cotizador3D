import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/lib/actions/auth";
import { resumenCupo } from "@/lib/planes";
import AvisoVerificacion from "@/components/AvisoVerificacion";

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
    <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Tus proyectos</h1>
          <p className="text-sm text-neutral-500">{usuario.email}</p>
          <p className={`text-sm mt-1 ${agotado ? "text-amber-700" : "text-neutral-500"}`}>
            Plan {NOMBRE_PLAN[cupo.plan] ?? cupo.plan} · {cupo.usados} de {cupo.cupo} proyecto(s) {cupo.plan === "prueba" ? "de la prueba" : "este mes"}
            {cupo.plan === "prueba" && cupo.pruebaHasta && ` · vence el ${cupo.pruebaHasta.toLocaleDateString("es-CO")}`}
          </p>
        </div>
        <form action={logoutAction}>
          <button className="text-sm underline text-neutral-600">Salir</button>
        </form>
      </div>

      {!usuario.emailVerificado && <AvisoVerificacion />}

      {agotado ? (
        <p className="inline-block mb-8 border border-amber-300 bg-amber-50 text-amber-800 rounded px-4 py-2.5 text-sm">
          Ya usaste tu cupo {cupo.plan === "prueba" ? "de la prueba gratuita" : "de este mes"}. {cupo.plan === "prueba" ? "Mejora tu plan" : "Se renueva el 1."} para generar más proyectos.
        </p>
      ) : (
        <Link
          href="/projects/new"
          className="inline-block mb-8 bg-neutral-900 text-white rounded px-4 py-2.5 font-medium"
        >
          + Nuevo proyecto
        </Link>
      )}

      <ul className="divide-y divide-neutral-200 border border-neutral-200 rounded">
        {proyectos.map((p) => (
          <li key={p.id} className="p-4 hover:bg-neutral-50">
            <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
              {p.cliente}
            </Link>
            <span className="ml-2 text-sm text-neutral-500">
              {p.tipoObra} · {p.estado}
            </span>
          </li>
        ))}
        {proyectos.length === 0 && (
          <li className="p-6 text-center text-neutral-500">Todavía no tienes proyectos.</li>
        )}
      </ul>
    </main>
  );
}
