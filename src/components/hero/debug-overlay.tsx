'use client';

// ============================================================
// DebugOverlay — panel de inspección en runtime (fuera del Brief).
// Posición: fixed top-right debajo del header. Inmutable al scroll.
// Toggle: switch de shadcn/ui — el panel se colapsa pero el switch queda.
// Solo se monta si DEBUG_MODE (constante exportada de hero-scene.tsx) es true.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { DEBUG_MODE, EXPERIENCE_END_RP, TOTAL_SPINS } from './hero-scene';

// Tipo del snapshot que OrqController publica en window.__orqDebug
interface OrqDebugSnapshot {
  scrollY: number;
  rp: number;
  drp: number;
  i: number;
  gamma: [number, number];
  modeloBeta0: string | null;
  modeloBeta1: string | null;
  estado0: 'L' | 'O' | 'R' | null;
  estado1: 'L' | 'O' | 'R' | null;
  lp0: number;
  lp1: number;
  finL0: number;
  finR0: number;
  finL1: number;
  finR1: number;
  cap0Active: boolean;
  modeloAlpha: Array<{
    id: string;
    esPlano: boolean;
    tipo: string;
    SLE: number;
    SOE: number;
    SRE: number;
  }>;
  pointCount: number;
  experienceEndRp: number;
  totalSpins: number;
}

// Color por estado para identificar rápido L/O/R
const ESTADO_COLOR: Record<string, string> = {
  L: 'text-amber-300',
  O: 'text-emerald-300',
  R: 'text-rose-300',
};
const ESTADO_LABEL: Record<string, string> = {
  L: 'L (entrando)',
  O: 'O (contemplación)',
  R: 'R (saliendo)',
};

function formatNum(n: number, digits = 3): string {
  if (!isFinite(n)) return String(n);
  return n.toFixed(digits);
}

