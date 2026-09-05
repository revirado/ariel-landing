'use client';

// ============================================================
// DomPreloader — preloader DOM (canvas 2D, no three.js).
// Barato: ~800 puntos dibujados como arcs en canvas 2D por frame.
// Grilla análoga al plano del hero, con pulso diagonal tipo heartbeat.
// Fade-out al cargar la página.
//
// Configurable: cantidad de puntos (via spacing), tamaño min/max,
// duración del pulso, frecuencia (pausa = pulso × multiplier).
// ============================================================

import { useEffect, useRef, useState } from 'react';

// ============================================
// SETTINGS DEL DOM PRELOADER — AJUSTAR AQUÍ
// ============================================
const DOM_PRELOADER_ENABLED = true;

const DOM_PRELOADER_BG = '#050505';
const DOM_PRELOADER_DOT_COLOR = '#ffffff';

// Grilla (densidad y puntos)
const DOM_PRELOADER_GRID_SPACING = 38; // px entre puntos — menor = más denso
const DOM_PRELOADER_DOT_MIN_SIZE = 2; // px — tamaño en reposo
const DOM_PRELOADER_DOT_MAX_SIZE = 7; // px — tamaño en el pico del pulso

// Ritmo del pulso (heartbeat)
// La onda diagonal viaja durante PULSE_DURATION, luego pausa PULSE_DURATION × PAUSE_MULTIPLIER.
// Ritmo no mecánico: un pulso, pausa 3-4×, repetir.
const DOM_PRELOADER_PULSE_DURATION = 700; // ms — duración del viaje de la onda diagonal
const DOM_PRELOADER_DOT_PULSE_WIDTH = 280; // ms — cuánto dura el pulso individual de cada punto
const DOM_PRELOADER_PAUSE_MULTIPLIER = 4; // pausa = PULSE_DURATION × esto

// Fade-out al cargar la página
const DOM_PRELOADER_FADE_DELAY = 1200; // ms — delay antes del fade (mostrar ~1 pulso)
const DOM_PRELOADER_FADE_DURATION = 800; // ms — duración del fade-out

// ============================================

export function DomPreloader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(DOM_PRELOADER_ENABLED);

  useEffect(() => {
    if (!DOM_PRELOADER_ENABLED) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Eliminar el initial-overlay del layout inmediatamente — el canvas 2D
    // ya está montado y toma el control de tapar el contenido.
    const initialOverlay = document.getElementById('initial-overlay');
    if (initialOverlay) {
      initialOverlay.style.opacity = '0';
      // Remover del DOM después de la transición
      setTimeout(() => initialOverlay.remove(), 250);
    }

    let raf = 0;
    let faded = false;
    const startTime = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    // Ciclo: pulso + pausa. La onda viaja durante PULSE_DURATION,
    // luego silencio durante PULSE_DURATION × PAUSE_MULTIPLIER.
    const cycleDuration =
      DOM_PRELOADER_PULSE_DURATION * (1 + DOM_PRELOADER_PAUSE_MULTIPLIER);

    const unlockScroll = () => {
      document.documentElement.classList.remove('preloader-loading');
    };

    const draw = (now: number) => {
      const elapsed = now - startTime;

      // Fade-out
      let opacity = 1;
      if (elapsed >= DOM_PRELOADER_FADE_DELAY) {
        const fadeProgress = Math.min(
          1,
          (elapsed - DOM_PRELOADER_FADE_DELAY) / DOM_PRELOADER_FADE_DURATION,
        );
        opacity = 1 - fadeProgress;
        if (fadeProgress >= 1 && !faded) {
          faded = true;
          setVisible(false);
          // Desbloquear scroll cuando el preloader desaparece
          unlockScroll();
          return;
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      // Fondo
      ctx.fillStyle = DOM_PRELOADER_BG;
      ctx.fillRect(0, 0, w, h);

      // Grilla
      const spacing = DOM_PRELOADER_GRID_SPACING * dpr;
      const cols = Math.floor(w / spacing);
      const rows = Math.floor(h / spacing);
      const offsetX = (w - cols * spacing) / 2 + spacing / 2;
      const offsetY = (h - rows * spacing) / 2 + spacing / 2;

      // Onda diagonal — posición en el ciclo
      const cycleElapsed = elapsed % cycleDuration;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = DOM_PRELOADER_DOT_COLOR;

      const minSize = DOM_PRELOADER_DOT_MIN_SIZE * dpr;
      const maxSize = DOM_PRELOADER_DOT_MAX_SIZE * dpr;
      const sizeRange = maxSize - minSize;

      for (let row = 0; row <= rows; row++) {
        for (let col = 0; col <= cols; col++) {
          const x = offsetX + col * spacing;
          const y = offsetY + row * spacing;

          // Progreso diagonal: 0 en top-left, 1 en bottom-right
          const progress = (col + row) / (cols + rows);
          const dotReachTime = progress * DOM_PRELOADER_PULSE_DURATION;
          const dotLocalTime = cycleElapsed - dotReachTime;

          let size = minSize;
          if (
            dotLocalTime >= 0 &&
            dotLocalTime <= DOM_PRELOADER_DOT_PULSE_WIDTH
          ) {
            const t = dotLocalTime / DOM_PRELOADER_DOT_PULSE_WIDTH;
            const pulse = Math.sin(t * Math.PI); // 0 → 1 → 0
            size = minSize + sizeRange * pulse;
          }

          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      // Safety: si el componente se desmonta antes del fade, desbloquear scroll
      unlockScroll();
    };
  }, []);

  if (!DOM_PRELOADER_ENABLED || !visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[9998] pointer-events-none"
      style={{ background: DOM_PRELOADER_BG }}
      aria-hidden="true"
    />
  );
}
