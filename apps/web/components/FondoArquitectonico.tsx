// Fondo de la app, en capas (todo SVG y CSS, sin imágenes que descargar):
//   fondo  → degradado estático azul oscuro → blanco, con retícula técnica
//   capa 1 → planos en línea fina, de opacidad baja
//   capa 2 → modelo isométrico de un apartamento en corte, con luz cálida
//   capa 3 → partículas y líneas de luz
//   capa 4 → el contenido (la tarjeta, con backdrop-filter) va por encima
// Solo se animan transform y opacity (el navegador lo hace en la GPU, sin
// repintar), muy lento (20–40 s), y nada se mueve con "reducir movimiento".
//
// variante "hero": páginas de entrada y de nuevo proyecto (el fondo completo).
// variante "suave": panel y proyecto, donde manda la legibilidad de tablas.

export default function FondoArquitectonico({ variante = "hero" }: { variante?: "hero" | "suave" }) {
  const hero = variante === "hero";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* Fondo estático */}
      <div
        className="absolute inset-0"
        style={{
          background: hero
            ? "linear-gradient(105deg, #0f1d2e 0%, #16283e 18%, #173a63 34%, #4678a8 52%, #c9dbee 72%, #f3f7fc 100%)"
            : "linear-gradient(115deg, #e3edf8 0%, #f3f7fc 45%, #ffffff 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(90deg, black 0%, black 50%, transparent 85%)",
          opacity: hero ? 1 : 0,
        }}
      />
      {!hero && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgb(23 58 99 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(23 58 99 / 0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      )}
      {/* Resplandor cálido a la derecha y frío a la izquierda */}
      <div className="absolute -right-40 top-1/4 h-[60vh] w-[50vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(255 196 122 / 0.35), transparent)", opacity: hero ? 1 : 0.5 }} />
      <div className="absolute -left-40 top-10 h-[50vh] w-[40vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgb(20 120 255 / 0.25), transparent)", opacity: hero ? 1 : 0.35 }} />

      {/* Capa 1: planos */}
      <div className="anim-flotar absolute -left-[6vw] top-[14vh] w-[48vw] max-w-[760px] min-w-[420px]"
        style={{ ["--dur" as string]: "34s", ["--giro" as string]: "-8deg", ["--dg" as string]: "1.5deg", opacity: hero ? 0.55 : 0.12 }}>
        <div style={{ transform: "perspective(1400px) rotateX(38deg) rotateY(18deg)" }}>
          <PlanoSVG trazo={hero ? "#ffffff" : "#173a63"} vidrio={hero} />
        </div>
      </div>
      <div className="anim-derivar absolute left-[30vw] -top-[4vh] w-[26vw] min-w-[260px] max-w-[420px] hidden md:block"
        style={{ opacity: hero ? 0.3 : 0.08 }}>
        <div style={{ transform: "perspective(1000px) rotateX(55deg) rotateZ(-6deg)" }}>
          <PlanoSVG trazo={hero ? "#cfe0f5" : "#173a63"} vidrio={hero} sencillo />
        </div>
      </div>
      <div className="anim-flotar absolute -right-[4vw] -bottom-[10vh] w-[34vw] min-w-[300px] max-w-[560px] hidden md:block"
        style={{ ["--dur" as string]: "38s", ["--giro" as string]: "4deg", ["--dy" as string]: "-10px", opacity: hero ? 0.35 : 0.1 }}>
        <div style={{ transform: "perspective(1200px) rotateX(50deg) rotateZ(10deg)" }}>
          <PlanoSVG trazo="#4678a8" vidrio sencillo />
        </div>
      </div>

      {/* Capa 2: modelo isométrico */}
      <div className="anim-flotar absolute right-[0.5vw] top-[18vh] w-[25vw] min-w-[280px] max-w-[480px] hidden lg:block"
        style={{ ["--dur" as string]: "40s", ["--dx" as string]: "-8px", ["--dy" as string]: "-12px", ["--dg" as string]: "0.6deg", opacity: hero ? 1 : 0.18 }}>
        <ModeloIsometrico />
      </div>

      {/* Capa 3: líneas de luz y partículas */}
      {hero && (
        <>
          <div className="anim-rayo absolute left-[-10vw] top-[62vh] h-px w-[70vw] rotate-[-14deg]"
            style={{ background: "linear-gradient(90deg, transparent, rgb(255 196 122 / 0.9), transparent)", boxShadow: "0 0 18px 2px rgb(255 196 122 / 0.45)" }} />
          <div className="anim-rayo absolute right-[-10vw] top-[70vh] h-px w-[55vw] rotate-[-20deg]"
            style={{ background: "linear-gradient(90deg, transparent, rgb(255 196 122 / 0.8), transparent)", animationDelay: "-9s" }} />
          <div className="anim-rayo absolute left-[20vw] top-[22vh] h-px w-[40vw] rotate-[12deg]"
            style={{ background: "linear-gradient(90deg, transparent, rgb(150 200 255 / 0.6), transparent)", animationDelay: "-4s" }} />
          {PARTICULAS.map(([x, y, t, d], i) => (
            <span key={i} className="anim-titilar absolute h-1 w-1 rounded-full bg-white"
              style={{ left: `${x}%`, top: `${y}%`, ["--dur" as string]: `${t}s`, animationDelay: `-${d}s`, boxShadow: "0 0 6px 1px rgb(255 255 255 / 0.6)" }} />
          ))}
        </>
      )}
    </div>
  );
}

