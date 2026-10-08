import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/datos";

// Los tokens los generamos nosotros (randomBytes(16).toString('hex')): siempre
// 32 caracteres hexadecimales. Cualquier otra cosa en la URL se rechaza antes
// de tocar el sistema de archivos, para no armar una ruta con lo que venga.
const TOKEN_VALIDO = /^[0-9a-f]{32}$/;
const CARPETA_PDF = path.join(DATA_DIR, "pdf");

// Un PDF que lleva más que esto "generando" (contado desde que empezó de
// verdad, no desde que entró a la cola) se cortó, p. ej. por un despliegue:
// la página lo muestra como error y el botón se puede volver a usar. Va aquí
// y no en lib/actions/pdf.ts porque un archivo "use server" solo exporta
// funciones async.
export const PDF_MAX_MS = 10 * 60 * 1000;

export function pdfVencido(r: { pdfEstado: string | null; pdfIniciado: Date | null } | null | undefined): boolean {
  return r?.pdfEstado === "generando" && !!r.pdfIniciado && Date.now() - r.pdfIniciado.getTime() > PDF_MAX_MS;
}

export function tokenValido(token: string): boolean {
  return TOKEN_VALIDO.test(token);
}

export function rutaPdf(token: string): string {
  if (!tokenValido(token)) throw new Error("Token inválido.");
  return path.join(CARPETA_PDF, `${token}.pdf`);
}

// `token` es Resultado.pdfToken, propio del PDF (no el de un link).
export function guardarPdf(token: string, datos: Uint8Array) {
  fs.mkdirSync(CARPETA_PDF, { recursive: true });
  fs.writeFileSync(rutaPdf(token), datos);
}

export function borrarPdf(token: string) {
  try {
    fs.rmSync(rutaPdf(token), { force: true });
  } catch (e) {
    console.warn("[pdf] no se pudo borrar", token, e instanceof Error ? e.message : e);
  }
}
