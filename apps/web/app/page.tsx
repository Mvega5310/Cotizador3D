import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { MARCA } from "@/lib/marca";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-6">
        <p className="text-sm font-mono uppercase tracking-widest text-orange-600">{MARCA}</p>
        <h1 className="text-4xl font-bold">Tus planos, en 3D y con cotización</h1>
        <p className="text-neutral-600">
          Sube las medidas de tu obra, mira el modelo desde varios ángulos y
          saca un cuadro de cantidades con precio configurable.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register" className="bg-neutral-900 text-white rounded px-5 py-2.5 font-medium">
            Crear cuenta
          </Link>
          <Link href="/login" className="border border-neutral-300 rounded px-5 py-2.5 font-medium">
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
