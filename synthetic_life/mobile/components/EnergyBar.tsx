import { StyleSheet, Text, View } from 'react-native'
import { COLORS } from '../constants/theme'

export default function EnergyBar({ energy }: { energy: number }) {
  const pct = Math.round(Math.max(0, Math.min(100, energy)))
  const color = pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444'

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>Energy</Text>
        <Text style={[styles.value, { color }]}>{pct}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: color, shadowColor: color, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  row:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: COLORS.textMuted },
  value: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 6, backgroundColor: '#0e2040', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
})
