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

  return { lineas: listado, porEtapa, total, bbox: calcularBbox(validos), errores, validos };
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
