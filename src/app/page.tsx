import { DEBUG_MODE, HeroScene, SCROLL_WRAPPER_HEIGHT_CSS } from '@/components/hero/hero-scene';
import { HeroOverlay } from '@/components/hero/hero-overlay';
import { DebugOverlay } from '@/components/hero/debug-overlay';
import { DomPreloader } from '@/components/hero/dom-preloader';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Capabilities } from '@/components/sections/capabilities';
import { Manifesto } from '@/components/sections/manifesto';
import { Contact } from '@/components/sections/contact';

export default function Home() {
  return (
    <div
      id="top"
      className="relative min-h-screen flex flex-col bg-[#050505] text-white overflow-x-hidden"
    >
      {/* Skip link para accesibilidad */}
      <a
        href="#capacidades"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#050505]"
      >
        Saltar al contenido
      </a>

      {/* DOM Preloader — canvas 2D barato con heartbeat pulse diagonal.
          Fade-out al cargar. z-[60] para estar sobre todo. */}
      <DomPreloader />

      {/* Canvas 3D fijo al fondo — el scroll se drives desde el wrapper de abajo */}
      <HeroScene />

      {/* Header fijo arriba — se vuelve sólido al hacer scroll en el contenido */}
      <SiteHeader />

      {/* Overlay de texto del hero — se desvanece con el scroll */}
      <HeroOverlay />

      {/* Panel de debug — solo se monta si DEBUG_MODE (constante) es true.
          El usuario puede togglear su visibilidad desde el switch shadcn/ui.
          No afecta la UI existente; posición fixed, inmutable al scroll. */}
      {DEBUG_MODE && <DebugOverlay />}

      {/* Contenido principal en flujo normal, encima del canvas */}
      <main className="relative z-10 flex flex-col flex-1">
        {/* Spacer que da altura a la experiencia 3D.
            Altura = HERO_END_RP * PIXELS_PER_SPIN + 100vh.
            El content aparece cuando el último modelo empieza R (sin gap negro). */}
        <section
          aria-label="Experiencia visual interactiva"
          style={{ height: SCROLL_WRAPPER_HEIGHT_CSS }}
          className="relative"
        />

        {/* Secciones de contenido con fondo sólido — cubren el canvas */}
        <Capabilities />
        <Manifesto />
        <Contact />
      </main>

      <SiteFooter />
    </div>
  );
}
