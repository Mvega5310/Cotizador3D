import { calcCotizacion } from "@cotizador3d/engine";

// Cotización guardada de un proyecto (Proyecto.cotizacion). Las claves de
// `precios` son las de las líneas del cuadro de cantidades: el id de la pieza
// del catálogo, o "<id>#canto" para las líneas derivadas (interprete.js).
//
// deDescripcion: claves cuyo precio lo leyó la IA de lo que escribió el
// usuario (nunca lo inventa — ver lib/ia.ts). Se muestran marcadas hasta que
// el usuario las toque; ahí pasan a ser suyas.
export type Cotizacion = {
  precios: Record<string, number>;
  desperdicioPct: number;
  manoObraPct: number;
  manoObraValor: number;
  deDescripcion: string[];
};

export const COTIZACION_INICIAL: Cotizacion = { precios: {}, desperdicioPct: 8, manoObraPct: 0, manoObraValor: 0, deDescripcion: [] };

const numero = (v: unknown, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

// Lee lo guardado (o lo que manda el navegador) y descarta lo que no tenga
// sentido, en vez de confiar en la forma del JSON.
export function leerCotizacion(crudo: unknown): Cotizacion {
  const c = (crudo && typeof crudo === "object" ? crudo : {}) as Record<string, unknown>;
  const precios: Record<string, number> = {};
  if (c.precios && typeof c.precios === "object") {
    for (const [k, v] of Object.entries(c.precios as Record<string, unknown>)) {
      const n = numero(v, 0, 1e12);
      if (n !== null && n > 0 && k.length <= 100) precios[k] = n;
    }
  }
  return {
    precios,
    desperdicioPct: numero(c.desperdicioPct, 0, 100) ?? COTIZACION_INICIAL.desperdicioPct,
    manoObraPct: numero(c.manoObraPct, 0, 1000) ?? 0,
    manoObraValor: numero(c.manoObraValor, 0, 1e12) ?? 0,
    deDescripcion: Array.isArray(c.deDescripcion) ? c.deDescripcion.filter((k): k is string => typeof k === "string" && k in precios) : [],
  };
}

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number };

// Resumen listo para mostrar (PDF, link completo): solo datos planos.
export function resumirCotizacion(calculo: { lineas: Linea[]; porEtapa: Record<string, { lineas: Linea[] }> }, cot: Cotizacion) {
  const r = calcCotizacion(calculo, { precios: cot.precios, desperdicioPct: cot.desperdicioPct, manoObraPct: cot.manoObraPct, manoObraValor: cot.manoObraValor });
  return {
    tienePrecio: r.tienePrecio as boolean,
    desperdicioPct: cot.desperdicioPct,
    detalle: (r.detalle as (Linea & { cantidadConDesperdicio: number; precio: number; subtotal: number })[]).map((d) => ({
      piezaId: d.piezaId, etapa: d.etapa, nombre: d.nombre, unidad: d.unidad,
      cantidad: d.cantidadConDesperdicio, precio: d.precio, subtotal: d.subtotal,
    })),
    materiales: r.materiales as number,
    manoObra: r.manoObra as number,
    total: r.total as number,
  };
}

export type ResumenCotizacion = ReturnType<typeof resumirCotizacion>;
