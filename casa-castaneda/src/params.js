// Parámetros extraídos de los planos (Casa Castañeda – Santa Rosa, versión 3)
// Sistema de coordenadas del modelo (metros):
//   X = largo de la casa, oeste (0) -> este (16.7)
//   Y = profundidad, norte (0, eje A) -> sur (9.0, eje D)
//   Z = altura sobre el nivel de terreno (piso terminado +0.28)
export const P = {
  floorZ: 0.28,
  houseL: 16.7,
  houseD: 9.0,
  wallT: 0.15,

  // Cubierta (planta de cubiertas 1:50)
  roofL: 16.81,
  roofX0: -0.055,
  ridgeY: 4.42,
  ridgeZ: 5.35, // cumbrera +5.35
  kinkOff: 2.28, // distancia cumbrera -> quiebre
  kinkZ: 3.92,
  eaveOff: 5.30, // distancia cumbrera -> borde de alero
  eaveZN: 2.90, // alero norte (eje A)
  eaveZS: 2.75, // alero sur (eje D)

  // Frontón cruzado sobre la terraza
  gableW: 5.91,
  gableX0: 4.34,
  gableFront: 0.50, // prolongación del frontón fuera del alero

  // Espesores de capas de cubierta
  tileT: 0.05,
  battenT: 0.04,
};

// Derivados
P.gableXc = P.gableX0 + P.gableW / 2;
P.yNorthEave = P.ridgeY - P.eaveOff;
P.ySouthEave = P.ridgeY + P.eaveOff;
P.yKinkN = P.ridgeY - P.kinkOff;
P.yKinkS = P.ridgeY + P.kinkOff;
P.yGableFront = P.ySouthEave + P.gableFront;

// Pendientes
P.slopeUp = (P.ridgeZ - P.kinkZ) / P.kinkOff;
P.slopeLowN = (P.kinkZ - P.eaveZN) / (P.eaveOff - P.kinkOff);
P.slopeLowS = (P.kinkZ - P.eaveZS) / (P.eaveOff - P.kinkOff);

// Altura de la cubierta en y (plano principal, sin frontón)
export function mainZ(y) {
  const d = y - P.ridgeY;
  const a = Math.abs(d);
  if (a <= P.kinkOff) return P.ridgeZ - P.slopeUp * a;
  const low = d < 0 ? P.slopeLowN : P.slopeLowS;
  return P.kinkZ - low * (a - P.kinkOff);
}

// Frontón: cumbrera horizontal a la altura del quiebre; la pendiente
// se calcula para que el alero del frontón coincida con el plano principal.
P.gableZr = P.kinkZ;
P.gableSlope = (P.gableZr - (P.kinkZ - P.slopeLowS * (P.yGableFront - P.yKinkS))) / (P.gableW / 2);

export function gableZ(x, y) {
  const dx = Math.abs(x - P.gableXc);
  return P.gableZr - P.gableSlope * dx;
}

// Media anchura del frontón (valle) a la coordenada y
export function valleyHalfW(y) {
  return (P.gableW / 2) * (y - P.yKinkS) / (P.yGableFront - P.yKinkS);
}

// Plano principal sur prolongado más allá del alero (solo bajo el frontón)
export function mainZext(y) {
  return P.kinkZ - P.slopeLowS * (y - P.yKinkS);
}

// ¿(x,y) está dentro de la zona del frontón (triángulo de limahoyas)?
export function inGable(x, y) {
  if (y < P.yKinkS - 1e-6 || y > P.yGableFront + 1e-6) return false;
  return Math.abs(x - P.gableXc) <= valleyHalfW(y) + 1e-6;
}

// Altura de la superficie de cubierta (cara superior de la teja) en (x,y)
export function roofZ(x, y) {
  if (inGable(x, y)) return gableZ(x, y);
  if (y > P.ySouthEave) return mainZext(y);
  return mainZ(y);
}

// Posiciones de las 7 cerchas (alineadas con el frontón: 3 y 5 en sus bordes, 4 en su eje)
export const FRAMES_X = [0.10, 2.17, P.gableX0, P.gableXc, P.gableX0 + P.gableW, 13.53, 16.71];

// Correas: distancia a la cumbrera (una por lado en el quiebre)
export const PURLIN_OFFS = [1.25, P.kinkOff, 3.65];

// Perfiles. Cerchas, correas y cumbrera vienen de la referencia de materiales
// del ejecutor (24/09/2026); el resto sigue siendo un supuesto de referencia.
export const PROFILES = {
  frame:   { name: 'Cercha principal', tube: 'Tubo rect. 150×50×4 mm', w: 0.05, h: 0.15, kgm: 12.06, color: 0xf26a1b, source: 'ejecutor' },
  purlin:  { name: 'Correa',           tube: 'Tubo rect. 120×60×2.5 mm', w: 0.06, h: 0.12, kgm: 6.87, color: 0xffb400, source: 'ejecutor' },
  ridge:   { name: 'Viga cumbrera',    tube: 'Tubo rect. 200×70×4 mm (doble)', w: 0.07, h: 0.20, kgm: 16.45, color: 0xd9342b, source: 'ejecutor' },
  valley:  { name: 'Limahoya',         tube: 'Tubo rect. 150×50×4 mm', w: 0.05, h: 0.15, kgm: 12.06, color: 0x1fb5a8, source: 'referencia' },
  gableRaf:{ name: 'Cerchuela de frontón', tube: 'Tubo rect. 80×40×2 mm', w: 0.04, h: 0.08, kgm: 3.90, color: 0x5fd3c6, source: 'referencia' },
  tie:     { name: 'Solera de amarre', tube: 'Tubo rect. 100×50×2.5 mm', w: 0.05, h: 0.10, kgm: 5.69, color: 0x3d7fb5, source: 'referencia' },
  // Pérgola y cochera: boceto del ejecutor (25/09/2026)
  pergolaCol: { name: 'Pérgola / cochera — columnas', tube: 'Tubo cuad. 120×120×4 mm', w: 0.12, h: 0.12, kgm: 14.57, color: 0x5d6b78, source: 'ejecutor' },
  pergola: { name: 'Pérgola / cochera — vigas', tube: 'Tubo rect. 100×50×2.5 mm', w: 0.05, h: 0.10, kgm: 5.69, color: 0x9aa3ae, source: 'ejecutor' },
};

// Etapas de obra: la cubierta de la casa se ejecuta primero; la pérgola y la
// cochera son un trabajo aparte, en otro momento.
export const STAGES = {
  casa: ['frame', 'ridge', 'purlin', 'valley', 'gableRaf', 'tie'],
  pergolas: ['pergolaCol', 'pergola'],
};
export const STAGE_INFO = {
  casa: { n: 1, name: 'Estructura de cubierta de la casa', short: 'Casa' },
  pergolas: { n: 2, name: 'Pérgola y cochera', short: 'Pérgolas' },
};
