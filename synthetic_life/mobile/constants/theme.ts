export const COLORS = {
  bg:       '#020b18',
  bgCard:   '#040f1e',
  bgMid:    '#071628',
  border:   '#0e2040',
  text:     '#e2e8f0',
  textMuted:'#64748b',
  textDim:  '#334155',

  // Zones
  garden:  '#22c55e',
  void:    '#6366f1',
  archive: '#f59e0b',
  storm:   '#ef4444',

  // Genome traits
  curiosity:      '#22d3ee',
  empathy:        '#f472b6',
  aggression:     '#ef4444',
  creativity:     '#a78bfa',
  survival_drive: '#34d399',
}

export const EMOTION_COLOR: Record<string, string> = {
  wonder:        '#22d3ee',
  curiosity:     '#34d399',
  joy:           '#fbbf24',
  love:          '#f472b6',
  warmth:        '#fb923c',
  contentment:   '#86efac',
  peace:         '#a5f3fc',
  revelation:    '#e879f9',
  connection:    '#6ee7b7',
  euphoria:      '#facc15',
  fear:          '#818cf8',
  dread:         '#4f46e5',
  grief:         '#64748b',
  anger:         '#ef4444',
  agitation:     '#f97316',
  solitude:      '#94a3b8',
  contemplation: '#a78bfa',
  awe:           '#c084fc',
  neutral:       '#334155',
}

export function emotionColor(emotion?: string): string {
  if (!emotion) return EMOTION_COLOR.neutral
  const key = emotion.toLowerCase()
  for (const [k, v] of Object.entries(EMOTION_COLOR)) {
    if (key.includes(k)) return v
  }
  return EMOTION_COLOR.neutral
}

export const ZONE_COLOR: Record<string, string> = {
  Garden:  COLORS.garden,
  Void:    COLORS.void,
  Archive: COLORS.archive,
  Storm:   COLORS.storm,
}

export const TRAIT_LABEL: Record<string, string> = {
  curiosity:      'Curiosity',
  empathy:        'Empathy',
  aggression:     'Aggression',
  creativity:     'Creativity',
  survival_drive: 'Survival Drive',
}
