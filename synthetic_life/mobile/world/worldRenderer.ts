import { Platform } from 'react-native';
import {
  BlurStyle,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  matchFont,
  type SkCanvas,
  type SkColor,
  type SkFont,
  type SkMaskFilter,
  type SkPaint,
  type SkPathBuilder,
  type SkPicture,
  type SkPictureRecorder,
} from '@shopify/react-native-skia';
import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type BiomeRegion,
  type DivineEffect,
  type Entity,
  type Predator,
  type SimSettings,
  type SimState,
  type Structure,
  type Tribe,
  type WeatherType,
  type WorldResource,
} from '@/engine/types';
import { ACTIVITY_META, DIVINE_POWER_META, emotionColor, hslToRgb } from '@/constants/theme';

export interface CameraTransform {
  /** World X at center of viewport */
  cx: number;
  /** World Y at center of viewport */
  cy: number;
  /** Pixels per world unit */
  scale: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

interface TrailBuffer {
  xs: Float32Array;
  ys: Float32Array;
  head: number;
  count: number;
  lastSampleMs: number;
}

const TRAIL_POINTS = 18;

interface GpuResources {
  recorder: SkPictureRecorder;
  fill: SkPaint;
  stroke: SkPaint;
  glowSoft: SkPaint;
  glowMed: SkPaint;
  glowWide: SkPaint;
  blurSoft: SkMaskFilter;
  blurMed: SkMaskFilter;
  blurWide: SkMaskFilter;
  pathBuilder: SkPathBuilder;
  fontTiny: SkFont | null;
  fontSmall: SkFont | null;
  fontBiome: SkFont | null;
}

let gpu: GpuResources | null = null;
const hexColorCache = new Map<string, SkColor>();
const hslColorCache = new Map<number, SkColor>();
const trailMap = new Map<number, TrailBuffer>();

function getGpu(): GpuResources {
  if (gpu) return gpu;

  const fill = Skia.Paint();
  fill.setStyle(PaintStyle.Fill);
  fill.setAntiAlias(true);

  const stroke = Skia.Paint();
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setAntiAlias(true);
  stroke.setStrokeCap(StrokeCap.Round);
  stroke.setStrokeJoin(StrokeJoin.Round);

  const blurSoft = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 7, true);
  const blurMed = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 18, true);
  const blurWide = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 48, true);

  const glowSoft = Skia.Paint();
  glowSoft.setStyle(PaintStyle.Fill);
  glowSoft.setAntiAlias(true);
  glowSoft.setMaskFilter(blurSoft);

  const glowMed = Skia.Paint();
  glowMed.setStyle(PaintStyle.Fill);
  glowMed.setAntiAlias(true);
  glowMed.setMaskFilter(blurMed);

  const glowWide = Skia.Paint();
  glowWide.setStyle(PaintStyle.Fill);
  glowWide.setAntiAlias(true);
  glowWide.setMaskFilter(blurWide);

  let fontTiny: SkFont | null = null;
  let fontSmall: SkFont | null = null;
  let fontBiome: SkFont | null = null;

  if (Platform.OS !== 'web') {
    try {
      const family = Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }) ?? 'System';
      fontTiny = matchFont({ fontFamily: family, fontSize: 10, fontWeight: '600' });
      fontSmall = matchFont({ fontFamily: family, fontSize: 11.5, fontWeight: '700' });
      fontBiome = matchFont({ fontFamily: family, fontSize: 18, fontWeight: '700' });
    } catch {
      fontTiny = null;
      fontSmall = null;
      fontBiome = null;
    }
  }

  gpu = {
    recorder: Skia.PictureRecorder(),
    fill,
    stroke,
    glowSoft,
    glowMed,
    glowWide,
    blurSoft,
    blurMed,
    blurWide,
    pathBuilder: Skia.PathBuilder.Make(),
    fontTiny,
    fontSmall,
    fontBiome,
  };
  return gpu;
}

export function hasNativeSkiaFonts(): boolean {
  return getGpu().fontSmall !== null;
}

function skColorHex(colorStr: string): SkColor {
  let c = hexColorCache.get(colorStr);
  if (!c) {
    try {
      c = Skia.Color(colorStr);
    } catch {
      c = new Float32Array([0.17, 0.9, 0.85, 1]);
    }
    hexColorCache.set(colorStr, c);
  }
  return c;
}

function skColorHsl(h: number, s: number, l: number): SkColor {
  const hi = ((Math.round(h) % 360) + 360) % 360;
  const si = Math.max(0, Math.min(100, Math.round(s)));
  const li = Math.max(0, Math.min(100, Math.round(l)));
  const key = hi * 10201 + si * 101 + li;
  let c = hslColorCache.get(key);
  if (!c) {
    const [r, g, b] = hslToRgb(hi, si, li);
    c = new Float32Array([r / 255, g / 255, b / 255, 1]);
    hslColorCache.set(key, c);
  }
  return c;
}

function setPaintColor(paint: SkPaint, color: SkColor, alpha = 1): void {
  paint.setColor(color);
  paint.setAlphaf(Math.max(0, Math.min(1, alpha)));
}

/** Smooth 0..1 night intensity from dayPhase (0=dawn, 0.25=noon, 0.55=dusk, 0.8=midnight) */
export function computeNightFactor(dayPhase: number): number {
  const p = ((dayPhase % 1) + 1) % 1;
  if (p >= 0.14 && p <= 0.48) return 0;
  if (p > 0.48 && p < 0.66) {
    const u = (p - 0.48) / 0.18;
    return u * u * (3 - 2 * u);
  }
  if (p >= 0.66 && p <= 0.92) return 1;
  if (p > 0.92) {
    const u = (p - 0.92) / 0.08;
    return 1 - 0.35 * u;
  }
  // 0..0.14 dawn fade
  const u = p / 0.14;
  return 0.65 * (1 - u * u * (3 - 2 * u));
}

export function screenToWorld(
  sx: number,
  sy: number,
  camera: CameraTransform,
  viewport: ViewportSize
): { x: number; y: number } {
  const x = (sx - viewport.width * 0.5) / camera.scale + camera.cx;
  const y = (sy - viewport.height * 0.5) / camera.scale + camera.cy;
  return { x, y };
}

export function worldToScreen(
  wx: number,
  wy: number,
  camera: CameraTransform,
  viewport: ViewportSize
): { x: number; y: number } {
  const x = (wx - camera.cx) * camera.scale + viewport.width * 0.5;
  const y = (wy - camera.cy) * camera.scale + viewport.height * 0.5;
  return { x, y };
}

function recordTrailPoint(entity: Entity, nowMs: number): TrailBuffer {
  let buf = trailMap.get(entity.id);
  if (!buf) {
    buf = {
      xs: new Float32Array(TRAIL_POINTS),
      ys: new Float32Array(TRAIL_POINTS),
      head: 0,
      count: 0,
      lastSampleMs: 0,
    };
    trailMap.set(entity.id, buf);
  }
  if (nowMs - buf.lastSampleMs >= 65) {
    buf.xs[buf.head] = entity.x;
    buf.ys[buf.head] = entity.y;
    buf.head = (buf.head + 1) % TRAIL_POINTS;
    if (buf.count < TRAIL_POINTS) buf.count++;
    buf.lastSampleMs = nowMs;
  }
  return buf;
}

