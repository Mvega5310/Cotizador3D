// Íconos de línea (SVG en línea, sin dependencias). Heredan el color del texto.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconoCasaPlano({ className = "h-6 w-6" }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} {...base}>
      <path d="M4 15 15 6l11 9" />
      <path d="M7 13v13h8V19h-4v7" />
      <path d="M18 14h10v12H18z" />
      <path d="M18 18h10M18 22h10M22 14v12" strokeWidth="1.1" />
    </svg>
  );
}

export function IconoClip({ className = "h-5 w-5" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m20 11.5-8.3 8.3a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a1.7 1.7 0 0 1-2.5-2.5L14.6 7" />
    </svg>
  );
}

export function IconoEnviar({ className = "h-5 w-5" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

export function IconoFlechaAbajo({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconoMas({ className = "h-5 w-5" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconoCubo({ className = "h-5 w-5" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export function IconoSalir({ className = "h-4 w-4" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17 5 12l5-5M5 12h11" />
    </svg>
  );
}

// Marca: el mismo trazo de la casa-plano, en un recuadro.
export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${claro ? "bg-white/15 text-white ring-1 ring-white/25" : "bg-acento/10 text-acento"}`}>
        <IconoCasaPlano className="h-6 w-6" />
      </span>
    </span>
  );
}
