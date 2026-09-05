'use client';

// HeroOverlay — texto del hero sobre la experiencia 3D.
// Se desvanece suavemente con el scroll para no competir con la animación.

import { useEffect, useRef, useState } from 'react';

export function HeroOverlay() {
  const [opacity, setOpacity] = useState(1);
  const [scrollHintOpacity, setScrollHintOpacity] = useState(0.6);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      // El texto principal se desvanece en el primer 60% del primer viewport
      const fade = Math.min(1, window.scrollY / (vh * 0.6));
      setOpacity(1 - fade);
      // El indicador de scroll se desvanece aún más rápido
      setScrollHintOpacity(Math.max(0, 0.6 - window.scrollY / (vh * 0.25)));
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-center px-6"
      style={{ opacity, transition: 'opacity 80ms linear' }}
      aria-hidden={opacity < 0.05}
    >
      <div className="max-w-3xl text-center">
        <p
          className="mb-6 text-[0.7rem] sm:text-xs font-mono uppercase tracking-[0.3em] text-white/40"
          style={{ opacity: opacity * 0.9 }}
        >
          Frontend · Three.js · Narrativa visual
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-light leading-[1.1] tracking-tight text-white">
          Donde el código tiene la
          <br />
          misma lógica que un
          <br />
          <span className="font-normal italic text-white/90">mundo por construir.</span>
        </h1>
      </div>

      {/* Indicador de scroll — animación sutil */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ opacity: scrollHintOpacity }}
      >
        <span className="text-[0.65rem] font-mono uppercase tracking-[0.25em] text-white/50">
          Scroll para explorar
        </span>
        <div className="relative h-8 w-px overflow-hidden bg-white/10">
          <div
            className="absolute left-0 top-0 h-3 w-px bg-white/70"
            style={{
              animation: 'scrollHint 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollHint {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(300%);
          }
        }
      `}</style>
    </div>
  );
}
