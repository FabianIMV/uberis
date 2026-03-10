import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import EnergyBar from '../../components/EnergyBar'
import GenomeBar from '../../components/GenomeBar'
import { API_URL } from '../../constants/api'
import { COLORS, emotionColor } from '../../constants/theme'
import { useEntityDetail } from '../../hooks/useEntityDetail'

export default function EntityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const { entity, logs, loading } = useEntityDetail(numId)
  const navigation = useNavigation()

  useEffect(() => {
    if (entity?.name) navigation.setOptions({ title: entity.name })
  }, [entity?.name, navigation])

  const feed = async () => {
    if (!numId) return
    await fetch(`${API_URL}/entities/${numId}/feed`, { method: 'POST' })
    Alert.alert('Fed', `${entity?.name} received energy.`)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#22d3ee" />
      </View>
    )
  }
  if (!entity) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Entity not found</Text>
      </View>
    )
  }

  const emotion = entity.emotional_state?.emotion ?? 'neutral'
  const eColor  = emotionColor(emotion)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={[styles.hero, { borderColor: eColor + '44' }]}>
        <View style={[styles.glowDot, { backgroundColor: eColor, shadowColor: eColor }]} />
        <View style={styles.heroText}>
          <Text style={styles.heroName}>{entity.name}</Text>
          <Text style={styles.heroMeta}>
            Gen {entity.generation} · Age {entity.age_ticks} · {entity.current_zone}
          </Text>
          {!entity.is_alive && (
            <Text style={styles.deadBadge}>† Deceased at tick {entity.died_at_tick}</Text>
          )}
        </View>
        {entity.is_alive && (
          <Pressable onPress={feed} style={styles.feedBtn}>
            <Text style={styles.feedBtnText}>+ Feed</Text>
          </Pressable>
        )}
      </View>

      {/* Status */}
      <View style={styles.card}>
        <EnergyBar energy={entity.energy} />
        <View style={styles.emotionRow}>
          <View style={[styles.emotionBadge, { backgroundColor: eColor + '22', borderColor: eColor + '55' }]}>
            <Text style={[styles.emotionTxt, { color: eColor }]}>{emotion}</Text>
          </View>
          <Text style={styles.intensityTxt}>
            {Math.round((entity.emotional_state?.intensity ?? 0) * 100)}% intensity
          </Text>
        </View>
      </View>

      {/* Genome */}
      <Text style={styles.sectionTitle}>Genome</Text>
      <View style={styles.card}>
        {Object.entries(entity.genome ?? {}).map(([trait, val]) => (
          <GenomeBar key={trait} trait={trait} value={val as number} />
        ))}
      </View>

      {/* Current thought */}
      {entity.last_thought && (
        <>
          <Text style={styles.sectionTitle}>Current Thought</Text>
          <View style={[styles.card, styles.quoteCard]}>
            <Text style={styles.quoteText}>{entity.last_thought}</Text>
          </View>
        </>
      )}

      {/* Desire */}
      {entity.current_desire && (
        <>
          <Text style={styles.sectionTitle}>Desire</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.desireText}>{entity.current_desire}</Text>
          </View>
        </>
      )}

      {/* Existential statement */}
      {entity.existential_statement && (
        <>
          <Text style={styles.sectionTitle}>Existential View</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#a78bfa' }]}>
            <Text style={styles.existText}>{entity.existential_statement}</Text>
          </View>
        </>
      )}

      {/* Beliefs */}
      {entity.beliefs && Object.keys(entity.beliefs).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Beliefs</Text>
          <View style={styles.card}>
            {Object.entries(entity.beliefs).map(([k, v]) => (
              <View key={k} style={styles.beliefRow}>
                <Text style={styles.beliefKey}>{k}: </Text>
                <Text style={styles.beliefVal}>{v}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Memory */}
      {entity.memory && entity.memory.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Memory</Text>
          <View style={styles.card}>
            {[...entity.memory].reverse().map((mem, i) => (
              <View key={i} style={styles.memRow}>
                <View style={styles.memDot} />
                <Text style={styles.memText}>{mem}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Consciousness log */}
      {logs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Consciousness Log</Text>
          <View style={styles.card}>
            {logs.map(log => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTick}>t{log.tick}</Text>
                  <Text style={styles.logAction}>{log.action}</Text>
                  {log.action_target && (
                    <Text style={styles.logTarget}>→ {log.action_target}</Text>
                  )}
                  <Text style={[styles.logEmotion, { marginLeft: 'auto' as any }]}>{log.emotion}</Text>
                </View>
                <Text style={styles.logThought} numberOfLines={3}>{log.thought}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Final message */}
      {entity.final_message && (
        <>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Final Words</Text>
          <View style={[styles.card, { borderColor: '#ef444433' }]}>
            <Text style={styles.finalWords}>{entity.final_message.final_words}</Text>
            <View style={styles.finalMeta}>
              <Text style={styles.finalMetaLabel}>Life meaning: </Text>
              <Text style={styles.finalMetaVal}>{entity.final_message.life_meaning}</Text>
            </View>
            {entity.final_message.gift_to_world && (
              <View style={styles.finalMeta}>
                <Text style={styles.finalMetaLabel}>Gift: </Text>
                <Text style={styles.finalMetaVal}>{entity.final_message.gift_to_world}</Text>
              </View>
            )}
            <Text style={[styles.finalEmotion, { color: emotionColor(entity.final_message.final_emotion) }]}>
              Final emotion: {entity.final_message.final_emotion}
              {entity.final_message.at_peace ? ' · at peace' : ''}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 14, paddingBottom: 48 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:  { color: COLORS.textMuted, fontSize: 14 },

  hero: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    padding: 14, marginBottom: 12, gap: 12,
    borderWidth: 1,
  },
  glowDot: {
    width: 16, height: 16, borderRadius: 8,
    shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  heroText:  { flex: 1 },
  heroName:  { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroMeta:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  deadBadge: { fontSize: 11, color: '#ef4444', marginTop: 4 },
  feedBtn:   { backgroundColor: '#052e16', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#166534' },
  feedBtnText:{ fontSize: 12, color: '#22c55e', fontWeight: '600' },

  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  emotionBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  emotionTxt:   { fontSize: 12, fontWeight: '600' },
  intensityTxt: { fontSize: 12, color: COLORS.textMuted },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },

  quoteCard: { borderLeftWidth: 3, borderLeftColor: '#22d3ee' },
  quoteText: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', lineHeight: 20 },
  desireText:{ fontSize: 13, color: '#fde68a', lineHeight: 20 },
  existText: { fontSize: 13, color: '#ddd6fe', fontStyle: 'italic', lineHeight: 20 },

  beliefRow: { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap' },
  beliefKey: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  beliefVal: { fontSize: 11, color: COLORS.text, flex: 1 },

  memRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 },
  memDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155', marginTop: 6 },
  memText:{ fontSize: 11, color: COLORS.textMuted, flex: 1, lineHeight: 16 },

  logRow:    { borderBottomWidth: 1, borderBottomColor: '#0a1f35', paddingBottom: 8, marginBottom: 8 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  logTick:   { fontSize: 10, color: COLORS.textDim, fontVariant: ['tabular-nums'] },
  logAction: { fontSize: 10, color: COLORS.textMuted },
  logTarget: { fontSize: 10, color: COLORS.textDim },
  logEmotion:{ fontSize: 10, color: COLORS.textMuted },
  logThought:{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 16 },

  finalWords:    { fontSize: 13, color: COLORS.text, lineHeight: 20, marginBottom: 10 },
  finalMeta:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  finalMetaLabel:{ fontSize: 11, color: COLORS.textMuted },
  finalMetaVal:  { fontSize: 11, color: COLORS.text, flex: 1 },
  finalEmotion:  { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
})
