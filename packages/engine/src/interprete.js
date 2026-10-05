import * as THREE from 'three';
import { FORMAS } from './formas.js';
import { defaultViewsFromBbox } from './vistas.js';

// Intérprete de elementos: convierte la lista de elementos de un proyecto
// (datos) en cuadro de cantidades por etapa y en escena 3D. No conoce ningún
// producto en particular; todo lo específico vive en las formas y el catálogo.
//
// elemento:  { id, nombre, forma, geometria, pieza, etapa?, unidad?, origen?, confirmado? }
//   pieza:   clave dentro del catálogo
//   etapa:   número de etapa (por defecto 1)
//   unidad:  'kg' | 'm2' | 'm3' | 'ml' | 'und' (por defecto la unidad de la pieza)
// catalogo:  { [clave]: { id, nombre, unidad, dimensiones, factor? } }
// etapas:    [{ numero, nombre }] (opcional, solo para rotular)
//
// Los elementos con problemas no se descartan en silencio: salen en `errores`
// para que la pantalla de revisión se los muestre al usuario.

const UNIDADES = ['kg', 'm2', 'm3', 'ml', 'und'];
const vacio = () => ({ kg: 0, m2: 0, m3: 0, ml: 0, und: 0 });

// Mide un solo elemento: valida forma, pieza, geometría y unidad, y devuelve la
// cantidad en la unidad de cobro. Es lo que usa calcularProyecto y lo que la
// web usa para guardar la cantidad de cada elemento.
/**
 * @param {any} el
 * @param {Record<string, any>} [catalogo]
 * @returns {any}
 */
export function medirElemento(el, catalogo = {}) {
  const forma = FORMAS[el.forma];
  if (!forma) return { ok: false, codigo: 'forma_desconocida', mensaje: `La forma "${el.forma}" no existe en el motor.` };
  const pieza = catalogo[el.pieza];
  if (!pieza) return { ok: false, codigo: 'pieza_desconocida', mensaje: `La pieza "${el.pieza}" no está en el catálogo.` };
  const problema = forma.validar(el.geometria, pieza);
  if (problema) return { ok: false, codigo: 'geometria_invalida', mensaje: problema };

  const medidas = forma.medir(el.geometria, pieza);
  if (Number.isFinite(pieza.factor)) medidas.kg = medidas[forma.unidadBase] * pieza.factor;
  const unidad = el.unidad ?? pieza.unidad;
  if (!UNIDADES.includes(unidad) || !(unidad in medidas)) {
    return { ok: false, codigo: 'unidad_no_disponible', mensaje: `La forma "${el.forma}" con la pieza "${pieza.nombre}" no puede cotizarse en "${unidad}".` };
  }
  return { ok: true, forma, pieza, unidad, cantidad: medidas[unidad], medidas };
}

/**
 * @param {{ elementos: any[], catalogo?: Record<string, any>, etapas?: { numero: number, nombre: string }[] }} proyecto
 * @returns {any}
 */
export function calcularProyecto({ elementos, catalogo = {}, etapas = [] }) {
  const errores = [];
  const validos = [];
  const lineas = new Map();
  const nombreEtapa = (n) => etapas.find((e) => e.numero === n)?.nombre ?? `Etapa ${n}`;

  for (const el of elementos) {
    const m = medirElemento(el, catalogo);
    if (!m.ok) { errores.push({ elementoId: el.id, codigo: m.codigo, mensaje: m.mensaje }); continue; }
    const { forma, pieza, unidad, cantidad } = m;

    const etapa = el.etapa ?? 1;
    const clave = `${etapa}|${el.pieza}|${unidad}`;
    const linea = lineas.get(clave) ?? { etapa, piezaId: el.pieza, nombre: pieza.nombre, unidad, cantidad: 0, n: 0, confirmado: true, origenes: new Set() };
    linea.cantidad += cantidad;
    linea.n += 1;
    linea.confirmado = linea.confirmado && el.confirmado !== false;
    linea.origenes.add(el.origen ?? 'usuario');
    lineas.set(clave, linea);

    // Consumos que salen de la pieza pero se cotizan en su propia línea (p. ej.
    // el canto de un tablero). Su clave es la de la pieza + sufijo, así que
    // tienen precio propio; `derivada` marca que no tienen elementos propios:
    // se confirman y se corrigen a través de los elementos que los generan.
    for (const ex of forma.extras?.(el.geometria, pieza) ?? []) {
      const piezaId = `${el.pieza}#${ex.sufijo}`;
      const claveEx = `${etapa}|${piezaId}|${ex.unidad}`;
      const lx = lineas.get(claveEx) ?? { etapa, piezaId, nombre: ex.nombre, unidad: ex.unidad, cantidad: 0, n: 0, confirmado: true, origenes: new Set(), derivada: true };
      lx.cantidad += ex.cantidad;
      lx.n += 1;
      lx.confirmado = lx.confirmado && el.confirmado !== false;
      lx.origenes.add(el.origen ?? 'usuario');
      lineas.set(claveEx, lx);
    }
    validos.push({ ...el, _forma: forma, _pieza: pieza });
  }

  const listado = [...lineas.values()]
    .map((l) => ({ ...l, origenes: [...l.origenes] }))
    .sort((a, b) => a.etapa - b.etapa || a.nombre.localeCompare(b.nombre));

  const porEtapa = {};
  const total = vacio();
  for (const l of listado) {
    const e = (porEtapa[l.etapa] ??= { nombre: nombreEtapa(l.etapa), lineas: [], totales: vacio() });
    e.lineas.push(l);
    e.totales[l.unidad] += l.cantidad;
    total[l.unidad] += l.cantidad;
  }

  const { despiece, laminas } = calcularDespiece(validos);
  return { lineas: listado, porEtapa, total, bbox: calcularBbox(validos), errores, validos, despiece, laminas };
}

