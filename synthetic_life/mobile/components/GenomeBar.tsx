import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import type { Genome } from '@/engine/types';
import { COLORS, GENOME_TRAITS } from '@/constants/theme';

interface Props {
  genome: Genome;
  showRadar?: boolean;
  compact?: boolean;
}

export default function GenomeBar({ genome, showRadar = false, compact = false }: Props) {
  const radarSize = 210;
  const center = radarSize / 2;
  const maxR = 74;

  const polygonPoints = GENOME_TRAITS.map((trait, idx) => {
    const angle = (idx * Math.PI * 2) / GENOME_TRAITS.length - Math.PI / 2;
    const val = Math.max(0.08, Math.min(1, genome[trait.key] ?? 0.5));
    const px = center + Math.cos(angle) * maxR * val;
    const py = center + Math.sin(angle) * maxR * val;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      {showRadar && (
        <View style={styles.radarWrap}>
          <Svg width={radarSize} height={radarSize} viewBox={`0 0 ${radarSize} ${radarSize}`}>
            {[0.33, 0.66, 1].map((ring) => (
              <Circle
                key={ring}
                cx={center}
                cy={center}
                r={maxR * ring}
                fill="none"
                stroke="rgba(148, 175, 203, 0.15)"
                strokeWidth={1}
              />
            ))}
            {GENOME_TRAITS.map((trait, idx) => {
              const angle = (idx * Math.PI * 2) / GENOME_TRAITS.length - Math.PI / 2;
              const x2 = center + Math.cos(angle) * maxR;
              const y2 = center + Math.sin(angle) * maxR;
              const lx = center + Math.cos(angle) * (maxR + 18);
              const ly = center + Math.sin(angle) * (maxR + 18);
              return (
                <React.Fragment key={trait.key}>
                  <Line
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(148, 175, 203, 0.14)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={lx}
                    y={ly + 3}
                    fill={trait.color}
                    fontSize={9}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {trait.shortEs}
                  </SvgText>
                </React.Fragment>
              );
            })}
            <Polygon
              points={polygonPoints}
              fill="rgba(44, 230, 216, 0.22)"
              stroke={COLORS.cyan}
              strokeWidth={2}
            />
          </Svg>
        </View>
      )}

      <View style={styles.barsList}>
        {GENOME_TRAITS.map((trait) => {
          const val = Math.max(0, Math.min(1, genome[trait.key] ?? 0));
          const pct = Math.round(val * 100);
          return (
            <View key={trait.key} style={[styles.row, compact && styles.rowCompact]}>
              <View style={styles.labelRow}>
                <View style={styles.labelLeft}>
                  <View style={[styles.dot, { backgroundColor: trait.color }]} />
                  <Text style={styles.traitName}>{trait.labelEs}</Text>
                </View>
                <Text style={[styles.pctText, { color: trait.color }]}>{pct}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${pct}%`, backgroundColor: trait.color },
                  ]}
                />
              </View>
              {!compact && <Text style={styles.descText}>{trait.descEs}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  radarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  barsList: {
    gap: 10,
  },
  row: {
    gap: 4,
  },
  rowCompact: {
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  traitName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.text,
  },
  pctText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 5.5,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 175, 203, 0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  descText: {
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
});
