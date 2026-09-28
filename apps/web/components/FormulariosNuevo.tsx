"use client";

import { useActionState } from "react";
import { crearDesdeEjemploAction, importarJsonAction, type EstadoForm } from "@/lib/actions/proyectos";

const inicial: EstadoForm = {};

type Ejemplo = { clave: string; nombre: string };

const CAMPO = "w-full border border-neutral-300 rounded px-3 py-2";

export default function FormulariosNuevo({ ejemplos }: { ejemplos: readonly Ejemplo[] }) {
  const [ej, ejAction, ejPending] = useActionState(crearDesdeEjemploAction, inicial);
  const [js, jsAction, jsPending] = useActionState(importarJsonAction, inicial);

  return (
    <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Nuevo proyecto</h1>
        <p className="text-sm text-neutral-500">
          Un proyecto es una lista de elementos: cada uno con su forma, su pieza del catálogo, su etapa y su origen.
          Mientras no exista la lectura automática de planos, se crea desde un ejemplo o pegando esa lista.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-medium">Empezar desde un ejemplo</h2>
        <form action={ejAction} className="space-y-4">
          <div className="space-y-2">
            {ejemplos.map((e, i) => (
              <label key={e.clave} className="flex items-start gap-3 border border-neutral-200 rounded p-3 cursor-pointer hover:bg-neutral-50">
                <input type="radio" name="ejemplo" value={e.clave} defaultChecked={i === 0} className="mt-1" />
                <span className="text-sm">{e.nombre}</span>
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <label htmlFor="cliente-ej" className="text-sm font-medium">Cliente (opcional)</label>
            <input id="cliente-ej" name="cliente" type="text" className={CAMPO} />
          </div>
          {ej.error && <p className="text-sm text-red-600">{ej.error}</p>}
          <button type="submit" disabled={ejPending} className="bg-neutral-900 text-white rounded px-5 py-2.5 font-medium disabled:opacity-60">
            {ejPending ? "Creando…" : "Crear desde el ejemplo"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Pegar la lista de elementos (JSON)</h2>
        <form action={jsAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="cliente-js" className="text-sm font-medium">Cliente</label>
              <input id="cliente-js" name="cliente" type="text" required className={CAMPO} />
            </div>
            <div className="space-y-1">
              <label htmlFor="tipoObra" className="text-sm font-medium">Tipo de producto</label>
              <input id="tipoObra" name="tipoObra" type="text" placeholder="cocina_integral" className={CAMPO} />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="json" className="text-sm font-medium">JSON</label>
            <textarea id="json" name="json" rows={8} required spellCheck={false} placeholder='{ "catalogo": { ... }, "elementos": [ ... ] }'
              className={`${CAMPO} font-mono text-xs`} />
            <p className="text-xs text-neutral-500">
              Formas disponibles: viga, panel, volumen, pieza. Si algún elemento no se puede interpretar, se te dice cuál y por qué.
            </p>
          </div>
          {js.error && <p className="text-sm text-red-600">{js.error}</p>}
          <button type="submit" disabled={jsPending} className="border border-neutral-900 rounded px-5 py-2.5 font-medium disabled:opacity-60">
            {jsPending ? "Validando…" : "Validar y crear"}
          </button>
        </form>
      </section>
    </main>
  );
}
