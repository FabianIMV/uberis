# UBERIS v2.0 — Simulación de Vida Sintética desde Cero (Expo SDK 58)

Simulación emergente de vida artificial, evolución genética, ecología, sociedades tribales y consciencia interior en español, reconstruida completamente desde cero sobre **Expo SDK 58**, **React Native Skia (`@shopify/react-native-skia` a 60 FPS)**, **Reanimated 4**, **Gesture Handler 3** y **síntesis bio-acústica PCM de 16 bits**.

---

## Cómo ejecutarlo en tu iPhone 12 (Expo Go `58.0.5`)

```bash
cd ~/Documents/fmrepos/uberis/synthetic_life/mobile
npx expo start
```

Escanea el QR con la cámara de tu iPhone 12 para abrirlo directo en **Expo Go**.

Si también quieres dejarlo publicado fijo en la pestaña **Projects** de tu cuenta `@fabianimv` en **Expo Go**:

```bash
cd ~/Documents/fmrepos/uberis/synthetic_life/mobile
npm run update:main
```

---

## Arquitectura de Uberis v2.0 (`synthetic_life/mobile`)

1. **Continente Vivo 2D (`2400 × 1800`) y 6 Biomas Orgánicos ([`biomes.ts`](./synthetic_life/mobile/engine/biomes.ts)):**
   - *Jardín Primordial (`eden`)*, *Laguna Coralina (`lagoon`)*, *Estepa Áurea (`steppe`)*, *Ruinas del Archivo (`archive`)*, *Tierras de Ceniza (`ashlands`)* y *Velo Abisal (`abyss`)*.
   - Ciclo solar continuo (amanecer, día, ocaso y noche bioluminiscente), 4 estaciones y clima dinámico (*lluvia, tormenta, aurora, ola de calor, lluvia de ceniza*).
2. **Genética de 10 Alelos, Morfología Real y Especiación ([`genome.ts`](./synthetic_life/mobile/engine/genome.ts)):**
   - Cada gen (`curiosity`, `empathy`, `aggression`, `creativity`, `survivalDrive`, `sociability`, `speedGene`, `sizeGene`, `senseGene`, `bioluminescence`) gobierna tanto el metabolismo y comportamiento como la **anatomía visible** de cada criatura (escala corporal, 1 a 3 ojos expresivos, crestas/astas/halos/aletas/cuernos, colas articuladas, patrones de piel y luminiscencia nocturna).
   - La divergencia genética genera **especiación binomial real** (*Lumina curiosa*, *Sylva empatia*, *Vorax ignis*, *Koinon artifex*, etc.).
3. **Ecología, Depredadores y Civilización Emergente ([`ecology.ts`](./synthetic_life/mobile/engine/ecology.ts), [`society.ts`](./synthetic_life/mobile/engine/society.ts)):**
   - Homeostasis completa (energía, hidratación, salud, calor corporal, vigor) con cinemática de *steering/boids* a 60 Hz ([`simulation.ts`](./synthetic_life/mobile/engine/simulation.ts)).
   - ~66 nodos regenerativos de recursos y bestias sombrías **Umbra** que acechan seres aislados y huyen de fogatas y atalayas.
   - Fundación espontánea de **Clanes** con heráldica, lemas y léxico propio; árbol de 7 descubrimientos tecnológicos (*dominio del fuego, refugios, medicina herbal, agricultura, mampostería, escritura simbólica, astronomía*) y construcción autónoma de *fogatas, refugios, graneros, cultivos, tótems, atalayas, monolitos ancestrales y estelas conmemorativas*.
4. **Mente Consciente en Español 100% Offline + Claude Opcional ([`cognition.ts`](./synthetic_life/mobile/engine/cognition.ts)):**
   - Monólogos interiores poéticos, globos de diálogo en tiempo real, mitos culturales y testamentos finales generados contextualmente sin requerir API externa, con enriquecimiento opcional vía Claude API en Ajustes.
5. **Observatorio GPU a 60 FPS + Modo Dios ([`WorldCanvas.tsx`](./synthetic_life/mobile/world/WorldCanvas.tsx), [`worldRenderer.ts`](./synthetic_life/mobile/world/worldRenderer.ts)):**
   - Cámara interactiva con *pinch-to-zoom*, paneo, brújula continental y seguimiento automático de criatura.
   - **8 Poderes Divinos**: *Observar*, *Maná Dorado*, *Lluvia Fértil*, *Sol Vital*, *Rayo Mutágeno*, *Erigir Monolito*, *Chispa de Génesis* y *Rayo Cataclísmico*.
   - **4 Vistas del Observatorio**: **Mundo**, **Seres** (con árbol genealógico interactivo y mente completa en [`entity/[id].tsx`](./synthetic_life/mobile/app/entity/%5Bid%5D.tsx)), **Crónicas** y **Evolución**.
   - **Bio-Sintetizador Acústico & Háptica ([`bioSynth.ts`](./synthetic_life/mobile/audio/bioSynth.ts), [`haptics.ts`](./synthetic_life/mobile/audio/haptics.ts)):** Armónicos PCM generados en memoria y respuesta táctil calibrada para iPhone 12.

---

## Verificación Automatizada

```bash
cd ~/Documents/fmrepos/uberis/synthetic_life/mobile
npm run typecheck
npm run verify
```
