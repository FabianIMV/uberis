import { ScrollView, StyleSheet, Text, View } from 'react-native'
import GenomeBar from '../../components/GenomeBar'
import { COLORS, ZONE_COLOR } from '../../constants/theme'
import { useEntities } from '../../hooks/useEntities'
import { useStats } from '../../hooks/useStats'

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function StatsScreen() {
  const stats = useStats()
  const { worldState } = useEntities()

  if (!stats) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading stats…</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Population grid */}
      <Text style={styles.section}>Population</Text>
      <View style={styles.statGrid}>
        <StatCard label="Alive"   value={stats.living_count}   color="#22c55e" />
        <StatCard label="Total"   value={stats.total_entities} color="#94a3b8" />
        <StatCard label="Max Gen" value={stats.max_generation} color="#a78bfa" />
        <StatCard label="Deceased" value={stats.total_entities - stats.living_count} color="#ef4444" />
      </View>

      {/* Tick */}
      {worldState && (
        <View style={styles.tickRow}>
          <Text style={styles.tickLabel}>Current tick</Text>
          <Text style={styles.tickValue}>{worldState.current_tick}</Text>
        </View>
      )}

      {/* Avg genome */}
      {Object.keys(stats.avg_traits).length > 0 && (
        <>
          <Text style={styles.section}>Average Genome</Text>
          <View style={styles.card}>
            {Object.entries(stats.avg_traits).map(([trait, val]) => (
              <GenomeBar key={trait} trait={trait} value={val} />
            ))}
          </View>
        </>
      )}

      {/* Zone distribution */}
      {Object.keys(stats.zone_distribution).length > 0 && (
        <>
          <Text style={styles.section}>Zone Distribution</Text>
          <View style={styles.card}>
            {Object.entries(stats.zone_distribution).map(([zone, count]) => {
              const color = ZONE_COLOR[zone] ?? '#94a3b8'
              const pct = Math.round((count / (stats.living_count || 1)) * 100)
              return (
                <View key={zone} style={styles.zoneRow}>
                  <Text style={[styles.zoneName, { color }]}>{zone}</Text>
                  <Text style={styles.zoneCount}>{count} ({pct}%)</Text>
                  <View style={styles.zoneTrack}>
                    <View style={[styles.zoneFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              )
            })}
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
  loadingText: { color: COLORS.textMuted, fontSize: 13 },

  section: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 18 },
  card:    { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue:{ fontSize: 28, fontWeight: '800', color: COLORS.text },
  statLabel:{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  tickRow:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  tickLabel: { fontSize: 12, color: COLORS.textMuted },
  tickValue: { fontSize: 12, color: '#22d3ee', fontVariant: ['tabular-nums'] },

  zoneRow:   { marginBottom: 12 },
  zoneName:  { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  zoneCount: { fontSize: 11, color: COLORS.textMuted, marginBottom: 5 },
  zoneTrack: { height: 4, backgroundColor: '#0e2040', borderRadius: 2, overflow: 'hidden' },
  zoneFill:  { height: 4, borderRadius: 2 },
})
