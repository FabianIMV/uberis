import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WorldCanvas from '@/world/WorldCanvas';
import { useSimulation } from '@/context/SimulationContext';
import { useObservatoryAnalytics } from '@/hooks/useObservatory';
import TimeControlPill from '@/components/TimeControlPill';
import DivinePowersBar from '@/components/DivinePowersBar';
import CreatureInspectorSheet from '@/components/CreatureInspectorSheet';
import CatchUpModal from '@/components/CatchUpModal';
import {
  COLORS,
  EVENT_CATEGORY_META,
  SEASON_META,
  WEATHER_META,
  dayPhaseLabelEs,
} from '@/constants/theme';

export default function MundoScreen() {
  const insets = useSafeAreaInsets();
  const {
    simState,
    speed,
    setSpeed,
    triggerCognitiveTick,
    selectedEntity,
    setSelectedEntityId,
    activePower,
    setActivePower,
    followSelected,
    setFollowSelected,
    feedEntity,
    healEntity,
    blessEntity,
    settings,
    updateSettings,
    catchUpSummary,
    clearCatchUpSummary,
    bannerEvent,
    dismissBannerEvent,
    focusWorldPoint,
  } = useSimulation();

  const { living, activeSpeciesCount, activeTribes } = useObservatoryAnalytics();

  const world = simState.world;
  const seasonMeta = SEASON_META[world?.season ?? 'spring'];
  const weatherMeta = WEATHER_META[world?.weather ?? 'clear'];
  const phaseMeta = dayPhaseLabelEs(world?.dayPhase ?? 0.25);

  const selectedTribe = useMemo(() => {
    if (!selectedEntity?.tribeId) return null;
    return simState.tribes.find((t) => t.id === selectedEntity.tribeId) ?? null;
  }, [selectedEntity?.tribeId, simState.tribes]);

  const topHudHeight = insets.top + 88;

  return (
    <View style={styles.root}>
      {/* 60FPS GPU Skia Biosphere */}
      <WorldCanvas topInsetOffset={topHudHeight + (bannerEvent ? 44 : 4)} />

      {/* Floating Observatory Top HUD */}
      <View
        pointerEvents="box-none"
        style={[styles.topHudContainer, { paddingTop: insets.top + 6 }]}
      >
        <View style={styles.hudTopRow}>
          {/* Era, Day, Season & Weather Capsule */}
          <View style={styles.eraCapsule}>
            <View style={styles.eraTitleRow}>
              <Ionicons
                name={phaseMeta.icon as keyof typeof Ionicons.glyphMap}
                size={13}
                color={phaseMeta.color}
              />
              <Text style={styles.eraText} numberOfLines={1}>
                {world?.eraName ?? 'Era del Génesis'}
              </Text>
            </View>
            <View style={styles.subEnvRow}>
              <Text style={styles.dayText}>Día {world?.dayCount ?? 1}</Text>
              <Text style={styles.sepDot}>·</Text>
              <Text style={[styles.envTag, { color: seasonMeta.color }]}>
                {seasonMeta.labelEs}
              </Text>
              <Text style={styles.sepDot}>·</Text>
              <Ionicons
                name={weatherMeta.icon as keyof typeof Ionicons.glyphMap}
                size={11}
                color={weatherMeta.color}
              />
              <Text style={[styles.envTag, { color: weatherMeta.color }]} numberOfLines={1}>
                {weatherMeta.labelEs}
              </Text>
            </View>
          </View>

          {/* Time Speed Controls */}
          <TimeControlPill
            speed={speed}
            onChangeSpeed={setSpeed}
            onManualTick={() => void triggerCognitiveTick()}
          />
        </View>

        {/* Secondary Live Telemetry Strip */}
        <View style={styles.telemetryRow}>
          <View style={styles.telemetryPill}>
            <View style={[styles.livePulseDot, { backgroundColor: COLORS.emerald }]} />
            <Text style={styles.telemetryValue}>{living.length}</Text>
            <Text style={styles.telemetryLabel}>Seres</Text>

            <View style={styles.vertSep} />
            <Text style={[styles.telemetryValue, { color: COLORS.violet }]}>
              {activeSpeciesCount}
            </Text>
            <Text style={styles.telemetryLabel}>Especies</Text>

            <View style={styles.vertSep} />
            <Text style={[styles.telemetryValue, { color: COLORS.gold }]}>
              {activeTribes.length}
            </Text>
            <Text style={styles.telemetryLabel}>Clanes</Text>
          </View>

          {/* Quick Audio Toggle */}
          <Pressable
            onPress={() => void updateSettings({ soundEnabled: !settings.soundEnabled })}
            style={({ pressed }) => [styles.soundBtn, pressed && { opacity: 0.72 }]}
            accessibilityLabel="Alternar audio bio-sintetizador"
          >
            <Ionicons
              name={settings.soundEnabled ? 'volume-medium-outline' : 'volume-mute-outline'}
              size={16}
              color={settings.soundEnabled ? COLORS.cyan : COLORS.textMuted}
            />
          </Pressable>
        </View>

        {/* Live Chronicle Toast Banner */}
        {bannerEvent && (
          <Pressable
            onPress={() => {
              if (bannerEvent.x != null && bannerEvent.y != null) {
                focusWorldPoint(bannerEvent.x, bannerEvent.y, 0.9);
              }
              dismissBannerEvent();
            }}
            style={styles.toastBanner}
          >
            <Ionicons
              name={
                (EVENT_CATEGORY_META[bannerEvent.category]?.icon ??
                  'sparkles') as keyof typeof Ionicons.glyphMap
              }
              size={14}
              color={EVENT_CATEGORY_META[bannerEvent.category]?.color ?? COLORS.gold}
            />
            <Text style={styles.toastTitle} numberOfLines={1}>
              {bannerEvent.title}
            </Text>
            <Ionicons name="close" size={14} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Bottom Floating Inspector + Divine Powers Dock */}
      <View pointerEvents="box-none" style={styles.bottomStack}>
        {selectedEntity && (
          <CreatureInspectorSheet
            entity={selectedEntity}
            tribe={selectedTribe}
            followSelected={followSelected}
            onToggleFollow={() => setFollowSelected(!followSelected)}
            onFeed={() => feedEntity(selectedEntity.id)}
            onHeal={() => healEntity(selectedEntity.id)}
            onBless={() => blessEntity(selectedEntity.id)}
            onClose={() => setSelectedEntityId(null)}
          />
        )}

        <DivinePowersBar activePower={activePower} onSelectPower={setActivePower} />
      </View>

      <CatchUpModal summary={catchUpSummary} onDismiss={clearCatchUpSummary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    gap: 7,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eraCapsule: {
    flex: 1,
    backgroundColor: COLORS.bgGlassStrong,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 2,
  },
  eraTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eraText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  subEnvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  sepDot: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  envTag: {
    fontSize: 10.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgGlass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  livePulseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
  },
  telemetryValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.emerald,
    fontVariant: ['tabular-nums'],
  },
  telemetryLabel: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  vertSep: {
    width: 1,
    height: 11,
    backgroundColor: COLORS.border,
    marginHorizontal: 3,
  },
  soundBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bgGlass,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.bgGlassStrong,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  toastTitle: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.text,
  },
  bottomStack: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    gap: 8,
  },
});
