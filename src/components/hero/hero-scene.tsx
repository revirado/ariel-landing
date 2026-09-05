'use client';

// ============================================================
// HeroScene.tsx — Landing Personal (MVP) — Brief Técnico v1.6
// Archivo monolítico autocontenido (Brief §12).
// Orden:
//   0. 'use client' (Brief §3.1)
//   1. Settings (Brief §2)
//   2. Funciones ORQ (Brief §5.3–§5.6)
//   3. Helpers: PRNG, muestreo, dispersión, easing, opacidad (Brief §5.8, §6.1, §7)
//   4. Componente interno R3F: ModeloPoints (Brief §5.10, §9.1)
//   5. Wrapper React + Canvas + scroll listener (Brief §9)
// ============================================================

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

// ============================================================
// 1. SETTINGS DEL HERO — AJUSTAR AQUÍ (Brief §2)
// ============================================================

// --- Escena (§2.1) ---
const POINT_COUNT_DESKTOP = 4000;
const POINT_COUNT_MOBILE = 2000;

const PLANE_WIDTH = 10;
const PLANE_HEIGHT = 6;
const PLANE_Z = 0;

const CAMERA_FOV = 50;
const CAMERA_POSITION: [number, number, number] = [0, 0, 12];

const POINT_COLOR = '#ffffff';
const BACKGROUND_COLOR = '#050505';

const POINT_SIZE = 0.03;
const POINT_SIZE_ATTENUATION = true;

const POINT_OPACITY = 0.9;
const POINT_TRANSPARENT = true;
const POINT_DEPTH_WRITE = false;

// --- ORQ (§2.2) ---
const PIXELS_PER_SPIN = 1800;
type EstadoModelo = 'L' | 'O' | 'R';

type TipoGeometria = 'cubo' | 'toro' | 'icosa';

interface ModeloSpinConfig {
  id: string;
  esPlano?: boolean;
  tipoGeometria?: TipoGeometria;
  SLE: number;
  SOE: number;
  SRE: number;
}

// Plano: SLE=0 → arranca directo en 'O' (contemplación) con LP=0 y rotación 0.
// No hay fase 'L' (fade-in) para el primer modelo — se ve ensamblado desde
// el primer frame, complementando al preloader que hace el fade-out visual.
const MODELOS_CONFIG: ModeloSpinConfig[] = [
  { id: 'plano', esPlano: true, SLE: 0.0, SOE: 1.0, SRE: 0.5 },
  { id: 'modeloA', tipoGeometria: 'cubo', SLE: 0.5, SOE: 2.0, SRE: 0.5 },
  { id: 'modeloB', tipoGeometria: 'toro', SLE: 0.5, SOE: 1.0, SRE: 0.5 },
];

const ROTATION_SPEED_ENTRADA_SALIDA = 1.0;
const ROTATION_SPEED_CONTEMPLACION = 1.0;
const ROTATION_TILT_X = 0.3;

const DISPERSION_RADIUS = 10.0;
const DISPERSION_SEED = 42;

// --- Puntero (§2.3) ---
const MOUSE_THRESHOLD_NDC = 0.08;
const MOUSE_REPULSION_FORCE = 1.0;
const MOUSE_RETURN_SPEED = 0.1;
const MOUSE_ENABLED = true;

// --- Cubo placeholder (§2.4) ---
const CUBE_SIZE = 3;
const CUBE_SUBDIVISIONS = 40;

// --- Preloader (fuera del Brief) ---
// Plano preloader 3D: deshabilitado — muy caro para los recursos del navegador.
// El código se mantiene para posible uso futuro. Para reactivar:
//   1. Cambiar PRELOADER_PLANE_ENABLED a true
//   2. El componente PreloaderPlane se renderiza condicionalmente en el Canvas
const PRELOADER_PLANE_ENABLED = false;
const PRELOADER_DELAY_MS = 1500; // delay antes del fade-out (para testear)
const PRELOADER_FADE_MS = 800; // duración del fade-out
// Color del preloader para debug: distinto de POINT_COLOR para poder ver el
// fade. Cambiar a '#ffffff' (igual que POINT_COLOR) cuando se quiera el efecto
// final imperceptible — el preloader "es" el hero plane.
const PRELOADER_COLOR = '#0088ff';

// --- Cobertura del plano (100% de la pantalla) ---
// Las dimensiones del plano se calculan dinámicamente al montar, basándose en
// el FOV de la cámara, la distancia, y el aspect ratio del viewport. Esto
// asegura que el plano (preloader y hero) cubra el 100% de la pantalla sin
// depender de un aspect fijo. El factor añade un margen de seguridad.
const PLANE_COVERAGE_FACTOR = 1.05;

