# Brief Técnico — Landing Personal (MVP fin de semana) — v1.6

**Alineado con:** Plan General del Proyecto — Landing Personal v1.1
**Propósito:** Este documento establece las reglas técnicas estrictas para la generación de código, asegurando que la implementación sea nativa de React/Next.js, altamente performante y libre de errores comunes al mezclar Three.js "vanilla" con frameworks reactivos. Está escrito para que un desarrollador o un LLM pueda implementar el MVP desde cero con la mínima cantidad de dudas posible — cada decisión técnica no obvia queda resuelta explícitamente en el propio documento, no asumida.

---

## 1. Stack Tecnológico


- **Framework:** Next.js (App Router)
- **Renderizado 3D:** `@react-three/fiber` (R3F) + `@react-three/drei`
- **Geometría:** `THREE.BufferGeometry` + `THREE.Points` — nunca objetos individuales por punto
- **Muestreo de superficie:** `MeshSurfaceSampler` de `three/examples/jsm/math/MeshSurfaceSampler` — **obligatorio** para desacoplar la cantidad de partículas (`N`) de la densidad de vértices de cualquier geometría (cubo placeholder y, a futuro, modelos GLTF) — ver §6.1
- **Control de scroll:** Listener nativo de scroll + normalización manual del progreso. GSAP ScrollTrigger opcional a futuro.
- **Interacción mouse:** Cálculo de distancia en espacio de pantalla 2D (prohibido `THREE.Raycaster` contra `Points`)

---

## 2. Variables Configurables (Settings del Hero)

**Regla obligatoria para todo código generado:** Todos los valores numéricos deben estar definidos como **constantes configurables al inicio del archivo**, nunca hardcodeados dentro de funciones o hooks.

### 2.1 Settings de Escena


```typescript
// ============================================
// SETTINGS DEL HERO — AJUSTAR AQUÍ
// ============================================

const POINT_COUNT_DESKTOP = 6000;
const POINT_COUNT_MOBILE = 3000;
// N se decide UNA SOLA VEZ al montar el componente (leyendo window.innerWidth
// en ese instante) y no se re-evalúa si el usuario redimensiona la ventana
// durante la sesión. Ver §11 — decisión consciente, no deuda técnica.

const PLANE_WIDTH = 10;
const PLANE_HEIGHT = 6;
const PLANE_Z = 0;

const CAMERA_FOV = 50;
const CAMERA_POSITION: [number, number, number] = [0, 0, 12];
const CAMERA_LOOK_AT: [number, number, number] = [0, 0, 0];

const POINT_COLOR = '#ffffff';
const POINT_COLOR_HOVER = '#aaddff';
const BACKGROUND_COLOR = '#050505';

const POINT_SIZE = 0.03;
const POINT_SIZE_ATTENUATION = true;

const POINT_OPACITY = 0.9;
const POINT_TRANSPARENT = true;
const POINT_DEPTH_WRITE = false;
```

### 2.2 Settings del Orquestador — ORQ (Ventana Deslizante)

```typescript
// ============================================
// ORQ — ORQUESTADOR REACTIVO
// ============================================

// --- Conversión scroll físico → RP (Real Progress) ---
// RP es una magnitud NO acotada a [0,1]: crece o decrece libremente
// según el scroll, y sus unidades son directamente "vueltas" (spins).
const PIXELS_PER_SPIN = 800; // px de scroll = 1 vuelta completa (2π rad) de un modelo

// --- Estados posibles de un modelo ---
type EstadoModelo = 'L' | 'O' | 'R';
// L = Left  (entrando: fade-in + ensamblándose desde el caos)
// O = Original (estable, ensamblado, contemplación)
// R = Right (saliendo: fade-out + dispersándose hacia el caos)

// --- Configuración por modelo ---
// Cada modelo declara SU PROPIO presupuesto de giros (spins) por estado.
// Estos valores son ANCHOS (no acumulados) y 100% independientes entre modelos:
// no hay que tocar ningún otro modelo al reordenar, agregar o quitar uno.
interface ModeloSpinConfig {
  id: string;
  esPlano?: boolean;   // true solo para el modelo inicial (usa grilla 2D en vez de geometría 3D)
  SLE: number;         // Spin (ancho) del estado "L" — cuántas vueltas dura la entrada
  SOE: number;         // Spin (ancho) del estado "O" — cuántas vueltas dura la contemplación
  SRE: number;         // Spin (ancho) del estado "R" — cuántas vueltas dura la salida
}

const MODELOS_CONFIG: ModeloSpinConfig[] = [
  { id: 'plano',    esPlano: true,  SLE: 0.5, SOE: 1.0, SRE: 0.5 },
  { id: 'modeloA',  esPlano: false, SLE: 0.5, SOE: 2.0, SRE: 0.5 },
  { id: 'modeloB',  esPlano: false, SLE: 0.5, SOE: 1.0, SRE: 0.5 },
];

// --- Velocidades de rotación (multiplicadores visuales, no tocan el presupuesto) ---
const ROTATION_SPEED_ENTRADA_SALIDA = 1.0; // multiplicador durante L y R
const ROTATION_SPEED_CONTEMPLACION = 1.0;  // multiplicador durante O
const ROTATION_TILT_X = 0.3;               // inclinación en eje X (0 = solo eje Y)

// --- Dispersión ---
const DISPERSION_RADIUS = 4.0;
const DISPERSION_SEED = 42;
```

**Nota clave:** no existe un `ROTATIONS_PER_SCROLL_UNIT` ni un `CROSSFADE_SCROLL_RATIO` globales. El "cuánto scroll necesita cada modelo" y "cuánto se solapa con el siguiente" no son settings separados: emergen directamente de `SLE`/`SRE` de cada par de modelos consecutivos (ver §5.6).

### 2.3 Settings de Interacción de Puntero (Mouse + Touch)

```typescript
const MOUSE_THRESHOLD_NDC = 0.08;
const MOUSE_REPULSION_FORCE = 0.8;
const MOUSE_RETURN_SPEED = 0.1;
const MOUSE_ENABLED = true; // controla tanto mousemove como touchmove, un solo flag
```

