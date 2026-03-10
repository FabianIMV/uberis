import { StyleSheet, Text, View } from 'react-native'
import { COLORS, TRAIT_LABEL } from '../constants/theme'

const TRAIT_COLOR: Record<string, string> = {
  curiosity:      '#22d3ee',
  empathy:        '#f472b6',
  aggression:     '#ef4444',
  creativity:     '#a78bfa',
  survival_drive: '#34d399',
}

interface Props {
  trait: string
  value: number
}

export default function GenomeBar({ trait, value }: Props) {
  const color = TRAIT_COLOR[trait] ?? '#94a3b8'
  const pct = Math.round((value ?? 0) * 100)
  const label = TRAIT_LABEL[trait] ?? trait

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 0.8,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:   { fontSize: 12, color: COLORS.textMuted },
  value:   { fontSize: 12, fontVariant: ['tabular-nums'] },
  track:   { height: 4, backgroundColor: '#0e2040', borderRadius: 2, overflow: 'hidden' },
  fill:    { height: 4, borderRadius: 2 },
})
