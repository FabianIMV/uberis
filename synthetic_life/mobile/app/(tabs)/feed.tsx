/**
 * Chronicles — a rich event log showing what happens in the world.
 * Each event type has its own card design and visual weight.
 */
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, emotionColor, ZONE_COLOR } from '../../constants/theme'
import type { LiveEvent } from '../../engine/types'

// ── Event card renderers ──────────────────────────────────────────────────────

function EncounterCard({ ev }: { ev: LiveEvent }) {
  const nameA = (ev.entity_a as any)?.name ?? '?'
  const nameB = (ev.entity_b as any)?.name ?? '?'
  const outcome = String(ev.outcome ?? '')
  const valA = (ev as any).relationship_a_to_b ?? 'neutral'
  const valB = (ev as any).relationship_b_to_a ?? 'neutral'
  const relColor = valA === 'friend' ? '#34d399' : valA === 'rival' ? '#f87171' : valA === 'family' ? '#a78bfa' : '#64748b'

  return (
    <View style={[styles.card, styles.encounterCard]}>
      <View style={styles.encounterHeader}>
        <View style={[styles.encounterDot, { backgroundColor: '#a78bfa' }]} />
        <Text style={styles.encounterTitle}>⚡ Encuentro</Text>
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
      <View style={styles.encounterNames}>
        <Text style={styles.entityName}>{nameA}</Text>
        <View style={[styles.relBridge, { backgroundColor: relColor + '44', borderColor: relColor + '66' }]}>
          <Text style={[styles.relBridgeTxt, { color: relColor }]}>
            {valA === 'friend' ? '💚' : valA === 'rival' ? '⚔️' : valA === 'family' ? '💜' : '·'}
            {' '}{valB === 'friend' ? '💚' : valB === 'rival' ? '⚔️' : valB === 'family' ? '💜' : '·'}
          </Text>
        </View>
        <Text style={styles.entityName}>{nameB}</Text>
      </View>
      {outcome && (
        <Text style={styles.encounterOutcome} numberOfLines={2}>{outcome}</Text>
      )}
      {(ev as any).dialogue?.[0] && (
        <View style={styles.dialogueLine}>
          <Text style={styles.dialogueWho}>{(ev as any).dialogue[0].speaker}:</Text>
          <Text style={styles.dialogueTxt} numberOfLines={2}>
            "{(ev as any).dialogue[0].text}"
          </Text>
        </View>
      )}
    </View>
  )
}

function BirthCard({ ev }: { ev: LiveEvent }) {
  const zone = String(ev.zone ?? ev.current_zone ?? '')
  const zColor = ZONE_COLOR[zone] ?? '#34d399'
  return (
    <View style={[styles.card, styles.birthCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.birthIcon}>✨</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.birthName}>{ev.name as string}</Text>
          <Text style={styles.birthMeta}>
            Gen {ev.generation as number ?? 1}
            {ev.parent_a ? ` · hijo/a de ${ev.parent_a}` : ''}
            {zone ? (
              <Text style={{ color: zColor }}> · {zone}</Text>
            ) : null}
          </Text>
        </View>
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
    </View>
  )
}

function DeathCard({ ev }: { ev: LiveEvent }) {
  const finalWords = String(ev.final_words ?? ev.last_words ?? '')
  const meaning    = String(ev.life_meaning ?? '')
  return (
    <View style={[styles.card, styles.deathCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.deathIcon}>🌑</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.deathName}>{ev.name as string}</Text>
          <Text style={styles.deathMeta}>Ha concluido su viaje</Text>
        </View>
        {ev.tick != null && <Text style={[styles.tick, { color: '#475569' }]}>t{ev.tick}</Text>}
      </View>
      {finalWords ? (
        <Text style={styles.deathWords} numberOfLines={3}>"{finalWords}"</Text>
      ) : null}
      {meaning ? (
        <Text style={styles.deathMeaning} numberOfLines={2}>{meaning}</Text>
      ) : null}
    </View>
  )
}

function ThoughtCard({ ev }: { ev: LiveEvent }) {
  const thought  = String(ev.thought ?? ev.description ?? '')
  const emotion  = String(ev.emotion ?? 'neutral')
  const eColor   = emotionColor(emotion)
  const zone     = String(ev.zone ?? ev.current_zone ?? '')
  const zColor   = ZONE_COLOR[zone] ?? COLORS.textMuted
  return (
    <View style={[styles.card, styles.thoughtCard, { borderLeftColor: eColor + '66' }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.emotionDot, { backgroundColor: eColor }]} />
        <Text style={[styles.thoughtName, { color: eColor + 'cc' }]}>{ev.name as string}</Text>
        {zone ? <Text style={[styles.zoneTag, { color: zColor }]}>{zone}</Text> : null}
        <View style={{ flex: 1 }} />
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
      <Text style={styles.thoughtText} numberOfLines={4}>{thought}</Text>
      {(ev as any).action && (ev as any).action !== 'think' && (
        <Text style={styles.thoughtAction}>→ {(ev as any).action}</Text>
      )}
    </View>
  )
}