// Lista de cortes: las piezas de las formas que tienen `despiece` (tableros),
// agrupadas cuando son iguales (mismo material, mismas medidas al milímetro y
// mismos cantos), ordenadas por material y de mayor a menor. Es lo que el
// taller lleva a la seccionadora.
//
// laminas: por material, el área total y — si la pieza del catálogo dice el
// tamaño de su lámina — el mínimo de láminas por área. Es un piso, no un plan
// de corte: no cuenta el desperdicio de acomodar las piezas en la lámina.
function calcularDespiece(validos) {
  const mm = (m) => Math.round(m * 1000);
  const grupos = new Map();
  const materiales = new Map();
  for (const el of validos) {
    if (!el._forma.despiece) continue;
    const { largo, ancho, espesor, cantos } = el._forma.despiece(el.geometria);
    const fila = { largo: mm(largo), ancho: mm(ancho), espesor: mm(espesor), cantos };
    const clave = `${el.pieza}|${fila.largo}|${fila.ancho}|${fila.espesor}|${cantos.join(',')}`;
    const g = grupos.get(clave) ?? { piezaId: el.pieza, material: el._pieza.nombre, ...fila, cantidad: 0, nombres: new Set(), confirmado: true };
    g.cantidad += 1;
    g.nombres.add(el.nombre ?? '');
    g.confirmado = g.confirmado && el.confirmado !== false;
    grupos.set(clave, g);

    const d = el._pieza.dimensiones || {};
    const mat = materiales.get(el.pieza) ?? { piezaId: el.pieza, nombre: el._pieza.nombre, m2: 0, piezas: 0, lamina: null, minimo: null, noCaben: 0 };
    mat.m2 += largo * ancho;
    mat.piezas += 1;
    if (d.lamina_largo > 0 && d.lamina_ancho > 0) {
      const [L, A] = [d.lamina_largo, d.lamina_ancho].sort((a, b) => b - a);
      mat.lamina = [L, A];
      if (largo > L + 1e-9 || ancho > A + 1e-9) mat.noCaben += 1;
    }
    materiales.set(el.pieza, mat);
  }

  const despiece = [...grupos.values()]
    .map((g) => ({ ...g, nombres: [...g.nombres].filter(Boolean) }))
    .sort((a, b) => a.material.localeCompare(b.material) || b.largo - a.largo || b.ancho - a.ancho);
  const laminas = [...materiales.values()].map((m) => ({
    ...m,
    minimo: m.lamina ? Math.ceil(m.m2 / (m.lamina[0] * m.lamina[1]) - 1e-9) : null,
  }));
  return { despiece, laminas };
}

function calcularBbox(validos) {
  if (!validos.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const el of validos) {
    const [a, b] = el._forma.bbox(el.geometria);
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], a[i]); max[i] = Math.max(max[i], b[i]); }
  }
  return { x0: min[0], x1: max[0], y0: min[1], y1: max[1], z0: Math.min(0, min[2]), z1: max[2] };
}

// Escena 3D (solo navegador): un grupo por etapa, listo para pasarle al Viewer
// como `layers`, más las vistas de cámara calculadas del bounding box.
/**
 * @param {any} proyecto  { elementos, catalogo, etapas } o { calculo }
 * @returns {any}
 */
export function construirEscena(proyecto) {
  const calculo = proyecto.calculo ?? calcularProyecto(proyecto);
  const layers = {};
  for (const el of calculo.validos) {
    const grupo = (layers[`etapa-${el.etapa ?? 1}`] ??= new THREE.Group());
    grupo.add(el._forma.dibujar(el.geometria, el._pieza));
  }
  return { layers, bbox: calculo.bbox, views: calculo.bbox ? defaultViewsFromBbox(calculo.bbox) : {}, calculo };
}
