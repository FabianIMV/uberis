/**
 * Mundo — world statistics as a living chronicle.
 * Shows population health, generational spread, zone ecology, and genome evolution.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import GenomeBar from '../../components/GenomeBar'
import { useSimStats, useSimulation } from '../../context/SimulationContext'
import { COLORS, emotionColor, ZONE_COLOR } from '../../constants/theme'

const ZONE_LABEL: Record<string, string> = {
  Garden: 'Jardín', Void: 'Vacío', Archive: 'Archivo', Storm: 'Tormenta',
}

export default function StatsScreen() {
  const stats = useSimStats()
  const { entities, worldState } = useSimulation()

  if (!stats) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>El mundo despierta…</Text>
      </View>
    )
  }

  const dead   = stats.total_entities - stats.living_count
  const birthRate = stats.total_entities > 0
    ? Math.round((stats.living_count / stats.total_entities) * 100)
    : 0

  // Emotion distribution from live entities
  const emotionCounts: Record<string, number> = {}
  entities.forEach(e => {
    const em = e.emotional_state?.emotion ?? 'neutral'
    emotionCounts[em] = (emotionCounts[em] ?? 0) + 1
  })
  const topEmotions = Object.entries(emotionCounts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)

  // Relationship counts across all live entities
  let totalRels = 0, totalFriends = 0, totalRivals = 0, totalFamily = 0
  entities.forEach(e => {
    const rels = Object.values((e as any).relationships ?? {}) as any[]
    totalRels    += rels.length
    totalFriends += rels.filter((r: any) => r.valence === 'friend').length
    totalFamily  += rels.filter((r: any) => r.valence === 'family').length
    totalRivals  += rels.filter((r: any) => r.valence === 'rival').length
  })

  // Oldest living entity
  const oldest = [...entities].sort((a, b) => (b.age_ticks ?? 0) - (a.age_ticks ?? 0))[0]
  // Highest gen entity
  const highestGen = [...entities].sort((a, b) => (b.generation ?? 0) - (a.generation ?? 0))[0]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* World age */}
      <View style={styles.worldAge}>
        <Text style={styles.worldAgeTick}>t{worldState?.current_tick ?? 0}</Text>
        <Text style={styles.worldAgeLabel}>Turno actual</Text>
      </View>

      {/* Population bar */}
      <View style={styles.popCard}>
        <View style={styles.popRow}>
          <View style={styles.popStat}>
            <Text style={[styles.popNum, { color: '#22c55e' }]}>{stats.living_count}</Text>
            <Text style={styles.popLabel}>Vivos</Text>
          </View>
          <View style={styles.popDivider} />
          <View style={styles.popStat}>
            <Text style={[styles.popNum, { color: '#a78bfa' }]}>{stats.max_generation}</Text>
            <Text style={styles.popLabel}>Gen máx</Text>
          </View>
          <View style={styles.popDivider} />
          <View style={styles.popStat}>
            <Text style={[styles.popNum, { color: '#64748b' }]}>{dead}</Text>
            <Text style={styles.popLabel}>Caídos</Text>
          </View>
          <View style={styles.popDivider} />
          <View style={styles.popStat}>
            <Text style={[styles.popNum, { color: '#f59e0b' }]}>{stats.total_entities}</Text>
            <Text style={styles.popLabel}>Total</Text>
          </View>
        </View>
        {/* Survival ratio bar */}
        <View style={styles.survivalTrack}>
          <View style={[styles.survivalFill, { width: `${birthRate}%` as any }]} />
        </View>
        <Text style={styles.survivalLabel}>{birthRate}% sobreviven</Text>
      </View>

      {/* Notables */}
      {(oldest || highestGen) && (
        <>
          <Text style={styles.section}>Notables</Text>
          <View style={styles.card}>
            {oldest && (
              <View style={styles.notableRow}>
                <Text style={styles.notableIcon}>⏳</Text>
                <View style={styles.notableBody}>
                  <Text style={styles.notableName}>{oldest.name}</Text>
                  <Text style={styles.notableMeta}>
                    La más longeva · {oldest.age_ticks} ticks · Gen {oldest.generation}
                  </Text>
                  {oldest.last_thought && (
                    <Text style={styles.notableThought} numberOfLines={2}>
                      "{oldest.last_thought}"
                    </Text>
                  )}
                </View>
              </View>
            )}
            {highestGen && highestGen.id !== oldest?.id && (
              <View style={[styles.notableRow, { marginTop: 10 }]}>
                <Text style={styles.notableIcon}>🧬</Text>
                <View style={styles.notableBody}>
                  <Text style={styles.notableName}>{highestGen.name}</Text>
                  <Text style={styles.notableMeta}>
                    Mayor generación · Gen {highestGen.generation} · {highestGen.age_ticks} ticks
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* Zone distribution */}
      {Object.keys(stats.zone_distribution).length > 0 && (
        <>
          <Text style={styles.section}>Zonas</Text>
          <View style={styles.card}>
            {Object.entries(stats.zone_distribution)
              .sort(([,a],[,b]) => (b as number) - (a as number))
              .map(([zone, count]) => {
                const color = ZONE_COLOR[zone] ?? '#94a3b8'
                const pct   = Math.round(((count as number) / (stats.living_count || 1)) * 100)
                return (
                  <View key={zone} style={styles.zoneRow}>
                    <View style={styles.zoneHeader}>
                      <Text style={[styles.zoneName, { color }]}>{ZONE_LABEL[zone] ?? zone}</Text>
                      <Text style={styles.zoneCount}>{count as number} entidades</Text>
                    </View>
                    <View style={styles.zoneTrack}>
                      <View style={[styles.zoneFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                  </View>
                )
              })}
          </View>
        </>
      )}

      {/* Emotions */}
      {topEmotions.length > 0 && (
        <>
          <Text style={styles.section}>Estado emocional del mundo</Text>
          <View style={styles.card}>
            {topEmotions.map(([emotion, count]) => {
              const color = emotionColor(emotion)
              const pct   = Math.round((count / (entities.length || 1)) * 100)
              return (
                <View key={emotion} style={styles.emotionRow}>
                  <View style={[styles.emotionDot, { backgroundColor: color }]} />
                  <Text style={[styles.emotionName, { color }]}>{emotion}</Text>
                  <Text style={styles.emotionCount}>{count}</Text>
                  <View style={styles.emotionTrack}>
                    <View style={[styles.emotionFill, { width: `${pct}%` as any, backgroundColor: color + '88' }]} />
                  </View>
                </View>
              )
            })}
          </View>
        </>
      )}

      {/* Social fabric */}
      {totalRels > 0 && (
        <>
          <Text style={styles.section}>Tejido social</Text>
          <View style={styles.card}>
            <View style={styles.socialRow}>
              <View style={styles.socialStat}>
                <Text style={[styles.socialNum, { color: '#34d399' }]}>{totalFriends}</Text>
                <Text style={styles.socialLabel}>Amistades</Text>
              </View>
              <View style={styles.socialStat}>
                <Text style={[styles.socialNum, { color: '#a78bfa' }]}>{totalFamily}</Text>
                <Text style={styles.socialLabel}>Familia</Text>
              </View>
              <View style={styles.socialStat}>
                <Text style={[styles.socialNum, { color: '#f87171' }]}>{totalRivals}</Text>
                <Text style={styles.socialLabel}>Rivalidades</Text>
              </View>
              <View style={styles.socialStat}>
                <Text style={[styles.socialNum, { color: '#94a3b8' }]}>{totalRels}</Text>
                <Text style={styles.socialLabel}>Total vínculos</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Genome */}
      {Object.keys(stats.avg_traits).length > 0 && (
        <>
          <Text style={styles.section}>Genoma colectivo</Text>
          <View style={styles.card}>
            <Text style={styles.genomeSubtitle}>Promedios de la población viva</Text>
            {Object.entries(stats.avg_traits).map(([trait, val]) => (
              <GenomeBar key={trait} trait={trait} value={val} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content:   { padding: 14, paddingBottom: 40 },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:{ color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },

  worldAge:      { alignItems: 'center', paddingVertical: 20 },
  worldAgeTick:  { fontSize: 42, fontWeight: '800', color: '#22d3ee', letterSpacing: -1 },
  worldAgeLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  popCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  popRow:  { flexDirection: 'row', marginBottom: 12 },
  popStat: { flex: 1, alignItems: 'center' },
  popNum:  { fontSize: 24, fontWeight: '800' },
  popLabel:{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  popDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  survivalTrack: { height: 4, backgroundColor: '#0e2040', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  survivalFill:  { height: 4, backgroundColor: '#22c55e', borderRadius: 2 },
  survivalLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right' },

  section: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  card:    { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },

  notableRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notableIcon:  { fontSize: 18, marginTop: 2 },
  notableBody:  { flex: 1 },
  notableName:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  notableMeta:  { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  notableThought:{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 5, lineHeight: 16 },

  zoneRow:    { marginBottom: 12 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  zoneName:   { fontSize: 13, fontWeight: '700' },
  zoneCount:  { fontSize: 11, color: COLORS.textMuted },
  zoneTrack:  { height: 5, backgroundColor: '#0e2040', borderRadius: 3, overflow: 'hidden' },
  zoneFill:   { height: 5, borderRadius: 3 },

  emotionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emotionDot:   { width: 7, height: 7, borderRadius: 3.5 },
  emotionName:  { fontSize: 12, fontWeight: '600', width: 90 },
  emotionCount: { fontSize: 11, color: COLORS.textMuted, width: 20, textAlign: 'right' },
  emotionTrack: { flex: 1, height: 4, backgroundColor: '#0e2040', borderRadius: 2, overflow: 'hidden' },
  emotionFill:  { height: 4, borderRadius: 2 },

  socialRow: { flexDirection: 'row' },
  socialStat:{ flex: 1, alignItems: 'center' },
  socialNum: { fontSize: 20, fontWeight: '800' },
  socialLabel:{ fontSize: 9, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  genomeSubtitle: { fontSize: 10, color: COLORS.textDim, marginBottom: 10 },
})
