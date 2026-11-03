import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Entity, Tribe } from '@/engine/types';
import {
  ACTIVITY_META,
  BIOME_META,
  COLORS,
  LIFE_STAGE_META,
  emotionColor,
  emotionLabelEs,
} from '@/constants/theme';
import MorphologyAvatar from './MorphologyAvatar';
import EnergyBar from './EnergyBar';

interface Props {
  entity: Entity;
  tribe: Tribe | null;
  followSelected: boolean;
  onToggleFollow: () => void;
  onFeed: () => void;
  onHeal: () => void;
  onBless: () => void;
  onClose: () => void;
}

export default function CreatureInspectorSheet({
  entity,
  tribe,
  followSelected,
  onToggleFollow,
  onFeed,
  onHeal,
  onBless,
  onClose,
}: Props) {
  const router = useRouter();
  const emoCol = emotionColor(entity.emotionalState?.emotion);
  const emoLabel = emotionLabelEs(entity.emotionalState?.emotion);
  const actMeta = ACTIVITY_META[entity.activity] ?? ACTIVITY_META.wandering;
  const biomeMeta = BIOME_META[entity.currentBiome];
  const stageMeta = LIFE_STAGE_META[entity.lifeStage];

  const activeQuote =
    (entity.speechTimerMs > 0 && entity.speechBubble) ||
    entity.lastThought ||
    entity.currentDesire ||
    'Sintiendo el pulso luminoso del continente…';

  return (
    <View style={styles.sheet}>
      {/* Header Row */}
      <View style={styles.topRow}>
        <MorphologyAvatar
          morphology={entity.morphology}
          lifeStage={entity.lifeStage}
          bioluminescence={entity.genome.bioluminescence}
          isAlive={entity.isAlive}
          tribeColor={tribe?.color ?? null}
          size={58}
        />

        <View style={styles.titleBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {entity.name}
            </Text>
            <View style={[styles.stageBadge, { borderColor: stageMeta.color }]}>
              <Text style={[styles.stageText, { color: stageMeta.color }]}>
                {stageMeta.labelEs} · Gen {entity.generation}
              </Text>
            </View>
          </View>

          <Text style={styles.speciesText} numberOfLines={1}>
            {entity.speciesName}
            {tribe ? `  ·  Clan ${tribe.name}` : '  ·  Nómada'}
          </Text>

          <View style={styles.statusBadgesRow}>
            <View style={[styles.miniPill, { backgroundColor: `${emoCol}22` }]}>
              <View style={[styles.dot, { backgroundColor: emoCol }]} />
              <Text style={[styles.miniPillText, { color: emoCol }]}>{emoLabel}</Text>
            </View>

            <View style={[styles.miniPill, { backgroundColor: `${actMeta.color}1F` }]}>
              <Text style={[styles.miniPillText, { color: actMeta.color }]}>
                {actMeta.shortEs}
              </Text>
            </View>

            {biomeMeta && (
              <View style={[styles.miniPill, { backgroundColor: `${biomeMeta.color}1C` }]}>
                <Text style={[styles.miniPillText, { color: biomeMeta.color }]}>
                  {biomeMeta.shortEs}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      {/* Thought / Speech Stream */}
      <View style={[styles.thoughtBox, { borderLeftColor: emoCol }]}>
        <Text style={styles.thoughtText} numberOfLines={2}>
          “{activeQuote}”
        </Text>
      </View>

      {/* 4 Vital Telemetry Bars */}
      <View style={styles.vitalsGrid}>
        <View style={styles.vitalCol}>
          <EnergyBar label="Energía" value={entity.energy} color={COLORS.emerald} compact />
        </View>
        <View style={styles.vitalCol}>
          <EnergyBar label="Agua" value={entity.hydration} color={COLORS.sky} compact />
        </View>
        <View style={styles.vitalCol}>
          <EnergyBar label="Salud" value={entity.health} color={COLORS.rose} compact />
        </View>
        <View style={styles.vitalCol}>
          <EnergyBar label="Calor" value={entity.warmth} color={COLORS.amber} compact />
        </View>
      </View>

      {/* Quick Actions Row */}
      <View style={styles.actionsRow}>
        {entity.isAlive && (
          <>
            <Pressable
              onPress={onFeed}
              style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
            >
              <Ionicons name="sparkles-outline" size={14} color={COLORS.gold} />
              <Text style={[styles.actionChipText, { color: COLORS.gold }]}>Nutrir</Text>
            </Pressable>

            <Pressable
              onPress={onHeal}
              style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
            >
              <Ionicons name="heart-outline" size={14} color={COLORS.emerald} />
              <Text style={[styles.actionChipText, { color: COLORS.emerald }]}>Sanar</Text>
            </Pressable>

            <Pressable
              onPress={onBless}
              style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
            >
              <Ionicons name="prism-outline" size={14} color={COLORS.violet} />
              <Text style={[styles.actionChipText, { color: COLORS.violet }]}>Bendecir</Text>
            </Pressable>

            <Pressable
              onPress={onToggleFollow}
              style={({ pressed }) => [
                styles.actionChip,
                followSelected && styles.followActiveChip,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={followSelected ? 'locate' : 'locate-outline'}
                size={14}
                color={followSelected ? '#040814' : COLORS.cyan}
              />
              <Text
                style={[
                  styles.actionChipText,
                  { color: followSelected ? '#040814' : COLORS.cyan },
                ]}
              >
                {followSelected ? 'Siguiendo' : 'Seguir'}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          onPress={() => router.push(`/entity/${entity.id}`)}
          style={({ pressed }) => [styles.deepMindBtn, pressed && styles.pressed]}
        >
          <Text style={styles.deepMindText}>Mente</Text>
          <Ionicons name="chevron-forward" size={14} color="#040814" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 22,
    backgroundColor: COLORS.bgGlassStrong,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    padding: 12,
    gap: 9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  stageBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  stageText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  speciesText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
  },
  dot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  miniPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 175, 203, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  thoughtBox: {
    backgroundColor: 'rgba(14, 27, 52, 0.72)',
    borderLeftWidth: 2.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  thoughtText: {
    fontSize: 12,
    lineHeight: 16.5,
    color: COLORS.text,
    fontStyle: 'italic',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalCol: {
    width: '48%',
    flexGrow: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 175, 203, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followActiveChip: {
    backgroundColor: COLORS.cyan,
    borderColor: COLORS.cyan,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deepMindBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 12,
    backgroundColor: COLORS.cyan,
  },
  deepMindText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#040814',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