// --- DEBUG (fuera del Brief) ---
// Flag compile-time: cuando es true, se monta el DebugOverlay en page.tsx
// y se exponen variables internas en window.__orqDebug para inspección.
// El usuario puede togglear la visibilidad del panel desde un switch en la UI.
export const DEBUG_MODE = true;

// --- Derivados (Brief §4) ---
export const TOTAL_SPINS = MODELOS_CONFIG.reduce(
  (acc, m) => acc + m.SLE + m.SOE + m.SRE,
  0,
);
export const PIXELS_PER_SPIN_EXPORT = PIXELS_PER_SPIN;

// NOTE: TOTAL_SPINS (suma naive de SLE+SOE+SRE) sobreestima el final real de
// la experiencia — los solapes de crossfade hacen que el último modelo
// termine 'R' antes de llegar a TOTAL_SPINS. EXPERIENCE_END_RP es el RP
// donde el último modelo se vuelve invisible; lo usamos como cota superior
// del scroll para evitar espacio muerto (canvas negro) al final.
function computeExperienceEndRp(alpha: ModeloSpinConfig[]): number {
  let i = 0;
  const gamma: [number, number] = [alpha[0]?.SLE ?? 0, 0];
  let rp = 0;
  const step = 0.005;
  const maxRp = alpha.reduce((a, m) => a + m.SLE + m.SOE + m.SRE, 0) + 5;
  const lastModel = alpha[alpha.length - 1];

  if (alpha.length < 2) return alpha[0]?.SLE ?? 0;

  let lastVisibleRp = 0;

  while (rp < maxRp) {
    const beta0 = alpha[i];
    const beta1 = alpha[i + 1];
    if (!beta1) {
      gamma[0] += step;
      rp += step;
      continue;
    }

    const omega: [EstadoModelo, EstadoModelo] = [
      getEstado(beta0, gamma[0]),
      getEstado(beta1, gamma[1]),
    ];
    const enBordeDerecho = omega[1] === 'R';

    if (enBordeDerecho) {
      if (i + 1 < alpha.length - 1) {
        gamma[0] = gamma[1];
        gamma[1] = 0;
        i += 1;
      } else {
        gamma[1] += step;
      }
    } else {
      gamma[0] += step;
      if (omega[0] === 'R') gamma[1] += step;
      // Mismo cap de simetría que orquestarStep: γ[0] no pasa de finR de β[0].
      const finR0 = beta0.SLE + beta0.SOE + beta0.SRE;
      if (gamma[0] > finR0) gamma[0] = finR0;
    }

    rp += step;

    if (i === alpha.length - 2) {
      const lpLast = gamma[1];
      const estadoLast = getEstado(lastModel, lpLast);
      const finR_last = lastModel.SLE + lastModel.SOE + lastModel.SRE;
      // Visible si NO está en 'R' finalizado (lpLast > finR_last)
      if (estadoLast !== 'R' || lpLast < finR_last) {
        lastVisibleRp = rp;
      }
    }
  }

  return Math.max(lastVisibleRp, 0.5);
}

export const EXPERIENCE_END_RP = computeExperienceEndRp(MODELOS_CONFIG);

// Calcula el RP donde el último modelo ENTRA en estado 'R' (empieza a fade-out).
// Este es el punto donde la siguiente sección (contenido) debe empezar a
// aparecer, para que el content cubra el canvas exactamente mientras el último
// modelo se desvanece — sin gap negro.
function computeHeroEndRp(alpha: ModeloSpinConfig[]): number {
  let i = 0;
  const gamma: [number, number] = [alpha[0]?.SLE ?? 0, 0];
  let rp = 0;
  const step = 0.005;
  const maxRp = alpha.reduce((a, m) => a + m.SLE + m.SOE + m.SRE, 0) + 5;
  const lastModel = alpha[alpha.length - 1];
  const finO_last = lastModel.SLE + lastModel.SOE;

  if (alpha.length < 2) return alpha[0]?.SLE ?? 0;

  while (rp < maxRp) {
    const beta0 = alpha[i];
    const beta1 = alpha[i + 1];
    if (!beta1) {
      gamma[0] += step;
      rp += step;
      continue;
    }

    const omega: [EstadoModelo, EstadoModelo] = [
      getEstado(beta0, gamma[0]),
      getEstado(beta1, gamma[1]),
    ];
    const enBordeDerecho = omega[1] === 'R';

    if (enBordeDerecho) {
      if (i + 1 < alpha.length - 1) {
        gamma[0] = gamma[1];
        gamma[1] = 0;
        i += 1;
      } else {
        gamma[1] += step;
      }
    } else {
      gamma[0] += step;
      if (omega[0] === 'R') gamma[1] += step;
      const finR0 = beta0.SLE + beta0.SOE + beta0.SRE;
      if (gamma[0] > finR0) gamma[0] = finR0;
    }

    rp += step;

    // El último modelo (β[1] en la última ventana) entra en R cuando
    // gamma[1] >= finO del último modelo.
    if (i === alpha.length - 2 && gamma[1] >= finO_last) {
      return rp;
    }
  }

  return maxRp;
}

