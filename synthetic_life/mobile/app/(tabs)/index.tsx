/**
 * World v31 — Full rewrite. Single world, full screen, SVG face entities.
 * Apple trees, wood chopping, building. 30fps position loop. No per-entity Animated.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions, Pressable, StyleSheet, Text, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient,
  Path as SvgPath, Polygon, Rect, Stop,
  Text as SvgText,
} from 'react-native-svg'
import { useSimulation } from '../../context/SimulationContext'
import type { Entity, WorldObject } from '../../engine/types'

// ── Screen constants ──────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window')

const ZONE_NAMES  = ['Garden', 'Archive', 'Void', 'Storm'] as const
const ZONE_ES     = { Garden: 'Jardín', Archive: 'Archivo', Void: 'Vacío', Storm: 'Tormenta' }
const ZW          = SW / 4

// Ground sits at 65% of usable height
const GND_FRAC    = 0.65
// Entity wander area: between GND_Y-80 and GND_Y+20
const WANDER_ABOVE = 80
const WANDER_BELOW = 20

// ── Colors ───────────────────────────────────────────────────────────────────
function emotionColor(emotion: string): string {
  switch (emotion) {
    case 'joy': case 'elation':           return '#f59e0b'
    case 'wonder': case 'curiosity':      return '#22d3ee'
    case 'hope': case 'love':             return '#f472b6'
    case 'content': case 'calm':          return '#4ade80'
    case 'sadness': case 'grief':         return '#60a5fa'
    case 'loneliness':                    return '#818cf8'
    case 'fear': case 'existential_dread':return '#a78bfa'
    case 'anger': case 'frustration':     return '#f87171'
    case 'contemplation': case 'acceptance': return '#94a3b8'
    default:                              return '#64748b'
  }
}

function energyColor(e: number): string {
  if (e > 60) return '#4ade80'
  if (e > 30) return '#fbbf24'
  return '#f87171'
}

// ── Face helpers ─────────────────────────────────────────────────────────────
function mouthPath(emotion: string, cx: number, cy: number): string {
  const y = cy + 5
  switch (emotion) {
    case 'joy': case 'elation': case 'hope': case 'love':
      return `M ${cx-6},${y-1} Q ${cx},${y+6} ${cx+6},${y-1}`
    case 'wonder': case 'curiosity':
      return `M ${cx-5},${y+1} Q ${cx},${y+5} ${cx+5},${y+1}`
    case 'sadness': case 'grief': case 'loneliness':
      return `M ${cx-6},${y+5} Q ${cx},${y-1} ${cx+6},${y+5}`
    case 'fear': case 'existential_dread':
      return `M ${cx-4},${y+2} Q ${cx},${y+7} ${cx+4},${y+2}`
    case 'anger': case 'frustration':
      return `M ${cx-6},${y+4} L ${cx-2},${y+2} L ${cx+2},${y+2} L ${cx+6},${y+4}`
    case 'content': case 'calm':
      return `M ${cx-5},${y+2} Q ${cx},${y+4} ${cx+5},${y+2}`
    default:
      return `M ${cx-5},${y+2} L ${cx+5},${y+2}`
  }
}

// Eyebrow path for emotion
function eyebrowPath(emotion: string, side: 'L'|'R', cx: number, cy: number): string {
  const bx = side === 'L' ? cx - 5 : cx + 5
  const by = cy - 9
  const hw = 3.5
  switch (emotion) {
    case 'anger': case 'frustration':
      return side === 'L'
        ? `M ${bx-hw},${by+2} L ${bx+hw},${by-1}`
        : `M ${bx-hw},${by-1} L ${bx+hw},${by+2}`
    case 'fear': case 'existential_dread':
      return `M ${bx-hw},${by-1} L ${bx+hw},${by-1}`
    case 'wonder': case 'joy': case 'elation':
      return side === 'L'
        ? `M ${bx-hw},${by-1} Q ${bx},${by-3} ${bx+hw},${by-1}`
        : `M ${bx-hw},${by-1} Q ${bx},${by-3} ${bx+hw},${by-1}`
    default:
      return `M ${bx-hw},${by} L ${bx+hw},${by}`
  }
}

// Zone background tints
const ZONE_TINT: Record<string, string> = {
  Garden:  'rgba(134,239,172,0.08)',
  Archive: 'rgba(147,197,253,0.07)',
  Void:    'rgba(167,139,250,0.11)',
  Storm:   'rgba(251,146,60,0.08)',
}
const ZONE_LABEL_CLR: Record<string, string> = {
  Garden: '#4ade80', Archive: '#93c5fd', Void: '#c4b5fd', Storm: '#fb923c',
}

// ── Static background (memoized, never re-renders) ───────────────────────────
const STATIC_STARS = [
  {x:0.05,y:0.04,r:1.5},{x:0.13,y:0.08,r:1},{x:0.22,y:0.03,r:2},
  {x:0.31,y:0.11,r:1},{x:0.40,y:0.05,r:1.5},{x:0.48,y:0.09,r:1},
  {x:0.57,y:0.03,r:2},{x:0.65,y:0.07,r:1.5},{x:0.73,y:0.04,r:1},
  {x:0.82,y:0.10,r:1.5},{x:0.90,y:0.03,r:1},{x:0.96,y:0.07,r:2},
  {x:0.08,y:0.18,r:1},{x:0.19,y:0.22,r:1.5},{x:0.34,y:0.16,r:1},
  {x:0.47,y:0.21,r:1.5},{x:0.60,y:0.15,r:1},{x:0.74,y:0.20,r:2},
  {x:0.88,y:0.17,r:1},{x:0.25,y:0.30,r:1.5},{x:0.55,y:0.28,r:1},
  {x:0.79,y:0.32,r:1.5},{x:0.92,y:0.27,r:1},
]

// Mountain peaks (deterministic)
function makePeaks(w: number, gndY: number): string {
  const pts: string[] = []
  const steps = 22
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w
    const h = ((i * 2654435761 * 13) >>> 0) / 0xffffffff
    const y = gndY - 55 - h * 110
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  pts.push(`${w},${gndY}`, `0,${gndY}`)
  return pts.join(' ')
}

interface BgProps { w: number; h: number; gndY: number }
const BackgroundSvg = memo(({ w, h, gndY }: BgProps) => {
  const peaks = useMemo(() => makePeaks(w, gndY), [w, gndY])
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"    stopColor="#020617" />
          <Stop offset="0.35" stopColor="#0f172a" />
          <Stop offset="0.65" stopColor="#1a2a3a" />
          <Stop offset="1"    stopColor="#243447" />
        </LinearGradient>
        <LinearGradient id="gnd" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#1e2d3d" />
          <Stop offset="0.5" stopColor="#162030" />
          <Stop offset="1"   stopColor="#0d1520" />
        </LinearGradient>
        <LinearGradient id="mtn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#1a2535" />
          <Stop offset="1"   stopColor="#0f1a28" />
        </LinearGradient>
      </Defs>

      {/* Sky */}
      <Rect x={0} y={0} width={w} height={h} fill="url(#sky)" />

      {/* Zone sky tints */}
      {ZONE_NAMES.map((z, i) => (
        <Rect key={z} x={i*ZW} y={0} width={ZW} height={gndY} fill={ZONE_TINT[z]} />
      ))}

      {/* Stars */}
      {STATIC_STARS.map((s, i) => (
        <Circle key={i} cx={s.x * w} cy={s.y * gndY} r={s.r}
          fill="rgba(255,255,255,0.75)" />
      ))}

      {/* Moon */}
      <Circle cx={w * 0.85} cy={gndY * 0.12} r={18} fill="#f1f5f9" fillOpacity={0.9} />
      <Circle cx={w * 0.85 + 8} cy={gndY * 0.12 - 6} r={14} fill="#0f172a" />

      {/* Mountains */}
      <Polygon points={peaks} fill="url(#mtn)" />

      {/* Ground */}
      <Rect x={0} y={gndY} width={w} height={h - gndY} fill="url(#gnd)" />

      {/* Ground highlight line */}
      <Rect x={0} y={gndY} width={w} height={2} fill="rgba(148,163,184,0.15)" />

      {/* Zone tints on ground */}
      {ZONE_NAMES.map((z, i) => (
        <Rect key={z} x={i*ZW} y={gndY} width={ZW} height={h-gndY} fill={ZONE_TINT[z]} />
      ))}

      {/* Zone labels */}
      {ZONE_NAMES.map((z, i) => (
        <SvgText key={z} x={i*ZW + ZW/2} y={gndY + 18}
          fontSize={10} textAnchor="middle" fontWeight="700"
          fill={ZONE_LABEL_CLR[z]} fillOpacity={0.45}>
          {ZONE_ES[z]}
        </SvgText>
      ))}
    </Svg>
  )
})
BackgroundSvg.displayName = 'BackgroundSvg'

