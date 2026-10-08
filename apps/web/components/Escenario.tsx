import Link from "next/link";
import FondoArquitectonico from "@/components/FondoArquitectonico";
import { Logo } from "@/components/iconos";
import { MARCA } from "@/lib/marca";

// Páginas de entrada y de nuevo proyecto: el fondo arquitectónico completo,
// la marca arriba a la izquierda (sobre la zona oscura del fondo) y el
// contenido centrado, normalmente una tarjeta de vidrio.
export default function Escenario({ children, ancho = "max-w-3xl", volver }: {
  children: React.ReactNode;
  ancho?: string;
  volver?: { href: string; texto: string };
}) {
  return (
    <>
      <FondoArquitectonico variante="hero" />
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5">
        <Link href="/" className="inline-flex items-center gap-2.5 text-white">
          <Logo claro />
          <span className="font-semibold">{MARCA}</span>
        </Link>
        {volver && (
          <Link href={volver.href} className="text-sm font-semibold text-marca-800 rounded-lg bg-white/85 px-3.5 py-1.5 shadow-sm ring-1 ring-marca-100 backdrop-blur hover:bg-white">
            {volver.texto}
          </Link>
        )}
      </header>
      <main className={`relative z-10 flex-1 w-full ${ancho} mx-auto px-4 sm:px-6 pb-12 pt-2 sm:pt-6 flex flex-col justify-center`}>
        {children}
      </main>
    </>
  );
}