export const HERO_END_RP = computeHeroEndRp(MODELOS_CONFIG);
// El spacer termina en HERO_END_RP + 100vh: el content aparece (bottom del
// viewport) cuando RP = HERO_END_RP (último modelo empieza R), y cubre el canvas
// 100vh después — exactamente cuando el último modelo termina R (sin gap negro).
export const SCROLL_WRAPPER_HEIGHT_CSS = `calc(${HERO_END_RP} * ${PIXELS_PER_SPIN}px + 100vh)`;


// ============================================================
// 2. ORQ — Funciones (Brief §5.3–§5.6)
// ============================================================

function getEstado(modelo: ModeloSpinConfig, lp: number): EstadoModelo {
  const finL = modelo.SLE;
  const finO = modelo.SLE + modelo.SOE;
  // Límite estricto (<) en finL (§5.3): permite que el primer modelo
  // inicializado en lp = finL caiga directo en "O".
  if (lp < finL) return 'L';
  if (lp <= finO) return 'O';
  return 'R';
}

function progresoEnEstado(
  modelo: ModeloSpinConfig,
  lp: number,
  estado: EstadoModelo,
): number {
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  switch (estado) {
    case 'L':
      return clamp01(lp / modelo.SLE);
    case 'O':
      return clamp01((lp - modelo.SLE) / modelo.SOE);
    case 'R':
      return clamp01((lp - modelo.SLE - modelo.SOE) / modelo.SRE);
  }
}

interface OrqState {
  i: number;
  gamma: [number, number];
  rpAnterior?: number;
}

function orquestar(
  rp: number,
  rpAnterior: number,
  alpha: ModeloSpinConfig[],
  estado: OrqState,
): void {
  const drpTotal = rp - rpAnterior;
  if (drpTotal === 0) return;

  // Sub-divide el drp para scroll rápido (Brief §14 — pregunta abierta resuelta):
  // con |drp| grande, una sola pasada del algoritmo de ventana deslizante
  // podría sobrepasar el borde de L/R sin detectarlo, dejando a gamma con
  // valores fuera de su rango válido (ej. negativos en 'L').
  // Procesamos en pasos chicos para que la detección de enBordeIzquierdo /
  // enBordeDerecho dispare correctamente en cada cruce de umbral.
  const MAX_STEP = 0.05; // cada sub-paso < 5% de un spin
  const steps = Math.max(
    1,
    Math.min(1000, Math.ceil(Math.abs(drpTotal) / MAX_STEP)),
  );
  const stepDrp = drpTotal / steps;

  for (let s = 0; s < steps; s++) {
    orquestarStep(stepDrp, alpha, estado);
  }
}

