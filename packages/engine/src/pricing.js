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