function drawAbyssalOceanAndGrid(
  canvas: SkCanvas,
  g: GpuResources,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  tSec: number,
  nightFactor: number
): void {
  // Deep continental shelf aura
  setPaintColor(g.glowWide, skColorHex('#0A2246'), 0.65);
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(-60, -60, WORLD_WIDTH + 120, WORLD_HEIGHT + 120), 220, 220),
    g.glowWide
  );

  // Continental seabed base
  setPaintColor(g.fill, skColorHex('#061022'), 0.96);
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT), 180, 180),
    g.fill
  );

  // Subtle observatory astrolabe coordinate grid
  g.stroke.setStrokeWidth(1);
  const gridColor = skColorHex('#38BDF8');
  setPaintColor(g.stroke, gridColor, 0.042);

  const startGx = Math.max(0, Math.floor(minX / 200) * 200);
  const endGx = Math.min(WORLD_WIDTH, Math.ceil(maxX / 200) * 200);
  for (let x = startGx; x <= endGx; x += 200) {
    canvas.drawLine(x, Math.max(0, minY), x, Math.min(WORLD_HEIGHT, maxY), g.stroke);
  }
  const startGy = Math.max(0, Math.floor(minY / 200) * 200);
  const endGy = Math.min(WORLD_HEIGHT, Math.ceil(maxY / 200) * 200);
  for (let y = startGy; y <= endGy; y += 200) {
    canvas.drawLine(Math.max(0, minX), y, Math.min(WORLD_WIDTH, maxX), y, g.stroke);
  }

  // Outer world boundary hairline frame
  g.stroke.setStrokeWidth(2);
  setPaintColor(g.stroke, skColorHex('#2CE6D8'), 0.16);
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT), 180, 180),
    g.stroke
  );

  // Drifting abyssal plankton motes (brighter at night)
  const moteAlphaBase = 0.12 + nightFactor * 0.28;
  const cyanColor = skColorHex('#67E8F9');
  const violetColor = skColorHex('#C084FC');
  for (let i = 0; i < 48; i++) {
    const seedX = ((i * 521 + 193) % 2360) + 20;
    const seedY = ((i * 389 + 107) % 1760) + 20;
    const px = seedX + Math.sin(tSec * 0.35 + i * 1.3) * 22;
    const py = seedY + Math.cos(tSec * 0.28 + i * 0.9) * 18;
    if (px < minX || px > maxX || py < minY || py > maxY) continue;
    const pulse = 0.5 + 0.5 * Math.sin(tSec * 1.6 + i * 2.1);
    setPaintColor(g.fill, i % 3 === 0 ? violetColor : cyanColor, moteAlphaBase * pulse);
    canvas.drawCircle(px, py, 1.6 + (i % 3) * 0.9, g.fill);
  }
}

function drawBiomes(
  canvas: SkCanvas,
  g: GpuResources,
  biomes: BiomeRegion[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  scale: number,
  tSec: number,
  nightFactor: number
): void {
  for (let i = 0; i < biomes.length; i++) {
    const b = biomes[i];
    if (
      b.centerX + b.radiusX * 1.25 < minX ||
      b.centerX - b.radiusX * 1.25 > maxX ||
      b.centerY + b.radiusY * 1.25 < minY ||
      b.centerY - b.radiusY * 1.25 > maxY
    ) {
      continue;
    }

    const primary = skColorHex(b.primaryColor);
    const secondary = skColorHex(b.secondaryColor);
    const glow = skColorHex(b.glowColor);

    // Soft outer biome glow
    setPaintColor(g.glowWide, glow, 0.13 + nightFactor * 0.1);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX * 1.06,
        b.centerY - b.radiusY * 1.06,
        b.radiusX * 2.12,
        b.radiusY * 2.12
      ),
      g.glowWide
    );

    // Secondary deep landmass shelf
    setPaintColor(g.fill, secondary, 0.72);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX,
        b.centerY - b.radiusY,
        b.radiusX * 2,
        b.radiusY * 2
      ),
      g.fill
    );

    // Inner fertile terrace
    setPaintColor(g.fill, primary, 0.14);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX * 0.76,
        b.centerY - b.radiusY * 0.74,
        b.radiusX * 1.52,
        b.radiusY * 1.48
      ),
      g.fill
    );

    // Core sanctuary terrace
    setPaintColor(g.fill, glow, 0.08 + nightFactor * 0.05);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX * 0.44,
        b.centerY - b.radiusY * 0.42,
        b.radiusX * 0.88,
        b.radiusY * 0.84
      ),
      g.fill
    );

    // Topographic contour rings
    g.stroke.setStrokeWidth(1.2);
    setPaintColor(g.stroke, primary, 0.22);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX,
        b.centerY - b.radiusY,
        b.radiusX * 2,
        b.radiusY * 2
      ),
      g.stroke
    );
    setPaintColor(g.stroke, glow, 0.12);
    canvas.drawOval(
      Skia.XYWHRect(
        b.centerX - b.radiusX * 0.68,
        b.centerY - b.radiusY * 0.66,
        b.radiusX * 1.36,
        b.radiusY * 1.32
      ),
      g.stroke
    );

    // Biome-specific micro-details
    if (b.id === 'lagoon') {
      // Shimmering water caustic rings
      g.stroke.setStrokeWidth(1.5);
      for (let k = 0; k < 5; k++) {
        const ang = k * 1.25 + tSec * 0.12;
        const wx = b.centerX + Math.cos(ang) * b.radiusX * 0.36;
        const wy = b.centerY + Math.sin(ang) * b.radiusY * 0.34;
        const r = 26 + ((tSec * 14 + k * 21) % 52);
        const alpha = (1 - (r - 26) / 52) * 0.24;
        setPaintColor(g.stroke, glow, alpha);
        canvas.drawCircle(wx, wy, r, g.stroke);
      }
    } else if (b.id === 'archive') {
      // Sacred geometric octagram / leyline rings in Archive ruins
      g.stroke.setStrokeWidth(1.3);
      setPaintColor(g.stroke, glow, 0.18 + nightFactor * 0.12);
      const rRing = Math.min(b.radiusX, b.radiusY) * 0.46;
      canvas.drawCircle(b.centerX, b.centerY, rRing, g.stroke);
      canvas.drawCircle(b.centerX, b.centerY, rRing * 0.58, g.stroke);
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + tSec * 0.04;
        canvas.drawLine(
          b.centerX + Math.cos(a) * rRing * 0.58,
          b.centerY + Math.sin(a) * rRing * 0.58,
          b.centerX + Math.cos(a) * rRing,
          b.centerY + Math.sin(a) * rRing,
          g.stroke
        );
      }
    } else if (b.id === 'ashlands') {
      // Geothermal magma vents & drifting embers
      const emberCol = skColorHex('#FB923C');
      for (let k = 0; k < 6; k++) {
        const vx = b.centerX + Math.cos(k * 1.05 + 0.4) * b.radiusX * 0.42;
        const vy = b.centerY + Math.sin(k * 1.05 + 0.4) * b.radiusY * 0.38;
        const pulse = 0.55 + 0.45 * Math.sin(tSec * 2.4 + k);
        setPaintColor(g.glowSoft, emberCol, 0.25 * pulse);
        canvas.drawCircle(vx, vy, 16, g.glowSoft);
        setPaintColor(g.fill, emberCol, 0.42 * pulse);
        canvas.drawCircle(vx, vy, 5.5, g.fill);
      }
    } else if (b.id === 'abyss') {
      //Pulsing star-spore mist orbs
      for (let k = 0; k < 7; k++) {
        const sx = b.centerX + Math.cos(k * 0.9 + tSec * 0.08) * b.radiusX * 0.48;
        const sy = b.centerY + Math.sin(k * 1.3 - tSec * 0.06) * b.radiusY * 0.44;
        const pulse = 0.4 + 0.6 * Math.sin(tSec * 1.8 + k * 1.7);
        setPaintColor(g.glowSoft, glow, (0.18 + nightFactor * 0.18) * pulse);
        canvas.drawCircle(sx, sy, 14, g.glowSoft);
      }
    } else if (b.id === 'eden') {
      // Golden nectar pollen motes
      const goldCol = skColorHex('#FDE047');
      for (let k = 0; k < 7; k++) {
        const px = b.centerX + Math.cos(k * 0.92 + tSec * 0.18) * b.radiusX * 0.45;
        const py = b.centerY + Math.sin(k * 1.15 + tSec * 0.15) * b.radiusY * 0.42;
        setPaintColor(g.fill, goldCol, 0.28);
        canvas.drawCircle(px, py, 2.6, g.fill);
      }
    }

    // Subtle biome cartography label when viewing medium/wide zoom
    if (g.fontBiome && scale < 0.95) {
      const labelAlpha = Math.max(0.14, Math.min(0.58, (0.95 - scale) * 0.9));
      const rect = g.fontBiome.measureText(b.nameEs);
      setPaintColor(g.fill, glow, labelAlpha);
      canvas.drawText(b.nameEs, b.centerX - rect.width * 0.5, b.centerY + 6, g.fill, g.fontBiome);
    }
  }
}

