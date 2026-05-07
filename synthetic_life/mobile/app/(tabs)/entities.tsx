import { useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import EnergyBar from '../../components/EnergyBar'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS, ZONE_COLOR, emotionColor } from '../../constants/theme'
import type { Entity } from '../../engine/types'

function EntityCard({ entity, onPress }: { entity: Entity; onPress: () => void }) {
  const emotion = entity.emotional_state?.emotion ?? 'neutral'
  const eColor  = emotionColor(emotion)
  const zColor  = ZONE_COLOR[entity.current_zone] ?? COLORS.textMuted

  const relationships = entity.relationships ?? {}
  const relCount = Object.keys(relationships).length
  const friendCount  = Object.values(relationships).filter(r => r.valence === 'friend').length
  const familyCount  = Object.values(relationships).filter(r => r.valence === 'family').length
  const rivalCount   = Object.values(relationships).filter(r => r.valence === 'rival').length

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
      <View style={[styles.accent, { backgroundColor: eColor }]} />
      <View style={styles.body}>
        <View style={styles.row1}>
          <Text style={styles.name}>{entity.name}</Text>
          <View style={styles.meta}>
            <Text style={[styles.zone, { color: zColor }]}>{entity.current_zone}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.gen}>Gen {entity.generation}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.age}>⏱ {entity.age_ticks}t</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.emotionBadge, { backgroundColor: eColor + '22', borderColor: eColor + '55' }]}>
            <Text style={[styles.emotionText, { color: eColor }]}>{emotion}</Text>
            <Text style={[styles.emotionInt, { color: eColor }]}>
              {Math.round((entity.emotional_state?.intensity ?? 0) * 100)}%
            </Text>
          </View>
          {relCount > 0 && (
            <View style={styles.relBadge}>
              {familyCount > 0 && <Text style={styles.relBadgeItem}>💜{familyCount}</Text>}
              {friendCount > 0 && <Text style={styles.relBadgeItem}>💚{friendCount}</Text>}
              {rivalCount  > 0 && <Text style={styles.relBadgeItem}>⚔️{rivalCount}</Text>}
            </View>
          )}
        </View>

        <EnergyBar energy={entity.energy} />

        {entity.current_goal && (
          <Text style={styles.goal} numberOfLines={1}>🎯 {entity.current_goal}</Text>
        )}

        {entity.last_thought && (
          <Text style={styles.thought} numberOfLines={2}>{entity.last_thought}</Text>
        )}
      </View>
    </Pressable>
  )
}

export default function EntitiesScreen() {
  const { entities } = useSimulation()
  const router = useRouter()

  return (
    <FlatList
      data={entities}
      keyExtractor={e => String(e.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <EntityCard entity={item} onPress={() => router.push(`/entity/${item.id}`)} />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sin entidades vivas aún…</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  accent: { width: 4 },
  body:   { flex: 1, padding: 12 },
  row1:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name:   { fontSize: 16, fontWeight: '700', color: COLORS.text },
  meta:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zone:   { fontSize: 11, fontWeight: '600' },
  gen:    { fontSize: 11, color: COLORS.textMuted },
  age:    { fontSize: 11, color: COLORS.textMuted },
  metaDot:{ color: COLORS.textDim, fontSize: 10 },

  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emotionBadge:{ flexDirection: 'row', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  emotionText: { fontSize: 11, fontWeight: '600' },
  emotionInt:  { fontSize: 11 },
  relBadge:    { flexDirection: 'row', gap: 6, alignItems: 'center' },
  relBadgeItem:{ fontSize: 11, color: COLORS.textMuted },

  goal:    { fontSize: 11, color: '#34d399', marginBottom: 4, marginTop: 2 },
  thought: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 16 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic' },
})
