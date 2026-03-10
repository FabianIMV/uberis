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
            <Text style={styles.age}>⏱ {entity.age_ticks}</Text>
          </View>
        </View>
        <View style={[styles.emotionBadge, { backgroundColor: eColor + '22', borderColor: eColor + '55' }]}>
          <Text style={[styles.emotionText, { color: eColor }]}>{emotion}</Text>
          <Text style={[styles.emotionInt,  { color: eColor }]}>
            {Math.round((entity.emotional_state?.intensity ?? 0) * 100)}%
          </Text>
        </View>
        <EnergyBar energy={entity.energy} />
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
          <Text style={styles.emptyText}>No entities alive yet…</Text>
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
  emotionBadge: { flexDirection: 'row', alignSelf: 'flex-start', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  emotionText:  { fontSize: 11, fontWeight: '600' },
  emotionInt:   { fontSize: 11 },
  thought: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 16 },
  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic' },
})
