/**
 * World v4 — birth sparks, Void star twinkle, Garden fireflies.
 * Every zone now has ambient life: fireflies drift in Garden,
 * stars blink in Void, and births leave trails of light.
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

// ── Build types ───────────────────────────────────────────────────────────────
type BuildType = 'house' | 'rock' | 'fire' | 'tree'
interface Building { id: number; type: BuildType; x: number; y: number }
const BUILD_LABEL: Record<BuildType, string> = { house:'Casa', rock:'Roca', fire:'Fogata', tree:'Árbol' }
const BUILD_EMOJI: Record<BuildType, string> = { house:'🏠', rock:'🪨', fire:'🔥', tree:'🌲' }
let _nextBuildId = 1

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

// Animated stars — picked from V_STARS but tracked separately as RN Views
const TWINKLE_STARS: { cx:number; cy:number; r:number; phase:number }[] = [
  { cx:395, cy:18,  r:2.5, phase:0    },
  { cx:450, cy:55,  r:2,   phase:0.33 },
  { cx:468, cy:30,  r:2.5, phase:0.66 },
  { cx:512, cy:110, r:2.5, phase:0.15 },
  { cx:362, cy:192, r:3,   phase:0.5  },
  { cx:448, cy:178, r:3,   phase:0.8  },
]

// Remaining static Void stars (not animated)
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

const S_RAIN: [number, number][] = [
  [532,60],[548,85],[565,62],[582,90],[598,70],[615,95],[632,72],[648,98],[665,78],[682,102],
  [538,140],[556,165],[572,142],[590,170],[607,148],[624,175],[640,155],[658,178],[675,162],
  [530,220],[548,248],[565,225],[582,252],[600,228],[618,255],[635,232],[652,258],[670,238],
  [542,300],[560,328],[578,305],[595,332],[612,308],[630,338],[648,312],[665,340],[682,318],
]

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

const NODE       = 17
const INIT_SCALE = 0.62
const INIT_TX    = -120
const INIT_TY    = -30

// ── Particle types ────────────────────────────────────────────────────────────
interface Bubble { id: number; x: number; y: number; text: string; color: string; anim: Animated.Value }
interface Ripple { id: number; x: number; y: number; scaleAnim: Animated.Value; opacityAnim: Animated.Value; color: string }
interface Spark  { id: number; x: number; y: number; dx: number; dy: number; anim: Animated.Value; color: string }
interface Firefly{ id: number; x: number; baseY: number; anim: Animated.Value }

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorldScreen() {
  const { entities, worldState, liveEvents, isThinking, apiEnabled,
          feedEntity, awaySummary, dismissAwaySummary } = useSimulation()
  const router = useRouter()

  // Pan/zoom state
  const scale      = useRef(new Animated.Value(INIT_SCALE)).current
  const translateX = useRef(new Animated.Value(INIT_TX)).current
  const translateY = useRef(new Animated.Value(INIT_TY)).current
  const lastScale  = useRef(INIT_SCALE)
  const lastOffset = useRef({ x: INIT_TX, y: INIT_TY })
  const pinchDist0  = useRef<number | null>(null)
  const pinchScale0 = useRef(INIT_SCALE)
  const canvasWrapRef  = useRef<any>(null)
  const wrapPageOffset = useRef({ x: 0, y: 0 })

  // Build mode
  const [buildMode, setBuildModeState] = useState(false)
  const buildModeRef    = useRef(false)
  const [selectedBuild, setSelectedBuild] = useState<BuildType>('house')
  const [buildings, setBuildings]         = useState<Building[]>([])
  const setBuildMode = (v: boolean) => { buildModeRef.current = v; setBuildModeState(v) }
  const selectedBuildRef = useRef<BuildType>('house')
  useEffect(() => { selectedBuildRef.current = selectedBuild }, [selectedBuild])

  const [popup, setPopup] = useState<Entity | null>(null)

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

  // ── Void star twinkle (3 independent phases) ──────────────────────────────
  const twinkleAnims = useRef(
    TWINKLE_STARS.map(s => new Animated.Value(s.phase))
  ).current

  useEffect(() => {
    const loops = TWINKLE_STARS.map((s, i) => {
      const anim = twinkleAnims[i]
      const dur  = 1200 + i * 380
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: dur * 0.7, useNativeDriver: true }),
        ])
      )
      loop.start()
      return loop
    })
    return () => loops.forEach(l => l.stop())
  }, [])

  // ── Garden fireflies ──────────────────────────────────────────────────────
  const [fireflies, setFireflies] = useState<Firefly[]>([])
  const nextFireflyId = useRef(0)

  useEffect(() => {
    const spawnFirefly = () => {
      const x     = 8  + Math.random() * 155
      const baseY = 410 + Math.random() * 50
      const anim  = new Animated.Value(0)
      const fid   = nextFireflyId.current++

      setFireflies(prev => [...prev.slice(-5), { id: fid, x, baseY, anim }])

      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3500 + Math.random() * 2000, useNativeDriver: true }),
      ]).start(() => {
        setFireflies(prev => prev.filter(f => f.id !== fid))
      })
    }

    spawnFirefly()
    const id = setInterval(spawnFirefly, 2200)
    return () => clearInterval(id)
  }, [])

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

    const zone   = String((birth as any).zone ?? (birth as any).current_zone ?? 'Garden')
    const region = REGION[zone] ?? REGION.Garden
    const cx     = region.x + 20 + Math.random() * (region.w - 40)
    const cy     = region.y + 10 + Math.random() * (region.h - 20)
    const color  = ZONE_COLOR[zone] ?? '#34d399'

    const NUM = 9
    const newSparks: Spark[] = Array.from({ length: NUM }, (_, i) => {
      const angle = (i / NUM) * Math.PI * 2 + Math.random() * 0.4
      const dist  = 18 + Math.random() * 20
      return {
        id:    nextSparkId.current++,
        x:     cx,
        y:     cy,
        dx:    Math.cos(angle) * dist,
        dy:    Math.sin(angle) * dist,
        anim:  new Animated.Value(0),
        color: i % 2 === 0 ? color : '#ffffff',
      }
    })

    setSparks(prev => [...prev.slice(-20), ...newSparks])

    newSparks.forEach(spark => {
      Animated.timing(spark.anim, { toValue: 1, duration: 800, useNativeDriver: true }).start(
        () => setSparks(prev => prev.filter(s => s.id !== spark.id))
      )
    })
  }, [liveEvents])

  // ── Encounter animation + ripple ──────────────────────────────────────────
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
      Animated.timing(posA.x, { toValue: midX - 14, duration: 900, useNativeDriver: false }),
      Animated.timing(posA.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
      Animated.timing(posB.x, { toValue: midX + 4,  duration: 900, useNativeDriver: false }),
      Animated.timing(posB.y, { toValue: midY,      duration: 900, useNativeDriver: false }),
    ]).start(() => {
      const zoneA = entitiesRef.current.find(e => e.id === idA)?.current_zone ?? 'Garden'
      const zoneB = entitiesRef.current.find(e => e.id === idB)?.current_zone ?? 'Garden'
      Animated.parallel([
        Animated.timing(posA.x, { toValue: randomInRegion(zoneA).x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posA.y, { toValue: randomInRegion(zoneA).y, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.x, { toValue: randomInRegion(zoneB).x, duration: 1400, useNativeDriver: false }),
        Animated.timing(posB.y, { toValue: randomInRegion(zoneB).y, duration: 1400, useNativeDriver: false }),
      ]).start()
    })

    const valA  = (enc as any).relationship_a_to_b ?? 'neutral'
    const rColor = valA === 'friend' ? '#34d399' : valA === 'rival' ? '#f87171' : valA === 'family' ? '#a78bfa' : '#94a3b8'

    const makeRipple = (delay: number, color: string) => {
      const scaleAnim   = new Animated.Value(0.05)
      const opacityAnim = new Animated.Value(delay === 0 ? 0.85 : 0.5)
      const rid = nextRippleId.current++
      setRipples(prev => [...prev.slice(-6), { id: rid, x: midX, y: midY, scaleAnim, opacityAnim, color }])
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim,   { toValue: 1, duration: 1200 + delay * 0.5, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 1200 + delay * 0.5, useNativeDriver: true }),
        ]).start(() => setRipples(prev => prev.filter(r => r.id !== rid)))
      }, delay)
    }
    makeRipple(0,   rColor)
    makeRipple(280, rColor)
  }, [liveEvents])

  // ── Entity wandering ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      entitiesRef.current.forEach(entity => {
        const pos = posRef.current[entity.id]
        if (!pos) return
        const p = randomInRegion(entity.current_zone)
        Animated.parallel([
          Animated.timing(pos.x, { toValue: p.x, duration: 2200, useNativeDriver: false }),
          Animated.timing(pos.y, { toValue: p.y, duration: 2200, useNativeDriver: false }),
        ]).start()
      })
    }, 2800)
    return () => clearInterval(id)
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

  const latestEvent = liveEvents[0] ?? null
  const pulseGlowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.72] })

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Uberis</Text>
          <Text style={styles.headerSub}>
            {entities.length} vivos · t{worldState.current_tick}
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
                <Stop offset="0%"   stopColor="#061520" />
                <Stop offset="18%"  stopColor="#0a2515" />
                <Stop offset="25%"  stopColor="#152e18" />
                <Stop offset="38%"  stopColor="#18120a" />
                <Stop offset="50%"  stopColor="#2a1505" />
                <Stop offset="62%"  stopColor="#0d0615" />
                <Stop offset="75%"  stopColor="#06021a" />
                <Stop offset="87%"  stopColor="#080205" />
                <Stop offset="100%" stopColor="#0c0308" />
              </LinearGradient>
              <LinearGradient id="skyVig" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#000000" stopOpacity="0.5" />
                <Stop offset="40%"  stopColor="#000000" stopOpacity="0.1" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id="gGarden" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#14532d" />
                <Stop offset="100%" stopColor="#052e16" />
              </LinearGradient>
              <LinearGradient id="gArchive" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#78350f" />
                <Stop offset="100%" stopColor="#451a03" />
              </LinearGradient>
              <LinearGradient id="gVoid" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#1e1b4b" />
                <Stop offset="100%" stopColor="#0d0b2a" />
              </LinearGradient>
              <LinearGradient id="gStorm" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%"   stopColor="#180a0a" />
                <Stop offset="100%" stopColor="#080404" />
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

            {/* Static Void stars */}
            {V_STARS_STATIC.map((s, i) => (
              <Circle key={`vs${i}`} cx={s.cx} cy={s.cy} r={s.r} fill="#ddd6fe" opacity={s.op} />
            ))}

            {/* Moon */}
            <Circle cx={490} cy={60} r={28} fill="#a78bfa" opacity={0.45} />
            <Circle cx={502} cy={54} r={24} fill="#030110" opacity={0.98} />
            <Circle cx={488} cy={65} r={4}  fill="#7c3aed" opacity={0.2} />
            <Circle cx={498} cy={75} r={2.5} fill="#6d28d9" opacity={0.18} />

            {/* Garden stars */}
            <Circle cx={30}  cy={40} r={2}   fill="#fde68a" opacity={0.7} />
            <Circle cx={128} cy={28} r={1.5} fill="#fef9c3" opacity={0.65} />

            {/* Storm clouds */}
            {([540,558,576,594,612,630,648,666,684,700] as number[]).map((cx, i) => (
              <G key={`sc${i}`}>
                <Circle cx={cx}   cy={35} r={20} fill="#0c0505" opacity={0.85} />
                <Circle cx={cx+8} cy={26} r={14} fill="#140808" opacity={0.8} />
              </G>
            ))}
            {([548,568,588,608,628,648,668,688] as number[]).map((cx, i) => (
              <Circle key={`sc2${i}`} cx={cx} cy={62} r={16} fill="#180a0a" opacity={0.75} />
            ))}
            <Path d="M 560,70 L 552,108 L 565,104 L 555,148" stroke="#fbbf24" strokeWidth={3}   fill="none" opacity={0.9} />
            <Path d="M 560,70 L 552,108 L 565,104 L 555,148" stroke="#fef9c3" strokeWidth={1.2} fill="none" opacity={0.65} />
            <Path d="M 628,55 L 620,96 L 633,92 L 623,136" stroke="#f59e0b" strokeWidth={2.5} fill="none" opacity={0.8} />
            <Path d="M 628,55 L 620,96 L 633,92 L 623,136" stroke="#fef08a" strokeWidth={1}   fill="none" opacity={0.55} />
            <Path d="M 688,68 L 680,108 L 693,104 L 683,148" stroke="#fbbf24" strokeWidth={2.5} fill="none" opacity={0.75} />
            {S_RAIN.map(([rx, ry], i) => (
              <Rect key={`rain${i}`} x={rx} y={ry} width={1.5} height={10}
                fill="#fca5a5" opacity={0.22} rx={1}
                transform={`rotate(-16 ${rx} ${ry})`} />
            ))}

            {/* Background mountains */}
            <Path
              d={`M 0,700 L 0,${BG_PEAKS[0][1]} ` + BG_PEAKS.map(([x,y]) => `L ${x},${y}`).join(' ') + ` L 700,700 Z`}
              fill="#1a2840" opacity={0.72}
            />
            {BG_PEAKS.filter(([,y]) => y < 275).map(([px,py], i) => (
              <Polygon key={`snow${i}`} points={`${px},${py} ${px-7},${py+12} ${px+7},${py+12}`} fill="#e2e8f0" opacity={0.55} />
            ))}
            {BG_PEAKS.filter(([,y]) => y < 255).map(([px,py], i) => (
              <Polygon key={`snowh${i}`} points={`${px},${py} ${px-3},${py+5} ${px+3},${py+5}`} fill="#ffffff" opacity={0.7} />
            ))}

            {/* Near zone terrain */}
            <Path d="M 0,700 L 0,415 L 18,395 L 38,410 L 58,388 L 80,408 L 100,385 L 122,408 L 145,392 L 168,410 L 175,405 L 175,700 Z" fill="url(#gGarden)" opacity={0.95} />
            <Path d="M 175,700 L 175,405 L 192,392 L 212,408 L 232,388 L 252,405 L 272,388 L 292,408 L 312,392 L 332,408 L 350,395 L 350,700 Z" fill="url(#gArchive)" opacity={0.95} />
            <Path d="M 350,700 L 350,395 L 368,382 L 388,398 L 408,380 L 428,398 L 448,382 L 468,398 L 488,380 L 508,398 L 525,390 L 525,700 Z" fill="url(#gVoid)" opacity={0.95} />
            <Path d="M 525,700 L 525,390 L 542,378 L 562,392 L 580,375 L 600,390 L 618,375 L 638,390 L 658,375 L 678,390 L 700,380 L 700,700 Z" fill="url(#gStorm)" opacity={0.95} />

            {/* Garden features */}
            <G>
              <Path d={G_RIVER_D} fill="none" stroke="#2563eb" strokeWidth={10} opacity={0.28} />
              <Path d={G_RIVER_D} fill="none" stroke="#93c5fd" strokeWidth={5}  opacity={0.3} />
              <Path d={G_RIVER_D} fill="none" stroke="#bfdbfe" strokeWidth={2}  opacity={0.2} />
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

            {/* Archive features */}
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
              <Path d="M 210,440 L 215,430 L 220,440 L 225,430" stroke="#f59e0b" strokeWidth={1.5} fill="none" opacity={0.4} />
              <Circle cx={255} cy={445} r={7} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={0.35} />
              <Path d="M 252,445 L 258,445 M 255,442 L 255,448" stroke="#f59e0b" strokeWidth={1.5} opacity={0.35} />
              <Path d="M 290,440 C 298,433 306,442 314,433 C 322,424 330,433 338,424" fill="none" stroke="#d97706" strokeWidth={1} opacity={0.3} />
            </G>

            {/* Void features */}
            <G>
              <Ellipse cx={388} cy={240} rx={45} ry={22} fill="#7c3aed" opacity={0.1} />
              <Ellipse cx={425} cy={268} rx={35} ry={16} fill="#6d28d9" opacity={0.09} />
              <Ellipse cx={475} cy={250} rx={40} ry={18} fill="#4f46e5" opacity={0.09} />
              <Ellipse cx={438} cy={462} rx={55} ry={18} fill="#0d0b2a" opacity={0.9} />
              <Ellipse cx={438} cy={462} rx={42} ry={13} fill="#1e1b4b" opacity={0.6} />
              <Ellipse cx={438} cy={458} rx={28} ry={7}  fill="#4c1d95" opacity={0.35} />
              <Circle cx={425} cy={463} r={1}   fill="#c4b5fd" opacity={0.5} />
              <Circle cx={448} cy={460} r={1}   fill="#a78bfa" opacity={0.5} />
              <Circle cx={436} cy={468} r={0.8} fill="#818cf8" opacity={0.45} />
              <Polygon points="362,455 358,435 366,435" fill="#7c3aed" opacity={0.7} />
              <Polygon points="362,455 358,440 366,440" fill="#a78bfa" opacity={0.35} />
              <Polygon points="378,458 373,438 383,438" fill="#6d28d9" opacity={0.65} />
              <Polygon points="378,458 373,443 383,443" fill="#c4b5fd" opacity={0.3} />
              <Polygon points="505,458 500,436 510,436" fill="#7c3aed" opacity={0.6} />
              <Polygon points="505,458 500,442 510,442" fill="#a78bfa" opacity={0.3} />
              <Polygon points="518,455 514,438 522,438" fill="#6d28d9" opacity={0.55} />
              <Rect x={350} y={418} width={175} height={282} fill="url(#mistVoid)" />
            </G>

            {/* Storm features */}
            <G>
              <Ellipse cx={562} cy={468} rx={38} ry={12} fill="#1e3a5f" opacity={0.55} />
              <Ellipse cx={562} cy={468} rx={28} ry={8}  fill="#1d4ed8" opacity={0.22} />
              <Ellipse cx={638} cy={475} rx={30} ry={10} fill="#1e3a5f" opacity={0.48} />
              <Ellipse cx={688} cy={470} rx={20} ry={7}  fill="#1e3a5f" opacity={0.42} />
              <Ellipse cx={558} cy={472} rx={20} ry={5}  fill="#fbbf24" opacity={0.07} />
              <Ellipse cx={560} cy={420} rx={45} ry={15} fill="#fbbf24" opacity={0.05} />
            </G>

            {/* Zone pill backgrounds */}
            {[
              { zone: 'Garden',  x: ZW * 0.5 },
              { zone: 'Archive', x: ZW + ZW * 0.5 },
              { zone: 'Void',    x: ZW * 2 + ZW * 0.5 },
              { zone: 'Storm',   x: ZW * 3 + ZW * 0.5 },
            ].map(({ zone, x }) => (
              <Rect key={zone} x={x - 30} y={12} width={60} height={18} rx={9} fill={ZONE_COLOR[zone] + '15'} />
            ))}

            {/* User buildings */}
            {buildings.map(b => {
              if (b.type === 'house') return <HouseShape key={b.id} x={b.x} y={b.y} />
              if (b.type === 'rock')  return <RockShape  key={b.id} x={b.x} y={b.y} />
              if (b.type === 'fire')  return <FireShape  key={b.id} x={b.x} y={b.y} />
              return <ExtraTreeShape key={b.id} x={b.x} y={b.y} />
            })}
          </Svg>

          {/* ── Zone labels ── */}
          {[
            { zone: 'Garden',  left: ZW * 0 + ZW/2 - 28, top: 16 },
            { zone: 'Archive', left: ZW * 1 + ZW/2 - 28, top: 16 },
            { zone: 'Void',    left: ZW * 2 + ZW/2 - 22, top: 16 },
            { zone: 'Storm',   left: ZW * 3 + ZW/2 - 30, top: 16 },
          ].map(({ zone, left, top }) => (
            <View key={zone} style={[styles.zoneLabel, { left, top }]}>
              <Text style={[styles.zoneName, { color: ZONE_COLOR[zone] }]}>
                {ZONE_NAME_ES[zone]}
              </Text>
            </View>
          ))}

          {/* ── Animated Void stars (twinkle) ── */}
          {TWINKLE_STARS.map((star, i) => {
            const anim = twinkleAnims[i]
            const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] })
            return (
              <Animated.View key={`ts${i}`} style={[styles.twinkleStar, {
                left: star.cx - star.r,
                top:  star.cy - star.r,
                width: star.r * 2,
                height: star.r * 2,
                borderRadius: star.r,
                opacity,
              }]} />
            )
          })}

          {/* ── Garden fireflies ── */}
          {fireflies.map(ff => {
            const opacity = ff.anim.interpolate({
              inputRange: [0, 0.15, 0.75, 1],
              outputRange: [0, 1,   0.85, 0],
            })
            const translateY = ff.anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -38],
            })
            return (
              <Animated.View key={ff.id} style={[styles.firefly, {
                left: ff.x,
                top:  ff.baseY,
                opacity,
                transform: [{ translateY }],
              }]} />
            )
          })}

          {/* ── Encounter ripples ── */}
          {ripples.map(ripple => (
            <Animated.View key={ripple.id} style={[styles.ripple, {
              left:        ripple.x - 44,
              top:         ripple.y - 44,
              borderColor: ripple.color,
              opacity:     ripple.opacityAnim,
              transform:   [{ scale: ripple.scaleAnim }],
            }]} />
          ))}

          {/* ── Entity nodes ── */}
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
                <Pressable
                  onPress={() => setPopup(p => p?.id === entity.id ? null : entity)}
                  style={styles.entityInner}
                >
                  {selected && (
                    <View style={[styles.entitySelect, {
                      width: sz + 20, height: sz + 20, borderRadius: (sz + 20) / 2,
                      top: -szH - 10, left: -szH - 10, borderColor: color,
                    }]} />
                  )}
                  <Animated.View style={[styles.entityGlow, {
                    width: sz + 16, height: sz + 16, borderRadius: (sz + 16) / 2,
                    top: -szH - 8, left: -szH - 8,
                    borderColor: color + '55',
                    shadowColor: color,
                    opacity: pulseGlowOpacity,
                  }]} />
                  <View style={[styles.entityCore, {
                    width: sz, height: sz, borderRadius: szH,
                    backgroundColor: color, shadowColor: color,
                  }]} />
                  <Text style={[styles.entityLabel, { color }]} numberOfLines={1}>
                    {entity.name}
                  </Text>
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

          {/* ── Birth sparks ── */}
          {sparks.map(spark => {
            const tx = spark.anim.interpolate({ inputRange: [0,1], outputRange: [0, spark.dx] })
            const ty = spark.anim.interpolate({ inputRange: [0,1], outputRange: [0, spark.dy] })
            const op = spark.anim.interpolate({ inputRange: [0, 0.15, 0.65, 1], outputRange: [0, 1, 0.9, 0] })
            const sc = spark.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.5] })
            return (
              <Animated.View key={spark.id} style={[styles.spark, {
                left: spark.x - 3,
                top:  spark.y - 3,
                backgroundColor: spark.color,
                opacity: op,
                transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
              }]} />
            )
          })}

          {/* ── Thought bubbles ── */}
          {bubbles.map(bubble => (
            <Animated.View key={bubble.id} style={[styles.thoughtBubble, {
              left:        bubble.x - 55,
              top:         bubble.y - 72,
              borderColor: bubble.color + '66',
              opacity:     bubble.anim,
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

      {/* ── Live event ticker ── */}
      {latestEvent && !popup && (
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
            <Pressable style={styles.popupBtnFeed}
              onPress={() => { feedEntity(popup.id); setPopup(null) }}>
              <Text style={styles.popupBtnTxt}>🍎 Alimentar</Text>
            </Pressable>
            <Pressable style={styles.popupBtnDetail}
              onPress={() => { setPopup(null); router.push(`/entity/${popup.id}`) }}>
              <Text style={styles.popupBtnTxt}>Ver más →</Text>
            </Pressable>
          </View>
        </View>
      )}

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
      </View>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#22d3ee', letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotLive:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  thinkingBadge: { backgroundColor: '#0e7490', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  thinkingTxt:   { fontSize: 10, fontWeight: '700', color: '#22d3ee' },
  apiBadge:    { backgroundColor: '#052e16', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#166534' },
  apiTxt:      { fontSize: 10, fontWeight: '600', color: '#22c55e' },
  apiBadgeOff: { backgroundColor: '#1c1917', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  apiTxtOff:   { fontSize: 10, color: COLORS.textDim },

  canvasWrap: { flex: 1, overflow: 'hidden' },
  canvas:     { width: W, height: H, position: 'absolute', top: 0, left: 0 },

  zoneLabel: { position: 'absolute' },
  zoneName: {
    fontSize: 12, fontWeight: '800', letterSpacing: 0.5,
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },

  twinkleStar: {
    position: 'absolute',
    backgroundColor: '#ddd6fe',
  },

  firefly: {
    position: 'absolute',
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#86efac',
    shadowColor: '#22c55e', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },

  ripple: {
    position: 'absolute',
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 2,
  },

  spark: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
    shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },

  entityWrap:   { position: 'absolute', alignItems: 'center' },
  entityInner:  { alignItems: 'center' },
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
    position: 'absolute',
    maxWidth: 110,
    backgroundColor: '#020b18e8',
    borderRadius: 8, borderWidth: 1,
    padding: 5, paddingHorizontal: 7,
  },
  thoughtBubbleTxt: { fontSize: 8, fontStyle: 'italic', lineHeight: 11 },
  thoughtNotch: {
    position: 'absolute', bottom: -5, left: '50%', marginLeft: -4,
    width: 0, height: 0,
    borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

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
  popupBtnTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },

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
  awayCloseTxt:{ fontSize: 14, color: COLORS.textDim },
})
