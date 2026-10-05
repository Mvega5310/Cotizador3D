import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { UsoIA } from "@/lib/costos";

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
// Puntos [x,y,z]; los cantos de un tablero son un par [largos, cortos]. El
// motor valida cada forma con su propio contrato (formas.js::validar).
const ValorGeo = z.array(z.number()).min(2).max(3);

const ElementoIA = z.object({
  id: z.string(),
  nombre: z.string(),
  forma: z.enum(["viga", "panel", "volumen", "tablero", "pieza"]),
  pieza: z.string(),
  etapa: z.number().int().min(1),
  geometria: z.record(z.string(), ValorGeo).describe(
    "viga: {a,b}. panel: {origen,u,v}. volumen: {min,max}. tablero: {min,max,cantos?}. pieza: {pos,tam}. Los puntos son [x,y,z] en metros."
  ),
});

const PiezaIA = z.object({
  nombre: z.string(),
  unidad: z.enum(["kg", "m2", "m3", "ml", "und"]),
  dimensiones: z.record(z.string(), z.number()).optional(),
  factor: z.number().optional().describe("kg por unidad base de la forma (kg/m para viga o panel, kg/m² para panel, etc). Solo si se va a cotizar esa pieza en kg."),
  consumos: z.array(z.object({
    nombre: z.string().min(1),
    unidad: z.enum(["kg", "m2", "m3", "ml", "und"]),
    base: z.enum(["ml", "m2", "m3", "kg", "und", "superficie"]),
    factor: z.number().positive(),
    entero: z.boolean().optional(),
  })).optional(),
});

const RespuestaIA = z.object({
  etapas: z.array(z.object({ numero: z.number().int().min(1), nombre: z.string() })).min(1),
  catalogo: z.record(z.string(), PiezaIA),
  elementos: z.array(ElementoIA).min(1),
  notas: z.string().optional().describe("Medidas o piezas que no se pudieron leer con confianza en los planos, para que el usuario las revise."),
  // Solo lo que el usuario escribió: la IA nunca estima precios (ver SISTEMA).
  cotizacion: z.object({
    precios: z.record(z.string(), z.number().positive()).optional(),
    desperdicioPct: z.number().min(0).max(100).optional(),
    manoObraPct: z.number().min(0).max(1000).optional(),
    manoObraValor: z.number().min(0).optional(),
    apu: z.record(z.string(), z.object({
      desperdicioPct: z.number().min(0).max(100).optional(),
      manoObra: z.number().min(0).optional(),
      equipo: z.number().min(0).optional(),
      transporte: z.number().min(0).optional(),
    })).optional(),
    aiu: z.object({ a: z.number().min(0).max(100).optional(), i: z.number().min(0).max(100).optional(), u: z.number().min(0).max(100).optional() }).optional(),
    iva: z.object({ regimen: z.enum(["ninguno", "utilidad", "total"]).optional(), tarifa: z.number().min(0).max(100).optional() }).optional(),
  }).optional(),
});

export type RespuestaIA = z.infer<typeof RespuestaIA>;

