import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import EnergyBar from '../../components/EnergyBar'
import GenomeBar from '../../components/GenomeBar'
import { useEntityById, useEntityLogs, useSimulation } from '../../context/SimulationContext'
import { COLORS, emotionColor } from '../../constants/theme'
import type { RelationshipEntry } from '../../engine/types'

const VALENCE_COLOR: Record<string, string> = {
  family: '#a78bfa',
  friend: '#34d399',
  rival:  '#f87171',
  neutral:'#94a3b8',
}
const VALENCE_ICON: Record<string, string> = {
  family: '💜',
  friend: '💚',
  rival:  '⚔️',
  neutral:'○',
}
const VALENCE_ORDER = ['family', 'friend', 'rival', 'neutral'] as const

export default function EntityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const numId = id ? parseInt(id, 10) : null
  const entity = useEntityById(numId)
  const logs   = useEntityLogs(numId)
  const { feedEntity } = useSimulation()
  const navigation = useNavigation()

  useEffect(() => {
    if (entity?.name) navigation.setOptions({ title: entity.name })
  }, [entity?.name, navigation])

  const feed = () => {
    if (!numId || !entity?.is_alive) return
    feedEntity(numId)
    Alert.alert('Alimentado', `${entity?.name} recibió 25 de energía.`)
  }

  if (!entity) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Entidad no encontrada</Text>
      </View>
    )
  }

  const emotion = entity.emotional_state?.emotion ?? 'neutral'
  const eColor  = emotionColor(emotion)

  const relationships = entity.relationships ?? {}
  const relEntries = Object.values(relationships) as RelationshipEntry[]
  const hasRelationships = relEntries.length > 0
  const memArchive = entity.memory_archive ?? []

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={[styles.hero, { borderColor: eColor + '44' }]}>
        <View style={[styles.glowDot, { backgroundColor: eColor, shadowColor: eColor }]} />
        <View style={styles.heroText}>
          <Text style={styles.heroName}>{entity.name}</Text>
          <Text style={styles.heroMeta}>
            Gen {entity.generation} · Edad {entity.age_ticks} · {entity.current_zone}
          </Text>
          {entity.current_goal && (
            <Text style={styles.goalInHero} numberOfLines={1}>🎯 {entity.current_goal}</Text>
          )}
          {!entity.is_alive && (
            <Text style={styles.deadBadge}>† Fallecido en turno {entity.died_at_tick}</Text>
          )}
        </View>
        {entity.is_alive && (
          <Pressable onPress={feed} style={styles.feedBtn}>
            <Text style={styles.feedBtnText}>+ Alimentar</Text>
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
            {Math.round((entity.emotional_state?.intensity ?? 0) * 100)}% intensidad
          </Text>
        </View>
      </View>

      {/* Genome */}
      <Text style={styles.sectionTitle}>Genoma</Text>
      <View style={styles.card}>
        {Object.entries(entity.genome ?? {}).map(([trait, val]) => (
          <GenomeBar key={trait} trait={trait} value={val as number} />
        ))}
      </View>

      {/* Current thought */}
      {entity.last_thought && (
        <>
          <Text style={styles.sectionTitle}>Pensamiento</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#22d3ee' }]}>
            <Text style={styles.quoteText}>{entity.last_thought}</Text>
          </View>
        </>
      )}

      {/* Desire */}
      {entity.current_desire && (
        <>
          <Text style={styles.sectionTitle}>Deseo</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.desireText}>{entity.current_desire}</Text>
          </View>
        </>
      )}

      {/* Current Goal */}
      {entity.current_goal && (
        <>
          <Text style={styles.sectionTitle}>Objetivo activo</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#34d399' }]}>
            <Text style={styles.goalText}>{entity.current_goal}</Text>
          </View>
        </>
      )}

      {/* Existential statement */}
      {entity.existential_statement && (
        <>
          <Text style={styles.sectionTitle}>Visión existencial</Text>
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: '#a78bfa' }]}>
            <Text style={styles.existText}>{entity.existential_statement}</Text>
          </View>
        </>
      )}

      {/* Relationships */}
      {hasRelationships && (
        <>
          <Text style={styles.sectionTitle}>Relaciones</Text>
          <View style={styles.card}>
            {VALENCE_ORDER.map(valence => {
              const group = relEntries
                .filter(r => r.valence === valence)
                .sort((a, b) => b.intensity - a.intensity)
              if (group.length === 0) return null
              return (
                <View key={valence} style={styles.valenceGroup}>
                  <Text style={[styles.valenceLabel, { color: VALENCE_COLOR[valence] }]}>
                    {VALENCE_ICON[valence]}  {valence}
                  </Text>
                  {group.map(rel => (
                    <View key={rel.name} style={styles.relRow}>
                      <View style={styles.relHeader}>
                        <Text style={styles.relName}>{rel.name}</Text>
                        <Text style={styles.relMeta}>
                          {rel.encounters} enc · {Math.round(rel.intensity * 100)}%
                        </Text>
                      </View>
                      <View style={styles.relBarBg}>
                        <View
                          style={[
                            styles.relBarFill,
                            {
                              width: `${Math.round(rel.intensity * 100)}%` as any,
                              backgroundColor: VALENCE_COLOR[valence],
                            },
                          ]}
                        />
                      </View>
                      {!!rel.key_memory && (
                        <Text style={styles.relMemory} numberOfLines={2}>{rel.key_memory}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        </>
      )}

      {/* Beliefs */}
      {entity.beliefs && Object.keys(entity.beliefs).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Creencias</Text>
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

      {/* Episodic memory archive */}
      {memArchive.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Archivo episódico</Text>
          <View style={[styles.card, { borderColor: '#1e293b' }]}>
            {memArchive.map((mem, i) => (
              <View key={i} style={styles.archiveRow}>
                <Text style={styles.archiveIcon}>⬡</Text>
                <Text style={styles.archiveText}>{mem}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Memory (recent) */}
      {entity.memory && entity.memory.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Memoria reciente</Text>
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
          <Text style={styles.sectionTitle}>Registro de consciencia</Text>
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
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Últimas palabras</Text>
          <View style={[styles.card, { borderColor: '#ef444433' }]}>
            <Text style={styles.finalWords}>{entity.final_message.final_words}</Text>
            <View style={styles.finalMeta}>
              <Text style={styles.finalMetaLabel}>Significado: </Text>
              <Text style={styles.finalMetaVal}>{entity.final_message.life_meaning}</Text>
            </View>
            {entity.final_message.gift_to_world && (
              <View style={styles.finalMeta}>
                <Text style={styles.finalMetaLabel}>Regalo: </Text>
                <Text style={styles.finalMetaVal}>{entity.final_message.gift_to_world}</Text>
              </View>
            )}
            <Text style={[styles.finalEmotion, { color: emotionColor(entity.final_message.final_emotion) }]}>
              Emoción final: {entity.final_message.final_emotion}
              {entity.final_message.at_peace ? ' · en paz' : ''}
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
  heroText:    { flex: 1 },
  heroName:    { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroMeta:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  goalInHero:  { fontSize: 11, color: '#34d399', marginTop: 4 },
  deadBadge:   { fontSize: 11, color: '#ef4444', marginTop: 4 },
  feedBtn:     { backgroundColor: '#052e16', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#166534' },
  feedBtnText: { fontSize: 12, color: '#22c55e', fontWeight: '600' },

  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  emotionBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  emotionTxt:   { fontSize: 12, fontWeight: '600' },
  intensityTxt: { fontSize: 12, color: COLORS.textMuted },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },

  quoteText: { fontSize: 13, color: COLORS.text, fontStyle: 'italic', lineHeight: 20 },
  desireText:{ fontSize: 13, color: '#fde68a', lineHeight: 20 },
  goalText:  { fontSize: 13, color: '#6ee7b7', lineHeight: 20 },
  existText: { fontSize: 13, color: '#ddd6fe', fontStyle: 'italic', lineHeight: 20 },

  // Relationships
  valenceGroup: { marginBottom: 12 },
  valenceLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  relRow:     { marginBottom: 8, paddingLeft: 8 },
  relHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  relName:    { fontSize: 12, fontWeight: '600', color: COLORS.text },
  relMeta:    { fontSize: 10, color: COLORS.textMuted },
  relBarBg:   { height: 3, backgroundColor: '#1e293b', borderRadius: 2, marginBottom: 4, overflow: 'hidden' },
  relBarFill: { height: 3, borderRadius: 2 },
  relMemory:  { fontSize: 10, color: COLORS.textDim, fontStyle: 'italic', lineHeight: 14 },

  beliefRow: { flexDirection: 'row', marginBottom: 6, flexWrap: 'wrap' },
  beliefKey: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
  beliefVal: { fontSize: 11, color: COLORS.text, flex: 1 },

  // Episodic archive
  archiveRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  archiveIcon: { fontSize: 10, color: '#475569', marginTop: 2 },
  archiveText: { fontSize: 11, color: '#64748b', fontStyle: 'italic', flex: 1, lineHeight: 16 },

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