// [x %, y %, duración s, desfase s]: fijas (no aleatorias) para que el
// servidor y el navegador dibujen lo mismo.
const PARTICULAS: [number, number, number, number][] = [
  [8, 18, 7, 1], [14, 72, 9, 3], [22, 40, 6, 2], [31, 12, 8, 5], [38, 84, 10, 4], [46, 30, 7, 6],
  [55, 64, 9, 1], [62, 20, 6, 3], [70, 78, 8, 2], [78, 44, 11, 7], [86, 14, 7, 4], [92, 60, 9, 5],
  [18, 55, 8, 6], [50, 90, 7, 2], [66, 50, 10, 1], [27, 92, 6, 4],
];

// ---------- Capa 1: plano de un apartamento en línea fina ----------
function PlanoSVG({ trazo, vidrio = false, sencillo = false }: { trazo: string; vidrio?: boolean; sencillo?: boolean }) {
  return (
    <svg viewBox="0 0 420 300" className="w-full h-auto" fill="none" stroke={trazo} strokeLinecap="square">
      {vidrio && <rect x="2" y="2" width="416" height="296" rx="6" fill={trazo} fillOpacity="0.06" stroke={trazo} strokeOpacity="0.35" />}
      {/* retícula del pliego */}
      {!sencillo && Array.from({ length: 13 }, (_, i) => (
        <line key={`v${i}`} x1={30 + i * 30} y1="14" x2={30 + i * 30} y2="286" strokeWidth="0.3" strokeOpacity="0.35" />
      ))}
      {!sencillo && Array.from({ length: 9 }, (_, i) => (
        <line key={`h${i}`} x1="14" y1={30 + i * 30} x2="406" y2={30 + i * 30} strokeWidth="0.3" strokeOpacity="0.35" />
      ))}
      {/* muros exteriores (doble línea) */}
      <rect x="50" y="45" width="320" height="210" strokeWidth="3" />
      <rect x="57" y="52" width="306" height="196" strokeWidth="0.8" />
      {/* muros interiores */}
      <g strokeWidth="2.2">
        <path d="M190 52 V140 M190 165 V248" />
        <path d="M57 150 H120 M145 150 H190" />
        <path d="M270 52 V110 M270 135 V175" />
        <path d="M270 175 H363" />
        <path d="M190 200 H230" />
      </g>
      {/* puertas: hoja y arco */}
      <g strokeWidth="0.9">
        <path d="M120 150 A25 25 0 0 1 145 125 M120 150 V125" />
        <path d="M190 140 A25 25 0 0 1 215 165 M190 165 H215" />
        <path d="M270 110 A25 25 0 0 0 245 135 M270 135 H245" />
      </g>
      {/* ventanas */}
      <g strokeWidth="1">
        <path d="M95 45 H155 M95 49 H155 M95 52 H155" />
        <path d="M300 45 H345 M300 49 H345" />
        <path d="M370 195 V235 M366 195 V235" />
        <path d="M110 255 H170 M110 251 H170" />
      </g>
      {!sencillo && (
        <>
          {/* mobiliario */}
          <g strokeWidth="0.7" strokeOpacity="0.85">
            <rect x="72" y="70" width="70" height="55" rx="3" />
            <path d="M72 82 H142" />
            <rect x="205" y="70" width="50" height="34" rx="16" />
            <circle cx="230" cy="215" r="17" />
            <rect x="285" y="70" width="65" height="22" />
            <rect x="80" y="185" width="80" height="26" rx="4" />
            <rect x="290" y="195" width="28" height="40" rx="6" />
            <circle cx="338" cy="210" r="10" />
          </g>
          {/* cotas */}
          <g strokeWidth="0.6" strokeOpacity="0.9">
            <path d="M50 30 H370 M50 25 V35 M190 25 V35 M370 25 V35" />
            <path d="M385 45 V255 M380 45 H390 M380 175 H390 M380 255 H390" />
          </g>
          <g fill={trazo} stroke="none" fontSize="8" fontFamily="ui-monospace, monospace" opacity="0.9">
            <text x="112" y="24">4.20</text>
            <text x="272" y="24">5.80</text>
            <text x="392" y="113" transform="rotate(90 392 113)">3.90</text>
            <text x="392" y="210" transform="rotate(90 392 210)">2.60</text>
          </g>
        </>
      )}
    </svg>
  );
}

