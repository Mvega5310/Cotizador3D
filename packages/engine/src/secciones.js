// Sección transversal (ancho y alto, en metros) a partir del nombre de una
// pieza, para cuando la IA no la pone en dimensiones: sin sección, la forma
// `viga` no es válida y el elemento se descartaría (justo la estructura).
//
//   "Tubo rect. 150×50×4 mm"  -> 0,05 × 0,15   (alto = peralte, el lado mayor)
//   "Viga 3″×6″"               -> 0,0762 × 0,1524
//   "Tubo redondo Ø 2″ x 2,5 mm" -> 0,0508 × 0,0508 (diámetro; el espesor no cuenta)
//   "IPE 300", "HEA 200"       -> peralte por la designación; ancho aproximado
//
// Devuelve null si no se puede leer con seguridad ("2x4" sin unidad es
// ambiguo: ¿pulgadas o mm?). Sin unidad y con números grandes, se asume mm.

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIDAD = String.raw`\s*(″|"|''|mm|cm|m(?![a-z]))?`;
const RECT = new RegExp(`${NUM}${UNIDAD}\\s*[x×X*]\\s*${NUM}${UNIDAD}`, 'i');
const DIAM = new RegExp(`(?:Ø|ø|⌀|diám(?:etro)?\\.?)\\s*${NUM}${UNIDAD}`, 'i');
const PERFIL = /\b(IPE|IPN|HEA|HEB|UPN|W)\s*(\d{2,4})\b/i;

const num = (s) => Number(String(s).replace(',', '.'));
const factor = (u) => {
  const x = (u || '').toLowerCase();
  if (x === '″' || x === '"' || x === "''") return 0.0254;
  if (x === 'cm') return 0.01;
  if (x === 'm') return 1;
  return 0.001; // mm o sin unidad
};
const razonable = (a, b) => a > 0.003 && b > 0.003 && a < 2 && b < 2;

/**
 * @param {string} nombre
 * @returns {{ ancho: number, alto: number } | null}
 */
export function seccionDesdeNombre(nombre) {
  const texto = String(nombre ?? '');

  const p = texto.match(PERFIL);
  if (p) {
    const alto = num(p[2]) / 1000;
    const tipo = p[1].toUpperCase();
    // Ancho de ala aproximado según la familia: suficiente para dibujar y
    // pesar por factor; el peso real lo da el factor kg/m del catálogo.
    const ancho = tipo === 'HEA' || tipo === 'HEB' || tipo === 'W' ? alto : tipo === 'UPN' ? alto * 0.35 : alto * 0.5;
    return razonable(ancho, alto) ? { ancho, alto } : null;
  }

  // El diámetro va antes que el patrón rectangular: un tubo redondo se nombra
  // "diámetro × espesor" ("Ø 2″ x 2,5 mm"), y leído como rectángulo el
  // espesor pasaría por segunda dimensión, sin aviso.
  const d = texto.match(DIAM);
  if (d) {
    const v = num(d[1]);
    if (!d[2] && v < 20) return null;
    const lado = v * factor(d[2]);
    return razonable(lado, lado) ? { ancho: lado, alto: lado } : null;
  }

  const r = texto.match(RECT);
  if (r) {
    const a = num(r[1]), b = num(r[3]);
    if (!r[2] && !r[4] && Math.max(a, b) < 20) return null; // "2x4" sin unidad: ambiguo
    // Cada número con su unidad ("4″ x 50 mm"); si solo uno la trae ("3 x 6″"),
    // vale para los dos.
    const ancho1 = a * factor(r[2] || r[4]), ancho2 = b * factor(r[4] || r[2]);
    const ancho = Math.min(ancho1, ancho2), alto = Math.max(ancho1, ancho2);
    return razonable(ancho, alto) ? { ancho, alto } : null;
  }
  return null;
}
