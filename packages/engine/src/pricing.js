// Cotización sobre el cálculo del intérprete (interprete.js::calcularProyecto).
// Cada línea se cobra en su propia unidad: precio por unidad, desperdicio sobre
// cantidades y mano de obra como porcentaje sobre materiales, más un valor
// fijo si se cotiza así ("mano de obra $400.000").
//   precios: precio por unidad, por clave de pieza o, si no hay, por unidad ({ tubo50: 9000, kg: 8500, und: 500 })
/**
 * @param {any} calculo  resultado de calcularProyecto (basta { lineas, porEtapa })
 * @param {{ precios?: Record<string, number>, desperdicioPct?: number, manoObraPct?: number, manoObraValor?: number, etapa?: string | number }} [opciones]
 * @returns {any}
 */
export function calcCotizacion(calculo, { precios = {}, desperdicioPct = 0, manoObraPct = 0, manoObraValor = 0, etapa = 'todo' } = {}) {
  const lineas = etapa === 'todo' ? calculo.lineas : calculo.porEtapa[etapa]?.lineas;
  if (!lineas) throw new Error(`Etapa desconocida: ${etapa}`);
  const factor = 1 + Math.max(0, desperdicioPct) / 100;
  const detalle = lineas.map((l) => {
    const cantidadConDesperdicio = l.cantidad * factor;
    const precio = precios[l.piezaId] ?? precios[l.unidad] ?? 0;
    return { ...l, cantidadConDesperdicio, precio, subtotal: cantidadConDesperdicio * precio };
  });
  const materiales = detalle.reduce((a, d) => a + d.subtotal, 0);
  const manoObra = (materiales * Math.max(0, manoObraPct)) / 100 + Math.max(0, manoObraValor);
  const tienePrecio = detalle.some((d) => d.precio > 0) || manoObraValor > 0;
  return { etapa, detalle, materiales, manoObra, total: materiales + manoObra, tienePrecio };
}

// Presupuesto con APU, AIU, IVA y retenciones (la forma usual de cotizar obra
// en Colombia). Cada línea del cuadro de cantidades es un ítem; su valor
// unitario es su análisis de precio unitario (APU):
//   material × (1 + desperdicio del ítem) + mano de obra + equipo + transporte
// todo por unidad del ítem. La cantidad es la medida, sin inflar: el
// desperdicio encarece el material, no agrega obra.
//
//   precios:  material por unidad, por clave de línea (o por unidad, como en calcCotizacion)
//   apu:      { [clave]: { desperdicioPct?, manoObra?, equipo?, transporte? } } ($ por unidad)
//   desperdicioPct: el de los ítems que no lo definen; los que se cuentan por
//             unidad ('und': bisagras, pernos, galones) van en 0 salvo que el ítem diga otra cosa
//   manoObraPct / manoObraValor: mano de obra global (para quien no la cotiza por ítem)
//   aiu:      { a, i, u } en % sobre el costo directo
//   iva:      { regimen: 'ninguno' | 'utilidad' | 'total', tarifa (%) }
//               utilidad: contrato de obra con AIU, el IVA va sobre la utilidad
//               total:    venta o suministro, el IVA va sobre todo
//   retenciones: { fuente (% del subtotal sin IVA), iva (% del IVA), ica (por mil del subtotal) }
//               las practica quien paga; se restan para mostrar el neto a recibir
/**
 * @param {any} calculo
 * @param {any} [opciones]
 * @returns {any}
 */
export function calcPresupuesto(calculo, opciones = {}) {
  const {
    precios = {}, apu = {}, desperdicioPct = 0, manoObraPct = 0, manoObraValor = 0,
    aiu = {}, iva = {}, retenciones = {}, etapa = 'todo',
  } = opciones;
  const lineas = etapa === 'todo' ? calculo.lineas : calculo.porEtapa[etapa]?.lineas;
  if (!lineas) throw new Error(`Etapa desconocida: ${etapa}`);
  const pos = (n) => (Number.isFinite(n) && n > 0 ? n : 0);

  const detalle = lineas.map((l) => {
    const a = apu[l.piezaId] ?? {};
    const desp = Number.isFinite(a.desperdicioPct) ? pos(a.desperdicioPct) : l.unidad === 'und' ? 0 : pos(desperdicioPct);
    const material = pos(precios[l.piezaId] ?? precios[l.unidad]);
    const materialConDesp = material * (1 + desp / 100);
    const mo = pos(a.manoObra), eq = pos(a.equipo), tr = pos(a.transporte);
    const valorUnitario = materialConDesp + mo + eq + tr;
    return {
      ...l, desperdicioPct: desp, material, materialConDesp, manoObra: mo, equipo: eq, transporte: tr,
      valorUnitario, subtotal: l.cantidad * valorUnitario, conApu: mo + eq + tr > 0,
    };
  });

  const suma = (f) => detalle.reduce((s, d) => s + d.cantidad * f(d), 0);
  const materiales = suma((d) => d.materialConDesp);
  const manoObraItems = suma((d) => d.manoObra);
  const equipo = suma((d) => d.equipo);
  const transporte = suma((d) => d.transporte);
  const manoObraGlobal = (materiales * pos(manoObraPct)) / 100 + pos(manoObraValor);
  const costoDirecto = materiales + manoObraItems + equipo + transporte + manoObraGlobal;

  const administracion = (costoDirecto * pos(aiu.a)) / 100;
  const imprevistos = (costoDirecto * pos(aiu.i)) / 100;
  const utilidad = (costoDirecto * pos(aiu.u)) / 100;
  const subtotal = costoDirecto + administracion + imprevistos + utilidad;

  const tarifa = Number.isFinite(iva.tarifa) ? pos(iva.tarifa) : 19;
  const regimen = ['utilidad', 'total'].includes(iva.regimen) ? iva.regimen : 'ninguno';
  const baseIva = regimen === 'utilidad' ? utilidad : regimen === 'total' ? subtotal : 0;
  const valorIva = (baseIva * tarifa) / 100;
  const total = subtotal + valorIva;

  const reteFuente = (subtotal * pos(retenciones.fuente)) / 100;
  const reteIva = (valorIva * pos(retenciones.iva)) / 100;
  const reteIca = (subtotal * pos(retenciones.ica)) / 1000;

  return {
    etapa, detalle,
    materiales, manoObra: manoObraItems + manoObraGlobal, equipo, transporte, costoDirecto,
    administracion, imprevistos, utilidad, subtotal,
    iva: { regimen, tarifa, base: baseIva, valor: valorIva },
    total,
    retenciones: { fuente: reteFuente, iva: reteIva, ica: reteIca, total: reteFuente + reteIva + reteIca },
    neto: total - (reteFuente + reteIva + reteIca),
    tienePrecio: costoDirecto > 0,
  };
}
