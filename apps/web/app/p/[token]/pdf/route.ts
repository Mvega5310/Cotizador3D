import fs from "fs";
import { rutaPdf, tokenValido } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenValido(token)) return new Response("Enlace inválido.", { status: 404 });

  const archivo = rutaPdf(token);
  if (!fs.existsSync(archivo)) return new Response("El PDF todavía no se ha generado para este proyecto.", { status: 404 });

  const datos = fs.readFileSync(archivo);
  return new Response(new Uint8Array(datos), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="proyecto.pdf"' },
  });
}
