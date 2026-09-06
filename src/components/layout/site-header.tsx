'use client';

// SiteHeader — barra superior fija.
// Transparente sobre la experiencia 3D, sutil backdrop blur cuando hay
// contenido detrás (secciones de texto).

import { useEffect, useState } from 'react';

// Capacidades: deshabilitada por el cliente (brief-modificaciones-textos.md §"Fuera de alcance").
const NAV_ITEMS = [
  { label: 'Manifiesto', href: '#manifiesto' },
  { label: 'Contacto', href: '#contacto' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 transition-colors duration-300"
      style={{
        background: scrolled ? 'rgba(5, 5, 5, 0.7)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <nav
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8"
        aria-label="Navegación principal"
      >
        <a
          href="#top"
          className="font-mono text-xs tracking-[0.2em] text-white/80 hover:text-white transition-colors"
          aria-label="Inicio — Ariel Lamas"
        >
          <span className="text-white/50">{"// "}</span>
          Ariel Lamas
        </a>

        <ul className="flex items-center gap-6 text-xs sm:text-sm">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="font-mono text-white/60 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
          <li className="hidden sm:block">
            <a
              href="#contacto"
              className="rounded-full border border-white/15 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-white/80 hover:bg-white hover:text-[#050505] transition-colors"
            >
              Hablemos
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
