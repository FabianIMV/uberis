import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { simulation as rawSimulation } from '@/engine/simulation';
import type {
  CatchUpSummary,
  ConsciousnessLog,
  DivinePowerId,
  Entity,
  ISimulationController,
  LiveEvent,
  SimSettings,
  SimSpeed,
  SimState,
} from '@/engine/types';
import { bioSynth } from '@/audio/bioSynth';
import {
  hapticCreatureSelect,
  hapticDivinePower,
  hapticForEventCategory,
  hapticSelection,
  hapticSoft,
  hapticSuccess,
  setHapticsEnabled,
} from '@/audio/haptics';

const simulation: ISimulationController = rawSimulation;

export type FrameSubscriber = (nowMs: number, dtSeconds: number) => void;

export interface CameraFocusRequest {
  x: number;
  y: number;
  scale?: number;
  nonce: number;
}

export interface SimulationContextValue {
  simState: SimState;
  isReady: boolean;
  speed: SimSpeed;
  setSpeed: (nextSpeed: SimSpeed) => void;
  triggerCognitiveTick: () => Promise<void>;

  selectedEntityId: number | null;
  setSelectedEntityId: (id: number | null) => void;
  selectedEntity: Entity | null;

  activePower: DivinePowerId;
  setActivePower: (power: DivinePowerId) => void;

  followSelected: boolean;
  setFollowSelected: (follow: boolean) => void;

  cameraFocusRequest: CameraFocusRequest | null;
  focusWorldPoint: (x: number, y: number, scale?: number) => void;

  castPowerAt: (
    worldX: number,
    worldY: number,
    overridePower?: Exclude<DivinePowerId, 'observe'>
  ) => LiveEvent | null;
  feedEntity: (entityId: number) => void;
  healEntity: (entityId: number) => void;
  blessEntity: (entityId: number) => void;
  inspectLineage: ISimulationController['inspectLineage'];

  resetWorld: (customSeed?: number) => Promise<void>;
  saveNow: () => Promise<void>;

  settings: SimSettings;
  updateSettings: (partial: Partial<SimSettings>) => Promise<void>;

  catchUpSummary: CatchUpSummary | null;
  clearCatchUpSummary: () => void;

  bannerEvent: LiveEvent | null;
  dismissBannerEvent: () => void;

  /** Zero-rerender 60fps hook for WorldCanvas */
  subscribeFrame: (listener: FrameSubscriber) => () => void;
  getLiveState: () => SimState;
}

