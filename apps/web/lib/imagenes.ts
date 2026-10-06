import sharp from "sharp";

// Formatos que la API de Claude lee: JPEG, PNG, GIF y WebP como imagen, y
// PDF como documento. HEIC (fotos de iPhone) no: se rechaza con un mensaje.
export const FORMATOS_ACEPTADOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const POR_EXTENSION: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf" };

// Algunos navegadores mandan el tipo vacío: se deduce de la extensión.
export function tipoDeArchivo(nombre: string, mime: string): string {
  if (mime) return mime;
  return POR_EXTENSION[nombre.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

// La API reduce las imágenes a 2.576 px por el lado largo en los modelos de
// resolución alta: una foto de 12 megapíxeles no aporta más detalle y sí
// pesa más. Se reduce antes de mandarla (el original se guarda igual).
const LADO_MAX = 2576;

export async function prepararParaIA<T extends { nombre: string; mime: string; datos: Buffer }>(a: T): Promise<T> {
  if (!a.mime.startsWith("image/") || a.mime === "image/gif") return a; // PDF y GIF van tal cual
  try {
    const meta = await sharp(a.datos).metadata();
    const grande = Math.max(meta.width ?? 0, meta.height ?? 0) > LADO_MAX;
    const datos = await sharp(a.datos)
      .rotate() // respeta la orientación con que se tomó la foto
      .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    // Si ya era pequeña, un PNG de líneas puede pesar menos que su versión
    // JPEG: se deja el más liviano. Si era grande, siempre la reducida.
    return grande || datos.length < a.datos.length ? { ...a, mime: "image/jpeg", datos } : a;
  } catch (e) {
    console.warn("[imagenes] no se pudo reducir", a.nombre, e instanceof Error ? e.message : e);
    return a;
  }
}
