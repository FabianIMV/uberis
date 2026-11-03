import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSimulation } from '@/context/SimulationContext';
import { useObservatoryAnalytics } from '@/hooks/useObservatory';
import type { BiomeId, Entity, Tribe } from '@/engine/types';
import MorphologyAvatar from '@/components/MorphologyAvatar';
import EnergyBar from '@/components/EnergyBar';
import {
  ACTIVITY_META,
  BIOME_META,
  COLORS,
  LIFE_STAGE_META,
  TECH_META,
  emotionColor,
  emotionLabelEs,
} from '@/constants/theme';
import { hapticSelection } from '@/audio/haptics';

type DirectoryTab = 'living' | 'tribes' | 'species' | 'memorial';

const BIOME_FILTERS: Array<BiomeId | 'all'> = [
  'all',
  'eden',
  'lagoon',
  'steppe',
  'archive',
  'ashlands',
  'abyss',
];

const CREST_ES: Record<string, string> = {
  none: 'Sin cresta',
  crown: 'Corona real',
  antlers: 'Astas arbóreas',
  halo: 'Halo astral',
  fins: 'Aletas coralinas',
  horns: 'Cuernos curvos',
};

const TAIL_ES: Record<string, string> = {
  none: 'Sin cola',
  wispy: 'Estela etérea',
  twin: 'Doble filamento',
  segmented: 'Segmentada',
};

const PATTERN_ES: Record<string, string> = {
  solid: 'Liso luminoso',
  spotted: 'Moteado',
  striped: 'Atigrado',
  nebula: 'Nebulosa',
};

