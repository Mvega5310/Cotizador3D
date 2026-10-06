import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import FormularioSubirPlanos from "@/components/FormularioSubirPlanos";
import AvisoVerificacion from "@/components/AvisoVerificacion";

export default async function NuevoProyectoPage() {
  const session = await requireSession();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: session.userId } });

  // Generar exige correo confirmado (lib/actions/proyectos.ts); se avisa
  // antes de que la persona suba sus planos, no después.
  if (!usuario.emailVerificado && process.env.RESEND_API_KEY) {
    return (
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 space-y-4">
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:underline">← Tus proyectos</Link>
        <h1 className="text-2xl font-semibold">Nuevo proyecto</h1>
        <p className="text-sm text-neutral-600">
          Antes de tu primer proyecto, confirma tu correo con el enlace que te enviamos a <strong>{usuario.email}</strong>.
          Revisa también la carpeta de spam.
        </p>
        <AvisoVerificacion />
      </main>
    );
  }
  return <FormularioSubirPlanos />;
}