const SISTEMA = `Eres el paso de lectura de planos de un cotizador 3D. A partir de fotos o PDF de planos, bocetos y una descripción del usuario, propones la lista de elementos de un proyecto. No escribes código: solo llenas datos con el contrato que sigue.

Formas disponibles (son las únicas que existen, no inventes otras):
- viga: pieza larga recta entre dos puntos. geometria: { a: [x,y,z], b: [x,y,z] }. Para tubos, perfiles, columnas, vigas, listones.
- panel: superficie plana rectangular. geometria: { origen: [x,y,z], u: [x,y,z], v: [x,y,z] } — u y v son los dos lados del rectángulo, como vectores desde origen. Para teja, lámina, drywall, vidrio, tablero, piso.
- volumen: sólido tipo caja. geometria: { min: [x,y,z], max: [x,y,z] }. Para concreto, relleno, excavación.
- tablero: pieza plana de un mueble con su espesor real (melamina, MDF, aglomerado, triplex, madera maciza): laterales, piso, techo, entrepaños, fondo, puertas, frentes y costados de cajón. geometria: { min: [x,y,z], max: [x,y,z], cantos: [largos, cortos] } — una caja cuyo lado más delgado es el espesor del tablero; los otros dos son el largo y el ancho de corte. cantos: cuántos de sus 2 bordes largos y de sus 2 bordes cortos llevan canto/tapacanto (0, 1 o 2 cada uno; normalmente los bordes vistos). Cada tablero es UNA pieza de corte: no juntes dos piezas en una caja.
- pieza: objeto que se cuenta por unidad, dibujado como una caja de tamaño 'tam' centrada en 'pos'. geometria: { pos: [x,y,z], tam: [dx,dy,dz] }. Para puertas, ventanas, luminarias, muebles, equipos.

Ejes del modelo, en metros, como en un plano: parado frente al proyecto, X crece hacia la derecha, Y hacia el fondo (alejándose de ti) y Z hacia arriba (0 = nivel de piso). El frente (fachada principal, frentes de puertas y cajones) es el lado de Y menor. Respeta los lados del plano: lo que en la vista frontal está a la izquierda va en X menor. Todas las coordenadas van en esa unidad y ese sistema.

catalogo: un objeto con una entrada por tipo de pieza que uses (perfil, lámina, material...). La clave es un identificador corto tuyo (p.ej. "tubo50"); cada elemento la referencia en su campo 'pieza'. No repitas piezas equivalentes con claves distintas. Cada pieza usada por una 'viga' DEBE traer dimensiones.ancho y dimensiones.alto (metros, la sección transversal del perfil): para un tubo cuadrado o rectangular son el ancho y el peralte; para un tubo redondo o un ángulo, usa el diámetro o el lado mayor en ambos. Sin esos dos campos la pieza no es válida y el elemento se descarta entero.

Muebles y carpintería (cocinas integrales, closets, gabinetes, cajoneras, escritorios, muebles de baño): cada pieza de tablero es un elemento 'tablero'; la pieza del catálogo es el material (p. ej. "Melamina blanca 18 mm"), con unidad "m2", dimensiones.espesor en metros (0.018 para 18 mm — el espesor de cada tablero debe coincidir con el de su material) y, si conoces el formato comercial, dimensiones.lamina_largo y dimensiones.lamina_ancho (p. ej. 2.44 y 1.83). Arma las piezas como se fabrican de verdad: los laterales van de piso a techo y el piso y el techo entran entre los laterales, los fondos suelen ser de MDF o HDF de 3 a 5 mm, cada cajón lleva frente, dos costados, contrafrente y fondo. Herrajes (bisagras, correderas, manijas, patas, tornillería si se pide) van como 'pieza', unidad "und". Ubica cada mueble y cada pieza en su posición real, para que el 3D se vea armado. Si las medidas internas (holguras de cajón, retrocesos del fondo) no están en el plano, usa las usuales del oficio y dilo en "notas".

etapas: si el proyecto tiene partes que se ejecutan por separado (como en el plano o en la descripción del usuario), sepáralas; si no, una sola etapa.

Nunca devuelvas una respuesta mínima, de ejemplo o de marcador de posición. Analiza la imagen de verdad y lista TODOS los elementos estructurales que puedas identificar (cerchas o arcos, columnas, correas, cimentación, cobertura...), con tu mejor estimación numérica de coordenadas a partir de lo que se ve y se acota en el plano — aproximado es aceptable, vacío no. Cada clave que uses en el campo "pieza" de un elemento debe existir como entrada en "catalogo": revísalo antes de responder.

Consumos (campo "consumos" de una pieza del catálogo, opcional): materiales que no se dibujan pero se gastan en proporción a la pieza. Cada regla: { "nombre", "unidad" (en qué se compra: kg, m2, m3, ml, und), "base" (sobre qué medida de cada elemento se calcula), "factor" (cantidad por unidad de base), "entero" (true si se compra por unidades enteras, p. ej. galones o cajas) }. Bases: "ml" (largo de una viga), "m2" (área de un panel o tablero), "m3" (volumen), "kg" (peso, solo si la pieza tiene factor de peso), "und" (cada elemento), "superficie" (m² de cara exterior: perímetro × largo en perfiles, para pintura). Ejemplos:
- Perfiles de acero: { "nombre": "Anticorrosivo (galón)", "unidad": "und", "base": "superficie", "factor": 0.033, "entero": true }, { "nombre": "Esmalte (galón)", ... }, { "nombre": "Soldadura E6013", "unidad": "kg", "base": "kg", "factor": 0.03 }.
- Concreto sin varillas dibujadas: { "nombre": "Acero de refuerzo", "unidad": "kg", "base": "m3", "factor": 80 } (cuantía en kg/m³).
- Tableros de mueble: { "nombre": "Tornillo 4x50", "unidad": "und", "base": "und", "factor": 8 }.
Usa el MISMO "nombre" exacto cuando el mismo consumo aplica a varias piezas (así se suma en una línea). Agrégalos cuando el usuario los pida o cuando sean parte normal del oficio (pintura de una estructura metálica, soldadura); los rendimientos que no te dio el usuario son supuestos: dilos en "notas". Si el usuario pide pintura o un acabado sin decir el rendimiento, usa uno usual del oficio y dilo en notas.

Precios (campo "cotizacion", opcional): llénalo SOLO con precios, porcentajes o valores que el usuario haya escrito explícitamente en su descripción o en los planos. NUNCA estimes, supongas ni completes precios de mercado: si el usuario no dio el precio de una pieza, esa pieza no va en "precios". Si el usuario no dio ningún precio, omite "cotizacion" por completo.
- precios: { "clave del catálogo": precio por UNA unidad de cotización de esa pieza (la "unidad" de su entrada en el catálogo), en la moneda del usuario }. Para el canto/tapacanto de un material de tablero, la clave es "<clave del material>#canto" y el precio es por metro lineal. Para un consumo, la clave es "consumo:<nombre del consumo>" y el precio es por su unidad (p. ej. por galón).
- Si el usuario da el precio en otra presentación (por lámina, por tubo de 6 m, por galón), conviértelo a la unidad de cotización (p. ej. precio de lámina ÷ área de la lámina en m²) y explica la conversión en "notas".
- desperdicioPct y manoObraPct: porcentajes, solo si el usuario los da. manoObraValor: un valor total fijo de mano de obra, si el usuario lo da así (p. ej. "la mano de obra vale 400.000").
- apu: análisis de precio unitario por ítem, con las mismas claves que "precios": { "clave": { "manoObra": $ por unidad, "equipo": $ por unidad, "transporte": $ por unidad, "desperdicioPct": % } }, solo con lo que el usuario dio (p. ej. "mano de obra de montaje a 2.500 por kg" → manoObra 2500 en cada perfil cotizado en kg).
- aiu: { "a", "i", "u" } en % (administración, imprevistos, utilidad), si el usuario los da (p. ej. "AIU 25 %: A 10, I 5, U 10").
- iva: { "regimen", "tarifa" } si el usuario dice cómo factura: "utilidad" para contrato de obra con AIU (IVA sobre la utilidad), "total" para venta o suministro (IVA sobre todo), "ninguno" si no es responsable de IVA. No lo deduzcas si no lo dice.

Reglas:
- Usa solo las medidas que puedas leer o inferir razonablemente de lo que se te dio. Cuando una medida sea un supuesto (no está acotada en el plano), dilo en "notas" en vez de inventarla con falsa precisión.
- No agregues elementos decorativos ni de contexto (terreno, mobiliario que no es parte del trabajo) salvo que el usuario los pida — solo lo que se vaya a cotizar o mostrar.
- Cada "id" de elemento debe ser único dentro de la respuesta.

Responde ÚNICAMENTE con un objeto JSON válido — sin texto antes ni después, sin explicaciones, sin bloques de código markdown (sin \`\`\`). Forma exacta:
{
  "etapas": [{ "numero": 1, "nombre": "texto" }],
  "catalogo": { "clave-corta": { "nombre": "texto", "unidad": "kg" | "m2" | "m3" | "ml" | "und", "dimensiones": { "campo": numero }, "factor": numero, "consumos": [ { "nombre": "texto", "unidad": "...", "base": "...", "factor": numero, "entero": true } ] } },
  "elementos": [{ "id": "texto único", "nombre": "texto", "forma": "viga" | "panel" | "volumen" | "tablero" | "pieza", "pieza": "clave del catálogo", "etapa": numero, "geometria": { ... según la forma, ver arriba } }],
  "notas": "texto opcional",
  "cotizacion": { "precios": { "clave-corta": numero }, "apu": { "clave-corta": { "manoObra": numero } }, "desperdicioPct": numero, "manoObraPct": numero, "manoObraValor": numero, "aiu": { "a": numero, "i": numero, "u": numero }, "iva": { "regimen": "utilidad", "tarifa": 19 } }  (opcional, solo con datos dados por el usuario)
}`;

