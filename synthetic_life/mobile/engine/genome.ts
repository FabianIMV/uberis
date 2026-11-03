/**
 * UBERIS v2.0 — Genetics, Phenotype Morphology & Speciation
 *
 * Deterministic mapping from genome vectors to visible morphology,
 * binomial speciation clustering, crossover & mutation algorithms,
 * intelligence calculation, and ancestral genesis archetypes.
 */

import {
  BiomeId,
  CrestStyle,
  EmotionType,
  Entity,
  Genome,
  Morphology,
  TailStyle,
  BodyPattern,
} from './types';

export interface SeedArchetype {
  name: string;
  speciesId: string;
  speciesName: string;
  currentBiome: BiomeId;
  genome: Genome;
  emotion: EmotionType;
  existentialStatement: string;
}

/**
 * The 8 Genesis Founding Entities across the continent.
 * Each possesses a distinct genetic profile, morphological silhouette,
 * starting biome, and existential inclination.
 */
export const SEED_ARCHETYPES: SeedArchetype[] = [
  {
    name: 'Elion',
    speciesId: 'species_lumina_empatia',
    speciesName: 'Lumina empatia',
    currentBiome: 'eden',
    genome: {
      curiosity: 0.65,
      empathy: 0.88,
      aggression: 0.12,
      creativity: 0.70,
      survivalDrive: 0.55,
      sociability: 0.85,
      speedGene: 0.45,
      sizeGene: 0.48,
      senseGene: 0.62,
      bioluminescence: 0.72,
    },
    emotion: 'wonder',
    existentialStatement: 'Buscamos la armonía entre el néctar que florece y el corazón de la manada.',
  },
  {
    name: 'Thael',
    speciesId: 'species_sylva_curiosa',
    speciesName: 'Sylva curiosa',
    currentBiome: 'eden',
    genome: {
      curiosity: 0.92,
      empathy: 0.60,
      aggression: 0.20,
      creativity: 0.68,
      survivalDrive: 0.65,
      sociability: 0.58,
      speedGene: 0.72,
      sizeGene: 0.42,
      senseGene: 0.88,
      bioluminescence: 0.50,
    },
    emotion: 'curiosity',
    existentialStatement: 'Más allá de cada colina hay un enigma esperando ser comprendido.',
  },
  {
    name: 'Kaelen',
    speciesId: 'species_astraea_maris',
    speciesName: 'Astraea maris',
    currentBiome: 'lagoon',
    genome: {
      curiosity: 0.60,
      empathy: 0.75,
      aggression: 0.15,
      creativity: 0.55,
      survivalDrive: 0.68,
      sociability: 0.78,
      speedGene: 0.78,
      sizeGene: 0.40,
      senseGene: 0.70,
      bioluminescence: 0.95,
    },
    emotion: 'joy',
    existentialStatement: 'Nuestras luces titilan en el agua como ecos de estrellas vivas.',
  },
  {
    name: 'Saphira',
    speciesId: 'species_koinon_amica',
    speciesName: 'Koinon amica',
    currentBiome: 'lagoon',
    genome: {
      curiosity: 0.52,
      empathy: 0.92,
      aggression: 0.08,
      creativity: 0.62,
      survivalDrive: 0.60,
      sociability: 0.90,
      speedGene: 0.50,
      sizeGene: 0.45,
      senseGene: 0.65,
      bioluminescence: 0.82,
    },
    emotion: 'love',
    existentialStatement: 'Sanar el dolor ajeno es preservar la llama que nos mantiene unidos.',
  },
  {
    name: 'Morwen',
    speciesId: 'species_artifex_aequor',
    speciesName: 'Artifex aequor',
    currentBiome: 'steppe',
    genome: {
      curiosity: 0.74,
      empathy: 0.50,
      aggression: 0.35,
      creativity: 0.88,
      survivalDrive: 0.78,
      sociability: 0.65,
      speedGene: 0.62,
      sizeGene: 0.68,
      senseGene: 0.60,
      bioluminescence: 0.35,
    },
    emotion: 'determination',
    existentialStatement: 'De la madera y la piedra levantaremos refugios que desafíen los inviernos.',
  },
  {
    name: 'Vesper',
    speciesId: 'species_vorax_ignis',
    speciesName: 'Vorax ignis',
    currentBiome: 'ashlands',
    genome: {
      curiosity: 0.40,
      empathy: 0.30,
      aggression: 0.85,
      creativity: 0.45,
      survivalDrive: 0.90,
      sociability: 0.38,
      speedGene: 0.82,
      sizeGene: 0.86,
      senseGene: 0.75,
      bioluminescence: 0.42,
    },
    emotion: 'anger',
    existentialStatement: 'El calor de la tierra no tolera debilidad; resistimos o perecemos.',
  },
  {
    name: 'Orin',
    speciesId: 'species_sapiens_archivia',
    speciesName: 'Sapiens archivia',
    currentBiome: 'archive',
    genome: {
      curiosity: 0.88,
      empathy: 0.55,
      aggression: 0.10,
      creativity: 0.90,
      survivalDrive: 0.58,
      sociability: 0.60,
      speedGene: 0.42,
      sizeGene: 0.52,
      senseGene: 0.82,
      bioluminescence: 0.68,
    },
    emotion: 'contemplation',
    existentialStatement: 'Los monolitos no guardan silencio; cantan para quien sabe escuchar.',
  },
  {
    name: 'Nyx',
    speciesId: 'species_noctis_umbra',
    speciesName: 'Noctis umbra',
    currentBiome: 'abyss',
    genome: {
      curiosity: 0.78,
      empathy: 0.42,
      aggression: 0.45,
      creativity: 0.75,
      survivalDrive: 0.88,
      sociability: 0.28,
      speedGene: 0.68,
      sizeGene: 0.60,
      senseGene: 0.95,
      bioluminescence: 0.86,
    },
    emotion: 'transcendence',
    existentialStatement: 'En la oscuridad más densa del abismo encontramos el resplandor primordial.',
  },
];