### 2.4 Settings del Placeholder (Cubo)


```typescript
const CUBE_SIZE = 3;
const CUBE_SUBDIVISIONS = 40;
const CUBE_POSITION: [number, number, number] = [0, 0, 0];
```

---

## 3. Paradigma de Integración: React Three Fiber (R3F)

Prohibida la inicialización "vanilla" de Three.js (sin `useEffect` manual, sin `document.getElementById`). Todo vía `@react-three/fiber` y `@react-three/drei`.

### 3.1 SSR y Directiva `'use client'`

**Regla obligatoria:** el archivo que contiene el componente raíz del Hero (`HeroScene.tsx` o equivalente) debe empezar con `'use client';` como primera línea del archivo, antes de cualquier `import`. R3F (Canvas, hooks de `useFrame`, acceso a `window`) no puede evaluarse en el servidor.

No hace falta envolver el componente en `next/dynamic` con `{ ssr: false }` de forma adicional — `'use client'` alcanza, siempre que ningún ancestro server component le pase props no serializables (funciones, clases de Three.js, etc.).

---

## 4. Estructura DOM para Scroll y Canvas

Canvas `position: fixed`, scroll-wrapper con altura mayor al viewport, contenido overlay con `z-index` superior.

**Ajuste menor por ORQ:** dado que `RP` ya no es un valor normalizado [0,1] sino una cantidad de "vueltas" sin techo fijo, la altura del `scroll-wrapper` puede calcularse dinámicamente como:

```typescript
const totalSpins = MODELOS_CONFIG.reduce(
  (acc, m) => acc + m.SLE + m.SOE + m.SRE, 0
);
// window.scrollY nunca llega a scrollHeight: llega como máximo a
// (scrollHeight - innerHeight). Sin el +innerHeight, RP nunca alcanza
// totalSpins y el último modelo queda a mitad de camino.
const scrollWrapperHeightPx = totalSpins * PIXELS_PER_SPIN + window.innerHeight;
```

La altura del scroll-wrapper es una consecuencia directa de la configuración por modelo, no un valor a estimar a ojo.

**Overscroll:** `RP` se clampea siempre a `[0, totalSpins]` en el listener de scroll (ver código completo en §9). El usuario puede seguir haciendo scroll físico más allá del final, pero `RP` no crece más allá de `totalSpins` — el último modelo queda congelado en su estado `O`/`R` final sin más animación, sin loop y sin espacio en blanco adicional (la altura del wrapper ya está ajustada para terminar justo ahí).

---

## 5. Arquitectura del Orquestador ORQ

### 5.1 Variables del Sistema

| Símbolo | Nombre | Qué es |
|---|---|---|
| `RP` | Real Progress | Progreso real de scroll, derivado de `scrollY`. No acotado. |
| `DRP` | Delta RP | `RP(t) - RP(t-1)`. Su signo indica dirección; su magnitud, velocidad. |
| `α` | Vector de modelos | Todos los modelos en orden (`MODELOS_CONFIG`), fijo. |
| `i` | Índice de ventana | Posición del modelo "izquierdo" activo dentro de `α`. Con memoria entre frames. |
| `β` | Vector de trabajo | Los únicos 2 modelos que ORQ administra en un instante dado: `β = [α[i], α[i+1]]`. |
| `LP` (o `γ`) | Local Progress | El progreso que cada modelo de `β` recibe. Es **acumulado y con memoria** (no se deriva de `RP` en forma pura — ver §5.5). |
| `ω` | Vector de estados | `[estado(β[0]), estado(β[1])]`, feedback que los modelos le devuelven a ORQ. |

**Principio central:** ORQ nunca le "ordena" un estado a un modelo. Le entrega un `LP`; el modelo decide en qué estado (`L`/`O`/`R`) queda según su propia configuración. ORQ solo mira ese resultado (`ω`) para decidir cómo seguir repartiendo `RP`.

### 5.2 Estados de un Modelo: L / O / R

Cada modelo (incluido el plano) tiene tres estados, **direccionalmente neutros**:

- **L (Left):** el modelo está entrando — simultáneamente hace fade-in de opacidad y se ensambla desde el caos disperso.
- **O (Original):** el modelo está completamente ensamblado, 100% opaco. Es la fase de contemplación (rotación libre).
- **R (Right):** el modelo está saliendo — simultáneamente hace fade-out de opacidad y se dispersa hacia el caos.

> Este mapeo conecta directo con la narrativa del Plan General (§2.1): `L` = fase de ensamblaje/aparición, `O` = fase de contemplación, `R` = fase de dispersión/desaparición. Al no llamarse "entrada"/"salida" sino `L`/`R`, la lógica es la misma sin importar si el usuario scrollea hacia adelante o hacia atrás.

### 5.3 Configuración por Modelo: umbrales SLE / SOE / SRE

Cada modelo declara **anchos** (no valores acumulados) en unidades de "vueltas":

```
Modelo:  SLE=0.5   SOE=2.0   SRE=0.5
                 ↓
Límite fin de L:        finL = SLE                 = 0.5
Límite fin de O:        finO = SLE + SOE            = 2.5
Límite fin de R (ciclo): finR = SLE + SOE + SRE      = 3.0
```

```typescript
function getEstado(modelo: ModeloSpinConfig, lp: number): EstadoModelo {
  const finL = modelo.SLE;
  const finO = modelo.SLE + modelo.SOE;
  // finR = modelo.SLE + modelo.SOE + modelo.SRE (más allá de este valor, el modelo permanece "R")

  // Límite estricto (<), no (<=). Esto permite que un modelo
  // inicializado exactamente en lp = finL (ver §5.4, estado inicial del primer
  // modelo) caiga directo en "O" en vez de quedar atrapado en "L". Sin este
  // ajuste, el plano arrancaría invisible en la carga inicial de la página.
  if (lp < finL) return 'L';
  if (lp <= finO) return 'O';
  return 'R';
}

function progresoEnEstado(modelo: ModeloSpinConfig, lp: number, estado: EstadoModelo): number {
  // 0→1 dentro del tramo actual, para interpolar opacidad/dispersión/rotación
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
  switch (estado) {
    case 'L': return clamp01(lp / modelo.SLE);
    case 'O': return clamp01((lp - modelo.SLE) / modelo.SOE);
    case 'R': return clamp01((lp - modelo.SLE - modelo.SOE) / modelo.SRE);
  }
}
```

