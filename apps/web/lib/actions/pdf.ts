"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { chromium } from "playwright-core";
import { prisma } from "@/lib/db";
import { obtenerProyecto } from "@/lib/proyectos";
import { borrarPdf, guardarPdf, PDF_MAX_MS } from "@/lib/pdf";
import { enCola } from "@/lib/cola";

// Genera el PDF abriendo /p/<token>/imprimir en un Chrome sin interfaz y
// esperando a que esa página capture sus propias vistas 3D (VisorImprimible).
// Lanza un navegador dentro del proceso del servidor: funciona en local y en
// un servidor con proceso persistente (Railway, con el Dockerfile de la raíz,
// que trae Chromium); no en hosting serverless (Vercel y similares).
//
// Corre después de responder (`after`) y en cola, de a uno por servidor
// (lib/cola.ts); el estado queda en Resultado.pdfEstado y la página del
// proyecto se refresca sola (PanelPdf.tsx).
//
// PDF_CHROME_CHANNEL: en local "chrome" (el Chrome instalado en el equipo);
// en el servidor se deja vacío y se usa el Chromium que trae la imagen.
const CANAL = process.env.PDF_CHROME_CHANNEL ?? (process.env.NODE_ENV === "production" ? undefined : "chrome");

export async function generarPdfAction(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") || "");
  if (!proyectoId) return;
  // presupuesto: cantidades y precios (link completo); anexo: vistas y
  // desglose de material sin precios, para adjuntar a la cotización propia
  // del ejecutor (link completo, ?precios=0); presentacion: solo vistas (link
  // de cliente). El anexo de APU va solo si se pide, y solo en presupuesto.
  const pedido = String(formData.get("tipo"));
  const tipo = pedido === "presentacion" || pedido === "anexo" ? pedido : "presupuesto";
  const conApu = tipo === "presupuesto" && formData.get("apu") === "on";

  // obtenerProyecto exige sesión y que el proyecto sea de la cuenta del
  // usuario — así nadie genera el PDF de un proyecto ajeno.
  const { version } = await obtenerProyecto(proyectoId);
  const resultado = version.resultado;
  const token = tipo === "presentacion" ? resultado?.linkCliente : resultado?.linkCompleto;
  if (!resultado || !token) return;

  // Uno a la vez por proyecto: si ya hay uno en curso (y no se cortó), no se
  // lanza otro. Condicional y atómico, contra el doble clic.
  const tomado = await prisma.resultado.updateMany({
    where: {
      id: resultado.id,
      OR: [{ pdfEstado: null }, { pdfEstado: { not: "generando" } }, { pdfIniciado: { lt: new Date(Date.now() - PDF_MAX_MS) } }],
    },
    data: { pdfEstado: "generando", pdfError: null, pdfIniciado: new Date() },
  });
  if (tomado.count === 0) return;

  const ruta = `/p/${token}/imprimir${conApu ? "?apu=1" : tipo === "anexo" ? "?precios=0" : ""}`;
  after(() => enCola(() => renderizar(resultado.id, ruta, resultado.pdfToken)));
  revalidatePath(`/projects/${proyectoId}`);
}

async function renderizar(resultadoId: string, ruta: string, tokenAnterior: string | null) {
  const inicio = Date.now();
  // El servidor se llama a sí mismo por la red interna, no por el dominio
  // público: más rápido, y no depende del proxy/HTTPS de la plataforma.
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    // La hora de inicio se reescribe al empezar de verdad: un PDF que esperó
    // su turno en la cola no debe parecer vencido (PDF_MAX_MS).
    await prisma.resultado.update({ where: { id: resultadoId }, data: { pdfIniciado: new Date() } });
    const navegador = await chromium.launch({
      channel: CANAL,
      args: ["--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    let pdf: Uint8Array;
    try {
      const pagina = await navegador.newPage({ viewport: { width: 1400, height: 1100 } });
      await pagina.goto(`${base}${ruta}`, { waitUntil: "load", timeout: 180000 });
      await pagina.waitForSelector('[data-listo="1"]', { timeout: 180000 });
      pdf = await pagina.pdf({
        format: "A4", landscape: true, printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
      });
    } finally {
      await navegador.close();
    }
    // Token nuevo en cada generación: el enlace del PDF anterior deja de servir.
    const pdfToken = randomBytes(16).toString("hex");
    guardarPdf(pdfToken, pdf);
    await prisma.resultado.update({
      where: { id: resultadoId },
      data: { pdfToken, pdfUrl: `/d/${pdfToken}`, pdfEstado: "listo", pdfError: null },
    });
    if (tokenAnterior) borrarPdf(tokenAnterior);
    console.log(`[pdf] ${resultadoId} listo en ${Math.round((Date.now() - inicio) / 1000)} s`);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[pdf] ${resultadoId} falló:`, motivo);
    await prisma.resultado
      .update({ where: { id: resultadoId }, data: { pdfEstado: "error", pdfError: "No se pudo generar el PDF. Reintenta en un momento." } })
      .catch(() => {});
  }
}
