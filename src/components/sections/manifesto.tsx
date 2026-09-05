// Manifesto — texto del manifiesto corto, separado del hero.

export function Manifesto() {
  return (
    <section
      id="manifiesto"
      className="relative bg-[#050505] px-5 sm:px-8 py-24 sm:py-32 border-t border-white/5"
    >
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-8">
          {"// Manifiesto"}
        </p>
        <blockquote className="space-y-6 text-xl sm:text-2xl md:text-3xl font-light leading-[1.4] text-white/85 tracking-tight">
          <p>
            Un plano es un mundo que no ha decidido formarse.
          </p>
          <p>
            Una nube dispersa es un mundo que aún no ha decidido qué forma tomar.
          </p>
          <p>
            El código, como el universo, parte del caos y construye orden solo
            cuando alguien decide observarlo.
          </p>
          <p className="pt-4 text-white/60 italic">
            "Donde el código tiene la misma lógica que un mundo por construir."
          </p>
        </blockquote>

        <p className="mt-12 max-w-2xl text-sm text-white/45 leading-relaxed">
          Esta landing es la pieza misma que describe. El plano, la dispersión,
          el ensamblaje: cada estado de los puntos es una afirmación sobre
          qué significa construir. El scroll del observador decide cuándo
          aparece el orden y cuándo vuelve el caos.
        </p>
      </div>
    </section>
  );
}