**Por qué son independientes:** ningún modelo necesita saber los umbrales de sus vecinos. Reordenar `MODELOS_CONFIG`, insertar un modelo nuevo o borrar uno no requiere tocar ningún otro `SLE`/`SOE`/`SRE`.

### 5.4 Lógica de ORQ: la Ventana Deslizante

En cada frame (o cada evento de scroll), ORQ hace 4 cosas:

1. Calcula `DRP = RP(t) - RP(t-1)`.
2. Arma `β = [α[i], α[i+1]]` y calcula `ω = [getEstado(β[0], LP0), getEstado(β[1], LP1)]`.
3. Decide si está "en el borde" (`enBorde`): `β[0]` llegó a `L` puro *(caso reversa)* o `β[1]` llegó a `R` *(caso avance)*.
4. Si NO está en el borde → reparte `DRP` con la regla normal. Si SÍ está en el borde → desliza el índice `i`.

```typescript
interface OrqState {
  i: number;
  gamma: [number, number]; // LP acumulado de β[0] y β[1], persiste entre frames (useRef)
  rpAnterior?: number;     // último RP procesado, para calcular DRP en el próximo frame (ver §9)
}

// Estado inicial obligatorio (ver §9 para la inicialización real):
// gamma[0] arranca en finL del primer modelo (MODELOS_CONFIG[0].SLE), NO en 0.
// Así, en RP=0, el primer modelo ya cae en estado "O" (gracias al ajuste de
// límite estricto de §5.3) y se ve completamente ensamblado y opaco desde la
// primera carga de página, sin depender de que el usuario haga scroll primero.
// Todos los demás modelos de la secuencia sí arrancan en gamma=0 (invisibles
// hasta que la ventana los alcanza) — el ajuste es exclusivo del primer modelo.

function orquestar(
  rp: number,
  rpAnterior: number,
  alpha: ModeloSpinConfig[],
  estado: OrqState
): { lp: [number, number]; estados: [EstadoModelo, EstadoModelo] } {

  const drp = rp - rpAnterior;
  const beta = [alpha[estado.i], alpha[estado.i + 1]];
  const omega: [EstadoModelo, EstadoModelo] = [
    getEstado(beta[0], estado.gamma[0]),
    getEstado(beta[1], estado.gamma[1]),
  ];

  const enBordeIzquierdo = omega[0] === 'L'; // β[0] "recién" entrando (posible reversa)
  const enBordeDerecho = omega[1] === 'R';   // β[1] ya está saliendo (turno de avanzar ventana)

  if (drp > 0) {
    // --- Avance ---
    if (enBordeDerecho) {
      if (estado.i + 1 < alpha.length - 1) {
        // NextModel(): la ventana avanza. β[1] pasa a ser el nuevo β[0].
        // Por simetría, el modelo entrante (nuevo β[1]) arranca en LP=0 (estado L)
        // de forma natural: no requiere inicialización especial.
        estado.i += 1;
      } else {
        estado.gamma[1] += drp; // último modelo de la secuencia: no hay a quién ceder el paso
      }
    } else {
      estado.gamma[0] += drp;
      if (omega[0] === 'R') estado.gamma[1] += drp; // β[1] ya empezó a entrar
    }
  } else if (drp < 0) {
    // --- Retroceso ---
    if (enBordeIzquierdo) {
      if (estado.i > 0) {
        // PrevModel(): la ventana retrocede.
        estado.i -= 1;
        // DECISIÓN DE DISEÑO (ver §5.6): el modelo que reingresa como nuevo β[0]
        // se inicializa en su propio límite derecho (finR), NO en 0.
        const prevModelo = alpha[estado.i];
        estado.gamma[0] = prevModelo.SLE + prevModelo.SOE + prevModelo.SRE;
        estado.gamma[1] = beta[0] === alpha[estado.i + 1] ? estado.gamma[0] - 0 : estado.gamma[1];
        // (gamma[1] queda igual: el que era β[0] pasa a ser β[1] con su LP intacto)
      } else {
        estado.gamma[0] += drp; // primer modelo de la secuencia: no hay a quién ceder el paso
      }
    } else {
      estado.gamma[1] += drp;
      if (omega[1] === 'L') estado.gamma[0] += drp; // β[0] todavía "reculando"
    }
  }

  return { lp: estado.gamma, estados: omega };
}
```

### 5.5 `LP` es acumulado, no derivado

`LP` es un **acumulador con memoria** (`gamma[0]`, `gamma[1]`) que ORQ incrementa o decrementa con `DRP` cuadro a cuadro. Esto es lo que permite que el mismo modelo pueda "pausar" (si `DRP=0`, no cambia) o recibir velocidades de scroll no lineales sin romper nada — el `LP` simplemente sigue el ritmo real del usuario.

### 5.6 Resolución de la Reversibilidad al Cruzar de Índice — decisión de diseño

El documento fuente deja explícitamente abierta esta pregunta: *¿qué `LP` le damos a un modelo cuando el usuario retrocede y ese modelo "reingresa" a la ventana `β`, si ORQ no guardó su último valor?*

**Se adopta la Solución 1 propuesta en el algoritmo original** (función inversa), con esta simplificación: como los umbrales `SLE`/`SOE`/`SRE` son **estáticos por configuración**, no hace falta recordar el `LP` histórico del modelo — se puede recalcular de forma determinística su valor de reingreso a partir de su propia config:

```typescript
LP_reingreso_por_izquierda = modelo.SLE + modelo.SOE + modelo.SRE; // = finR, arranca ya en "R"
```

