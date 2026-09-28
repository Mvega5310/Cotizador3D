"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { chromium } from "playwright-core";
import { prisma } from "@/lib/db";
import { obtenerProyecto } from "@/lib/proyectos";
import { guardarPdf } from "@/lib/pdf";

// Genera el PDF abriendo /p/<token>/imprimir en un Chrome sin interfaz y
// esperando a que esa página capture sus propias vistas 3D (VisorImprimible).
// Limitación conocida: esto lanza un navegador dentro del proceso del
// servidor de Next.js. Funciona para correr localmente o en un servidor
// propio; no funciona en hosting serverless (Vercel y similares no pueden
// lanzar Chrome). Al reestructurar el despliegue, este paso hay que moverlo
// a un worker aparte (ver apps/pipeline, que ya hace algo parecido).
export async function generarPdfAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  if (!proyectoId) return;

  // obtenerProyecto exige sesión y que el proyecto sea de la cuenta del
  // usuario — así nadie genera el PDF de un proyecto ajeno.
  const { version } = await obtenerProyecto(proyectoId);
  const token = version.resultado?.linkCompleto;
  if (!token) return;

  const encabezados = await headers();
  const base = `http://${encabezados.get("host")}`;

  const navegador = await chromium.launch({
    channel: "chrome",
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
