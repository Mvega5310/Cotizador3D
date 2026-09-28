// Shape del cuadro de cantidades tal como lo produce
// packages/engine/src/kits/gableRoofTruss.js::computeBom y como se guarda
// en Resultado.bom (ver prisma/schema.prisma).
export type BomRow = { len: number; n: number; kg: number };
export type Bom = Record<string, BomRow> & {
  _total: { kg: number; len: number; nodes: number };
};