const DEFAULT_SETTINGS: SimSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  showSenseCones: false,
  showNames: true,
  showTrails: true,
  anthropicApiKey: '',
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simState, setSimState] = useState<SimState>(() => simulation.getState());
  const [isReady, setIsReady] = useState(false);
  const [speed, setSpeedState] = useState<SimSpeed>(() => simulation.getSpeed?.() ?? 1);
  const [selectedEntityId, setSelectedEntityIdState] = useState<number | null>(null);
  const [activePower, setActivePowerState] = useState<DivinePowerId>('observe');
  const [followSelected, setFollowSelectedState] = useState<boolean>(false);
  const [settings, setSettings] = useState<SimSettings>(() =>
    simulation.getSettings ? simulation.getSettings() : DEFAULT_SETTINGS
  );
  const [catchUpSummary, setCatchUpSummary] = useState<CatchUpSummary | null>(null);
  const [bannerEvent, setBannerEvent] = useState<LiveEvent | null>(null);
  const [cameraFocusRequest, setCameraFocusRequest] = useState<CameraFocusRequest | null>(null);

  const frameListenersRef = useRef<Set<FrameSubscriber>>(new Set());
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushBannerEvent = useCallback((ev: LiveEvent) => {
    setBannerEvent(ev);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setBannerEvent(null);
    }, 4400);
  }, []);

  // Keep awake on mobile observatory
  useEffect(() => {
    if (Platform.OS !== 'web') {
      void activateKeepAwakeAsync('uberis-observatory').catch(() => {});
      return () => {
        void deactivateKeepAwake('uberis-observatory').catch(() => {});
      };
    }
    return undefined;
  }, []);

  // Boot simulation, discrete state subscription & event audio/haptics
  useEffect(() => {
    let mounted = true;

    const unsubState = simulation.subscribe((nextState) => {
      if (!mounted) return;
      // Shallow clone top-level object reference so React detects discrete tick updates
      setSimState({ ...nextState });
      setSpeedState(simulation.getSpeed());
    });

    const unsubEvent = simulation.onEvent((event) => {
      if (!mounted) return;
      bioSynth.playForEventCategory(event.category);
      hapticForEventCategory(event.category);

      if (
        event.important ||
        event.category === 'speciation' ||
        event.category === 'tribe_founded' ||
        event.category === 'tech_discovered' ||
        event.category === 'divine_intervention'
      ) {
        pushBannerEvent(event);
      }
    });

    void (async () => {
      try {
        await simulation.start();
        if (!mounted) return;
        const loadedSettings = simulation.getSettings();
        setSettings(loadedSettings);
        setHapticsEnabled(loadedSettings.hapticsEnabled);
        bioSynth.setSoundEnabled(loadedSettings.soundEnabled);
        if (loadedSettings.soundEnabled) {
          void bioSynth.ensureInitialized();
        }
        setSimState({ ...simulation.getState() });
        setSpeedState(simulation.getSpeed());

        const catchUp = simulation.getCatchUpSummary();
        if (catchUp && catchUp.ticksSimulated > 0) {
          setCatchUpSummary(catchUp);
        }
        setIsReady(true);
      } catch {
        if (mounted) setIsReady(true);
      }
    })();

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        void simulation.saveNow().catch(() => {});
      }
    });

    return () => {
      mounted = false;
      unsubState();
      unsubEvent();
      appStateSub.remove();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      simulation.stop();
    };
  }, [pushBannerEvent]);

  // 60fps continuous physics & Skia frame loop — ZERO React state updates per frame!
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let active = true;

    const tickFrame = (now: number) => {
      if (!active) return;
      const rawDt = (now - lastTime) * 0.001;
      lastTime = now;
      const clampedDt = Math.max(0.001, Math.min(0.05, rawDt));

      try {
        simulation.stepFrame(clampedDt);
      } catch {
        // Guard against transient engine frame errors
      }

      const wallNow = Date.now();
      frameListenersRef.current.forEach((fn) => {
        try {
          fn(wallNow, clampedDt);
        } catch {
          // Non-fatal frame subscriber guard
        }
      });

      rafId = requestAnimationFrame(tickFrame);
    };

    rafId = requestAnimationFrame(tickFrame);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, []);

  const subscribeFrame = useCallback((listener: FrameSubscriber) => {
    frameListenersRef.current.add(listener);
    return () => {
      frameListenersRef.current.delete(listener);
    };
  }, []);

  const getLiveState = useCallback(() => simulation.getState(), []);

  const setSpeed = useCallback((nextSpeed: SimSpeed) => {
    hapticSelection();
    void bioSynth.play('tap', 60);
    simulation.setSpeed(nextSpeed);
    setSpeedState(nextSpeed);
  }, []);

  const triggerCognitiveTick = useCallback(async () => {
    hapticSoft();
    void bioSynth.play('tap', 60);
    await simulation.triggerCognitiveTick();
    setSimState({ ...simulation.getState() });
  }, []);

  const setSelectedEntityId = useCallback((id: number | null) => {
    if (id !== null) {
      hapticCreatureSelect();
      void bioSynth.play('tap', 70);
    } else {
      setFollowSelectedState(false);
    }
    setSelectedEntityIdState(id);
  }, []);

  const setActivePower = useCallback((power: DivinePowerId) => {
    hapticSelection();
    void bioSynth.play('tap', 50);
    setActivePowerState(power);
  }, []);

  const setFollowSelected = useCallback((follow: boolean) => {
    hapticSelection();
    setFollowSelectedState(follow);
  }, []);

  const focusWorldPoint = useCallback((x: number, y: number, scale?: number) => {
    setFollowSelectedState(false);
    setCameraFocusRequest({ x, y, scale, nonce: Date.now() + Math.random() });
  }, []);

  const castPowerAt = useCallback(
    (
      worldX: number,
      worldY: number,
      overridePower?: Exclude<DivinePowerId, 'observe'>
    ): LiveEvent | null => {
      const powerToCast =
        overridePower ?? (activePower !== 'observe' ? activePower : null);
      if (!powerToCast) return null;

      hapticDivinePower(powerToCast);
      bioSynth.playForPower(powerToCast);

      const ev = simulation.applyDivinePower(powerToCast, worldX, worldY);
      setSimState({ ...simulation.getState() });
      if (ev) {
        pushBannerEvent(ev);
      }
      return ev;
    },
    [activePower, pushBannerEvent]
  );

  const feedEntity = useCallback((entityId: number) => {
    hapticSoft();
    void bioSynth.play('nourish', 80);
    simulation.feedEntity(entityId);
    setSimState({ ...simulation.getState() });
  }, []);

  const healEntity = useCallback((entityId: number) => {
    hapticSoft();
    void bioSynth.play('solar', 80);
    simulation.healEntity(entityId);
    setSimState({ ...simulation.getState() });
  }, []);

  const blessEntity = useCallback((entityId: number) => {
    hapticSuccess();
    void bioSynth.play('discovery', 80);
    simulation.blessEntity(entityId);
    setSimState({ ...simulation.getState() });
  }, []);

  const inspectLineage = useCallback(
    (entityId: number) => simulation.inspectLineage(entityId),
    []
  );

  const resetWorld = useCallback(async (customSeed?: number) => {
    hapticSuccess();
    void bioSynth.play('speciation', 100);
    setSelectedEntityIdState(null);
    setFollowSelectedState(false);
    await simulation.resetWorld(customSeed);
    setSimState({ ...simulation.getState() });
    setSpeedState(simulation.getSpeed());
  }, []);

  const saveNow = useCallback(async () => {
    hapticSoft();
    await simulation.saveNow();
  }, []);

  const updateSettings = useCallback(async (partial: Partial<SimSettings>) => {
    await simulation.updateSettings(partial);
    const updated = simulation.getSettings();
    setSettings({ ...updated });
    if (partial.hapticsEnabled !== undefined) {
      setHapticsEnabled(updated.hapticsEnabled);
    }
    if (partial.soundEnabled !== undefined) {
      bioSynth.setSoundEnabled(updated.soundEnabled);
    }
  }, []);

  const clearCatchUpSummary = useCallback(() => {
    simulation.clearCatchUpSummary();
    setCatchUpSummary(null);
  }, []);

  const dismissBannerEvent = useCallback(() => {
    setBannerEvent(null);
  }, []);

  const selectedEntity = useMemo(() => {
    if (selectedEntityId == null) return null;
    return simState.entities.find((e) => e.id === selectedEntityId) ?? null;
  }, [simState.entities, selectedEntityId]);

  const value = useMemo<SimulationContextValue>(
    () => ({
      simState,
      isReady,
      speed,
      setSpeed,
      triggerCognitiveTick,
      selectedEntityId,
      setSelectedEntityId,
      selectedEntity,
      activePower,
      setActivePower,
      followSelected,
      setFollowSelected,
      cameraFocusRequest,
      focusWorldPoint,
      castPowerAt,
      feedEntity,
      healEntity,
      blessEntity,
      inspectLineage,
      resetWorld,
      saveNow,
      settings,
      updateSettings,
      catchUpSummary,
      clearCatchUpSummary,
      bannerEvent,
      dismissBannerEvent,
      subscribeFrame,
      getLiveState,
    }),
    [
      simState,
      isReady,
      speed,
      setSpeed,
      triggerCognitiveTick,
      selectedEntityId,
      setSelectedEntityId,
      selectedEntity,
      activePower,
      setActivePower,
      followSelected,
      setFollowSelected,
      cameraFocusRequest,
      focusWorldPoint,
      castPowerAt,
      feedEntity,
      healEntity,
      blessEntity,
      inspectLineage,
      resetWorld,
      saveNow,
      settings,
      updateSettings,
      catchUpSummary,
      clearCatchUpSummary,
      bannerEvent,
      dismissBannerEvent,
      subscribeFrame,
      getLiveState,
    ]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation debe usarse dentro de <SimulationProvider>');
  }
  return ctx;
}

export function useEntityById(entityId: number | null): Entity | null {
  const { simState } = useSimulation();
  return useMemo(() => {
    if (entityId == null) return null;
    return simState.entities.find((e) => e.id === entityId) ?? null;
  }, [simState.entities, entityId]);
}

export function useEntityLogs(entityId: number | null): ConsciousnessLog[] {
  const { simState } = useSimulation();
  return useMemo(() => {
    if (entityId == null) return [];
    const list = simState.logs[entityId] ?? [];
    return [...list].sort((a, b) => b.tick - a.tick || b.id - a.id);
  }, [simState.logs, entityId]);
}