De este modo el modelo reaparece exactamente en su extremo derecho (`R`, a punto de irse) y, al seguir el `DRP` negativo, retrocede naturalmente hacia `O`. **No hace falta un "traductor" de valores negativos de `LP`** (la Solución 2 del documento original, más compleja) porque nunca se generan valores negativos: el punto de reingreso ya arranca en el valor correcto.

### 5.7 Rotación Mapeada desde `LP`

```typescript
const rotacionTotal = lp * Math.PI * 2; // 1 unidad de LP = 1 vuelta completa
const speed = estado === 'O' ? ROTATION_SPEED_CONTEMPLACION : ROTATION_SPEED_ENTRADA_SALIDA;
groupRef.current.rotation.y = rotacionTotal * speed;
groupRef.current.rotation.x = rotacionTotal * speed * ROTATION_TILT_X;
```

Determinista y reversible por construcción: al ser función pura de `lp` (que a su vez es simplemente la acumulación de `DRP`), invertir el scroll invierte la rotación exactamente, sin lógica adicional.

### 5.8 Opacidad y Dispersión por Estado

En vez de interpolación lineal, se usan dos curvas de easing distintas — asimétricas a propósito — para que la dispersión "se adelante" al fade y así reducir la ventana en la que un modelo se ve parcialmente formado durante el crossfade (ver razonamiento completo en §5.9):

```typescript
function easeInCubic(x: number): number { return x * x * x; }
function easeOutCubic(x: number): number { return 1 - Math.pow(1 - x, 3); }

function getOpacity(estado: EstadoModelo, progresoLocal: number): number {
  if (estado === 'L') return progresoLocal;       // 0% → 100%, lineal
  if (estado === 'O') return 1;                    // siempre 100%
  return 1 - progresoLocal;                         // R: 100% → 0%, lineal
}

function getDispersion(estado: EstadoModelo, progresoLocal: number): number {
  // L: se mantiene disperso casi hasta el final del tramo, ensambla tarde y rápido
  if (estado === 'L') return 1 - easeInCubic(progresoLocal);
  if (estado === 'O') return 0;                     // siempre ensamblado
  // R: se dispersa casi de inmediato al entrar al estado, no espera a terminar el fade
  return easeOutCubic(progresoLocal);
}
```

La opacidad se deja lineal a propósito (no hace falta calibrarla); toda la mitigación del riesgo de §5.9 vive en la asimetría de `getDispersion`.

### 5.9 ⚠️ Riesgo de Diseño: Tensión con el Principio de "Cambio Imperceptible" — mitigado

El Plan General (§2.2) exige que el crossfade ocurra **con ambos modelos ya totalmente dispersos** (mismo aspecto visual, "el ojo no puede distinguir qué punto pertenece a qué modelo"), para que el cambio de un modelo a otro sea invisible.

En ORQ, los estados `L` y `R` **funden fade + dispersión en una sola curva continua**. Con interpolación lineal, un modelo en `R` iría de 0% a 100% de dispersión *al mismo ritmo* que se desvanece, y el entrante en `L` de 100% a 0% *al mismo ritmo* que aparece — durante el solape, ambos modelos podrían tener formas parcialmente reconocibles al mismo tiempo, justo lo que el Plan General quiere evitar. Por eso no se usa interpolación lineal (ver mitigación abajo).

**Mitigación aplicada (§5.8):** `getDispersion` ahora usa `easeInCubic`/`easeOutCubic` de forma asimétrica respecto a `getOpacity` (que se deja lineal). Resultado: el modelo saliente (`R`) llega a dispersión casi total muy temprano en su tramo — antes de que su opacidad haya bajado mucho —, y el modelo entrante (`L`) se mantiene disperso hasta muy tarde en su tramo, ensamblando recién cerca del final. Ambos permanecen "en el caos" durante la mayor parte de la ventana de solape.

**Nota honesta:** esto reduce drásticamente la ventana de riesgo, pero no la elimina matemáticamente al 100% (las curvas igual se cruzan en algún punto intermedio). Si en el prototipo (Fase 2) se sigue viendo geometría reconocible durante el crossfade, las mitigaciones 2 y 3 originales (`SLE`/`SRE` más chicos, o sub-fases internas) siguen disponibles como ajuste adicional sin tocar la lógica de ventana deslizante de ORQ.

### 5.10 Ciclo de Vida de los Modelos: Montaje Persistente

**Problema que resuelve:** §5.4 da a entender que ORQ solo "administra" 2 modelos (`β`) en un instante dado, lo cual sugiere que solo esos 2 estarían montados en la escena. Pero §11 prohíbe recrear geometría bajo cualquier circunstancia. Si al deslizar `i` un modelo se desmontara de `β[1]` y se remontara en `β[0]` (o viceversa), se destruiría y recrearía su buffer de GPU — violación directa de esa regla, además de un posible micro-freeze visual en cada transición de índice.

**Regla obligatoria:** **todos** los modelos de `α` (`MODELOS_CONFIG`) se montan **una sola vez**, apenas se inicializa la escena, y permanecen montados durante todo el ciclo de vida del componente. `ORQ` nunca decide qué está montado — solo decide, cuadro a cuadro, a qué modelos les entrega `LP` fresco.

```jsx
// Componente padre: TODOS los modelos se renderizan siempre, sin condicionales
function HeroScene() {
  return (
    <Canvas>
      {MODELOS_CONFIG.map((modelo) => (
        <ModeloPoints key={modelo.id} modelo={modelo} />
      ))}
    </Canvas>
  );
}
```

**Por qué esto no rompe nada visualmente (consecuencia gratis del diseño, no lógica nueva):**

- Un modelo **aún no alcanzado** por la ventana (`i` todavía no llegó a él) permanece en `LP=0` → estado `L` con `progresoLocal=0` → `getOpacity('L', 0) = 0`. Invisible.
- Un modelo **ya superado** por la ventana (el índice avanzó más allá de él) quedó congelado exactamente en `LP=finR`, porque el índice solo avanza cuando ese modelo llegó a `R` completo (§5.4, condición `enBordeDerecho`) → `getOpacity('R', 1) = 0`. Invisible.
- Un modelo **reingresado** por retroceso de índice arranca directo en `finR` (§5.6) → mismo caso anterior, opacity 0 desde el primer frame de reingreso. No hay flash ni salto visual.

