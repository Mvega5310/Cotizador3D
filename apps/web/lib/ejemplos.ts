import fs from "fs";
import path from "path";

// Proyectos de ejemplo: viven como datos en projects/<clave>/elementos.json
// (raíz del repo). La lista es fija a propósito: la clave nunca se usa para
// armar una ruta si no está aquí.
export const EJEMPLOS = [
  {
    clave: "casa-castaneda",
    nombre: "Casa Castañeda · estructura metálica de cubierta, pérgola y cochera",
    cliente: "Casa Castañeda",
    tipoObra: "estructura_metalica",
  },
  {
    clave: "porton-reja",
    nombre: "Portón con reja 3 × 2 m",
    cliente: "Portón con reja",
    tipoObra: "porton_reja",
  },
] as const;

export function leerEjemplo(clave: string): unknown {
  const ejemplo = EJEMPLOS.find((e) => e.clave === clave);
  if (!ejemplo) throw new Error("Ejemplo desconocido.");
  const ruta = path.resolve(process.cwd(), "../../projects", ejemplo.clave, "elementos.json");
  return JSON.parse(fs.readFileSync(ruta, "utf8"));
}