function GriefCard({ ev }: { ev: LiveEvent }) {
  return (
    <View style={[styles.card, styles.griefCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.griefIcon}>💔</Text>
        <Text style={styles.griefText}>
          <Text style={styles.griefName}>{ev.griever as string}</Text>
          <Text style={styles.griefConnector}> llora a </Text>
          <Text style={styles.griefName}>{ev.lost as string}</Text>
        </Text>
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
    </View>
  )
}

function WorldEventCard({ ev }: { ev: LiveEvent }) {
  return (
    <View style={[styles.card, styles.worldCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.worldIcon}>🌍</Text>
        <Text style={styles.worldText} numberOfLines={3}>
          {String(ev.description ?? ev.type)}
        </Text>
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
    </View>
  )
}

function FedCard({ ev }: { ev: LiveEvent }) {
  return (
    <View style={[styles.card, styles.fedCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.fedIcon}>🫧</Text>
        <Text style={styles.fedText}>{ev.name as string} fue alimentado</Text>
        {ev.tick != null && <Text style={styles.tick}>t{ev.tick}</Text>}
      </View>
    </View>
  )
}

function EventCard({ ev }: { ev: LiveEvent }) {
  const t = ev.type
  if (t === 'encounter')                          return <EncounterCard ev={ev} />
  if (t === 'entity_born'   || t === 'birth')     return <BirthCard     ev={ev} />
  if (t === 'entity_died'   || t === 'death')     return <DeathCard     ev={ev} />
  if (t === 'entity_thought'|| t === 'thought')   return <ThoughtCard   ev={ev} />
  if (t === 'entity_grief'  || t === 'grief')     return <GriefCard     ev={ev} />
  if (t === 'world_event')                        return <WorldEventCard ev={ev} />
  if (t === 'entity_fed')                         return <FedCard       ev={ev} />
  return null
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ChroniclesScreen() {
  const { liveEvents, worldState } = useSimulation()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Crónicas</Text>
          <Text style={styles.subtitle}>turno {worldState.current_tick} · {liveEvents.length} eventos</Text>
        </View>
        <View style={styles.liveDot} />
      </View>

      <FlatList
        data={liveEvents}
        keyExtractor={ev => String(ev.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <EventCard ev={item} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌌</Text>
            <Text style={styles.emptyText}>El mundo despierta…</Text>
          </View>
        }
      />
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:    { fontSize: 17, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  liveDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  list:     { padding: 10, gap: 8, paddingBottom: 40 },

  card: {
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardHeaderText: { flex: 1 },
  tick: { fontSize: 9, color: COLORS.textDim, fontVariant: ['tabular-nums'], marginTop: 1 },

  // Encounter
  encounterCard: { borderColor: '#3730a344' },
  encounterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  encounterDot: { width: 6, height: 6, borderRadius: 3 },
  encounterTitle: { fontSize: 11, fontWeight: '700', color: '#a78bfa', flex: 1 },
  encounterNames: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  entityName: { fontSize: 13, fontWeight: '700', color: COLORS.text, flex: 1 },
  relBridge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, alignItems: 'center' },
  relBridgeTxt: { fontSize: 12 },
  encounterOutcome: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginBottom: 4 },
  dialogueLine: { flexDirection: 'row', gap: 4, marginTop: 4 },
  dialogueWho: { fontSize: 10, fontWeight: '700', color: '#a78bfa' },
  dialogueTxt: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic', flex: 1, lineHeight: 15 },

  // Birth
  birthCard: { borderColor: '#14532d66' },
  birthIcon: { fontSize: 18 },
  birthName: { fontSize: 14, fontWeight: '700', color: '#34d399' },
  birthMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  // Death
  deathCard: { borderColor: '#1e293b' },
  deathIcon: { fontSize: 18 },
  deathName: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  deathMeta: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
  deathWords:   { fontSize: 12, color: COLORS.text, fontStyle: 'italic', lineHeight: 18, marginTop: 8, borderLeftWidth: 2, borderLeftColor: '#334155', paddingLeft: 8 },
  deathMeaning: { fontSize: 10, color: COLORS.textMuted, marginTop: 5, fontStyle: 'italic' },

  // Thought
  thoughtCard: { borderLeftWidth: 3, borderColor: 'transparent' },
  emotionDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 3 },
  thoughtName:   { fontSize: 12, fontWeight: '700', flex: 1 },
  zoneTag:       { fontSize: 10, fontWeight: '600' },
  thoughtText:   { fontSize: 12, color: COLORS.text, fontStyle: 'italic', lineHeight: 18, marginTop: 5 },
  thoughtAction: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },

  // Grief
  griefCard: { borderColor: '#1e293b' },
  griefIcon: { fontSize: 16, marginTop: 1 },
  griefText: { flex: 1, flexWrap: 'wrap' },
  griefName: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  griefConnector: { fontSize: 12, color: COLORS.textDim },

  // World event
  worldCard: { borderColor: '#78350f44' },
  worldIcon: { fontSize: 16, marginTop: 1 },
  worldText: { flex: 1, fontSize: 12, color: '#fde68a', lineHeight: 17 },

  // Fed
  fedCard: { borderColor: COLORS.border, opacity: 0.75 },
  fedIcon: { fontSize: 14, marginTop: 1 },
  fedText: { flex: 1, fontSize: 11, color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 13, color: COLORS.textDim, fontStyle: 'italic' },
})
