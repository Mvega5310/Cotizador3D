// Envío de correo vía Resend (API HTTP directa, sin SDK — un solo POST).
// Necesita RESEND_API_KEY en el entorno. Mientras no se verifique un dominio
// propio en Resend, el remitente por defecto (onboarding@resend.dev) solo
// entrega al correo dueño de la cuenta de Resend — para producción real hay
// que verificar un dominio y cambiar RESEND_FROM.
import { MARCA } from "@/lib/marca";

export async function enviarCorreo({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Falta configurar RESEND_API_KEY en el servidor para enviar correos.");
  const from = process.env.RESEND_FROM || `${MARCA} <onboarding@resend.dev>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    throw new Error(`No se pudo enviar el correo (${r.status}): ${texto.slice(0, 300)}`);
  }
}

function plantilla(titulo: string, cuerpo: string, boton: { texto: string; url: string }) {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#171717">
  <p style="font:600 12px/1 monospace;letter-spacing:.1em;text-transform:uppercase;color:#ea580c;margin:0 0 8px">${MARCA}</p>
  <h1 style="font-size:20px;margin:0 0 16px">${titulo}</h1>
  <p style="font-size:14px;line-height:1.6;color:#404040">${cuerpo}</p>
  <p style="margin:24px 0">
    <a href="${boton.url}" style="background:#171717;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:14px;display:inline-block">${boton.texto}</a>
  </p>
  <p style="font-size:12px;color:#a3a3a3;word-break:break-all">${boton.url}</p>
</div>`;
}

export function correoVerificacion(url: string) {
  return plantilla(
    "Confirma tu correo",
    "Gracias por crear tu cuenta. Confirma tu correo para terminar de activarla — el enlace vence en 24 horas.",
    { texto: "Confirmar correo", url }
  );
}

export function correoRecuperacion(url: string) {
  return plantilla(
    "Pon una contraseña nueva",
    "Pediste recuperar el acceso a tu cuenta. El enlace vence en 1 hora. Si no fuiste tú, ignora este correo — tu contraseña sigue igual.",
    { texto: "Poner contraseña nueva", url }
  );
}
