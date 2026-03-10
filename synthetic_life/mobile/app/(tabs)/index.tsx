/**
 * Pantalla Mundo — mapa unificado, paneable/zoomeable.
 * - Cuatro biomas en un solo canvas continuo
 * - Entidades animadas que se mueven hacia encuentros
 * - Modo construcción: el usuario puede colocar estructuras
 * - Indicador de llamada a la API de Claude
 */
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR, emotionColor } from '../../constants/theme'

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS = 700
const HALF   = CANVAS / 2   // 350 — center / transform origin
const NODE   = 20
const NODE_H = NODE / 2

/** Each biome region on the canvas (no gap/border — unified world) */
const REGION: Record<string, { x: number; y: number; w: number; h: number }> = {
  Garden:  { x: 0,   y: 0,   w: 348, h: 348 },
  Void:    { x: 352, y: 0,   w: 348, h: 348 },
  Archive: { x: 0,   y: 352, w: 348, h: 348 },
  Storm:   { x: 352, y: 352, w: 348, h: 348 },
}

const ZONE_NAME_ES: Record<string, string> = {
  Garden: 'Jardín', Void: 'Vacío', Archive: 'Archivo', Storm: 'Tormenta',
}

// ── Building types ────────────────────────────────────────────────────────────
type BuildType = 'house' | 'rock' | 'fire' | 'tree'
interface Building { id: number; type: BuildType; x: number; y: number }

const BUILD_LABEL: Record<BuildType, string> = {
  house: 'Casa', rock: 'Roca', fire: 'Fogata', tree: 'Árbol',
}
const BUILD_EMOJI: Record<BuildType, string> = {
  house: '🏠', rock: '🪨', fire: '🔥', tree: '🌲',
}

// ── Position helpers ──────────────────────────────────────────────────────────
function isInRegion(x: number, y: number, r: typeof REGION[string]) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function randomInRegion(
  zone: string,
  buildings: Building[] = [],
): { x: number; y: number } {
  const r = REGION[zone] ?? REGION.Garden
  const margin = 28
  const topPad = 38

  // 35% chance to wander near a building if one exists in this zone
  const nearby = buildings.filter(b => isInRegion(b.x, b.y, r))
  if (nearby.length > 0 && Math.random() < 0.35) {
    const tgt = nearby[Math.floor(Math.random() * nearby.length)]
    const spread = 28
    return {
      x: Math.max(r.x + margin, Math.min(r.x + r.w - margin,
          tgt.x + (Math.random() - 0.5) * spread)) - NODE_H,
      y: Math.max(r.y + topPad, Math.min(r.y + r.h - margin,
          tgt.y + (Math.random() - 0.5) * spread)) - NODE_H,
    }
  }
  return {
    x: r.x + margin + Math.random() * (r.w - margin * 2) - NODE_H,
    y: r.y + topPad + Math.random() * (r.h - topPad - margin) - NODE_H,
  }
}

// ── Initial pan/zoom (centers 700×700 canvas on ~390px screen) ────────────────
const INIT_SCALE = 0.52
const INIT_TX    = -155
const INIT_TY    = -8

// ── Building SVG shapes ────────────────────────────────────────────────────────
function HouseShape({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x - 12},${y - 18})`}>
      <Rect x="4" y="12" width="18" height="15" fill="#b45309" rx={1} />
      <Polygon points="0,13 12,0 24,13" fill="#78350f" />
      <Rect x="9" y="18" width="6" height="9" fill="#7c2d12" />
    </G>
  )
}
function RockShape({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x - 12},${y - 10})`}>
      <Ellipse cx="12" cy="10" rx="12" ry="9" fill="#374151" />
      <Ellipse cx="8"  cy="8"  rx="7"  ry="6" fill="#4b5563" />
    </G>
  )
}
function FireShape({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x - 10},${y - 16})`}>
      <Ellipse cx="10" cy="17" rx="8" ry="3" fill="#451a03" />
      <Polygon points="10,16 5,6  10,10 15,6  10,16" fill="#dc2626" />
      <Polygon points="10,14 7,7  10,10 13,7  10,14" fill="#fbbf24" opacity={0.9} />
    </G>
  )
}
function ExtraTreeShape({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x - 12},${y - 20})`}>
      <Polygon points="12,0 0,18 24,18" fill="#14532d" />
      <Rect x="9" y="18" width="6" height="12" fill="#713f12" rx={2} />
    </G>
  )
}