function orquestarStep(
  drp: number,
  alpha: ModeloSpinConfig[],
  estado: OrqState,
): void {
  if (drp === 0) return;

  const i = estado.i;
  const beta0 = alpha[i];
  const beta1 = alpha[i + 1];

  if (!beta1) {
    // Un solo modelo en β — solo acumula gamma[0]
    estado.gamma[0] += drp;
    return;
  }

  const omega: [EstadoModelo, EstadoModelo] = [
    getEstado(beta0, estado.gamma[0]),
    getEstado(beta1, estado.gamma[1]),
  ];

  const enBordeIzquierdo = omega[0] === 'L';
  const enBordeDerecho = omega[1] === 'R';

  if (drp > 0) {
    // --- Avance (Brief §5.4) ---
    if (enBordeDerecho) {
      if (estado.i + 1 < alpha.length - 1) {
        estado.gamma[0] = estado.gamma[1];
        estado.gamma[1] = 0;
        estado.i += 1;
      } else {
        estado.gamma[1] += drp;
      }
    } else {
      estado.gamma[0] += drp;
      if (omega[0] === 'R') estado.gamma[1] += drp;
      // CAP de simetría (fix bug "no puedo volver al plano" + "invisible time" en reversa):
      // En forward, cuando β[0] está en R, ambos γ[0] y γ[1] incrementan. Pero γ[0]
      // past finR es "progreso desperdiciado" — el modelo ya está a opacity 0.
      // Sin este cap, γ[0] acumula unidades extra que en reversa hay que "deshacer"
      // (mientras ω[1] != 'L' el algoritmo no toca γ[0]), creando asimetría:
      // reverse necesita más RP que forward para volver al mismo estado.
      // Con el cap, γ[0] se freezea en finR → reverse es simétrico a forward.
      const finR0 = beta0.SLE + beta0.SOE + beta0.SRE;
      if (estado.gamma[0] > finR0) estado.gamma[0] = finR0;
    }
  } else {
    // --- Retroceso (Brief §5.4, §5.6) ---
    if (enBordeIzquierdo) {
      if (estado.i > 0) {
        const oldGamma0 = estado.gamma[0];
        estado.i -= 1;
        const prevModelo = alpha[estado.i];
        estado.gamma[0] = prevModelo.SLE + prevModelo.SOE + prevModelo.SRE;
        estado.gamma[1] = oldGamma0;
      } else {
        estado.gamma[0] += drp;
      }
    } else {
      estado.gamma[1] += drp;
      if (omega[1] === 'L') estado.gamma[0] += drp;
    }
  }

  // FIX: en i=0, el primer modelo nunca debe caer por debajo de finL (su
  // estado inicial "O" ensamblado). Sin esto, un scroll reverso deja al
  // primer modelo invisible al volver al top — violando el criterio §13
  // "Al scrollear hacia arriba, todo el proceso se invierte correctamente".
  if (estado.i === 0) {
    const finL_first = alpha[0].SLE;
    if (estado.gamma[0] < finL_first) estado.gamma[0] = finL_first;
  }
  // FIX: gamma[1] nunca debe bajar de 0 — es el LP del modelo β[1] que "recién
  // entra". Un valor negativo significa "antes de entrar", que visualmente
  // es invisible (igual que 0), pero al hacer scroll forward otra vez, el
  // modelo tarda en arrancar el fade-in porque tiene que compensar el déficit.
  if (estado.gamma[1] < 0) estado.gamma[1] = 0;
}

// ============================================================
// 3. HELPERS
// ============================================================

// --- PRNG mulberry32 + conSemilla (Brief §7.1) ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function conSemilla<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

// --- Grilla plana (Brief §6.1: NO usa MeshSurfaceSampler) ---
function generarGrillaPlana(
  width: number,
  height: number,
  n: number,
): Float32Array {
  const positions = new Float32Array(n * 3);
  const aspect = width / height;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * aspect)));
  const rows = Math.max(1, Math.ceil(n / cols));
  let idx = 0;
  for (let r = 0; r < rows && idx < n; r++) {
    for (let c = 0; c < cols && idx < n; c++) {
      const x = cols > 1 ? (c / (cols - 1) - 0.5) * width : 0;
      const y = rows > 1 ? (r / (rows - 1) - 0.5) * height : 0;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = PLANE_Z;
      idx++;
    }
  }
  return positions;
}

// --- Muestreo de superficie (Brief §6.1) ---
function muestrearPuntosDeGeometria(
  geometry: THREE.BufferGeometry,
  n: number,
): Float32Array {
  const mesh = new THREE.Mesh(geometry);
  const sampler = new MeshSurfaceSampler(mesh).build();
  const posiciones = new Float32Array(n * 3);
  const temp = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    sampler.sample(temp); // usa Math.random() internamente — envolver en conSemilla
    posiciones[i * 3] = temp.x;
    posiciones[i * 3 + 1] = temp.y;
    posiciones[i * 3 + 2] = temp.z;
  }
  return posiciones;
}

// --- Estado disperso (Brief §7) ---
function generarEstadoDisperso(
  posiciones: Float32Array,
  radio: number,
): Float32Array {
  const disperso = new Float32Array(posiciones.length);
  for (let i = 0; i < posiciones.length; i += 3) {
    const ox = (Math.random() - 0.5) * radio;
    const oy = (Math.random() - 0.5) * radio;
    const oz = (Math.random() - 0.5) * radio;
    disperso[i] = posiciones[i] + ox;
    disperso[i + 1] = posiciones[i + 1] + oy;
    disperso[i + 2] = posiciones[i + 2] + oz;
  }
  return disperso;
}

// --- Easing + opacidad + dispersión (Brief §5.8) ---
function easeInCubic(x: number): number {
  return x * x * x;
}
function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function getOpacity(estado: EstadoModelo, progresoLocal: number): number {
  if (estado === 'L') return progresoLocal; // 0% → 100%, lineal
  if (estado === 'O') return 1; // siempre 100%
  return 1 - progresoLocal; // R: 100% → 0%, lineal
}

