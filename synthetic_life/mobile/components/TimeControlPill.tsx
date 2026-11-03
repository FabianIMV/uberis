import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SimSpeed } from '@/engine/types';
import { COLORS } from '@/constants/theme';

interface Props {
  speed: SimSpeed;
  onChangeSpeed: (speed: SimSpeed) => void;
  onManualTick: () => void;
}

const SPEEDS: Array<{ value: SimSpeed; label: string }> = [
  { value: 0, label: '⏸' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

export default function TimeControlPill({ speed, onChangeSpeed, onManualTick }: Props) {
  return (
    <View style={styles.pill}>
      {SPEEDS.map((item) => {
        const active = speed === item.value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChangeSpeed(item.value)}
            style={({ pressed }) => [
              styles.btn,
              active && styles.btnActive,
              pressed && styles.btnPressed,
            ]}
          >
            {item.value === 0 ? (
              <Ionicons
                name="pause"
                size={12}
                color={active ? '#040814' : COLORS.textSecondary}
              />
            ) : (
              <Text style={[styles.btnText, active && styles.btnTextActive]}>
                {item.label}
              </Text>
            )}
          </Pressable>
        );
      })}

      <View style={styles.divider} />

      <Pressable
        onPress={onManualTick}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
        accessibilityLabel="Impulsar ciclo cognitivo"
      >
        <Ionicons name="play-skip-forward" size={12} color={COLORS.gold} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgGlassStrong,
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  btn: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.cyan,
  },
  btnPressed: {
    opacity: 0.72,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  btnTextActive: {
    color: '#040814',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: 2,
  },
  stepBtn: {
    width: 26,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