En ningún caso hace falta un "reset" manual de estado: el propio sistema de opacidad garantiza que todo lo que está fuera de `β` sea invisible — incluidos los modelos que **todavía no fueron alcanzados ni una sola vez** por la ventana, que nunca recibieron `LP` y se asumen en estado `L`/opacity 0 por default (ver el `if (!estaEnBeta) return;` de §9.1: el material del `<points>` se inicializa con `opacity: 0` y solo se sobreescribe cuando el modelo entra por primera vez a `β`).

**Optimización de cómputo (para que montar todo no salga gratis en performance):** dentro de `useFrame`, solo se recalculan posiciones (dispersión/ensamblaje lerp), rotación y repulsión de puntero para los modelos que **están en `β` en ese frame exacto**. Los modelos congelados no tocan su buffer — `geometry.attributes.position.needsUpdate` nunca se dispara para ellos. Así, el costo por frame sigue siendo O(2 modelos), sin importar cuántos modelos totales tenga `MODELOS_CONFIG` (2, 3, o 50 a futuro).

**Mecanismo real de `estaEnBeta` y de dónde sale `lp`/`estado`:** ver §9.1 — cada `ModeloPoints` los lee del `orqState` compartido vía Context, ya actualizado por `OrqController` en ese mismo frame gracias al orden de `useFrame` con `priority: -1`.

---

## 6. Arquitectura de Estados por Modelo

Cada modelo define su propia cantidad de puntos `N`; dentro de un mismo pipeline todos los arrays deben tener longitud `N` idéntica; nunca interpolar arrays de distinta longitud.

```
Modelo X:
  ├── Nₓ: cantidad de puntos propia del modelo
  ├── Estado Ensamblado ("O"): array de Nₓ × 3 floats (posiciones originales)
  ├── Estado Disperso (base para "L" y "R"): array de Nₓ × 3 floats
  └── Pipeline interno: lerp(Disperso, Ensamblado, progresoEnEstado)
```

### 6.1 Obtención de N Puntos desde Geometría Arbitraria

**Problema que resuelve:** el Brief asumía un array de posiciones "ensambladas" ya listo, sin definir cómo se genera cuando la geometría de origen (el cubo placeholder, y a futuro un GLTF) tiene una cantidad de vértices distinta a `N` (`POINT_COUNT_DESKTOP`/`MOBILE`). `CUBE_SUBDIVISIONS` controla el detalle de la malla, no la cantidad de partículas — ambos valores están desacoplados y no hay ninguna razón para que coincidan.

**Regla obligatoria:** cualquier geometría de origen (cubo, o a futuro GLTF) se convierte a exactamente `N` puntos con una única función reutilizable, basada en `MeshSurfaceSampler`, que muestrea puntos sobre la superficie de la malla sin importar cuántos vértices tenga esa malla. La llamada se envuelve siempre en `conSemilla()` (§7.1) para reproducibilidad:

```typescript
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

function muestrearPuntosDeGeometria(
  geometry: THREE.BufferGeometry,
  n: number
): Float32Array {
  const mesh = new THREE.Mesh(geometry);
  const sampler = new MeshSurfaceSampler(mesh).build();
  const posiciones = new Float32Array(n * 3);
  const tempPosition = new THREE.Vector3();

  for (let i = 0; i < n; i++) {
    sampler.sample(tempPosition); // usa Math.random() internamente — ver §7.1
    posiciones[i * 3]     = tempPosition.x;
    posiciones[i * 3 + 1] = tempPosition.y;
    posiciones[i * 3 + 2] = tempPosition.z;
  }
  return posiciones;
}

// Uso obligatorio (nunca llamar muestrearPuntosDeGeometria() sin envolver):
const posicionesCubo = conSemilla(DISPERSION_SEED, () =>
  muestrearPuntosDeGeometria(cuboGeometry, POINT_COUNT_DESKTOP)
);
```

**Reglas de uso:**

- El **cubo placeholder** usa esta función con `n = POINT_COUNT_DESKTOP` (o `MOBILE`): `CUBE_SUBDIVISIONS` solo controla qué tan suave es la superficie que se muestrea, nunca la cantidad de partículas resultante.
- La **grilla plana** NO usa esta función — tiene su propia función directa (`generarGrillaPlana`, construcción explícita en 2D con `PLANE_WIDTH`/`PLANE_HEIGHT`), porque no es una malla 3D con superficie a muestrear.
- Cuando se reemplace el cubo por un modelo real (GLTF, Fase futura fuera del MVP), se usa **esta misma función sin modificarla** — es la condición que hace cumplir la promesa de escalabilidad infinita del Plan General (§2.2): agregar un modelo nuevo nunca debe tocar lógica existente.

---

## 7. Función de Dispersión

### 7.1 Determinismo con Semilla (PRNG)

**Problema que resuelve:** `DISPERSION_SEED` prometía reproducibilidad, pero tanto `generarEstadoDisperso()` como `MeshSurfaceSampler.sample()` (§6.1) usan `Math.random()` internamente, que no acepta semilla — contradicción directa entre el setting y el código.

**Regla obligatoria:** un PRNG seedable (`mulberry32`, sin dependencias externas) sustituye temporalmente a `Math.random` global durante cualquier generación de posiciones, y se restaura siempre al terminar (incluso si la generación lanza un error):

```typescript
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
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
    Math.random = original; // restaurado siempre, sin excepción
  }
}
```

**Regla de uso:** toda función que genere posiciones aleatorias (`generarEstadoDisperso`, `muestrearPuntosDeGeometria`) se llama **siempre** envuelta en `conSemilla(DISPERSION_SEED, () => ...)`, nunca directamente. Esta sustitución de `Math.random` es intencionalmente global-y-temporal (dura solo el `try`) porque `MeshSurfaceSampler` no expone un parámetro de semilla propio — es la única forma de darle reproducibilidad sin tocar el código fuente de Three.js.