function drawTribeTerritories(
  canvas: SkCanvas,
  g: GpuResources,
  tribes: Tribe[],
  tSec: number
): void {
  for (let i = 0; i < tribes.length; i++) {
    const tribe = tribes[i];
    if (tribe.memberIds.length === 0) continue;
    const col = skColorHex(tribe.color);
    const radius = 95 + Math.min(130, tribe.memberIds.length * 16);
    const pulse = 0.85 + 0.15 * Math.sin(tSec * 1.2 + tribe.id);

    setPaintColor(g.fill, col, 0.045 * pulse);
    canvas.drawCircle(tribe.homeX, tribe.homeY, radius, g.fill);

    g.stroke.setStrokeWidth(1.4);
    setPaintColor(g.stroke, col, 0.24 * pulse);
    canvas.drawCircle(tribe.homeX, tribe.homeY, radius, g.stroke);
  }
}

function drawResources(
  canvas: SkCanvas,
  g: GpuResources,
  resources: WorldResource[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  tSec: number,
  nightFactor: number
): void {
  for (let i = 0; i < resources.length; i++) {
    const res = resources[i];
    if (res.x < minX || res.x > maxX || res.y < minY || res.y > maxY) continue;

    const fullness = Math.max(0.08, Math.min(1, res.amount / Math.max(1, res.maxAmount)));
    const r = Math.max(7, res.radius || 12) * (0.68 + 0.32 * fullness);

    switch (res.kind) {
      case 'nectar_tree': {
        const canopyCol = skColorHex('#10B981');
        const fruitCol = skColorHex('#F6C453');
        setPaintColor(g.glowSoft, fruitCol, (0.12 + nightFactor * 0.2) * fullness);
        canvas.drawCircle(res.x, res.y, r * 1.45, g.glowSoft);

        setPaintColor(g.fill, skColorHex('#065F46'), 0.88);
        canvas.drawCircle(res.x, res.y, r, g.fill);
        setPaintColor(g.fill, canopyCol, 0.72 * fullness + 0.15);
        canvas.drawCircle(res.x - r * 0.24, res.y - r * 0.2, r * 0.68, g.fill);

        const fruitCount = Math.round(fullness * 4);
        setPaintColor(g.fill, fruitCol, 0.95);
        for (let f = 0; f < fruitCount; f++) {
          const a = f * 1.57 + 0.4;
          canvas.drawCircle(
            res.x + Math.cos(a) * r * 0.52,
            res.y + Math.sin(a) * r * 0.52,
            2.4,
            g.fill
          );
        }
        break;
      }

      case 'berry_bush': {
        setPaintColor(g.fill, skColorHex('#0F766E'), 0.85);
        canvas.drawCircle(res.x, res.y, r * 0.82, g.fill);
        const berryCol = skColorHex('#FF6B9D');
        const berries = Math.round(fullness * 3);
        setPaintColor(g.fill, berryCol, 0.92);
        for (let b = 0; b < berries; b++) {
          const a = b * 2.1 + 0.3;
          canvas.drawCircle(
            res.x + Math.cos(a) * r * 0.4,
            res.y + Math.sin(a) * r * 0.4,
            2.1,
            g.fill
          );
        }
        break;
      }

      case 'water_spring': {
        const waterCol = skColorHex('#38BDF8');
        const cyanGlow = skColorHex('#67E8F9');
        setPaintColor(g.glowSoft, cyanGlow, 0.22 * fullness);
        canvas.drawCircle(res.x, res.y, r * 1.4, g.glowSoft);
        setPaintColor(g.fill, skColorHex('#0C4A6E'), 0.9);
        canvas.drawCircle(res.x, res.y, r * 0.95, g.fill);
        setPaintColor(g.fill, waterCol, 0.65 * fullness + 0.2);
        canvas.drawCircle(res.x, res.y, r * 0.62, g.fill);

        const ripple = ((tSec * 0.9 + res.id * 0.37) % 1) * r * 1.25;
        g.stroke.setStrokeWidth(1.1);
        setPaintColor(g.stroke, cyanGlow, (1 - ripple / (r * 1.25)) * 0.55);
        canvas.drawCircle(res.x, res.y, ripple, g.stroke);
        break;
      }

      case 'timber_grove': {
        const bark = skColorHex('#78350F');
        const leaf = skColorHex('#34D399');
        for (let k = -1; k <= 1; k++) {
          const ox = res.x + k * r * 0.42;
          const oy = res.y + Math.abs(k) * 3;
          setPaintColor(g.fill, bark, 0.85);
          canvas.drawCircle(ox, oy + 3, 2.5, g.fill);
          setPaintColor(g.fill, leaf, 0.5 + 0.4 * fullness);
          canvas.drawCircle(ox, oy - 2, r * 0.44, g.fill);
        }
        break;
      }

      case 'stone_outcrop': {
        setPaintColor(g.fill, skColorHex('#475569'), 0.88);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(res.x - r * 0.8, res.y - r * 0.65, r * 1.6, r * 1.3), 4, 4),
          g.fill
        );
        setPaintColor(g.fill, skColorHex('#94A3B8'), 0.55 * fullness);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(res.x - r * 0.45, res.y - r * 0.4, r * 0.9, r * 0.7), 3, 3),
          g.fill
        );
        break;
      }

      case 'crystal_node': {
        const crys = skColorHex('#C084FC');
        const gleam = skColorHex('#E9D5FF');
        const pulse = 0.75 + 0.25 * Math.sin(tSec * 2.5 + res.id);
        setPaintColor(g.glowSoft, crys, (0.25 + nightFactor * 0.28) * fullness * pulse);
        canvas.drawCircle(res.x, res.y, r * 1.5, g.glowSoft);

        g.pathBuilder.reset();
        g.pathBuilder
          .moveTo(res.x, res.y - r * 1.15)
          .lineTo(res.x + r * 0.72, res.y)
          .lineTo(res.x, res.y + r * 0.95)
          .lineTo(res.x - r * 0.72, res.y)
          .close();
        const diamond = g.pathBuilder.detach();
        setPaintColor(g.fill, crys, 0.86 * fullness + 0.14);
        canvas.drawPath(diamond, g.fill);

        setPaintColor(g.fill, gleam, 0.7 * fullness);
        canvas.drawCircle(res.x - r * 0.15, res.y - r * 0.28, 2.2, g.fill);
        break;
      }

      case 'healing_herb': {
        const herb = skColorHex('#6EE7B7');
        setPaintColor(g.glowSoft, herb, 0.2 * fullness);
        canvas.drawCircle(res.x, res.y, r * 1.2, g.glowSoft);
        setPaintColor(g.fill, herb, 0.85 * fullness + 0.15);
        for (let p = 0; p < 5; p++) {
          const a = (p * Math.PI * 2) / 5 + tSec * 0.25;
          canvas.drawCircle(
            res.x + Math.cos(a) * r * 0.45,
            res.y + Math.sin(a) * r * 0.45,
            r * 0.3,
            g.fill
          );
        }
        setPaintColor(g.fill, skColorHex('#FEF08A'), 0.9);
        canvas.drawCircle(res.x, res.y, 2.2, g.fill);
        break;
      }

      case 'star_spore': {
        const spore = skColorHex('#818CF8');
        const core = skColorHex('#FDE047');
        const pulse = 0.65 + 0.35 * Math.sin(tSec * 3.1 + res.id);
        setPaintColor(g.glowMed, spore, (0.32 + nightFactor * 0.3) * fullness * pulse);
        canvas.drawCircle(res.x, res.y, r * 1.6, g.glowMed);
        setPaintColor(g.fill, spore, 0.88);
        canvas.drawCircle(res.x, res.y, r * 0.68, g.fill);
        setPaintColor(g.fill, core, 0.95);
        canvas.drawCircle(res.x, res.y, r * 0.28, g.fill);
        break;
      }
    }
  }
}

