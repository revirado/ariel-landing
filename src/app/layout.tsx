import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ariel Lamas — Hago que las ideas tomen forma",
  description:
    "Ariel Lamas — frontend developer especializado en experiencias web inmersivas con Three.js. Narrativa visual, 3D con base matemática y dirección creativa.",
  keywords: [
    "Ariel Lamas",
    "Three.js",
    "React Three Fiber",
    "Frontend",
    "Next.js",
    "Narrativa visual",
    "3D",
    "Álgebra lineal",
  ],
  authors: [{ name: "Ariel Lamas" }],
  openGraph: {
    title: "Ariel Lamas — Hago que las ideas tomen forma",
    description:
      "Frontend developer especializado en experiencias web inmersivas con Three.js.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-white`}
      >
        {/* Overlay estático inicial — se muestra ANTES de que React cargue
            para tapar el contenido mientras el DOM preloader se monta.
            Se desvanece cuando el DomPreloader toma el control (lo elimina vía JS).
            Sin esto, el usuario ve el hero text sin fondo por los primeros frames. */}
        <div
          id="initial-overlay"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#050505',
            pointerEvents: 'none',
            transition: 'opacity 200ms ease-out',
          }}
        />
        {/* Bloqueo de scroll inicial — se remueve cuando el DomPreloader termina.
            Evita scroll durante la carga. */}
        <style dangerouslySetInnerHTML={{ __html: `
          html.preloader-loading { overflow: hidden !important; }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          document.documentElement.classList.add('preloader-loading');
        `}} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
