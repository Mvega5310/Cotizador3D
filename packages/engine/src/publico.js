// Catálogo para el link de cliente (y el PDF de presentación): lo que el visor
// del navegador necesita para dibujar, sin los datos del ejecutor con los que
// calcula sus cantidades (factor kg/m real, consumos, tamaño de lámina).
//
// Ojo: el visor no solo dibuja. construirEscena llama a calcularProyecto, que
// descarta todo elemento que no puede medir en su unidad. Una viga cotizada en
// kg necesita `factor`; sin él deja de dibujarse (AUDITORIA.md, H-11 ronda 3:
// así desaparecía la estructura). Por eso va un factor neutro, no ninguno: el
// kg que sale con él no se muestra en ninguna parte del modo cliente.
const DIBUJO = ['ancho', 'alto', 'espesor', 'color', 'opacidad'];

/**
 * @param {Record<string, any>} catalogo
 * @returns {Record<string, any>}
 */
export function catalogoPublico(catalogo) {
  return Object.fromEntries(
    Object.entries(catalogo ?? {}).map(([k, p]) => [
      k,
      {
        id: p.id, nombre: p.nombre, unidad: p.unidad, tipo: p.tipo,
        ...(Number.isFinite(p.factor) ? { factor: 1 } : {}),
        dimensiones: Object.fromEntries(Object.entries(p.dimensiones ?? {}).filter(([d]) => DIBUJO.includes(d))),
      },
    ])
  );
}