function drawStructures(
  canvas: SkCanvas,
  g: GpuResources,
  structures: Structure[],
  tribeColorById: Map<number, string>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  tSec: number,
  nightFactor: number
): void {
  for (let i = 0; i < structures.length; i++) {
    const st = structures[i];
    if (st.x + 90 < minX || st.x - 90 > maxX || st.y + 90 < minY || st.y - 90 > maxY) continue;

    const clanHex = (st.tribeId && tribeColorById.get(st.tribeId)) || '#2CE6D8';
    const clanCol = skColorHex(clanHex);

    switch (st.kind) {
      case 'campfire': {
        const flicker = 0.82 + 0.18 * Math.sin(tSec * 11 + st.id * 2.3);
        const fireCol = skColorHex('#FB923C');
        const coreCol = skColorHex('#FDE047');

        // Warm nocturnal halo
        setPaintColor(g.glowWide, fireCol, (0.2 + nightFactor * 0.42) * flicker);
        canvas.drawCircle(st.x, st.y, Math.max(48, st.auraRadius * 0.55), g.glowWide);

        // Stone hearth ring
        g.stroke.setStrokeWidth(2.6);
        setPaintColor(g.stroke, skColorHex('#64748B'), 0.9);
        canvas.drawCircle(st.x, st.y + 2, 10, g.stroke);

        // Animated flame tongue
        setPaintColor(g.fill, fireCol, 0.95);
        canvas.drawCircle(st.x, st.y - 1, 7.5 * flicker, g.fill);
        setPaintColor(g.fill, coreCol, 0.98);
        canvas.drawCircle(st.x, st.y - 3 * flicker, 4.2 * flicker, g.fill);
        break;
      }

      case 'shelter': {
        setPaintColor(g.glowSoft, clanCol, 0.18 + nightFactor * 0.15);
        canvas.drawCircle(st.x, st.y, 22, g.glowSoft);

        setPaintColor(g.fill, skColorHex('#0F2942'), 0.94);
        canvas.drawCircle(st.x, st.y, 15, g.fill);

        g.stroke.setStrokeWidth(2.2);
        setPaintColor(g.stroke, clanCol, 0.85);
        canvas.drawCircle(st.x, st.y, 15, g.stroke);

        // Geodesic dome ribs
        g.stroke.setStrokeWidth(1.1);
        setPaintColor(g.stroke, skColorHex('#34E08F'), 0.55);
        canvas.drawLine(st.x - 11, st.y, st.x + 11, st.y, g.stroke);
        canvas.drawLine(st.x, st.y - 11, st.x, st.y + 11, g.stroke);

        // Warm doorway glow
        setPaintColor(g.fill, skColorHex('#F6C453'), 0.8);
        canvas.drawCircle(st.x, st.y + 10, 3.2, g.fill);
        break;
      }

      case 'granary': {
        setPaintColor(g.fill, skColorHex('#1E293B'), 0.95);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(st.x - 13, st.y - 11, 26, 22), 7, 7),
          g.fill
        );
        g.stroke.setStrokeWidth(2);
        setPaintColor(g.stroke, skColorHex('#F6C453'), 0.85);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(st.x - 13, st.y - 11, 26, 22), 7, 7),
          g.stroke
        );
        const pips = Math.min(4, Math.max(1, Math.ceil((st.storedFood || 10) / 25)));
        setPaintColor(g.fill, skColorHex('#FDE047'), 0.92);
        for (let p = 0; p < pips; p++) {
          canvas.drawCircle(st.x - 6 + p * 4, st.y, 2, g.fill);
        }
        break;
      }

      case 'farm': {
        setPaintColor(g.fill, skColorHex('#064E3B'), 0.55);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(st.x - 18, st.y - 12, 36, 24), 6, 6),
          g.fill
        );
        g.stroke.setStrokeWidth(1.8);
        const cropCol = skColorHex('#4ADE80');
        setPaintColor(g.stroke, cropCol, 0.82);
        for (let r = -7; r <= 7; r += 7) {
          canvas.drawLine(st.x - 13, st.y + r, st.x + 13, st.y + r, g.stroke);
        }
        break;
      }

      case 'totem': {
        setPaintColor(g.glowSoft, clanCol, 0.3);
        canvas.drawCircle(st.x, st.y - 4, 18, g.glowSoft);
        g.stroke.setStrokeWidth(3.2);
        setPaintColor(g.stroke, clanCol, 0.95);
        canvas.drawLine(st.x, st.y + 12, st.x, st.y - 14, g.stroke);
        canvas.drawLine(st.x - 9, st.y - 6, st.x + 9, st.y - 6, g.stroke);
        setPaintColor(g.fill, skColorHex('#ECF4FF'), 0.95);
        canvas.drawCircle(st.x, st.y - 15, 3.6, g.fill);
        break;
      }

      case 'watchtower': {
        const beaconCol = skColorHex('#38BDF8');
        // Anti-Umbra aura ring
        g.stroke.setStrokeWidth(1);
        setPaintColor(g.stroke, beaconCol, 0.16);
        canvas.drawCircle(st.x, st.y, Math.max(45, st.auraRadius * 0.5), g.stroke);

        // Sweeping sentinel ray
        const sweepA = tSec * 1.4 + st.id;
        g.pathBuilder.reset();
        g.pathBuilder
          .moveTo(st.x, st.y - 8)
          .lineTo(st.x + Math.cos(sweepA - 0.28) * 58, st.y - 8 + Math.sin(sweepA - 0.28) * 58)
          .lineTo(st.x + Math.cos(sweepA + 0.28) * 58, st.y - 8 + Math.sin(sweepA + 0.28) * 58)
          .close();
        setPaintColor(g.fill, beaconCol, 0.14 + nightFactor * 0.14);
        canvas.drawPath(g.pathBuilder.detach(), g.fill);

        g.stroke.setStrokeWidth(2.4);
        setPaintColor(g.stroke, clanCol, 0.9);
        canvas.drawLine(st.x - 8, st.y + 11, st.x, st.y - 9, g.stroke);
        canvas.drawLine(st.x + 8, st.y + 11, st.x, st.y - 9, g.stroke);
        setPaintColor(g.fill, beaconCol, 0.98);
        canvas.drawCircle(st.x, st.y - 10, 4.5, g.fill);
        break;
      }

      case 'monolith': {
        const monoCol = skColorHex('#B57CFF');
        const runeCol = skColorHex('#2CE6D8');
        const pulse = 0.72 + 0.28 * Math.sin(tSec * 2.1 + st.id);

        setPaintColor(g.glowMed, monoCol, (0.34 + nightFactor * 0.26) * pulse);
        canvas.drawCircle(st.x, st.y - 6, 30, g.glowMed);

        // Pulsing wisdom wave
        const waveR = 16 + ((tSec * 18 + st.id * 11) % 44);
        g.stroke.setStrokeWidth(1.2);
        setPaintColor(g.stroke, monoCol, (1 - (waveR - 16) / 44) * 0.42);
        canvas.drawCircle(st.x, st.y, waveR, g.stroke);

        // Tall obsidian obelisk
        g.pathBuilder.reset();
        g.pathBuilder
          .moveTo(st.x, st.y - 24)
          .lineTo(st.x + 8, st.y - 14)
          .lineTo(st.x + 10, st.y + 14)
          .lineTo(st.x - 10, st.y + 14)
          .lineTo(st.x - 8, st.y - 14)
          .close();
        const obelisk = g.pathBuilder.detach();
        setPaintColor(g.fill, skColorHex('#150E2E'), 0.96);
        canvas.drawPath(obelisk, g.fill);
        g.stroke.setStrokeWidth(1.6);
        setPaintColor(g.stroke, monoCol, 0.92);
        canvas.drawPath(obelisk, g.stroke);

        // Glowing etched rune line
        g.stroke.setStrokeWidth(1.8);
        setPaintColor(g.stroke, runeCol, 0.9 * pulse);
        canvas.drawLine(st.x, st.y - 12, st.x, st.y + 7, g.stroke);
        canvas.drawCircle(st.x, st.y - 15, 2, g.fill);
        break;
      }

      case 'memorial': {
        const memCol = skColorHex('#E2E8F0');
        setPaintColor(g.glowSoft, memCol, 0.22 + nightFactor * 0.2);
        canvas.drawCircle(st.x, st.y - 2, 12, g.glowSoft);
        setPaintColor(g.fill, memCol, 0.85);
        canvas.drawRRect(
          Skia.RRectXY(Skia.XYWHRect(st.x - 4.5, st.y - 10, 9, 18), 4, 4),
          g.fill
        );
        const soulY = st.y - 14 - Math.sin(tSec * 2 + st.id) * 3;
        setPaintColor(g.fill, skColorHex('#67E8F9'), 0.85);
        canvas.drawCircle(st.x, soulY, 2.2, g.fill);
        break;
      }
    }
  }
}

