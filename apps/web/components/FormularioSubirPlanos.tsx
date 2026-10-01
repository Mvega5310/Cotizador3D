"use client";

import { useActionState } from "react";
import { crearDesdeIAAction, type EstadoForm } from "@/lib/actions/proyectos";

const inicial: EstadoForm = {};
const CAMPO = "w-full border border-neutral-300 rounded px-3 py-2";

export default function FormularioSubirPlanos() {
  const [estado, accion, pendiente] = useActionState(crearDesdeIAAction, inicial);

  return (
    <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Nuevo proyecto</h1>
        <p className="text-sm text-neutral-500">
          Sube fotos o PDF de tus planos o bocetos, y cuéntanos lo que necesites aclarar. Generamos el modelo 3D
          y el cuadro de cantidades — revisas y confirmas las medidas antes de presentarlo o cotizarlo.
        </p>
      </div>

      <form action={accion} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="cliente-ia" className="text-sm font-medium">Cliente</label>
            <input id="cliente-ia" name="cliente" type="text" required className={CAMPO} />
          </div>
          <div className="space-y-1">
            <label htmlFor="tipoObra-ia" className="text-sm font-medium">Tipo de proyecto</label>
            <input id="tipoObra-ia" name="tipoObra" type="text" placeholder="cocina integral, cubierta, portón…" className={CAMPO} />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="archivos" className="text-sm font-medium">Planos, bocetos o fotos</label>
          <input id="archivos" name="archivos" type="file" multiple required accept="image/*,.pdf" className={CAMPO} />
          <p className="text-xs text-neutral-500">Hasta 6 archivos, 15 MB cada uno.</p>
        </div>
        <div className="space-y-1">
          <label htmlFor="descripcion" className="text-sm font-medium">Descripción (lo que quieras aclarar)</label>
          <textarea id="descripcion" name="descripcion" rows={3} placeholder="Medidas confirmadas, materiales, qué parte cotizar…" className={CAMPO} />
        </div>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        <button type="submit" disabled={pendiente} className="bg-orange-600 text-white rounded px-5 py-2.5 font-medium disabled:opacity-60">
          {pendiente ? "Leyendo los planos… (puede tardar unos minutos)" : "Generar proyecto"}
        </button>
      </form>
    </main>
  );
}
