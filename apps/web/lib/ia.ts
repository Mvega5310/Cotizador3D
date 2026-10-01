import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// La IA nunca escribe ni ejecuta código: solo llena esta forma de datos, con
// el mismo contrato que el motor ya conoce (packages/engine/src/formas.js).
// `origen` y `confirmado` no se le piden al modelo — los fija esta capa, para
// que el paso de revisión (etapa 02 de la guía) nunca se pueda saltar.
//
// No se usa output_config.format (salida estructurada): en pruebas con un
// plano real, devolvía de forma consistente un resultado mínimo tipo
// "placeholder" (un elemento, catálogo vacío) pese a instrucciones explícitas
// en contra — probablemente algún mecanismo de reparación de esquema
// internando ante una respuesta larga que no valida a la primera. Se le pide
// el JSON en el texto de la respuesta y se valida acá con el mismo esquema
// Zod; así se ve exactamente qué generó el modelo si algo sale mal.
const Vec3 = z.array(z.number()).length(3);

const ElementoIA = z.object({
  id: z.string(),
  nombre: z.string(),
  forma: z.enum(["viga", "panel", "volumen", "pieza"]),
  pieza: z.string(),
  etapa: z.number().int().min(1),
  geometria: z.record(z.string(), Vec3).describe(
    "viga: {a,b}. panel: {origen,u,v}. volumen: {min,max}. pieza: {pos,tam}. Cada valor es [x,y,z] en metros."
  ),
});

const PiezaIA = z.object({
  nombre: z.string(),
  unidad: z.enum(["kg", "m2", "m3", "ml", "und"]),
  dimensiones: z.record(z.string(), z.number()).optional(),
  factor: z.number().optional().describe("kg por unidad base de la forma (kg/m para viga o panel, kg/m² para panel, etc). Solo si se va a cotizar esa pieza en kg."),
});

const RespuestaIA = z.object({
  etapas: z.array(z.object({ numero: z.number().int().min(1), nombre: z.string() })).min(1),
  catalogo: z.record(z.string(), PiezaIA),
  elementos: z.array(ElementoIA).min(1),
  notas: z.string().optional().describe("Medidas o piezas que no se pudieron leer con confianza en los planos, para que el usuario las revise."),
});

export type RespuestaIA = z.infer<typeof RespuestaIA>;

const SISTEMA = `Eres el paso de lectura de planos de un cotizador 3D. A partir de fotos o PDF de planos, bocetos y una descripción del usuario, propones la lista de elementos de un proyecto. No escribes código: solo llenas datos con el contrato que sigue.

Formas disponibles (son las únicas que existen, no inventes otras):
- viga: pieza larga recta entre dos puntos. geometria: { a: [x,y,z], b: [x,y,z] }. Para tubos, perfiles, columnas, vigas, listones.
- panel: superficie plana rectangular. geometria: { origen: [x,y,z], u: [x,y,z], v: [x,y,z] } — u y v son los dos lados del rectángulo, como vectores desde origen. Para teja, lámina, drywall, vidrio, tablero, piso.
- volumen: sólido tipo caja. geometria: { min: [x,y,z], max: [x,y,z] }. Para concreto, relleno, excavación.
- pieza: objeto que se cuenta por unidad, dibujado como una caja de tamaño 'tam' centrada en 'pos'. geometria: { pos: [x,y,z], tam: [dx,dy,dz] }. Para puertas, ventanas, luminarias, muebles, equipos.

Ejes del modelo, en metros: X = largo, Y = profundidad, Z = altura (0 = nivel de piso). Todas las coordenadas van en esa unidad y ese sistema.

catalogo: un objeto con una entrada por tipo de pieza que uses (perfil, lámina, material...). La clave es un identificador corto tuyo (p.ej. "tubo50"); cada elemento la referencia en su campo 'pieza'. No repitas piezas equivalentes con claves distintas. Cada pieza usada por una 'viga' DEBE traer dimensiones.ancho y dimensiones.alto (metros, la sección transversal del perfil): para un tubo cuadrado o rectangular son el ancho y el peralte; para un tubo redondo o un ángulo, usa el diámetro o el lado mayor en ambos. Sin esos dos campos la pieza no es válida y el elemento se descarta entero.

etapas: si el proyecto tiene partes que se ejecutan por separado (como en el plano o en la descripción del usuario), sepáralas; si no, una sola etapa.

Nunca devuelvas una respuesta mínima, de ejemplo o de marcador de posición. Analiza la imagen de verdad y lista TODOS los elementos estructurales que puedas identificar (cerchas o arcos, columnas, correas, cimentación, cobertura...), con tu mejor estimación numérica de coordenadas a partir de lo que se ve y se acota en el plano — aproximado es aceptable, vacío no. Cada clave que uses en el campo "pieza" de un elemento debe existir como entrada en "catalogo": revísalo antes de responder.

Reglas:
- Usa solo las medidas que puedas leer o inferir razonablemente de lo que se te dio. Cuando una medida sea un supuesto (no está acotada en el plano), dilo en "notas" en vez de inventarla con falsa precisión.
- No agregues elementos decorativos ni de contexto (terreno, mobiliario) salvo que el usuario los pida — solo lo que se vaya a cotizar o mostrar.
- Cada "id" de elemento debe ser único dentro de la respuesta.

Responde ÚNICAMENTE con un objeto JSON válido — sin texto antes ni después, sin explicaciones, sin bloques de código markdown (sin \`\`\`). Forma exacta:
{
  "etapas": [{ "numero": 1, "nombre": "texto" }],
  "catalogo": { "clave-corta": { "nombre": "texto", "unidad": "kg" | "m2" | "m3" | "ml" | "und", "dimensiones": { "campo": numero }, "factor": numero } },
  "elementos": [{ "id": "texto único", "nombre": "texto", "forma": "viga" | "panel" | "volumen" | "pieza", "pieza": "clave del catálogo", "etapa": numero, "geometria": { ... según la forma, ver arriba } }],
  "notas": "texto opcional"
}`;

