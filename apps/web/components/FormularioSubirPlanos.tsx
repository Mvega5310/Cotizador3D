"use client";

import { useActionState, useState } from "react";
import { crearDesdeIAAction, type EstadoForm } from "@/lib/actions/proyectos";
import Escenario from "@/components/Escenario";
import { IconoCasaPlano, IconoClip, IconoEnviar, IconoFlechaAbajo } from "@/components/iconos";

const inicial: EstadoForm = {};

// Revisión en el navegador, para avisar al elegir los archivos y no después
// de subirlos. El servidor vuelve a revisar todo (lib/actions/proyectos.ts).
const MAX_TOTAL = 22 * 1024 * 1024;
const ACEPTADOS = /\.(jpe?g|png|webp|gif|pdf)$/i;

// Sugerencias del campo "Tipo de proyecto": se puede escribir cualquier otro.
const TIPOS = [
  "Cocina integral", "Closet o vestier", "Mueble de baño", "Cubierta metálica", "Cubierta en teja",
  "Pérgola", "Portón o reja", "Estructura metálica", "Entrepiso", "Escalera", "Mezanine", "Fachada",
];

function revisarArchivos(lista: FileList | null): string | null {
  const archivos = [...(lista ?? [])];
  if (archivos.length > 6) return "Máximo 6 archivos por proyecto.";
  const raro = archivos.find((a) => !ACEPTADOS.test(a.name));
  if (raro) return `"${raro.name}" no es JPG, PNG, WebP o PDF. En iPhone, comparte la foto como JPG (o toma una captura de pantalla).`;
  if (archivos.reduce((s, a) => s + a.size, 0) > MAX_TOTAL) return "Entre todos los archivos pasan de 22 MB. Sube menos páginas o fotos más livianas.";
  return null;
}

export default function FormularioSubirPlanos() {
  const [estado, accion, pendiente] = useActionState(crearDesdeIAAction, inicial);
  const [avisoArchivos, setAvisoArchivos] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);

  return (
    <Escenario volver={{ href: "/dashboard", texto: "← Tus proyectos" }}>
      <div className="tarjeta-vidrio mx-auto w-full max-w-[820px] p-6 sm:p-9">
        <div className="flex gap-4 sm:gap-6 mb-7">
          <div className="hidden sm:grid h-[88px] w-[88px] shrink-0 place-items-center rounded-2xl bg-acento/10 text-acento">
            <IconoCasaPlano className="h-12 w-12" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-acento/10 text-acento sm:hidden">
                <IconoCasaPlano className="h-6 w-6" />
              </span>
              <h1 className="text-[1.6rem] sm:text-[1.75rem] leading-tight font-bold tracking-tight text-marca-900">Nuevo proyecto</h1>
            </div>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-500">
              Sube fotos o PDF de tus planos o bocetos, y cuéntanos lo que necesites aclarar. Generamos el modelo 3D
              y el cuadro de cantidades — revisas y confirmas las medidas antes de presentarlo o cotizarlo.
            </p>
          </div>
        </div>

        <form action={accion} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="min-w-0">
              <label htmlFor="cliente-ia" className="etiqueta">Cliente</label>
              <input id="cliente-ia" name="cliente" type="text" required autoComplete="off" className="campo" />
            </div>
            <div className="min-w-0">
              <label htmlFor="tipoObra-ia" className="etiqueta">Tipo de proyecto</label>
              <div className="relative">
                <input id="tipoObra-ia" name="tipoObra" type="text" list="tipos-de-proyecto" autoComplete="off"
                  placeholder="cocina integral, cubierta, portón…" className="campo pr-10" />
                <IconoFlechaAbajo className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <datalist id="tipos-de-proyecto">
                  {TIPOS.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div>
            <span className="etiqueta">Planos, bocetos o fotos</span>
            {/* El input real queda oculto a la vista (no al lector de pantalla ni al teclado). */}
            <input id="archivos" name="archivos" type="file" multiple required
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf" className="peer sr-only"
              onChange={(e) => {
                setAvisoArchivos(revisarArchivos(e.target.files));
                setElegidos([...(e.target.files ?? [])].map((a) => a.name));
              }} />
            <label htmlFor="archivos"
              className="campo !border-dashed !border-marca-600/40 !bg-marca-50/70 !p-1.5 flex cursor-pointer items-center gap-3 hover:!border-acento peer-focus-visible:!border-acento peer-focus-visible:ring-4 peer-focus-visible:ring-acento/15">
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-acento/10 px-3 py-2 text-sm font-semibold text-acento">
                <IconoClip className="h-4 w-4" /> Elegir archivos
              </span>
              <span className="truncate text-slate-500">
                {elegidos.length === 0 ? (
                  <>Ningún archivo seleccionado</>
                ) : (
                  <span className="text-marca-900">{elegidos.length === 1 ? elegidos[0] : `${elegidos.length} archivos: ${elegidos.join(", ")}`}</span>
                )}
              </span>
            </label>
            <p className="mt-1.5 text-xs text-slate-500">Fotos JPG, PNG o WebP, o PDF. Hasta 6 archivos y 22 MB en total.</p>
            {avisoArchivos && <p className="mt-1 text-sm text-red-600">{avisoArchivos}</p>}
          </div>

          <div>
            <label htmlFor="descripcion" className="etiqueta">Descripción (lo que quieras aclarar)</label>
            <textarea id="descripcion" name="descripcion" rows={4} placeholder="Medidas confirmadas, materiales, qué parte cotizar…"
              className="campo resize-y" />
          </div>

          {estado.error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{estado.error}</p>}

          <button type="submit" disabled={pendiente || !!avisoArchivos} className="boton-primario w-full sm:w-auto !py-3 sm:!py-[0.7rem]">
            <IconoEnviar className="h-[18px] w-[18px]" />
            {pendiente ? "Subiendo los planos…" : "Generar proyecto"}
          </button>
        </form>
      </div>
    </Escenario>
  );
}
