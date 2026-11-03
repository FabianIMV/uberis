import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useEntityById,
  useEntityLogs,
  useSimulation,
} from '@/context/SimulationContext';
import MorphologyAvatar from '@/components/MorphologyAvatar';
import EnergyBar from '@/components/EnergyBar';
import GenomeBar from '@/components/GenomeBar';
import {
  ACTIVITY_META,
  BIOME_META,
  COLORS,
  LIFE_STAGE_META,
  emotionColor,
  emotionLabelEs,
} from '@/constants/theme';
import { hapticSelection } from '@/audio/haptics';
import type { Entity } from '@/engine/types';

const VALENCE_META: Record<string, { labelEs: string; color: string }> = {
  mate: { labelEs: 'Pareja', color: COLORS.rose },
  kin: { labelEs: 'Sangre', color: COLORS.gold },
  friend: { labelEs: 'Aliado', color: COLORS.emerald },
  mentor: { labelEs: 'Mentor', color: COLORS.violet },
  rival: { labelEs: 'Rival', color: COLORS.crimson },
  neutral: { labelEs: 'Conocido', color: COLORS.textSecondary },
};

function LineageMiniCard({
  item,
  roleLabel,
  onPress,
}: {
  item: Entity;
  roleLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.lineageNode, pressed && { opacity: 0.78 }]}
    >
      <MorphologyAvatar
        morphology={item.morphology}
        lifeStage={item.lifeStage}
        bioluminescence={item.genome.bioluminescence}
        isAlive={item.isAlive}
        size={42}
      />
      <Text style={styles.lineageRole}>{roleLabel}</Text>
      <Text style={styles.lineageName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.lineageSub}>
        G{item.generation} · {item.isAlive ? 'Vivo' : 'Caído'}
      </Text>
    </Pressable>
  );
}

