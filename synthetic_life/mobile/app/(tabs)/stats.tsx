import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { useSimulation } from '@/context/SimulationContext';
import { useObservatoryAnalytics } from '@/hooks/useObservatory';
import GenomeBar from '@/components/GenomeBar';
import MorphologyAvatar from '@/components/MorphologyAvatar';
import {
  BIOME_META,
  COLORS,
  TECH_META,
} from '@/constants/theme';
import type { BiomeId, GenerationSnapshot, TechId } from '@/engine/types';

function buildSvgPolylinePath(
  values: number[],
  width: number,
  height: number,
  maxVal: number
): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height - (values[0] / Math.max(1, maxVal)) * (height - 16) - 8;
    return `M 8 ${y.toFixed(1)} L ${(width - 8).toFixed(1)} ${y.toFixed(1)}`;
  }
  return values
    .map((v, idx) => {
      const x = 8 + (idx / (values.length - 1)) * (width - 16);
      const y = height - (Math.max(0, v) / Math.max(1, maxVal)) * (height - 18) - 9;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function StatsEvolutionScreen() {
  const insets = useSafeAreaInsets();
  const {
    simState,
    settings,
    updateSettings,
    saveNow,
    resetWorld,
  } = useSimulation();

  const {
    living,
    speciesList,
    activeSpeciesCount,
    maxGeneration,
    avgGenome,
    avgIntelligence,
  } = useObservatoryAnalytics();

  const [apiKeyDraft, setApiKeyDraft] = useState(settings.anthropicApiKey ?? '');
  const [seedInput, setSeedInput] = useState('');
  const [confirmGenesis, setConfirmGenesis] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const world = simState.world;
  const snapshots: GenerationSnapshot[] = useMemo(() => {
    const raw = world?.historySnapshots ?? [];
    if (raw.length > 0) return raw.slice(-36);
    return [
      {
        tick: world?.currentTick ?? 0,
        population: living.length,
        speciesCount: activeSpeciesCount,
        avgEnergy: 75,
        avgIntelligence,
        avgGenome,
      },
    ];
  }, [world?.historySnapshots, world?.currentTick, living.length, activeSpeciesCount, avgIntelligence, avgGenome]);

  const chartWidth = 320;
  const chartHeight = 132;
  const maxPop = Math.max(12, ...snapshots.map((s) => s.population));
  const maxSpecies = Math.max(5, ...snapshots.map((s) => s.speciesCount));

  const popPath = buildSvgPolylinePath(
    snapshots.map((s) => s.population),
    chartWidth,
    chartHeight,
    maxPop
  );
  const speciesPath = buildSvgPolylinePath(
    snapshots.map((s) => s.speciesCount),
    chartWidth,
    chartHeight,
    maxSpecies
  );

  // Genome drift paths (0..1)
  const curiosityPath = buildSvgPolylinePath(
    snapshots.map((s) => s.avgGenome.curiosity),
    chartWidth,
    chartHeight,
    1
  );
  const empathyPath = buildSvgPolylinePath(
    snapshots.map((s) => s.avgGenome.empathy),
    chartWidth,
    chartHeight,
    1
  );
  const creativityPath = buildSvgPolylinePath(
    snapshots.map((s) => s.avgGenome.creativity),
    chartWidth,
    chartHeight,
    1
  );
  const bioPath = buildSvgPolylinePath(
    snapshots.map((s) => s.avgGenome.bioluminescence),
    chartWidth,
    chartHeight,
    1
  );

  const techClansMap = useMemo(() => {
    const map = new Map<TechId, string[]>();
    for (const tribe of simState.tribes) {
      for (const t of tribe.unlockedTechs) {
        const arr = map.get(t) ?? [];
        arr.push(tribe.name);
        map.set(t, arr);
      }
    }
    return map;
  }, [simState.tribes]);

  const flashMessage = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => setStatusFeedback(null), 2800);
  };

  const handleSaveApiKey = async () => {
    await updateSettings({ anthropicApiKey: apiKeyDraft.trim() });
    flashMessage('Clave API actualizada en el observatorio');
  };

  const handleManualSave = async () => {
    await saveNow();
    flashMessage('Biosfera guardada en memoria persistente');
  };

  const handleTriggerGenesis = async () => {
    const parsedSeed = seedInput.trim() ? Number(seedInput.trim()) : undefined;
    const validSeed =
      parsedSeed !== undefined && Number.isFinite(parsedSeed)
        ? Math.abs(Math.floor(parsedSeed))
        : undefined;
    setConfirmGenesis(false);
    setSeedInput('');
    await resetWorld(validSeed);
    flashMessage('Nuevo Génesis engendrado con éxito');
  };

  const culturalBiomes = Object.entries(world?.culturalBeliefs ?? {}) as Array<
    [BiomeId, Record<string, string>]
  >;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>TELEMETRÍA EVOLUTIVA</Text>
          <Text style={styles.title}>Evolución, Ciencia y Ajustes</Text>
        </View>
        <View style={styles.seedBadge}>
          <Text style={styles.seedLabel}>SEMILLA</Text>
          <Text style={styles.seedValue}>{world?.seed ?? '—'}</Text>
        </View>
      </View>

      {statusFeedback && (
        <View style={styles.feedbackToast}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.emerald} />
          <Text style={styles.feedbackText}>{statusFeedback}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI METRICS GRID */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: COLORS.emerald }]}>
              {living.length}
            </Text>
            <Text style={styles.kpiLabel}>Población Viva</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#E879F9' }]}>
              {activeSpeciesCount}
            </Text>
            <Text style={styles.kpiLabel}>Especies Vivas</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: COLORS.gold }]}>
              Gen {maxGeneration}
            </Text>
            <Text style={styles.kpiLabel}>Linaje Máximo</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: COLORS.cyan }]}>
              {Math.round(avgIntelligence * 100)}%
            </Text>
            <Text style={styles.kpiLabel}>Intelecto Medio</Text>
          </View>
        </View>

        {/* POPULATION & BIODIVERSITY SVG CHART */}
        <View style={styles.card}>
          <Text style={styles.cardOverline}>DINÁMICA DEMOGRÁFICA Y ESPECIACIÓN</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.emerald }]} />
              <Text style={styles.legendText}>Población (máx {maxPop})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E879F9' }]} />
              <Text style={styles.legendText}>Especies (máx {maxSpecies})</Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              <Defs>
                <LinearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.28} />
                  <Stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {[0.25, 0.5, 0.75].map((r) => (
                <Line
                  key={r}
                  x1={8}
                  y1={chartHeight * r}
                  x2={chartWidth - 8}
                  y2={chartHeight * r}
                  stroke="rgba(148, 175, 203, 0.1)"
                  strokeWidth={1}
                />
              ))}
              {popPath ? (
                <Path
                  d={popPath}
                  fill="none"
                  stroke={COLORS.emerald}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              ) : null}
              {speciesPath ? (
                <Path
                  d={speciesPath}
                  fill="none"
                  stroke="#E879F9"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>
          </View>
        </View>

        {/* GENOME DRIFT SVG CHART */}
        <View style={styles.card}>
          <Text style={styles.cardOverline}>DERIVA GENÉTICA CONTINENTAL</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.cyan }]} />
              <Text style={styles.legendText}>Curiosidad</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.rose }]} />
              <Text style={styles.legendText}>Empatía</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.violet }]} />
              <Text style={styles.legendText}>Creatividad</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E879F9' }]} />
              <Text style={styles.legendText}>Biolum.</Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {[0.25, 0.5, 0.75].map((r) => (
                <Line
                  key={r}
                  x1={8}
                  y1={chartHeight * r}
                  x2={chartWidth - 8}
                  y2={chartHeight * r}
                  stroke="rgba(148, 175, 203, 0.1)"
                  strokeWidth={1}
                />
              ))}
              <Path d={curiosityPath} fill="none" stroke={COLORS.cyan} strokeWidth={2} />
              <Path d={empathyPath} fill="none" stroke={COLORS.rose} strokeWidth={2} />
              <Path d={creativityPath} fill="none" stroke={COLORS.violet} strokeWidth={2} />
              <Path d={bioPath} fill="none" stroke="#E879F9" strokeWidth={2} />
            </Svg>
          </View>

          <GenomeBar genome={avgGenome} compact />
        </View>

        {/* SPECIES BIODIVERSITY BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.cardOverline}>ÁRBOL DE ESPECIES ({speciesList.length})</Text>
          {speciesList.slice(0, 6).map((sp) => {
            const share =
              living.length > 0 ? Math.round((sp.livingCount / living.length) * 100) : 0;
            return (
              <View key={sp.speciesId} style={styles.speciesRow}>
                <MorphologyAvatar
                  morphology={sp.representative.morphology}
                  lifeStage="adult"
                  isAlive={sp.livingCount > 0}
                  size={40}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.speciesRowTop}>
                    <Text style={styles.speciesRowName}>{sp.speciesName}</Text>
                    <Text style={styles.speciesRowCount}>
                      {sp.livingCount} vivos ({share}%)
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(4, share)}%`,
                          backgroundColor: BIOME_META[sp.dominantBiome].color,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* TRIBAL SCIENCE & CULTURAL BELIEFS */}
        <View style={styles.card}>
          <Text style={styles.cardOverline}>ÁRBOL CIENTÍFICO DE LOS CLANES</Text>
          {(Object.keys(TECH_META) as TechId[]).map((techId) => {
            const meta = TECH_META[techId];
            const clans = techClansMap.get(techId) ?? [];
            const unlocked = clans.length > 0;
            return (
              <View
                key={techId}
                style={[styles.techItem, !unlocked && { opacity: 0.52 }]}
              >
                <View
                  style={[
                    styles.techIconWrap,
                    { backgroundColor: unlocked ? `${meta.color}24` : COLORS.bgElevated },
                  ]}
                >
                  <Ionicons
                    name={meta.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={unlocked ? meta.color : COLORS.textMuted}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.techTitle}>{meta.labelEs}</Text>
                  <Text style={styles.techDesc}>{meta.descEs}</Text>
                  {unlocked && (
                    <Text style={[styles.techClans, { color: meta.color }]}>
                      Dominado por: {clans.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {culturalBiomes.some(([, b]) => Object.keys(b).length > 0) && (
            <View style={styles.cultureSection}>
              <Text style={styles.subTitle}>Mitos y Creencias Regionales</Text>
              {culturalBiomes.map(([biomeId, beliefs]) => {
                const entries = Object.entries(beliefs ?? {});
                if (entries.length === 0) return null;
                const bm = BIOME_META[biomeId];
                return (
                  <View key={biomeId} style={styles.cultureBox}>
                    <Text style={[styles.cultureBiome, { color: bm?.color ?? COLORS.cyan }]}>
                      {bm?.nameEs ?? biomeId}
                    </Text>
                    {entries.slice(0, 3).map(([k, v]) => (
                      <Text key={k} style={styles.cultureLine}>
                        • {v}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* OBSERVATORY SETTINGS & CONTROLS */}
        <View style={styles.card}>
          <Text style={styles.cardOverline}>AJUSTES DEL OBSERVATORIO</Text>

          {[
            {
              key: 'soundEnabled' as const,
              label: 'Bio-Sintetizador y Armónicos',
              sub: 'Acordes generativos para nacimientos, poderes y atmósfera',
              val: settings.soundEnabled,
            },
            {
              key: 'hapticsEnabled' as const,
              label: 'Respuesta Háptica Táctil',
              sub: 'Vibración sutil al seleccionar seres y canalizar poderes',
              val: settings.hapticsEnabled,
            },
            {
              key: 'showNames' as const,
              label: 'Nombres Flotantes en el Mapa',
              sub: 'Muestra etiquetas sobre las criaturas al acercar la cámara',
              val: settings.showNames,
            },
            {
              key: 'showTrails' as const,
              label: 'Estelas Bioluminiscentes',
              sub: 'Dibuja el rastro cinemático de desplazamiento en el mundo',
              val: settings.showTrails,
            },
            {
              key: 'showSenseCones' as const,
              label: 'Conos de Percepción Sensorial',
              sub: 'Visualiza el campo de visión de cada criatura',
              val: settings.showSenseCones,
            },
          ].map((row) => (
            <View key={row.key} style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.settingTitle}>{row.label}</Text>
                <Text style={styles.settingSub}>{row.sub}</Text>
              </View>
              <Switch
                value={row.val}
                onValueChange={(next) => void updateSettings({ [row.key]: next })}
                trackColor={{ false: '#1E293B', true: COLORS.cyan }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}

          {/* Optional Claude API Key */}
          <View style={styles.apiBlock}>
            <Text style={styles.settingTitle}>
              Clave API de Anthropic (Opcional — Cognición Profunda)
            </Text>
            <Text style={styles.settingSub}>
              El motor cognitivo español funciona 100% offline en tu dispositivo; añade una
              clave si deseas enriquecer reflexiones filosóficas con Claude.
            </Text>
            <View style={styles.apiInputRow}>
              <TextInput
                value={apiKeyDraft}
                onChangeText={setApiKeyDraft}
                placeholder="sk-ant-..."
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                style={styles.textInput}
              />
              <Pressable onPress={() => void handleSaveApiKey()} style={styles.saveKeyBtn}>
                <Text style={styles.saveKeyBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => void handleManualSave()}
            style={({ pressed }) => [styles.persistBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="save-outline" size={16} color={COLORS.cyan} />
            <Text style={styles.persistBtnText}>Guardar Estado del Mundo Ahora</Text>
          </Pressable>
        </View>

        {/* NEW GENESIS WORLD SEED RESET */}
        <View style={[styles.card, { borderColor: 'rgba(255, 77, 109, 0.28)' }]}>
          <Text style={[styles.cardOverline, { color: COLORS.gold }]}>
            NUEVO GÉNESIS CONTINENTAL
          </Text>
          <Text style={styles.settingSub}>
            Engendra un nuevo continente procedural desde cero. Puedes introducir una semilla
            numérica personalizada o dejarla vacía para un cosmos aleatorio.
          </Text>

          <TextInput
            value={seedInput}
            onChangeText={setSeedInput}
            placeholder="Semilla opcional (ej: 4202026)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            style={styles.textInput}
          />

          {!confirmGenesis ? (
            <Pressable
              onPress={() => setConfirmGenesis(true)}
              style={({ pressed }) => [styles.genesisBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="planet-outline" size={16} color={COLORS.gold} />
              <Text style={styles.genesisBtnText}>Iniciar Nuevo Génesis…</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setConfirmGenesis(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleTriggerGenesis()}
                style={styles.confirmDangerBtn}
              >
                <Text style={styles.confirmDangerText}>Confirmar Génesis</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
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
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.text,
  },
  seedBadge: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'flex-end',
  },
  seedLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  seedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },
  feedbackToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: 'rgba(52, 224, 143, 0.4)',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emerald,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    gap: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 11,
  },
  cardOverline: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: COLORS.cyan,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  chartWrap: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speciesRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speciesRowName: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    color: COLORS.text,
  },
  speciesRowCount: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 175, 203, 0.12)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 13,
    padding: 10,
  },
  techIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  techDesc: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  techClans: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  cultureSection: {
    gap: 8,
    marginTop: 4,
  },
  subTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cultureBox: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  cultureBiome: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  cultureLine: {
    fontSize: 12,
    color: COLORS.text,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16.5,
    marginTop: 1,
  },
  apiBlock: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  apiInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 13,
  },
  saveKeyBtn: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#040814',
  },
  persistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: COLORS.borderBright,
  },
  persistBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.cyan,
  },
  genesisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  genesisBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  confirmDangerBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.crimson,
    alignItems: 'center',
  },
  confirmDangerText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