function getDispersion(estado: EstadoModelo, progresoLocal: number): number {
  // L: se mantiene disperso casi hasta el final, ensambla tarde y rápido
  if (estado === 'L') return 1 - easeInCubic(progresoLocal);
  if (estado === 'O') return 0; // siempre ensamblado
  // R: se dispersa casi de inmediato, no espera a terminar el fade
  return easeOutCubic(progresoLocal);
}

// --- Fábrica de geometrías placeholder ---
function crearGeometria(modelo: ModeloSpinConfig): THREE.BufferGeometry {
  switch (modelo.tipoGeometria) {
    case 'toro':
      // Toro: visualmente distinto al cubo para hacer el crossfade perceptible
      return new THREE.TorusGeometry(
        CUBE_SIZE * 0.5,
        CUBE_SIZE * 0.18,
        32,
        96,
      );
    case 'icosa':
      return new THREE.IcosahedronGeometry(CUBE_SIZE * 0.6, 4);
    case 'cubo':
    default:
      return new THREE.BoxGeometry(
        CUBE_SIZE,
        CUBE_SIZE,
        CUBE_SIZE,
        CUBE_SUBDIVISIONS,
        CUBE_SUBDIVISIONS,
        CUBE_SUBDIVISIONS,
      );
  }
}

// ============================================================
// CONTEXT — propagación de refs a ModeloPoints (Brief §9.1)
// ============================================================

interface OrqContextValue {
  rp: React.RefObject<number>;
  orqState: React.RefObject<OrqState>;
  punteroNDC: React.RefObject<{ x: number; y: number; active: boolean }>;
}

const OrqContext = createContext<OrqContextValue | null>(null);

// ============================================================
// 4. COMPONENTES R3F
// ============================================================

// --- CameraRig: fuerza lookAt al origen ---
function CameraRig() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// --- OrqController: único cálculo de orquestar() por frame (Brief §9.1) ---
function OrqController() {
  const ctx = useContext(OrqContext)!;
  // priority: -1 corre ANTES que los useFrame de ModeloPoints (priority 0)
  useFrame(() => {
    const orq = ctx.orqState.current;
    const rpAnterior = orq.rpAnterior ?? ctx.rp.current;
    const drp = ctx.rp.current - rpAnterior; // DRP para debug
    orquestar(ctx.rp.current, rpAnterior, MODELOS_CONFIG, orq);
    orq.rpAnterior = ctx.rp.current;

    // SNAP DE CALIBRACIÓN (fix error de punto flotante acumulado):
    // Las operaciones `+= drp` (con sub-steps) acumulan error de redondeo float64
    // cuadro a cuadro. Después de varios ciclos forward+reverse, γ[0] no vuelve
    // exactamente a SLE sino a 0.511, 0.506, etc., dejando al primer modelo con
    // una rotación incompleta al volver a scrollY=0.
    // Fix: en los extremos exactos del scroll (RP=0 o RP=EXPERIENCE_END_RP),
    // forzamos los valores canónicos del estado inicial/final — son determinísticos
    // y no acumulan error. Solo aplica en los extremos absolutos, no interfiere
    // con el algoritmo en el medio del scroll.
    if (ctx.rp.current <= 0) {
      orq.i = 0;
      orq.gamma[0] = MODELOS_CONFIG[0].SLE;
      orq.gamma[1] = 0;
    } else if (ctx.rp.current >= EXPERIENCE_END_RP) {
      // En el fin de experiencia: el último modelo debería estar al final de su R.
      const lastIdx = MODELOS_CONFIG.length - 1;
      const lastModel = MODELOS_CONFIG[lastIdx];
      if (MODELOS_CONFIG.length >= 2) {
        orq.i = lastIdx - 1;
        // β[0] = penúltimo modelo, congelado en su finR (cap activo).
        orq.gamma[0] =
          MODELOS_CONFIG[lastIdx - 1].SLE +
          MODELOS_CONFIG[lastIdx - 1].SOE +
          MODELOS_CONFIG[lastIdx - 1].SRE;
        // β[1] = último modelo, al final de su R (finR).
        orq.gamma[1] = lastModel.SLE + lastModel.SOE + lastModel.SRE;
      }
    }

    // DEBUG: exponer estado en window para inspección del DebugOverlay.
    // Se calcula ANTES de avanzar i (estado del frame actual ya procesado).
    if (typeof window !== 'undefined' && DEBUG_MODE) {
      const i = orq.i;
      const beta0 = MODELOS_CONFIG[i];
      const beta1 = MODELOS_CONFIG[i + 1];
      const estado0 = beta0 ? getEstado(beta0, orq.gamma[0]) : null;
      const estado1 = beta1 ? getEstado(beta1, orq.gamma[1]) : null;
      const finR0 = beta0 ? beta0.SLE + beta0.SOE + beta0.SRE : 0;
      const finR1 = beta1 ? beta1.SLE + beta1.SOE + beta1.SRE : 0;
      const finL0 = beta0 ? beta0.SLE : 0;
      const finL1 = beta1 ? beta1.SLE : 0;
      (window as any).__orqDebug = {
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
        rp: ctx.rp.current,
        drp,
        i,
        gamma: [orq.gamma[0], orq.gamma[1]],
        modeloBeta0: beta0?.id ?? null,
        modeloBeta1: beta1?.id ?? null,
        estado0,
        estado1,
        lp0: orq.gamma[0],
        lp1: orq.gamma[1],
        finL0,
        finR0,
        finL1,
        finR1,
        cap0Active: beta0 ? orq.gamma[0] >= finR0 - 0.001 : false,
        modeloAlpha: MODELOS_CONFIG.map((m) => ({
          id: m.id,
          esPlano: !!m.esPlano,
          tipo: m.tipoGeometria ?? (m.esPlano ? 'plano' : '?'),
          SLE: m.SLE,
          SOE: m.SOE,
          SRE: m.SRE,
        })),
        pointCount: (window as any).__orqPointCount ?? 0,
        experienceEndRp: EXPERIENCE_END_RP,
        totalSpins: TOTAL_SPINS,
      };
    }
  }, -1);
  return null;
}

