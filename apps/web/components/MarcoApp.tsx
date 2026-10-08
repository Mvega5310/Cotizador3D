import Link from "next/link";
import FondoArquitectonico from "@/components/FondoArquitectonico";
import { Logo, IconoSalir } from "@/components/iconos";
import { logoutAction, logoutTodosAction } from "@/lib/actions/auth";
import { getSession } from "@/lib/session";
import { esAdmin } from "@/lib/admin";
import { MARCA } from "@/lib/marca";

// Páginas de trabajo (panel, proyecto, administración): fondo suave para que
// tablas y cifras se lean bien, barra superior con la marca y la navegación, y
// el contenido en tarjetas blancas (.tarjeta).
export default async function MarcoApp({ children, ancho = "max-w-5xl" }: { children: React.ReactNode; ancho?: string }) {
  const session = await getSession();
  return (
    <>
      <FondoArquitectonico variante="suave" />
      <header className="sticky top-0 z-20 border-b border-marca-100/80 bg-white/75 backdrop-blur-md">
        <div className={`mx-auto ${ancho} flex items-center justify-between gap-3 px-4 sm:px-6 py-3`}>
          <Link href="/dashboard" className="inline-flex items-center gap-2.5 text-marca-900">
            <Logo />
            <span className="font-semibold">{MARCA}</span>
          </Link>
          {session && (
            <nav className="flex items-center gap-1 sm:gap-2 text-sm">
              <Link href="/dashboard" className="hidden sm:inline rounded-lg px-3 py-1.5 font-medium text-marca-800 hover:bg-marca-50">Proyectos</Link>
              {esAdmin(session.email) && (
                <Link href="/admin/uso" className="rounded-lg px-3 py-1.5 font-medium text-marca-800 hover:bg-marca-50">Uso de IA</Link>
              )}
              <span className="hidden md:inline max-w-[14rem] truncate px-2 text-slate-400">{session.email}</span>
              <form action={logoutAction}>
                <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-marca-800 hover:bg-marca-50" title="Salir">
                  <IconoSalir /> <span className="hidden sm:inline">Salir</span>
                </button>
              </form>
            </nav>
          )}
        </div>
      </header>
      <main className={`relative flex-1 w-full ${ancho} mx-auto px-4 sm:px-6 py-8 sm:py-10`}>{children}</main>
      {session && (
        <footer className={`mx-auto ${ancho} w-full px-4 sm:px-6 pb-8 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2`}>
          <span>{MARCA}</span>
          <form action={logoutTodosAction}>
            <button className="underline hover:text-slate-600" title="Cierra tu sesión aquí y en cualquier otro celular o computador">Salir de todos los dispositivos</button>
          </form>
        </footer>
      )}
    </>
  );
}