// ── World object rendering ────────────────────────────────────────────────────
interface TreeProps { obj: WorldObject; gndY: number }

function AppleTree({ obj, gndY }: TreeProps) {
  const zoneIdx = ZONE_NAMES.indexOf(obj.zone as typeof ZONE_NAMES[number])
  const zoneX   = zoneIdx >= 0 ? zoneIdx * ZW : 0
  const cx = zoneX + obj.x * ZW
  const baseY = gndY + obj.y * 25  // just below ground line

  // Apple dots (up to max_apples shown as red dots on crown)
  const applePositions = useMemo(() => {
    const dots: {ax: number; ay: number}[] = []
    for (let i = 0; i < obj.max_apples; i++) {
      const angle = (i / obj.max_apples) * Math.PI * 2
      const r = 11
      dots.push({ ax: cx + Math.cos(angle) * r, ay: baseY - 42 + Math.sin(angle) * r })
    }
    return dots
  }, [cx, baseY, obj.max_apples])

  return (
    <G>
      {/* Trunk */}
      <Rect x={cx - 4} y={baseY - 28} width={8} height={28}
        rx={2} fill="#7c5c3a" />
      {/* Crown shadow */}
      <Circle cx={cx} cy={baseY - 44} r={20} fill="rgba(0,0,0,0.2)" />
      {/* Crown */}
      <Circle cx={cx} cy={baseY - 44} r={19}
        fill={obj.hp < 40 ? '#4a5540' : '#2d6a2d'} />
      <Circle cx={cx - 8} cy={baseY - 50} r={13} fill={obj.hp < 40 ? '#3d4a38' : '#3a8a3a'} />
      <Circle cx={cx + 8} cy={baseY - 50} r={12} fill={obj.hp < 40 ? '#3d4a38' : '#3a8a3a'} />
      <Circle cx={cx} cy={baseY - 58} r={11} fill={obj.hp < 40 ? '#3d4a38' : '#358435'} />
      {/* Apples */}
      {applePositions.map((pos, i) => (
        <Circle key={i} cx={pos.ax} cy={pos.ay} r={3.5}
          fill={i < obj.apples ? '#e53e3e' : 'rgba(229,62,62,0.15)'} />
      ))}
      {/* Apple count badge */}
      {obj.apples > 0 && (
        <G>
          <Circle cx={cx + 16} cy={baseY - 60} r={8} fill="#e53e3e" />
          <SvgText x={cx + 16} y={baseY - 57} fontSize={9} textAnchor="middle"
            fill="white" fontWeight="800">{obj.apples}</SvgText>
        </G>
      )}
    </G>
  )
}

