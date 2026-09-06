// SiteFooter — pie de página.

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-[#050505] px-5 sm:px-8 py-10 border-t border-white/5">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 font-mono text-white/40">
          <span className="text-white/30">{"//"}</span>
          <span>Ariel Lamas</span>
          <span className="text-white/20">·</span>
          <span>{year}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-white/35">
          <span>
            Built with Next.js · R3F · Three.js
          </span>
          <span className="text-white/20">·</span>
          <span>
            Puntos: <span className="text-white/55">4.000 desktop · 2.000 mobile</span>
          </span>
          <span className="text-white/20">·</span>
          <a
            href="#top"
            className="text-white/55 hover:text-white transition-colors"
          >
            ↑ Volver arriba
          </a>
        </div>
      </div>

      <p className="sr-only">
        Landing personal de Ariel Lamas construida con scroll-driven 3D particle
        animation basada en el algoritmo ORQ (Orquestador Reactivo) — ventana
        deslizante L/O/R sobre un estado disperso universal como pegamento entre
        modelos.
      </p>
    </footer>
  );
}