/**
 * Derives visible anatomical morphology from a genome vector.
 * Every gene tangibly governs size, eyes, crest, tail, pattern, and coloration.
 */
export function deriveMorphology(genome: Genome, inheritedHue?: number): Morphology {
  // Body scale ranges from 0.72 to 1.42 strictly mapped to sizeGene
  const bodyScale = Number((0.72 + genome.sizeGene * 0.70).toFixed(2));

  // Eye count: 1 (cyclops/blind sense), 2 (standard binocular), 3 (trilocular acute sense)
  let eyeCount: 1 | 2 | 3 = 2;
  if (genome.senseGene < 0.35) eyeCount = 1;
  else if (genome.senseGene > 0.75) eyeCount = 3;

  // Crest: crowns, halos, antlers, fins, horns, or none based on dominant gene
  let crest: CrestStyle = 'none';
  if (genome.bioluminescence > 0.72) {
    crest = 'crown';
  } else if (genome.empathy > 0.68) {
    crest = 'halo';
  } else if (genome.aggression > 0.65) {
    crest = 'horns';
  } else if (genome.creativity > 0.65) {
    crest = 'antlers';
  } else if (genome.speedGene > 0.68) {
    crest = 'fins';
  }

  // Tail style driven by speed and sociability/survival
  let tail: TailStyle = 'none';
  if (genome.speedGene > 0.70 && genome.sociability < 0.45) {
    tail = 'wispy';
  } else if (genome.speedGene > 0.60 && genome.sociability > 0.60) {
    tail = 'twin';
  } else if (genome.survivalDrive > 0.65 || genome.sizeGene > 0.68) {
    tail = 'segmented';
  }

  // Body pattern: nebula, striped, spotted, or solid
  let pattern: BodyPattern = 'solid';
  if (genome.bioluminescence > 0.65 && genome.curiosity > 0.60) {
    pattern = 'nebula';
  } else if (genome.aggression > 0.60) {
    pattern = 'striped';
  } else if (genome.senseGene > 0.60 || genome.survivalDrive > 0.65) {
    pattern = 'spotted';
  }

  // Body hue calculation
  let bodyHue: number;
  if (inheritedHue !== undefined) {
    // Inherited with natural drift
    const drift = (Math.sin(genome.curiosity * 17 + genome.empathy * 31) * 28);
    bodyHue = Math.round((inheritedHue + drift + 360) % 360);
  } else {
    // Synthetic hue derived from genetic tendencies
    // Empathy -> Cyan/Blue (190), Biolum -> Teal/Emerald (150), Aggression -> Red/Orange (10)
    // Creativity -> Violet (280), Curiosity -> Amber/Gold (45), Survival -> Earth Green (100)
    const hueWeight =
      genome.empathy * 190 +
      genome.bioluminescence * 150 +
      genome.aggression * 360 +
      genome.creativity * 280 +
      genome.curiosity * 45 +
      genome.survivalDrive * 105;
    const totalW =
      genome.empathy +
      genome.bioluminescence +
      genome.aggression +
      genome.creativity +
      genome.curiosity +
      genome.survivalDrive || 1;
    bodyHue = Math.round((hueWeight / totalW) % 360);
  }

  // Accent hue is harmonic or complementary
  const accentOffset = 30 + Math.round(genome.bioluminescence * 120);
  const accentHue = Math.round((bodyHue + accentOffset) % 360);

  return {
    bodyHue,
    accentHue,
    bodyScale,
    eyeCount,
    crest,
    tail,
    pattern,
  };
}

/**
 * Clusters genome vectors into canonical binomial species names.
 * When offspring cross genetic thresholds, speciation is detected.
 */