function Bush({ obj, gndY }: TreeProps) {
  const zoneIdx = ZONE_NAMES.indexOf(obj.zone as typeof ZONE_NAMES[number])
  const zoneX   = zoneIdx >= 0 ? zoneIdx * ZW : 0
  const cx = zoneX + obj.x * ZW
  const cy = gndY + 4
  return (
    <G>
      <Circle cx={cx} cy={cy} r={9} fill="#1e5c1e" />
      <Circle cx={cx - 7} cy={cy + 2} r={7} fill="#256025" />
      <Circle cx={cx + 7} cy={cy + 2} r={7} fill="#256025" />
      {obj.apples > 0 && (
        <>
          <Circle cx={cx - 3} cy={cy - 4} r={2.5} fill="#e53e3e" />
          <Circle cx={cx + 3} cy={cy - 3} r={2.5} fill="#e53e3e" />
        </>
      )}
    </G>
  )
}

function Log({ obj, gndY }: TreeProps) {
  const zoneIdx = ZONE_NAMES.indexOf(obj.zone as typeof ZONE_NAMES[number])
  const zoneX   = zoneIdx >= 0 ? zoneIdx * ZW : 0
  const cx = zoneX + obj.x * ZW
  const cy = gndY + 6
  return (
    <G>
      <Rect x={cx - 16} y={cy - 5} width={32} height={10} rx={4}
        fill="#7c5c3a" fillOpacity={obj.hp / 100} />
      <Ellipse cx={cx - 16} cy={cy} rx={4} ry={5}
        fill="#9a7550" fillOpacity={obj.hp / 100} />
      <Ellipse cx={cx + 16} cy={cy} rx={4} ry={5}
        fill="#9a7550" fillOpacity={obj.hp / 100} />
    </G>
  )
}

