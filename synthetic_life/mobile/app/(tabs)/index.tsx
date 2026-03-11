/**
 * Pantalla Mundo — mapa rico con biomas detallados,
 * entidades siempre en movimiento, construcción corregida, popup interactivo.
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
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient,
  Path, Polygon, Rect, Stop,
} from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR, emotionColor } from '../../constants/theme'
import type { Entity } from '../../engine/types'

// ── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS = 700
const HALF   = CANVAS / 2
const NODE   = 20
const NODE_H = NODE / 2

const REGION: Record<string, { x: number; y: number; w: number; h: number }> = {
  Garden:  { x: 0,   y: 0,   w: 348, h: 348 },
  Void:    { x: 352, y: 0,   w: 348, h: 348 },
  Archive: { x: 0,   y: 352, w: 348, h: 348 },
  Storm:   { x: 352, y: 352, w: 348, h: 348 },
}

const ZONE_NAME_ES: Record<string, string> = {
  Garden: 'Jardín', Void: 'Vacío', Archive: 'Archivo', Storm: 'Tormenta',
}

// ── Build types ───────────────────────────────────────────────────────────────
type BuildType = 'house' | 'rock' | 'fire' | 'tree'
interface Building { id: number; type: BuildType; x: number; y: number }

const BUILD_LABEL: Record<BuildType, string> = {
  house: 'Casa', rock: 'Roca', fire: 'Fogata', tree: 'Árbol',
}
const BUILD_EMOJI: Record<BuildType, string> = {
  house: '🏠', rock: '🪨', fire: '🔥', tree: '🌲',
}

// ── Static world data (pre-computed to avoid per-render randomness) ────────────
const GARDEN_TREES_A: [number,number][] = [
  [55,90],[80,70],[105,95],[130,75],[158,88],[55,140],[88,160],
]
const GARDEN_TREES_B: [number,number][] = [
  [220,60],[245,80],[268,55],[290,75],[310,58],[330,82],[200,110],
]
const GARDEN_TREES_C: [number,number][] = [
  [35,280],[62,300],[190,260],[215,280],[285,310],[310,285],[165,310],
]
const GARDEN_FLOWERS: { cx:number; cy:number; fill:string }[] = [
  { cx:45,  cy:200, fill:'#86efac' },
  { cx:72,  cy:222, fill:'#f9a8d4' },
  { cx:155, cy:130, fill:'#fbbf24' },
  { cx:180, cy:292, fill:'#a7f3d0' },
  { cx:260, cy:202, fill:'#f472b6' },
  { cx:318, cy:160, fill:'#6ee7b7' },
  { cx:100, cy:240, fill:'#fbbf24' },
  { cx:240, cy:140, fill:'#86efac' },
]
const VOID_STARS: { cx:number; cy:number; r:number; op:number }[] = [
  {cx:382,cy:18,r:1.8,op:0.75},{cx:412,cy:42,r:1.2,op:0.65},{cx:445,cy:20,r:2,op:0.8},
  {cx:475,cy:58,r:1.5,op:0.7},{cx:506,cy:33,r:1,op:0.6},{cx:535,cy:55,r:1.8,op:0.75},
  {cx:562,cy:22,r:1.2,op:0.65},{cx:592,cy:48,r:1.5,op:0.7},{cx:624,cy:33,r:2,op:0.8},
  {cx:660,cy:58,r:1,op:0.6},{cx:390,cy:82,r:1.5,op:0.7},{cx:424,cy:112,r:1,op:0.6},
  {cx:458,cy:78,r:1.8,op:0.75},{cx:492,cy:102,r:1.2,op:0.65},{cx:526,cy:86,r:2,op:0.8},
  {cx:560,cy:108,r:1.5,op:0.7},{cx:598,cy:130,r:1,op:0.6},{cx:634,cy:100,r:1.8,op:0.75},
  {cx:672,cy:76,r:1.2,op:0.65},{cx:416,cy:152,r:1.5,op:0.7},{cx:454,cy:178,r:1,op:0.6},
  {cx:490,cy:145,r:2,op:0.8},{cx:528,cy:168,r:1.5,op:0.7},{cx:563,cy:152,r:1,op:0.6},
  {cx:598,cy:178,r:1.8,op:0.75},{cx:634,cy:155,r:1.2,op:0.65},{cx:670,cy:140,r:1.5,op:0.7},
  {cx:390,cy:198,r:1,op:0.6},{cx:424,cy:218,r:1.8,op:0.75},{cx:460,cy:202,r:1.2,op:0.65},
  {cx:495,cy:225,r:1.5,op:0.7},{cx:532,cy:208,r:1,op:0.6},{cx:568,cy:232,r:2,op:0.8},
  {cx:605,cy:215,r:1.5,op:0.7},{cx:640,cy:238,r:1,op:0.6},{cx:408,cy:268,r:1.8,op:0.75},
  {cx:446,cy:256,r:1.2,op:0.65},{cx:484,cy:278,r:1.5,op:0.7},{cx:522,cy:260,r:1,op:0.6},
  {cx:560,cy:278,r:1.8,op:0.75},{cx:598,cy:265,r:1.2,op:0.65},{cx:636,cy:282,r:1.5,op:0.7},
  {cx:672,cy:268,r:1,op:0.6},{cx:380,cy:300,r:1.5,op:0.7},{cx:415,cy:318,r:1,op:0.6},
  {cx:452,cy:308,r:1.8,op:0.75},{cx:490,cy:328,r:1.2,op:0.65},{cx:530,cy:312,r:1.5,op:0.7},
  {cx:568,cy:322,r:1,op:0.6},{cx:608,cy:338,r:1.8,op:0.75},{cx:648,cy:313,r:1.2,op:0.65},
  {cx:688,cy:328,r:1.5,op:0.7},
]
const ARCHIVE_PILLARS: [number,number][] = [
  [22,378],[55,392],[100,382],[264,378],[298,386],[320,378],
]
const ARCHIVE_BOOKS: { x:number; y:number; fill:string }[] = [
  {x:90,y:578,fill:'#d97706'},{x:115,y:572,fill:'#b45309'},{x:140,y:580,fill:'#f59e0b'},
  {x:165,y:574,fill:'#92400e'},{x:190,y:578,fill:'#d97706'},{x:215,y:572,fill:'#b45309'},
  {x:240,y:578,fill:'#f59e0b'},
]
const STORM_RAIN: [number,number][] = [
  [370,490],[395,510],[425,495],[455,525],[485,505],[515,535],
  [545,515],[575,545],[605,525],[635,555],[665,530],[690,558],
  [378,560],[408,580],[442,598],[478,582],[512,600],[546,587],
  [580,605],[614,592],[648,612],[682,597],[360,622],[395,640],
  [430,654],[466,642],[502,660],[538,648],[574,664],[610,650],
]
const HMTN_XS = [20,55,90,125,160,195,230,265,300,410,445,480,515,550,585,620,655,688]
const VMTN_YS = [20,55,90,125,160,195,230,265,300,410,445,480,515,550,585,620,655,688]

// ── Position helpers ──────────────────────────────────────────────────────────
function isInRegion(x: number, y: number, r: typeof REGION[string]) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function randomInRegion(zone: string, buildings: Building[] = []): { x: number; y: number } {
  const r = REGION[zone] ?? REGION.Garden
  const margin = 28
  const topPad = 38
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

// ── Initial view ──────────────────────────────────────────────────────────────
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
      <Polygon points="10,16 5,6 10,10 15,6 10,16" fill="#dc2626" />
      <Polygon points="10,14 7,7 10,10 13,7 10,14" fill="#fbbf24" opacity={0.9} />
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

let _nextBuildId = 1

// ── World Screen ──────────────────────────────────────────────────────────────
export default function WorldScreen() {
  const { entities, worldState, liveEvents, isThinking, apiEnabled, feedEntity } = useSimulation()
  const router = useRouter()

  // Pan / zoom
  const scale      = useRef(new Animated.Value(INIT_SCALE)).current
  const translateX = useRef(new Animated.Value(INIT_TX)).current
  const translateY = useRef(new Animated.Value(INIT_TY)).current
  const lastScale  = useRef(INIT_SCALE)
  const lastOffset = useRef({ x: INIT_TX, y: INIT_TY })
  const pinchDist0  = useRef<number | null>(null)
  const pinchScale0 = useRef(INIT_SCALE)

  // Build mode
  const [buildMode, setBuildModeState] = useState(false)
  const buildModeRef = useRef(false)
  const [selectedBuild, setSelectedBuild] = useState<BuildType>('house')
  const [buildings, setBuildings] = useState<Building[]>([])

  const setBuildMode = (v: boolean) => {
    buildModeRef.current = v
    setBuildModeState(v)
  }
  const selectedBuildRef = useRef<BuildType>('house')
  useEffect(() => { selectedBuildRef.current = selectedBuild }, [selectedBuild])

  // Entity popup
  const [popup, setPopup] = useState<Entity | null>(null)

  // Entity positions
  const posRef = useRef<Record<number, { x: Animated.Value; y: Animated.Value }>>({})
  entities.forEach(entity => {
    if (!posRef.current[entity.id]) {
      const p = randomInRegion(entity.current_zone, buildings)
      posRef.current[entity.id] = {
        x: new Animated.Value(p.x),
        y: new Animated.Value(p.y),
      }
    }
  })

  // Keep latest entities/buildings accessible inside intervals/callbacks
  const entitiesRef  = useRef(entities)
  const buildingsRef = useRef(buildings)
  useEffect(() => { entitiesRef.current = entities  }, [entities])
  useEffect(() => { buildingsRef.current = buildings }, [buildings])

  // ── Continuous movement — entities always wander (every 2.5 s) ──────────────
  useEffect(() => {
    const id = setInterval(() => {
      entitiesRef.current.forEach(entity => {
        const pos = posRef.current[entity.id]
        if (!pos) return
        const p = randomInRegion(entity.current_zone, buildingsRef.current)
        Animated.parallel([
          Animated.timing(pos.x, { toValue: p.x, duration: 2000, useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: p.y, duration: 2000, useNativeDriver: false }),
        ]).start()
      })
    }, 2500)
    return () => clearInterval(id)
  }, []) // single interval, uses refs for fresh data

  // ── Encounter animation ───────────────────────────────────────────────────────
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

    Animated.parallel([
      Animated.timing(posA.x, { toValue: midX - 16, duration: 900, useNativeDriver: false }),
      Animated.timing(posA.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
      Animated.timing(posB.x, { toValue: midX + 4,  duration: 900, useNativeDriver: false }),
      Animated.timing(posB.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
    ]).start(() => {
      const zoneA = entitiesRef.current.find(e => e.id === idA)?.current_zone ?? 'Garden'
      const zoneB = entitiesRef.current.find(e => e.id === idB)?.current_zone ?? 'Garden'
      const newA  = randomInRegion(zoneA, buildingsRef.current)
      const newB  = randomInRegion(zoneB, buildingsRef.current)
      Animated.parallel([
        Animated.timing(posA.x, { toValue: newA.x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posA.y, { toValue: newA.y, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.x, { toValue: newB.x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.y, { toValue: newB.y, duration: 1400, useNativeDriver: false }),
      ]).start()
    })
  }, [liveEvents]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PanResponder ──────────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // In build mode capture taps immediately so onRelease fires for single taps
      onStartShouldSetPanResponder: () => buildModeRef.current,
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
            pinchDist0.current  = dist
            pinchScale0.current = lastScale.current
          } else {
            const newS = Math.min(3, Math.max(0.28,
              pinchScale0.current * dist / pinchDist0.current))
            scale.setValue(newS)
            lastScale.current = newS
          }
        } else {
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
        // Place building on tap (movement < 12px)
        if (buildModeRef.current && Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12) {
          const sx = evt.nativeEvent.locationX
          const sy = evt.nativeEvent.locationY
          const s  = lastScale.current
          const tx = lastOffset.current.x
          const ty = lastOffset.current.y
          const cx = (sx - HALF - tx) / s + HALF
          const cy = (sy - HALF - ty) / s + HALF
          if (cx >= 0 && cx <= CANVAS && cy >= 0 && cy <= CANVAS) {
            setBuildings(prev => [...prev, {
              id: _nextBuildId++, type: selectedBuildRef.current, x: cx, y: cy,
            }])
          }
        }
      },
    })
  ).current

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
            <View style={styles.thinkingBadge}><Text style={styles.thinkingTxt}>✦ IA</Text></View>
          ) : apiEnabled ? (
            <View style={styles.apiBadge}><Text style={styles.apiTxt}>API ✓</Text></View>
          ) : (
            <View style={styles.apiBadgeOff}><Text style={styles.apiTxtOff}>Sin API</Text></View>
          )}
          <View style={styles.dotLive} />
        </View>
      </View>

      {/* ── World canvas ── */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        <Animated.View style={[
          styles.canvas,
          { transform: [{ translateX }, { translateY }, { scale }] },
        ]}>

          {/* ── SVG world layer ── */}
          <Svg width={CANVAS} height={CANVAS} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="gGarden" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#134e1a" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#052e16" stopOpacity="0.25" />
              </LinearGradient>
              <LinearGradient id="gVoid" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#050210" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#1e1b4b" stopOpacity="0.75" />
              </LinearGradient>
              <LinearGradient id="gArchive" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#78350f" stopOpacity="0.4" />
                <Stop offset="1" stopColor="#451a03" stopOpacity="0.25" />
              </LinearGradient>
              <LinearGradient id="gStorm" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#1a0505" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#3b0a0a" stopOpacity="0.65" />
              </LinearGradient>
            </Defs>

            {/* ─── Biome backgrounds ─── */}
            <Rect x="0"   y="0"   width="350" height="350" fill="url(#gGarden)" />
            <Rect x="350" y="0"   width="350" height="350" fill="url(#gVoid)" />
            <Rect x="0"   y="350" width="350" height="350" fill="url(#gArchive)" />
            <Rect x="350" y="350" width="350" height="350" fill="url(#gStorm)" />

            {/* ═══ JARDÍN — bosque, río, flores ═══ */}
            <G>
              {/* River winding through Garden */}
              <Path
                d="M 62,0 C 85,55 42,105 72,155 C 102,205 58,252 92,298 C 118,338 142,348 162,348"
                fill="none" stroke="#2563eb" strokeWidth="12" opacity={0.3}
              />
              <Path
                d="M 62,0 C 85,55 42,105 72,155 C 102,205 58,252 92,298 C 118,338 142,348 162,348"
                fill="none" stroke="#93c5fd" strokeWidth="6" opacity={0.35}
              />
              <Path
                d="M 62,0 C 85,55 42,105 72,155 C 102,205 58,252 92,298 C 118,338 142,348 162,348"
                fill="none" stroke="#bfdbfe" strokeWidth="2" opacity={0.25}
              />
              {/* Small pond */}
              <Ellipse cx="238" cy="288" rx="30" ry="17" fill="#1d4ed8" opacity={0.25} />
              <Ellipse cx="238" cy="288" rx="22" ry="11" fill="#60a5fa" opacity={0.2} />
              {/* Forest cluster A */}
              {GARDEN_TREES_A.map(([tx,ty],i) => (
                <G key={`tA${i}`} transform={`translate(${tx-10},${ty-24})`}>
                  <Rect x="7" y="20" width="6" height="16" fill="#713f12" opacity={0.7} rx={1}/>
                  <Polygon points="10,0 -2,20 22,20" fill="#166534" opacity={0.75}/>
                  <Polygon points="10,7 0,22 20,22"  fill="#15803d" opacity={0.55}/>
                </G>
              ))}
              {/* Forest cluster B */}
              {GARDEN_TREES_B.map(([tx,ty],i) => (
                <G key={`tB${i}`} transform={`translate(${tx-10},${ty-24})`}>
                  <Rect x="7" y="20" width="6" height="16" fill="#713f12" opacity={0.65} rx={1}/>
                  <Polygon points="10,0 -2,20 22,20" fill="#14532d" opacity={0.7}/>
                  <Polygon points="10,7 0,22 20,22"  fill="#16a34a" opacity={0.5}/>
                </G>
              ))}
              {/* Forest cluster C (smaller trees) */}
              {GARDEN_TREES_C.map(([tx,ty],i) => (
                <G key={`tC${i}`} transform={`translate(${tx-8},${ty-18})`}>
                  <Rect x="5" y="16" width="5" height="12" fill="#713f12" opacity={0.6} rx={1}/>
                  <Polygon points="8,0 -1,17 17,17" fill="#15803d" opacity={0.65}/>
                </G>
              ))}
              {/* Flowers */}
              {GARDEN_FLOWERS.map(({ cx, cy, fill }, i) => (
                <G key={`fl${i}`}>
                  <Circle cx={cx} cy={cy} r={4.5} fill={fill}  opacity={0.7}/>
                  <Circle cx={cx} cy={cy} r={2}   fill="#fff"  opacity={0.45}/>
                </G>
              ))}
              {/* Grass patches */}
              <Rect x="10"  y="342" width="65" height="6" fill="#16a34a" opacity={0.28} rx={3}/>
              <Rect x="170" y="338" width="85" height="5" fill="#15803d" opacity={0.28} rx={3}/>
              <Rect x="268" y="340" width="62" height="6" fill="#16a34a" opacity={0.22} rx={3}/>
            </G>

            {/* ═══ VACÍO — espacio profundo, nebulosa, lago oscuro ═══ */}
            <G>
              {/* Nebula blobs */}
              <Ellipse cx="520" cy="78"  rx="58" ry="32" fill="#7c3aed" opacity={0.12}/>
              <Ellipse cx="562" cy="102" rx="42" ry="22" fill="#6d28d9" opacity={0.1}/>
              <Ellipse cx="622" cy="142" rx="52" ry="26" fill="#4f46e5" opacity={0.1}/>
              <Ellipse cx="452" cy="198" rx="46" ry="24" fill="#7c3aed" opacity={0.08}/>
              <Ellipse cx="590" cy="220" rx="38" ry="18" fill="#4c1d95" opacity={0.08}/>
              {/* Moon crescent */}
              <Circle cx="632" cy="54" r="26" fill="#a78bfa" opacity={0.48}/>
              <Circle cx="643" cy="48" r="22" fill="#050210" opacity={0.97}/>
              {/* Moon surface details */}
              <Circle cx="628" cy="58" r="4"   fill="#7c3aed" opacity={0.2}/>
              <Circle cx="638" cy="68" r="2.5" fill="#6d28d9" opacity={0.18}/>
              {/* Stars */}
              {VOID_STARS.map((s, i) => (
                <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#ddd6fe" opacity={s.op}/>
              ))}
              {/* Bright accent stars */}
              <Circle cx="430" cy="236" r="3"   fill="#e879f9" opacity={0.85}/>
              <Circle cx="555" cy="192" r="2.5" fill="#c4b5fd" opacity={0.9}/>
              <Circle cx="652" cy="270" r="3"   fill="#818cf8" opacity={0.85}/>
              <Circle cx="498" cy="312" r="2.5" fill="#a78bfa" opacity={0.8}/>
              {/* Void lake */}
              <Ellipse cx="478" cy="322" rx="52" ry="22" fill="#1e1b4b" opacity={0.85}/>
              <Ellipse cx="478" cy="322" rx="42" ry="16" fill="#312e81" opacity={0.45}/>
              <Ellipse cx="478" cy="317" rx="28" ry="8"  fill="#4c1d95" opacity={0.3}/>
              {/* Star reflections in lake */}
              <Circle cx="468" cy="322" r={1}   fill="#c4b5fd" opacity={0.45}/>
              <Circle cx="488" cy="320" r={1}   fill="#a78bfa" opacity={0.45}/>
              <Circle cx="476" cy="328" r={0.8} fill="#818cf8" opacity={0.4}/>
              <Circle cx="495" cy="325" r={0.7} fill="#e879f9" opacity={0.35}/>
            </G>

            {/* ═══ ARCHIVO — ruinas antiguas, columnas, biblioteca ═══ */}
            <G>
              {/* Stone floor */}
              <Rect x="5" y="622" width="338" height="73" fill="#1c1917" opacity={0.45} rx={2}/>
              {/* Moss texture on floor */}
              <Ellipse cx="60"  cy="668" rx="22" ry="6" fill="#14532d" opacity={0.2}/>
              <Ellipse cx="200" cy="672" rx="30" ry="5" fill="#15803d" opacity={0.18}/>
              {/* Columns */}
              {ARCHIVE_PILLARS.map(([px,py],i) => (
                <G key={`pil${i}`}>
                  <Rect x={px}   y={py}    width={12} height={62} fill="#92400e" opacity={0.55} rx={2}/>
                  <Rect x={px-2} y={py-7}  width={16} height={8}  fill="#b45309" opacity={0.55} rx={2}/>
                  <Rect x={px-2} y={py+62} width={16} height={6}  fill="#78350f" opacity={0.5}  rx={1}/>
                </G>
              ))}
              {/* Fallen stone block */}
              <Rect x="145" y="528" width="48" height="14" fill="#57534e" opacity={0.55} rx={2}/>
              <Rect x="162" y="540" width="32" height="10" fill="#44403c" opacity={0.45} rx={2}/>
              <Ellipse cx="158" cy="528" rx="12" ry="4" fill="#15803d" opacity={0.28}/>
              {/* Bookshelf bar */}
              <Rect x="78" y="602" width="200" height="5" fill="#b45309" opacity={0.45} rx={2}/>
              {ARCHIVE_BOOKS.map(({ x, y, fill }, i) => (
                <Rect key={`bk${i}`} x={x} y={y} width={20} height={26} fill={fill} opacity={0.55} rx={2}/>
              ))}
              <Rect x="78" y="607" width="200" height="3" fill="#78350f" opacity={0.35} rx={1}/>
              {/* Ancient symbols */}
              <Path d="M 162,422 L 167,412 L 172,422 L 177,412" stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity={0.38}/>
              <Circle cx="202" cy="452" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity={0.32}/>
              <Path d="M 198,452 L 206,452 M 202,448 L 202,456" stroke="#f59e0b" strokeWidth="1.5" opacity={0.32}/>
              <Path d="M 72,490 C 82,482 92,492 102,482 C 112,472 122,482 132,472" fill="none" stroke="#d97706" strokeWidth="1" opacity={0.32}/>
              <Path d="M 220,540 L 230,530 L 240,540 L 250,530 L 260,540" fill="none" stroke="#f59e0b" strokeWidth="1" opacity={0.25}/>
            </G>

            {/* ═══ TORMENTA — nubes densas, rayos, lluvia, inundación ═══ */}
            <G>
              {/* Cloud layer 1 */}
              {([460,490,522,555,588,620,652,682] as number[]).map((cx,i) => (
                <G key={`cl1${i}`}>
                  <Circle cx={cx}   cy={370} r={18} fill="#0c0505" opacity={0.78}/>
                  <Circle cx={cx+9} cy={362} r={13} fill="#140808" opacity={0.72}/>
                </G>
              ))}
              {/* Cloud layer 2 */}
              {([472,506,540,576,612,646,680] as number[]).map((cx,i) => (
                <Circle key={`cl2${i}`} cx={cx} cy={398} r={15} fill="#180a0a" opacity={0.68}/>
              ))}
              {/* Lightning bolts */}
              <Path d="M 418,378 L 408,418 L 424,414 L 412,460" stroke="#fbbf24" strokeWidth="3"   fill="none" opacity={0.85}/>
              <Path d="M 418,378 L 408,418 L 424,414 L 412,460" stroke="#fef9c3" strokeWidth="1.2" fill="none" opacity={0.6}/>
              <Path d="M 530,394 L 520,436 L 536,432 L 524,478" stroke="#f59e0b" strokeWidth="2.5" fill="none" opacity={0.75}/>
              <Path d="M 530,394 L 520,436 L 536,432 L 524,478" stroke="#fef08a" strokeWidth="1"   fill="none" opacity={0.5}/>
              <Path d="M 646,380 L 636,422 L 651,418 L 639,464" stroke="#fbbf24" strokeWidth="2.5" fill="none" opacity={0.7}/>
              {/* Lightning ambient glow */}
              <Ellipse cx="415" cy="480" rx="32" ry="10" fill="#fbbf24" opacity={0.06}/>
              {/* Rain */}
              {STORM_RAIN.map(([rx,ry],i) => (
                <Rect key={i} x={rx} y={ry} width={2} height={11} fill="#fca5a5" opacity={0.3} rx={1}
                  transform={`rotate(-18 ${rx} ${ry})`}/>
              ))}
              {/* Flooded ground */}
              <Ellipse cx="510" cy="660" rx="62" ry="20" fill="#1e3a5f" opacity={0.5}/>
              <Ellipse cx="510" cy="660" rx="46" ry="14" fill="#1d4ed8" opacity={0.22}/>
              <Ellipse cx="620" cy="680" rx="42" ry="14" fill="#1e3a5f" opacity={0.42}/>
              <Ellipse cx="380" cy="685" rx="28" ry="10" fill="#1e3a5f" opacity={0.38}/>
              {/* Lightning reflection on water */}
              <Ellipse cx="418" cy="668" rx="28" ry="8" fill="#fbbf24" opacity={0.06}/>
            </G>

            {/* ═══ Dividers + mountain range ═══ */}
            <G>
              <Rect x="347" y="0"   width="6" height="700" fill="#0a0f1e" opacity={0.65}/>
              <Rect x="0"   y="347" width="700" height="6"  fill="#0a0f1e" opacity={0.65}/>
              {/* Horizontal mountain range */}
              {HMTN_XS.map((cx,i) => (
                <G key={`mh${i}`}>
                  <Polygon points={`${cx-14},354 ${cx},328 ${cx+14},354`} fill="#1e293b" opacity={0.8}/>
                  <Polygon points={`${cx-5},333 ${cx},328 ${cx+5},333`}   fill="#f1f5f9" opacity={0.65}/>
                </G>
              ))}
              {/* Vertical mountain range */}
              {VMTN_YS.map((cy,i) => (
                <G key={`mv${i}`}>
                  <Polygon points={`354,${cy-14} 328,${cy} 354,${cy+14}`} fill="#1e293b" opacity={0.8}/>
                  <Polygon points={`333,${cy-4} 328,${cy} 333,${cy+4}`}   fill="#f1f5f9" opacity={0.65}/>
                </G>
              ))}
              {/* Central volcanic peak */}
              <Polygon points="334,362 350,328 366,362" fill="#0f172a" opacity={0.95}/>
              <Polygon points="344,347 350,328 356,347" fill="#f8fafc" opacity={0.75}/>
              {/* Peak glow (lava) */}
              <Ellipse cx="350" cy="362" rx="10" ry="4" fill="#ef4444" opacity={0.18}/>
            </G>

            {/* ─── User-placed buildings ─── */}
            {buildings.map(b => {
              if (b.type === 'house') return <HouseShape key={b.id} x={b.x} y={b.y}/>
              if (b.type === 'rock')  return <RockShape  key={b.id} x={b.x} y={b.y}/>
              if (b.type === 'fire')  return <FireShape  key={b.id} x={b.x} y={b.y}/>
              return <ExtraTreeShape key={b.id} x={b.x} y={b.y}/>
            })}
          </Svg>

          {/* ── Zone labels ── */}
          {[
            { zone: 'Garden',  left: 10, top: 6   },
            { zone: 'Void',    left: 358, top: 6   },
            { zone: 'Archive', left: 10, top: 358  },
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
            const sz    = NODE + Math.min(entity.generation * 1.5, 8)
            const szH   = sz / 2
            const selected = popup?.id === entity.id
            return (
              <Animated.View key={entity.id} style={[styles.entityWrap, { left: pos.x, top: pos.y }]}>
                <Pressable
                  onPress={() => setPopup(p => p?.id === entity.id ? null : entity)}
                  style={styles.entityInner}
                >
                  {/* Selection ring */}
                  {selected && (
                    <View style={[styles.entitySelect, {
                      width: sz + 22, height: sz + 22,
                      borderRadius: (sz + 22) / 2,
                      top: -szH - 11, left: -szH - 11,
                      borderColor: color,
                    }]}/>
                  )}
                  {/* Glow halo */}
                  <View style={[styles.entityGlow, {
                    width: sz + 14, height: sz + 14,
                    borderRadius: (sz + 14) / 2,
                    top: -szH - 7, left: -szH - 7,
                    borderColor: color + '55', shadowColor: color,
                  }]}/>
                  {/* Core */}
                  <View style={[styles.entityCore, {
                    width: sz, height: sz, borderRadius: szH,
                    backgroundColor: color, shadowColor: color,
                  }]}/>
                  {/* Name */}
                  <Text style={[styles.entityLabel, { color }]} numberOfLines={1}>
                    {entity.name}
                  </Text>
                </Pressable>
              </Animated.View>
            )
          })}

          {/* Build overlay hint */}
          {buildMode && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.buildOverlay]}>
              <Text style={styles.buildHint}>
                Toca el mapa · {BUILD_EMOJI[selectedBuild]} {BUILD_LABEL[selectedBuild]}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ── Build toolbar ── */}
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

      {/* ── Entity popup ── */}
      {popup && (
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <View style={[styles.popupDot, { backgroundColor: emotionColor(popup.emotional_state?.emotion) }]}/>
            <Text style={styles.popupName}>{popup.name}</Text>
            <Text style={styles.popupEmotion}>{popup.emotional_state?.emotion ?? '—'}</Text>
            <Pressable onPress={() => setPopup(null)} style={styles.popupClose}>
              <Text style={styles.popupCloseTxt}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.popupMeta}>
            ⚡ {Math.round(popup.energy ?? 0)} · Gen {popup.generation ?? 0} · {ZONE_NAME_ES[popup.current_zone] ?? popup.current_zone}
          </Text>
          {!!popup.last_thought && (
            <Text style={styles.popupThought} numberOfLines={3}>
              "{popup.last_thought}"
            </Text>
          )}
          {!!popup.current_desire && (
            <Text style={styles.popupDesire} numberOfLines={1}>
              Desea: {popup.current_desire}
            </Text>
          )}
          <View style={styles.popupActions}>
            <Pressable
              style={styles.popupBtnFeed}
              onPress={() => { feedEntity(popup.id); setPopup(null) }}
            >
              <Text style={styles.popupBtnTxt}>🍎 Alimentar</Text>
            </Pressable>
            <Pressable
              style={styles.popupBtnDetail}
              onPress={() => { setPopup(null); router.push(`/entity/${popup.id}`) }}
            >
              <Text style={styles.popupBtnTxt}>Ver más →</Text>
            </Pressable>
          </View>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#22d3ee' },
  headerSub:   { fontSize: 11, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotLive:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  thinkingBadge: { backgroundColor: '#0e7490', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  thinkingTxt:   { fontSize: 10, fontWeight: '700', color: '#22d3ee' },
  apiBadge:    { backgroundColor: '#052e16', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#166534' },
  apiTxt:      { fontSize: 10, fontWeight: '600', color: '#22c55e' },
  apiBadgeOff: { backgroundColor: '#1c1917', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  apiTxtOff:   { fontSize: 10, color: COLORS.textDim },

  canvasWrap:  { flex: 1, overflow: 'hidden' },
  canvas:      { width: CANVAS, height: CANVAS, position: 'absolute', top: 0, left: 0 },

  zoneLabel:   { position: 'absolute' },
  zoneName:    {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.4,
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },

  entityWrap:   { position: 'absolute', alignItems: 'center' },
  entityInner:  { alignItems: 'center' },
  entitySelect: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed' },
  entityGlow: {
    position: 'absolute', borderWidth: 1,
    shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  entityCore: {
    shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  entityLabel: {
    marginTop: 5, fontSize: 9, fontWeight: '600',
    maxWidth: 62, textAlign: 'center',
    textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
  },

  buildOverlay: { justifyContent: 'flex-end', paddingBottom: 12, alignItems: 'center' },
  buildHint:    {
    fontSize: 11, color: '#22d3ee',
    backgroundColor: '#020b18cc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  buildToolbar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  buildTypeBtn: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  buildTypeBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  buildTypeEmoji:     { fontSize: 18 },
  buildTypeLabel:     { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  // Entity popup
  popup: {
    position: 'absolute', bottom: 82, left: 12, right: 12,
    backgroundColor: '#020b18f2', borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  popupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  popupDot:     { width: 10, height: 10, borderRadius: 5 },
  popupName:    { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  popupEmotion: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  popupClose:   { padding: 4 },
  popupCloseTxt:{ fontSize: 14, color: COLORS.textDim },
  popupMeta:    { fontSize: 10, color: COLORS.textDim, marginBottom: 6 },
  popupThought: {
    fontSize: 12, color: COLORS.text, fontStyle: 'italic',
    marginBottom: 4, lineHeight: 17,
  },
  popupDesire:  { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  popupActions: { flexDirection: 'row', gap: 8 },
  popupBtnFeed: {
    flex: 1, backgroundColor: '#052e16', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#166534',
  },
  popupBtnDetail: {
    flex: 1, backgroundColor: '#0c1a2e', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  popupBtnTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },

  zoomCtrl: { position: 'absolute', bottom: 24, right: 14, gap: 8 },
  zoomBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.bgCard + 'ee',
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  zoomTxt:       { fontSize: 20, color: COLORS.text, fontWeight: '300', lineHeight: 26 },
})
