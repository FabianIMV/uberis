import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSimulation } from '@/context/SimulationContext';
import type { LiveEventCategory } from '@/engine/types';
import EventsFeed from '@/components/EventsFeed';
import { COLORS } from '@/constants/theme';
import { hapticSelection } from '@/audio/haptics';

type ChronicleFilter =
  | 'all'
  | 'births'
  | 'speciation'
  | 'civilization'
  | 'philosophy'
  | 'divine'
  | 'hazards';

const FILTERS: Array<{
  id: ChronicleFilter;
  labelEs: string;
  categories?: LiveEventCategory[];
  color: string;
}> = [
  { id: 'all', labelEs: 'Todo', color: COLORS.cyan },
  {
    id: 'births',
    labelEs: 'Nacimientos',
    categories: ['birth', 'romance'],
    color: COLORS.emerald,
  },
  {
    id: 'speciation',
    labelEs: 'Especiación',
    categories: ['speciation'],
    color: '#E879F9',
  },
  {
    id: 'civilization',
    labelEs: 'Clanes y Ciencia',
    categories: ['tribe_founded', 'tech_discovered', 'structure_built'],
    color: COLORS.gold,
  },
  {
    id: 'philosophy',
    labelEs: 'Filosofía',
    categories: ['philosophy', 'encounter'],
    color: COLORS.violet,
  },
  {
    id: 'divine',
    labelEs: 'Intervención Divina',
    categories: ['divine_intervention'],
    color: COLORS.amber,
  },
  {
    id: 'hazards',
    labelEs: 'Clima y Umbra',
    categories: ['predator', 'conflict', 'death', 'world_weather'],
    color: COLORS.crimson,
  },
];

export default function ChroniclesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { simState, focusWorldPoint } = useSimulation();
  const [filter, setFilter] = useState<ChronicleFilter>('all');

  const activeFilterDef = useMemo(
    () => FILTERS.find((f) => f.id === filter) ?? FILTERS[0],
    [filter]
  );

  const filteredEvents = useMemo(() => {
    const all = simState.liveEvents ?? [];
    if (!activeFilterDef.categories) return all;
    const allowed = new Set(activeFilterDef.categories);
    return all.filter((ev) => allowed.has(ev.category));
  }, [simState.liveEvents, activeFilterDef]);

  const world = simState.world;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.overline}>ARCHIVO HISTÓRICO</Text>
        <Text style={styles.title}>Crónicas del Continente</Text>
      </View>

      {/* Summary Counters */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryNum, { color: COLORS.emerald }]}>
            {world?.totalBirths ?? 0}
          </Text>
          <Text style={styles.summaryLabel}>Nacidos</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryNum, { color: '#E879F9' }]}>
            {world?.totalSpeciations ?? 0}
          </Text>
          <Text style={styles.summaryLabel}>Especiaciones</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryNum, { color: COLORS.gold }]}>
            {simState.tribes.length}
          </Text>
          <Text style={styles.summaryLabel}>Clanes</Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryNum, { color: COLORS.textSecondary }]}>
            {world?.totalDeaths ?? 0}
          </Text>
          <Text style={styles.summaryLabel}>Tránsitos</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <Pressable
                key={f.id}
                onPress={() => {
                  hapticSelection();
                  setFilter(f.id);
                }}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: `${f.color}24`,
                    borderColor: f.color,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && { color: f.color, fontWeight: '800' },
                  ]}
                >
                  {f.labelEs}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <EventsFeed
        events={filteredEvents}
        onPressEntity={(entityId) => router.push(`/entity/${entityId}`)}
        onPressLocation={(x, y) => {
          focusWorldPoint(x, y, 0.95);
          router.navigate('/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.cyan,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryStrip: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  summaryCell: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 9,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  filterWrap: {
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 13,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
