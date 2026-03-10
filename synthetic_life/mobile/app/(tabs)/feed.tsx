import { StyleSheet, Text, View } from 'react-native'
import EventsFeed from '../../components/EventsFeed'
import { useSimulation } from '../../context/SimulationContext'
import { COLORS } from '../../constants/theme'

export default function FeedScreen() {
  const { liveEvents } = useSimulation()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed en Vivo</Text>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.status}>Simulación local</Text>
        </View>
      </View>
      <EventsFeed events={liveEvents} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  status:    { fontSize: 11, color: COLORS.textMuted },
})
