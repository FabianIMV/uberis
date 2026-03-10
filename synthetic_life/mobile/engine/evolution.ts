import type { Genome, Entity } from './types'

const TRAIT_NAMES: (keyof Genome)[] = [
  'curiosity', 'aggression', 'empathy', 'creativity', 'survival_drive',
]

const NAMES_POOL: string[] = [
  'Aether','Lumis','Vex','Nora','Cyan','Dusk','Fern','Glow','Haze','Iris',
  'Juno','Kira','Lyra','Mist','Nexus','Onyx','Phos','Quill','Rune','Sol',
  'Tide','Uma','Veil','Wren','Xara','Yew','Zoe','Blip','Crux','Elm',
  'Flux','Grey','Hull','Indra','Jet','Kael','Lux','Mira','Nix','Orb',
  'Prism','Quark','Reeve','Sable','Thorn','Ulma','Virex','Ward','Xen','Yule',
  'Zara','Brine','Coil','Deva','Elix','Fray','Gust','Helix','Io','Jarv',
]

const _usedNames = new Set<string>()
const SUFFIXES = ["'il", '-ex', "'ara", '-kin', "'os", '-en']

export function getRandomName(): string {
  let available = NAMES_POOL.filter(n => !_usedNames.has(n))
  if (available.length === 0) { _usedNames.clear(); available = [...NAMES_POOL] }
  const name = available[Math.floor(Math.random() * available.length)]
  _usedNames.add(name)
  if (Math.random() < 0.3) {
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]
    return name + suffix
  }
  return name
}

function gauss(sigma: number): number {
  // Box-Muller
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function randomGenome(): Genome {
  return Object.fromEntries(TRAIT_NAMES.map(t => [t, Math.random()])) as Genome
}

function crossover(a: Genome, b: Genome): Genome {
  return Object.fromEntries(
    TRAIT_NAMES.map(t => {
      const w = Math.random()
      return [t, w * a[t] + (1 - w) * b[t]]
    })
  ) as Genome
}

function mutate(g: Genome, sigma = 0.05): Genome {
  return Object.fromEntries(
    TRAIT_NAMES.map(t => [t, Math.max(0, Math.min(1, g[t] + gauss(sigma)))])
  ) as Genome
}

export function createOffspringGenome(parentA: Genome, parentB?: Genome | null): Genome {
  if (!parentB) return mutate(parentA, 0.10)
  return mutate(crossover(parentA, parentB), 0.05)
}

export function calculateEnergyDrain(entity: Entity): number {
  const g = entity.genome
  const will = g.curiosity * 0.35 + g.empathy * 0.35 + g.creativity * 0.30
  const base  = 1.2 + (1.0 - will) * 2.3
  const drain = base * (1.0 - g.survival_drive * 0.40)
  return Math.max(0.5, drain)
}

export function shouldReproduce(a: Entity, b: Entity): boolean {
  if (a.energy < 60 || b.energy < 60) return false
  const POSITIVE = new Set(['joy','love','wonder','contentment','warmth','euphoria','peace','connection','revelation'])
  const bothPos = POSITIVE.has(a.emotional_state.emotion) && POSITIVE.has(b.emotional_state.emotion)
  return Math.random() < (bothPos ? 0.45 : 0.08)
}

export const SEED_GENOMES: Genome[] = [
  { curiosity: 0.90, aggression: 0.10, empathy: 0.80, creativity: 0.70, survival_drive: 0.60 },
  { curiosity: 0.30, aggression: 0.80, empathy: 0.20, creativity: 0.40, survival_drive: 0.90 },
  { curiosity: 0.70, aggression: 0.40, empathy: 0.65, creativity: 0.90, survival_drive: 0.50 },
  { curiosity: 0.55, aggression: 0.50, empathy: 0.75, creativity: 0.60, survival_drive: 0.70 },
  { curiosity: 0.85, aggression: 0.25, empathy: 0.45, creativity: 0.55, survival_drive: 0.40 },
]
export const SEED_NAMES = ['Aether', 'Vex', 'Lumis', 'Nora', 'Cyan']
