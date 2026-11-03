import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DivinePowerId } from '@/engine/types';
import { COLORS, DIVINE_POWERS_ORDER, DIVINE_POWER_META } from '@/constants/theme';

interface Props {
  activePower: DivinePowerId;
  onSelectPower: (power: DivinePowerId) => void;
}

export default function DivinePowersBar({ activePower, onSelectPower }: Props) {
  return (
    <View style={styles.dockOuter}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DIVINE_POWERS_ORDER.map((powerId) => {
          const meta = DIVINE_POWER_META[powerId];
          const isActive = activePower === powerId;
          return (
            <Pressable
              key={powerId}
              onPress={() => onSelectPower(powerId)}
              style={({ pressed }) => [
                styles.powerItem,
                isActive && {
                  backgroundColor: meta.glow,
                  borderColor: meta.color,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  isActive && { backgroundColor: meta.color },
                ]}
              >
                <Ionicons
                  name={meta.icon as keyof typeof Ionicons.glyphMap}
                  size={17}
                  color={isActive ? '#040814' : meta.color}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && { color: COLORS.text, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {meta.shortEs}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    borderRadius: 22,
    backgroundColor: COLORS.bgGlassStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 6,
    alignItems: 'center',
  },
  powerItem: {
    minWidth: 62,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.96 }],
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(148, 175, 203, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.15,
  },
});