export function DebugOverlay() {
  // El flag DEBUG_MODE es compile-time. Si está en false, no se monta nada.
  // (Aunque page.tsx ya no lo renderiza, este guard protege contra imports
  // directos accidentales.)
  const [enabled, setEnabled] = useState(true);
  const [snap, setSnap] = useState<OrqDebugSnapshot | null>(null);
  const rafRef = useRef<number | null>(null);

  // Loop de actualización — lee window.__orqDebug en cada frame y actualiza state.
  // El state dispara re-render solo del panel, no del canvas (que vive en otro árbol).
  useEffect(() => {
    if (!DEBUG_MODE) return;
    const loop = () => {
      const w = window as any;
      if (w.__orqDebug) {
        setSnap(w.__orqDebug as OrqDebugSnapshot);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!DEBUG_MODE) return null;

  return (
    <div
      className="fixed top-16 right-2 z-40 select-none font-mono text-[11px] leading-relaxed sm:right-3"
      aria-label="Panel de debug (inspección ORQ)"
      role="region"
    >
      {/* Switch siempre visible — controla si el panel está colapsado o no */}
      <div
        className="mb-1 flex items-center justify-end gap-2 rounded-md border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur-sm"
        style={{ backdropFilter: 'blur(6px)' }}
      >
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
          Debug
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Activar o desactivar el panel de debug"
        />
      </div>

      {/* Panel de variables — solo visible si enabled.
          Responsive: en móvil el panel es más angosto y más compacto. */}
      {enabled && snap && (
        <div
          className="max-h-[70vh] w-[240px] overflow-y-auto rounded-md border border-white/10 bg-black/70 p-2.5 text-white/90 shadow-xl backdrop-blur-sm sm:w-[280px] sm:max-h-[80vh] sm:p-3"
          style={{ backdropFilter: 'blur(6px)', scrollbarWidth: 'thin' }}
        >
          {/* ── Scroll & RP ── */}
          <Section title="Scroll">
            <Row label="scrollY" value={`${Math.round(snap.scrollY)} px`} />
            <Row
              label="RP"
              value={formatNum(snap.rp)}
              hint="vueltas"
            />
            {/* Barra de progreso de RP (0 → EXPERIENCE_END_RP) */}
            <ProgressBar
              value={snap.rp}
              min={0}
              max={snap.experienceEndRp}
              colorClass="bg-white/70"
              labelPrefix="RP"
              showPercent
            />
            <Row
              label="DRP"
              value={formatNum(snap.drp)}
              hint="delta/vueltas"
              highlight={Math.abs(snap.drp) > 0.5}
            />
            <Row
              label="fin experiencia"
              value={`${formatNum(snap.experienceEndRp, 3)} (RP)`}
              hint={`${Math.round(snap.experienceEndRp * 800)} px`}
              muted
            />
            <Row
              label="totalSpins (naive)"
              value={formatNum(snap.totalSpins)}
              hint={`${Math.round(snap.totalSpins * 800)} px`}
              muted
            />
          </Section>

          {/* ── Ventana deslizante ── */}
          <Section title="Ventana (β)">
            <Row label="i (índice)" value={String(snap.i)} />
            <Row
              label="β[0]"
              value={snap.modeloBeta0 ? `α[${snap.i}] ${snap.modeloBeta0}` : '—'}
              highlight={!!snap.modeloBeta0}
            />
            <Row
              label="β[1]"
              value={snap.modeloBeta1 ? `α[${snap.i + 1}] ${snap.modeloBeta1}` : '—'}
              highlight={!!snap.modeloBeta1}
            />
          </Section>

          {/* ── Estados y LP de β ── */}
          <Section title="Estados & LP (β)">
            {snap.modeloBeta0 && (
              <>
                <Row
                  label={`α[${snap.i}] ${snap.modeloBeta0}.estado`}
                  value={
                    snap.estado0
                      ? ESTADO_LABEL[snap.estado0]
                      : '—'
                  }
                  valueClassName={snap.estado0 ? ESTADO_COLOR[snap.estado0] : ''}
                />
                <LpBar
                  label={`α[${snap.i}] ${snap.modeloBeta0}.LP`}
                  lp={snap.lp0}
                  modelo={snap.modeloAlpha[snap.i]}
                  estado={snap.estado0}
                />
              </>
            )}
            {snap.modeloBeta1 && (
              <>
                <Row
                  label={`α[${snap.i + 1}] ${snap.modeloBeta1}.estado`}
                  value={
                    snap.estado1
                      ? ESTADO_LABEL[snap.estado1]
                      : '—'
                  }
                  valueClassName={snap.estado1 ? ESTADO_COLOR[snap.estado1] : ''}
                />
                <LpBar
                  label={`α[${snap.i + 1}] ${snap.modeloBeta1}.LP`}
                  lp={snap.lp1}
                  modelo={snap.modeloAlpha[snap.i + 1]}
                  estado={snap.estado1}
                />
              </>
            )}
            {snap.cap0Active && (
              <div className="mt-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300/80">
                cap activo · γ[0] freezeado en finR
              </div>
            )}
          </Section>

          {/* ── Vector general α ── */}
          <Section title="Modelos (α)">
            <div className="mb-1 text-white/40">
              Nₓ = {snap.pointCount || '—'} pts (todos)
            </div>
            <ol className="space-y-1.5">
              {snap.modeloAlpha.map((m, idx) => {
                const isActive = idx === snap.i || idx === snap.i + 1;
                return (
                  <li
                    key={m.id}
                    className="rounded border border-white/5 px-1.5 py-1"
                    style={{
                      borderColor: isActive
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(255,255,255,0.05)',
                      background: isActive
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          isActive ? 'text-white' : 'text-white/55'
                        }
                      >
                        [{idx}] {m.id}
                      </span>
                      {isActive && (
                        <span className="text-[9px] uppercase tracking-wider text-white/40">
                          {idx === snap.i ? 'β[0]' : 'β[1]'}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-white/40">
                      {m.tipo} · SLE {m.SLE} · SOE {m.SOE} · SRE {m.SRE}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          {/* ── Footer del panel ── */}
          <div className="mt-2 border-t border-white/5 pt-1.5 text-[9px] uppercase tracking-wider text-white/30">
            ORQ · Brief v1.6 · debug
          </div>
        </div>
      )}

      {/* Si enabled pero aún no hay snapshot */}
      {enabled && !snap && (
        <div className="w-[240px] rounded-md border border-white/10 bg-black/70 p-3 text-white/50 backdrop-blur-sm sm:w-[280px]">
          Esperando datos del OrqController…
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ──

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-white/35">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  highlight,
  muted,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  muted?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={
          muted ? 'text-white/35' : 'text-white/55'
        }
      >
        {label}
      </span>
      <span className="flex items-baseline gap-1.5 truncate">
        <span
          className={
            valueClassName ??
            (highlight ? 'text-white font-semibold' : 'text-white/85')
          }
        >
          {value}
        </span>
        {hint && (
          <span className="text-[9px] text-white/30">{hint}</span>
        )}
      </span>
    </div>
  );
}

// ── Barra de progreso genérica (para RP) ──
function ProgressBar({
  value,
  min,
  max,
  colorClass,
  labelPrefix,
  showPercent,
}: {
  value: number;
  min: number;
  max: number;
  colorClass: string;
  labelPrefix?: string;
  showPercent?: boolean;
}) {
  const range = max - min;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((value - min) / range) * 100)) : 0;
  return (
    <div className="py-0.5">
      {(labelPrefix || showPercent) && (
        <div className="mb-0.5 flex items-baseline justify-between text-[10px]">
          {labelPrefix && (
            <span className="text-white/45">{labelPrefix}</span>
          )}
          {showPercent && (
            <span className="text-white/55 tabular-nums">
              {pct.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Barra de LP para un modelo en β, con segmentos L/O/R y color por estado ──
function LpBar({
  label,
  lp,
  modelo,
  estado,
}: {
  label: string;
  lp: number;
  modelo: { SLE: number; SOE: number; SRE: number } | undefined;
  estado: 'L' | 'O' | 'R' | null;
}) {
  if (!modelo) return null;
  const finL = modelo.SLE;
  const finO = modelo.SLE + modelo.SOE;
  const finR = modelo.SLE + modelo.SOE + modelo.SRE;
  const total = finR;

  // Posición del thumb (LP actual) como % del total
  const pct = total > 0 ? Math.min(100, Math.max(0, (lp / total) * 100)) : 0;

  // Anchos de cada segmento L/O/R como % del total
  const segL = (finL / total) * 100;
  const segO = (finO - finL) / total * 100;
  const segR = (finR - finO) / total * 100;

  // Color del thumb según estado
  const thumbColor =
    estado === 'L' ? 'bg-amber-300' :
    estado === 'O' ? 'bg-emerald-300' :
    estado === 'R' ? 'bg-rose-300' :
    'bg-white/50';

  // Color del texto del valor numérico según estado
  const valueColor =
    estado === 'L' ? 'text-amber-300' :
    estado === 'O' ? 'text-emerald-300' :
    estado === 'R' ? 'text-rose-300' :
    'text-white/85';

  return (
    <div className="py-1">
      {/* Label + valor numérico arriba */}
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-white/55">{label}</span>
        <span className={`tabular-nums ${valueColor}`}>
          {formatNum(lp)}
          <span className="ml-1 text-[9px] text-white/30">/ {formatNum(finR)}</span>
        </span>
      </div>
      {/* Track con segmentos L (amber) / O (emerald) / R (rose) */}
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={lp}
        aria-valuemin={0}
        aria-valuemax={finR}
      >
        {/* Segmento L */}
        <div
          className="absolute top-0 left-0 h-full bg-amber-300/25"
          style={{ width: `${segL}%` }}
        />
        {/* Segmento O */}
        <div
          className="absolute top-0 h-full bg-emerald-300/25"
          style={{ left: `${segL}%`, width: `${segO}%` }}
        />
        {/* Segmento R */}
        <div
          className="absolute top-0 h-full bg-rose-300/25"
          style={{ left: `${segL + segO}%`, width: `${segR}%` }}
        />
        {/* Thumb (posición actual de LP) — más visible que el fill del segmento */}
        <div
          className={`absolute top-0 h-full w-0.5 ${thumbColor}`}
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}
