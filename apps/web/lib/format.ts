export const UNIDAD_LABEL: Record<string, string> = { kg: "kg", m2: "m²", m3: "m³", ml: "m", und: "und" };

export function cantidadTexto(n: number, unidad: string) {
  const dec = unidad === "und" ? 0 : 1;
  return `${n.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec })} ${UNIDAD_LABEL[unidad] ?? unidad}`;
}

export const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
