// Capabilities — bloque de capacidades (texto directo, no 3D).
//
// SECCIÓN DESHABilitada por decisión del cliente (brief-modificaciones-textos.md §"Fuera de alcance").
// El código se mantiene intacto para posible reactivación futura.
// Para reactivar: cambiar `export const CAPABILITIES_ENABLED = false` a `true`
// y volver a renderizar <Capabilities /> en src/app/page.tsx.

export const CAPABILITIES_ENABLED = false;

const CAPACIDADES = [
  {
    n: '01',
    titulo: 'Three.js · R3F',
    descripcion:
      'Experiencias web inmersivas con partículas, shaders y scroll-driven storytelling. Geometría procedural y transiciones de estado controladas.',
    tags: ['R3F', 'GLSL', 'BufferGeometry', 'Points'],
  },
  {
    n: '02',
    titulo: 'Frontend React · Next.js',
    descripcion:
      'UIs performantes y accesibles. Server components, streaming, edge rendering. Estado cliente predecible y tipos estrictos de punta a punta.',
    tags: ['Next.js 16', 'TypeScript', 'Server Components', 'Tailwind'],
  },
  {
    n: '03',
    titulo: 'Narrativa visual',
    descripcion:
      'Background en ilustración y composición. Cada pixel tiene una intención: el rigor visual hereda de la ilustración tanto como del código.',
    tags: ['Composición', 'Color', 'Easing', 'Storytelling'],
  },
  {
    n: '04',
    titulo: '3D matemático',
    descripcion:
      'Álgebra lineal aplicada a shaders y geometría. Transformaciones, cuaterniones, muestreo de superficie y PRNG seedable — la matemática como herramienta narrativa.',
    tags: ['Álgebra lineal', 'MeshSurfaceSampler', 'Quaternions', 'PRNG'],
  },
  {
    n: '05',
    titulo: 'Dirección creativa',
    descripcion:
      'Concept-to-ship de proyectos completos. Del manifiesto al deploy. Hoy la web, mañana potencialmente otros mundos — videojuegos incluidos.',
    tags: ['Concept', 'Art Direction', 'Production', 'Ship'],
  },
];

export function Capabilities() {
  return (
    <section
      id="capacidades"
      className="relative bg-[#050505] px-5 sm:px-8 py-24 sm:py-32 border-t border-white/5"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 sm:mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
            {"// Capacidades"}
          </p>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-light tracking-tight text-white">
            Cinco capas, una sola pieza.
          </h2>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-white/60 leading-relaxed">
            No es una lista de servicios — es la pila completa que se necesita
            para convertir una idea en una experiencia enviada. Cada capa
            sostiene a la siguiente.
          </p>
        </header>

        <ul className="grid gap-px bg-white/5 border border-white/5">
          {CAPACIDADES.map((c) => (
            <li
              key={c.n}
              className="group relative bg-[#050505] p-6 sm:p-8 transition-colors duration-300 hover:bg-white/[0.02]"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-8">
                <div className="flex sm:flex-col sm:gap-1 sm:w-16 sm:flex-shrink-0 mb-3 sm:mb-0">
                  <span className="font-mono text-xs text-white/30">{c.n}</span>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-normal text-white mb-3">
                    {c.titulo}
                  </h3>
                  <p className="text-sm sm:text-base text-white/55 leading-relaxed max-w-2xl">
                    {c.descripcion}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <li
                        key={t}
                        className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-white/40 border border-white/10 rounded-full px-2.5 py-1"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="absolute top-0 left-0 h-px w-0 bg-white/30 transition-all duration-500 group-hover:w-full"
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
