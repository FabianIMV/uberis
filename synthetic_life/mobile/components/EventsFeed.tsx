import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LiveEvent } from '@/engine/types';
import { BIOME_META, COLORS, EVENT_CATEGORY_META } from '@/constants/theme';

interface Props {
  events: LiveEvent[];
  onPressEntity?: (entityId: number) => void;
  onPressLocation?: (x: number, y: number) => void;
  ListHeaderComponent?: React.JSX.Element;
}

export default function EventsFeed({
  events,
  onPressEntity,
  onPressLocation,
  ListHeaderComponent,
}: Props) {
  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Ionicons name="sparkles-outline" size={28} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>El pergamino cósmico aguarda</Text>
          <Text style={styles.emptySub}>
            A medida que las criaturas nazcan, descubran tecnologías o funden clanes, sus
            hazañas quedarán grabadas aquí.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = EVENT_CATEGORY_META[item.category] ?? {
          labelEs: item.category,
          color: COLORS.cyan,
          icon: 'ellipse',
        };
        const biomeMeta = item.biome ? BIOME_META[item.biome] : null;
        const firstEntityId = item.entityIds?.[0];
        const hasCoords = item.x != null && item.y != null;

        return (
          <View
            style={[
              styles.card,
              item.important && {
                borderColor: `${meta.color}66`,
                backgroundColor: '#0B1730',
              },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconBadge, { backgroundColor: `${meta.color}20` }]}>
                <Ionicons
                  name={meta.icon as keyof typeof Ionicons.glyphMap}
                  size={15}
                  color={meta.color}
                />
              </View>

              <View style={styles.metaRow}>
                <Text style={[styles.catLabel, { color: meta.color }]}>
                  {meta.labelEs.toUpperCase()}
                </Text>
                {biomeMeta && (
                  <Text style={[styles.biomeTag, { color: biomeMeta.color }]}>
                    · {biomeMeta.shortEs}
                  </Text>
                )}
              </View>

              <Text style={styles.tickText}>Ciclo {item.tick}</Text>
            </View>

            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.descText}>{item.description}</Text>

            {(firstEntityId != null || hasCoords) && (
              <View style={styles.footerActions}>
                {firstEntityId != null && onPressEntity && (
                  <Pressable
                    onPress={() => onPressEntity(firstEntityId)}
                    style={({ pressed }) => [styles.linkChip, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="person-circle-outline" size={13} color={COLORS.cyan} />
                    <Text style={styles.linkChipText}>Ver Ser</Text>
                  </Pressable>
                )}

                {hasCoords && onPressLocation && (
                  <Pressable
                    onPress={() => onPressLocation(item.x!, item.y!)}
                    style={({ pressed }) => [styles.linkChip, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="locate-outline" size={13} color={COLORS.gold} />
                    <Text style={[styles.linkChipText, { color: COLORS.gold }]}>
                      Ir al Mapa
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    gap: 10,
  },
  emptyBox: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    gap: 5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  biomeTag: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  tickText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 175, 203, 0.09)',
  },
  linkChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cyan,
  },
});