// --- ModeloPoints: uno por cada modelo de MODELOS_CONFIG, todos montados siempre ---
interface ModeloPointsProps {
  modelo: ModeloSpinConfig;
  indexPropio: number;
  pointCount: number;
  planeDims: { width: number; height: number };
}

function ModeloPoints({ modelo, indexPropio, pointCount, planeDims }: ModeloPointsProps) {
  const ctx = useContext(OrqContext)!;
  const objectRef = useRef<THREE.Points | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);

  // Posiciones ensambladas y dispersas — generadas una sola vez al montar
  const { posicionesEnsamblado, posicionesDisperso } = useMemo(() => {
    let ensamblado: Float32Array;
    if (modelo.esPlano) {
      // Dimensiones dinámicas para cubrir 100% de la pantalla
      ensamblado = generarGrillaPlana(planeDims.width, planeDims.height, pointCount);
    } else {
      const geometry = crearGeometria(modelo);
      // Semilla distinta por modelo para que cada uno tenga su propio estado disperso
      ensamblado = conSemilla(DISPERSION_SEED + indexPropio * 1000, () =>
        muestrearPuntosDeGeometria(geometry, pointCount),
      );
      geometry.dispose();
    }
    const disperso = conSemilla(DISPERSION_SEED + indexPropio * 1000 + 1, () =>
      generarEstadoDisperso(ensamblado, DISPERSION_RADIUS),
    );
    return { posicionesEnsamblado: ensamblado, posicionesDisperso: disperso };
  }, [modelo, indexPropio, pointCount, planeDims.width, planeDims.height]);

  // Buffer mutable in-place (Brief §11: nunca recrear geometría en useFrame)
  const posicionesActuales = useMemo(
    () => new Float32Array(posicionesEnsamblado),
    [posicionesEnsamblado],
  );

  // Offsets de repulsión temporal (Brief §3.3, §10.1)
  const repulsionOffsets = useMemo(
    () => new Float32Array(posicionesEnsamblado.length),
    [posicionesEnsamblado],
  );

  // Vectores temporales reutilizables (evitan allocaciones por frame)
  const tmpLocal = useMemo(() => new THREE.Vector3(), []);
  const tmpWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const obj = objectRef.current;
    const geom = geometryRef.current;
    const mat = materialRef.current;
    if (!obj || !geom || !mat) return;

    const { i, gamma } = ctx.orqState.current;
    // Optimización (§5.10): solo se recalcula si el modelo está en β este frame
    const estaEnBeta = indexPropio === i || indexPropio === i + 1;
    if (!estaEnBeta) return;

    const lp = indexPropio === i ? gamma[0] : gamma[1];
    const estado = getEstado(modelo, lp);
    const progresoLocal = progresoEnEstado(modelo, lp, estado);

    const opacity = getOpacity(estado, progresoLocal);
    const dispersion = getDispersion(estado, progresoLocal);

    // Rotación determinista mapeada desde LP (Brief §5.7)
    const rotacionTotal = lp * Math.PI * 2;
    const speed =
      estado === 'O'
        ? ROTATION_SPEED_CONTEMPLACION
        : ROTATION_SPEED_ENTRADA_SALIDA;
    obj.rotation.y = rotacionTotal * speed;
    obj.rotation.x = rotacionTotal * speed * ROTATION_TILT_X;
    // Actualizamos matriz antes de proyectar para que la repulsión use la
    // rotación del frame actual (consistencia visual).
    obj.updateMatrixWorld();

    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const mouse = ctx.punteroNDC.current;
    const camera = state.camera;

    const n = posArr.length;
    for (let j = 0; j < n; j += 3) {
      // Posición base = lerp(ensamblado, disperso, dispersion)
      const baseX =
        posicionesEnsamblado[j] * (1 - dispersion) +
        posicionesDisperso[j] * dispersion;
      const baseY =
        posicionesEnsamblado[j + 1] * (1 - dispersion) +
        posicionesDisperso[j + 1] * dispersion;
      const baseZ =
        posicionesEnsamblado[j + 2] * (1 - dispersion) +
        posicionesDisperso[j + 2] * dispersion;

      // Repulsión de puntero en espacio de pantalla 2D (NDC) — Brief §10.1
      let targetOffX = 0;
      let targetOffY = 0;
      if (mouse.active) {
        tmpLocal.set(baseX, baseY, baseZ);
        tmpWorld.copy(tmpLocal);
        obj.localToWorld(tmpWorld); // local → world (aplica rotación del frame actual)
        tmpWorld.project(camera); // world → NDC
        const dx = tmpWorld.x - mouse.x;
        const dy = tmpWorld.y - mouse.y;
        const dist2d = Math.sqrt(dx * dx + dy * dy);
        if (dist2d < MOUSE_THRESHOLD_NDC && dist2d > 0.0001) {
          const force =
            (1 - dist2d / MOUSE_THRESHOLD_NDC) * MOUSE_REPULSION_FORCE;
          // Offset en NDC, escalado a unidades world para que sea visible
          targetOffX = (dx / dist2d) * force * 0.4;
          targetOffY = (dy / dist2d) * force * 0.4;
        }
      }

      // Lerp suave del offset hacia el target (retorno suave al alejar el mouse)
      repulsionOffsets[j] +=
        (targetOffX - repulsionOffsets[j]) * MOUSE_RETURN_SPEED;
      repulsionOffsets[j + 1] +=
        (targetOffY - repulsionOffsets[j + 1]) * MOUSE_RETURN_SPEED;
      repulsionOffsets[j + 2] +=
        (0 - repulsionOffsets[j + 2]) * MOUSE_RETURN_SPEED;

      // Posición final = base + offset
      posArr[j] = baseX + repulsionOffsets[j];
      posArr[j + 1] = baseY + repulsionOffsets[j + 1];
      posArr[j + 2] = baseZ + repulsionOffsets[j + 2];
    }

    // Marcar el buffer para re-upload a GPU
    posAttr.needsUpdate = true;

    // Opacidad del material
    mat.opacity = opacity * POINT_OPACITY;
  });

  return (
    <points ref={objectRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[posicionesActuales, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={POINT_COLOR}
        size={POINT_SIZE}
        sizeAttenuation={POINT_SIZE_ATTENUATION}
        transparent={POINT_TRANSPARENT}
        opacity={0}
        depthWrite={POINT_DEPTH_WRITE}
      />
    </points>
  );
}

// --- PreloaderPlane (fuera del Brief) ---
// Instancia separada del mismo mesh del plano inicial (grilla plana con las
// mismas dimensiones y N puntos). No interactúa con ORQ ni con el scroll.
// Se muestra a opacidad completa al cargar, hace fade-out después de un
// delay (PRELOADER_DELAY_MS) durante PRELOADER_FADE_MS.
// Renderiza on top (renderOrder alto) para cubrir el hero plane subyacente.
// Como ambos planos comparten el mismo mesh y rotación 0, el fade-out es
// visualmente imperceptible — el preloader "es" el hero plane.
function PreloaderPlane({
  pointCount,
  planeDims,
}: {
  pointCount: number;
  planeDims: { width: number; height: number };
}) {
  const objectRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  // Inicializar a performance.now() para que si useFrame corre antes que
  // useEffect en el primer frame, elapsed sea ~0 (no un valor enorme).
  const mountTimeRef = useRef<number>(performance.now());

  // Grilla plana — mismo mesh que el modelo 'plano' del hero
  const posiciones = useMemo(
    () => generarGrillaPlana(planeDims.width, planeDims.height, pointCount),
    [planeDims.width, planeDims.height, pointCount],
  );

  // Registrar tiempo de montaje para el cálculo del fade
  useEffect(() => {
    mountTimeRef.current = performance.now();
  }, []);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    const elapsed = performance.now() - mountTimeRef.current;
    if (elapsed < PRELOADER_DELAY_MS) {
      // Antes del delay: opacidad completa (1.0, no POINT_OPACITY — para que
      // el preloader cubra completamente el hero plane subyacente)
      mat.opacity = 1.0;
    } else {
      // Durante el fade: de 1 a 0
      const fadeProgress = Math.min(
        1,
        (elapsed - PRELOADER_DELAY_MS) / PRELOADER_FADE_MS,
      );
      mat.opacity = 1 - fadeProgress;
    }
  });

  return (
    <points ref={objectRef} position={[0, 0, 0]} renderOrder={999}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[posiciones, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={PRELOADER_COLOR}
        size={POINT_SIZE}
        sizeAttenuation={POINT_SIZE_ATTENUATION}
        transparent={POINT_TRANSPARENT}
        opacity={POINT_OPACITY}
        depthWrite={POINT_DEPTH_WRITE}
      />
    </points>
  );
}

