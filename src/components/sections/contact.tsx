// Contact — bloque de contacto simple.

const CHANNELS = [
  {
    label: 'Email',
    value: 'hola@estudio.dev',
    href: 'mailto:hola@estudio.dev',
    hint: 'Para proyectos y colaboraciones',
  },
  {
    label: 'GitHub',
    value: 'github.com/estudio-dev',
    href: 'https://github.com',
    hint: 'Código abierto y experimentos',
  },
  {
    label: 'X · Twitter',
    value: '@estudio_dev',
    href: 'https://x.com',
    hint: 'Notas, enlaces y observaciones',
  },
  {
    label: 'LinkedIn',
    value: 'in/estudio-dev',
    href: 'https://linkedin.com',
    hint: 'Trayectoria profesional',
  },
];

export function Contact() {
  return (
    <section
      id="contacto"
      className="relative bg-[#050505] px-5 sm:px-8 py-24 sm:py-32 border-t border-white/5"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 sm:mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            {"// Contacto"}
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
            Hablemos.
          </h2>
          <p className="mt-4 max-w-xl text-sm sm:text-base text-white/60 leading-relaxed">
            Soy <span className="text-white/90 font-medium">Ariel Lamas</span> — frontend developer especializado en experiencias web inmersivas. Si tienes una idea que necesita existir en la web — ya sea un portfolio, una experiencia interactiva o un producto — escribime. Respondo en menos de 48h.
          </p>
        </header>

        <ul className="grid gap-px bg-white/5 border border-white/5 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <li key={c.label} className="bg-[#050505]">
              <a
                href={c.href}
                target={c.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={c.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="group block p-6 sm:p-8 transition-colors duration-300 hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">
                    {c.label}
                  </span>
                  <span
                    className="text-white/30 transition-all duration-300 group-hover:text-white/80 group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
                <p className="mt-3 text-lg sm:text-xl text-white font-normal">
                  {c.value}
                </p>
                <p className="mt-2 text-sm text-white/40">{c.hint}</p>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12 sm:mt-16 p-6 sm:p-8 border border-white/10 rounded-lg">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-white/40 mb-3">
            {"// Disponibilidad"}
          </p>
          <p className="text-base text-white/80 leading-relaxed">
            Aceptando proyectos para el primer semestre de 2026. Especial interés
            en experiencias inmersivas, portfolios de producto y piezas que unan
            construcción digital y dirección visual.
          </p>
        </div>
      </div>
    </section>
  );
}