// ---------- Capa 2: modelo isométrico ----------
// Cajas en metros (x, y, z, ancho, fondo, alto) proyectadas en isometría: +x
// va hacia la derecha-abajo, +y hacia la izquierda-abajo, z hacia arriba. Se
// dibujan de atrás hacia adelante; de cada caja se ven la tapa y las caras +x
// y +y (las que miran al observador).
type Caja = { x: number; y: number; z: number; w: number; d: number; h: number; tono: "muro" | "piso" | "mueble" | "madera" | "tela" | "vidrio" };

const TONOS: Record<Caja["tono"], [string, string, string]> = {
  // [tapa, cara +x, cara +y]
  muro: ["#ffffff", "#dde5ef", "#c9d5e3"],
  piso: ["#e6ecf3", "#c5d1de", "#b7c5d4"],
  mueble: ["#f7f9fb", "#cfd9e4", "#bccad8"],
  madera: ["#e2bd8e", "#c99c69", "#b58756"],
  tela: ["#c3d2e4", "#a6b9d0", "#93a9c3"],
  vidrio: ["#cfe3fb", "#a9c9ee", "#93b9e6"],
};

const H = 2.7; // alto de muro
const E = 0.15; // espesor de muro
const CAJAS: Caja[] = [
  { x: 0, y: 0, z: -0.25, w: 12, d: 9, h: 0.25, tono: "piso" },
  // muros del fondo, completos (el corte deja ver el interior)
  { x: 0, y: 0, z: 0, w: 12, d: E, h: H, tono: "muro" },
  { x: 0, y: 0, z: 0, w: E, d: 9, h: H, tono: "muro" },
  // muros del frente, cortados a la altura del zócalo
  { x: 0, y: 9 - E, z: 0, w: 12, d: E, h: 0.35, tono: "muro" },
  { x: 12 - E, y: 0, z: 0, w: E, d: 9, h: 0.35, tono: "muro" },
  // divisiones
  { x: 5, y: E, z: 0, w: E, d: 3.6, h: H, tono: "muro" },
  { x: 5, y: 4.6, z: 0, w: E, d: 4.4 - E, h: 1.2, tono: "muro" },
  { x: E, y: 4.2, z: 0, w: 3.6, d: E, h: H, tono: "muro" },
  { x: 8.6, y: E, z: 0, w: E, d: 3.2, h: H, tono: "muro" },
  // dormitorio
  { x: 0.6, y: 0.5, z: 0, w: 2.2, d: 2.0, h: 0.5, tono: "tela" },
  { x: 0.6, y: 0.5, z: 0.5, w: 2.2, d: 0.35, h: 0.45, tono: "madera" },
  { x: 3.4, y: 0.4, z: 0, w: 1.2, d: 0.5, h: 1.9, tono: "madera" },
  // cocina
  { x: 5.4, y: 0.3, z: 0, w: 3.0, d: 0.6, h: 0.9, tono: "mueble" },
  { x: 5.4, y: 0.3, z: 1.6, w: 3.0, d: 0.35, h: 0.7, tono: "mueble" },
  { x: 6.2, y: 1.9, z: 0, w: 1.6, d: 0.8, h: 0.9, tono: "madera" },
  // baño
  { x: 9.0, y: 0.4, z: 0, w: 1.6, d: 0.7, h: 0.5, tono: "vidrio" },
  { x: 11.0, y: 0.4, z: 0, w: 0.6, d: 0.5, h: 0.85, tono: "mueble" },
  // sala y comedor
  { x: 0.7, y: 6.6, z: 0, w: 2.6, d: 0.9, h: 0.45, tono: "tela" },
  { x: 0.7, y: 6.6, z: 0.45, w: 2.6, d: 0.25, h: 0.4, tono: "tela" },
  { x: 1.3, y: 5.3, z: 0, w: 1.3, d: 0.7, h: 0.4, tono: "madera" },
  { x: 7.0, y: 5.4, z: 0, w: 2.0, d: 1.1, h: 0.75, tono: "madera" },
  { x: 6.5, y: 5.6, z: 0, w: 0.45, d: 0.45, h: 0.45, tono: "mueble" },
  { x: 9.1, y: 5.6, z: 0, w: 0.45, d: 0.45, h: 0.45, tono: "mueble" },
  { x: 7.4, y: 6.7, z: 0, w: 0.45, d: 0.45, h: 0.45, tono: "mueble" },
  { x: 8.2, y: 6.7, z: 0, w: 0.45, d: 0.45, h: 0.45, tono: "mueble" },
];

