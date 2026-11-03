import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import type { LifeStage, Morphology } from '@/engine/types';
import { hslToHex } from '@/constants/theme';

interface Props {
  morphology: Morphology;
  lifeStage?: LifeStage;
  bioluminescence?: number;
  isAlive?: boolean;
  tribeColor?: string | null;
  size?: number;
}

export default function MorphologyAvatar({
  morphology,
  lifeStage = 'adult',
  bioluminescence = 0.6,
  isAlive = true,
  tribeColor = null,
  size = 64,
}: Props) {
  const sat = isAlive ? 80 : 28;
  const bodyHex = hslToHex(morphology.bodyHue, sat, isAlive ? 55 : 42);
  const bodyDarkHex = hslToHex(morphology.bodyHue, sat, isAlive ? 26 : 18);
  const accentHex = hslToHex(morphology.accentHue, isAlive ? 90 : 32, isAlive ? 66 : 55);
  const crownHex = isAlive ? '#F6C453' : '#94A3B8';

  const stageFactor =
    lifeStage === 'larva'
      ? 0.76
      : lifeStage === 'juvenile'
      ? 0.9
      : lifeStage === 'elder'
      ? 1.05
      : 1.0;

  const normScale = Math.max(0.82, Math.min(1.14, (morphology.bodyScale || 1) * 0.94)) * stageFactor;
  const rx = 20 * normScale;
  const ry = 23 * normScale;
  const cy = 50;
  const cx = 50;

  const gradId = `aura_${Math.round(morphology.accentHue)}_${size}`;

  const eyeCount = morphology.eyeCount || 2;
  const eyeR = (lifeStage === 'larva' ? 4.4 : 3.6) * (eyeCount === 1 ? 1.3 : eyeCount === 3 ? 0.88 : 1);
  const eyes: Array<[number, number, number]> =
    eyeCount === 1
      ? [[cx, cy - ry * 0.32, eyeR]]
      : eyeCount === 2
      ? [
          [cx - rx * 0.38, cy - ry * 0.3, eyeR],
          [cx + rx * 0.38, cy - ry * 0.3, eyeR],
        ]
      : [
          [cx - rx * 0.42, cy - ry * 0.22, eyeR],
          [cx + rx * 0.42, cy - ry * 0.22, eyeR],
          [cx, cy - ry * 0.54, eyeR * 0.9],
        ];

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop
              offset="0%"
              stopColor={accentHex}
              stopOpacity={isAlive ? 0.32 + bioluminescence * 0.32 : 0.14}
            />
            <Stop offset="100%" stopColor={accentHex} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Bioluminescent background aura */}
        <Circle cx={cx} cy={cy} r={46} fill={`url(#${gradId})`} />

        {/* Optional Clan Ring */}
        {tribeColor ? (
          <Circle
            cx={cx}
            cy={cy}
            r={43}
            fill="none"
            stroke={tribeColor}
            strokeWidth={1.6}
            strokeOpacity={0.62}
            strokeDasharray="5 4"
          />
        ) : null}

        {/* Tail (extending downward) */}
        {morphology.tail === 'wispy' && (
          <G>
            <Path
              d={`M ${cx} ${cy + ry * 0.82} Q ${cx + 9} ${cy + ry + 10} ${cx - 4} ${cy + ry + 20}`}
              stroke={accentHex}
              strokeWidth={3.4}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <Circle cx={cx - 4} cy={cy + ry + 20} r={2.6} fill={accentHex} />
          </G>
        )}

        {morphology.tail === 'twin' && (
          <G>
            <Path
              d={`M ${cx - 5} ${cy + ry * 0.78} Q ${cx - 16} ${cy + ry + 9} ${cx - 11} ${cy + ry + 19}`}
              stroke={accentHex}
              strokeWidth={2.6}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <Path
              d={`M ${cx + 5} ${cy + ry * 0.78} Q ${cx + 16} ${cy + ry + 9} ${cx + 11} ${cy + ry + 19}`}
              stroke={accentHex}
              strokeWidth={2.6}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <Circle cx={cx - 11} cy={cy + ry + 19} r={2.2} fill={accentHex} />
            <Circle cx={cx + 11} cy={cy + ry + 19} r={2.2} fill={accentHex} />
          </G>
        )}

        {morphology.tail === 'segmented' && (
          <G>
            <Circle cx={cx} cy={cy + ry + 4} r={4.5} fill={bodyHex} opacity={0.9} />
            <Circle cx={cx + 1.5} cy={cy + ry + 11.5} r={3.3} fill={accentHex} opacity={0.9} />
            <Circle cx={cx - 1} cy={cy + ry + 17.5} r={2.2} fill={bodyHex} opacity={0.9} />
          </G>
        )}

        {/* Lateral Fins Crest */}
        {morphology.crest === 'fins' && (
          <G opacity={0.68}>
            <Path
              d={`M ${cx - rx * 0.85} ${cy - 4} Q ${cx - rx - 16} ${cy - 14} ${cx - rx - 10} ${cy + 10} Z`}
              fill={accentHex}
            />
            <Path
              d={`M ${cx + rx * 0.85} ${cy - 4} Q ${cx + rx + 16} ${cy - 14} ${cx + rx + 10} ${cy + 10} Z`}
              fill={accentHex}
            />
          </G>
        )}

        {/* Head Crests (Top) */}
        {morphology.crest === 'halo' && (
          <Ellipse
            cx={cx}
            cy={cy - ry - 9}
            rx={12}
            ry={4.2}
            fill="none"
            stroke={crownHex}
            strokeWidth={2.2}
          />
        )}

        {morphology.crest === 'crown' && (
          <G>
            <Path
              d={`M ${cx - 11} ${cy - ry + 2} L ${cx - 13} ${cy - ry - 9} L ${cx - 5} ${cy - ry - 3} L ${cx} ${cy - ry - 12} L ${cx + 5} ${cy - ry - 3} L ${cx + 13} ${cy - ry - 9} L ${cx + 11} ${cy - ry + 2} Z`}
              fill={crownHex}
              opacity={0.92}
            />
          </G>
        )}

        {morphology.crest === 'horns' && (
          <G stroke={accentHex} strokeWidth={3.2} strokeLinecap="round" fill="none">
            <Path d={`M ${cx - 9} ${cy - ry + 3} Q ${cx - 20} ${cy - ry - 10} ${cx - 10} ${cy - ry - 16}`} />
            <Path d={`M ${cx + 9} ${cy - ry + 3} Q ${cx + 20} ${cy - ry - 10} ${cx + 10} ${cy - ry - 16}`} />
          </G>
        )}

        {morphology.crest === 'antlers' && (
          <G stroke={accentHex} strokeWidth={2.3} strokeLinecap="round" fill="none">
            <Line x1={cx - 8} y1={cy - ry + 3} x2={cx - 17} y2={cy - ry - 14} />
            <Line x1={cx - 13} y1={cy - ry - 6} x2={cx - 21} y2={cy - ry - 8} />
            <Line x1={cx - 13} y1={cy - ry - 6} x2={cx - 11} y2={cy - ry - 16} />
            <Line x1={cx + 8} y1={cy - ry + 3} x2={cx + 17} y2={cy - ry - 14} />
            <Line x1={cx + 13} y1={cy - ry - 6} x2={cx + 21} y2={cy - ry - 8} />
            <Line x1={cx + 13} y1={cy - ry - 6} x2={cx + 11} y2={cy - ry - 16} />
          </G>
        )}

        {/* Soma Body */}
        <Ellipse cx={cx} cy={cy} rx={rx + 1.5} ry={ry + 1.5} fill={bodyDarkHex} />
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={bodyHex} />

        {/* Body Pattern */}
        {morphology.pattern === 'solid' && (
          <Ellipse cx={cx} cy={cy - 2} rx={rx * 0.58} ry={ry * 0.55} fill={accentHex} opacity={0.28} />
        )}

        {morphology.pattern === 'spotted' && (
          <G fill={accentHex} opacity={0.8}>
            <Circle cx={cx - rx * 0.42} cy={cy + ry * 0.22} r={3.1} />
            <Circle cx={cx + rx * 0.42} cy={cy + ry * 0.22} r={3.1} />
            <Circle cx={cx} cy={cy + ry * 0.48} r={2.7} />
            <Circle cx={cx - rx * 0.25} cy={cy + ry * 0.56} r={1.9} />
            <Circle cx={cx + rx * 0.25} cy={cy + ry * 0.56} r={1.9} />
          </G>
        )}

        {morphology.pattern === 'striped' && (
          <G stroke={accentHex} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.76}>
            <Path d={`M ${cx - rx * 0.72} ${cy + 2} Q ${cx} ${cy - 4} ${cx + rx * 0.72} ${cy + 2}`} />
            <Path d={`M ${cx - rx * 0.66} ${cy + 9} Q ${cx} ${cy + 3} ${cx + rx * 0.66} ${cy + 9}`} />
            <Path d={`M ${cx - rx * 0.5} ${cy + 15.5} Q ${cx} ${cy + 11} ${cx + rx * 0.5} ${cy + 15.5}`} />
          </G>
        )}

        {morphology.pattern === 'nebula' && (
          <G>
            <Circle cx={cx - rx * 0.24} cy={cy + 5} r={rx * 0.42} fill={accentHex} opacity={0.44} />
            <Circle cx={cx + rx * 0.28} cy={cy + 9} r={rx * 0.32} fill="#E879F9" opacity={0.38} />
            <Circle cx={cx - 3} cy={cy + 4} r={1.4} fill="#FFFFFF" opacity={0.9} />
            <Circle cx={cx + 5} cy={cy + 11} r={1.1} fill="#FFFFFF" opacity={0.85} />
          </G>
        )}

        {/* Elder wisdom rim */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="none"
          stroke={lifeStage === 'elder' ? '#FDE68A' : accentHex}
          strokeWidth={lifeStage === 'elder' ? 1.8 : 1}
          strokeOpacity={lifeStage === 'elder' ? 0.85 : 0.45}
        />

        {/* Expressive Eyes */}
        {eyes.map(([ex, ey, er], idx) =>
          isAlive ? (
            <G key={idx}>
              <Circle cx={ex} cy={ey} r={er} fill="#F8FAFC" />
              <Circle cx={ex} cy={ey - 0.3} r={er * 0.56} fill="#040814" />
              <Circle cx={ex + er * 0.28} cy={ey - er * 0.28} r={Math.max(0.9, er * 0.22)} fill="#FFFFFF" />
            </G>
          ) : (
            <Path
              key={idx}
              d={`M ${ex - er} ${ey} Q ${ex} ${ey + er * 0.65} ${ex + er} ${ey}`}
              stroke="#CBD5E1"
              strokeWidth={1.6}
              strokeLinecap="round"
              fill="none"
            />
          )
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
