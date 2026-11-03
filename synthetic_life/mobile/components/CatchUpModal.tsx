import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CatchUpSummary } from '@/engine/types';
import { COLORS, formatDurationAwayEs } from '@/constants/theme';

interface Props {
  summary: CatchUpSummary | null;
  onDismiss: () => void;
}

export default function CatchUpModal({ summary, onDismiss }: Props) {
  if (!summary) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconRing}>
            <Ionicons name="planet-outline" size={28} color={COLORS.cyan} />
          </View>

          <Text style={styles.overline}>CRÓNICA DE AUSENCIA</Text>
          <Text style={styles.title}>El mundo siguió respirando</Text>
          <Text style={styles.subtitle}>
            Durante <Text style={styles.highlight}>{formatDurationAwayEs(summary.msAway)}</Text> se
            simularon <Text style={styles.highlight}>{summary.ticksSimulated} ciclos</Text>{' '}
            ecológicos autónomos.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.emerald }]}>
                +{summary.births}
              </Text>
              <Text style={styles.statLabel}>Nacimientos</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.textSecondary }]}>
                {summary.deaths}
              </Text>
              <Text style={styles.statLabel}>Tránsitos</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.gold }]}>
                {summary.discoveries}
              </Text>
              <Text style={styles.statLabel}>Avances</Text>
            </View>
          </View>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.primaryBtnText}>Contemplar la Biosfera</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 14, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  overline: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: COLORS.cyan,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  highlight: {
    color: COLORS.text,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginVertical: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: COLORS.cyan,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#040814',
  },
});
