"use server";

import { revalidatePath } from "next/cache";
import { chromium } from "playwright-core";
import { prisma } from "@/lib/db";
import { obtenerProyecto } from "@/lib/proyectos";
import { guardarPdf } from "@/lib/pdf";

// Genera el PDF abriendo /p/<token>/imprimir en un Chrome sin interfaz y
// esperando a que esa página capture sus propias vistas 3D (VisorImprimible).
// Lanza un navegador dentro del proceso del servidor: funciona en local y en
// un servidor con proceso persistente (Railway, con el Dockerfile de la raíz,
// que trae Chromium); no en hosting serverless (Vercel y similares).
//
// PDF_CHROME_CHANNEL: en local "chrome" (el Chrome instalado en el equipo);
// en el servidor se deja vacío y se usa el Chromium que trae la imagen.
const CANAL = process.env.PDF_CHROME_CHANNEL ?? (process.env.NODE_ENV === "production" ? undefined : "chrome");

export async function generarPdfAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  if (!proyectoId) return;

  // obtenerProyecto exige sesión y que el proyecto sea de la cuenta del
  // usuario — así nadie genera el PDF de un proyecto ajeno.
  const { version } = await obtenerProyecto(proyectoId);
  const token = version.resultado?.linkCompleto;
  if (!token) return;

  // El servidor se llama a sí mismo por la red interna, no por el dominio
  // público: más rápido, y no depende del proxy/HTTPS de la plataforma.
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;

  const navegador = await chromium.launch({
    channel: CANAL,
    args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1100 } });
    await pagina.goto(`${base}/p/${token}/imprimir`, { waitUntil: "load", timeout: 180000 });
    await pagina.waitForSelector('[data-listo="1"]', { timeout: 180000 });
    const pdf = await pagina.pdf({
      format: "A4", landscape: true, printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    guardarPdf(token, pdf);
  } finally {
    await navegador.close();
  }

  await prisma.resultado.update({ where: { versionId: version.id }, data: { pdfUrl: `/p/${token}/pdf` } });
  revalidatePath(`/projects/${proyectoId}`);
}
