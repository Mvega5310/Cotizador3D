// Cotización a partir de un BOM (cuadro de cantidades). Extraído y generalizado
// de la calculadora en casa-castaneda/src/main.js — misma fórmula, sin acoplar a UI.

// bom: mismo shape que casa-castaneda/data/bom.json → { [clave]: {kg, len, n}, _stage: {...}, _total: {...} }
export function calcQuote(bom, { wastePct = 0, pricePerKg = 0, pricePerNode = 0, stage = 'todo' } = {}) {
  const scope = stage === 'todo' ? bom._total : bom._stage[stage];
  if (!scope) throw new Error(`Etapa desconocida: ${stage}`);
  const waste = Math.max(0, wastePct) / 100;
  const kgWithWaste = scope.kg * (1 + waste);
  const total = kgWithWaste * pricePerKg + scope.nodes * pricePerNode;
  return {
    stage,
    kgBase: scope.kg,
    kgWithWaste,
    nodes: scope.nodes,
    total,
    hasPrice: pricePerKg > 0 || pricePerNode > 0,
  };
}

// Cotización sobre el cálculo del intérprete (interprete.js::calcularProyecto).
// Cada línea se cobra en su propia unidad: precio por unidad, desperdicio sobre
// cantidades y mano de obra como porcentaje sobre materiales.
//   precios: { kg?, m2?, m3?, ml?, und? }
export function calcCotizacion(calculo, { precios = {}, desperdicioPct = 0, manoObraPct = 0, etapa = 'todo' } = {}) {
  const lineas = etapa === 'todo' ? calculo.lineas : calculo.porEtapa[etapa]?.lineas;
  if (!lineas) throw new Error(`Etapa desconocida: ${etapa}`);
  const factor = 1 + Math.max(0, desperdicioPct) / 100;
  const detalle = lineas.map((l) => {
    const cantidadConDesperdicio = l.cantidad * factor;
    const precio = precios[l.unidad] ?? 0;
    return { ...l, cantidadConDesperdicio, precio, subtotal: cantidadConDesperdicio * precio };
  });
  const materiales = detalle.reduce((a, d) => a + d.subtotal, 0);
  const manoObra = (materiales * Math.max(0, manoObraPct)) / 100;
  return { etapa, detalle, materiales, manoObra, total: materiales + manoObra, tienePrecio: detalle.some((d) => d.precio > 0) };
}
