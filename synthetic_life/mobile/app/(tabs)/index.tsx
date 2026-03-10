import { useEffect, useRef } from 'react'
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR, emotionColor } from '../../constants/theme'

const CANVAS = 700
const ZONE  = 335
const PAD   = 10

const ZONE_RECT: Record<string, { x: number; y: number; w: number; h: number }> = {
  Garden:  { x: PAD,        y: PAD,        w: ZONE, h: ZONE },
  Void:    { x: PAD*2+ZONE, y: PAD,        w: ZONE, h: ZONE },
  Archive: { x: PAD,        y: PAD*2+ZONE, w: ZONE, h: ZONE },
  Storm:   { x: PAD*2+ZONE, y: PAD*2+ZONE, w: ZONE, h: ZONE },
}

const ZONE_NAME_ES: Record<string, string> = {
  Garden:  'Jardín',
  Void:    'Vacío',
  Archive: 'Archivo',
  Storm:   'Tormenta',
}

const ZONE_DESC_ES: Record<string, string> = {
  Garden:  'Cálido y vivo. La energía se regenera.',
  Void:    'Vacío vasto. Clarificante, solitario.',
  Archive: 'Capas de memoria. Ecos del pensamiento.',
  Storm:   'Caos. Agotador pero eléctrico.',
}

const NODE = 22
const NODE_HALF = NODE / 2

function randomInZone(zone: string): { x: number; y: number } {
  const r = ZONE_RECT[zone] ?? ZONE_RECT['Garden']
  const margin = 30
  const topPad = 58
  return {
    x: r.x + margin + Math.random() * (r.w - margin * 2) - NODE_HALF,
    y: r.y + topPad + Math.random() * (r.h - topPad - margin) - NODE_HALF,
  }
}

// Initial offset so canvas appears centered (scale 0.52, canvas center at 350,350)
// Visual top-left at screen ≈ 350*(1-0.52) = 168. To show from ~5px: tx = 5 - 168 = -163
const INIT_SCALE = 0.52
const INIT_TX    = -155
const INIT_TY    = -8

