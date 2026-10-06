import type { Metadata } from "next";

// Los links públicos de un proyecto (y su página de impresión) no deben
// aparecer en buscadores: son de quien los recibe, no para el público.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LayoutCompartido({ children }: { children: React.ReactNode }) {
  return children;
}