function drawPredators(
  canvas: SkCanvas,
  g: GpuResources,
  predators: Predator[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  tSec: number
): void {
  const umbraCore = skColorHex('#1A061E');
  const umbraCrimson = skColorHex('#FF4D6D');
  const umbraViolet = skColorHex('#9333EA');

  for (let i = 0; i < predators.length; i++) {
    const p = predators[i];
    if (p.hp <= 0) continue;
    if (p.x + 60 < minX || p.x - 60 > maxX || p.y + 60 < minY || p.y - 60 > maxY) continue;

    const isStalking = p.state === 'stalking';
    const r = isStalking ? 17 : 14.5;

    // Smoky crimson-violet aura
    setPaintColor(g.glowMed, isStalking ? umbraCrimson : umbraViolet, isStalking ? 0.48 : 0.3);
    canvas.drawCircle(p.x, p.y, r * 1.8, g.glowMed);

    canvas.save();
    canvas.translate(p.x, p.y);
    canvas.rotate((p.heading * 180) / Math.PI, 0, 0);

    // Shadow tendrils trailing behind (-X)
    g.stroke.setStrokeWidth(2.6);
    setPaintColor(g.stroke, umbraViolet, 0.72);
    for (let t = -1; t <= 1; t++) {
      const wave = Math.sin(tSec * 7 + p.id + t * 1.4) * 5;
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(-r * 0.4, t * 5)
        .quadTo(-r * 1.3, t * 8 + wave, -r * 2.1, t * 6 - wave * 0.6);
      canvas.drawPath(g.pathBuilder.detach(), g.stroke);
    }

    // Jagged Umbra mantle
    g.pathBuilder.reset();
    g.pathBuilder
      .moveTo(r * 1.25, 0)
      .quadTo(r * 0.3, -r * 1.05, -r * 0.95, -r * 0.72)
      .lineTo(-r * 0.55, 0)
      .lineTo(-r * 0.95, r * 0.72)
      .quadTo(r * 0.3, r * 1.05, r * 1.25, 0)
      .close();
    const bodyPath = g.pathBuilder.detach();
    setPaintColor(g.fill, umbraCore, 0.96);
    canvas.drawPath(bodyPath, g.fill);

    g.stroke.setStrokeWidth(1.5);
    setPaintColor(g.stroke, umbraCrimson, isStalking ? 0.95 : 0.65);
    canvas.drawPath(bodyPath, g.stroke);

    // Piercing predator eyes
    setPaintColor(g.fill, umbraCrimson, 1);
    canvas.drawCircle(r * 0.48, -4.2, 2.5, g.fill);
    canvas.drawCircle(r * 0.48, 4.2, 2.5, g.fill);
    setPaintColor(g.fill, skColorHex('#FEF08A'), 0.95);
    canvas.drawCircle(r * 0.54, -4.2, 1.0, g.fill);
    canvas.drawCircle(r * 0.54, 4.2, 1.0, g.fill);

    canvas.restore();
  }
}

function drawCreature(
  canvas: SkCanvas,
  g: GpuResources,
  entity: Entity,
  tribeColorById: Map<number, string>,
  isSelected: boolean,
  settings: SimSettings,
  scale: number,
  tSec: number,
  nightFactor: number
): void {
  const { morphology, genome } = entity;
  const stageBase =
    entity.lifeStage === 'larva'
      ? 7.8
      : entity.lifeStage === 'juvenile'
      ? 10.4
      : entity.lifeStage === 'adult'
      ? 13.2
      : 14.2;

  const r =
    stageBase *
    Math.max(0.7, Math.min(1.45, morphology.bodyScale || 1)) *
    (0.86 + (genome.sizeGene ?? 0.5) * 0.3);

  const bodyCol = skColorHsl(morphology.bodyHue, 78, 56);
  const bodyDarkCol = skColorHsl(morphology.bodyHue, 72, 28);
  const accentCol = skColorHsl(morphology.accentHue, 90, 66);
  const emoCol = skColorHex(emotionColor(entity.emotionalState?.emotion));

  const speedMag = Math.hypot(entity.vx, entity.vy);
  const breath = 1 + 0.042 * Math.sin(tSec * 3.4 + entity.id * 1.37);

  // 1. Optional Sensory Vision Cone
  if (settings.showSenseCones || isSelected) {
    const senseRange = 58 + (genome.senseGene ?? 0.5) * 105;
    const coneHalf = 0.42;
    g.pathBuilder.reset();
    g.pathBuilder
      .moveTo(entity.x, entity.y)
      .lineTo(
        entity.x + Math.cos(entity.heading - coneHalf) * senseRange,
        entity.y + Math.sin(entity.heading - coneHalf) * senseRange
      )
      .quadTo(
        entity.x + Math.cos(entity.heading) * senseRange * 1.12,
        entity.y + Math.sin(entity.heading) * senseRange * 1.12,
        entity.x + Math.cos(entity.heading + coneHalf) * senseRange,
        entity.y + Math.sin(entity.heading + coneHalf) * senseRange
      )
      .close();
    setPaintColor(g.fill, accentCol, isSelected ? 0.11 : 0.055);
    canvas.drawPath(g.pathBuilder.detach(), g.fill);
  }

  // 2. Selected Creature Target Vector
  if (isSelected && entity.targetX != null && entity.targetY != null) {
    g.stroke.setStrokeWidth(1.2);
    setPaintColor(g.stroke, skColorHex('#2CE6D8'), 0.32);
    canvas.drawLine(entity.x, entity.y, entity.targetX, entity.targetY, g.stroke);
    canvas.drawCircle(entity.targetX, entity.targetY, 4, g.stroke);
  }

  // 3. Bioluminescent Nocturnal & Emotional Aura
  const bioStrength =
    0.14 + (genome.bioluminescence ?? 0.5) * (0.22 + nightFactor * 0.58);
  setPaintColor(g.glowMed, accentCol, Math.min(0.85, bioStrength));
  canvas.drawCircle(entity.x, entity.y, r * (1.55 + nightFactor * 0.45), g.glowMed);

  // Clan membership ring
  if (entity.tribeId != null) {
    const clanHex = tribeColorById.get(entity.tribeId);
    if (clanHex) {
      g.stroke.setStrokeWidth(1.5);
      setPaintColor(g.stroke, skColorHex(clanHex), 0.58);
      canvas.drawCircle(entity.x, entity.y, r * 1.38, g.stroke);
    }
  }

  // Gestation shimmer ring
  if (entity.gestationTicks > 0) {
    const gPulse = 0.6 + 0.4 * Math.sin(tSec * 5 + entity.id);
    g.stroke.setStrokeWidth(1.6);
    setPaintColor(g.stroke, skColorHex('#FF6B9D'), 0.75 * gPulse);
    canvas.drawCircle(entity.x, entity.y, r * 1.56, g.stroke);
  }

  // Critical homeostasis warning arc
  if (entity.energy < 24 || entity.hydration < 24 || entity.health < 30) {
    const warnCol =
      entity.health < 30
        ? skColorHex('#FF4D6D')
        : entity.hydration < 24
        ? skColorHex('#38BDF8')
        : skColorHex('#F6C453');
    g.stroke.setStrokeWidth(1.8);
    setPaintColor(g.stroke, warnCol, 0.55 + 0.4 * Math.sin(tSec * 7));
    canvas.drawCircle(entity.x, entity.y, r * 1.65, g.stroke);
  }

  // 4. Oriented Creature Morphology (Local space: +X = forward heading)
  canvas.save();
  canvas.translate(entity.x, entity.y);
  canvas.rotate((entity.heading * 180) / Math.PI, 0, 0);

  const wagFreq = 3.2 + Math.min(8, speedMag * 0.1);
  const wag = Math.sin(tSec * wagFreq + entity.id * 1.9) * r * 0.42;

  // 4a. Animated Tail (-X)
  if (morphology.tail === 'wispy') {
    g.stroke.setStrokeWidth(Math.max(2, r * 0.24));
    setPaintColor(g.stroke, accentCol, 0.82);
    g.pathBuilder.reset();
    g.pathBuilder
      .moveTo(-r * 0.78, 0)
      .quadTo(-r * 1.55, wag, -r * 2.35, -wag * 0.65);
    canvas.drawPath(g.pathBuilder.detach(), g.stroke);
    setPaintColor(g.fill, accentCol, 0.95);
    canvas.drawCircle(-r * 2.35, -wag * 0.65, r * 0.16, g.fill);
  } else if (morphology.tail === 'twin') {
    g.stroke.setStrokeWidth(Math.max(1.6, r * 0.17));
    setPaintColor(g.stroke, accentCol, 0.8);
    for (const side of [-1, 1]) {
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(-r * 0.72, side * r * 0.22)
        .quadTo(
          -r * 1.48,
          side * r * 0.58 + wag * 0.65,
          -r * 2.15,
          side * r * 0.42 - wag * 0.45
        );
      canvas.drawPath(g.pathBuilder.detach(), g.stroke);
      setPaintColor(g.fill, accentCol, 0.92);
      canvas.drawCircle(
        -r * 2.15,
        side * r * 0.42 - wag * 0.45,
        r * 0.13,
        g.fill
      );
    }
  } else if (morphology.tail === 'segmented') {
    for (let seg = 1; seg <= 3; seg++) {
      const sx = -r * (0.72 + seg * 0.42);
      const sy = Math.sin(tSec * wagFreq + entity.id + seg * 0.85) * r * 0.16 * seg;
      const sr = r * (0.34 - seg * 0.065);
      setPaintColor(g.fill, seg % 2 === 0 ? accentCol : bodyCol, 0.9);
      canvas.drawCircle(sx, sy, Math.max(1.5, sr), g.fill);
    }
  }

  // 4b. Crest / Head Ornament (+X / lateral)
  if (morphology.crest === 'halo') {
    g.stroke.setStrokeWidth(1.8);
    setPaintColor(g.stroke, skColorHex('#FDE047'), 0.9);
    canvas.drawCircle(r * 0.95, 0, r * 0.36, g.stroke);
  } else if (morphology.crest === 'antlers') {
    g.stroke.setStrokeWidth(1.7);
    setPaintColor(g.stroke, accentCol, 0.92);
    for (const s of [-1, 1]) {
      canvas.drawLine(r * 0.25, s * r * 0.55, r * 0.72, s * r * 1.18, g.stroke);
      canvas.drawLine(r * 0.52, s * r * 0.92, r * 0.92, s * r * 0.95, g.stroke);
      canvas.drawLine(r * 0.52, s * r * 0.92, r * 0.45, s * r * 1.28, g.stroke);
    }
  } else if (morphology.crest === 'horns') {
    g.stroke.setStrokeWidth(2.2);
    setPaintColor(g.stroke, accentCol, 0.95);
    for (const s of [-1, 1]) {
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(r * 0.35, s * r * 0.52)
        .quadTo(r * 0.95, s * r * 0.98, r * 1.32, s * r * 0.42);
      canvas.drawPath(g.pathBuilder.detach(), g.stroke);
    }
  } else if (morphology.crest === 'fins') {
    setPaintColor(g.fill, accentCol, 0.58);
    for (const s of [-1, 1]) {
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(r * 0.25, s * r * 0.65)
        .quadTo(-r * 0.15, s * r * 1.45, -r * 0.75, s * r * 0.95)
        .lineTo(-r * 0.35, s * r * 0.55)
        .close();
      canvas.drawPath(g.pathBuilder.detach(), g.fill);
    }
  } else if (morphology.crest === 'crown') {
    const crownCol = skColorHex('#F6C453');
    setPaintColor(g.fill, crownCol, 0.95);
    for (const s of [-1, 0, 1]) {
      const ang = s * 0.42;
      const px = Math.cos(ang) * r * 1.16;
      const py = Math.sin(ang) * r * 1.05;
      canvas.drawCircle(px, py, r * 0.15, g.fill);
    }
  }

  // 4c. Organic Soma Body (sleek elongated oval with breathing squash & stretch)
  const rx = r * 1.08 * breath;
  const ry = r * (2 - breath) * 0.88;

  // Deep shadow rim
  setPaintColor(g.fill, bodyDarkCol, 0.96);
  canvas.drawOval(Skia.XYWHRect(-rx, -ry, rx * 2, ry * 2), g.fill);

  // Main bioluminescent soma fill
  setPaintColor(g.fill, bodyCol, 0.95);
  canvas.drawOval(
    Skia.XYWHRect(-rx * 0.92, -ry * 0.9, rx * 1.88, ry * 1.8),
    g.fill
  );

  // 4d. Phenotypic Body Pattern
  if (morphology.pattern === 'solid') {
    setPaintColor(g.fill, accentCol, 0.32);
    canvas.drawOval(
      Skia.XYWHRect(-rx * 0.45, -ry * 0.48, rx * 1.05, ry * 0.96),
      g.fill
    );
  } else if (morphology.pattern === 'spotted') {
    setPaintColor(g.fill, accentCol, 0.82);
    canvas.drawCircle(-rx * 0.38, -ry * 0.36, r * 0.19, g.fill);
    canvas.drawCircle(-rx * 0.38, ry * 0.36, r * 0.19, g.fill);
    canvas.drawCircle(-rx * 0.65, 0, r * 0.16, g.fill);
    canvas.drawCircle(0, -ry * 0.46, r * 0.14, g.fill);
    canvas.drawCircle(0, ry * 0.46, r * 0.14, g.fill);
  } else if (morphology.pattern === 'striped') {
    g.stroke.setStrokeWidth(Math.max(1.5, r * 0.16));
    setPaintColor(g.stroke, accentCol, 0.78);
    for (let st = -1; st <= 1; st++) {
      const bx = -rx * 0.18 + st * rx * 0.32;
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(bx - r * 0.14, -ry * 0.72)
        .quadTo(bx + r * 0.16, 0, bx - r * 0.14, ry * 0.72);
      canvas.drawPath(g.pathBuilder.detach(), g.stroke);
    }
  } else if (morphology.pattern === 'nebula') {
    setPaintColor(g.fill, accentCol, 0.48);
    canvas.drawCircle(-rx * 0.25, -ry * 0.22, r * 0.38, g.fill);
    setPaintColor(g.fill, emoCol, 0.45);
    canvas.drawCircle(-rx * 0.48, ry * 0.24, r * 0.3, g.fill);
    setPaintColor(g.fill, skColorHex('#ECF4FF'), 0.85);
    canvas.drawCircle(-rx * 0.2, 0, r * 0.09, g.fill);
    canvas.drawCircle(-rx * 0.52, -ry * 0.15, r * 0.07, g.fill);
  }

  // Elder silver-gold wisdom mantle rim
  g.stroke.setStrokeWidth(entity.lifeStage === 'elder' ? 1.8 : 1.1);
  setPaintColor(
    g.stroke,
    entity.lifeStage === 'elder' ? skColorHex('#FDE68A') : accentCol,
    entity.lifeStage === 'elder' ? 0.85 : 0.48
  );
  canvas.drawOval(Skia.XYWHRect(-rx, -ry, rx * 2, ry * 2), g.stroke);

  // 4e. Expressive Blinking Eyes (1, 2, or 3)
  const blinkPhase = (tSec * 0.85 + entity.id * 2.71) % 4.6;
  const isBlinking = blinkPhase > 4.46;
  const eyeCount = morphology.eyeCount || 2;
  const eyeBaseR =
    (entity.lifeStage === 'larva' ? 0.26 : 0.21) *
    r *
    (eyeCount === 1 ? 1.28 : eyeCount === 3 ? 0.86 : 1);

  const eyeCoords: Array<[number, number, number]> =
    eyeCount === 1
      ? [[rx * 0.44, 0, eyeBaseR]]
      : eyeCount === 2
      ? [
          [rx * 0.42, -ry * 0.36, eyeBaseR],
          [rx * 0.42, ry * 0.36, eyeBaseR],
        ]
      : [
          [rx * 0.36, -ry * 0.42, eyeBaseR],
          [rx * 0.36, ry * 0.42, eyeBaseR],
          [rx * 0.62, 0, eyeBaseR * 0.92],
        ];

  const scleraCol = skColorHex('#F8FAFC');
  const pupilCol = skColorHex('#040814');

  for (let e = 0; e < eyeCoords.length; e++) {
    const [ex, ey, er] = eyeCoords[e];
    if (isBlinking) {
      g.stroke.setStrokeWidth(1.4);
      setPaintColor(g.stroke, scleraCol, 0.9);
      canvas.drawLine(ex - er * 0.4, ey - er * 0.85, ex + er * 0.4, ey + er * 0.85, g.stroke);
    } else {
      setPaintColor(g.fill, scleraCol, 0.98);
      canvas.drawCircle(ex, ey, er, g.fill);

      setPaintColor(g.fill, pupilCol, 0.98);
      canvas.drawCircle(ex + er * 0.24, ey, er * 0.56, g.fill);

      // Tiny starlight catchlight
      setPaintColor(g.fill, scleraCol, 0.95);
      canvas.drawCircle(ex + er * 0.42, ey - er * 0.24, Math.max(0.7, er * 0.22), g.fill);
    }
  }

  canvas.restore();

  // 5. Selection Reticle
  if (isSelected) {
    const selR = r * 1.95 + Math.sin(tSec * 4) * 2.5;
    const cyan = skColorHex('#2CE6D8');
    g.stroke.setStrokeWidth(2);
    setPaintColor(g.stroke, cyan, 0.92);
    const oval = Skia.XYWHRect(entity.x - selR, entity.y - selR, selR * 2, selR * 2);
    const rotDeg = (tSec * 28) % 360;
    for (let k = 0; k < 4; k++) {
      canvas.drawArc(oval, rotDeg + k * 90, 42, false, g.stroke);
    }
  }

  // 6. Floating Name & Speech Bubble (Native Skia Font when available)
  const invScale = Math.max(0.55, Math.min(1.65, 1 / Math.max(0.35, scale)));

  if (g.fontTiny && (isSelected || (settings.showNames && scale >= 0.42))) {
    const actShort = ACTIVITY_META[entity.activity]?.shortEs ?? '';
    const label = isSelected && actShort ? `${entity.name} · ${actShort}` : entity.name;
    canvas.save();
    canvas.translate(entity.x, entity.y + r * 1.45 + 10 * invScale);
    canvas.scale(invScale, invScale);
    const bounds = g.fontTiny.measureText(label);
    const pw = bounds.width + 12;
    const ph = 16;
    setPaintColor(g.fill, skColorHex('#050B18'), isSelected ? 0.88 : 0.68);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-pw * 0.5, -11.5, pw, ph), 8, 8), g.fill);
    if (isSelected) {
      g.stroke.setStrokeWidth(1);
      setPaintColor(g.stroke, skColorHex('#2CE6D8'), 0.65);
      canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-pw * 0.5, -11.5, pw, ph), 8, 8), g.stroke);
    }
    setPaintColor(g.fill, isSelected ? skColorHex('#2CE6D8') : skColorHex('#E2E8F0'), 0.95);
    canvas.drawText(label, -bounds.width * 0.5, 0, g.fill, g.fontTiny);
    canvas.restore();
  }

  if (g.fontSmall && entity.speechBubble && entity.speechTimerMs > 0) {
    const rawSpeech =
      entity.speechBubble.length > 42
        ? `${entity.speechBubble.slice(0, 41)}…`
        : entity.speechBubble;
    const fade = Math.min(1, entity.speechTimerMs / 600);
    canvas.save();
    canvas.translate(entity.x, entity.y - r * 1.55 - 12 * invScale);
    canvas.scale(invScale, invScale);
    const bounds = g.fontSmall.measureText(rawSpeech);
    const bw = bounds.width + 18;
    const bh = 22;
    const rect = Skia.RRectXY(Skia.XYWHRect(-bw * 0.5, -16, bw, bh), 11, 11);
    setPaintColor(g.fill, skColorHex('#08142C'), 0.92 * fade);
    canvas.drawRRect(rect, g.fill);
    g.stroke.setStrokeWidth(1.2);
    setPaintColor(g.stroke, emoCol, 0.85 * fade);
    canvas.drawRRect(rect, g.stroke);
    setPaintColor(g.fill, skColorHex('#F8FAFC'), 0.98 * fade);
    canvas.drawText(rawSpeech, -bounds.width * 0.5, -1.5, g.fill, g.fontSmall);
    canvas.restore();
  }
}

