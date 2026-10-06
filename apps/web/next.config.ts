import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cotizador3d/engine"],
  // Las Server Actions aceptan 1 MB por defecto: una sola foto de celular lo
  // pasa. El formulario de planos acepta hasta 22 MB en total (ver
  // lib/actions/proyectos.ts); 25 MB deja margen para el resto del formulario.
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
