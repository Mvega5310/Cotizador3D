import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MARCA, MARCA_LEMA } from "@/lib/marca";

// Sans geométrica, moderna y técnica para toda la interfaz.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${MARCA} ${MARCA_LEMA}`,
  description: "Modelo 3D, renders y cotización a partir de tus planos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-marca-50 text-marca-900">{children}</body>
    </html>
  );
}