function drawDivineEffects(
  canvas: SkCanvas,
  g: GpuResources,
  effects: DivineEffect[],
  nowMs: number
): void {
  for (let i = 0; i < effects.length; i++) {
    const ef = effects[i];
    const elapsed = Math.max(0, nowMs - ef.createdAtMs);
    const dur = Math.max(400, ef.durationMs || 1400);
    if (elapsed > dur) continue;

    const p = elapsed / dur; // 0..1
    const easeOut = 1 - (1 - p) * (1 - p);
    const alpha = (1 - p) * 0.9;
    const meta = DIVINE_POWER_META[ef.power];
    const col = skColorHex(meta?.color ?? '#2CE6D8');
    const maxR = Math.max(90, ef.radius || 180);
    const currR = maxR * (0.18 + 0.88 * easeOut);

    // Soft shockwave bloom
    setPaintColor(g.glowMed, col, alpha * 0.42);
    canvas.drawCircle(ef.x, ef.y, currR * 0.72, g.glowMed);

    // Primary expanding shockwave ring
    g.stroke.setStrokeWidth(3.5 * (1 - p * 0.6));
    setPaintColor(g.stroke, col, alpha);
    canvas.drawCircle(ef.x, ef.y, currR, g.stroke);

    // Secondary harmonic ring
    g.stroke.setStrokeWidth(1.6);
    setPaintColor(g.stroke, skColorHex('#ECF4FF'), alpha * 0.75);
    canvas.drawCircle(ef.x, ef.y, currR * 0.62, g.stroke);

    if (ef.power === 'lightning' && p < 0.48) {
      // Jagged sky bolt striking (ef.x, ef.y)
      const boltAlpha = (1 - p / 0.48) * 0.98;
      g.pathBuilder.reset();
      g.pathBuilder
        .moveTo(ef.x - 28, ef.y - 420)
        .lineTo(ef.x + 18, ef.y - 290)
        .lineTo(ef.x - 16, ef.y - 190)
        .lineTo(ef.x + 22, ef.y - 95)
        .lineTo(ef.x, ef.y);
      const bolt = g.pathBuilder.detach();
      g.stroke.setStrokeWidth(5.5);
      setPaintColor(g.stroke, col, boltAlpha * 0.65);
      canvas.drawPath(bolt, g.stroke);
      g.stroke.setStrokeWidth(2.4);
      setPaintColor(g.stroke, skColorHex('#FFFFFF'), boltAlpha);
      canvas.drawPath(bolt, g.stroke);
    } else if (ef.power === 'solar_blessing') {
      g.stroke.setStrokeWidth(2);
      setPaintColor(g.stroke, col, alpha * 0.8);
      for (let ray = 0; ray < 8; ray++) {
        const a = (ray * Math.PI) / 4 + p * 0.8;
        canvas.drawLine(
          ef.x + Math.cos(a) * currR * 0.35,
          ef.y + Math.sin(a) * currR * 0.35,
          ef.x + Math.cos(a) * currR * 0.95,
          ef.y + Math.sin(a) * currR * 0.95,
          g.stroke
        );
      }
    } else if (ef.power === 'nourish' || ef.power === 'spawn_life') {
      setPaintColor(g.fill, col, alpha);
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI * 2) / 10 + p * 2.2;
        const d = currR * (0.35 + (k % 3) * 0.22);
        canvas.drawCircle(ef.x + Math.cos(a) * d, ef.y + Math.sin(a) * d, 3.2 * (1 - p), g.fill);
      }
    }
  }
}

