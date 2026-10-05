import { calcPresupuesto } from "@cotizador3d/engine";

// Cotización guardada de un proyecto (Proyecto.cotizacion). Las claves de
// `precios` y `apu` son las de las líneas del cuadro de cantidades: el id de
// la pieza del catálogo, "<id>#canto" o "consumo:<nombre>" (interprete.js).
//
// El cálculo es engine/pricing.js::calcPresupuesto: APU por ítem (material
// con su desperdicio + mano de obra + equipo + transporte), costo directo,
// AIU, IVA según régimen y retenciones de referencia.
//
// deDescripcion: claves cuyo precio lo leyó la IA de lo que escribió el
// usuario (nunca lo inventa — ver lib/ia.ts). Se muestran marcadas hasta que
// el usuario las toque; ahí pasan a ser suyas.
export type ApuItem = { desperdicioPct?: number; manoObra?: number; equipo?: number; transporte?: number };
export type RegimenIva = "ninguno" | "utilidad" | "total";
export type Cotizacion = {
  precios: Record<string, number>;
  apu: Record<string, ApuItem>;
  desperdicioPct: number;
  manoObraPct: number;
  manoObraValor: number;
  aiu: { a: number; i: number; u: number };
  iva: { regimen: RegimenIva; tarifa: number };
  retenciones: { fuente: number; iva: number; ica: number };
  deDescripcion: string[];
};

export const COTIZACION_INICIAL: Cotizacion = {
  precios: {}, apu: {}, desperdicioPct: 8, manoObraPct: 0, manoObraValor: 0,
  aiu: { a: 0, i: 0, u: 0 }, iva: { regimen: "ninguno", tarifa: 19 }, retenciones: { fuente: 0, iva: 0, ica: 0 },
  deDescripcion: [],
};

const numero = (v: unknown, min: number, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const objeto = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// Lee lo guardado (o lo que manda el navegador) y descarta lo que no tenga
// sentido, en vez de confiar en la forma del JSON. Las cotizaciones guardadas
// antes del APU (solo precios y porcentajes) se leen igual.
export function leerCotizacion(crudo: unknown): Cotizacion {
  const c = objeto(crudo);
  const precios: Record<string, number> = {};
  for (const [k, v] of Object.entries(objeto(c.precios))) {
    const n = numero(v, 0, 1e12);
    if (n !== null && n > 0 && k.length <= 200) precios[k] = n;
  }
  const apu: Record<string, ApuItem> = {};
  for (const [k, v] of Object.entries(objeto(c.apu))) {
    if (k.length > 200) continue;
    const a = objeto(v);
    const item: ApuItem = {};
    const desp = numero(a.desperdicioPct, 0, 100);
    if (desp !== null) item.desperdicioPct = desp;
    for (const campo of ["manoObra", "equipo", "transporte"] as const) {
      const n = numero(a[campo], 0, 1e12);
      if (n !== null && n > 0) item[campo] = n;
    }
    if (Object.keys(item).length) apu[k] = item;
  }
  const aiu = objeto(c.aiu), iva = objeto(c.iva), ret = objeto(c.retenciones);
  const regimen = iva.regimen === "utilidad" || iva.regimen === "total" ? iva.regimen : "ninguno";
  return {
    precios,
    apu,
    desperdicioPct: numero(c.desperdicioPct, 0, 100) ?? COTIZACION_INICIAL.desperdicioPct,
    manoObraPct: numero(c.manoObraPct, 0, 1000) ?? 0,
    manoObraValor: numero(c.manoObraValor, 0, 1e12) ?? 0,
    aiu: { a: numero(aiu.a, 0, 100) ?? 0, i: numero(aiu.i, 0, 100) ?? 0, u: numero(aiu.u, 0, 100) ?? 0 },
    iva: { regimen, tarifa: numero(iva.tarifa, 0, 100) ?? 19 },
    retenciones: { fuente: numero(ret.fuente, 0, 100) ?? 0, iva: numero(ret.iva, 0, 100) ?? 0, ica: numero(ret.ica, 0, 100) ?? 0 },
    deDescripcion: Array.isArray(c.deDescripcion) ? c.deDescripcion.filter((k): k is string => typeof k === "string" && k in precios) : [],
  };
}

type Linea = { etapa: number; piezaId: string; nombre: string; unidad: string; cantidad: number };
type Calculo = { lineas: Linea[]; porEtapa: Record<string, { lineas: Linea[] }> };

export function presupuesto(calculo: Calculo, cot: Cotizacion, etapa: string = "todo") {
  return calcPresupuesto(calculo, { ...cot, etapa });
}

// Resumen listo para mostrar (PDF, link completo): solo datos planos.
export function resumirCotizacion(calculo: Calculo, cot: Cotizacion) {
  const r = presupuesto(calculo, cot);
  type Detalle = Linea & { desperdicioPct: number; materialConDesp: number; manoObra: number; equipo: number; transporte: number; valorUnitario: number; subtotal: number; conApu: boolean; material: number };
  return {
    tienePrecio: r.tienePrecio as boolean,
    detalle: (r.detalle as Detalle[]).map((d) => ({
      piezaId: d.piezaId, etapa: d.etapa, nombre: d.nombre, unidad: d.unidad, cantidad: d.cantidad,
      desperdicioPct: d.desperdicioPct, material: d.materialConDesp, manoObra: d.manoObra, equipo: d.equipo, transporte: d.transporte,
      valorUnitario: d.valorUnitario, subtotal: d.subtotal, conApu: d.conApu, conPrecio: d.material > 0 || d.conApu,
    })),
    materiales: r.materiales as number, manoObra: r.manoObra as number, equipo: r.equipo as number, transporte: r.transporte as number,
    costoDirecto: r.costoDirecto as number,
    aiu: { ...cot.aiu, administracion: r.administracion as number, imprevistos: r.imprevistos as number, utilidad: r.utilidad as number },
    subtotal: r.subtotal as number,
    iva: r.iva as { regimen: RegimenIva; tarifa: number; base: number; valor: number },
    total: r.total as number,
  };
}

export type ResumenCotizacion = ReturnType<typeof resumirCotizacion>;

export const NOMBRE_REGIMEN: Record<RegimenIva, string> = {
  ninguno: "No responsable de IVA",
  utilidad: "IVA sobre la utilidad (contrato de obra con AIU)",
  total: "IVA sobre el total (venta o suministro)",
};
