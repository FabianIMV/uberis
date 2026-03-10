import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { COLORS } from '../constants/theme'
import type { LiveEvent } from '../hooks/useEntities'

const EVENT_ICON: Record<string, string> = {
  thought:       '💭',
  birth:         '✨',
  death:         '🌑',
  entity_died:   '🌑',
  entity_born:   '✨',
  entity_thought:'💭',
  world_event:   '🌍',
  encounter:     '⚡',
  grief:         '💔',
  entity_grief:  '💔',
  entity_fed:    '🫧',
}

function eventText(ev: LiveEvent): string {
  switch (ev.type) {
    case 'entity_thought':
    case 'thought': {
      const t = String(ev.thought ?? '')
      return `${ev.name} (${ev.zone}): ${t.slice(0, 80)}`
    }
    case 'entity_born':
    case 'birth':
      return `${ev.name} born — gen ${ev.generation}${ev.parent_a ? ` from ${ev.parent_a}` : ''}`
    case 'entity_died':
    case 'death':
      return `${ev.name} ended — "${String(ev.final_words ?? ev.life_meaning ?? '').slice(0, 70)}"`
    case 'world_event':
      return String(ev.description ?? '').slice(0, 90)
    case 'encounter':
      return `${(ev.entity_a as {name:string})?.name} & ${(ev.entity_b as {name:string})?.name} → ${ev.outcome}`
    case 'entity_grief':
    case 'grief':
      return `${ev.griever} grieves for ${ev.lost}`
    case 'entity_fed':
      return `${ev.name} was fed`
    default:
      return ev.type
  }
}

const EVENT_COLOR: Record<string, string> = {
  entity_thought: '#22d3ee',
  thought:        '#22d3ee',
  entity_born:    '#34d399',
  birth:          '#34d399',
  entity_died:    '#64748b',
  death:          '#64748b',
  world_event:    '#f59e0b',
  encounter:      '#a78bfa',
  entity_grief:   '#94a3b8',
  grief:          '#94a3b8',
}

export default function EventsFeed({ events }: { events: LiveEvent[] }) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {events.length === 0 && (
        <Text style={styles.empty}>Waiting for consciousness…</Text>
      )}
      {events.map(ev => {
        const icon  = EVENT_ICON[ev.type] ?? '·'
        const color = EVENT_COLOR[ev.type] ?? COLORS.textMuted
        return (
          <View key={ev.id} style={styles.row}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.text, { color }]} numberOfLines={2}>
              {eventText(ev)}
            </Text>
            {ev.tick != null && (
              <Text style={styles.tick}>t{String(ev.tick)}</Text>
            )}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty:     { color: COLORS.textDim, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0a1f35' },
  icon:      { fontSize: 14, marginRight: 8, marginTop: 1 },
  text:      { flex: 1, fontSize: 12, lineHeight: 17 },
  tick:      { fontSize: 10, color: COLORS.textDim, fontVariant: ['tabular-nums'], marginLeft: 6, marginTop: 2 },
})