function drawScreenSpaceAtmosphereAndWeather(
  canvas: SkCanvas,
  g: GpuResources,
  viewport: ViewportSize,
  dayPhase: number,
  nightFactor: number,
  weather: WeatherType,
  tSec: number
): void {
  const vw = viewport.width;
  const vh = viewport.height;
  const fullRect = Skia.XYWHRect(0, 0, vw, vh);

  // Dawn / Dusk / Night atmospheric color grade
  const p = ((dayPhase % 1) + 1) % 1;
  if (p < 0.15) {
    // Golden-rose dawn wash
    const dawnAmt = (1 - Math.abs(p - 0.07) / 0.08) * 0.1;
    if (dawnAmt > 0.005) {
      setPaintColor(g.fill, skColorHex('#FB923C'), dawnAmt);
      canvas.drawRect(fullRect, g.fill);
    }
  } else if (p > 0.48 && p < 0.66) {
    // Amber-violet dusk wash
    const duskAmt = (1 - Math.abs(p - 0.57) / 0.09) * 0.14;
    if (duskAmt > 0.005) {
      setPaintColor(g.fill, skColorHex('#C084FC'), duskAmt);
      canvas.drawRect(fullRect, g.fill);
    }
  }

  if (nightFactor > 0.02) {
    setPaintColor(g.fill, skColorHex('#020614'), nightFactor * 0.34);
    canvas.drawRect(fullRect, g.fill);
  }

  // Screen-space weather particles
  if (weather === 'rain' || weather === 'storm') {
    const count = weather === 'storm' ? 46 : 28;
    g.stroke.setStrokeWidth(weather === 'storm' ? 1.5 : 1.1);
    setPaintColor(g.stroke, skColorHex('#7DD3FC'), weather === 'storm' ? 0.34 : 0.24);
    for (let i = 0; i < count; i++) {
      const x = ((i * 97 + tSec * 210) % (vw + 80)) - 40;
      const y = ((i * 131 + tSec * 640) % (vh + 80)) - 40;
      canvas.drawLine(x, y, x - 9, y + 24, g.stroke);
    }
    if (weather === 'storm') {
      const flash = Math.sin(tSec * 3.7) * Math.sin(tSec * 11.3);
      if (flash > 0.92) {
        setPaintColor(g.fill, skColorHex('#E0F2FE'), (flash - 0.92) * 1.4);
        canvas.drawRect(fullRect, g.fill);
      }
    }
  } else if (weather === 'aurora') {
    const c1 = skColorHex('#2CE6D8');
    const c2 = skColorHex('#B57CFF');
    for (let band = 0; band < 3; band++) {
      const yBase = vh * (0.12 + band * 0.08) + Math.sin(tSec * 0.7 + band) * 18;
      setPaintColor(g.glowWide, band % 2 === 0 ? c1 : c2, 0.13 + nightFactor * 0.1);
      canvas.drawOval(Skia.XYWHRect(-40, yBase - 28, vw + 80, 56), g.glowWide);
    }
  } else if (weather === 'ashfall') {
    const ashCol = skColorHex('#FB923C');
    for (let i = 0; i < 28; i++) {
      const x = (i * 83 + Math.sin(tSec + i) * 35 + tSec * 28) % vw;
      const y = (i * 113 + tSec * 72) % vh;
      setPaintColor(g.fill, ashCol, 0.38);
      canvas.drawCircle(x, y, 1.8 + (i % 2), g.fill);
    }
  } else if (weather === 'heatwave') {
    setPaintColor(g.fill, skColorHex('#F59E0B'), 0.07 + 0.03 * Math.sin(tSec * 2));
    canvas.drawRect(fullRect, g.fill);
  }
}

