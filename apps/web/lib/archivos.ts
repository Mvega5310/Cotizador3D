import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";

// Guarda en disco los planos/fotos que el usuario subió, junto a su
// descripción, como registro permanente del proyecto (antes se mandaban a la
// IA y se descartaban — no quedaba nada para volver a consultar).
// apps/web/.data/ está fuera de git (son archivos del usuario, no código).
const BASE = path.join(process.cwd(), ".data", "planos");
const NOMBRE_SEGURO = /^[A-Za-z0-9_.-]+$/;

function carpetaProyecto(proyectoId: string) {
  return path.join(BASE, proyectoId);
}

export function rutaArchivo(proyectoId: string, archivo: string): string {
  if (!NOMBRE_SEGURO.test(archivo)) throw new Error("Nombre de archivo inválido.");
  return path.join(carpetaProyecto(proyectoId), archivo);
}

const EXT_POR_MIME: Record<string, string> = {
  "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
};

export type ArchivoGuardado = { tipo: "plano" | "foto"; url: string; mime: string };

// Devuelve una fila por archivo guardado, lista para ArchivoEntrada.create.
export function guardarArchivos(proyectoId: string, archivos: { nombre: string; mime: string; datos: Buffer }[]): ArchivoGuardado[] {
  if (archivos.length === 0) return [];
  const dir = carpetaProyecto(proyectoId);
  fs.mkdirSync(dir, { recursive: true });
  return archivos.map((a) => {
    const ext = EXT_POR_MIME[a.mime] ?? path.extname(a.nombre) ?? "";
    const nombreGuardado = `${randomBytes(6).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(dir, nombreGuardado), a.datos);
    return {
      tipo: a.mime === "application/pdf" ? "plano" : "foto",
      url: `/projects/${proyectoId}/archivos/${nombreGuardado}`,
      mime: a.mime,
    };
  });
}

export function mimePorExtension(nombreArchivo: string): string {
  const ext = path.extname(nombreArchivo).toLowerCase();
  return Object.entries(EXT_POR_MIME).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}