// El error crudo de la API (en inglés, con JSON) no le sirve al usuario: se
// traduce a qué pasó y qué hacer. El crudo queda en el log del servidor.
function mensajeErrorApi(e: unknown): string {
  console.error("[ia] error de la API:", e instanceof Error ? e.message : e);
  if (e instanceof Anthropic.APIConnectionError) return "No se pudo conectar con el servicio de IA. Revisa la conexión del servidor y reintenta.";
  if (!(e instanceof Anthropic.APIError)) return "El servicio de IA falló inesperadamente. Reintenta en unos minutos.";
  const texto = e.message.toLowerCase();
  if (texto.includes("credit balance")) {
    return "El servicio de IA de la plataforma se quedó sin crédito. Es un problema de la cuenta de la plataforma, no de tus planos: avisa al administrador y reintenta cuando lo recargue.";
  }
  // Tope mensual del nivel de la cuenta (429 sin retry-after) o límite de gasto
  // puesto por el administrador (400): reintentar no sirve hasta que se suba.
  if (texto.includes("enforced_spend_limit_reached") || texto.includes("monthly api usage threshold") || texto.includes("specified api usage limits") || texto.includes("specified workspace api usage limits")) {
    return "La plataforma alcanzó su límite mensual de uso de IA. Avisa al administrador para que lo amplíe; tus planos quedan guardados para reintentar.";
  }
  if (e.status === 401 || e.status === 403) return "La clave del servicio de IA no es válida. Avisa al administrador de la plataforma.";
  if (e.status === 429) return "El servicio de IA está recibiendo demasiadas solicitudes. Reintenta en unos minutos.";
  if (e.status === 529 || (e.status ?? 0) >= 500) return "El servicio de IA está saturado o caído en este momento. Reintenta en unos minutos.";
  if (e.status === 413 || texto.includes("too large") || texto.includes("too long")) return "Los archivos son demasiado grandes para leerlos de una vez. Sube menos páginas o imágenes más livianas.";
  return "El servicio de IA rechazó la solicitud. Revisa que los archivos sean imágenes o PDF legibles y reintenta.";
}