export function recordWorldPicture(
  state: SimState,
  camera: CameraTransform,
  viewport: ViewportSize,
  nowMs: number,
  settings: SimSettings,
  selectedEntityId: number | null
): SkPicture {
  const g = getGpu();
  const vw = Math.max(1, viewport.width);
  const vh = Math.max(1, viewport.height);
  const canvas = g.recorder.beginRecording(Skia.XYWHRect(0, 0, vw, vh));

  // Clear deep abyssal void
  canvas.clear(skColorHex('#030611'));

  const tSec = nowMs * 0.001;
  const dayPhase = state.world?.dayPhase ?? 0.25;
  const nightFactor = computeNightFactor(dayPhase);

  // World-space frustum bounds (+margin for halos/glow)
  const margin = 180;
  const halfW = (vw * 0.5) / camera.scale + margin;
  const halfH = (vh * 0.5) / camera.scale + margin;
  const minX = camera.cx - halfW;
  const maxX = camera.cx + halfW;
  const minY = camera.cy - halfH;
  const maxY = camera.cy + halfH;

  canvas.save();
  canvas.translate(vw * 0.5, vh * 0.5);
  canvas.scale(camera.scale, camera.scale);
  canvas.translate(-camera.cx, -camera.cy);

  drawAbyssalOceanAndGrid(canvas, g, minX, maxX, minY, maxY, tSec, nightFactor);

  if (state.biomes?.length) {
    drawBiomes(
      canvas,
      g,
      state.biomes,
      minX,
      maxX,
      minY,
      maxY,
      camera.scale,
      tSec,
      nightFactor
    );
  }

  const tribeColorById = new Map<number, string>();
  if (state.tribes?.length) {
    for (let i = 0; i < state.tribes.length; i++) {
      tribeColorById.set(state.tribes[i].id, state.tribes[i].color);
    }
    drawTribeTerritories(canvas, g, state.tribes, tSec);
  }

  if (state.resources?.length) {
    drawResources(canvas, g, state.resources, minX, maxX, minY, maxY, tSec, nightFactor);
  }

  if (state.structures?.length) {
    drawStructures(
      canvas,
      g,
      state.structures,
      tribeColorById,
      minX,
      maxX,
      minY,
      maxY,
      tSec,
      nightFactor
    );
  }

  const entities = state.entities ?? [];

  // Movement wake trails
  if (settings.showTrails) {
    g.stroke.setStrokeWidth(1.8);
    for (let i = 0; i < entities.length; i++) {
      const en = entities[i];
      if (!en.isAlive) continue;
      const buf = recordTrailPoint(en, nowMs);
      if (buf.count < 2) continue;
      if (en.x < minX || en.x > maxX || en.y < minY || en.y > maxY) continue;

      const trailCol = skColorHsl(en.morphology.accentHue, 85, 62);
      for (let k = 1; k < buf.count; k++) {
        const i0 = (buf.head - buf.count + k - 1 + TRAIL_POINTS) % TRAIL_POINTS;
        const i1 = (buf.head - buf.count + k + TRAIL_POINTS) % TRAIL_POINTS;
        const dx = buf.xs[i1] - buf.xs[i0];
        const dy = buf.ys[i1] - buf.ys[i0];
        if (dx * dx + dy * dy > 9000) continue; // skip teleported jumps
        setPaintColor(g.stroke, trailCol, (k / buf.count) * 0.28);
        canvas.drawLine(buf.xs[i0], buf.ys[i0], buf.xs[i1], buf.ys[i1], g.stroke);
      }
    }
  }

  if (state.predators?.length) {
    drawPredators(canvas, g, state.predators, minX, maxX, minY, maxY, tSec);
  }

  // Living creatures (draw selected creature last so its reticle/bubble sits on top)
  let selectedEntity: Entity | null = null;
  for (let i = 0; i < entities.length; i++) {
    const en = entities[i];
    if (!en.isAlive) continue;
    if (en.id === selectedEntityId) {
      selectedEntity = en;
      continue;
    }
    if (en.x < minX || en.x > maxX || en.y < minY || en.y > maxY) continue;
    drawCreature(
      canvas,
      g,
      en,
      tribeColorById,
      false,
      settings,
      camera.scale,
      tSec,
      nightFactor
    );
  }

  if (selectedEntity) {
    drawCreature(
      canvas,
      g,
      selectedEntity,
      tribeColorById,
      true,
      settings,
      camera.scale,
      tSec,
      nightFactor
    );
  }

  if (state.divineEffects?.length) {
    drawDivineEffects(canvas, g, state.divineEffects, nowMs);
  }

  canvas.restore();

  // Screen-space day/night grade & weather overlay
  drawScreenSpaceAtmosphereAndWeather(
    canvas,
    g,
    viewport,
    dayPhase,
    nightFactor,
    state.world?.weather ?? 'clear',
    tSec
  );

  return g.recorder.finishRecordingAsPicture();
}
