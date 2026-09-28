"use client";

import { useActionState } from "react";
import { createProjectAction, type ProjectFormState } from "@/lib/actions/projects";

const initialState: ProjectFormState = {};

function Field({
  id, label, unit, defaultValue, step = "0.01",
}: { id: string; label: string; unit?: string; defaultValue: number; step?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label} {unit && <span className="text-neutral-400 font-normal">({unit})</span>}
      </label>
      <input
        id={id} name={id} type="number" step={step} required defaultValue={defaultValue}
        className="w-full border border-neutral-300 rounded px-3 py-2"
      />
    </div>
  );
}

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-1">Nuevo proyecto</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Kit: cubierta a dos aguas + cerchas metálicas. Ingresa las medidas —
        más adelante estos números vendrán de leer tus planos, hoy se
        confirman a mano, igual que en la etapa de revisión del producto.
      </p>

      <form action={formAction} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="cliente" className="text-sm font-medium">Cliente</label>
          <input id="cliente" name="cliente" type="text" required
            className="w-full border border-neutral-300 rounded px-3 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="length" label="Largo" unit="m" defaultValue={16.7} />
          <Field id="depth" label="Profundidad" unit="m" defaultValue={9} />
          <Field id="eaveHeight" label="Altura de alero" unit="m" defaultValue={2.9} />
          <Field id="ridgeHeight" label="Altura de cumbrera" unit="m" defaultValue={5.35} />
          <Field id="trussCount" label="Número de cerchas" defaultValue={7} step="1" />
          <Field id="purlinsPerSide" label="Correas por faldón" defaultValue={2} step="1" />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending}
          className="bg-neutral-900 text-white rounded px-5 py-2.5 font-medium disabled:opacity-60">
          {pending ? "Generando…" : "Generar modelo 3D"}
        </button>
      </form>
    </main>
  );
}