// Focos de luz cálida (centro de cada ambiente, a media altura).
const LUCES: [number, number, number][] = [[2.5, 2, 1.4], [6.8, 2, 1.4], [10.3, 2, 1.2], [2.5, 6.5, 1.2], [8, 6, 1.4]];

const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6), K = 30;
const proy = (x: number, y: number, z: number): [number, number] => [(x - y) * C * K, ((x + y) * S - z) * K];
const pts = (p: [number, number, number][]) => p.map(([x, y, z]) => proy(x, y, z).map((n) => n.toFixed(1)).join(",")).join(" ");

function ModeloIsometrico() {
  // Orden de pintado: la losa primero y los muros del fondo después (son tan
  // grandes que, ordenados por su centro, taparían los muebles); el resto, de
  // atrás hacia adelante por el centro de cada caja.
  const capa = (c: Caja) => (c.tono === "piso" ? 0 : c.tono === "muro" && (c.x === 0 || c.y === 0) && (c.w > 6 || c.d > 6) ? 1 : 2);
  const ordenadas = [...CAJAS].sort((a, b) => capa(a) - capa(b) || a.x + a.w / 2 + a.y + a.d / 2 + a.z * 0.01 - (b.x + b.w / 2 + b.y + b.d / 2 + b.z * 0.01));
  // Caja de la vista: esquinas de la losa y la altura de los muros.
  const esquinas = [proy(0, 0, H), proy(12, 0, 0), proy(0, 9, 0), proy(12, 9, -0.25)];
  const minX = Math.min(...esquinas.map((p) => p[0])) - 10, maxX = Math.max(...esquinas.map((p) => p[0])) + 10;
  const minY = Math.min(...esquinas.map((p) => p[1])) - 10, maxY = Math.max(...esquinas.map((p) => p[1])) + 20;
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="w-full h-auto drop-shadow-[0_30px_40px_rgba(15,29,46,0.35)]">
      <defs>
        <radialGradient id="luz-calida">
          <stop offset="0%" stopColor="#ffc47a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffc47a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke="#173a63" strokeOpacity="0.18" strokeWidth="0.6" strokeLinejoin="round">
        {ordenadas.map((c, i) => {
          const [tapa, caraX, caraY] = TONOS[c.tono];
          const { x, y, z, w, d, h } = c;
          return (
            <g key={i}>
              <polygon points={pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])} fill={caraX} />
              <polygon points={pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={caraY} />
              <polygon points={pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])} fill={tapa} />
            </g>
          );
        })}
      </g>
      <g opacity="0.85">
        {LUCES.map(([x, y, z], i) => {
          const [cx, cy] = proy(x, y, z);
          return <ellipse key={i} cx={cx} cy={cy} rx={70} ry={42} fill="url(#luz-calida)" />;
        })}
      </g>
    </svg>
  );
}