export function deriveSpeciesInfo(genome: Genome): { speciesId: string; speciesName: string } {
  const traits = [
    { name: 'Lumina', epithet: 'empatia', val: genome.empathy },
    { name: 'Vorax', epithet: 'ignis', val: genome.aggression },
    { name: 'Sylva', epithet: 'curiosa', val: genome.curiosity },
    { name: 'Sapiens', epithet: 'artifex', val: genome.creativity },
    { name: 'Astraea', epithet: 'stellaris', val: genome.bioluminescence },
    { name: 'Terra', epithet: 'fortis', val: genome.survivalDrive },
    { name: 'Velox', epithet: 'cursus', val: genome.speedGene },
    { name: 'Koinon', epithet: 'amica', val: genome.sociability },
  ];

  // Sort descending by trait weight
  traits.sort((a, b) => b.val - a.val);

  const primary = traits[0].val >= 0.52 ? traits[0].name : 'Aurea';
  const secondary = traits[1].val >= 0.45 ? traits[1].epithet : 'primigenia';

  const speciesName = `${primary} ${secondary}`;
  const speciesId = `species_${primary.toLowerCase()}_${secondary.toLowerCase()}`;

  return { speciesId, speciesName };
}

/**
 * Recombines two parental genomes via allele crossover and applies
 * environmental/biome mutation boosts.
 */
export function crossoverAndMutate(
  parentA: Genome,
  parentB: Genome,
  mutationBoost = 1.0
): Genome {
  const keys: (keyof Genome)[] = [
    'curiosity',
    'empathy',
    'aggression',
    'creativity',
    'survivalDrive',
    'sociability',
    'speedGene',
    'sizeGene',
    'senseGene',
    'bioluminescence',
  ];

  const childGenome: Partial<Genome> = {};
  const mutationChance = Math.min(0.40, 0.14 * mutationBoost);
  const mutationSpread = 0.09 * mutationBoost;

  for (const k of keys) {
    // Allele selection: 50% chance from either parent + blended cross
    const blend = Math.random() < 0.25;
    let val = blend
      ? (parentA[k] + parentB[k]) / 2
      : Math.random() < 0.5
      ? parentA[k]
      : parentB[k];

    // Spontaneous mutation
    if (Math.random() < mutationChance) {
      const delta = (Math.random() * 2 - 1) * mutationSpread;
      val += delta;
    }

    // Clamp to valid range (0.02 .. 0.98 to avoid dead zero genes)
    childGenome[k] = Number(Math.max(0.02, Math.min(0.98, val)).toFixed(3));
  }

  return childGenome as Genome;
}

/**
 * Computes an entity's current intelligence quotient (0..1)
 * driven by genetics, age experience, memories, tribal technology, and monolith auras.
 */
export function computeIntelligence(
  entity: Entity,
  tribeTechCount: number,
  nearMonolith: boolean
): number {
  const g = entity.genome;
  const geneticBase =
    g.curiosity * 0.35 +
    g.creativity * 0.35 +
    g.senseGene * 0.15 +
    g.empathy * 0.15;

  let ageBonus = 0.0;
  if (entity.lifeStage === 'juvenile') ageBonus = 0.05;
  else if (entity.lifeStage === 'adult') ageBonus = 0.12;
  else if (entity.lifeStage === 'elder') ageBonus = 0.22;

  const memoryBonus = Math.min(0.15, (entity.memories?.length || 0) * 0.02);
  const techBonus = Math.min(0.20, tribeTechCount * 0.04);
  const monolithBonus = nearMonolith ? 0.14 : 0.0;

  const total = geneticBase + ageBonus + memoryBonus + techBonus + monolithBonus;
  return Number(Math.max(0.05, Math.min(1.0, total)).toFixed(3));
}

const NAME_PREFIXES = [
  'El', 'Ly', 'Thae', 'Kae', 'Saphi', 'Mor', 'Ves', 'O', 'Nael', 'Ze',
  'Il', 'Cae', 'So', 'Ma', 'Ore', 'Vae', 'Ny', 'Ar', 'Mi', 'Thal',
  'Ae', 'Lu', 'Se', 'Bo', 'Py', 'Da', 'I', 'Xe', 'Ka', 'Eo',
];

const NAME_SUFFIXES = [
  'ion', 'ra', 'el', 'len', 'ra', 'wen', 'per', 'rin', 'lis', 'phyr',
  'yas', 'lum', 'las', 'ru', 'na', 'os', 'ris', 'mis', 'lor', 'nus',
  'dan', 'xus', 'nea', 'thas', 'lia', 'ron', 'tiel', 'mir', 'ros', 'via',
];

/**
 * Generates an evocative, poetic name for born or spawned beings.
 */
export function generateEntityName(seedNum: number): string {
  const pIdx = Math.abs(seedNum * 17 + 13) % NAME_PREFIXES.length;
  const sIdx = Math.abs(seedNum * 31 + 47) % NAME_SUFFIXES.length;
  return `${NAME_PREFIXES[pIdx]}${NAME_SUFFIXES[sIdx]}`;
}
