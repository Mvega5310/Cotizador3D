// Vistas de cámara calculadas a partir del volumen que ocupa el proyecto
// (reemplaza las coordenadas fijas de casa-castaneda/src/viewer.js::VIEWS).
// bbox: { x0, x1, y0, y1, z0, z1 } en metros; z0 se asume en el suelo.
export function defaultViewsFromBbox(bbox) {
  const cx = (bbox.x0 + bbox.x1) / 2, cy = (bbox.y0 + bbox.y1) / 2, cz = (bbox.z0 + bbox.z1) / 2;
  const span = Math.max(bbox.x1 - bbox.x0, bbox.y1 - bbox.y0, (bbox.z1 - bbox.z0) * 2);
  const d = span * 1.6;
  return {
    iso: { label: 'Isométrica', pos: [cx + d * 0.7, cy - d * 0.7, cz + d * 0.6], tgt: [cx, cy, cz * 0.7], fov: 28 },
    // Claves históricas (norte/sur); lo que muestran es el frente (desde Y
    // menor, mirando hacia el fondo) y la cara posterior.
    norte: { label: 'Frente', pos: [cx, bbox.y0 - d, cz], tgt: [cx, cy, cz * 0.6], fov: 24 },
    sur: { label: 'Posterior', pos: [cx, bbox.y1 + d, cz], tgt: [cx, cy, cz * 0.6], fov: 24 },
    lateral: { label: 'Lateral', pos: [bbox.x0 - d, cy, cz], tgt: [cx, cy, cz * 0.6], fov: 24 },
    planta: { label: 'Planta', pos: [cx, cy, cz + d * 1.4], tgt: [cx, cy, 0], fov: 26, planTilt: true },
  };
}
