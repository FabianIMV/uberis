import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';

interface VitalBarProps {
  label?: string;
  value: number; // 0..100
  maxValue?: number;
  color?: string;
  compact?: boolean;
  showValue?: boolean;
}

export default function EnergyBar({
  label,
  value,
  maxValue = 100,
  color,
  compact = false,
  showValue = true,
}: VitalBarProps) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, maxValue)) * 100));
  const resolvedColor =
    color ??
    (pct > 60 ? COLORS.emerald : pct > 28 ? COLORS.gold : COLORS.crimson);

  return (
    <View style={styles.root}>
      {(label || showValue) && (
        <View style={styles.headerRow}>
          {label ? (
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <View />
          )}
          {showValue && (
            <Text style={[styles.valueText, { color: resolvedColor }, compact && styles.valueCompact]}>
              {Math.round(pct)}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, compact && styles.trackCompact]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: resolvedColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: 10,
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    fontSize: 10,
  },
  track: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 175, 203, 0.12)',
    overflow: 'hidden',
  },
  trackCompact: {
    height: 4.5,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