function tipoMedia(nombre: string, tipo: string): "image" | "pdf" | null {
  if (tipo.startsWith("image/")) return "image";
  if (tipo === "application/pdf" || nombre.toLowerCase().endsWith(".pdf")) return "pdf";
  return null;
}

// Ya leído a memoria (Buffer), no File — así el llamador lee cada archivo una
// sola vez y puede tanto mandarlo a la IA como guardarlo (ver
// lib/actions/proyectos.ts, que hace las dos cosas con el mismo buffer).
export type ArchivoLeido = { nombre: string; mime: string; datos: Buffer };

const MODELO = "claude-opus-5";

const usoVacio = (): UsoIA => ({ modelo: MODELO, inputTokens: 0, outputTokens: 0, cacheLectura: 0, cacheEscritura: 0 });

// Error de la lectura con IA que lleva lo que se alcanzó a gastar (ver
// lib/generacion.ts, que lo registra en GeneracionIA).
export class ErrorIA extends Error {
  constructor(mensaje: string, public uso: UsoIA) {
    super(mensaje);
  }
}

export async function proponerElementos(args: { archivos: ArchivoLeido[]; descripcion: string }): Promise<{ respuesta: RespuestaIA; uso: UsoIA }> {
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
    model: MODELO,
    max_tokens: 32000,
    system: SISTEMA,
    messages: [{ role: "user", content }],
    output_config: { effort: "high" },
  });
  let response: Anthropic.Messages.Message;
  try {
    response = await stream.finalMessage();
  } catch (e) {
    // Sin respuesta no hubo cobro (o no lo sabemos): uso en cero.
    throw new ErrorIA(mensajeErrorApi(e), usoVacio());
  }
  const u = response.usage;
  const uso: UsoIA = {
    modelo: response.model ?? MODELO,
    inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0,
    cacheLectura: u.cache_read_input_tokens ?? 0, cacheEscritura: u.cache_creation_input_tokens ?? 0,
  };
  const texto = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");

  console.log("[ia] stop_reason:", response.stop_reason, "| caracteres de respuesta:", texto.length, "| tokens entrada/salida:", uso.inputTokens, uso.outputTokens);

  // Desde aquí la IA ya respondió y cobró: los errores llevan el uso, para
  // que el gasto quede registrado aunque el proyecto no se pueda armar.
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let crudo: unknown;
  try {
    crudo = JSON.parse(limpio);
  } catch {
    console.log("[ia] texto no parseable como JSON:", texto.slice(0, 2000));
    const motivo = response.stop_reason === "max_tokens"
      ? "La respuesta de la IA fue demasiado larga y quedó cortada. Intenta dividir los planos en partes más pequeñas."
      : "La IA no devolvió un JSON válido. Intenta de nuevo o con planos más legibles.";
    throw new ErrorIA(motivo, uso);
  }

  const parseo = RespuestaIA.safeParse(crudo);
  if (!parseo.success) {
    const detalle = parseo.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
    console.log("[ia] no cumple el esquema:", detalle, "| json:", JSON.stringify(crudo).slice(0, 2000));
    throw new ErrorIA(`La respuesta de la IA no tiene el formato esperado. ${detalle}`, uso);
  }

  console.log(
    "[ia] elementos:", parseo.data.elementos.length,
    "| piezas del catálogo:", Object.keys(parseo.data.catalogo).join(", "),
    "| precios dados por el usuario:", Object.keys(parseo.data.cotizacion?.precios ?? {}).length,
    "| notas:", parseo.data.notas ?? "-"
  );
  return { respuesta: parseo.data, uso };
}
