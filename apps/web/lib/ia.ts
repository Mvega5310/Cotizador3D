import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// La IA nunca escribe ni ejecuta código: solo llena esta forma de datos, con
// el mismo contrato que el motor ya conoce (packages/engine/src/formas.js).
// `origen` y `confirmado` no se le piden al modelo — los fija esta capa, para
// que el paso de revisión (etapa 02 de la guía) nunca se pueda saltar.
const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

const ElementoBase = { id: z.string(), nombre: z.string(), pieza: z.string(), etapa: z.number().int().min(1) };
const ElementoViga = z.object({ ...ElementoBase, forma: z.literal("viga"), geometria: z.object({ a: Vec3, b: Vec3 }) });
const ElementoPanel = z.object({ ...ElementoBase, forma: z.literal("panel"), geometria: z.object({ origen: Vec3, u: Vec3, v: Vec3 }) });
const ElementoVolumen = z.object({ ...ElementoBase, forma: z.literal("volumen"), geometria: z.object({ min: Vec3, max: Vec3 }) });
const ElementoPieza = z.object({ ...ElementoBase, forma: z.literal("pieza"), geometria: z.object({ pos: Vec3, tam: Vec3 }) });
const ElementoIA = z.discriminatedUnion("forma", [ElementoViga, ElementoPanel, ElementoVolumen, ElementoPieza]);

const PiezaIA = z.object({
  nombre: z.string(),
  unidad: z.enum(["kg", "m2", "m3", "ml", "und"]),
  dimensiones: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
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

catalogo: un objeto con una entrada por tipo de pieza que uses (perfil, lámina, material...). La clave es un identificador corto tuyo (p.ej. "tubo50"); cada elemento la referencia en su campo 'pieza'. No repitas piezas equivalentes con claves distintas.

etapas: si el proyecto tiene partes que se ejecutan por separado (como en el plano o en la descripción del usuario), sepáralas; si no, una sola etapa.

Reglas:
- Usa solo las medidas que puedas leer o inferir razonablemente de lo que se te dio. Cuando una medida sea un supuesto (no está acotada en el plano), dilo en "notas" en vez de inventarla con falsa precisión.
- No agregues elementos decorativos ni de contexto (terreno, mobiliario) salvo que el usuario los pida — solo lo que se vaya a cotizar o mostrar.
- Cada "id" de elemento debe ser único dentro de la respuesta.`;

function tipoMedia(nombre: string, tipo: string): "image" | "pdf" | null {
  if (tipo.startsWith("image/")) return "image";
  if (tipo === "application/pdf" || nombre.toLowerCase().endsWith(".pdf")) return "pdf";
  return null;
}

export async function proponerElementos(args: { archivos: File[]; descripcion: string }): Promise<RespuestaIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta configurar ANTHROPIC_API_KEY en el servidor para usar la lectura de planos con IA.");

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  for (const archivo of args.archivos) {
    const tipo = tipoMedia(archivo.name, archivo.type);
    if (!tipo) continue;
    const data = Buffer.from(await archivo.arrayBuffer()).toString("base64");
    if (tipo === "image") {
      content.push({ type: "image", source: { type: "base64", media_type: archivo.type as "image/png" | "image/jpeg" | "image/webp", data } });
    } else {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    }
  }
  content.push({ type: "text", text: args.descripcion.trim() || "Sin descripción adicional del usuario." });
  if (content.length === 1) throw new Error("Sube al menos un plano, boceto o foto legible (imagen o PDF).");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    system: SISTEMA,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(RespuestaIA) },
  });

  if (!response.parsed_output) {
    throw new Error(`La IA no devolvió un resultado interpretable (${response.stop_reason}).`);
  }
  return response.parsed_output;
}