Se aplica una sola vez al montar (guardada en `useRef`, no regenerada en cada frame) y se reutiliza tanto para `L` como para `R` de cada modelo.

```typescript
function generarEstadoDisperso(
  posicionesEnsambladas: Float32Array,
  radioDispersion: number = DISPERSION_RADIUS
): Float32Array {
  const disperso = new Float32Array(posicionesEnsambladas.length);
  for (let i = 0; i < posicionesEnsambladas.length; i += 3) {
    const ox = (Math.random() - 0.5) * radioDispersion;
    const oy = (Math.random() - 0.5) * radioDispersion;
    const oz = (Math.random() - 0.5) * radioDispersion;
    disperso[i]     = posicionesEnsambladas[i]     + ox;
    disperso[i + 1] = posicionesEnsambladas[i + 1] + oy;
    disperso[i + 2] = posicionesEnsambladas[i + 2] + oz;
  }
  return disperso;
}

// Uso obligatorio (nunca llamar generarEstadoDisperso() sin envolver):
const dispersoPlano = conSemilla(DISPERSION_SEED, () =>
  generarEstadoDisperso(posicionesPlanoEnsamblado)
);
```

---

## 8. Pipeline de Scroll y Crossfade

### 8.1 Sin Mapa Precalculado

No hay ninguna tabla de rangos precalculada en el código: el comportamiento emerge en tiempo real de §5.4. El siguiente ejemplo ilustra el comportamiento resultante con `Plano{SLE:0.5,SOE:1,SRE:0.5}` y `ModeloA{SLE:0.5,SOE:2,SRE:0.5}`:

| RP | Plano | ModeloA |
|---|---|---|
| 0.0 – 0.5 | `L` (apareciendo) | invisible (LP=0, fuera de β o congelado) |
| 0.5 – 1.5 | `O` (contemplación) | invisible |
| 1.5 – 2.0 | `R` (desapareciendo) | `L` (apareciendo, simultáneo) |
| 2.0 – 4.0 | fuera de `β` | `O` (contemplación) |
| 4.0 – 4.5 | fuera de `β` | `R` (desapareciendo) |

**Nota:** estos rangos NO están precomputados en ningún lado del código — son el resultado observado de ejecutar ORQ con `RP` creciente. Si se cambia `SOE` del plano, este rango cambia solo, sin tocar nada más.

### 8.2 Crossfade por Opacidad

dos instancias independientes de `<points>` superpuestas, cada una con su propio `pointsMaterial` y `opacity` controlada por `getOpacity()` (§5.8).

```jsx
// β[0] (saliendo, estado "R")
<points>
  <pointsMaterial transparent opacity={getOpacity(estados[0], progresoLocal0)} size={POINT_SIZE} depthWrite={POINT_DEPTH_WRITE} />
  {/* geometría de β[0] */}
</points>

// β[1] (entrando, estado "L")
<points>
  <pointsMaterial transparent opacity={getOpacity(estados[1], progresoLocal1)} size={POINT_SIZE} depthWrite={POINT_DEPTH_WRITE} />
  {/* geometría de β[1] */}
</points>
```

### 8.3 Reversibilidad

Ya no es "invertir un pipeline": es una propiedad nativa. `DRP < 0` hace que ORQ ejecute la rama simétrica (§5.4), y todas las funciones de opacidad, dispersión y rotación son funciones puras de `LP`/`progresoLocal`, así que se recorren exactamente al revés sin lógica adicional.

---

## 9. Gestión del Estado del Scroll y Propagación a los Modelos (Prevención de Re-renders)

Nunca `useState` para el progreso de scroll ni para el estado de ORQ — ambos viven en `useRef`, mutados directamente, para no disparar re-renders de React en cada frame.

**Ubicación de cada pieza (importante — `useFrame` solo existe dentro del árbol de R3F):**

- El listener de `scroll` (`window.addEventListener`) vive en un `useEffect` normal, en el componente que envuelve `<Canvas>` — no necesita estar dentro de R3F.
- El `useRef` de `rp` (scroll) y el `useRef` de `orqState` también se crean en ese componente envolvente, y se pasan hacia adentro de `<Canvas>` vía Context (§9.1) — un `useRef` es un objeto plano, cruza el límite de `<Canvas>` sin problema.
- El `useFrame(() => orquestar(...))` que efectivamente calcula ORQ **debe** vivir en un componente renderizado *dentro* de `<Canvas>` (un hijo, no el wrapper) — `useFrame` es un hook de `@react-three/fiber` y solo funciona dentro del árbol de render de R3F.

```typescript
// --- En el componente que envuelve <Canvas> (fuera de R3F) ---
const totalSpins = MODELOS_CONFIG.reduce((acc, m) => acc + m.SLE + m.SOE + m.SRE, 0);

const rp = useRef(0);
const orqState = useRef<OrqState>({
  i: 0,
  // gamma[0] arranca en finL del primer modelo, no en 0 (§5.4) — el primer
  // modelo se ve ensamblado desde el primer frame, sin depender de scroll previo.
  gamma: [MODELOS_CONFIG[0].SLE, 0],
});

useEffect(() => {
  const handleScroll = () => {
    // Overscroll (§4): RP siempre clampeado a [0, totalSpins].
    rp.current = Math.min(totalSpins, Math.max(0, window.scrollY / PIXELS_PER_SPIN));
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// rp y orqState se pasan a <Canvas> vía OrqContext.Provider — ver §9.1
```

### 9.1 Propagación de Estado a los `ModeloPoints` (Context + Orden de Ejecución)

**Problema que resuelve:** ORQ calcula, en un único punto, a qué modelos les toca `LP` fresco cada frame — pero cada modelo se renderiza como un componente `ModeloPoints` independiente (§5.10), montado siempre. Falta el mecanismo concreto por el cual cada `ModeloPoints` sabe, cuadro a cuadro, si es parte de `β` en ese momento y qué `LP`/`estado` le corresponde.