function Pond({ obj, gndY }: TreeProps) {
  const zoneIdx = ZONE_NAMES.indexOf(obj.zone as typeof ZONE_NAMES[number])
  const zoneX   = zoneIdx >= 0 ? zoneIdx * ZW : 0
  const cx = zoneX + obj.x * ZW
  const cy = gndY + 14
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={20} ry={8} fill="rgba(56,189,248,0.25)" />
      <Ellipse cx={cx} cy={cy} rx={20} ry={8}
        fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth={1} />
      <Ellipse cx={cx - 5} cy={cy - 2} rx={5} ry={2}
        fill="rgba(186,230,253,0.3)" />
    </G>
  )
}

// ── Entity face ───────────────────────────────────────────────────────────────
interface FaceProps {
  entity: Entity
  x: number
  y: number
  selected: boolean
  onPress: () => void
}

function EntityFace({ entity, x, y, selected, onPress }: FaceProps) {
  const col    = emotionColor(entity.emotional_state.emotion)
  const cx     = x
  const cy     = y
  const intens = entity.emotional_state.intensity
  const gen    = entity.generation
  // Glow ring gets gold tint for older generations
  const ringColor = gen >= 4 ? '#f59e0b' : gen >= 2 ? col : col

  return (
    <G onPress={onPress}>
      {/* Selected ring */}
      {selected && (
        <Circle cx={cx} cy={cy} r={24} fill="rgba(255,255,255,0.12)"
          stroke="white" strokeWidth={1.5} strokeDasharray="4 3" />
      )}
      {/* Emotion aura glow */}
      <Circle cx={cx} cy={cy} r={20} fill={ringColor} fillOpacity={0.12 + intens * 0.08} />
      {/* Head */}
      <Circle cx={cx} cy={cy} r={14} fill={col} />
      {/* Head highlight */}
      <Circle cx={cx - 4} cy={cy - 5} r={5} fill="rgba(255,255,255,0.18)" />
      {/* Eyes — whites */}
      <Circle cx={cx - 5} cy={cy - 2} r={3.5} fill="white" />
      <Circle cx={cx + 5} cy={cy - 2} r={3.5} fill="white" />
      {/* Eyes — pupils */}
      <Circle cx={cx - 5} cy={cy - 2} r={2} fill="#1e293b" />
      <Circle cx={cx + 5} cy={cy - 2} r={2} fill="#1e293b" />
      {/* Eye shine */}
      <Circle cx={cx - 4} cy={cy - 3} r={0.8} fill="white" />
      <Circle cx={cx + 6} cy={cy - 3} r={0.8} fill="white" />
      {/* Eyebrows */}
      <SvgPath d={eyebrowPath(entity.emotional_state.emotion, 'L', cx, cy)}
        stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <SvgPath d={eyebrowPath(entity.emotional_state.emotion, 'R', cx, cy)}
        stroke="#1e293b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* Mouth */}
      <SvgPath d={mouthPath(entity.emotional_state.emotion, cx, cy)}
        stroke="#1e293b" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* Energy bar */}
      <Rect x={cx - 12} y={cy + 18} width={24} height={3} rx={1.5} fill="rgba(0,0,0,0.4)" />
      <Rect x={cx - 12} y={cy + 18}
        width={Math.max(2, entity.energy / 100 * 24)} height={3} rx={1.5}
        fill={energyColor(entity.energy)} />
      {/* Name */}
      <SvgText x={cx} y={cy + 32} fontSize={8} textAnchor="middle"
        fill="rgba(255,255,255,0.8)" fontWeight="600">
        {entity.name.split(' ')[0]}
      </SvgText>
      {/* Wood indicator */}
      {(entity.resources?.wood ?? 0) > 0 && (
        <SvgText x={cx + 14} y={cy - 14} fontSize={10}>🪵</SvgText>
      )}
      {/* Gen badge for elders */}
      {gen >= 3 && (
        <G>
          <Circle cx={cx - 14} cy={cy - 12} r={6} fill="#f59e0b" fillOpacity={0.9} />
          <SvgText x={cx - 14} y={cy - 9} fontSize={7} textAnchor="middle"
            fill="#1e293b" fontWeight="800">G{gen}</SvgText>
        </G>
      )}
    </G>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface WanderTarget { tx: number; ty: number; expires: number }

export default function WorldScreen() {
  const insets = useSafeAreaInsets()
  const { entities, worldState, worldObjects, liveEvents, isThinking, apiEnabled,
          feedEntity, bathEntity, saveNow } = useSimulation()

  const aliveEntities = entities.filter(e => e.is_alive)
  const tick = worldState.current_tick

  // Header height accounts for notch
  const headerH = 44 + insets.top
  // Usable height = full screen minus header
  const usableH = SH - headerH - insets.bottom
  const gndY    = usableH * GND_FRAC

  // ── Position state ─────────────────────────────────────────────────────────
  const posRef    = useRef(new Map<number, { x: number; y: number }>())
  const wanderRef = useRef(new Map<number, WanderTarget>())
  const [renderTick, setRenderTick] = useState(0)

  // 30fps position loop
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      aliveEntities.forEach(e => {
        // Refresh wander target when expired
        let wt = wanderRef.current.get(e.id)
        if (!wt || now > wt.expires) {
          const zoneIdx = ZONE_NAMES.indexOf(e.current_zone as typeof ZONE_NAMES[number])
          const zoneX = (zoneIdx >= 0 ? zoneIdx : 0) * ZW
          wt = {
            tx: zoneX + 12 + Math.random() * (ZW - 24),
            ty: gndY - WANDER_ABOVE + Math.random() * (WANDER_ABOVE + WANDER_BELOW),
            expires: now + 2500 + Math.random() * 4500,
          }
          wanderRef.current.set(e.id, wt)
        }
        // Lerp toward target
        let pos = posRef.current.get(e.id)
        if (!pos) {
          pos = { x: wt.tx, y: wt.ty }
          posRef.current.set(e.id, pos)
        }
        pos.x += (wt.tx - pos.x) * 0.035
        pos.y += (wt.ty - pos.y) * 0.035
      })
      setRenderTick(t => t + 1)
    }, 33)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aliveEntities.length, gndY])

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = selectedId != null ? aliveEntities.find(e => e.id === selectedId) : null

  // Deselect if entity dies
  useEffect(() => {
    if (selectedId != null && !aliveEntities.some(e => e.id === selectedId)) {
      setSelectedId(null)
    }
  }, [aliveEntities, selectedId])

  // ── Save flash ────────────────────────────────────────────────────────────
  const [savedFlash, setSavedFlash] = useState(false)
  const handleSave = () => {
    saveNow()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  // ── Event ticker (last event in feed) ────────────────────────────────────
  const lastEvent = liveEvents[0]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Static background */}
      <BackgroundSvg w={SW} h={usableH + headerH} gndY={gndY + headerH} />

      {/* World objects + entities SVG */}
      <Svg
        width={SW}
        height={usableH + headerH}
        style={[StyleSheet.absoluteFill, { top: headerH }]}
      >
        {/* World objects */}
        {(worldObjects ?? []).map(obj => {
          if (obj.type === 'apple_tree') return <AppleTree key={obj.id} obj={obj} gndY={gndY} />
          if (obj.type === 'bush')       return <Bush      key={obj.id} obj={obj} gndY={gndY} />
          if (obj.type === 'log')        return <Log       key={obj.id} obj={obj} gndY={gndY} />
          if (obj.type === 'pond')       return <Pond      key={obj.id} obj={obj} gndY={gndY} />
          return null
        })}

        {/* Entity faces */}
        {aliveEntities.map(e => {
          const pos = posRef.current.get(e.id)
          if (!pos) return null
          return (
            <EntityFace
              key={e.id}
              entity={e}
              x={pos.x}
              y={pos.y}
              selected={e.id === selectedId}
              onPress={() => setSelectedId(prev => prev === e.id ? null : e.id)}
            />
          )
        })}
      </Svg>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6, height: headerH }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Uberis</Text>
          <Text style={styles.headerSub}>
            {aliveEntities.length} vivos · tick {tick}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isThinking && (
            <View style={styles.thinkBadge}>
              <Text style={styles.thinkTxt}>✦ IA</Text>
            </View>
          )}
          {!isThinking && apiEnabled && (
            <View style={[styles.thinkBadge, styles.thinkBadgeOn]}>
              <Text style={[styles.thinkTxt, { color: '#4ade80' }]}>✦ ON</Text>
            </View>
          )}
          <Pressable onPress={handleSave} style={[styles.saveBtn, savedFlash && styles.saveBtnFlash]}>
            <Text style={styles.saveTxt}>{savedFlash ? '✓' : '💾'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Event ticker */}
      {lastEvent && (
        <View style={styles.eventTicker} pointerEvents="none">
          <Text style={styles.eventTickerTxt} numberOfLines={1}>
            {lastEvent.type === 'pick_apple'   ? `🍎 ${(lastEvent as any).entity} tomó una manzana` :
             lastEvent.type === 'tree_chopped'  ? `🪵 ${(lastEvent as any).entity} taló un árbol` :
             lastEvent.type === 'entity_bathed' ? `🚿 ${(lastEvent as any).entity} se bañó` :
             lastEvent.type === 'entity_born'   ? `✨ ${(lastEvent as any).name} nació` :
             lastEvent.type === 'entity_died'   ? `💀 ${(lastEvent as any).name} murió` :
             lastEvent.type === 'structure_built'? `🔨 ${(lastEvent as any).builder} construyó` :
             lastEvent.type === 'terraform'     ? `🌀 ${(lastEvent as any).entity} terraformó` :
             null}
          </Text>
        </View>
      )}

      {/* Selected entity action panel */}
      {selected && (
        <View style={styles.actionPanel}>
          <Pressable onPress={() => setSelectedId(null)} style={styles.actionClose}>
            <Text style={styles.actionCloseTxt}>✕</Text>
          </Pressable>
          <View style={styles.actionInfo}>
            <Text style={styles.actionName}>{selected.name}</Text>
            <Text style={styles.actionEmotion}>
              {selected.emotional_state.emotion} · {selected.energy.toFixed(0)} energía
            </Text>
            {selected.last_thought && (
              <Text style={styles.actionThought} numberOfLines={2}>
                "{selected.last_thought}"
              </Text>
            )}
            {(selected.resources?.wood ?? 0) > 0 && (
              <Text style={styles.actionWood}>🪵 {selected.resources!.wood} madera</Text>
            )}
          </View>
          <View style={styles.actionBtns}>
            <Pressable onPress={() => feedEntity(selected.id)} style={styles.actionBtn}>
              <Text style={styles.actionBtnEmoji}>🍎</Text>
              <Text style={styles.actionBtnLbl}>Alimentar</Text>
            </Pressable>
            <Pressable onPress={() => bathEntity(selected.id)} style={styles.actionBtn}>
              <Text style={styles.actionBtnEmoji}>🚿</Text>
              <Text style={styles.actionBtnLbl}>Bañar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(2,6,23,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.12)',
  },
  headerLeft:  { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#22d3ee', letterSpacing: 0.5 },
  headerSub:   { fontSize: 11, color: '#64748b', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkBadge:  {
    backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  thinkBadgeOn: {
    backgroundColor: 'rgba(74,222,128,0.1)', borderColor: 'rgba(74,222,128,0.3)',
  },
  thinkTxt: { fontSize: 10, fontWeight: '700', color: '#818cf8' },
  saveBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnFlash: { backgroundColor: '#052e16', borderColor: '#22c55e' },
  saveTxt: { fontSize: 16 },

  eventTicker: {
    position: 'absolute',
    bottom: 100,
    left: 16, right: 16,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  eventTickerTxt: {
    fontSize: 11,
    color: 'rgba(148,163,184,0.7)',
    fontStyle: 'italic',
  },

  actionPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.15)',
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  actionClose: {
    position: 'absolute',
    top: 12, right: 16,
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  actionCloseTxt: { fontSize: 16, color: '#64748b' },
  actionInfo:    { marginBottom: 14 },
  actionName:    { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  actionEmotion: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actionThought: {
    fontSize: 11, color: '#64748b', fontStyle: 'italic',
    marginTop: 6, lineHeight: 16,
  },
  actionWood:    { fontSize: 12, color: '#d97706', marginTop: 4 },
  actionBtns:    { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: '#1e293b',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  actionBtnEmoji: { fontSize: 28 },
  actionBtnLbl:   { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
})
