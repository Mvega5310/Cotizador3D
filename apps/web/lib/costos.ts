// Precios de la API de Anthropic en US$ por millón de tokens, para estimar el
// costo de cada generación (GeneracionIA.costoUsd). Fuente:
// https://platform.claude.com/docs/en/about-claude/pricing, consultada el
// 2026-10-05. Si Anthropic cambia sus precios hay que actualizar esta tabla;
// lo ya registrado conserva el costo calculado con el precio de su momento.
//
// cacheEscritura es la tarifa de caché de 5 minutos (1,25 × entrada).
type Tarifa = { entrada: number; salida: number; cacheEscritura: number; cacheLectura: number };

const TARIFAS: Record<string, Tarifa> = {
  "claude-opus-5": { entrada: 5, salida: 25, cacheEscritura: 6.25, cacheLectura: 0.5 },
  "claude-opus-5-5": { entrada: 4, salida: 20, cacheEscritura: 5, cacheLectura: 0.2 },
  "claude-sonnet-5": { entrada: 2, salida: 10, cacheEscritura: 2.5, cacheLectura: 0.2 },
  "claude-haiku-4-5": { entrada: 1, salida: 5, cacheEscritura: 1.25, cacheLectura: 0.1 },
};

// stopReason: por qué terminó la respuesta ("end_turn", "max_tokens"…), para
// medir cuántas generaciones se cortan por largo.
export type UsoIA = { modelo: string; inputTokens: number; outputTokens: number; cacheLectura: number; cacheEscritura: number; stopReason?: string };

export function costoUsd(uso: UsoIA): number {
  // Por prefijo, para que una versión con fecha ("claude-haiku-4-5-2025…") use su tarifa.
  const clave = Object.keys(TARIFAS).sort((a, b) => b.length - a.length).find((k) => uso.modelo.startsWith(k));
  if (!clave) {
    console.warn(`[costos] sin tarifa para el modelo ${uso.modelo}; se registra costo 0`);
    return 0;
  }
  const t = TARIFAS[clave];
  return (uso.inputTokens * t.entrada + uso.outputTokens * t.salida + uso.cacheEscritura * t.cacheEscritura + uso.cacheLectura * t.cacheLectura) / 1e6;
}
