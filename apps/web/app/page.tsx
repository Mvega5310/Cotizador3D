import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Escenario from "@/components/Escenario";
import { IconoCasaPlano, IconoCubo, IconoEnviar } from "@/components/iconos";

const PUNTOS = [
  { icono: IconoCasaPlano, titulo: "De tus planos al 3D", texto: "Sube fotos o PDF de planos o bocetos; la IA arma el modelo y tú confirmas las medidas." },
  { icono: IconoCubo, titulo: "Cantidades y despiece", texto: "Cuadro de cantidades por etapa, despiece de muebles y consumos de pintura, soldadura o tornillería." },
  { icono: IconoEnviar, titulo: "Listo para presentar", texto: "Presupuesto con APU, AIU e IVA, o un anexo técnico para tu propio formato, y un link para tu cliente." },
];

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <Escenario ancho="max-w-3xl">
      <div className="tarjeta-vidrio p-7 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-marca-900">
          Tus planos, en 3D y con cotización
        </h1>
        <p className="mt-3 text-slate-500 leading-relaxed">
          Para quien fabrica e instala: estructuras metálicas, cubiertas, carpintería y mobiliario. Presenta cada
          proyecto como un estudio de arquitectura, sin dibujarlo a mano.
        </p>
        <ul className="mt-7 grid gap-4 sm:grid-cols-3">
          {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="rounded-xl bg-marca-50/80 p-4 ring-1 ring-marca-100">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-acento/10 text-acento"><Icono className="h-5 w-5" /></span>
              <p className="mt-3 font-semibold text-marca-900">{titulo}</p>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{texto}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="boton-primario">Crear cuenta</Link>
          <Link href="/login" className="boton-secundario">Entrar</Link>
        </div>
      </div>
    </Escenario>
  );
}
