import Escenario from "@/components/Escenario";
import { IconoCasaPlano } from "@/components/iconos";

// Páginas de cuenta (entrar, registrarse, recuperar, verificar): la misma
// tarjeta de vidrio sobre el fondo arquitectónico, con su ícono y título.
export default function TarjetaCuenta({ titulo, subtitulo, children }: {
  titulo: string;
  subtitulo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Escenario ancho="max-w-md">
      <div className="tarjeta-vidrio p-7 sm:p-9">
        <div className="mb-6">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-acento/10 text-acento">
            <IconoCasaPlano className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-marca-900">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </Escenario>
  );
}
