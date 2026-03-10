import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import EntityNode from '../../components/EntityNode'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR } from '../../constants/theme'

const ZONES = ['Garden', 'Void', 'Archive', 'Storm'] as const

const ZONE_DESCRIPTION: Record<string, string> = {
  Garden:  'Warm, living. Energy regenerates here.',
  Void:    'Vast emptiness. Clarifying, lonely.',
  Archive: 'Layers of memory. Echoes of thought.',
  Storm:   'Chaos. Draining but electric.',
}

export default function WorldScreen() {
  const { entities, worldState } = useSimulation()
  const router = useRouter()

  const byZone = ZONES.reduce<Record<string, typeof entities>>((acc, z) => {
    acc[z] = entities.filter(e => e.current_zone === z)
    return acc
  }, {} as Record<string, typeof entities>)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌊 Synthetic Life</Text>
          <Text style={styles.headerSub}>
            {entities.length} alive · tick {worldState.current_tick}
          </Text>
        </View>
        <View style={styles.dotLive} />
      </View>

      {/* Zones 2×2 */}
      <View style={styles.grid}>
        {ZONES.map(zone => {
          const zoneEntities = byZone[zone] ?? []
          const accent = ZONE_COLOR[zone]
          return (
            <View key={zone} style={[styles.zone, { borderColor: accent + '33' }]}>
              <View style={styles.zoneHeader}>
                <Text style={[styles.zoneName, { color: accent }]}>{zone}</Text>
                <Text style={styles.zoneCount}>{zoneEntities.length}</Text>
              </View>
              <Text style={styles.zoneDesc} numberOfLines={2}>
                {ZONE_DESCRIPTION[zone]}
              </Text>
              <View style={styles.nodesRow}>
                {zoneEntities.length === 0 ? (
                  <Text style={styles.emptyZone}>empty</Text>
                ) : (
                  zoneEntities.map(e => (
                    <EntityNode
                      key={e.id}
                      entity={e}
                      isSelected={false}
                      onPress={() => router.push(`/entity/${e.id}`)}
                      size={30}
                    />
                  ))
                )}
              </View>
              {zoneEntities[0]?.last_thought && (
                <Text style={styles.thought} numberOfLines={2}>
                  <Text style={[styles.thoughtName, { color: accent }]}>
                    {zoneEntities[0].name}:{' '}
                  </Text>
                  {zoneEntities[0].last_thought.slice(0, 80)}…
                </Text>
              )}
            </View>
          )
        })}
      </View>

      {/* Cultural beliefs */}
      {Object.keys(worldState.cultural_beliefs).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cultural Beliefs</Text>
          {Object.entries(worldState.cultural_beliefs).map(([zone, beliefs]) =>
            Object.entries(beliefs).map(([key, val]) => (
              <View key={`${zone}-${key}`} style={styles.beliefRow}>
                <Text style={[styles.beliefZone, { color: ZONE_COLOR[zone] ?? COLORS.textMuted }]}>
                  {zone}
                </Text>
                <Text style={styles.beliefText} numberOfLines={2}>{val}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  content:     { padding: 12, paddingBottom: 40 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#22d3ee' },
  headerSub:   { fontSize: 11, color: COLORS.textMuted },
  dotLive:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  zone: {
    width: '48%', backgroundColor: COLORS.bgCard,
    borderRadius: 12, borderWidth: 1, padding: 10, minHeight: 140,
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  zoneName:   { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  zoneCount:  { fontSize: 11, color: COLORS.textMuted, fontVariant: ['tabular-nums'] },
  zoneDesc:   { fontSize: 10, color: COLORS.textMuted, lineHeight: 14, marginBottom: 8 },

  nodesRow:  { flexDirection: 'row', flexWrap: 'wrap', minHeight: 50, alignItems: 'center' },
  emptyZone: { fontSize: 11, color: COLORS.textDim, fontStyle: 'italic', padding: 8 },

  thought:     { marginTop: 6, fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 14 },
  thoughtName: { fontStyle: 'normal', fontWeight: '600' },

  section:      { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  beliefRow:    { flexDirection: 'row', gap: 8, marginBottom: 6, backgroundColor: COLORS.bgCard, borderRadius: 8, padding: 8 },
  beliefZone:   { fontSize: 11, fontWeight: '700', minWidth: 52 },
  beliefText:   { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
})
