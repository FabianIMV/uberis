/**
 * World v27 — Feed All button.
 * Adds a single 🍎 button that feeds every entity at once, with a brief
 * "Todos alimentados" toast. All organic movement from v26 preserved.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
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
  Path as SvgPath, Polygon, Rect, Stop,
} from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR, emotionColor } from '../../constants/theme'
import type { Entity } from '../../engine/types'

// ── Canvas constants ─────────────────────────────────────────────────────────
const W  = 700
const H  = 700
const ZW = W / 4

const GND_Y = 385
const GND_H = 80

const REGION: Record<string, { x: number; y: number; w: number; h: number }> = {
  Garden:  { x: 0,      y: GND_Y, w: ZW,   h: GND_H },
  Archive: { x: ZW,     y: GND_Y, w: ZW,   h: GND_H },
  Void:    { x: ZW * 2, y: GND_Y, w: ZW,   h: GND_H },
  Storm:   { x: ZW * 3, y: GND_Y, w: ZW,   h: GND_H },
}

const ZONE_NAME_ES: Record<string, string> = {
  Garden: 'Jardín', Void: 'Vacío', Archive: 'Archivo', Storm: 'Tormenta',
}
const ZONES = ['Garden', 'Archive', 'Void', 'Storm'] as const

// ── Build types ───────────────────────────────────────────────────────────────
type BuildType = 'house' | 'rock' | 'fire' | 'tree'
interface Building { id: number; type: BuildType; x: number; y: number }
const BUILD_LABEL: Record<BuildType, string> = { house:'Casa', rock:'Roca', fire:'Fogata', tree:'Árbol' }
const BUILD_EMOJI: Record<BuildType, string> = { house:'🏠', rock:'🪨', fire:'🔥', tree:'🌲' }
let _nextBuildId = 1

function blendToGold(baseColor: string, gen: number): string {
  // Blend from base emotion color toward gold as generation increases (gen 3 = light tint, gen 6+ = strong)
  const t = Math.min(1, Math.max(0, (gen - 2) / 5))
  if (t <= 0) return baseColor
  // Return gold-tinted version by mixing hex — simplified: return amber for high gen
  if (t > 0.7) return '#f59e0b'
  if (t > 0.4) return '#d97706'
  return baseColor
}

function randomInRegion(zone: string): { x: number; y: number } {
  const r = REGION[zone] ?? REGION.Garden
  const margin = 14
  return {
    x: r.x + margin + Math.random() * (r.w - margin * 2),
    y: r.y + margin + Math.random() * (r.h - margin * 2),
  }
}

// ── SVG static data ────────────────────────────────────────────────────────────
const BG_PEAKS: [number, number][] = [
  [0,340],[22,298],[48,328],[72,278],[98,318],[122,265],[148,300],
  [175,280],[198,305],[222,248],[248,275],[268,258],[292,272],
  [315,250],[340,270],[362,240],[388,220],[412,248],[438,268],
  [462,245],[488,262],[510,250],[525,268],[548,250],[572,265],
  [592,248],[618,262],[640,245],[662,262],[682,248],[700,268],
]
const G_TREES: [number, number][] = [
  [8,405],[22,388],[40,408],[58,390],[75,410],
  [92,385],[112,404],[130,390],[148,408],[166,392],
]
const G_FLOWERS: { cx:number; cy:number; fill:string }[] = [
  {cx:18,cy:440,fill:'#86efac'},{cx:42,cy:448,fill:'#f9a8d4'},
  {cx:68,cy:442,fill:'#fbbf24'},{cx:95,cy:450,fill:'#a7f3d0'},
  {cx:120,cy:443,fill:'#f472b6'},{cx:145,cy:448,fill:'#6ee7b7'},
  {cx:168,cy:442,fill:'#fbbf24'},
]
const G_RIVER_D = "M 58,0 C 72,80 42,140 65,200 C 88,260 50,320 75,390 C 88,420 100,440 120,455"
const A_COLS: [number, number][] = [
  [185,382],[200,386],[218,382],[238,380],[258,382],[278,386],[298,382],[318,380],[338,382],
]
const A_RUIN_BLOCKS: { x:number; y:number; w:number; h:number }[] = [
  {x:190,y:448,w:55,h:10},{x:260,y:445,w:48,h:12},{x:325,y:450,w:22,h:8},
]

const TWINKLE_STARS: { cx:number; cy:number; r:number; phase:number }[] = [
  { cx:395, cy:18,  r:2.5, phase:0    },
  { cx:450, cy:55,  r:2,   phase:0.33 },
  { cx:468, cy:30,  r:2.5, phase:0.66 },
  { cx:512, cy:110, r:2.5, phase:0.15 },
  { cx:362, cy:192, r:3,   phase:0.5  },
  { cx:448, cy:178, r:3,   phase:0.8  },
]

const V_STARS_STATIC: { cx:number; cy:number; r:number; op:number }[] = [
  {cx:358,cy:15,r:1.5,op:0.8},{cx:375,cy:38,r:1,op:0.65},
  {cx:415,cy:45,r:1.2,op:0.7},{cx:432,cy:25,r:1,op:0.6},
  {cx:488,cy:60,r:1,op:0.65},{cx:505,cy:40,r:1.5,op:0.7},
  {cx:520,cy:18,r:1.2,op:0.75},{cx:362,cy:75,r:1,op:0.65},{cx:382,cy:95,r:1.5,op:0.7},
  {cx:405,cy:80,r:1.8,op:0.75},{cx:428,cy:100,r:1.2,op:0.65},{cx:448,cy:78,r:1,op:0.6},
  {cx:470,cy:105,r:1.5,op:0.7},{cx:492,cy:88,r:1,op:0.65},
  {cx:365,cy:135,r:1.2,op:0.7},{cx:388,cy:155,r:1,op:0.6},{cx:410,cy:138,r:1.5,op:0.75},
  {cx:435,cy:160,r:1.8,op:0.8},{cx:458,cy:142,r:1,op:0.65},{cx:480,cy:165,r:1.5,op:0.7},
  {cx:502,cy:148,r:1.2,op:0.65},{cx:522,cy:170,r:1,op:0.6},
  {cx:402,cy:225,r:2.5,op:0.85},{cx:498,cy:210,r:2.5,op:0.8},{cx:518,cy:158,r:3,op:0.7},
]

// Constellation line index pairs into V_STARS_STATIC
const CONSTELLATION_PAIRS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 6],   // upper arc left→right
  [5, 6], [4, 5],                    // upper right cluster
  [1, 9], [9, 14],                   // descent center
  [22, 21], [21, 20],                // Void portal triangle base
]

// Aurora bands drifting across Void sky (x: 350-525)
const AURORA_BANDS = [
  { y: 72,  color: '#7c3aed', dur: 8200,  phase: 0    },
  { y: 112, color: '#0d9488', dur: 10500, phase: 0.33 },
  { y: 152, color: '#4c1d95', dur: 9300,  phase: 0.67 },
  { y: 198, color: '#065f46', dur: 11400, phase: 0.15 },
]

// Garden ground mist — gentle horizontal strips at ground level
const MIST_STRIPS = [
  { offsetY: 12, dur: 11000, phase: 0,    tw: 38 },
  { offsetY: 28, dur: 15000, phase: 0.35, tw: 26 },
  { offsetY: 44, dur: 9500,  phase: 0.65, tw: 32 },
  { offsetY: 58, dur: 17000, phase: 0.2,  tw: 22 },
]

// Storm animated cloud blobs drifting across sky
const STORM_CLOUD_DATA = [
  { y: 40,  h: 30, w: 90,  dur: 21000, phase: 0    },
  { y: 72,  h: 24, w: 75,  dur: 17000, phase: 0.45 },
  { y: 104, h: 34, w: 100, dur: 27000, phase: 0.72 },
]

const S_RAIN: [number, number][] = [
  [532,60],[548,85],[565,62],[582,90],[598,70],[615,95],[632,72],[648,98],[665,78],[682,102],
  [538,140],[556,165],[572,142],[590,170],[607,148],[624,175],[640,155],[658,178],[675,162],
  [530,220],[548,248],[565,225],[582,252],[600,228],[618,255],[635,232],[652,258],[670,238],
  [542,300],[560,328],[578,305],[595,332],[612,308],[630,338],[648,312],[665,340],[682,318],
]

// ── Animated rain streams in Storm zone ──────────────────────────────────────
// Deterministic layout so the pattern is stable across re-renders
const RAIN_STREAMS = Array.from({ length: 22 }, (_, i) => ({
  x:   530 + (i % 11) * 15.5 + (i < 11 ? 0 : 7.5),
  dur: 600 + (i * 43) % 420,
  phase: (i * 0.137) % 1,         // stagger starting position 0-1
  w:   1 + (i % 3) * 0.5,
  h:   10 + (i % 5) * 2,
  op:  0.2 + (i % 5) * 0.07,
}))

// ── Building shapes ────────────────────────────────────────────────────────────
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
      <Ellipse cx="8" cy="8" rx="7" ry="6" fill="#4b5563" />
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
    <G transform={`translate(${x - 10},${y - 18})`}>
      <Polygon points="10,0 0,18 20,18" fill="#14532d" />
      <Rect x="7" y="18" width="6" height="10" fill="#713f12" rx={1} />
    </G>
  )
}

function formatAway(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ── Sparkline component ────────────────────────────────────────────────────────
function Sparkline({ data, color, w, h }: { data: number[]; color: string; w: number; h: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1
    const y = h - 2 - ((v - min) / range) * (h - 4)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  })
  return (
    <Svg width={w} height={h}>
      <SvgPath d={pts.join(' ')} stroke={color} strokeWidth={1.5} fill="none" opacity={0.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

const NODE       = 17
const INIT_SCALE = 0.62
const INIT_TX    = -120
const INIT_TY    = -30

// ── Particle types ────────────────────────────────────────────────────────────
interface Bubble    { id: number; x: number; y: number; text: string; color: string; anim: Animated.Value }
interface Ripple    { id: number; x: number; y: number; scaleAnim: Animated.Value; opacityAnim: Animated.Value; color: string }
interface Spark     { id: number; x: number; y: number; dx: number; dy: number; anim: Animated.Value; color: string }
interface Firefly   { id: number; x: number; baseY: number; anim: Animated.Value }
interface Soul      { id: number; x: number; y: number; dx: number; dy: number; anim: Animated.Value; color: string }
interface GriefMark { id: number; x: number; y: number; anim: Animated.Value }
interface RelLine      { id: number; x1: number; y1: number; x2: number; y2: number; color: string; anim: Animated.Value }
interface Pollen       { id: number; x: number; baseY: number; anim: Animated.Value }
interface ShootingStar { id: number; x: number; y: number; anim: Animated.Value }
interface SleepMark    { id: number; x: number; y: number; anim: Animated.Value }
interface SocialLine   { key: string; x1: number; y1: number; x2: number; y2: number; color: string }
interface Mote         { id: number; x: number; baseY: number; anim: Animated.Value }
interface Bird         { id: number; y: number; anim: Animated.Value }
interface NebWisp      { id: number; x: number; y: number; color: string; len: number; angle: number; anim: Animated.Value }
interface DesireWisp   { id: number; x: number; y: number; text: string; anim: Animated.Value }
interface TrailEcho    { id: number; x: number; y: number; color: string; anim: Animated.Value }
interface BirthStamp   { id: number; x: number; y: number; color: string; anim: Animated.Value }
interface DeathMark    { id: number; x: number; y: number; anim: Animated.Value }
interface BondHeart    { key: string; x: number; y: number; color: string; anim: Animated.Value }

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorldScreen() {
  const { entities, worldState, liveEvents, isThinking, apiEnabled,
          feedEntity, awaySummary, dismissAwaySummary } = useSimulation()
  const router = useRouter()

  // Pan/zoom
  const scale      = useRef(new Animated.Value(INIT_SCALE)).current
  const translateX = useRef(new Animated.Value(INIT_TX)).current
  const translateY = useRef(new Animated.Value(INIT_TY)).current
  const lastScale  = useRef(INIT_SCALE)
  const lastOffset = useRef({ x: INIT_TX, y: INIT_TY })
  const pinchDist0  = useRef<number | null>(null)
  const pinchScale0 = useRef(INIT_SCALE)
  const canvasWrapRef  = useRef<any>(null)
  const wrapPageOffset = useRef({ x: 0, y: 0 })

  // Build
  const [buildMode, setBuildModeState] = useState(false)
  const buildModeRef    = useRef(false)
  const [selectedBuild, setSelectedBuild] = useState<BuildType>('house')
  const [buildings, setBuildings]         = useState<Building[]>([])
  const setBuildMode = (v: boolean) => { buildModeRef.current = v; setBuildModeState(v) }
  const selectedBuildRef = useRef<BuildType>('house')
  useEffect(() => { selectedBuildRef.current = selectedBuild }, [selectedBuild])

  const [popup, setPopup] = useState<Entity | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [fedAllFlash, setFedAllFlash] = useState(false)
  const [nebWisps, setNebWisps] = useState<NebWisp[]>([])
  const nextNebId = useRef(0)
  const [desireWisps, setDesireWisps] = useState<DesireWisp[]>([])
  const nextDesireId = useRef(0)
  const [birthStamps, setBirthStamps] = useState<BirthStamp[]>([])
  const nextStampId = useRef(0)
  const [deathMarks, setDeathMarks] = useState<DeathMark[]>([])
  const nextDeathMarkId = useRef(0)
  const [bondHearts, setBondHearts] = useState<BondHeart[]>([])
  const [eventHistory, setEventHistory] = useState<Array<{ icon: string; text: string; tick: number }>>([])  
  const portalBurstAnim = useRef(new Animated.Value(0)).current
  const [trailEchoes, setTrailEchoes] = useState<TrailEcho[]>([])
  const nextTrailId = useRef(0)

  // Entity positions
  const posRef = useRef<Record<number, { x: Animated.Value; y: Animated.Value }>>({})
  entities.forEach(entity => {
    if (!posRef.current[entity.id]) {
      const p = randomInRegion(entity.current_zone)
      posRef.current[entity.id] = {
        x: new Animated.Value(p.x),
        y: new Animated.Value(p.y),
      }
    }
  })
  const entitiesRef = useRef(entities)
  useEffect(() => { entitiesRef.current = entities }, [entities])

  // ── Population sparkline ──────────────────────────────────────────────────
  const [popHistory, setPopHistory] = useState<number[]>([entities.length])
  const lastTickHistory = useRef(worldState.current_tick)
  useEffect(() => {
    if (worldState.current_tick !== lastTickHistory.current) {
      lastTickHistory.current = worldState.current_tick
      setPopHistory(prev => [...prev.slice(-24), entities.length])
    }
  }, [worldState.current_tick, entities.length])

  // ── Census ticker ─────────────────────────────────────────────────────────
  const [censusIdx, setCensusIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setCensusIdx(i => (i + 1) % 4), 4000)
    return () => clearInterval(id)
  }, [])
  const censusLabel = useMemo(() => {
    if (entities.length === 0) return `t${worldState.current_tick}`
    const avgE = Math.round(entities.reduce((s, e) => s + (e.energy ?? 50), 0) / entities.length)
    const maxGen = Math.max(...entities.map(e => e.generation ?? 0))
    switch (censusIdx % 5) {
      case 0: return `${entities.length} vivos · t${worldState.current_tick}`
      case 1: return `energía media: ${avgE}`
      case 2: return `generación máx: G${maxGen}`
      case 3: return `${ZONE_NAME_ES[dominantZone ?? 'Garden']} domina`
      case 4: return eraLabel
      default: return `t${worldState.current_tick}`
    }
  }, [censusIdx, entities, worldState.current_tick, dominantZone])

  // ── World event overlay ───────────────────────────────────────────────────
  const [worldEventText, setWorldEventText] = useState<string | null>(null)
  const overlayAnim    = useRef(new Animated.Value(0)).current
  const lastWorldEvRef = useRef(-1)

  useEffect(() => {
    const we = liveEvents.find(ev => ev.type === 'world_event')
    if (!we || we.id === lastWorldEvRef.current) return
    lastWorldEvRef.current = we.id
    const text = String((we as any).description ?? we.type)
    setWorldEventText(text)
    Animated.sequence([
      Animated.timing(overlayAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(overlayAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start(() => setWorldEventText(null))
    // Add to event history
    setEventHistory(prev => [...prev.slice(-4), { icon: '🌍', text: text.slice(0, 55), tick: worldState.current_tick }])
  }, [liveEvents])

  // ── Pulse glow ────────────────────────────────────────────────────────────
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Hunger warning pulse ──────────────────────────────────────────────────
  const hungerPulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hungerPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(hungerPulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Mood ring rotation anim (shared base, speed modified per emotion) ───
  const moodRingSpin = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(moodRingSpin, { toValue: 1, duration: 3200, useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Idle sway for low-energy entities ────────────────────────────────────
  const idleSway = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleSway, { toValue: 1,  duration: 1100, useNativeDriver: true }),
        Animated.timing(idleSway, { toValue: -1, duration: 1100, useNativeDriver: true }),
        Animated.timing(idleSway, { toValue: 0,  duration: 800,  useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Storm zone breathing pulse ────────────────────────────────────────────
  const stormPulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stormPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(stormPulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Day/night atmospheric cycle (90-second loop) ─────────────────────────
  const dayNightAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(dayNightAnim, { toValue: 1, duration: 90000, useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Storm lightning flash ─────────────────────────────────────────────────
  const lightningAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const flash = () => {
      Animated.sequence([
        Animated.timing(lightningAnim, { toValue: 1,   duration: 75,  useNativeDriver: true }),
        Animated.timing(lightningAnim, { toValue: 0.25, duration: 55, useNativeDriver: true }),
        Animated.timing(lightningAnim, { toValue: 0.85, duration: 65, useNativeDriver: true }),
        Animated.timing(lightningAnim, { toValue: 0,   duration: 130, useNativeDriver: true }),
      ]).start()
      t = setTimeout(flash, 14000 + Math.random() * 24000)
    }
    t = setTimeout(flash, 6000)
    return () => clearTimeout(t)
  }, [])

  // ── Void shooting stars ───────────────────────────────────────────────────
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])
  const nextStarId = useRef(0)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const fire = () => {
      const x   = 355 + Math.random() * 140
      const y   = 12  + Math.random() * 155
      const anim = new Animated.Value(0)
      const sid  = nextStarId.current++
      setShootingStars(prev => [...prev.slice(-2), { id: sid, x, y, anim }])
      Animated.timing(anim, { toValue: 1, duration: 620, useNativeDriver: true })
        .start(() => setShootingStars(prev => prev.filter(s => s.id !== sid)))
      t = setTimeout(fire, 20000 + Math.random() * 25000)
    }
    t = setTimeout(fire, 9000)
    return () => clearTimeout(t)
  }, [])

  // ── Periodic meteor shower ────────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const shower = () => {
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          const x    = 355 + Math.random() * 140
          const y    = 8   + Math.random() * 160
          const anim = new Animated.Value(0)
          const sid  = nextStarId.current++
          setShootingStars(prev => [...prev.slice(-14), { id: sid, x, y, anim }])
          Animated.timing(anim, { toValue: 1, duration: 480 + Math.random() * 160, useNativeDriver: true })
            .start(() => setShootingStars(prev => prev.filter(s => s.id !== sid)))
        }, i * 260)
      }
      t = setTimeout(shower, 60000 + Math.random() * 60000)
    }
    t = setTimeout(shower, 35000)
    return () => clearTimeout(t)
  }, [])

  // ── Void vortex rings ─────────────────────────────────────────────────────
  const vortexAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(vortexAnim, { toValue: 1, duration: 4800, useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // ── Void aurora bands ─────────────────────────────────────────────────────
  const auroraAnims = useRef(AURORA_BANDS.map(() => new Animated.Value(0))).current
  useEffect(() => {
    const cleanups = AURORA_BANDS.map((band, i) => {
      const anim = auroraAnims[i]
      anim.setValue(band.phase)
      let loop: Animated.CompositeAnimation
      const startLoop = () => {
        loop = Animated.loop(
          Animated.timing(anim, { toValue: 1, duration: band.dur, useNativeDriver: true })
        )
        loop.start()
      }
      const delay = Math.round(band.phase * band.dur)
      const t = setTimeout(startLoop, delay)
      return () => { clearTimeout(t); loop?.stop() }
    })
    return () => cleanups.forEach(c => c())
  }, [])

  // ── Garden ground mist ────────────────────────────────────────────────────
  const mistAnims = useRef(MIST_STRIPS.map(() => new Animated.Value(0))).current
  useEffect(() => {
    const cleanups = MIST_STRIPS.map((strip, i) => {
      const anim = mistAnims[i]
      anim.setValue(strip.phase)
      let loop: Animated.CompositeAnimation
      const startLoop = () => {
        loop = Animated.loop(
          Animated.timing(anim, { toValue: 1, duration: strip.dur, useNativeDriver: true })
        )
        loop.start()
      }
      const t = setTimeout(startLoop, Math.round(strip.phase * strip.dur))
      return () => { clearTimeout(t); loop?.stop() }
    })
    return () => cleanups.forEach(c => c())
  }, [])

  // ── Storm animated clouds ─────────────────────────────────────────────────
  const stormCloudAnims = useRef(STORM_CLOUD_DATA.map(() => new Animated.Value(0))).current
  useEffect(() => {
    const cleanups = STORM_CLOUD_DATA.map((cloud, i) => {
      const anim = stormCloudAnims[i]
      anim.setValue(cloud.phase)
      let loop: Animated.CompositeAnimation
      const startLoop = () => {
        loop = Animated.loop(
          Animated.timing(anim, { toValue: 1, duration: cloud.dur, useNativeDriver: true })
        )
        loop.start()
      }
      const t = setTimeout(startLoop, Math.round(cloud.phase * cloud.dur))
      return () => { clearTimeout(t); loop?.stop() }
    })
    return () => cleanups.forEach(c => c())
  }, [])

  // ── Archive zone shimmer ──────────────────────────────────────────────────
  const archiveShimmer = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const glow = () => {
      Animated.sequence([
        Animated.timing(archiveShimmer, { toValue: 1, duration: 800,  useNativeDriver: true }),
        Animated.timing(archiveShimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]).start()
      t = setTimeout(glow, 28000 + Math.random() * 28000)
    }
    t = setTimeout(glow, 12000)
    return () => clearTimeout(t)
  }, [])

  // ── Dream ZZZ for tired entities ─────────────────────────────────────────
  const [sleepMarks, setSleepMarks] = useState<SleepMark[]>([])
  const nextSleepId = useRef(0)
  useEffect(() => {
    const check = () => {
      const sleepy = entitiesRef.current.filter(e => (e.energy ?? 100) < 28)
      if (sleepy.length === 0) return
      const entity = sleepy[Math.floor(Math.random() * sleepy.length)]
      const pos = posRef.current[entity.id]
      if (!pos) return
      const x = (pos.x as any)._value as number
      const y = (pos.y as any)._value as number
      const anim = new Animated.Value(0)
      const sid  = nextSleepId.current++
      setSleepMarks(prev => [...prev.slice(-3), { id: sid, x, y, anim }])
      Animated.timing(anim, { toValue: 1, duration: 2800, useNativeDriver: true })
        .start(() => setSleepMarks(prev => prev.filter(s => s.id !== sid)))
    }
    const id = setInterval(check, 8500)
    return () => clearInterval(id)
  }, [])

  // ── Social web ambient lines ──────────────────────────────────────────────
  const [socialLines, setSocialLines] = useState<SocialLine[]>([])
  useEffect(() => {
    const compute = () => {
      const lines: SocialLine[] = []
      const seen = new Set<string>()
      for (const entity of entitiesRef.current) {
        if (lines.length >= 15) break
        const rels = (entity as any).relationships ?? {}
        for (const [targetName, rel] of Object.entries(rels)) {
          if (lines.length >= 15) break
          const target = entitiesRef.current.find(e => e.name === targetName)
          if (!target) continue
          const pairKey = [entity.id, target.id].sort((a, b) => a - b).join('-')
          if (seen.has(pairKey)) continue
          seen.add(pairKey)
          const posA = posRef.current[entity.id]
          const posB = posRef.current[target.id]
          if (!posA || !posB) continue
          const x1 = (posA.x as any)._value as number
          const y1 = (posA.y as any)._value as number
          const x2 = (posB.x as any)._value as number
          const y2 = (posB.y as any)._value as number
          const valence = (rel as any).valence ?? 'neutral'
          const color = valence === 'friend'
            ? 'rgba(52,211,153,0.18)'
            : valence === 'family'
            ? 'rgba(167,139,250,0.18)'
            : 'rgba(248,113,113,0.18)'
          lines.push({ key: pairKey, x1, y1, x2, y2, color })
        }
      }
      setSocialLines(lines)
    }
    compute()
    const id = setInterval(compute, 3000)
    return () => clearInterval(id)
  }, [])

  // ── Proximity bond hearts ─────────────────────────────────────────────────
  useEffect(() => {
    const scan = () => {
      const hearts: BondHeart[] = []
      const seen = new Set<string>()
      for (const entity of entitiesRef.current) {
        const rels = (entity as any).relationships ?? {}
        for (const [name, rel] of Object.entries(rels)) {
          const valence = (rel as any).valence
          if (valence !== 'friend' && valence !== 'family') continue
          const target = entitiesRef.current.find(e => e.name === name)
          if (!target) continue
          const pairKey = [entity.id, target.id].sort((a, b) => a - b).join('-h')
          if (seen.has(pairKey)) continue
          seen.add(pairKey)
          const posA = posRef.current[entity.id]
          const posB = posRef.current[target.id]
          if (!posA || !posB) continue
          const ax = (posA.x as any)._value as number
          const ay = (posA.y as any)._value as number
          const bx = (posB.x as any)._value as number
          const by = (posB.y as any)._value as number
          const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
          if (dist > 90) continue  // only show when close
          const color = valence === 'family' ? '#a78bfa' : '#34d399'
          const existingHeart = bondHearts.find(h => h.key === pairKey)
          const anim = existingHeart?.anim ?? new Animated.Value(0)
          if (!existingHeart) {
            Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }).start()
          }
          hearts.push({ key: pairKey, x: (ax + bx) / 2, y: Math.min(ay, by) - 14, color, anim })
        }
      }
      setBondHearts(hearts)
    }
    scan()
    const id = setInterval(scan, 4000)
    return () => clearInterval(id)
  }, [])

  // ── Archive amber motes ───────────────────────────────────────────────────
  const [motes, setMotes] = useState<Mote[]>([])
  const nextMoteId = useRef(0)
  useEffect(() => {
    const spawn = () => {
      const x     = 180 + Math.random() * 162
      const baseY = GND_Y + Math.random() * (GND_H - 10)
      const anim  = new Animated.Value(0)
      const mid   = nextMoteId.current++
      setMotes(prev => [...prev.slice(-10), { id: mid, x, baseY, anim }])
      Animated.timing(anim, { toValue: 1, duration: 5000 + Math.random() * 4000, useNativeDriver: true })
        .start(() => setMotes(prev => prev.filter(m => m.id !== mid)))
    }
    spawn()
    const id = setInterval(spawn, 900)
    return () => clearInterval(id)
  }, [])

  // ── Garden bird silhouettes ───────────────────────────────────────────────
  const [birds, setBirds] = useState<Bird[]>([])
  const nextBirdId = useRef(0)
  useEffect(() => {
    const spawn = () => {
      const y    = 50 + Math.random() * 230
      const anim = new Animated.Value(0)
      const bid  = nextBirdId.current++
      setBirds(prev => [...prev.slice(-4), { id: bid, y, anim }])
      Animated.timing(anim, { toValue: 1, duration: 14000 + Math.random() * 12000, useNativeDriver: true })
        .start(() => setBirds(prev => prev.filter(b => b.id !== bid)))
    }
    spawn()
    const id = setInterval(spawn, 7000)
    return () => clearInterval(id)
  }, [])

  // ── Void nebula wisps ─────────────────────────────────────────────────────
  useEffect(() => {
    const NCOLORS = ['#7c3aed', '#0d9488', '#4c1d95', '#065f46', '#1e3a8a', '#6d28d9', '#0e7490']
    let t: ReturnType<typeof setTimeout>
    const spawn = () => {
      const x     = 352 + Math.random() * 165
      const y     = 10  + Math.random() * 300
      const color = NCOLORS[Math.floor(Math.random() * NCOLORS.length)]
      const len   = 45  + Math.random() * 65
      const angle = 18  + Math.random() * 28
      const anim  = new Animated.Value(0)
      const nid   = nextNebId.current++
      setNebWisps(prev => [...prev.slice(-6), { id: nid, x, y, color, len, angle, anim }])
      Animated.timing(anim, { toValue: 1, duration: 7000 + Math.random() * 6000, useNativeDriver: true })
        .start(() => setNebWisps(prev => prev.filter(w => w.id !== nid)))
      t = setTimeout(spawn, 3500 + Math.random() * 3000)
    }
    t = setTimeout(spawn, 1500)
    return () => clearTimeout(t)
  }, [])

  // ── Entity desire whispers ────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const candidates = entitiesRef.current.filter(e => !!(e as any).current_desire)
      if (candidates.length === 0) return
      const entity = candidates[Math.floor(Math.random() * candidates.length)]
      const pos = posRef.current[entity.id]
      if (!pos) return
      const x    = (pos.x as any)._value as number
      const y    = (pos.y as any)._value as number
      const text = String((entity as any).current_desire ?? '').slice(0, 70)
      const anim = new Animated.Value(0)
      const did  = nextDesireId.current++
      setDesireWisps(prev => [...prev.slice(-4), { id: did, x, y, text, anim }])
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]).start(() => setDesireWisps(prev => prev.filter(d => d.id !== did)))
    }
    const id = setInterval(check, 6500)
    return () => clearInterval(id)
  }, [])

  // ── Void portal burst ─────────────────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const burst = () => {
      Animated.sequence([
        Animated.timing(portalBurstAnim, { toValue: 1, duration: 180,  useNativeDriver: true }),
        Animated.timing(portalBurstAnim, { toValue: 0, duration: 900,  useNativeDriver: true }),
      ]).start()
      t = setTimeout(burst, 15000 + Math.random() * 18000)
    }
    t = setTimeout(burst, 8000)
    return () => clearTimeout(t)
  }, [])

  // ── Storm rain streams ────────────────────────────────────────────────────
  const rainAnims = useRef(RAIN_STREAMS.map(() => new Animated.Value(0))).current
  useEffect(() => {
    const loops = RAIN_STREAMS.map((s, i) => {
      const anim = rainAnims[i]
      anim.setValue(s.phase)
      // delay start by phase fraction of duration so streams are offset
      let loop: Animated.CompositeAnimation
      const startLoop = () => {
        loop = Animated.loop(
          Animated.timing(anim, { toValue: 1, duration: s.dur, useNativeDriver: true })
        )
        loop.start()
      }
      const delay = Math.round(s.phase * s.dur)
      const t = setTimeout(startLoop, delay)
      return () => { clearTimeout(t); loop?.stop() }
    })
    return () => loops.forEach(cleanup => cleanup())
  }, [])

  // ── Star twinkle ──────────────────────────────────────────────────────────
  const twinkleAnims = useRef(TWINKLE_STARS.map(s => new Animated.Value(s.phase))).current
  useEffect(() => {
    const loops = TWINKLE_STARS.map((s, i) => {
      const anim = twinkleAnims[i]
      const dur  = 1200 + i * 380
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1,    duration: dur,       useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: dur * 0.7, useNativeDriver: true }),
        ])
      )
      loop.start()
      return loop
    })
    return () => loops.forEach(l => l.stop())
  }, [])

  // ── Fireflies ─────────────────────────────────────────────────────────────
  const [fireflies, setFireflies] = useState<Firefly[]>([])
  const nextFireflyId = useRef(0)
  useEffect(() => {
    const spawn = () => {
      const x = 8 + Math.random() * 155
      const baseY = 410 + Math.random() * 50
      const anim  = new Animated.Value(0)
      const fid   = nextFireflyId.current++
      setFireflies(prev => [...prev.slice(-5), { id: fid, x, baseY, anim }])
      Animated.timing(anim, { toValue: 1, duration: 3500 + Math.random() * 2000, useNativeDriver: true })
        .start(() => setFireflies(prev => prev.filter(f => f.id !== fid)))
    }
    spawn()
    const id = setInterval(spawn, 2200)
    return () => clearInterval(id)
  }, [])

  // ── Garden pollen ─────────────────────────────────────────────────────────
  const [pollen, setPollen] = useState<Pollen[]>([])
  const nextPollenId = useRef(0)
  useEffect(() => {
    const spawn = () => {
      const x     = 6 + Math.random() * 160
      const baseY = 400 + Math.random() * 60
      const anim  = new Animated.Value(0)
      const pid   = nextPollenId.current++
      setPollen(prev => [...prev.slice(-8), { id: pid, x, baseY, anim }])
      Animated.timing(anim, { toValue: 1, duration: 4000 + Math.random() * 3000, useNativeDriver: true })
        .start(() => setPollen(prev => prev.filter(p => p.id !== pid)))
    }
    spawn()
    const id = setInterval(spawn, 1500)
    return () => clearInterval(id)
  }, [])

  // ── Encounter relationship lines ──────────────────────────────────────────
  const [relLines, setRelLines] = useState<RelLine[]>([])
  const nextRelLineId = useRef(0)

  // ── Thought bubbles ───────────────────────────────────────────────────────
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const lastThoughtRef = useRef(-1)
  const nextBubbleId   = useRef(0)
  useEffect(() => {
    const thought = liveEvents.find(ev => ev.type === 'entity_thought' || ev.type === 'thought')
    if (!thought || thought.id === lastThoughtRef.current) return
    lastThoughtRef.current = thought.id
    const entity = entitiesRef.current.find(e => e.name === (thought as any).name)
    if (!entity) return
    const pos = posRef.current[entity.id]
    if (!pos) return
    const x    = (pos.x as any)._value as number
    const y    = (pos.y as any)._value as number
    const text = String((thought as any).thought ?? (thought as any).description ?? '').slice(0, 85)
    const color = emotionColor(String((thought as any).emotion ?? entity.emotional_state?.emotion ?? 'neutral'))
    const anim  = new Animated.Value(0)
    const bid   = nextBubbleId.current++
    setBubbles(prev => [...prev.slice(-2), { id: bid, x, y, text, color, anim }])
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(3200),
      Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setBubbles(prev => prev.filter(b => b.id !== bid)))
  }, [liveEvents])

  // ── Birth sparks ──────────────────────────────────────────────────────────
  const [sparks, setSparks] = useState<Spark[]>([])
  const lastBirthRef = useRef(-1)
  const nextSparkId  = useRef(0)
  useEffect(() => {
    const birth = liveEvents.find(ev => ev.type === 'entity_born' || ev.type === 'birth')
    if (!birth || birth.id === lastBirthRef.current) return
    lastBirthRef.current = birth.id
    setEventHistory(prev => [...prev.slice(-4), { icon: '✨', text: `${(birth as any).name ?? '?'} nació`, tick: worldState.current_tick }])
    const zone   = String((birth as any).zone ?? (birth as any).current_zone ?? 'Garden')
    const region = REGION[zone] ?? REGION.Garden
    const cx     = region.x + 20 + Math.random() * (region.w - 40)
    const cy     = region.y + 10 + Math.random() * (region.h - 20)
    const color  = ZONE_COLOR[zone] ?? '#34d399'
    const newSparks: Spark[] = Array.from({ length: 9 }, (_, i) => {
      const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.4
      const dist  = 18 + Math.random() * 20
      return {
        id: nextSparkId.current++, x: cx, y: cy,
        dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist,
        anim: new Animated.Value(0),
        color: i % 2 === 0 ? color : '#ffffff',
      }
    })
    setSparks(prev => [...prev.slice(-20), ...newSparks])
    newSparks.forEach(s => {
      Animated.timing(s.anim, { toValue: 1, duration: 800, useNativeDriver: true })
        .start(() => setSparks(prev => prev.filter(x => x.id !== s.id)))
    })
    // Leave a birth stamp at location
    const stampAnim = new Animated.Value(1)
    const stampId = nextStampId.current++
    setBirthStamps(prev => [...prev.slice(-8), { id: stampId, x: cx, y: cy, color, anim: stampAnim }])
    Animated.timing(stampAnim, { toValue: 0, duration: 8000, useNativeDriver: true })
      .start(() => setBirthStamps(prev => prev.filter(s => s.id !== stampId)))
  }, [liveEvents])

  // ── Death soul departure ──────────────────────────────────────────────────
  const [souls, setSouls] = useState<Soul[]>([])
  const lastDeathRef = useRef(-1)
  const nextSoulId   = useRef(0)
  useEffect(() => {
    const death = liveEvents.find(ev => ev.type === 'entity_died' || ev.type === 'death')
    if (!death || death.id === lastDeathRef.current) return
    lastDeathRef.current = death.id
    setEventHistory(prev => [...prev.slice(-4), { icon: '🌑', text: `${(death as any).name ?? '?'} partió`, tick: worldState.current_tick }])
    const entity = entitiesRef.current.find(e => e.name === (death as any).name)
    let cx: number, cy: number
    if (entity) {
      const pos = posRef.current[entity.id]
      cx = pos ? (pos.x as any)._value : (REGION[entity.current_zone]?.x ?? 0) + ZW / 2
      cy = pos ? (pos.y as any)._value : GND_Y + GND_H / 2
    } else {
      const zone = String((death as any).zone ?? (death as any).current_zone ?? 'Garden')
      const r = REGION[zone] ?? REGION.Garden
      cx = r.x + r.w / 2; cy = r.y + r.h / 2
    }
    const SOUL_COLORS = ['#94a3b8', '#cbd5e1', '#ffffff', '#e2e8f0', '#475569', '#f8fafc', '#64748b']
    const newSouls: Soul[] = Array.from({ length: 7 }, (_, i) => {
      const angle = -Math.PI * 0.5 + (i / 7 - 0.5) * Math.PI * 0.85
      const dist  = 22 + i * 5
      return {
        id: nextSoulId.current++, x: cx, y: cy,
        dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist,
        anim: new Animated.Value(0),
        color: SOUL_COLORS[i % SOUL_COLORS.length],
      }
    })
    setSouls(prev => [...prev.slice(-14), ...newSouls])
    newSouls.forEach(s => {
      Animated.timing(s.anim, { toValue: 1, duration: 1400 + Math.random() * 400, useNativeDriver: true })
        .start(() => setSouls(prev => prev.filter(x => x.id !== s.id)))
    })
    // Leave a death mark at the location
    const dmAnim = new Animated.Value(1)
    const dmId = nextDeathMarkId.current++
    setDeathMarks(prev => [...prev.slice(-12), { id: dmId, x: cx, y: cy, anim: dmAnim }])
    Animated.timing(dmAnim, { toValue: 0, duration: 12000, useNativeDriver: true })
      .start(() => setDeathMarks(prev => prev.filter(d => d.id !== dmId)))
  }, [liveEvents])

  // ── Grief floating hearts ─────────────────────────────────────────────────
  const [griefs, setGriefs] = useState<GriefMark[]>([])
  const lastGriefRef = useRef(-1)
  const nextGriefId  = useRef(0)
  useEffect(() => {
    const grief = liveEvents.find(ev => ev.type === 'entity_grief' || ev.type === 'grief')
    if (!grief || grief.id === lastGriefRef.current) return
    lastGriefRef.current = grief.id
    const grieverName = String((grief as any).griever ?? '')
    const entity = entitiesRef.current.find(e => e.name === grieverName)
    let cx = 350, cy = GND_Y
    if (entity) {
      const pos = posRef.current[entity.id]
      if (pos) { cx = (pos.x as any)._value; cy = (pos.y as any)._value }
    }
    const anim = new Animated.Value(0)
    const gid  = nextGriefId.current++
    setGriefs(prev => [...prev.slice(-3), { id: gid, x: cx, y: cy, anim }])
    Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true })
      .start(() => setGriefs(prev => prev.filter(g => g.id !== gid)))
  }, [liveEvents])

  // ── Encounter ripple ──────────────────────────────────────────────────────
  const [ripples, setRipples] = useState<Ripple[]>([])
  const lastEncounterRef = useRef(-1)
  const nextRippleId     = useRef(0)
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
      Animated.timing(posA.x, { toValue: midX - 14, duration: 2000, useNativeDriver: false }),
      Animated.timing(posA.y, { toValue: midY,      duration: 2000, useNativeDriver: false }),
      Animated.timing(posB.x, { toValue: midX + 4,  duration: 2000, useNativeDriver: false }),
      Animated.timing(posB.y, { toValue: midY,      duration: 2000, useNativeDriver: false }),
    ]).start(() => {
      const zA = entitiesRef.current.find(e => e.id === idA)?.current_zone ?? 'Garden'
      const zB = entitiesRef.current.find(e => e.id === idB)?.current_zone ?? 'Garden'
      Animated.parallel([
        Animated.timing(posA.x, { toValue: randomInRegion(zA).x, duration: 3500, useNativeDriver: false }),
        Animated.timing(posA.y, { toValue: randomInRegion(zA).y, duration: 3500, useNativeDriver: false }),
        Animated.timing(posB.x, { toValue: randomInRegion(zB).x, duration: 3500, useNativeDriver: false }),
        Animated.timing(posB.y, { toValue: randomInRegion(zB).y, duration: 3500, useNativeDriver: false }),
      ]).start()
    })
    const valA  = (enc as any).relationship_a_to_b ?? 'neutral'
    const rColor = valA === 'friend' ? '#34d399' : valA === 'rival' ? '#f87171' : valA === 'family' ? '#a78bfa' : '#94a3b8'

    // Relationship connection line
    const lineAnim = new Animated.Value(0)
    const lid = nextRelLineId.current++
    setRelLines(prev => [...prev.slice(-4), { id: lid, x1: axV, y1: ayV, x2: bxV, y2: byV, color: rColor, anim: lineAnim }])
    Animated.sequence([
      Animated.timing(lineAnim, { toValue: 1, duration: 400,  useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(lineAnim, { toValue: 0, duration: 700,  useNativeDriver: true }),
    ]).start(() => setRelLines(prev => prev.filter(l => l.id !== lid)))

    const makeRipple = (delay: number) => {
      const sa = new Animated.Value(0.05), oa = new Animated.Value(delay === 0 ? 0.85 : 0.5)
      const rid = nextRippleId.current++
      setRipples(prev => [...prev.slice(-6), { id: rid, x: midX, y: midY, scaleAnim: sa, opacityAnim: oa, color: rColor }])
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(sa, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(oa, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]).start(() => setRipples(prev => prev.filter(r => r.id !== rid)))
      }, delay)
    }
    makeRipple(0)
    makeRipple(280)
  }, [liveEvents])

  // ── Organic wandering — staggered per-entity, mostly local drift ────────
  const wanderTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  useEffect(() => {
    const doWander = (entityId: number) => {
      const entity = entitiesRef.current.find(e => e.id === entityId)
      const pos = posRef.current[entityId]
      if (!entity || !pos) return

      const energy = entity.energy ?? 50
      // Tired entities rest longer between moves
      const restMs = energy < 25
        ? 9000 + Math.random() * 7000   // exhausted: 9-16s rest
        : energy < 50
        ? 6000 + Math.random() * 4000   // tired: 6-10s rest
        : 4000 + Math.random() * 3000   // normal/energetic: 4-7s rest

      const isLocalDrift = Math.random() < 0.78
      let targetX: number, targetY: number

      if (isLocalDrift) {
        const cx = (pos.x as any)._value as number
        const cy = (pos.y as any)._value as number
        const r = REGION[entity.current_zone] ?? REGION.Garden
        const range = energy < 25 ? 10 : energy > 65 ? 28 : 18
        targetX = Math.max(r.x + 6, Math.min(r.x + r.w - 6, cx + (Math.random() - 0.5) * range * 2))
        targetY = Math.max(r.y + 4, Math.min(r.y + r.h - 4, cy + (Math.random() - 0.5) * range * 2))
      } else {
        // Full zone wander — leave a trail echo
        const cx = (pos.x as any)._value as number
        const cy = (pos.y as any)._value as number
        if (Math.random() < 0.45) {
          const tanim = new Animated.Value(1)
          const tid = nextTrailId.current++
          setTrailEchoes(prev => [...prev.slice(-18), { id: tid, x: cx, y: cy, color: '#94a3b8', anim: tanim }])
          Animated.timing(tanim, { toValue: 0, duration: 2200, useNativeDriver: true })
            .start(() => setTrailEchoes(prev => prev.filter(t => t.id !== tid)))
        }
        const p = randomInRegion(entity.current_zone)
        targetX = p.x; targetY = p.y
      }

      const moveDur = isLocalDrift
        ? 3200 + Math.random() * 1800   // local: 3.2-5s (slow, smooth)
        : 5500 + Math.random() * 2500   // zone:  5.5-8s (very smooth)

      Animated.parallel([
        Animated.timing(pos.x, { toValue: targetX, duration: moveDur, useNativeDriver: false }),
        Animated.timing(pos.y, { toValue: targetY, duration: moveDur, useNativeDriver: false }),
      ]).start()

      wanderTimers.current[entityId] = setTimeout(() => doWander(entityId), restMs)
    }

    // Stagger initial launch over 4 seconds so they don't all start together
    entitiesRef.current.forEach((entity, i) => {
      wanderTimers.current[entity.id] = setTimeout(
        () => doWander(entity.id),
        Math.random() * 4000
      )
    })

    return () => {
      Object.values(wanderTimers.current).forEach(t => clearTimeout(t))
      wanderTimers.current = {}
    }
  }, [])

  // ── Pan responder ─────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
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
            const newS = Math.min(3, Math.max(0.25, pinchScale0.current * dist / pinchDist0.current))
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
        lastOffset.current = { x: (translateX as any)._value, y: (translateY as any)._value }
        if (buildModeRef.current && Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12) {
          const sx = evt.nativeEvent.pageX - wrapPageOffset.current.x
          const sy = evt.nativeEvent.pageY - wrapPageOffset.current.y
          const s  = lastScale.current
          const tx = lastOffset.current.x
          const ty = lastOffset.current.y
          const cx = (sx - W / 2 - tx) / s + W / 2
          const cy = (sy - H / 2 - ty) / s + H / 2
          if (cx >= 0 && cx <= W && cy >= 0 && cy <= H) {
            setBuildings(prev => [...prev, { id: _nextBuildId++, type: selectedBuildRef.current, x: cx, y: cy }])
          }
        }
      },
    })
  ).current

  const zoom = (factor: number) => {
    const newS = Math.min(3, Math.max(0.25, lastScale.current * factor))
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

  const feedAll = () => {
    entities.forEach(e => feedEntity(e.id))
    setFedAllFlash(true)
    setTimeout(() => setFedAllFlash(false), 1800)
  }

  const goToZone = (zone: string) => {
    const r = REGION[zone] ?? REGION.Garden
    const targetX = -(r.x + r.w / 2 - W / 2) * INIT_SCALE + 20
    Animated.parallel([
      Animated.spring(scale,      { toValue: INIT_SCALE, useNativeDriver: false, friction: 7 }),
      Animated.spring(translateX, { toValue: targetX,    useNativeDriver: false, friction: 7 }),
      Animated.spring(translateY, { toValue: INIT_TY,    useNativeDriver: false, friction: 7 }),
    ]).start()
    lastScale.current  = INIT_SCALE
    lastOffset.current = { x: targetX, y: INIT_TY }
  }

  const latestEvent = liveEvents[0] ?? null
  const pulseGlowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.72] })
  const stormOpacity     = stormPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] })
  // Day/night derived opacities (90-second cycle: night → dawn → day → dusk → night)
  const dawnOpacity = dayNightAnim.interpolate({ inputRange: [0, 0.15, 0.28, 0.38, 1], outputRange: [0, 0.09, 0.06, 0, 0] })
  const dayOpacity  = dayNightAnim.interpolate({ inputRange: [0, 0.35, 0.52, 0.65, 1], outputRange: [0, 0, 0.04, 0, 0] })
  const duskOpacity = dayNightAnim.interpolate({ inputRange: [0, 0.65, 0.78, 0.90, 1], outputRange: [0, 0, 0.08, 0.04, 0] })

  const zoneCounts = ZONES.reduce((acc, z) => {
    acc[z] = entities.filter(e => e.current_zone === z).length
    return acc
  }, {} as Record<string, number>)

  const zoneEnergyMap = useMemo(() => {
    const map: Record<string, number> = {}
    ZONES.forEach(z => {
      const zEnts = entities.filter(e => e.current_zone === z)
      map[z] = zEnts.length > 0
        ? zEnts.reduce((s, e) => s + (e.energy ?? 50), 0) / zEnts.length
        : 50
    })
    return map
  }, [entities])

  const dominantZone = useMemo(() => {
    if (entities.length < 3) return null
    return ZONES.reduce<string | null>((best, z) => {
      if (best === null) return z
      return (zoneCounts[z] ?? 0) > (zoneCounts[best] ?? 0) ? z : best
    }, null)
  }, [entities, zoneCounts])

  const worldHealthColor = useMemo(() => {
    if (entities.length === 0) return '#475569'
    const avg = entities.reduce((s, e) => s + (e.energy ?? 50), 0) / entities.length
    return avg > 60 ? '#22c55e' : avg > 35 ? '#f59e0b' : '#ef4444'
  }, [entities])

  const worldStats = useMemo(() => {
    if (entities.length === 0) return null
    const oldest = entities.reduce((best, e) =>
      (e.age_ticks ?? 0) > (best.age_ticks ?? 0) ? e : best, entities[0])
    const mostConnected = entities.reduce((best, e) => {
      const c = Object.keys((e as any).relationships ?? {}).length
      const b = Object.keys((best as any).relationships ?? {}).length
      return c > b ? e : best
    }, entities[0])
    const totalBirths = (worldState as any).total_births ?? 0
    const totalDeaths = (worldState as any).total_deaths ?? 0
    return { oldest, mostConnected, totalBirths, totalDeaths }
  }, [entities, worldState])

  const currentEra = Math.floor(worldState.current_tick / 50) + 1
  const eraRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
  const eraLabel = `Era ${eraRoman[Math.min(currentEra - 1, 9)] ?? currentEra}`

  const prophecy = useMemo(() => {
    if (entities.length === 0) return 'El mundo duerme...'
    if (entities.length < 3) return 'El mundo agoniza...'
    const avgEnergy = entities.reduce((s, e) => s + (e.energy ?? 50), 0) / entities.length
    const maxGen = Math.max(...entities.map(e => e.generation ?? 0))
    const stormPct  = entities.filter(e => e.current_zone === 'Storm').length / entities.length
    const gardenPct = entities.filter(e => e.current_zone === 'Garden').length / entities.length
    if (maxGen >= 5) return `Una estirpe de ${maxGen} generaciones`
    if (stormPct > 0.5) return 'La Tormenta reclama almas'
    if (avgEnergy < 28) return 'El hambre acecha el mundo'
    if (gardenPct > 0.6) return 'El Jardín florece'
    if (entities.length >= 10) return 'La vida prospera'
    return 'El mundo respira'
  }, [entities])

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Uberis</Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSub}>{censusLabel}</Text>
            <View style={styles.sparklineWrap}>
              <Sparkline data={popHistory} color="#22d3ee" w={52} h={16} />
            </View>
          </View>
          <Text style={styles.prophecyText}>✦ {prophecy}</Text>
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

      {/* ── Away banner ── */}
      {awaySummary && (
        <View style={styles.awayBanner}>
          <View style={styles.awayBody}>
            <Text style={styles.awayTitle}>⏰ El mundo siguió sin ti</Text>
            <Text style={styles.awaySub}>
              {formatAway(awaySummary.msAway)} · {awaySummary.ticksSimulated} ticks ·{' '}
              {awaySummary.births > 0 ? `${awaySummary.births} nacimientos · ` : ''}
              {awaySummary.deaths > 0 ? `${awaySummary.deaths} muertes` : 'todos sobrevivieron'}
            </Text>
          </View>
          <Pressable onPress={dismissAwaySummary} style={styles.awayClose}>
            <Text style={styles.awayCloseTxt}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* ── World canvas ── */}
      <View
        ref={canvasWrapRef}
        style={styles.canvasWrap}
        onLayout={() => {
          canvasWrapRef.current?.measure(
            (_x: number, _y: number, _w: number, _h: number, px: number, py: number) => {
              wrapPageOffset.current = { x: px, y: py }
            }
          )
        }}
        {...panResponder.panHandlers}
      >
        <Animated.View style={[
          styles.canvas,
          { transform: [{ translateX }, { translateY }, { scale }] },
        ]}>
          {/* ══════════════ SVG WORLD ══════════════ */}
          <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%"   stopColor="#061520" /><Stop offset="18%"  stopColor="#0a2515" />
                <Stop offset="25%"  stopColor="#152e18" /><Stop offset="38%"  stopColor="#18120a" />
                <Stop offset="50%"  stopColor="#2a1505" /><Stop offset="62%"  stopColor="#0d0615" />
                <Stop offset="75%"  stopColor="#06021a" /><Stop offset="87%"  stopColor="#080205" />
                <Stop offset="100%" stopColor="#0c0308" />
              </LinearGradient>
              <LinearGradient id="skyVig" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#000000" stopOpacity="0.5" />
                <Stop offset="40%"  stopColor="#000000" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="gGarden"  x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#14532d" /><Stop offset="100%" stopColor="#052e16" />
              </LinearGradient>
              <LinearGradient id="gArchive" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#78350f" /><Stop offset="100%" stopColor="#451a03" />
              </LinearGradient>
              <LinearGradient id="gVoid"    x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#1e1b4b" /><Stop offset="100%" stopColor="#0d0b2a" />
              </LinearGradient>
              <LinearGradient id="gStorm"   x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#180a0a" /><Stop offset="100%" stopColor="#080404" />
              </LinearGradient>
              <LinearGradient id="mistGarden" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#1a4a28" stopOpacity="0" />
                <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.12" />
              </LinearGradient>
              <LinearGradient id="mistVoid" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#4c1d95" stopOpacity="0" />
                <Stop offset="100%" stopColor="#7c3aed" stopOpacity="0.15" />
              </LinearGradient>
            </Defs>

            <Rect x={0} y={0} width={W} height={H} fill="url(#sky)" />
            <Rect x={0} y={0} width={W} height={340} fill="url(#skyVig)" />
            {CONSTELLATION_PAIRS.map(([a, b], i) => {
              const sa = V_STARS_STATIC[a], sb = V_STARS_STATIC[b]
              if (!sa || !sb) return null
              return <SvgPath key={`cl${i}`} d={`M ${sa.cx} ${sa.cy} L ${sb.cx} ${sb.cy}`} stroke="#ddd6fe" strokeWidth={0.6} opacity={0.13} />
            })}
            {V_STARS_STATIC.map((s, i) => (
              <Circle key={`vs${i}`} cx={s.cx} cy={s.cy} r={s.r} fill="#ddd6fe" opacity={s.op} />
            ))}
            <Circle cx={490} cy={60} r={28} fill="#a78bfa" opacity={0.45} />
            <Circle cx={502} cy={54} r={24} fill="#030110" opacity={0.98} />
            <Circle cx={488} cy={65} r={4}  fill="#7c3aed" opacity={0.2} />
            <Circle cx={30}  cy={40} r={2}   fill="#fde68a" opacity={0.7} />
            <Circle cx={128} cy={28} r={1.5} fill="#fef9c3" opacity={0.65} />
            {([540,558,576,594,612,630,648,666,684,700] as number[]).map((cx, i) => (
              <G key={`sc${i}`}>
                <Circle cx={cx}   cy={35} r={20} fill="#0c0505" opacity={0.85} />
                <Circle cx={cx+8} cy={26} r={14} fill="#140808" opacity={0.8} />
              </G>
            ))}
            {([548,568,588,608,628,648,668,688] as number[]).map((cx, i) => (
              <Circle key={`sc2${i}`} cx={cx} cy={62} r={16} fill="#180a0a" opacity={0.75} />
            ))}
            <SvgPath d="M 560,70 L 552,108 L 565,104 L 555,148" stroke="#fbbf24" strokeWidth={3}   fill="none" opacity={0.9} />
            <SvgPath d="M 560,70 L 552,108 L 565,104 L 555,148" stroke="#fef9c3" strokeWidth={1.2} fill="none" opacity={0.65} />
            <SvgPath d="M 628,55 L 620,96 L 633,92 L 623,136" stroke="#f59e0b" strokeWidth={2.5} fill="none" opacity={0.8} />
            <SvgPath d="M 688,68 L 680,108 L 693,104 L 683,148" stroke="#fbbf24" strokeWidth={2.5} fill="none" opacity={0.75} />
            {S_RAIN.map(([rx, ry], i) => (
              <Rect key={`rain${i}`} x={rx} y={ry} width={1.5} height={10} fill="#fca5a5" opacity={0.22} rx={1} transform={`rotate(-16 ${rx} ${ry})`} />
            ))}
            <SvgPath
              d={`M 0,700 L 0,${BG_PEAKS[0][1]} ` + BG_PEAKS.map(([x,y]) => `L ${x},${y}`).join(' ') + ` L 700,700 Z`}
              fill="#1a2840" opacity={0.72}
            />
            {BG_PEAKS.filter(([,y]) => y < 275).map(([px,py], i) => (
              <Polygon key={`snow${i}`} points={`${px},${py} ${px-7},${py+12} ${px+7},${py+12}`} fill="#e2e8f0" opacity={0.55} />
            ))}
            {BG_PEAKS.filter(([,y]) => y < 255).map(([px,py], i) => (
              <Polygon key={`snowh${i}`} points={`${px},${py} ${px-3},${py+5} ${px+3},${py+5}`} fill="#ffffff" opacity={0.7} />
            ))}
            <SvgPath d="M 0,700 L 0,415 L 18,395 L 38,410 L 58,388 L 80,408 L 100,385 L 122,408 L 145,392 L 168,410 L 175,405 L 175,700 Z" fill="url(#gGarden)" opacity={0.95} />
            <SvgPath d="M 175,700 L 175,405 L 192,392 L 212,408 L 232,388 L 252,405 L 272,388 L 292,408 L 312,392 L 332,408 L 350,395 L 350,700 Z" fill="url(#gArchive)" opacity={0.95} />
            <SvgPath d="M 350,700 L 350,395 L 368,382 L 388,398 L 408,380 L 428,398 L 448,382 L 468,398 L 488,380 L 508,398 L 525,390 L 525,700 Z" fill="url(#gVoid)" opacity={0.95} />
            <SvgPath d="M 525,700 L 525,390 L 542,378 L 562,392 L 580,375 L 600,390 L 618,375 L 638,390 L 658,375 L 678,390 L 700,380 L 700,700 Z" fill="url(#gStorm)" opacity={0.95} />
            <G>
              <SvgPath d={G_RIVER_D} fill="none" stroke="#2563eb" strokeWidth={10} opacity={0.28} />
              <SvgPath d={G_RIVER_D} fill="none" stroke="#93c5fd" strokeWidth={5}  opacity={0.3} />
              <SvgPath d={G_RIVER_D} fill="none" stroke="#bfdbfe" strokeWidth={2}  opacity={0.2} />
              {G_TREES.map(([tx,ty], i) => (
                <G key={`gt${i}`} transform={`translate(${tx - 8},${ty - 20})`}>
                  <Rect x={5} y={16} width={5} height={14} fill="#713f12" opacity={0.75} rx={1} />
                  <Polygon points="8,0 -1,18 17,18" fill="#166534" opacity={0.8} />
                  <Polygon points="8,6 1,18 15,18" fill="#15803d" opacity={0.6} />
                </G>
              ))}
              {G_FLOWERS.map(({ cx, cy, fill }, i) => (
                <G key={`gf${i}`}>
                  <Circle cx={cx} cy={cy} r={3.5} fill={fill} opacity={0.75} />
                  <Circle cx={cx} cy={cy} r={1.5} fill="#fff" opacity={0.5} />
                </G>
              ))}
              <Ellipse cx={142} cy={455} rx={22} ry={10} fill="#1d4ed8" opacity={0.3} />
              <Ellipse cx={142} cy={455} rx={16} ry={7}  fill="#60a5fa" opacity={0.18} />
              <Rect x={0} y={420} width={175} height={280} fill="url(#mistGarden)" />
            </G>
            <G>
              <Rect x={178} y={455} width={168} height={20} fill="#1c1917" opacity={0.5} rx={2} />
              {A_COLS.map(([cx,cy], i) => (
                <G key={`ac${i}`}>
                  <Rect x={cx}   y={cy}    width={9}  height={58} fill="#92400e" opacity={0.6} rx={2} />
                  <Rect x={cx-2} y={cy-6}  width={13} height={7}  fill="#b45309" opacity={0.6} rx={2} />
                  <Rect x={cx-2} y={cy+58} width={13} height={5}  fill="#78350f" opacity={0.55} rx={1} />
                </G>
              ))}
              {A_RUIN_BLOCKS.map((b, i) => (
                <Rect key={`rb${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill="#57534e" opacity={0.6} rx={2} />
              ))}
              <SvgPath d="M 210,440 L 215,430 L 220,440 L 225,430" stroke="#f59e0b" strokeWidth={1.5} fill="none" opacity={0.4} />
              <Circle cx={255} cy={445} r={7} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.35} />
              <SvgPath d="M 252,445 L 258,445 M 255,442 L 255,448" stroke="#f59e0b" strokeWidth={1.5} opacity={0.35} />
            </G>
            <G>
              <Ellipse cx={388} cy={240} rx={45} ry={22} fill="#7c3aed" opacity={0.1} />
              <Ellipse cx={425} cy={268} rx={35} ry={16} fill="#6d28d9" opacity={0.09} />
              <Ellipse cx={438} cy={462} rx={55} ry={18} fill="#0d0b2a" opacity={0.9} />
              <Ellipse cx={438} cy={462} rx={42} ry={13} fill="#1e1b4b" opacity={0.6} />
              <Ellipse cx={438} cy={458} rx={28} ry={7}  fill="#4c1d95" opacity={0.35} />
              <Circle cx={425} cy={463} r={1}   fill="#c4b5fd" opacity={0.5} />
              <Circle cx={448} cy={460} r={1}   fill="#a78bfa" opacity={0.5} />
              <Polygon points="362,455 358,435 366,435" fill="#7c3aed" opacity={0.7} />
              <Polygon points="378,458 373,438 383,438" fill="#6d28d9" opacity={0.65} />
              <Polygon points="505,458 500,436 510,436" fill="#7c3aed" opacity={0.6} />
              <Polygon points="518,455 514,438 522,438" fill="#6d28d9" opacity={0.55} />
              <Rect x={350} y={418} width={175} height={282} fill="url(#mistVoid)" />
            </G>
            <G>
              <Ellipse cx={562} cy={468} rx={38} ry={12} fill="#1e3a5f" opacity={0.55} />
              <Ellipse cx={562} cy={468} rx={28} ry={8}  fill="#1d4ed8" opacity={0.22} />
              <Ellipse cx={638} cy={475} rx={30} ry={10} fill="#1e3a5f" opacity={0.48} />
              <Ellipse cx={688} cy={470} rx={20} ry={7}  fill="#1e3a5f" opacity={0.42} />
            </G>
            {ZONES.map((zone, i) => (
              <Rect key={zone} x={i * ZW + ZW/2 - 30} y={12} width={60} height={18} rx={9} fill={ZONE_COLOR[zone] + '15'} />
            ))}
            {buildings.map(b => {
              if (b.type === 'house') return <HouseShape key={b.id} x={b.x} y={b.y} />
              if (b.type === 'rock')  return <RockShape  key={b.id} x={b.x} y={b.y} />
              if (b.type === 'fire')  return <FireShape  key={b.id} x={b.x} y={b.y} />
              return <ExtraTreeShape key={b.id} x={b.x} y={b.y} />
            })}
          </Svg>

          {/* Zone energy halos */}
          {ZONES.map((zone, i) => {
            const avgE = zoneEnergyMap[zone] ?? 50
            const glowColor = avgE < 30 ? '#ef4444' : avgE < 55 ? '#f59e0b' : ZONE_COLOR[zone]
            const glowOp    = avgE < 30 ? 0.09 : avgE > 70 ? 0.06 : 0.03
            return (
              <View key={`zh${zone}`} pointerEvents="none" style={[styles.zoneHalo, {
                left: i * ZW, backgroundColor: glowColor, opacity: glowOp,
              }]} />
            )
          })}

          {/* Zone border light pillars */}
          {[ZW, ZW * 2, ZW * 3].map((x, i) => (
            <Animated.View key={`pillar${i}`} pointerEvents="none" style={[styles.zonePillar, {
              left: x - 2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.10] }),
            }]} />
          ))}

          {/* Zone labels */}
          {[
            { zone: 'Garden',  left: ZW * 0 + ZW/2 - 28, top: 16 },
            { zone: 'Archive', left: ZW * 1 + ZW/2 - 28, top: 16 },
            { zone: 'Void',    left: ZW * 2 + ZW/2 - 22, top: 16 },
            { zone: 'Storm',   left: ZW * 3 + ZW/2 - 30, top: 16 },
          ].map(({ zone, left, top }) => (
            <View key={zone} style={[styles.zoneLabel, { left, top }]}>
              <Text style={[styles.zoneName, { color: ZONE_COLOR[zone] }]}>
                {zone === dominantZone ? '⚜ ' : ''}{ZONE_NAME_ES[zone]}
              </Text>
            </View>
          ))}

          {/* Zone weather glyphs */}
          {([
            { zone: 'Garden',  left: ZW * 0 + 6, top: 35, glyph: '☀' },
            { zone: 'Archive', left: ZW * 1 + 6, top: 35, glyph: '⌛' },
            { zone: 'Void',    left: ZW * 2 + 6, top: 35, glyph: '∞' },
            { zone: 'Storm',   left: ZW * 3 + 6, top: 35, glyph: '⚡' },
          ] as { zone: string; left: number; top: number; glyph: string }[]).map(({ zone, left, top, glyph }) => (
            <Animated.View key={'wg' + zone} pointerEvents="none" style={{ position: 'absolute', left, top,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.52] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
            }}>
              <Text style={[styles.weatherGlyph, { color: ZONE_COLOR[zone] }]}>{glyph}</Text>
            </Animated.View>
          ))}

          {/* Twinkling stars */}
          {TWINKLE_STARS.map((star, i) => (
            <Animated.View key={`ts${i}`} style={[styles.twinkleStar, {
              left: star.cx - star.r, top: star.cy - star.r,
              width: star.r * 2, height: star.r * 2, borderRadius: star.r,
              opacity: twinkleAnims[i].interpolate({ inputRange: [0,1], outputRange: [0.15, 1] }),
            }]} />
          ))}

          {/* Fireflies */}
          {fireflies.map(ff => (
            <Animated.View key={ff.id} style={[styles.firefly, {
              left: ff.x, top: ff.baseY,
              opacity:   ff.anim.interpolate({ inputRange: [0,0.15,0.75,1], outputRange: [0,1,0.85,0] }),
              transform: [{ translateY: ff.anim.interpolate({ inputRange: [0,1], outputRange: [0,-38] }) }],
            }]} />
          ))}

          {/* Garden ground mist */}
          {MIST_STRIPS.map((strip, i) => (
            <Animated.View key={`mist${i}`} pointerEvents="none" style={[styles.mistStrip, {
              top: GND_Y + strip.offsetY,
              opacity: mistAnims[i].interpolate({
                inputRange: [0, 0.3, 0.6, 1],
                outputRange: [0.04, 0.13, 0.05, 0.04],
              }),
              transform: [{
                translateX: mistAnims[i].interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [-strip.tw, strip.tw * 0.6, -strip.tw * 0.3, strip.tw, -strip.tw],
                }),
              }],
            }]} />
          ))}

          {/* Garden bird silhouettes */}
          {birds.map(bird => (
            <Animated.View key={bird.id} pointerEvents="none" style={[styles.birdWrap, {
              top: bird.y,
              opacity: bird.anim.interpolate({ inputRange: [0, 0.08, 0.88, 1], outputRange: [0, 0.38, 0.3, 0] }),
              transform: [{ translateX: bird.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, ZW + 20] }) }],
            }]}>
              <Text style={styles.birdGlyph}>^ ^</Text>
            </Animated.View>
          ))}

          {/* Garden pollen */}
          {pollen.map(p => (
            <Animated.View key={p.id} style={[styles.pollen, {
              left: p.x, top: p.baseY,
              opacity: p.anim.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
              transform: [
                { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -32] }) },
                { translateX: p.anim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 5, 0, -5, 0] }) },
              ],
            }]} />
          ))}

          {/* Archive amber motes */}
          {motes.map(m => (
            <Animated.View key={m.id} style={[styles.mote, {
              left: m.x, top: m.baseY,
              opacity: m.anim.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.65, 0.4, 0] }),
              transform: [
                { translateY: m.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -55] }) },
                { translateX: m.anim.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, 7, -5, 2] }) },
              ],
            }]} />
          ))}

          {/* Storm cloud layer — dark masses drifting through the tempest */}
          {STORM_CLOUD_DATA.map((cloud, i) => (
            <Animated.View key={`sc${i}`} pointerEvents="none" style={[styles.stormCloud, {
              top: cloud.y, width: cloud.w, height: cloud.h, borderRadius: cloud.h / 2,
              opacity: stormCloudAnims[i].interpolate({
                inputRange: [0, 0.2, 0.5, 0.8, 1],
                outputRange: [0.5, 0.72, 0.55, 0.68, 0.5],
              }),
              transform: [{
                translateX: stormCloudAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-(cloud.w + 10), ZW + 10],
                }),
              }],
            }]} />
          ))}

          {/* Storm animated rain streams */}
          {RAIN_STREAMS.map((s, i) => (
            <Animated.View key={`rs${i}`} style={[styles.rainStream, {
              left: s.x, width: s.w, height: s.h, opacity: s.op,
              transform: [
                { translateY: rainAnims[i].interpolate({ inputRange: [0, 1], outputRange: [-15, H + 15] }) },
                { rotate: '-12deg' },
              ],
            }]} />
          ))}

          {/* Storm breathing pulse */}
          <Animated.View pointerEvents="none" style={[styles.stormPulse, { opacity: stormOpacity }]} />

          {/* Storm lightning flash */}
          <Animated.View pointerEvents="none" style={[styles.lightningFlash, {
            opacity: lightningAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.30] }),
          }]} />

          {/* Void shooting stars */}
          {shootingStars.map(star => (
            <Animated.View key={star.id} style={[styles.shootingStar, {
              left: star.x, top: star.y,
              opacity: star.anim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 0.9, 0.6, 0] }),
              transform: [
                { translateX: star.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 62] }) },
                { translateY: star.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) },
                { rotate: '24deg' },
              ],
            }]} />
          ))}

          {/* Void nebula wisps */}
          {nebWisps.map(w => (
            <Animated.View key={w.id} pointerEvents="none" style={[styles.nebWisp, {
              left: w.x, top: w.y,
              width: w.len,
              backgroundColor: w.color,
              shadowColor: w.color,
              opacity: w.anim.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 0.28, 0.14, 0],
              }),
              transform: [
                { rotate: `${w.angle}deg` },
                { translateX: w.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 38] }) },
                { translateY: w.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
              ],
            }]} />
          ))}

          {/* Void aurora bands */}
          {AURORA_BANDS.map((band, i) => (
            <Animated.View key={`aurora${i}`} pointerEvents="none" style={[styles.auroraBand, {
              top: band.y, backgroundColor: band.color,
              opacity: auroraAnims[i].interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0.04, 0.22, 0.07, 0.20, 0.04],
              }),
              transform: [{
                translateX: auroraAnims[i].interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [-20, 12, -6, 16, -20],
                }),
              }],
            }]} />
          ))}

          {/* Void vortex rings */}
          <Animated.View pointerEvents="none" style={[styles.vortexOuter, {
            transform: [{ rotate: vortexAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] }) }],
          }]} />
          <Animated.View pointerEvents="none" style={[styles.vortexInner, {
            transform: [{ rotate: vortexAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','-540deg'] }) }],
          }]} />
          <Animated.View pointerEvents="none" style={[styles.portalBurst, {
            opacity: portalBurstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
            transform: [{ scale: portalBurstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
          }]} />

          {/* Archive shimmer */}
          <Animated.View pointerEvents="none" style={[styles.archiveShimmer, {
            opacity: archiveShimmer.interpolate({ inputRange: [0, 1], outputRange: [0, 0.07] }),
          }]} />

          {/* Ripples */}
          {ripples.map(r => (
            <Animated.View key={r.id} style={[styles.ripple, {
              left: r.x - 44, top: r.y - 44,
              borderColor: r.color,
              opacity: r.opacityAnim,
              transform: [{ scale: r.scaleAnim }],
            }]} />
          ))}

          {/* Encounter relationship lines */}
          {relLines.map(line => {
            const dx  = line.x2 - line.x1
            const dy  = line.y2 - line.y1
            const len = Math.sqrt(dx * dx + dy * dy)
            const ang = Math.atan2(dy, dx) * (180 / Math.PI)
            const mx  = (line.x1 + line.x2) / 2
            const my  = (line.y1 + line.y2) / 2
            return (
              <Animated.View key={line.id} style={[styles.relLine, {
                left: mx - len / 2, top: my - 1.5, width: len,
                backgroundColor: line.color,
                shadowColor: line.color,
                opacity: line.anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.7, 0.45, 0] }),
                transform: [{ rotate: `${ang}deg` }],
              }]} />
            )
          })}

          {/* Proximity bond hearts */}
          {bondHearts.map(h => (
            <Animated.View key={h.key} pointerEvents="none" style={{
              position: 'absolute', left: h.x - 8, top: h.y,
              opacity: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }),
              transform: [{ scale: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }}>
              <Text style={{ fontSize: 12, color: h.color }}>♥</Text>
            </Animated.View>
          ))}

          {/* Social web — ambient relationship lines */}
          {socialLines.map(line => {
            const dx  = line.x2 - line.x1
            const dy  = line.y2 - line.y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < 4) return null
            const ang = Math.atan2(dy, dx) * (180 / Math.PI)
            const mx  = (line.x1 + line.x2) / 2
            const my  = (line.y1 + line.y2) / 2
            return (
              <View key={line.key} style={[styles.socialLine, {
                left: mx - len / 2, top: my - 1, width: len,
                backgroundColor: line.color,
                transform: [{ rotate: `${ang}deg` }],
              }]} />
            )
          })}

          {/* Selection web — lines from selected entity to its relationship partners */}
          {popup && (() => {
            const posA = posRef.current[popup.id]
            if (!posA) return null
            const ax = (posA.x as any)._value as number
            const ay = (posA.y as any)._value as number
            const rels = (popup as any).relationships ?? {}
            return Object.entries(rels).map(([name, rel]) => {
              const target = entities.find(e => e.name === name)
              if (!target) return null
              const posB = posRef.current[target.id]
              if (!posB) return null
              const bx = (posB.x as any)._value as number
              const by = (posB.y as any)._value as number
              const dx = bx - ax, dy = by - ay
              const len = Math.sqrt(dx * dx + dy * dy)
              if (len < 4) return null
              const ang = Math.atan2(dy, dx) * (180 / Math.PI)
              const mx = (ax + bx) / 2, my = (ay + by) / 2
              const valence = (rel as any).valence ?? 'neutral'
              const color = valence === 'friend' ? '#34d399' : valence === 'family' ? '#a78bfa' : '#f87171'
              return (
                <View key={`sel-${name}`} style={[styles.selectionLine, {
                  left: mx - len / 2, top: my - 2, width: len,
                  backgroundColor: color,
                  shadowColor: color,
                  transform: [{ rotate: `${ang}deg` }],
                }]} />
              )
            })
          })()}

          {/* Entity trail echoes */}
          {trailEchoes.map(t => (
            <Animated.View key={t.id} pointerEvents="none" style={[styles.trailEcho, {
              left: t.x - 5, top: t.y - 5,
              opacity: t.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.28] }),
              transform: [{ scale: t.anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }]} />
          ))}

          {/* Entities */}
          {entities.map(entity => {
            const pos = posRef.current[entity.id]
            if (!pos) return null
            const color    = emotionColor(entity.emotional_state?.emotion)
            const sz       = NODE + Math.min(entity.generation * 2 + (entity.age_ticks ?? 0) * 0.06, 12)
            const szH      = sz / 2
            const selected = popup?.id === entity.id
            const energy   = Math.min(100, Math.max(0, Math.round(entity.energy ?? 50)))
            return (
              <Animated.View key={entity.id} style={[styles.entityWrap, { left: pos.x, top: pos.y }]}>
                <Pressable onPress={() => setPopup(p => p?.id === entity.id ? null : entity)} style={styles.entityInner}>
                  <Animated.View pointerEvents="none" style={[styles.moodRing, {
                    width: sz + 12, height: sz + 12, borderRadius: (sz + 12) / 2,
                    top: -szH - 6, left: -szH - 6,
                    borderColor: color + '88',
                    transform: [{
                      rotate: moodRingSpin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg',
                          entity.emotional_state?.emotion === 'joy' || entity.emotional_state?.emotion === 'excited'
                            ? '720deg'
                            : entity.emotional_state?.emotion === 'fearful' || entity.emotional_state?.emotion === 'anxious'
                            ? '-360deg'
                            : '180deg'],
                      }),
                    }],
                    opacity: energy > 25 ? 0.35 : 0.15,
                  }]} />
                  {((entity.age_ticks ?? 0) >= 50 || entity.generation >= 5) && (
                    <Animated.View style={[styles.elderRing, {
                      width: sz + 26, height: sz + 26, borderRadius: (sz + 26) / 2,
                      top: -szH - 13, left: -szH - 13,
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }),
                    }]} />
                  )}
                  {selected && (
                    <View style={[styles.entitySelect, {
                      width: sz + 20, height: sz + 20, borderRadius: (sz + 20) / 2,
                      top: -szH - 10, left: -szH - 10, borderColor: color,
                    }]} />
                  )}
                  <Animated.View style={[styles.entityGlow, {
                    width: sz + 16, height: sz + 16, borderRadius: (sz + 16) / 2,
                    top: -szH - 8, left: -szH - 8,
                    borderColor: energy > 60 ? color + '55' : energy > 30 ? '#a0aec066' : '#4a556855',
                    borderWidth: energy > 70 ? 2 : energy > 40 ? 1 : 0.5,
                    shadowColor: energy > 60 ? color : energy > 30 ? '#a0aec0' : '#4a5568',
                    opacity: pulseGlowOpacity,
                    transform: [{ scale: energy > 70 ? 1.1 : energy < 30 ? 0.85 : 1 }],
                  }]} />
                  <Animated.View style={[styles.entityCore, {
                    width: sz, height: sz, borderRadius: szH,
                    backgroundColor: blendToGold(color, entity.generation),
                    shadowColor: blendToGold(color, entity.generation),
                    transform: energy < 30 ? [{ translateX: idleSway.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, 2] }) }] : [],
                  }]} />
                  <Text style={[styles.entityLabel, { color }]} numberOfLines={1}>{entity.name}</Text>
                  {entity.generation >= 3 && (
                    <Text style={[styles.genBadge, { color: entity.generation >= 5 ? '#fbbf24' : '#a78bfa' }]}>
                      G{entity.generation}
                    </Text>
                  )}
                  {energy < 35 && (
                    <Animated.View style={[styles.hungerDot, {
                      opacity: hungerPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }),
                      transform: [{ scale: hungerPulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
                    }]} />
                  )}
                  <View style={styles.energyTrack}>
                    <View style={[styles.energyFill, {
                      width: `${energy}%` as any,
                      backgroundColor: energy > 60 ? color : energy > 30 ? '#f59e0b' : '#ef4444',
                    }]} />
                  </View>
                </Pressable>
              </Animated.View>
            )
          })}

          {/* Birth sparks */}
          {sparks.map(spark => (
            <Animated.View key={spark.id} style={[styles.spark, {
              left: spark.x - 3, top: spark.y - 3,
              backgroundColor: spark.color,
              opacity:   spark.anim.interpolate({ inputRange: [0,0.15,0.65,1], outputRange: [0,1,0.9,0] }),
              transform: [
                { translateX: spark.anim.interpolate({ inputRange: [0,1], outputRange: [0, spark.dx] }) },
                { translateY: spark.anim.interpolate({ inputRange: [0,1], outputRange: [0, spark.dy] }) },
                { scale:      spark.anim.interpolate({ inputRange: [0,0.3,1], outputRange: [0.3,1.2,0.5] }) },
              ],
            }]} />
          ))}

          {/* Birth location stamps */}
          {birthStamps.map(s => (
            <Animated.View key={s.id} pointerEvents="none" style={{
              position: 'absolute', left: s.x - 10, top: s.y - 14,
              opacity: s.anim,
            }}>
              <Text style={[styles.birthStampGlyph, { color: s.color }]}>✦</Text>
            </Animated.View>
          ))}

          {/* Death soul departure */}
          {souls.map(soul => (
            <Animated.View key={soul.id} style={[styles.soul, {
              left: soul.x - 2.5, top: soul.y - 2.5,
              backgroundColor: soul.color,
              opacity:   soul.anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
              transform: [
                { translateX: soul.anim.interpolate({ inputRange: [0, 1], outputRange: [0, soul.dx] }) },
                { translateY: soul.anim.interpolate({ inputRange: [0, 1], outputRange: [0, soul.dy] }) },
                { scale:      soul.anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1, 0.4] }) },
              ],
            }]} />
          ))}

          {/* Death location markers */}
          {deathMarks.map(d => (
            <Animated.View key={d.id} pointerEvents="none" style={{
              position: 'absolute', left: d.x - 6, top: d.y - 6,
              opacity: d.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
            }}>
              <Text style={styles.deathMarkGlyph}>·</Text>
            </Animated.View>
          ))}

          {/* Grief floating hearts */}
          {griefs.map(g => (
            <Animated.View key={g.id} style={[styles.griefMark, {
              left: g.x - 10, top: g.y - 30,
              opacity:   g.anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.65, 0] }),
              transform: [{ translateY: g.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -52] }) }],
            }]}>
              <Text style={styles.griefEmoji}>💔</Text>
            </Animated.View>
          ))}

          {/* Desire whispers */}
          {desireWisps.map(d => (
            <Animated.View key={d.id} pointerEvents="none" style={[styles.desireWisp, {
              left: d.x - 50, top: d.y - 46,
              opacity: d.anim.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 0.75, 0.45, 0] }),
              transform: [{ translateY: d.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -42] }) }],
            }]}>
              <Text style={styles.desireWispTxt} numberOfLines={2}>{d.text}</Text>
            </Animated.View>
          ))}

          {/* Dream ZZZ for low-energy entities */}
          {sleepMarks.map(s => (
            <Animated.View key={s.id} style={[styles.sleepMark, {
              left: s.x + 10, top: s.y - 32,
              opacity: s.anim.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 0.85, 0.6, 0] }),
              transform: [{ translateY: s.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }],
            }]}>
              <Text style={styles.sleepEmoji}>💤</Text>
            </Animated.View>
          ))}

          {/* Thought bubbles */}
          {bubbles.map(bubble => (
            <Animated.View key={bubble.id} style={[styles.thoughtBubble, {
              left: bubble.x - 55, top: bubble.y - 72,
              borderColor: bubble.color + '66',
              opacity: bubble.anim,
            }]}>
              <Text style={[styles.thoughtBubbleTxt, { color: bubble.color + 'dd' }]} numberOfLines={3}>
                {bubble.text}
              </Text>
              <View style={[styles.thoughtNotch, { borderTopColor: bubble.color + '66' }]} />
            </Animated.View>
          ))}

          {buildMode && (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.buildOverlay]}>
              <Text style={styles.buildHint}>
                Toca el mapa · {BUILD_EMOJI[selectedBuild]} {BUILD_LABEL[selectedBuild]}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── World health aura border ── */}
        <View pointerEvents="none" style={[styles.healthAura, {
          borderColor: worldHealthColor,
          shadowColor: worldHealthColor,
        }]} />

        {/* ── Zone minimap (outside canvas transform) ── */}
        <View style={styles.minimap}>
          {ZONES.map(zone => {
            const count = zoneCounts[zone] ?? 0
            const pct   = entities.length > 0 ? count / entities.length : 0
            const barH  = Math.max(2, Math.round(pct * 20))
            return (
              <Pressable key={zone} style={styles.minimapZone} onPress={() => goToZone(zone)}>
                <View style={[styles.minimapBar, { height: barH, backgroundColor: ZONE_COLOR[zone] }]} />
                <Text style={[styles.minimapCount, { color: ZONE_COLOR[zone] }]}>{count}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* ── Build toolbar ── */}
      {buildMode && (
        <View style={styles.buildToolbar}>
          {(['house', 'rock', 'fire', 'tree'] as BuildType[]).map(type => (
            <Pressable key={type} onPress={() => setSelectedBuild(type)}
              style={[styles.buildTypeBtn, selectedBuild === type && styles.buildTypeBtnActive]}>
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

      {/* ── Live ticker ── */}
      {latestEvent && !popup && !worldEventText && (
        <View style={styles.ticker}>
          <Text style={styles.tickerText} numberOfLines={1}>
            {latestEvent.type === 'encounter'
              ? `⚡ ${(latestEvent.entity_a as any)?.name} & ${(latestEvent.entity_b as any)?.name}`
              : latestEvent.type === 'entity_born' || latestEvent.type === 'birth'
              ? `✨ ${latestEvent.name} nació`
              : latestEvent.type === 'entity_died' || latestEvent.type === 'death'
              ? `🌑 ${latestEvent.name} partió`
              : latestEvent.type === 'entity_thought' || latestEvent.type === 'thought'
              ? `💭 ${latestEvent.name}: ${String(latestEvent.thought ?? '').slice(0, 55)}`
              : latestEvent.type === 'entity_grief' || latestEvent.type === 'grief'
              ? `💔 ${latestEvent.griever} llora a ${latestEvent.lost}`
              : String(latestEvent.description ?? latestEvent.type).slice(0, 70)
            }
          </Text>
        </View>
      )}

      {/* ── Entity popup ── */}
      {popup && (
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <View style={[styles.popupDot, { backgroundColor: emotionColor(popup.emotional_state?.emotion) }]} />
            <Text style={styles.popupName}>{popup.name}</Text>
            <Text style={styles.popupEmotion}>{popup.emotional_state?.emotion ?? '—'}</Text>
            <Pressable onPress={() => setPopup(null)} style={styles.popupClose}>
              <Text style={styles.popupCloseTxt}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.popupMeta}>
            ⚡ {Math.round(popup.energy ?? 0)} · Gen {popup.generation} · Edad {popup.age_ticks} · {ZONE_NAME_ES[popup.current_zone] ?? popup.current_zone}
          </Text>
          {(popup as any).current_goal && (
            <Text style={styles.popupGoal} numberOfLines={1}>🎯 {(popup as any).current_goal}</Text>
          )}
          {!!popup.last_thought && (
            <Text style={styles.popupThought} numberOfLines={3}>"{popup.last_thought}"</Text>
          )}
          {!!popup.current_desire && (
            <Text style={styles.popupDesire} numberOfLines={1}>Desea: {popup.current_desire}</Text>
          )}
          {(() => {
            const rels = (popup as any).relationships ?? {}
            const count = Object.keys(rels).length
            if (count === 0) return null
            const friends = Object.values(rels).filter((r: any) => r.valence === 'friend').length
            const family  = Object.values(rels).filter((r: any) => r.valence === 'family').length
            const rivals  = Object.values(rels).filter((r: any) => r.valence === 'rival').length
            return (
              <View style={styles.popupRels}>
                {family  > 0 && <Text style={styles.popupRelItem}>💜 {family}</Text>}
                {friends > 0 && <Text style={styles.popupRelItem}>💚 {friends}</Text>}
                {rivals  > 0 && <Text style={styles.popupRelItem}>⚔️ {rivals}</Text>}
              </View>
            )
          })()}
          <View style={styles.popupActions}>
            <Pressable style={styles.popupBtnFeed} onPress={() => { feedEntity(popup.id); setPopup(null) }}>
              <Text style={styles.popupBtnTxt}>🍎 Alimentar</Text>
            </Pressable>
            <Pressable style={styles.popupBtnDetail} onPress={() => { setPopup(null); router.push(`/entity/${popup.id}`) }}>
              <Text style={styles.popupBtnTxt}>Ver más →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── World event cinematic ── */}
      {worldEventText && (
        <Animated.View style={[styles.worldEventOverlay, { opacity: overlayAnim }]} pointerEvents="none">
          <Text style={styles.worldEventIcon}>🌍</Text>
          <Text style={styles.worldEventTitle}>Evento del mundo</Text>
          <Text style={styles.worldEventText}>{worldEventText}</Text>
        </Animated.View>
      )}

      {/* ── World stats panel ── */}
      {showStats && worldStats && (
        <View style={styles.statsPanel}>
          <View style={styles.statsPanelHeader}>
            <Text style={styles.statsPanelTitle}>📊 Estado del Mundo</Text>
            <Pressable onPress={() => setShowStats(false)} style={styles.statsClose}>
              <Text style={styles.statsCloseTxt}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Tick</Text>
            <Text style={styles.statsVal}>{worldState.current_tick}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Vivos</Text>
            <Text style={styles.statsVal}>{entities.length}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Más anciano</Text>
            <Text style={styles.statsVal} numberOfLines={1}>
              {worldStats.oldest.name} · {worldStats.oldest.age_ticks ?? 0}t
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Más conectado</Text>
            <Text style={styles.statsVal} numberOfLines={1}>
              {worldStats.mostConnected.name} · {Object.keys((worldStats.mostConnected as any).relationships ?? {}).length} rel
            </Text>
          </View>
          {worldStats.totalBirths > 0 && (
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Nacimientos</Text>
              <Text style={styles.statsVal}>{worldStats.totalBirths}</Text>
            </View>
          )}
          {worldStats.totalDeaths > 0 && (
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Muertes</Text>
              <Text style={styles.statsVal}>{worldStats.totalDeaths}</Text>
            </View>
          )}
          {dominantZone && (
            <View style={[styles.statsRow, { marginTop: 4 }]}>
              <Text style={styles.statsLabel}>Zona dominante</Text>
              <Text style={[styles.statsVal, { color: ZONE_COLOR[dominantZone] }]}>
                ⚜ {ZONE_NAME_ES[dominantZone]}
              </Text>
            </View>
          )}
          <Text style={[styles.prophecyText, { marginTop: 8, opacity: 0.7 }]}>✦ {prophecy}</Text>
          {eventHistory.length > 0 && (
            <View style={styles.eventHistoryList}>
              {eventHistory.slice().reverse().map((ev, i) => (
                <Text key={i} style={styles.eventHistoryItem} numberOfLines={1}>
                  {ev.icon} {ev.text}
                  <Text style={styles.eventHistoryTick}> t{ev.tick}</Text>
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Day/night atmospheric overlays ── */}
      <Animated.View pointerEvents="none" style={[styles.dawnOverlay, { opacity: dawnOpacity }]} />
      <Animated.View pointerEvents="none" style={[styles.dayOverlay,  { opacity: dayOpacity  }]} />
      <Animated.View pointerEvents="none" style={[styles.duskOverlay, { opacity: duskOpacity }]} />

      {/* ── Controls ── */}
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
        <Pressable onPress={() => setBuildMode(!buildMode)}
          style={[styles.zoomBtn, buildMode && styles.zoomBtnActive]}>
          <Text style={styles.zoomTxt}>🏗</Text>
        </Pressable>
        <Pressable onPress={() => setShowStats(s => !s)}
          style={[styles.zoomBtn, showStats && styles.zoomBtnActive]}>
          <Text style={[styles.zoomTxt, { fontSize: 16 }]}>📊</Text>
        </Pressable>
        <Pressable onPress={feedAll} style={styles.zoomBtn}>
          <Text style={[styles.zoomTxt, { fontSize: 16 }]}>🍎</Text>
        </Pressable>
      </View>

      {fedAllFlash && (
        <View style={styles.fedAllToast}>
          <Text style={styles.fedAllToastTxt}>🍎 Todos alimentados</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft:   { flex: 1 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: '#22d3ee', letterSpacing: 0.5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 1 },
  headerSub:    { fontSize: 11, color: COLORS.textMuted },
  sparklineWrap:{ opacity: 0.9 },
  prophecyText: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 3, opacity: 0.8 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotLive:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  thinkingBadge: { backgroundColor: '#0e7490', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  thinkingTxt:   { fontSize: 10, fontWeight: '700', color: '#22d3ee' },
  apiBadge:     { backgroundColor: '#052e16', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#166534' },
  apiTxt:       { fontSize: 10, fontWeight: '600', color: '#22c55e' },
  apiBadgeOff:  { backgroundColor: '#1c1917', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  apiTxtOff:    { fontSize: 10, color: COLORS.textDim },

  canvasWrap: { flex: 1, overflow: 'hidden' },
  canvas:     { width: W, height: H, position: 'absolute', top: 0, left: 0 },
  healthAura: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2.5, opacity: 0.45,
    shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },

  zoneLabel: { position: 'absolute' },
  zoneName: {
    fontSize: 12, fontWeight: '800', letterSpacing: 0.5,
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },

  minimap: {
    position: 'absolute', bottom: 10, left: 12,
    flexDirection: 'row', gap: 4,
    backgroundColor: '#020b18cc', borderRadius: 8, padding: 6,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'flex-end',
  },
  minimapZone:  { alignItems: 'center', width: 28, gap: 2 },
  minimapBar:   { width: 20, borderRadius: 2, minHeight: 2 },
  minimapCount: { fontSize: 8, fontWeight: '700' },

  twinkleStar:  { position: 'absolute', backgroundColor: '#ddd6fe' },
  firefly: {
    position: 'absolute', width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#86efac',
    shadowColor: '#22c55e', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  rainStream: {
    position: 'absolute',
    backgroundColor: '#bfdbfe',
    borderRadius: 1,
  },
  stormPulse: {
    position: 'absolute',
    left: ZW * 3, top: 0, width: ZW, height: H,
    backgroundColor: '#2d0505',
  },
  ripple: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2 },
  spark: {
    position: 'absolute', width: 6, height: 6, borderRadius: 3,
    shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  soul: {
    position: 'absolute', width: 5, height: 5, borderRadius: 2.5,
    shadowColor: '#cbd5e1', shadowOpacity: 0.6, shadowRadius: 3, shadowOffset: { width: 0, height: 0 },
  },
  pollen: {
    position: 'absolute', width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: '#fde68a',
    shadowColor: '#fbbf24', shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 },
  },
  relLine: {
    position: 'absolute', height: 3, borderRadius: 1.5,
    shadowOpacity: 0.7, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  },
  socialLine: { position: 'absolute', height: 2, borderRadius: 1 },
  auroraBand: { position: 'absolute', left: ZW * 2, width: ZW + 6, height: 8, borderRadius: 4 },
  mistStrip:  { position: 'absolute', left: -10, width: ZW + 20, height: 14, borderRadius: 7, backgroundColor: '#86efac' },
  stormCloud: { position: 'absolute', left: ZW * 3, backgroundColor: '#080404' },
  zoneHalo:   { position: 'absolute', top: 0, width: ZW, height: H },
  zonePillar: { position: 'absolute', top: 0, width: 4, height: H, backgroundColor: '#ddd6fe' },
  hungerDot:  {
    position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ef4444',
    top: -22, left: -2.5,
    shadowColor: '#ef4444', shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  },
  birdWrap:   { position: 'absolute', left: 0 },
  birdGlyph:  { fontSize: 6, color: '#64748b', letterSpacing: 3, fontWeight: '300' },
  mote: {
    position: 'absolute', width: 2.5, height: 2.5, borderRadius: 1.5,
    backgroundColor: '#fbbf24',
    shadowColor: '#f59e0b', shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 },
  },
  selectionLine: {
    position: 'absolute', height: 4, borderRadius: 2,
    shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  griefMark:  { position: 'absolute' },
  griefEmoji: { fontSize: 14 },
  sleepMark:  { position: 'absolute' },
  sleepEmoji: { fontSize: 12 },
  vortexOuter: {
    position: 'absolute',
    left: 438 - 32, top: 462 - 24,
    width: 64, height: 48, borderRadius: 32,
    borderWidth: 1.5, borderColor: '#7c3aed',
    opacity: 0.38,
  },
  vortexInner: {
    position: 'absolute',
    left: 438 - 18, top: 462 - 13,
    width: 36, height: 26, borderRadius: 18,
    borderWidth: 1, borderColor: '#4c1d95',
    opacity: 0.55,
  },
  archiveShimmer: {
    position: 'absolute',
    left: ZW, top: 0, width: ZW, height: H,
    backgroundColor: '#f59e0b',
  },
  lightningFlash: {
    position: 'absolute', left: ZW * 3, top: 0, width: ZW, height: H,
    backgroundColor: '#ffffff',
  },
  shootingStar: {
    position: 'absolute', width: 55, height: 2, borderRadius: 1,
    backgroundColor: '#ddd6fe',
    shadowColor: '#a78bfa', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  genBadge: {
    fontSize: 7, fontWeight: '800', marginTop: 1, letterSpacing: 0.3,
    textShadowColor: '#000', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 },
  },
  dawnOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#c084fc' },
  dayOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#60a5fa' },
  duskOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f97316' },

  entityWrap:   { position: 'absolute', alignItems: 'center' },
  entityInner:  { alignItems: 'center' },
  moodRing: {
    position: 'absolute', borderWidth: 1, borderStyle: 'dashed',
  },
  birthStampGlyph: {
    fontSize: 16, fontWeight: '300',
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
  deathMarkGlyph: {
    fontSize: 22, color: '#475569', fontWeight: '700',
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 0 },
  },
  eventHistoryList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 6 },
  eventHistoryItem: { fontSize: 9, color: '#94a3b8', marginBottom: 3, fontStyle: 'italic' },
  eventHistoryTick: { fontSize: 8, color: '#475569' },
  elderRing: {
    position: 'absolute', borderWidth: 1.5, borderColor: '#fbbf24', borderStyle: 'dashed',
    shadowColor: '#fbbf24', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  entitySelect: { position: 'absolute', borderWidth: 2, borderStyle: 'dashed' },
  entityGlow:   { position: 'absolute', borderWidth: 1, shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  entityCore:   { shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  entityLabel:  {
    marginTop: 5, fontSize: 9, fontWeight: '600', maxWidth: 58, textAlign: 'center',
    textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
  },
  energyTrack: { width: 22, height: 2, backgroundColor: '#1e293b', borderRadius: 1, marginTop: 2, overflow: 'hidden' },
  energyFill:  { height: 2, borderRadius: 1, opacity: 0.7 },

  thoughtBubble: {
    position: 'absolute', maxWidth: 110, backgroundColor: '#020b18e8',
    borderRadius: 8, borderWidth: 1, padding: 5, paddingHorizontal: 7,
  },
  thoughtBubbleTxt: { fontSize: 8, fontStyle: 'italic', lineHeight: 11 },
  thoughtNotch: {
    position: 'absolute', bottom: -5, left: '50%', marginLeft: -4,
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  worldEventOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#010812e8',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  worldEventIcon:  { fontSize: 42, marginBottom: 12 },
  worldEventTitle: { fontSize: 11, fontWeight: '700', color: '#fde68a', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, opacity: 0.7 },
  worldEventText:  { fontSize: 16, color: COLORS.text, textAlign: 'center', lineHeight: 24, fontStyle: 'italic' },

  buildOverlay: { justifyContent: 'flex-end', paddingBottom: 12, alignItems: 'center' },
  buildHint: {
    fontSize: 11, color: '#22d3ee',
    backgroundColor: '#020b18cc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  buildToolbar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  buildTypeBtn:       { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  buildTypeBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  buildTypeEmoji:     { fontSize: 18 },
  buildTypeLabel:     { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  ticker: {
    position: 'absolute', bottom: 88, left: 12, right: 66,
    backgroundColor: '#020b18d8', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tickerText: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },

  popup: {
    position: 'absolute', bottom: 82, left: 12, right: 12,
    backgroundColor: '#020b18f5', borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  popupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  popupDot:     { width: 10, height: 10, borderRadius: 5 },
  popupName:    { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  popupEmotion: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  popupClose:   { padding: 4 },
  popupCloseTxt:{ fontSize: 14, color: COLORS.textDim },
  popupMeta:    { fontSize: 10, color: COLORS.textDim, marginBottom: 5 },
  popupGoal:    { fontSize: 11, color: '#34d399', marginBottom: 4 },
  popupThought: { fontSize: 12, color: COLORS.text, fontStyle: 'italic', marginBottom: 4, lineHeight: 17 },
  popupDesire:  { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  popupRels:    { flexDirection: 'row', gap: 10, marginBottom: 10 },
  popupRelItem: { fontSize: 12, color: COLORS.textMuted },
  popupActions: { flexDirection: 'row', gap: 8 },
  popupBtnFeed: { flex: 1, backgroundColor: '#052e16', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#166534' },
  popupBtnDetail:{ flex: 1, backgroundColor: '#0c1a2e', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  popupBtnTxt:  { fontSize: 12, fontWeight: '700', color: COLORS.text },

  zoomCtrl: { position: 'absolute', bottom: 24, right: 14, gap: 8 },
  zoomBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.bgCard + 'ee', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnActive: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  zoomTxt: { fontSize: 20, color: COLORS.text, fontWeight: '300', lineHeight: 26 },

  awayBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0c1a2e', borderBottomWidth: 1, borderBottomColor: '#1d4ed8',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  awayBody:    { flex: 1 },
  awayTitle:   { fontSize: 12, fontWeight: '700', color: '#60a5fa' },
  awaySub:     { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  awayClose:   { paddingLeft: 12 },
  awayCloseTxt: { fontSize: 14, color: COLORS.textDim },

  nebWisp: {
    position: 'absolute', height: 3, borderRadius: 1.5,
    shadowOpacity: 0.6, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
  },
  statsPanel: {
    position: 'absolute', top: 80, right: 12,
    width: 205, backgroundColor: '#020b18f2',
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 12,
  },
  statsPanelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statsPanelTitle:  { flex: 1, fontSize: 11, fontWeight: '700', color: '#22d3ee' },
  statsClose:       { padding: 2 },
  statsCloseTxt:    { fontSize: 13, color: COLORS.textDim },
  statsRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  statsLabel:       { fontSize: 10, color: COLORS.textMuted, flex: 1 },
  statsVal:         { fontSize: 10, fontWeight: '700', color: COLORS.text, maxWidth: 115, textAlign: 'right' },
  portalBurst: {
    position: 'absolute',
    left: 438 - 45, top: 462 - 32,
    width: 90, height: 64, borderRadius: 45,
    backgroundColor: '#7c3aed',
    shadowColor: '#a78bfa', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
  },
  desireWisp: {
    position: 'absolute', maxWidth: 100,
    backgroundColor: '#020b18b0',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3,
    borderWidth: 1, borderColor: '#4c1d9555',
  },
  desireWispTxt: {
    fontSize: 7.5, color: '#a78bfa', fontStyle: 'italic', lineHeight: 11, textAlign: 'center',
  },
  trailEcho: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#94a3b8',
    shadowColor: '#94a3b8', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  weatherGlyph: {
    fontSize: 14, fontWeight: '300', opacity: 0.6,
    textShadowColor: '#000', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 },
  },
  fedAllToast: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: '#15803d', paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 22, opacity: 0.93,
    shadowColor: '#22c55e', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  fedAllToastTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
