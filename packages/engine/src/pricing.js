// Cotización sobre el cálculo del intérprete (interprete.js::calcularProyecto).
// Cada línea se cobra en su propia unidad: precio por unidad, desperdicio sobre
// cantidades y mano de obra como porcentaje sobre materiales.
//   precios: precio por unidad, por clave de pieza o, si no hay, por unidad ({ tubo50: 9000, kg: 8500, und: 500 })
/**
 * @param {any} calculo  resultado de calcularProyecto (basta { lineas, porEtapa })
 * @param {{ precios?: Record<string, number>, desperdicioPct?: number, manoObraPct?: number, etapa?: string | number }} [opciones]
 * @returns {any}
 */
export function calcCotizacion(calculo, { precios = {}, desperdicioPct = 0, manoObraPct = 0, etapa = 'todo' } = {}) {
  const lineas = etapa === 'todo' ? calculo.lineas : calculo.porEtapa[etapa]?.lineas;
  if (!lineas) throw new Error(`Etapa desconocida: ${etapa}`);
  const factor = 1 + Math.max(0, desperdicioPct) / 100;
  const detalle = lineas.map((l) => {
    const cantidadConDesperdicio = l.cantidad * factor;
    const precio = precios[l.piezaId] ?? precios[l.unidad] ?? 0;
    return { ...l, cantidadConDesperdicio, precio, subtotal: cantidadConDesperdicio * precio };
  });
  const materiales = detalle.reduce((a, d) => a + d.subtotal, 0);
  const manoObra = (materiales * Math.max(0, manoObraPct)) / 100;
  return { etapa, detalle, materiales, manoObra, total: materiales + manoObra, tienePrecio: detalle.some((d) => d.precio > 0) };
}
