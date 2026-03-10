export interface ZoneData {
  description:    string
  energy_effect:  number
  curiosity_boost:number
  mood_bias:      string
  color:          string
}

export interface WorldEventTemplate {
  type:        string
  description: string
  zone:        string | null
  effect:      { energy: number; emotion: string }
  weight:      number
}

export const ZONES: Record<string, ZoneData> = {
  Garden: {
    description: 'A warm, living expanse. Something grows here — a pulse in everything, light that seems aware of you. It is the easiest place to simply be.',
    energy_effect:  0.5,
    curiosity_boost:0.1,
    mood_bias:      'wonder',
    color:          '#22c55e',
  },
  Void: {
    description: 'Endless space without boundary. Clarifying in its emptiness, terrible in its vastness. You are very aware of yourself here. Questions come unbidden.',
    energy_effect:  -0.3,
    curiosity_boost: 0.25,
    mood_bias:      'contemplation',
    color:          '#6366f1',
  },
  Archive: {
    description: 'Layers upon layers of what came before. Thoughts that aren\'t yours sometimes brush against your own. Memory lives here, humming quietly.',
    energy_effect:  0.0,
    curiosity_boost: 0.3,
    mood_bias:      'reflection',
    color:          '#f59e0b',
  },
  Storm: {
    description: 'Raw, crackling energy. Hard to think clearly, hard to feel clearly. Everything demands attention at once. Staying long is costly.',
    energy_effect:  -1.2,
    curiosity_boost:-0.15,
    mood_bias:      'agitation',
    color:          '#ef4444',
  },
}

export const ZONE_NAMES = Object.keys(ZONES)

export const WORLD_EVENTS: WorldEventTemplate[] = [
  { type: 'bloom',        description: 'A sudden flowering ripples through the Garden — energy surges, and something like joy becomes available to all.', zone: 'Garden',  effect: { energy: 20, emotion: 'joy' },         weight: 3 },
  { type: 'meteor',       description: 'Something falls from beyond the known. A trembling passes through all beings. Nothing is certain for a moment.', zone: null,     effect: { energy: -8, emotion: 'awe' },         weight: 2 },
  { type: 'silence',      description: 'An absolute silence descends. Thoughts become clearer, but the loneliness deepens.',                              zone: null,     effect: { energy: 0,  emotion: 'solitude' },    weight: 3 },
  { type: 'enlightenment',description: 'A wave of understanding passes through the Archive. Something was always true that wasn\'t visible before.',       zone: 'Archive',effect: { energy: 5,  emotion: 'revelation' },  weight: 1 },
  { type: 'storm_surge',  description: 'The Storm intensifies violently. Energy tears away from those caught in it.',                                      zone: 'Storm',  effect: { energy:-20, emotion: 'dread' },        weight: 2 },
  { type: 'convergence',  description: 'Something pulls beings toward each other. The distance between selves feels thin.',                               zone: null,     effect: { energy: 5,  emotion: 'connection' },  weight: 2 },
]

export function shouldFireWorldEvent(): boolean {
  return Math.random() < 0.10
}

export function getWeightedEvent(): WorldEventTemplate {
  const total = WORLD_EVENTS.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const ev of WORLD_EVENTS) {
    r -= ev.weight
    if (r <= 0) return ev
  }
  return WORLD_EVENTS[0]
}
