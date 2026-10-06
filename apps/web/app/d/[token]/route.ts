import fs from "fs";
import { rutaPdf, tokenValido } from "@/lib/pdf";

// PDF de un proyecto por su token propio (Resultado.pdfToken), distinto de
// los tokens de los links: desde esta dirección no se puede llegar a la vista
// con cantidades. Al regenerar el PDF el token cambia y este enlace deja de
// servir.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const noIndex = { "X-Robots-Tag": "noindex, nofollow" };
  if (!tokenValido(token)) return new Response("Enlace inválido.", { status: 404, headers: noIndex });

  const archivo = rutaPdf(token);
  if (!fs.existsSync(archivo)) {
    return new Response("Este PDF ya no existe: puede que se haya generado uno más nuevo. Pide el enlace actualizado.", { status: 404, headers: noIndex });
  }

  const datos = fs.readFileSync(archivo);
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="cotizacion.pdf"', ...noIndex },
  });
}