function tipoMedia(nombre: string, tipo: string): "image" | "pdf" | null {
  if (tipo.startsWith("image/")) return "image";
  if (tipo === "application/pdf" || nombre.toLowerCase().endsWith(".pdf")) return "pdf";
  return null;
}

// Ya leído a memoria (Buffer), no File — así el llamador lee cada archivo una
// sola vez y puede tanto mandarlo a la IA como guardarlo (ver
// lib/actions/proyectos.ts, que hace las dos cosas con el mismo buffer).
export type ArchivoLeido = { nombre: string; mime: string; datos: Buffer };

export async function proponerElementos(args: { archivos: ArchivoLeido[]; descripcion: string }): Promise<RespuestaIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta configurar ANTHROPIC_API_KEY en el servidor para usar la lectura de planos con IA.");

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  for (const archivo of args.archivos) {
    const tipo = tipoMedia(archivo.nombre, archivo.mime);
    if (!tipo) continue;
    const data = archivo.datos.toString("base64");
    if (tipo === "image") {
      content.push({ type: "image", source: { type: "base64", media_type: archivo.mime as "image/png" | "image/jpeg" | "image/webp", data } });
    } else {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    }
  }
  content.push({ type: "text", text: args.descripcion.trim() || "Sin descripción adicional del usuario." });
  if (content.length === 1) throw new Error("Sube al menos un plano, boceto o foto legible (imagen o PDF).");

  // Streaming, no .create() directo: con max_tokens alto (planos complejos
  // pueden necesitar bastante salida) el SDK exige streaming para no toparse
  // con su propio límite de 10 minutos en peticiones no-streaming.
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 32000,
    system: SISTEMA,
    messages: [{ role: "user", content }],
    output_config: { effort: "high" },
  });
  const response = await stream.finalMessage();
  const texto = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");

  console.log("[ia] stop_reason:", response.stop_reason, "| caracteres de respuesta:", texto.length);

  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let crudo: unknown;
  try {
    crudo = JSON.parse(limpio);
  } catch {
    console.log("[ia] texto no parseable como JSON:", texto.slice(0, 2000));
    throw new Error("La IA no devolvió un JSON válido. Intenta de nuevo o con planos más legibles.");
  }

  const parseo = RespuestaIA.safeParse(crudo);
  if (!parseo.success) {
    const detalle = parseo.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
    console.log("[ia] no cumple el esquema:", detalle, "| json:", JSON.stringify(crudo).slice(0, 2000));
    throw new Error(`La respuesta de la IA no tiene el formato esperado. ${detalle}`);
  }

  console.log(
    "[ia] elementos:", parseo.data.elementos.length,
    "| piezas del catálogo:", Object.keys(parseo.data.catalogo).join(", "),
    "| notas:", parseo.data.notas ?? "-"
  );
  return parseo.data;
}
