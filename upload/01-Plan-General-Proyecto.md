# Plan General del Proyecto — Landing Personal

## 1. Contexto del Proyecto

Landing page personal para marca personal / portfolio de un Frontend Developer especializado en experiencias web con Three.js, con background adicional en ilustración, narrativa visual y 3D con base matemática (álgebra lineal aplicada).

**Posicionamiento:** "Puente" — hoy vende principalmente lo técnico-visual (dev + Three.js), pero deja sembrada, solo a nivel de estilo y referencias visuales (nunca explícito en el copy todavía), una narrativa de ciencia ficción y ambición de dirección creativa de proyectos completos (potencialmente videojuegos a futuro).

**Frase eje (manifiesto/hero):** "Donde el código tiene la misma lógica que un mundo por construir."

**Principio rector del proyecto (aplica también al proceso de desarrollo):** empezar mínimo, que funcione, iterar después. No se busca la solución matemáticamente "correcta" desde el día uno — se busca la solución que engañe bien al ojo y sea sostenible de escalar.

---

## 2. Concepto Central del Hero

### 2.1 Narrativa Visual — El Viaje de una Nube

El hero es una experiencia de scroll inmersiva donde el usuario "construye" y "deconstruye" formas 3D a través de un estado disperso de puntos que actúa como estado intermedio universal.

**Secuencia narrativa (por tramo de scroll):**

1. **Estado inicial — El Plano:** El usuario ve una superficie plana compuesta por puntos alineados en grilla. No hay loading screen separada; la pantalla de carga y el primer visual del hero son la misma pieza.

2. **Fase de dispersión — Plano a estado disperso:** Al iniciar el scroll, la grilla plana comienza a girar sobre su eje y, simultáneamente, sus puntos se dispersan en caos controlado. Visualmente, la superficie se desintegra en un conjunto giratorio de partículas dispersas.

3. **Fase de transición — Estado disperso girando:** El plano, ahora en su estado disperso, gira libremente. En este estado, los puntos no forman una figura reconocible. Es el "limbo" visual entre formas.

4. **Crossfade de modelos — Cambio invisible:** Mientras el estado disperso gira, se produce un fade-out del plano disperso y un fade-in del Modelo A en su estado disperso. Ambos estados dispersos comparten la misma estética (puntos dispersos, sin forma reconocible) y la misma rotación, haciendo el cambio imperceptible para el ojo humano.

5. **Fase de ensamblaje — Estado disperso a Modelo ensamblado:** Continuando el scroll, el estado disperso del Modelo A se contrae y sus puntos migran hacia sus posiciones originales, revelando la forma 3D reconocible.

6. **Fase de contemplación — Modelo ensamblado girando:** Una vez ensamblado, el Modelo A gira suavemente sobre sí mismo, permitiendo al usuario observarlo desde diferentes ángulos antes de la siguiente transición.

7. **Repetición:** El ciclo se reinicia: el modelo puede dispersarse de nuevo en su estado disperso, y ese estado disperso puede crossfadear hacia otro modelo distinto.

### 2.2 Principio Narrativo Clave: El Estado Disperso como Pegamento Universal

Cada modelo 3D (incluido el plano inicial) tiene **dos estados**:
- **Ensamblado:** los puntos en sus posiciones originales, formando la figura reconocible.
- **Disperso:** los mismos puntos, aleatoriamente desplazados desde sus posiciones originales por una función de dispersión.

El estado disperso es el **estado de transición común** entre cualquier par de modelos. Esto significa:

- **Cada modelo es independiente.** No necesita saber nada sobre los demás modelos: ni su cantidad de puntos, ni sus posiciones, ni su geometría.
- **El crossfade ocurre en el dominio del estado disperso.** Dos sistemas de puntos superpuestos (uno saliendo, otro entrando), ambos en estado disperso, con opacidad cruzada. Ambos giran a la misma velocidad. El ojo no puede distinguir qué punto pertenece a qué modelo.
- **Reversibilidad total.** Si el usuario scrollea hacia atrás, todo el pipeline se invierte: modelo ensamblado → estado disperso → crossfade inverso → estado disperso anterior → plano.
- **Escalabilidad infinita.** Agregar un modelo nuevo solo requiere: (a) generar su estado disperso a partir de sus vértices, (b) definir un nuevo tramo de scroll. No hay que reescribir lógica de transición.

### 2.3 Metáfora Visual

> "Una constelación de estrellas que gira en el vacío. A veces las estrellas se alinean y revelan una forma. A veces se dispersan y vuelven al caos. El observador, con su scroll, decide cuándo ver el orden y cuándo ver el caos."

---

## 3. Arquitectura de Alto Nivel

### 3.1 Unidades Independientes (Modelos)

Cada modelo 3D es una unidad autónoma con su propio pipeline interno:

```
Modelo X:
  ├── Estado Disperso: array de Nₓ × 3 floats (posiciones aleatoriamente desplazadas desde originales)
  ├── Estado Ensamblado: array de Nₓ × 3 floats (posiciones originales de sus vértices)
  └── Transición interna: lerp(Estado Disperso, Estado Ensamblado, progreso de scroll)
```

Cada modelo tiene su propia cantidad de puntos (Nₓ). No hay restricción de N uniforme entre modelos distintos.

### 3.2 Estados Globales de la Experiencia

```
Experiencia completa:
  ├── Tramo 0: Plano (grilla 2D)
  ├── Tramo 1: Plano → Plano disperso (dispersión + rotación)
  ├── Tramo 2: Plano disperso girando (contemplación del estado disperso)
  ├── Tramo 3: Crossfade Plano disperso → Modelo A disperso (fade out + fade in)
  ├── Tramo 4: Modelo A disperso girando
  ├── Tramo 5: Modelo A disperso → Modelo A ensamblado (contracción)
  ├── Tramo 6: Modelo A ensamblado girando (contemplación)
  ├── Tramo 7: Modelo A ensamblado → Modelo A disperso (dispersión inversa)
  ├── Tramo 8: Crossfade Modelo A disperso → Modelo B disperso
  └── ... (repetible)
```

### 3.3 Interacción con Mouse (Capa Independiente)

Superpuesta a todo el pipeline, una capa de interacción que detecta la proximidad del cursor a los puntos (en espacio de pantalla 2D) y aplica un offset temporal de repulsión. Esto da sensación de "material vivo" sin afectar la lógica de transición por scroll.

---

## 4. Roadmap de Desarrollo

### Fase 1 — Escena Base y Estado Plano
**Entregable:** Un canvas fijo con una grilla de puntos plana visible.
- Configurar escena R3F con Canvas fijo.
- Generar grilla plana de N puntos.
- Render inicial: puntos alineados en superficie 2D.

### Fase 2 — Transición Plano → Estado Disperso → Modelo
**Entregable:** Scroll funcional que transforma la grilla en estado disperso giratorio y luego en un modelo 3D reconocible.
- Implementar función de dispersión (deformación de puntos hacia posiciones aleatorias en volumen).
- Mapear progreso de scroll a interpolación de posiciones.
- Implementar rotación del grupo de puntos durante fase de estado disperso.
- Implementar crossfade por opacidad entre dos sistemas de puntos superpuestos.
- Placeholder: cubo de alta subdivisión como modelo de prueba.

### Fase 3 — Interacción de Mouse
**Entregable:** Los puntos reaccionan al cursor con repulsión suave.
- Detección de proximidad en espacio de pantalla 2D (sin raycasting).
- Offset temporal de posición para puntos cercanos al cursor.
- Retorno suave a posición original al alejar el mouse.

### Fase 4 — Modularización y Reutilización
**Entregable:** Función reutilizable que recibe un modelo y genera su pipeline completo (estado disperso + ensamblado).
- Extraer lógica de transición a componente genérico.
- Permitir encadenar múltiples modelos.
- Validar que un modelo nuevo puede reemplazar al placeholder sin tocar lógica central.

### Fase 5 — Contenido y Deploy
**Entregable:** Landing completa con texto, secciones y deploy.
- Overlay de texto: frase del hero + manifiesto corto.
- Bloque de capacidades (texto directo, no 3D).
- Bloque de contacto simple.
- Deploy (Vercel/Netlify).

---

## 5. Explícitamente Fuera de Alcance para el MVP

- Múltiples modelos encadenados (la arquitectura debe permitirlo, pero el MVP se valida con un solo modelo/placeholder).
- Modelo 3D definitivo (placeholder de cubo con alta subdivisión).
- Optimización fina de performance mobile (se prueba que funcione, se optimiza en iteraciones posteriores).
- Navegación libre de cámara / mundo explorable (paradigma descartado; el recorrido es guiado por scroll).
- Sistema de partículas con física real (colisiones, gravedad, fluidos).
- Post-procesamiento avanzado (bloom, DOF, motion blur) — solo si no impacta el MVP.

---

## 6. Criterios de Aceptación del MVP

- [ ] Al cargar la página, se ve una grilla de puntos plana.
- [ ] Al scrollear hacia abajo, la grilla se dispersa en un estado disperso que gira.
- [ ] El estado disperso hace crossfade hacia el estado disperso de un modelo 3D (placeholder: cubo).
- [ ] Continuando el scroll, el estado disperso se contrae y revela el modelo ensamblado.
- [ ] El modelo ensamblado gira suavemente una vez formado.
- [ ] Al scrollear hacia arriba, todo el proceso se invierte correctamente.
- [ ] Al pasar el mouse sobre los puntos, estos se deforman levemente.
- [ ] El FPS se mantiene estable (≥45fps) en desktop y ≥30fps en mobile.
- [ ] El código está preparado para que un modelo nuevo reemplace al placeholder sin tocar la lógica de transición.

---

*Documento versión 1.1 — Plan General del Proyecto*