export default function EntityDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entityId = Number(params.id);

  const {
    simState,
    feedEntity,
    healEntity,
    blessEntity,
    inspectLineage,
    setSelectedEntityId,
    setFollowSelected,
    focusWorldPoint,
  } = useSimulation();

  const entity = useEntityById(Number.isFinite(entityId) ? entityId : null);
  const logs = useEntityLogs(Number.isFinite(entityId) ? entityId : null);

  const lineage = useMemo(() => {
    if (!Number.isFinite(entityId)) {
      return { entity: null, parents: [], children: [], ancestors: [] };
    }
    return inspectLineage(entityId);
  }, [entityId, inspectLineage, simState.entities]);

  const tribe = useMemo(() => {
    if (!entity?.tribeId) return null;
    return simState.tribes.find((t) => t.id === entity.tribeId) ?? null;
  }, [entity?.tribeId, simState.tribes]);

  if (!entity) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topNav}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </Pressable>
          <Text style={styles.navTitle}>Expediente no encontrado</Text>
        </View>
        <View style={styles.notFoundBox}>
          <Text style={styles.notFoundText}>
            Este ser ya se ha disuelto en la memoria ancestral del continente.
          </Text>
        </View>
      </View>
    );
  }

  const emoCol = emotionColor(entity.emotionalState?.emotion);
  const actMeta = ACTIVITY_META[entity.activity] ?? ACTIVITY_META.wandering;
  const biomeMeta = BIOME_META[entity.currentBiome];
  const stageMeta = LIFE_STAGE_META[entity.lifeStage];
  const relationshipsList = Object.values(entity.relationships ?? {}).sort(
    (a, b) => Math.abs(b.affinity) - Math.abs(a.affinity)
  );
  const beliefEntries = Object.entries(entity.beliefs ?? {});

  const handleLocateOnMap = () => {
    hapticSelection();
    setSelectedEntityId(entity.id);
    setFollowSelected(true);
    focusWorldPoint(entity.x, entity.y, 1.15);
    router.navigate('/(tabs)');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* Custom Observatory Header */}
      <View style={styles.topNav}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.72 }]}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.navOverline}>EXPEDIENTE DE CONSCIENCIA</Text>
          <Text style={styles.navTitle} numberOfLines={1}>
            {entity.name}
          </Text>
        </View>

        {entity.isAlive && (
          <Pressable
            onPress={handleLocateOnMap}
            style={({ pressed }) => [styles.mapJumpBtn, pressed && { opacity: 0.78 }]}
          >
            <Ionicons name="locate" size={15} color="#040814" />
            <Text style={styles.mapJumpText}>Mapa</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO MORPHOLOGY & IDENTITY CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <MorphologyAvatar
              morphology={entity.morphology}
              lifeStage={entity.lifeStage}
              bioluminescence={entity.genome.bioluminescence}
              isAlive={entity.isAlive}
              tribeColor={tribe?.color ?? null}
              size={106}
            />

            <View style={styles.heroMeta}>
              <Text style={styles.speciesHero}>{entity.speciesName}</Text>
              <Text style={styles.subMetaText}>
                {stageMeta.labelEs} · Generación {entity.generation}
              </Text>
              <Text style={styles.subMetaText}>
                Edad: {entity.ageTicks} / {entity.maxAgeTicks} ciclos
              </Text>
              {tribe ? (
                <Text style={[styles.clanBadgeText, { color: tribe.color }]}>
                  Clan {tribe.name}
                </Text>
              ) : (
                <Text style={styles.subMetaText}>Espíritu nómada sin clan</Text>
              )}

              <View style={styles.badgesWrap}>
                <View style={[styles.pill, { backgroundColor: `${emoCol}22` }]}>
                  <Text style={[styles.pillText, { color: emoCol }]}>
                    {emotionLabelEs(entity.emotionalState?.emotion)} (
                    {Math.round((entity.emotionalState?.intensity ?? 0.5) * 100)}%)
                  </Text>
                </View>

                {entity.isAlive && (
                  <View style={[styles.pill, { backgroundColor: `${actMeta.color}1E` }]}>
                    <Text style={[styles.pillText, { color: actMeta.color }]}>
                      {actMeta.labelEs}
                    </Text>
                  </View>
                )}

                {biomeMeta && (
                  <View style={[styles.pill, { backgroundColor: `${biomeMeta.color}1C` }]}>
                    <Text style={[styles.pillText, { color: biomeMeta.color }]}>
                      {biomeMeta.nameEs}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {entity.isAlive && (
            <View style={styles.divineRow}>
              <Pressable
                onPress={() => feedEntity(entity.id)}
                style={({ pressed }) => [styles.divineBtn, pressed && { opacity: 0.76 }]}
              >
                <Ionicons name="sparkles-outline" size={15} color={COLORS.gold} />
                <Text style={[styles.divineBtnText, { color: COLORS.gold }]}>Nutrir</Text>
              </Pressable>

              <Pressable
                onPress={() => healEntity(entity.id)}
                style={({ pressed }) => [styles.divineBtn, pressed && { opacity: 0.76 }]}
              >
                <Ionicons name="heart-outline" size={15} color={COLORS.emerald} />
                <Text style={[styles.divineBtnText, { color: COLORS.emerald }]}>Sanar</Text>
              </Pressable>

              <Pressable
                onPress={() => blessEntity(entity.id)}
                style={({ pressed }) => [styles.divineBtn, pressed && { opacity: 0.76 }]}
              >
                <Ionicons name="prism-outline" size={15} color={COLORS.violet} />
                <Text style={[styles.divineBtnText, { color: COLORS.violet }]}>
                  Bendecir Mente
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* FALLEN EPITAPH IF DECEASED */}
        {!entity.isAlive && entity.finalMessage && (
          <View style={styles.epitaphCard}>
            <Text style={styles.sectionOverline}>TESTAMENTO FINAL</Text>
            <Text style={styles.epitaphWords}>“{entity.finalMessage.finalWords}”</Text>
            <Text style={styles.epitaphDetail}>
              Sentido hallado: {entity.finalMessage.lifeMeaning}
            </Text>
            <Text style={styles.epitaphGift}>
              Ofrenda al mundo: {entity.finalMessage.giftToWorld}
            </Text>
            <Text style={styles.epitaphCause}>
              Tránsito ({entity.finalMessage.causeOfDeath}) ·{' '}
              {entity.finalMessage.atPeace ? 'Partió en paz' : 'Partió con anhelo'}
            </Text>
          </View>
        )}

        {/* EXISTENTIAL STATEMENT & INNER MIND */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionOverline}>CONSCIENCIA Y ANHELO</Text>
          {entity.existentialStatement ? (
            <View style={styles.existentialQuoteBox}>
              <Text style={styles.existentialQuote}>
                “{entity.existentialStatement}”
              </Text>
            </View>
          ) : null}

          <View style={styles.goalsRow}>
            {entity.currentGoal && (
              <View style={styles.goalCell}>
                <Text style={styles.goalLabel}>Propósito actual</Text>
                <Text style={styles.goalVal}>{entity.currentGoal}</Text>
              </View>
            )}
            {entity.currentDesire && (
              <View style={styles.goalCell}>
                <Text style={styles.goalLabel}>Impulso interior</Text>
                <Text style={styles.goalVal}>{entity.currentDesire}</Text>
              </View>
            )}
          </View>

          <Text style={styles.subSectionTitle}>Flujo de Pensamientos ({logs.length})</Text>
          {logs.length === 0 ? (
            <Text style={styles.mutedItalic}>
              {entity.lastThought
                ? `“${entity.lastThought}”`
                : 'Su mente despierta silenciosamente ante el cosmos…'}
            </Text>
          ) : (
            <View style={styles.logList}>
              {logs.slice(0, 12).map((log) => {
                const lCol = emotionColor(log.emotion);
                return (
                  <View
                    key={log.id}
                    style={[styles.logItem, { borderLeftColor: lCol }]}
                  >
                    <View style={styles.logHeader}>
                      <Text style={[styles.logEmotion, { color: lCol }]}>
                        {emotionLabelEs(log.emotion)}
                      </Text>
                      <Text style={styles.logTick}>Ciclo {log.tick}</Text>
                    </View>
                    <Text style={styles.logThought}>“{log.thought}”</Text>
                    {log.action ? (
                      <Text style={styles.logAction}>Acción: {log.action}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* INTERACTIVE LINEAGE / FAMILY TREE */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionOverline}>ÁRBOL GENEALÓGICO</Text>
          <Text style={styles.sectionSub}>
            Toca cualquier ancestro o descendiente para saltar a su mente.
          </Text>

          {lineage.ancestors.length > 0 && (
            <View style={styles.lineageTier}>
              <Text style={styles.tierLabel}>Ancestros Lejanos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tierRow}>
                  {lineage.ancestors.slice(0, 8).map((anc) => (
                    <LineageMiniCard
                      key={anc.id}
                      item={anc}
                      roleLabel="Ancestro"
                      onPress={() => router.push(`/entity/${anc.id}`)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={styles.lineageTier}>
            <Text style={styles.tierLabel}>Progenitores</Text>
            {lineage.parents.length === 0 ? (
              <Text style={styles.mutedItalic}>
                Ser primordial nacido directamente del Génesis.
              </Text>
            ) : (
              <View style={styles.tierRow}>
                {lineage.parents.map((par) => (
                  <LineageMiniCard
                    key={par.id}
                    item={par}
                    roleLabel="Progenitor"
                    onPress={() => router.push(`/entity/${par.id}`)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.lineageTier}>
            <Text style={styles.tierLabel}>Descendencia ({lineage.children.length})</Text>
            {lineage.children.length === 0 ? (
              <Text style={styles.mutedItalic}>Aún no ha engendrado descendencia.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tierRow}>
                  {lineage.children.map((child) => (
                    <LineageMiniCard
                      key={child.id}
                      item={child}
                      roleLabel="Hijo/a"
                      onPress={() => router.push(`/entity/${child.id}`)}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {/* HOMEOSTASIS & INVENTORY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionOverline}>HOMEOSTASIS E INVENTARIO</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalHalf}>
              <EnergyBar label="Energía" value={entity.energy} color={COLORS.emerald} />
            </View>
            <View style={styles.vitalHalf}>
              <EnergyBar label="Hidratación" value={entity.hydration} color={COLORS.sky} />
            </View>
            <View style={styles.vitalHalf}>
              <EnergyBar label="Salud Celular" value={entity.health} color={COLORS.rose} />
            </View>
            <View style={styles.vitalHalf}>
              <EnergyBar label="Calor Corporal" value={entity.warmth} color={COLORS.amber} />
            </View>
            <View style={styles.vitalHalf}>
              <EnergyBar label="Vigor Motriz" value={entity.stamina} color={COLORS.gold} />
            </View>
            <View style={styles.vitalHalf}>
              <EnergyBar
                label="Intelecto"
                value={Math.round((entity.intelligence ?? 0) * 100)}
                color={COLORS.violet}
              />
            </View>
          </View>

          <View style={styles.invGrid}>
            {[
              { label: 'Alimento', val: entity.inventory.food, col: COLORS.gold },
              { label: 'Agua', val: entity.inventory.water, col: COLORS.sky },
              { label: 'Madera', val: entity.inventory.wood, col: COLORS.emerald },
              { label: 'Piedra', val: entity.inventory.stone, col: COLORS.textSecondary },
              { label: 'Cristal', val: entity.inventory.crystal, col: COLORS.violet },
              { label: 'Hierbas', val: entity.inventory.herbs, col: COLORS.cyan },
            ].map((slot) => (
              <View key={slot.label} style={styles.invCell}>
                <Text style={[styles.invNum, { color: slot.col }]}>
                  {Math.round(slot.val * 10) / 10}
                </Text>
                <Text style={styles.invLabel}>{slot.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 10-GENE GENOME & PHENOTYPE RADAR */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionOverline}>ARQUITECTURA GENÓMICA (10 GENES)</Text>
          <GenomeBar genome={entity.genome} showRadar />
        </View>

        {/* RELATIONSHIPS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionOverline}>
            VÍNCULOS AFECTIVOS ({relationshipsList.length})
          </Text>
          {relationshipsList.length === 0 ? (
            <Text style={styles.mutedItalic}>
              Aún no ha forjado lazos profundos con otros seres.
            </Text>
          ) : (
            <View style={styles.relList}>
              {relationshipsList.slice(0, 10).map((rel) => {
                const vm = VALENCE_META[rel.valence] ?? VALENCE_META.neutral;
                return (
                  <Pressable
                    key={rel.targetId}
                    onPress={() => router.push(`/entity/${rel.targetId}`)}
                    style={styles.relRow}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.relTitleRow}>
                        <Text style={styles.relName}>{rel.name}</Text>
                        <View
                          style={[styles.pill, { backgroundColor: `${vm.color}20` }]}
                        >
                          <Text style={[styles.pillText, { color: vm.color }]}>
                            {vm.labelEs}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.relMem} numberOfLines={2}>
                        {rel.keyMemory}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.relAffinity,
                        { color: rel.affinity >= 0 ? COLORS.emerald : COLORS.crimson },
                      ]}
                    >
                      {rel.affinity >= 0 ? '+' : ''}
                      {Math.round(rel.affinity * 100)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* BELIEFS & MEMORIES */}
        {(beliefEntries.length > 0 || entity.memories.length > 0) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionOverline}>CREENCIAS Y MEMORIA VIVA</Text>
            {beliefEntries.map(([topic, belief]) => (
              <View key={topic} style={styles.beliefRow}>
                <Text style={styles.beliefTopic}>{topic.toUpperCase()}</Text>
                <Text style={styles.beliefVal}>{belief}</Text>
              </View>
            ))}

            {entity.memories.length > 0 && (
              <View style={styles.memBlock}>
                <Text style={styles.subSectionTitle}>Recuerdos Recientes</Text>
                {entity.memories.slice(-6).reverse().map((m, idx) => (
                  <Text key={idx} style={styles.memLine}>
                    • {m}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navOverline: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.cyan,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  mapJumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },
  mapJumpText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#040814',
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  notFoundText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 60,
    gap: 14,
  },
  heroCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
    padding: 15,
    gap: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroMeta: {
    flex: 1,
    gap: 3,
  },
  speciesHero: {
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
    color: COLORS.text,
  },
  subMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  clanBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  divineRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  divineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  divineBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  epitaphCard: {
    backgroundColor: '#0A1022',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.25)',
    padding: 15,
    gap: 6,
  },
  epitaphWords: {
    fontSize: 15,
    fontStyle: 'italic',
    color: COLORS.text,
    lineHeight: 22,
  },
  epitaphDetail: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  epitaphGift: {
    fontSize: 12.5,
    color: COLORS.cyan,
    fontWeight: '600',
  },
  epitaphCause: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 10,
  },
  sectionOverline: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.cyan,
  },
  sectionSub: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  existentialQuoteBox: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.violet,
  },
  existentialQuote: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: COLORS.text,
    lineHeight: 20,
  },
  goalsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  goalCell: {
    flex: 1,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  goalVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  subSectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  mutedItalic: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  logList: {
    gap: 8,
  },
  logItem: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 10,
    gap: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logEmotion: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  logTick: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  logThought: {
    fontSize: 12.5,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  logAction: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  lineageTier: {
    gap: 6,
  },
  tierLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineageNode: {
    width: 96,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    alignItems: 'center',
    gap: 2,
  },
  lineageRole: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  lineageName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  lineageSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalHalf: {
    width: '47%',
    flexGrow: 1,
  },
  invGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  invCell: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invNum: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  invLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  relList: {
    gap: 8,
  },
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgElevated,
    borderRadius: 13,
    padding: 10,
    gap: 10,
  },
  relTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  relName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  relMem: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  relAffinity: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  beliefRow: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 11,
    padding: 10,
    gap: 2,
  },
  beliefTopic: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.8,
  },
  beliefVal: {
    fontSize: 12.5,
    color: COLORS.text,
  },
  memBlock: {
    gap: 4,
  },
  memLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17.5,
  },
});