export default function WorldScreen() {
  const { entities, worldState } = useSimulation()
  const router = useRouter()

  // ── Pan/zoom ──────────────────────────────────────────────────────────────
  const scale      = useRef(new Animated.Value(INIT_SCALE)).current
  const translateX = useRef(new Animated.Value(INIT_TX)).current
  const translateY = useRef(new Animated.Value(INIT_TY)).current
  const lastScale  = useRef(INIT_SCALE)
  const lastOffset = useRef({ x: INIT_TX, y: INIT_TY })
  const pinchDist0 = useRef<number | null>(null)
  const pinchScale0 = useRef(INIT_SCALE)

  // ── Entity positions ───────────────────────────────────────────────────────
  const posRef = useRef<Record<number, { x: Animated.Value; y: Animated.Value }>>({})

  useEffect(() => {
    entities.forEach(entity => {
      if (!posRef.current[entity.id]) {
        const p = randomInZone(entity.current_zone)
        posRef.current[entity.id] = {
          x: new Animated.Value(p.x),
          y: new Animated.Value(p.y),
        }
      } else {
        const p = randomInZone(entity.current_zone)
        Animated.parallel([
          Animated.timing(posRef.current[entity.id].x, {
            toValue: p.x, duration: 2800, useNativeDriver: false,
          }),
          Animated.timing(posRef.current[entity.id].y, {
            toValue: p.y, duration: 2800, useNativeDriver: false,
          }),
        ]).start()
      }
    })
  }, [entities])

  // ── PanResponder ──────────────────────────────────────────────────────────
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
          const dx   = touches[0].pageX - touches[1].pageX
          const dy   = touches[0].pageY - touches[1].pageY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (pinchDist0.current === null) {
            pinchDist0.current = dist
            pinchScale0.current = lastScale.current
          } else {
            const newS = Math.min(3, Math.max(0.28, pinchScale0.current * dist / pinchDist0.current))
            scale.setValue(newS)
            lastScale.current = newS
          }
        } else if (touches.length < 2) {
          translateX.setValue(gs.dx)
          translateY.setValue(gs.dy)
        }
      },
      onPanResponderRelease: () => {
        pinchDist0.current = null
        translateX.flattenOffset()
        translateY.flattenOffset()
        lastOffset.current = {
          x: (translateX as any)._value,
          y: (translateY as any)._value,
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌊 Vida Sintética</Text>
          <Text style={styles.headerSub}>
            {entities.length} vivos · turno {worldState.current_tick}
          </Text>
        </View>
        <View style={styles.dotLive} />
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.canvas,
            { transform: [{ translateX }, { translateY }, { scale }] },
          ]}
        >
          {/* ── Zone backgrounds ── */}
          {Object.entries(ZONE_RECT).map(([zone, r]) => {
            const color = ZONE_COLOR[zone] ?? '#888'
            return (
              <View
                key={zone}
                style={[
                  styles.zone,
                  {
                    left: r.x, top: r.y, width: r.w, height: r.h,
                    borderColor: color + '50',
                    backgroundColor: color + '0c',
                  },
                ]}
              >
                <Text style={[styles.zoneName, { color }]}>{ZONE_NAME_ES[zone]}</Text>
                <Text style={styles.zoneDesc}>{ZONE_DESC_ES[zone]}</Text>
              </View>
            )
          })}

          {/* ── SVG decorations ── */}
          <Svg
            width={CANVAS}
            height={CANVAS}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* ── Jardín: árboles y flores ── */}
            <G>
              {/* Árbol 1 */}
              <Polygon points="55,100 82,55 109,100" fill="#166534" opacity={0.7} />
              <Rect x="77" y="100" width="10" height="22" fill="#713f12" opacity={0.65} rx={2} />
              {/* Árbol 2 */}
              <Polygon points="155,118 184,68 213,118" fill="#14532d" opacity={0.6} />
              <Rect x="179" y="118" width="10" height="20" fill="#713f12" opacity={0.6} rx={2} />
              {/* Árbol 3 */}
              <Polygon points="255,92 278,50 301,92" fill="#166534" opacity={0.55} />
              <Rect x="273" y="92" width="9" height="18" fill="#713f12" opacity={0.55} rx={2} />
              {/* Árbol pequeño 4 */}
              <Polygon points="100,255 118,222 136,255" fill="#166534" opacity={0.45} />
              <Rect x="113" y="255" width="8" height="15" fill="#713f12" opacity={0.45} rx={2} />
              {/* Árbol pequeño 5 */}
              <Polygon points="270,265 288,232 306,265" fill="#14532d" opacity={0.45} />
              <Rect x="283" y="265" width="8" height="15" fill="#713f12" opacity={0.45} rx={2} />
              {/* Flores */}
              <Circle cx="42"  cy="175" r="5"   fill="#86efac" opacity={0.65} />
              <Circle cx="62"  cy="192" r="3.5" fill="#f472b6" opacity={0.6}  />
              <Circle cx="200" cy="285" r="5"   fill="#86efac" opacity={0.6}  />
              <Circle cx="295" cy="248" r="4"   fill="#f9a8d4" opacity={0.6}  />
              <Circle cx="232" cy="315" r="3.5" fill="#fbbf24" opacity={0.55} />
              <Circle cx="82"  cy="318" r="4"   fill="#86efac" opacity={0.55} />
              <Circle cx="160" cy="308" r="3"   fill="#f472b6" opacity={0.5}  />
              {/* Grass dots */}
              <Circle cx="130" cy="330" r="2" fill="#22c55e" opacity={0.3} />
              <Circle cx="200" cy="335" r="2" fill="#22c55e" opacity={0.3} />
              <Circle cx="270" cy="330" r="2" fill="#22c55e" opacity={0.3} />
            </G>

            {/* ── Vacío: estrellas y luna ── */}
            <G>
              {(
                [
                  [382,18],[415,42],[448,20],[478,58],[508,33],
                  [535,55],[565,22],[598,48],[628,33],[662,58],
                  [392,82],[428,112],[462,78],[496,102],[528,86],
                  [562,108],[602,130],[638,100],[675,76],[418,152],
                  [456,175],[494,145],[530,165],[565,152],[600,178],
                  [635,155],[670,140],[388,198],[422,218],[458,202],
                  [494,225],[532,208],[568,232],[605,215],[642,238],
                  [410,270],[448,258],[486,278],[524,262],[562,280],
                  [600,268],[638,285],[676,272],
                ] as [number, number][]
              ).map(([cx, cy], i) => (
                <Circle key={i} cx={cx} cy={cy} r={1.5} fill="#c4b5fd" opacity={0.72} />
              ))}
              {/* Estrellas brillantes */}
              <Circle cx="432" cy="238" r="3"   fill="#e879f9" opacity={0.65} />
              <Circle cx="558" cy="192" r="2.5" fill="#c4b5fd" opacity={0.75} />
              <Circle cx="655" cy="272" r="3"   fill="#818cf8" opacity={0.65} />
              <Circle cx="500" cy="310" r="2.5" fill="#a78bfa" opacity={0.7}  />
              <Circle cx="620" cy="318" r="2"   fill="#e879f9" opacity={0.6}  />
              {/* Luna */}
              <Path
                d="M622 55 A22 22 0 1 1 645 102 A15 15 0 1 0 622 55"
                fill="#a78bfa"
                opacity={0.5}
              />
            </G>

            {/* ── Archivo: columnas y libros ── */}
            <G>
              {/* Columnas */}
              <Rect x="22"  y="376" width="13" height="68" fill="#92400e" opacity={0.52} rx={2} />
              <Rect x="20"  y="370" width="17" height="8"  fill="#b45309" opacity={0.52} rx={2} />
              <Rect x="56"  y="388" width="12" height="58" fill="#92400e" opacity={0.48} rx={2} />
              <Rect x="54"  y="382" width="16" height="8"  fill="#b45309" opacity={0.48} rx={2} />
              <Rect x="264" y="376" width="13" height="68" fill="#92400e" opacity={0.52} rx={2} />
              <Rect x="262" y="370" width="17" height="8"  fill="#b45309" opacity={0.52} rx={2} />
              <Rect x="302" y="382" width="12" height="62" fill="#92400e" opacity={0.48} rx={2} />
              <Rect x="300" y="376" width="16" height="8"  fill="#b45309" opacity={0.48} rx={2} />
              {/* Estante de libros */}
              <Rect x="90"  y="632" width="28" height="22" fill="#d97706" opacity={0.48} rx={3} />
              <Rect x="127" y="626" width="22" height="28" fill="#b45309" opacity={0.48} rx={3} />
              <Rect x="158" y="630" width="20" height="24" fill="#f59e0b" opacity={0.48} rx={3} />
              <Rect x="187" y="628" width="26" height="26" fill="#d97706" opacity={0.48} rx={3} />
              <Rect x="222" y="625" width="20" height="29" fill="#92400e" opacity={0.48} rx={3} />
              <Rect x="252" y="630" width="18" height="24" fill="#b45309" opacity={0.45} rx={3} />
              {/* Tabla del estante */}
              <Rect x="80" y="655" width="200" height="4" fill="#b45309" opacity={0.35} rx={2} />
              {/* Polvo / motas */}
              <Circle cx="140" cy="480" r="2" fill="#f59e0b" opacity={0.2} />
              <Circle cx="200" cy="510" r="2" fill="#f59e0b" opacity={0.2} />
              <Circle cx="260" cy="490" r="2" fill="#f59e0b" opacity={0.2} />
            </G>

            {/* ── Tormenta: rayos y lluvia ── */}
            <G>
              {/* Rayos */}
              <Polygon points="422,376 411,422 426,418 415,466" fill="#fbbf24" opacity={0.68} />
              <Polygon points="528,392 517,438 532,434 521,482" fill="#f59e0b" opacity={0.58} />
              <Polygon points="640,380 629,426 644,422 633,470" fill="#fbbf24" opacity={0.52} />
              {/* Gotas de lluvia */}
              {(
                [
                  [375,492],[402,520],[434,506],[462,538],[492,516],
                  [518,546],[550,526],[578,556],[608,540],[640,566],
                  [668,538],[382,572],[414,596],[450,612],[485,598],
                  [520,620],[554,610],[590,628],[622,616],[657,632],
                  [388,638],[422,656],[456,668],[490,658],[526,673],
                  [560,660],[595,675],[628,662],[662,678],[695,665],
                ] as [number, number][]
              ).map(([cx, cy], i) => (
                <Rect key={i} x={cx} y={cy} width={2} height={7} fill="#fca5a5" opacity={0.32} rx={1} />
              ))}
              {/* Nubes */}
              <Circle cx="470" cy="388" r="14" fill="#1e1e2e" opacity={0.6} />
              <Circle cx="492" cy="380" r="17" fill="#1e1e2e" opacity={0.6} />
              <Circle cx="514" cy="388" r="13" fill="#1e1e2e" opacity={0.6} />
              <Circle cx="580" cy="392" r="12" fill="#1e1e2e" opacity={0.55} />
              <Circle cx="600" cy="385" r="15" fill="#1e1e2e" opacity={0.55} />
              <Circle cx="620" cy="392" r="11" fill="#1e1e2e" opacity={0.55} />
            </G>
          </Svg>

          {/* ── Entity nodes ── */}
          {entities.map(entity => {
            const pos = posRef.current[entity.id]
            if (!pos) return null
            const color = emotionColor(entity.emotional_state?.emotion)
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
                  <View
                    style={[
                      styles.entityGlow,
                      { borderColor: color + '55', shadowColor: color },
                    ]}
                  />
                  {/* Core */}
                  <View
                    style={[
                      styles.entityCore,
                      { backgroundColor: color, shadowColor: color },
                    ]}
                  />
                  {/* Name */}
                  <Text style={[styles.entityLabel, { color }]} numberOfLines={1}>
                    {entity.name}
                  </Text>
                </Pressable>
              </Animated.View>
            )
          })}
        </Animated.View>
      </View>

      {/* Zoom controls */}
      <View style={styles.zoomCtrl}>
        <Pressable onPress={() => zoom(1.35)} style={styles.zoomBtn}>
          <Text style={styles.zoomTxt}>+</Text>
        </Pressable>
        <Pressable onPress={() => zoom(1 / 1.35)} style={styles.zoomBtn}>
          <Text style={styles.zoomTxt}>−</Text>
        </Pressable>
        <Pressable onPress={resetView} style={[styles.zoomBtn, styles.resetBtn]}>
          <Text style={[styles.zoomTxt, { fontSize: 13 }]}>↺</Text>
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
  dotLive:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },

  canvasWrap:  { flex: 1, overflow: 'hidden' },
  canvas:      { width: CANVAS, height: CANVAS, position: 'absolute', top: 0, left: 0 },

  zone: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  zoneName:  { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  zoneDesc:  { fontSize: 9, color: COLORS.textMuted, lineHeight: 13, marginTop: 2, maxWidth: 230 },

  entityWrap:  { position: 'absolute', alignItems: 'center' },
  entityInner: { alignItems: 'center' },
  entityGlow: {
    position: 'absolute',
    width: NODE + 14, height: NODE + 14,
    borderRadius: (NODE + 14) / 2,
    borderWidth: 1,
    top: -7, left: -7,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  entityCore: {
    width: NODE, height: NODE,
    borderRadius: NODE / 2,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  entityLabel: {
    marginTop: 5,
    fontSize: 9, fontWeight: '600',
    maxWidth: 60, textAlign: 'center',
  },

  zoomCtrl: { position: 'absolute', bottom: 24, right: 16, gap: 8 },
  zoomBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.bgCard + 'ee',
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  resetBtn: { marginTop: 4 },
  zoomTxt: { fontSize: 22, color: COLORS.text, fontWeight: '300', lineHeight: 28 },
})