**Regla obligatoria — Context + un solo `useFrame` de cálculo:**

```typescript
const OrqContext = createContext<{ rp: React.RefObject<number>; orqState: React.RefObject<OrqState> } | null>(null);

// El wrapper de <Canvas> provee el Context:
<OrqContext.Provider value={{ rp, orqState }}>
  <Canvas>
    <OrqController />{/* hace el único cálculo de orquestar() por frame */}
    {MODELOS_CONFIG.map((modelo) => (
      <ModeloPoints key={modelo.id} modelo={modelo} />
    ))}
  </Canvas>
</OrqContext.Provider>

// Componente invisible, dedicado exclusivamente a calcular ORQ:
function OrqController() {
  const { rp, orqState } = useContext(OrqContext)!;

  // priority negativo: en R3F, cualquier useFrame con priority < 0 se ejecuta
  // ANTES que los useFrame con priority por defecto (0) de los ModeloPoints.
  // Esto garantiza que orqState.current ya esté actualizado cuando cada
  // ModeloPoints lea el Context en su propio useFrame, en el mismo frame.
  useFrame(() => {
    const rpAnterior = orqState.current.rpAnterior ?? rp.current;
    orquestar(rp.current, rpAnterior, MODELOS_CONFIG, orqState.current); // muta orqState.current in-place
    orqState.current.rpAnterior = rp.current;
  }, -1);

  return null;
}

// Cada ModeloPoints lee el mismo orqState ya actualizado:
function ModeloPoints({ modelo }: { modelo: ModeloSpinConfig }) {
  const { orqState } = useContext(OrqContext)!;
  const indexPropio = MODELOS_CONFIG.findIndex((m) => m.id === modelo.id);

  useFrame(() => {
    const { i, gamma } = orqState.current;
    const estaEnBeta = indexPropio === i || indexPropio === i + 1;
    if (!estaEnBeta) return; // congelado — nunca tuvo LP asignado, se asume invisible (ver §5.10)

    const lp = indexPropio === i ? gamma[0] : gamma[1];
    const estado = getEstado(modelo, lp);
    // ... lerp de posiciones, rotación, opacidad, repulsión de puntero, usando lp/estado ...
  }); // priority por defecto (0) — corre después de OrqController
}
```

**Por qué `priority: -1` y no un `useEffect`/`useState` para sincronizar:** cualquier sincronización vía `useState` dispararía un re-render de React en cada frame de scroll — exactamente lo que este brief prohíbe. El truco de prioridad de `useFrame` de R3F permite que dos componentes lean/escriban el mismo `useRef` en un orden determinístico dentro del mismo frame, sin re-renders.

---

## 10. Optimización de la Interacción del Puntero (Mouse + Touch, Anti-Raycasting)

prohibido `THREE.Raycaster` contra `<points>`; cálculo de distancia en espacio de pantalla 2D (NDC).

### 10.1 Unificación Mouse/Touch

**Regla obligatoria:** una única función `aplicarRepulsionPuntero()` (reemplaza el nombre `aplicarRepulsionMouse` de versiones anteriores) escucha tanto `mousemove` como `touchmove`, actualizando las mismas coordenadas NDC de referencia. `MOUSE_ENABLED` (§2.3) es el único flag que controla ambos casos — no se agrega un setting nuevo para touch.

```typescript
useEffect(() => {
  if (!MOUSE_ENABLED) return;

  const actualizarPuntero = (clientX: number, clientY: number) => {
    punteroNDC.current.x = (clientX / window.innerWidth) * 2 - 1;
    punteroNDC.current.y = -(clientY / window.innerHeight) * 2 + 1;
  };

  const handleMouseMove = (e: MouseEvent) => actualizarPuntero(e.clientX, e.clientY);
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) actualizarPuntero(e.touches[0].clientX, e.touches[0].clientY);
  };

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
  };
}, []);
```

**Decisión de diseño explícita:** en mobile, `touchmove` se dispara también mientras el usuario arrastra el dedo para scrollear la página — es decir, la repulsión de puntos va a coincidir visualmente con el gesto de scroll, no solo con un "hover" real (que no existe en touch). Se acepta como comportamiento intencional del MVP, consistente con que el Plan General ya excluye explícitamente "optimización fina de performance mobile" del alcance del MVP.

---

## 11. Reglas de Performance

`N` configurable y consciente de mobile; mutar buffers existentes en vez de recrear geometría; `PointsMaterial` con `sizeAttenuation`, `transparent` y `depthWrite: false` para las superposiciones.

### 11.1 Resize en Caliente

**Decisión de diseño explícita:** `N` (`POINT_COUNT_DESKTOP`/`MOBILE`) se decide **una sola vez al montar el componente**, leyendo `window.innerWidth` en ese instante (`typeof window !== 'undefined' && window.innerWidth < 768 ? POINT_COUNT_MOBILE : POINT_COUNT_DESKTOP`, evaluado dentro de un `useState(() => ...)` con inicializador lazy o en el primer `useEffect`). Un resize posterior de la ventana **no** dispara regeneración de geometría ni recálculo de `N` durante la sesión.

**Por qué:** regenerar geometría a mitad de sesión violaría la regla de "nunca recrear buffers" (§11) y obligaría a reconstruir el estado disperso/ensamblado de todos los modelos en caliente. Se documenta como decisión consciente, no como deuda técnica — coherente con que el Plan General ya excluye "optimización fina de performance mobile" del alcance del MVP.

---

## 12. Instrucciones de Formato de Salida para el LLM

Al generar el código para las Fases 1 y 2, el LLM debe entregar el componente principal completo y autocontenido en un **único bloque de código** (ej. `HeroScene.tsx`), en este orden exacto:

0. **`'use client';`** como primera línea del archivo (§3.1), antes de cualquier `import`.
1. **Sección de Settings** (§2): constantes configurables, incluida `MODELOS_CONFIG` con `SLE`/`SOE`/`SRE`.
2. **Funciones de ORQ:** `getEstado`, `progresoEnEstado`, `orquestar` (§5.3–§5.6).
3. **Funciones auxiliares:** PRNG y `conSemilla` (§7.1), grilla plana, `muestrearPuntosDeGeometria` (§6.1), `generarEstadoDisperso` (§7), cubo placeholder, `getOpacity`, `getDispersion` (§5.8), `aplicarRepulsionPuntero` (§10.1).
4. **Componente interno de R3F** (`ModeloPoints`) — **uno por cada modelo de `MODELOS_CONFIG`, todos montados siempre** (§5.10, nunca condicional) — que lee `lp`, `estado` y `progresoLocal` del modelo correspondiente, y usa `useFrame` para animar **solo si el modelo está en `β` ese frame**.
5. **Componente de React** que envuelve el `<Canvas>`, lee el scroll con clamp de overscroll (§9), mantiene `orqState` en un `useRef` inicializado según §5.4, llama a `orquestar` en cada frame y renderiza el `.map()` completo de `MODELOS_CONFIG` (no solo 2 instancias).

**Regla de no-hardcodeo:** todo valor numérico debe salir de la sección de Settings. Nunca un número mágico dentro de una función.

**Regla de archivo único:** un archivo monolítico para poder copiar, pegar y validar visualmente en minutos. Modularizar recién en un segundo prompt, una vez validada la lógica de ORQ.

---

## 13. Checklist Técnico del MVP

- [ ] `'use client'` como primera línea del componente raíz del Hero (§3.1).
- [ ] Canvas fijo con `position: fixed`, `z-index` inferior al contenido.
- [ ] Scroll wrapper con altura calculada desde `MODELOS_CONFIG` + `window.innerHeight` (§4), no estimada a ojo.
- [ ] `RP` almacenado en `useRef`, calculado como `scrollY / PIXELS_PER_SPIN`, **clampeado a `[0, totalSpins]`** (§4, §9).
- [ ] Estado de ORQ (`i`, `gamma`, `rpAnterior`) almacenado en un único `useRef` con la interfaz `OrqState` completa (§5.4), **inicializado con `gamma[0] = MODELOS_CONFIG[0].SLE`** (no en 0) para que el primer modelo arranque visible (§5.4, §9).
- [ ] `rp` y `orqState` creados en el componente que envuelve `<Canvas>`, propagados hacia adentro vía `OrqContext.Provider` (§9.1).
- [ ] `OrqController` (dentro de `<Canvas>`) ejecuta `orquestar()` en un `useFrame` con `priority: -1`, para garantizar que corre antes que los `useFrame` de cada `ModeloPoints` en el mismo frame (§9.1).
- [ ] `getEstado` con límite estricto (`<`) en `finL` (§5.3).
- [ ] Función `orquestar()` implementada según §5.4, con memoria entre frames.
- [ ] Reingreso por retroceso de índice (`PrevModel`) inicializa `LP` en `finR` del modelo, no en 0 (§5.6).
- [ ] Todos los modelos de `MODELOS_CONFIG` montados siempre (`.map()` sin condicional), nunca solo los 2 de `β` (§5.10).
- [ ] `useFrame` de cada `ModeloPoints` recalcula posiciones/rotación/opacidad solo si ese modelo está en `β` ese frame; los modelos fuera de `β` no tocan su buffer (§5.10).
- [ ] Cubo placeholder generado con `muestrearPuntosDeGeometria()` a exactamente `N` puntos, desacoplado de `CUBE_SUBDIVISIONS` (§6.1).
- [ ] `generarEstadoDisperso()` y `muestrearPuntosDeGeometria()` **siempre** llamadas envueltas en `conSemilla(DISPERSION_SEED, ...)` (§7.1).
- [ ] Rotación mapeada desde `LP` (no acumulativa con delta) — determinista y reversible (§5.7).
- [ ] Opacidad lineal y dispersión con easing asimétrico (`easeInCubic`/`easeOutCubic`) según estado `L`/`O`/`R` (§5.8).
- [ ] Interacción de puntero por proyección 2D (sin `Raycaster`), unificada para `mousemove` y `touchmove` bajo `MOUSE_ENABLED` (§10.1).
- [ ] Buffer de posiciones mutado in-place, geometría nunca recreada en `useFrame`.
- [ ] `N` fijado una sola vez al montar (leyendo `window.innerWidth`), sin recalcular en resize (§11.1).
- [ ] Todas las constantes numéricas extraídas a la sección de Settings.
- [ ] Código autocontenido en un único archivo para iteración rápida.
- [ ] **Prueba manual de calibración del §5.9** (crossfade no debe revelar geometría reconocible de ambos modelos a la vez, incluso con el easing asimétrico ya aplicado).

---

## 14. Preguntas Abiertas Heredadas del Algoritmo Original

Estas quedaron señaladas como no-resueltas (o resueltas parcialmente) en el documento fuente y conviene tenerlas presentes al implementar:

1. **Comportamiento en scroll muy rápido (`|DRP|` grande):** si un salto de scroll es mayor al ancho de `SLE`/`SRE` de un modelo, ¿el modelo "salta" estados sin renderizar frames intermedios, o hay que sub-dividir el `DRP` en pasos más chicos dentro de un mismo frame? El documento fuente no lo cubre explícitamente.
2. **Modelos con `SLE`/`SRE` muy distintos entre sí en un mismo par:** cuando el ancho de salida de un modelo no coincide con el ancho de entrada del siguiente, el solape no es simétrico. Falta definir si eso es deseable (efecto de "arrastre") o si conviene forzar `SRE_saliente == SLE_entrante` como regla de diseño.
3. **§5.9** (tensión narrativa fade+dispersión combinados) — pendiente de validación visual en el prototipo, no de lógica.

---

*Documento versión 1.6 — Brief Técnico (final)*
*Alineado con: Plan General del Proyecto v1.1*
*Las únicas preguntas sin resolver (§14) dependen de validación empírica en el prototipo, no de una decisión de brief.*
