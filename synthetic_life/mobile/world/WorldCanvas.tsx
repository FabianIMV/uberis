import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/engine/types';
import { useSimulation } from '@/context/SimulationContext';
import { COLORS, DIVINE_POWER_META } from '@/constants/theme';
import { hapticSelection } from '@/audio/haptics';
import {
  hasNativeSkiaFonts,
  recordWorldPicture,
  screenToWorld,
  worldToScreen,
  type CameraTransform,
  type ViewportSize,
} from './worldRenderer';

const MIN_SCALE = 0.16;
const MAX_SCALE = 2.65;

function clampCamera(cam: CameraTransform): CameraTransform {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, cam.scale));
  const cx = Math.max(-140, Math.min(WORLD_WIDTH + 140, cam.cx));
  const cy = Math.max(-140, Math.min(WORLD_HEIGHT + 140, cam.cy));
  return { cx, cy, scale };
}

interface Props {
  topInsetOffset?: number;
}

export default function WorldCanvas({ topInsetOffset = 128 }: Props) {
  const {
    activePower,
    selectedEntityId,
    setSelectedEntityId,
    followSelected,
    setFollowSelected,
    cameraFocusRequest,
    castPowerAt,
    settings,
    subscribeFrame,
    getLiveState,
    selectedEntity,
  } = useSimulation();

  const initialPicture = useMemo<SkPicture>(
    () =>
      createPicture(
        (canvas) => {
          canvas.clear(Skia.Color('#040814'));
        },
        { width: 16, height: 16 }
      ),
    []
  );

  const pictureSV = useSharedValue<SkPicture>(initialPicture);

  const viewportRef = useRef<ViewportSize>({ width: 390, height: 760 });
  const [viewportReady, setViewportReady] = useState(false);

  const cameraRef = useRef<CameraTransform>({
    cx: WORLD_WIDTH * 0.5,
    cy: WORLD_HEIGHT * 0.5,
    scale: 0.42,
  });
  const targetCameraRef = useRef<CameraTransform>({
    cx: WORLD_WIDTH * 0.5,
    cy: WORLD_HEIGHT * 0.5,
    scale: 0.42,
  });
  const isGestureActiveRef = useRef(false);
  const pinchStartScaleRef = useRef(0.42);
  const pinchStartCamRef = useRef<CameraTransform>({
    cx: WORLD_WIDTH * 0.5,
    cy: WORLD_HEIGHT * 0.5,
    scale: 0.42,
  });

  // Live refs read inside 60fps frame callback without re-subscribing
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const selectedIdRef = useRef(selectedEntityId);
  selectedIdRef.current = selectedEntityId;

  const followRef = useRef(followSelected);
  followRef.current = followSelected;

  const activePowerRef = useRef(activePower);
  activePowerRef.current = activePower;

  // Respond to external camera focus requests (from Entities / Chronicles / Inspector)
  useEffect(() => {
    if (!cameraFocusRequest) return;
    const next = clampCamera({
      cx: cameraFocusRequest.x,
      cy: cameraFocusRequest.y,
      scale: cameraFocusRequest.scale ?? Math.max(targetCameraRef.current.scale, 0.78),
    });
    targetCameraRef.current = next;
  }, [cameraFocusRequest]);

  // Auto-zoom gently when enabling follow mode
  useEffect(() => {
    if (followSelected && selectedEntityId != null) {
      if (targetCameraRef.current.scale < 0.68) {
        targetCameraRef.current = clampCamera({
          ...targetCameraRef.current,
          scale: 0.85,
        });
      }
    }
  }, [followSelected, selectedEntityId]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width <= 0 || height <= 0) return;
      const prevReady = viewportReady;
      viewportRef.current = { width, height };
      if (!prevReady) {
        // Fit continental heartland comfortably on first layout
        const fitW = width / WORLD_WIDTH;
        const fitH = height / WORLD_HEIGHT;
        const initialScale = Math.max(0.24, Math.min(0.55, Math.max(fitW, fitH) * 1.05));
        const initCam = {
          cx: WORLD_WIDTH * 0.5,
          cy: WORLD_HEIGHT * 0.5,
          scale: initialScale,
        };
        cameraRef.current = initCam;
        targetCameraRef.current = initCam;
        setViewportReady(true);
      }
    },
    [viewportReady]
  );

  // 60fps Skia Picture recording subscriber — ZERO React re-renders!
  useEffect(() => {
    return subscribeFrame((nowMs) => {
      const state = getLiveState();
      const vp = viewportRef.current;
      if (vp.width <= 1 || vp.height <= 1) return;

      // Smoothly lock onto selected creature if followSelected is active
      const selId = selectedIdRef.current;
      if (followRef.current && selId != null && !isGestureActiveRef.current) {
        const entities = state.entities;
        for (let i = 0; i < entities.length; i++) {
          const en = entities[i];
          if (en.id === selId && en.isAlive) {
            targetCameraRef.current = clampCamera({
              cx: en.x,
              cy: en.y,
              scale: targetCameraRef.current.scale,
            });
            break;
          }
        }
      }

      // Exponential smoothing toward targetCameraRef
      const cur = cameraRef.current;
      const tgt = targetCameraRef.current;
      const lerp = isGestureActiveRef.current ? 0.55 : 0.18;
      const nextCam: CameraTransform = {
        cx: cur.cx + (tgt.cx - cur.cx) * lerp,
        cy: cur.cy + (tgt.cy - cur.cy) * lerp,
        scale: cur.scale + (tgt.scale - cur.scale) * lerp,
      };
      cameraRef.current = nextCam;

      const pic = recordWorldPicture(
        state,
        nextCam,
        vp,
        nowMs,
        settingsRef.current,
        selId
      );
      pictureSV.value = pic;
    });
  }, [subscribeFrame, getLiveState, pictureSV]);

  const handleWorldTap = useCallback(
    (screenX: number, screenY: number) => {
      const worldPt = screenToWorld(
        screenX,
        screenY,
        cameraRef.current,
        viewportRef.current
      );
      const power = activePowerRef.current;

      if (power !== 'observe') {
        const clampedX = Math.max(24, Math.min(WORLD_WIDTH - 24, worldPt.x));
        const clampedY = Math.max(24, Math.min(WORLD_HEIGHT - 24, worldPt.y));
        castPowerAt(clampedX, clampedY);
        return;
      }

      // Observe mode: hit-test living creatures
      const state = getLiveState();
      const hitRadius = Math.max(24, 38 / cameraRef.current.scale);
      const hitRadiusSq = hitRadius * hitRadius;
      let bestId: number | null = null;
      let bestDistSq = hitRadiusSq;

      for (let i = 0; i < state.entities.length; i++) {
        const en = state.entities[i];
        if (!en.isAlive) continue;
        const dx = en.x - worldPt.x;
        const dy = en.y - worldPt.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestId = en.id;
        }
      }

      setSelectedEntityId(bestId);
    },
    [castPowerAt, getLiveState, setSelectedEntityId]
  );

  const composedGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(5)
      .onStart(() => {
        isGestureActiveRef.current = true;
        if (followRef.current) {
          setFollowSelected(false);
        }
      })
      .onChange((e) => {
        const cur = targetCameraRef.current;
        targetCameraRef.current = clampCamera({
          cx: cur.cx - e.changeX / cur.scale,
          cy: cur.cy - e.changeY / cur.scale,
          scale: cur.scale,
        });
      })
      .onFinalize(() => {
        isGestureActiveRef.current = false;
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        isGestureActiveRef.current = true;
        pinchStartScaleRef.current = targetCameraRef.current.scale;
        pinchStartCamRef.current = { ...targetCameraRef.current };
      })
      .onUpdate((e) => {
        const vp = viewportRef.current;
        const startCam = pinchStartCamRef.current;
        const nextScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, pinchStartScaleRef.current * e.scale)
        );

        // Anchor zoom around pinch focal point
        const worldAnchorX = (e.focalX - vp.width * 0.5) / startCam.scale + startCam.cx;
        const worldAnchorY = (e.focalY - vp.height * 0.5) / startCam.scale + startCam.cy;
        const nextCx = worldAnchorX - (e.focalX - vp.width * 0.5) / nextScale;
        const nextCy = worldAnchorY - (e.focalY - vp.height * 0.5) / nextScale;

        targetCameraRef.current = clampCamera({
          cx: nextCx,
          cy: nextCy,
          scale: nextScale,
        });
      })
      .onFinalize(() => {
        isGestureActiveRef.current = false;
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(12)
      .onEnd((e, success) => {
        if (success) {
          handleWorldTap(e.x, e.y);
        }
      });

    return Gesture.Simultaneous(pan, pinch, tap);
  }, [handleWorldTap, setFollowSelected]);

  const handleResetOverview = useCallback(() => {
    hapticSelection();
    setFollowSelected(false);
    const vp = viewportRef.current;
    const overviewScale = Math.max(
      MIN_SCALE,
      Math.min(0.45, Math.min(vp.width / (WORLD_WIDTH + 140), vp.height / (WORLD_HEIGHT + 240)))
    );
    targetCameraRef.current = {
      cx: WORLD_WIDTH * 0.5,
      cy: WORLD_HEIGHT * 0.5,
      scale: overviewScale,
    };
  }, [setFollowSelected]);

  const handleStepZoom = useCallback((factor: number) => {
    hapticSelection();
    const cur = targetCameraRef.current;
    targetCameraRef.current = clampCamera({
      ...cur,
      scale: cur.scale * factor,
    });
  }, []);

  const powerMeta = DIVINE_POWER_META[activePower];
  const showWebSelectedFallback =
    Platform.OS === 'web' && !hasNativeSkiaFonts() && selectedEntity && selectedEntity.isAlive;

  const webProjected = showWebSelectedFallback
    ? worldToScreen(
        selectedEntity.x,
        selectedEntity.y,
        cameraRef.current,
        viewportRef.current
      )
    : null;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={composedGesture}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Picture picture={pictureSV} />
          </Canvas>
        </View>
      </GestureDetector>

      {/* Web typography fallback for selected creature when CanvasKit system fonts aren't loaded */}
      {showWebSelectedFallback && webProjected && (
        <View
          pointerEvents="none"
          style={[
            styles.webCallout,
            {
              left: Math.max(16, Math.min(viewportRef.current.width - 180, webProjected.x - 80)),
              top: Math.max(80, webProjected.y - 54),
            },
          ]}
        >
          {selectedEntity.speechBubble ? (
            <Text style={styles.webSpeech} numberOfLines={1}>
              “{selectedEntity.speechBubble}”
            </Text>
          ) : null}
          <Text style={styles.webName} numberOfLines={1}>
            {selectedEntity.name}
          </Text>
        </View>
      )}

      {/* Active Divine Power Mode Pill */}
      {activePower !== 'observe' && (
        <View
          pointerEvents="none"
          style={[
            styles.activePowerBanner,
            { top: topInsetOffset, borderColor: powerMeta.color },
          ]}
        >
          <View style={[styles.powerDot, { backgroundColor: powerMeta.color }]} />
          <Text style={[styles.powerBannerTitle, { color: powerMeta.color }]}>
            {powerMeta.labelEs}:
          </Text>
          <Text style={styles.powerBannerDesc} numberOfLines={1}>
            {powerMeta.descEs}
          </Text>
        </View>
      )}

      {/* Floating Right Camera & Compass Controls */}
      <View style={[styles.cameraDock, { top: topInsetOffset + (activePower !== 'observe' ? 42 : 4) }]}>
        <Pressable
          onPress={handleResetOverview}
          style={({ pressed }) => [styles.camBtn, pressed && styles.camBtnPressed]}
          accessibilityLabel="Vista continental completa"
        >
          <Ionicons name="compass-outline" size={19} color={COLORS.cyan} />
        </Pressable>

        <Pressable
          onPress={() => handleStepZoom(1.32)}
          style={({ pressed }) => [styles.camBtn, pressed && styles.camBtnPressed]}
          accessibilityLabel="Acercar cámara"
        >
          <Ionicons name="add" size={19} color={COLORS.text} />
        </Pressable>

        <Pressable
          onPress={() => handleStepZoom(0.76)}
          style={({ pressed }) => [styles.camBtn, pressed && styles.camBtnPressed]}
          accessibilityLabel="Alejar cámara"
        >
          <Ionicons name="remove" size={19} color={COLORS.text} />
        </Pressable>

        {selectedEntityId != null && (
          <Pressable
            onPress={() => setFollowSelected(!followSelected)}
            style={({ pressed }) => [
              styles.camBtn,
              followSelected && styles.camBtnActive,
              pressed && styles.camBtnPressed,
            ]}
            accessibilityLabel="Seguir criatura seleccionada"
          >
            <Ionicons
              name={followSelected ? 'locate' : 'locate-outline'}
              size={18}
              color={followSelected ? '#040814' : COLORS.gold}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  cameraDock: {
    position: 'absolute',
    right: 12,
    gap: 8,
    alignItems: 'center',
  },
  camBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgGlass,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  camBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  activePowerBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.bgGlassStrong,
    borderWidth: 1,
  },
  powerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  powerBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  powerBannerDesc: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  webCallout: {
    position: 'absolute',
    width: 160,
    alignItems: 'center',
  },
  webSpeech: {
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: COLORS.bgGlassStrong,
    borderColor: COLORS.borderBright,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 3,
  },
  webName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.cyan,
    backgroundColor: COLORS.bgGlass,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