// ============================================================
// 5. WRAPPER REACT + CANVAS + SCROLL LISTENER (Brief §9)
// ============================================================

export function HeroScene() {
  const [mounted, setMounted] = useState(false);
  const [pointCount, setPointCount] = useState<number>(POINT_COUNT_DESKTOP);
  const [planeDims, setPlaneDims] = useState({
    width: PLANE_WIDTH,
    height: PLANE_HEIGHT,
  });

  // Refs mutados directamente — nunca useState para scroll/ORQ (Brief §9)
  const rp = useRef<number>(0);
  const orqState = useRef<OrqState>({
    i: 0,
    // gamma[0] arranca en finL del primer modelo (Brief §5.4) — el primer
    // modelo se ve ensamblado desde el primer frame, sin depender de scroll.
    gamma: [MODELOS_CONFIG[0].SLE, 0],
  });
  const punteroNDC = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // N y dimensiones del plano se deciden UNA SOLA VEZ al montar (Brief §11.1)
  // Las dimensiones se calculan para que el plano cubra el 100% de la pantalla
  // según el FOV de la cámara, la distancia, y el aspect ratio del viewport.
  useEffect(() => {
    const aspect = window.innerWidth / window.innerHeight;
    const visibleHeight =
      2 * Math.tan((CAMERA_FOV / 2) * Math.PI / 180) * CAMERA_POSITION[2];
    const visibleWidth = visibleHeight * aspect;
    setPlaneDims({
      width: visibleWidth * PLANE_COVERAGE_FACTOR,
      height: visibleHeight * PLANE_COVERAGE_FACTOR,
    });

    const n = window.innerWidth < 768 ? POINT_COUNT_MOBILE : POINT_COUNT_DESKTOP;
    setPointCount(n);
    if (typeof window !== 'undefined') {
      (window as any).__orqPointCount = n;
    }
    setMounted(true);
  }, []);

  // Listener de scroll — RP clampeado a [0, EXPERIENCE_END_RP] (Brief §4, §9)
  // Usamos EXPERIENCE_END_RP en lugar de TOTAL_SPINS para evitar espacio muerto
  // (canvas negro) al final: el último modelo ya está invisible para ese RP.
  useEffect(() => {
    const handleScroll = () => {
      const rawRp = window.scrollY / PIXELS_PER_SPIN;
      rp.current = Math.min(EXPERIENCE_END_RP, Math.max(0, rawRp));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Puntero unificado mouse + touch (Brief §10.1)
  useEffect(() => {
    if (!MOUSE_ENABLED) return;
    const actualizar = (clientX: number, clientY: number) => {
      punteroNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
      punteroNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
      punteroNDC.current.active = true;
    };
    const handleMouseMove = (e: MouseEvent) => actualizar(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) actualizar(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0"
      style={{ background: BACKGROUND_COLOR }}
      aria-hidden="true"
    >
      {mounted && (
        <OrqContext.Provider value={{ rp, orqState, punteroNDC }}>
          <Canvas
            camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
          >
            <CameraRig />
            <OrqController />
            {MODELOS_CONFIG.map((modelo, idx) => (
              <ModeloPoints
                key={modelo.id}
                modelo={modelo}
                indexPropio={idx}
                pointCount={pointCount}
                planeDims={planeDims}
              />
            ))}
            {/* Preloader: instancia separada del plano, fade-out tras delay.
                Se renderiza después de los ModeloPoints para estar on top. */}
            {/* Preloader 3D: deshabilitado (PRELOADER_PLANE_ENABLED=false).
                Código mantenido para posible uso futuro. */}
            {PRELOADER_PLANE_ENABLED && (
              <PreloaderPlane pointCount={pointCount} planeDims={planeDims} />
            )}
          </Canvas>
        </OrqContext.Provider>
      )}
    </div>
  );
}
