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

// ─── What can be built in each zone ─────────────────────────────────────────
export const ZONE_STRUCTURE_TYPES: Record<string, string[]> = {
  Garden:  ['shelter', 'garden_patch', 'flower_circle', 'water_basin'],
  Void:    ['beacon', 'void_altar', 'star_map', 'mirror_pool'],
  Archive: ['bookshelf', 'monument', 'inscription_stone', 'memory_well'],
  Storm:   ['barrier', 'lightning_rod', 'storm_shelter', 'wind_trap'],
}

// Energy regenerated per tick for entities in the same zone as the structure
export const STRUCTURE_ENERGY_AURA: Record<string, number> = {
  shelter: 2, garden_patch: 3, flower_circle: 1, water_basin: 2,
  beacon: 1,  void_altar: 0,   star_map: 0,      mirror_pool: 1,
  bookshelf: 1, monument: 0,   inscription_stone: 0, memory_well: 2,
  barrier: 3,   lightning_rod: 2, storm_shelter: 4, wind_trap: 1,
}

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