// Module-level building id counter (stable across re-renders)
let _nextBuildId = 1

// ── World Screen ──────────────────────────────────────────────────────────────
export default function WorldScreen() {
  const { entities, worldState, liveEvents, isThinking, apiEnabled } = useSimulation()
  const router = useRouter()

  // ── Pan / zoom ──────────────────────────────────────────────────────────────
  const scale      = useRef(new Animated.Value(INIT_SCALE)).current
  const translateX = useRef(new Animated.Value(INIT_TX)).current
  const translateY = useRef(new Animated.Value(INIT_TY)).current
  const lastScale  = useRef(INIT_SCALE)
  const lastOffset = useRef({ x: INIT_TX, y: INIT_TY })
  const pinchDist0 = useRef<number | null>(null)
  const pinchScale0 = useRef(INIT_SCALE)

  // ── Build mode ──────────────────────────────────────────────────────────────
  const [buildMode, setBuildModeState] = useState(false)
  const buildModeRef = useRef(false)
  const [selectedBuild, setSelectedBuild] = useState<BuildType>('house')
  const [buildings, setBuildings] = useState<Building[]>([])

  const setBuildMode = (v: boolean) => {
    buildModeRef.current = v
    setBuildModeState(v)
  }

  // ── Entity positions ────────────────────────────────────────────────────────
  const posRef = useRef<Record<number, { x: Animated.Value; y: Animated.Value }>>({})

  // Initialize missing positions synchronously during render
  entities.forEach(entity => {
    if (!posRef.current[entity.id]) {
      const p = randomInRegion(entity.current_zone, buildings)
      posRef.current[entity.id] = {
        x: new Animated.Value(p.x),
        y: new Animated.Value(p.y),
      }
    }
  })

  // Animate to new positions on each tick
  useEffect(() => {
    entities.forEach(entity => {
      if (posRef.current[entity.id]) {
        const p = randomInRegion(entity.current_zone, buildings)
        Animated.parallel([
          Animated.timing(posRef.current[entity.id].x, {
            toValue: p.x, duration: 3000, useNativeDriver: false,
          }),
          Animated.timing(posRef.current[entity.id].y, {
            toValue: p.y, duration: 3000, useNativeDriver: false,
          }),
        ]).start()
      }
    })
  }, [entities]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Encounter animation ─────────────────────────────────────────────────────
  const lastEncounterRef = useRef(-1)
  useEffect(() => {
    const enc = liveEvents.find(ev => ev.type === 'encounter')
    if (!enc || enc.id === lastEncounterRef.current) return
    lastEncounterRef.current = enc.id

    const idA = (enc.entity_a as { id: number }).id
    const idB = (enc.entity_b as { id: number }).id
    const posA = posRef.current[idA]
    const posB = posRef.current[idB]
    if (!posA || !posB) return

    const axV = (posA.x as any)._value as number
    const ayV = (posA.y as any)._value as number
    const bxV = (posB.x as any)._value as number
    const byV = (posB.y as any)._value as number
    const midX = (axV + bxV) / 2
    const midY = (ayV + byV) / 2

    // Move toward each other
    Animated.parallel([
      Animated.timing(posA.x, { toValue: midX - 16, duration: 900, useNativeDriver: false }),
      Animated.timing(posA.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
      Animated.timing(posB.x, { toValue: midX + 4,  duration: 900, useNativeDriver: false }),
      Animated.timing(posB.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
    ]).start(() => {
      // Then drift apart
      const zoneA = entities.find(e => e.id === idA)?.current_zone ?? 'Garden'
      const zoneB = entities.find(e => e.id === idB)?.current_zone ?? 'Garden'
      const newA = randomInRegion(zoneA, buildings)
      const newB = randomInRegion(zoneB, buildings)
      Animated.parallel([
        Animated.timing(posA.x, { toValue: newA.x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posA.y, { toValue: newA.y, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.x, { toValue: newB.x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.y, { toValue: newB.y, duration: 1400, useNativeDriver: false }),
      ]).start()
    })
  }, [liveEvents]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PanResponder ────────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gs) =>
        Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4 || evt.nativeEvent.touches.length >= 2,
      onPanResponderGrant: () => {
        translateX.setOffset(lastOffset.current.x)
        translateY.setOffset(lastOffset.current.y)
        translateX.setValue(0)
        translateY.setValue(0)
        pinchDist0.current = null
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches
        if (touches.length >= 2) {
          const dx = touches[0].pageX - touches[1].pageX
          const dy = touches[0].pageY - touches[1].pageY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (pinchDist0.current === null) {
            pinchDist0.current = dist
            pinchScale0.current = lastScale.current
          } else {
            const newS = Math.min(3, Math.max(0.28,
              pinchScale0.current * dist / pinchDist0.current))
            scale.setValue(newS)
            lastScale.current = newS
          }
        } else if (touches.length < 2) {
          translateX.setValue(gs.dx)
          translateY.setValue(gs.dy)
        }
      },
      onPanResponderRelease: (evt, gs) => {
        pinchDist0.current = null
        translateX.flattenOffset()
        translateY.flattenOffset()
        lastOffset.current = {
          x: (translateX as any)._value,
          y: (translateY as any)._value,
        }
        // Build mode tap: small movement = place building
        if (buildModeRef.current && Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8) {
          const sx = evt.nativeEvent.locationX
          const sy = evt.nativeEvent.locationY
          const s  = lastScale.current
          const tx = lastOffset.current.x
          const ty = lastOffset.current.y
          const cx = (sx - HALF - tx) / s + HALF
          const cy = (sy - HALF - ty) / s + HALF
          if (cx >= 0 && cx <= CANVAS && cy >= 0 && cy <= CANVAS) {
            setBuildings(prev => [...prev, {
              id:   _nextBuildId++,
              type: selectedBuildRef.current,
              x:    cx,
              y:    cy,
            }])
          }
        }
      },
    })
  ).current

  // Keep selected build type accessible in panResponder closure
  const selectedBuildRef = useRef<BuildType>('house')
  useEffect(() => { selectedBuildRef.current = selectedBuild }, [selectedBuild])

  const zoom = (factor: number) => {
    const newS = Math.min(3, Math.max(0.28, lastScale.current * factor))
    Animated.spring(scale, { toValue: newS, useNativeDriver: false, friction: 7 }).start()
    lastScale.current = newS
  }

  const resetView = () => {
    Animated.parallel([
      Animated.spring(scale,      { toValue: INIT_SCALE, useNativeDriver: false, friction: 7 }),
      Animated.spring(translateX, { toValue: INIT_TX,    useNativeDriver: false, friction: 7 }),
      Animated.spring(translateY, { toValue: INIT_TY,    useNativeDriver: false, friction: 7 }),
    ]).start()
    lastScale.current  = INIT_SCALE
    lastOffset.current = { x: INIT_TX, y: INIT_TY }
  }

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌊 Vida Sintética</Text>
          <Text style={styles.headerSub}>
            {entities.length} vivos · turno {worldState.current_tick}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isThinking ? (
            <View style={styles.thinkingBadge}>
              <Text style={styles.thinkingTxt}>✦ IA</Text>
            </View>
          ) : apiEnabled ? (
            <View style={styles.apiBadge}>
              <Text style={styles.apiTxt}>API ✓</Text>
            </View>
          ) : (
            <View style={styles.apiBadgeOff}>
              <Text style={styles.apiTxtOff}>Sin API</Text>
            </View>
          )}
          <View style={styles.dotLive} />
        </View>
      </View>

      {/* ── World canvas ── */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.canvas,
            { transform: [{ translateX }, { translateY }, { scale }] },
          ]}
        >
          {/* ── SVG world layer ── */}
          <Svg
            width={CANVAS}
            height={CANVAS}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* Biome background fills */}
            <Rect x="0"   y="0"   width="350" height="350" fill="#22c55e" opacity={0.09} />
            <Rect x="350" y="0"   width="350" height="350" fill="#6366f1" opacity={0.09} />
            <Rect x="0"   y="350" width="350" height="350" fill="#f59e0b" opacity={0.09} />
            <Rect x="350" y="350" width="350" height="350" fill="#ef4444" opacity={0.09} />

            {/* Zone dividers */}
            <Rect x="347" y="0"   width="6" height="700" fill="#0a0f1e" opacity={0.5} />
            <Rect x="0"   y="347" width="700" height="6"  fill="#0a0f1e" opacity={0.5} />

            {/* Central mountain peak */}
            <Polygon points="338,360 350,335 362,360" fill="#1e293b" opacity={0.85} />
            <Polygon points="344,360 350,340 356,360" fill="#334155" opacity={0.6} />

            {/* Mountain range — horizontal border (along y≈350) */}
            {([15,45,80,115,150,185,220,255,290,415,450,485,520,555,590,625,660] as number[]).map((cx, i) => (
              <Polygon key={`mh${i}`} points={`${cx-10},355 ${cx},336 ${cx+10},355`} fill="#1e293b" opacity={0.6} />
            ))}

            {/* Mountain range — vertical border (along x≈350) */}
            {([15,45,80,115,150,185,220,255,290,415,450,485,520,555,590,625,660] as number[]).map((cy, i) => (
              <Polygon key={`mv${i}`} points={`355,${cy-10} 336,${cy} 355,${cy+10}`} fill="#1e293b" opacity={0.6} />
            ))}

            {/* ── Jardín: árboles y flores ── */}
            <G>
              <Polygon points="55,105 80,62 105,105"  fill="#166534" opacity={0.7} />
              <Rect x="76"  y="105" width="9" height="20" fill="#713f12" opacity={0.65} rx={2} />
              <Polygon points="150,120 177,74 204,120" fill="#14532d" opacity={0.6} />
              <Rect x="172" y="120" width="9" height="18" fill="#713f12" opacity={0.6} rx={2} />
              <Polygon points="255,96 277,58 299,96"   fill="#166534" opacity={0.55} />
              <Rect x="272" y="96"  width="8" height="16" fill="#713f12" opacity={0.55} rx={2} />
              <Polygon points="88,252 106,220 124,252"  fill="#166534" opacity={0.45} />
              <Rect x="102" y="252" width="8" height="14" fill="#713f12" opacity={0.45} rx={2} />
              <Polygon points="278,265 296,232 314,265" fill="#14532d" opacity={0.45} />
              <Rect x="291" y="265" width="8" height="14" fill="#713f12" opacity={0.45} rx={2} />
              <Circle cx="40"  cy="172" r="5"   fill="#86efac" opacity={0.65} />
              <Circle cx="60"  cy="190" r="3.5" fill="#f472b6" opacity={0.6}  />
              <Circle cx="196" cy="282" r="5"   fill="#86efac" opacity={0.6}  />
              <Circle cx="310" cy="248" r="4"   fill="#f9a8d4" opacity={0.6}  />
              <Circle cx="225" cy="320" r="3"   fill="#fbbf24" opacity={0.55} />
              <Circle cx="78"  cy="330" r="4"   fill="#86efac" opacity={0.55} />
            </G>

            {/* ── Vacío: estrellas y luna ── */}
            <G>
              {(
                [
                  [382,18],[412,42],[445,20],[475,58],[506,33],[535,55],[562,22],
                  [592,48],[624,33],[660,58],[390,82],[424,112],[458,78],[492,102],
                  [526,86],[560,108],[598,130],[634,100],[672,76],[416,152],
                  [454,178],[490,145],[528,168],[563,152],[598,178],[634,155],
                  [670,140],[390,198],[424,218],[460,202],[495,225],[532,208],
                  [568,232],[605,215],[640,238],[408,268],[446,256],[484,278],
                  [522,260],[560,278],[598,265],[636,282],[672,268],
                ] as [number, number][]
              ).map(([cx, cy], i) => (
                <Circle key={i} cx={cx} cy={cy} r={1.5} fill="#c4b5fd" opacity={0.72} />
              ))}
              <Circle cx="430" cy="236" r="3"   fill="#e879f9" opacity={0.7} />
              <Circle cx="555" cy="192" r="2.5" fill="#c4b5fd" opacity={0.8} />
              <Circle cx="652" cy="270" r="3"   fill="#818cf8" opacity={0.7} />
              <Circle cx="498" cy="312" r="2.5" fill="#a78bfa" opacity={0.75} />
              <Path d="M622 55 A22 22 0 1 1 645 102 A15 15 0 1 0 622 55" fill="#a78bfa" opacity={0.5} />
            </G>

            {/* ── Archivo: columnas y estante de libros ── */}
            <G>
              <Rect x="22"  y="378" width="12" height="65" fill="#92400e" opacity={0.52} rx={2} />
              <Rect x="20"  y="372" width="16" height="8"  fill="#b45309" opacity={0.52} rx={2} />
              <Rect x="55"  y="390" width="11" height="55" fill="#92400e" opacity={0.48} rx={2} />
              <Rect x="53"  y="384" width="15" height="8"  fill="#b45309" opacity={0.48} rx={2} />
              <Rect x="264" y="378" width="12" height="65" fill="#92400e" opacity={0.52} rx={2} />
              <Rect x="262" y="372" width="16" height="8"  fill="#b45309" opacity={0.52} rx={2} />
              <Rect x="298" y="384" width="11" height="58" fill="#92400e" opacity={0.48} rx={2} />
              <Rect x="296" y="378" width="15" height="8"  fill="#b45309" opacity={0.48} rx={2} />
              <Rect x="90"  y="630" width="26" height="22" fill="#d97706" opacity={0.48} rx={3} />
              <Rect x="125" y="624" width="20" height="28" fill="#b45309" opacity={0.48} rx={3} />
              <Rect x="154" y="628" width="18" height="24" fill="#f59e0b" opacity={0.48} rx={3} />
              <Rect x="182" y="626" width="24" height="26" fill="#d97706" opacity={0.48} rx={3} />
              <Rect x="215" y="624" width="18" height="28" fill="#92400e" opacity={0.48} rx={3} />
              <Rect x="244" y="630" width="16" height="22" fill="#b45309" opacity={0.45} rx={3} />
              <Rect x="80"  y="653" width="190" height="4" fill="#b45309" opacity={0.35} rx={2} />
            </G>

            {/* ── Tormenta: rayos, nubes y lluvia ── */}
            <G>
              <Circle cx="472" cy="388" r="14" fill="#1e1e2e" opacity={0.65} />
              <Circle cx="494" cy="380" r="17" fill="#1e1e2e" opacity={0.65} />
              <Circle cx="516" cy="388" r="13" fill="#1e1e2e" opacity={0.65} />
              <Circle cx="582" cy="392" r="12" fill="#1e1e2e" opacity={0.6} />
              <Circle cx="602" cy="384" r="15" fill="#1e1e2e" opacity={0.6} />
              <Circle cx="622" cy="392" r="11" fill="#1e1e2e" opacity={0.6} />
              <Polygon points="422,376 411,422 426,418 415,466" fill="#fbbf24" opacity={0.7} />
              <Polygon points="528,392 517,438 532,434 521,482" fill="#f59e0b" opacity={0.6} />
              <Polygon points="640,380 629,426 644,422 633,470" fill="#fbbf24" opacity={0.55} />
              {(
                [
                  [375,494],[402,522],[434,507],[462,539],[492,517],[518,547],
                  [550,527],[578,557],[608,541],[640,567],[668,539],[382,573],
                  [414,597],[450,613],[485,599],[520,621],[554,611],[590,629],
                  [622,617],[657,633],[388,638],[422,656],[456,668],[490,658],
                ] as [number, number][]
              ).map(([cx, cy], i) => (
                <Rect key={i} x={cx} y={cy} width={2} height={7} fill="#fca5a5" opacity={0.34} rx={1} />
              ))}
            </G>

            {/* ── User-placed buildings ── */}
            {buildings.map(b => {
              if (b.type === 'house') return <HouseShape key={b.id} x={b.x} y={b.y} />
              if (b.type === 'rock')  return <RockShape  key={b.id} x={b.x} y={b.y} />
              if (b.type === 'fire')  return <FireShape  key={b.id} x={b.x} y={b.y} />
              return <ExtraTreeShape key={b.id} x={b.x} y={b.y} />
            })}
          </Svg>

          {/* ── Zone labels (float over each biome corner) ── */}
          {[
            { zone: 'Garden',  left: 12, top: 8 },
            { zone: 'Void',    left: 358, top: 8 },
            { zone: 'Archive', left: 12, top: 358 },
            { zone: 'Storm',   left: 358, top: 358 },
          ].map(({ zone, left, top }) => (
            <View key={zone} style={[styles.zoneLabel, { left, top }]}>
              <Text style={[styles.zoneName, { color: ZONE_COLOR[zone] }]}>
                {ZONE_NAME_ES[zone]}
              </Text>
            </View>
          ))}

          {/* ── Entity nodes ── */}
          {entities.map(entity => {
            const pos = posRef.current[entity.id]
            if (!pos) return null
            const color = emotionColor(entity.emotional_state?.emotion)
            // Entity grows slightly with generation (max +8px)
            const sz = NODE + Math.min(entity.generation * 1.5, 8)
            const szH = sz / 2
            return (
              <Animated.View
                key={entity.id}
                style={[styles.entityWrap, { left: pos.x, top: pos.y }]}
              >
                <Pressable
                  onPress={() => router.push(`/entity/${entity.id}`)}
                  style={styles.entityInner}
                >
                  {/* Glow halo */}
                  <View style={[
                    styles.entityGlow,
                    { width: sz + 14, height: sz + 14,
                      borderRadius: (sz + 14) / 2,
                      top: -szH - 7, left: -szH - 7,
                      borderColor: color + '55', shadowColor: color },
                  ]} />
                  {/* Core */}
                  <View style={[
                    styles.entityCore,
                    { width: sz, height: sz, borderRadius: szH,
                      backgroundColor: color, shadowColor: color },
                  ]} />
                  {/* Name */}
                  <Text style={[styles.entityLabel, { color }]} numberOfLines={1}>
                    {entity.name}
                  </Text>
                </Pressable>
              </Animated.View>
            )
          })}

          {/* Build mode cursor hint */}
          {buildMode && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.buildOverlay]}>
              <Text style={styles.buildHint}>
                Toca el mapa para colocar {BUILD_EMOJI[selectedBuild]} {BUILD_LABEL[selectedBuild]}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Build toolbar (shown when build mode active) ── */}
      {buildMode && (
        <View style={styles.buildToolbar}>
          {(['house', 'rock', 'fire', 'tree'] as BuildType[]).map(type => (
            <Pressable
              key={type}
              onPress={() => setSelectedBuild(type)}
              style={[styles.buildTypeBtn, selectedBuild === type && styles.buildTypeBtnActive]}
            >
              <Text style={styles.buildTypeEmoji}>{BUILD_EMOJI[type]}</Text>
              <Text style={styles.buildTypeLabel}>{BUILD_LABEL[type]}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setBuildings([])} style={styles.buildTypeBtn}>
            <Text style={styles.buildTypeEmoji}>🗑️</Text>
            <Text style={styles.buildTypeLabel}>Limpiar</Text>
          </Pressable>
        </View>
      )}

      {/* ── Zoom + Build controls ── */}
      <View style={styles.zoomCtrl}>
        <Pressable onPress={() => zoom(1.35)} style={styles.zoomBtn}>
          <Text style={styles.zoomTxt}>+</Text>
        </Pressable>
        <Pressable onPress={() => zoom(1 / 1.35)} style={styles.zoomBtn}>
          <Text style={styles.zoomTxt}>−</Text>
        </Pressable>
        <Pressable onPress={resetView} style={styles.zoomBtn}>
          <Text style={[styles.zoomTxt, { fontSize: 14 }]}>↺</Text>
        </Pressable>
        <Pressable
          onPress={() => setBuildMode(!buildMode)}
          style={[styles.zoomBtn, buildMode && styles.zoomBtnActive]}
        >
          <Text style={styles.zoomTxt}>🏗</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#22d3ee' },
  headerSub:   { fontSize: 11, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotLive:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },

  thinkingBadge: {
    backgroundColor: '#0e7490', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  thinkingTxt: { fontSize: 10, fontWeight: '700', color: '#22d3ee' },
  apiBadge:    { backgroundColor: '#052e16', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#166534' },
  apiTxt:      { fontSize: 10, fontWeight: '600', color: '#22c55e' },
  apiBadgeOff: { backgroundColor: '#1c1917', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  apiTxtOff:   { fontSize: 10, color: COLORS.textDim },

  canvasWrap:  { flex: 1, overflow: 'hidden' },
  canvas:      { width: CANVAS, height: CANVAS, position: 'absolute', top: 0, left: 0 },

  zoneLabel: { position: 'absolute' },
  zoneName:  { fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },

  entityWrap:  { position: 'absolute', alignItems: 'center' },
  entityInner: { alignItems: 'center' },
  entityGlow:  {
    position: 'absolute',
    borderWidth: 1,
    shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  entityCore:  {
    shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  entityLabel: {
    marginTop: 5, fontSize: 9, fontWeight: '600',
    maxWidth: 62, textAlign: 'center',
    textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
  },

  buildOverlay: { justifyContent: 'flex-end', paddingBottom: 12, alignItems: 'center' },
  buildHint:    { fontSize: 11, color: '#22d3ee', backgroundColor: '#020b18cc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },

  buildToolbar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  buildTypeBtn: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  buildTypeBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  buildTypeEmoji: { fontSize: 18 },
  buildTypeLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  zoomCtrl: { position: 'absolute', bottom: 24, right: 14, gap: 8 },
  zoomBtn:  {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.bgCard + 'ee',
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  zoomTxt:  { fontSize: 20, color: COLORS.text, fontWeight: '300', lineHeight: 26 },
})