export default function EntitiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { simState, setSelectedEntityId, setFollowSelected, focusWorldPoint } =
    useSimulation();
  const { living, fallen, speciesList } = useObservatoryAnalytics();

  const [tab, setTab] = useState<DirectoryTab>('living');
  const [biomeFilter, setBiomeFilter] = useState<BiomeId | 'all'>('all');
  const [query, setQuery] = useState('');

  const tribeById = useMemo(() => {
    const map = new Map<number, Tribe>();
    for (const t of simState.tribes) {
      map.set(t.id, t);
    }
    return map;
  }, [simState.tribes]);

  const filteredLiving = useMemo(() => {
    const q = query.trim().toLowerCase();
    return living.filter((e) => {
      if (biomeFilter !== 'all' && e.currentBiome !== biomeFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.speciesName.toLowerCase().includes(q)
      );
    });
  }, [living, biomeFilter, query]);

  const jumpToCreatureOnMap = (entity: Entity) => {
    hapticSelection();
    setSelectedEntityId(entity.id);
    setFollowSelected(true);
    focusWorldPoint(entity.x, entity.y, 1.05);
    router.navigate('/(tabs)');
  };

  const jumpToTribeOnMap = (tribe: Tribe) => {
    hapticSelection();
    focusWorldPoint(tribe.homeX, tribe.homeY, 0.85);
    router.navigate('/(tabs)');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>CENSO BIOLUMINISCENTE</Text>
          <Text style={styles.title}>Seres y Civilización</Text>
        </View>
        <View style={styles.counterBadge}>
          <Text style={styles.counterNum}>{living.length}</Text>
          <Text style={styles.counterLabel}>vivos</Text>
        </View>
      </View>

      {/* Segmented Directory Selector */}
      <View style={styles.tabSwitch}>
        {(
          [
            { id: 'living', label: `Vivos (${living.length})` },
            { id: 'tribes', label: `Clanes (${simState.tribes.length})` },
            { id: 'species', label: `Especies (${speciesList.length})` },
            { id: 'memorial', label: `Caídos (${fallen.length})` },
          ] as Array<{ id: DirectoryTab; label: string }>
        ).map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                hapticSelection();
                setTab(item.id);
              }}
              style={[styles.segBtn, active && styles.segBtnActive]}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* LIVING CREATURES DIRECTORY */}
      {tab === 'living' && (
        <>
          <View style={styles.filterBlock}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nombre o especie…"
                placeholderTextColor={COLORS.textMuted}
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.biomeChipsRow}
            >
              {BIOME_FILTERS.map((b) => {
                const active = biomeFilter === b;
                const meta = b === 'all' ? null : BIOME_META[b];
                const chipColor = meta?.color ?? COLORS.cyan;
                return (
                  <Pressable
                    key={b}
                    onPress={() => {
                      hapticSelection();
                      setBiomeFilter(b);
                    }}
                    style={[
                      styles.biomeChip,
                      active && {
                        backgroundColor: `${chipColor}24`,
                        borderColor: chipColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.biomeChipText,
                        active && { color: chipColor, fontWeight: '700' },
                      ]}
                    >
                      {b === 'all' ? 'Todos' : meta?.shortEs}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filteredLiving}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Ningún ser coincide con el filtro</Text>
                <Text style={styles.emptySub}>
                  Prueba cambiar de bioma o usa Chispa de Génesis en el mapa para crear nueva vida.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const tribe = item.tribeId ? tribeById.get(item.tribeId) ?? null : null;
              const emoCol = emotionColor(item.emotionalState?.emotion);
              const actMeta = ACTIVITY_META[item.activity] ?? ACTIVITY_META.wandering;
              const biomeMeta = BIOME_META[item.currentBiome];
              const stageMeta = LIFE_STAGE_META[item.lifeStage];

              return (
                <Pressable
                  onPress={() => router.push(`/entity/${item.id}`)}
                  style={({ pressed }) => [
                    styles.entityCard,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <View style={styles.entityTopRow}>
                    <MorphologyAvatar
                      morphology={item.morphology}
                      lifeStage={item.lifeStage}
                      bioluminescence={item.genome.bioluminescence}
                      isAlive
                      tribeColor={tribe?.color ?? null}
                      size={56}
                    />

                    <View style={styles.entityMainInfo}>
                      <View style={styles.nameLine}>
                        <Text style={styles.entityName}>{item.name}</Text>
                        <Text style={[styles.stageTag, { color: stageMeta.color }]}>
                          {stageMeta.labelEs} · G{item.generation}
                        </Text>
                      </View>

                      <Text style={styles.speciesLine} numberOfLines={1}>
                        {item.speciesName}
                        {tribe ? ` · Clan ${tribe.name}` : ''}
                      </Text>

                      <View style={styles.pillsLine}>
                        <View style={[styles.tagPill, { backgroundColor: `${emoCol}20` }]}>
                          <Text style={[styles.tagPillText, { color: emoCol }]}>
                            {emotionLabelEs(item.emotionalState?.emotion)}
                          </Text>
                        </View>
                        <View style={[styles.tagPill, { backgroundColor: `${actMeta.color}1E` }]}>
                          <Text style={[styles.tagPillText, { color: actMeta.color }]}>
                            {actMeta.shortEs}
                          </Text>
                        </View>
                        {biomeMeta && (
                          <View
                            style={[styles.tagPill, { backgroundColor: `${biomeMeta.color}1A` }]}
                          >
                            <Text style={[styles.tagPillText, { color: biomeMeta.color }]}>
                              {biomeMeta.shortEs}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => jumpToCreatureOnMap(item)}
                      hitSlop={8}
                      style={styles.locateBtn}
                      accessibilityLabel="Localizar criatura en el mapa"
                    >
                      <Ionicons name="locate-outline" size={17} color={COLORS.cyan} />
                    </Pressable>
                  </View>

                  {item.lastThought && (
                    <Text style={styles.thoughtSnippet} numberOfLines={2}>
                      “{item.lastThought}”
                    </Text>
                  )}

                  <View style={styles.miniBarsRow}>
                    <View style={styles.miniBarWrap}>
                      <EnergyBar label="Energía" value={item.energy} color={COLORS.emerald} compact />
                    </View>
                    <View style={styles.miniBarWrap}>
                      <EnergyBar label="Agua" value={item.hydration} color={COLORS.sky} compact />
                    </View>
                    <View style={styles.miniBarWrap}>
                      <EnergyBar
                        label="Intelecto"
                        value={Math.round((item.intelligence ?? 0) * 100)}
                        color={COLORS.violet}
                        compact
                      />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}

      {/* TRIBES / CLANS DIRECTORY */}
      {tab === 'tribes' && (
        <FlatList
          data={simState.tribes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="flag-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Aún no se han fundado clanes</Text>
              <Text style={styles.emptySub}>
                Cuando seres sociables convivan y compartan sabiduría, erigirán tótems y fundarán
                sus propios linajes culturales.
              </Text>
            </View>
          }
          renderItem={({ item: tribe }) => {
            const biomeMeta = BIOME_META[tribe.homeBiome];
            const leader = tribe.leaderId
              ? simState.entities.find((e) => e.id === tribe.leaderId)
              : null;

            return (
              <View style={[styles.tribeCard, { borderLeftColor: tribe.color }]}>
                <View style={styles.tribeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tribeName, { color: tribe.color }]}>
                      Clan {tribe.name}
                    </Text>
                    <Text style={styles.tribeMotto}>“{tribe.motto}”</Text>
                  </View>
                  <Pressable
                    onPress={() => jumpToTribeOnMap(tribe)}
                    style={styles.locateBtn}
                  >
                    <Ionicons name="locate-outline" size={17} color={tribe.color} />
                  </Pressable>
                </View>

                <View style={styles.tribeMetaRow}>
                  <Text style={styles.tribeMetaItem}>
                    Miembros vivos: <Text style={styles.boldWhite}>{tribe.memberIds.length}</Text>
                  </Text>
                  {biomeMeta && (
                    <Text style={[styles.tribeMetaItem, { color: biomeMeta.color }]}>
                      · {biomeMeta.nameEs}
                    </Text>
                  )}
                  {leader && (
                    <Text style={styles.tribeMetaItem}>
                      · Guía: <Text style={styles.boldWhite}>{leader.name}</Text>
                    </Text>
                  )}
                </View>

                {tribe.unlockedTechs.length > 0 && (
                  <View style={styles.techRow}>
                    {tribe.unlockedTechs.map((techId) => {
                      const tm = TECH_META[techId];
                      if (!tm) return null;
                      return (
                        <View
                          key={techId}
                          style={[styles.techChip, { borderColor: `${tm.color}55` }]}
                        >
                          <Ionicons
                            name={tm.icon as keyof typeof Ionicons.glyphMap}
                            size={11}
                            color={tm.color}
                          />
                          <Text style={[styles.techChipText, { color: tm.color }]}>
                            {tm.labelEs}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {tribe.lexicon.length > 0 && (
                  <Text style={styles.lexiconText}>
                    Léxico sagrado: {tribe.lexicon.slice(0, 6).join(' · ')}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}

      {/* SPECIES DIRECTORY */}
      {tab === 'species' && (
        <FlatList
          data={speciesList}
          keyExtractor={(item) => item.speciesId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: sp }) => {
            const rep = sp.representative;
            const bm = BIOME_META[sp.dominantBiome];
            return (
              <Pressable
                onPress={() => router.push(`/entity/${rep.id}`)}
                style={styles.entityCard}
              >
                <View style={styles.entityTopRow}>
                  <MorphologyAvatar
                    morphology={rep.morphology}
                    lifeStage="adult"
                    bioluminescence={rep.genome.bioluminescence}
                    isAlive={sp.livingCount > 0}
                    size={58}
                  />
                  <View style={styles.entityMainInfo}>
                    <Text style={styles.speciesTitle}>{sp.speciesName}</Text>
                    <Text style={styles.speciesLine}>
                      {sp.livingCount > 0
                        ? `${sp.livingCount} ejemplares vivos (${sp.totalEver} históricos)`
                        : `Especie extinta (${sp.totalEver} históricos)`}
                    </Text>
                    <View style={styles.pillsLine}>
                      <View style={[styles.tagPill, { backgroundColor: `${bm.color}20` }]}>
                        <Text style={[styles.tagPillText, { color: bm.color }]}>
                          Hábitat: {bm.shortEs}
                        </Text>
                      </View>
                      <View style={[styles.tagPill, { backgroundColor: COLORS.violetSoft }]}>
                        <Text style={[styles.tagPillText, { color: COLORS.violet }]}>
                          Intelecto medio {Math.round(sp.avgIntelligence * 100)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.morphSummary}>
                  Fenotipo: {rep.morphology.eyeCount} ojo(s) ·{' '}
                  {CREST_ES[rep.morphology.crest] ?? rep.morphology.crest} ·{' '}
                  {TAIL_ES[rep.morphology.tail] ?? rep.morphology.tail} ·{' '}
                  {PATTERN_ES[rep.morphology.pattern] ?? rep.morphology.pattern}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* FALLEN MEMORIAL */}
      {tab === 'memorial' && (
        <FlatList
          data={fallen}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="sparkles-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Ningún ancestro ha partido aún</Text>
              <Text style={styles.emptySub}>
                Aquí reposarán las últimas palabras y el legado espiritual de los seres caídos.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/entity/${item.id}`)}
              style={styles.memorialCard}
            >
              <View style={styles.entityTopRow}>
                <MorphologyAvatar
                  morphology={item.morphology}
                  lifeStage={item.lifeStage}
                  bioluminescence={0.2}
                  isAlive={false}
                  size={52}
                />
                <View style={styles.entityMainInfo}>
                  <Text style={styles.entityName}>{item.name}</Text>
                  <Text style={styles.speciesLine}>
                    {item.speciesName} · Gen {item.generation} · Vivió {item.ageTicks} ciclos
                  </Text>
                  {item.finalMessage?.causeOfDeath && (
                    <Text style={styles.causeText}>
                      Causa: {item.finalMessage.causeOfDeath}
                    </Text>
                  )}
                </View>
              </View>

              {item.finalMessage ? (
                <View style={styles.epitaphBox}>
                  <Text style={styles.epitaphQuote}>
                    “{item.finalMessage.finalWords}”
                  </Text>
                  <Text style={styles.epitaphGift}>
                    Legado: {item.finalMessage.giftToWorld}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  counterBadge: {
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: 'rgba(52, 224, 143, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 5,
    alignItems: 'center',
  },
  counterNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.emerald,
    fontVariant: ['tabular-nums'],
  },
  counterLabel: {
    fontSize: 9.5,
    color: COLORS.emerald,
    fontWeight: '700',
  },
  tabSwitch: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 3,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 11,
    alignItems: 'center',
  },
  segBtnActive: {
    backgroundColor: COLORS.bgElevated,
  },
  segText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  segTextActive: {
    color: COLORS.cyan,
    fontWeight: '800',
  },
  filterBlock: {
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  biomeChipsRow: {
    gap: 6,
    paddingBottom: 2,
  },
  biomeChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  biomeChipText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    gap: 10,
  },
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
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
  entityCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    gap: 9,
  },
  entityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entityMainInfo: {
    flex: 1,
    gap: 2.5,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  entityName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.text,
  },
  stageTag: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  speciesTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    fontStyle: 'italic',
    color: COLORS.text,
  },
  speciesLine: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  pillsLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  locateBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(148, 175, 203, 0.09)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thoughtSnippet: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  miniBarsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBarWrap: {
    flex: 1,
  },
  tribeCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
  },
  tribeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tribeName: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  tribeMotto: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tribeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tribeMetaItem: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  boldWhite: {
    color: COLORS.text,
    fontWeight: '700',
  },
  techRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: 'rgba(14, 27, 52, 0.7)',
  },
  techChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  lexiconText: {
    fontSize: 11.5,
    color: COLORS.cyan,
    fontStyle: 'italic',
  },
  morphSummary: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  memorialCard: {
    backgroundColor: '#070E1D',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    padding: 13,
    gap: 8,
  },
  causeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  epitaphBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  epitaphQuote: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: COLORS.text,
  },
  epitaphGift: {
    fontSize: 11,
    color: COLORS.cyan,
  },
});
