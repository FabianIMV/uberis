/**
 * UBERIS v2.0 — Biomes, Geography & Seasonal Ecology
 *
 * Defines the 6 organic ecological regions across the 2400x1800 continent,
 * spatial Voronoi/ellipse resolution, climatic dynamics, and temporal era progression.
 */

import {
  BiomeId,
  BiomeRegion,
  Season,
  WeatherType,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from './types';

export const BIOMES: BiomeRegion[] = [
  {
    id: 'eden',
    nameEs: 'Jardín Primordial',
    subtitleEs: 'Cuna fértil de néctar, sol templado y arboledas susurrantes',
    centerX: 620,
    centerY: 540,
    radiusX: 520,
    radiusY: 440,
    primaryColor: '#10B981',
    secondaryColor: '#047857',
    glowColor: '#34D399',
    fertility: 0.95,
    baseTemp: 0.52,
    mutationBoost: 1.0,
    wisdomBoost: 1.1,
  },
  {
    id: 'lagoon',
    nameEs: 'Laguna Coralina',
    subtitleEs: 'Aguas cristalinas, manantiales vivos y algas bioluminiscentes',
    centerX: 580,
    centerY: 1340,
    radiusX: 500,
    radiusY: 420,
    primaryColor: '#06B6D4',
    secondaryColor: '#0E7490',
    glowColor: '#22D3EE',
    fertility: 0.85,
    baseTemp: 0.46,
    mutationBoost: 1.05,
    wisdomBoost: 1.15,
  },
  {
    id: 'steppe',
    nameEs: 'Estepa Áurea',
    subtitleEs: 'Vastas praderas doradas, maderas nobles y horizontes abiertos',
    centerX: 1320,
    centerY: 1040,
    radiusX: 580,
    radiusY: 480,
    primaryColor: '#F59E0B',
    secondaryColor: '#B45309',
    glowColor: '#FCD34D',
    fertility: 0.70,
    baseTemp: 0.56,
    mutationBoost: 1.0,
    wisdomBoost: 1.05,
  },
  {
    id: 'archive',
    nameEs: 'Ruinas del Archivo',
    subtitleEs: 'Meseta ancestral de cristales resonantes y sabiduría latente',
    centerX: 1860,
    centerY: 520,
    radiusX: 500,
    radiusY: 420,
    primaryColor: '#8B5CF6',
    secondaryColor: '#6D28D9',
    glowColor: '#C4B5FD',
    fertility: 0.40,
    baseTemp: 0.42,
    mutationBoost: 1.25,
    wisdomBoost: 1.65,
  },
  {
    id: 'ashlands',
    nameEs: 'Tierras de Ceniza',
    subtitleEs: 'Geotermia ardiente, vetas de obsidiana y calor en el invierno',
    centerX: 1920,
    centerY: 1360,
    radiusX: 500,
    radiusY: 440,
    primaryColor: '#EF4444',
    secondaryColor: '#B91C1C',
    glowColor: '#F87171',
    fertility: 0.30,
    baseTemp: 0.88,
    mutationBoost: 1.50,
    wisdomBoost: 1.10,
  },
  {
    id: 'abyss',
    nameEs: 'Velo Abisal',
    subtitleEs: 'Fosa de niebla astral, esporas estelares y revelaciones sombrías',
    centerX: 1260,
    centerY: 340,
    radiusX: 460,
    radiusY: 340,
    primaryColor: '#4F46E5',
    secondaryColor: '#312E81',
    glowColor: '#A5B4FC',
    fertility: 0.25,
    baseTemp: 0.24,
    mutationBoost: 1.70,
    wisdomBoost: 1.55,
  },
];

export const BIOME_MAP: Record<BiomeId, BiomeRegion> = BIOMES.reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<BiomeId, BiomeRegion>
);

/**
 * Fast spatial lookup determining the primary biome at (x, y)
 * using weighted elliptical distance metrics.
 */
export function getBiomeAt(x: number, y: number): BiomeId {
  const px = Math.max(0, Math.min(WORLD_WIDTH, x));
  const py = Math.max(0, Math.min(WORLD_HEIGHT, y));

  let closestBiome: BiomeId = 'eden';
  let minDistance = Number.MAX_VALUE;

  for (let i = 0; i < BIOMES.length; i++) {
    const b = BIOMES[i];
    const dx = (px - b.centerX) / b.radiusX;
    const dy = (py - b.centerY) / b.radiusY;
    const normDist = dx * dx + dy * dy;

    if (normDist < minDistance) {
      minDistance = normDist;
      closestBiome = b.id;
    }
  }

  return closestBiome;
}

/**
 * Poetic Spanish Era names charting the epochal progression of the continent.
 */
export const ERA_NAMES: string[] = [
  'Era del Despertar Primordial',
  'Era del Rocío y las Primeras Raíces',
  'Era de las Voces Errantes',
  'Era del Fuego y el Barro',
  'Era de los Clanes Unidos',
  'Era de la Estepa Iluminada',
  'Era de los Susurros del Archivo',
  'Era de las Estelas Conmemorativas',
  'Era de la Noche Estrellada',
  'Era de la Trascendencia Astral',
];

/**
 * Calculates current season from day count (each season lasts 5 full days).
 */
export function getSeasonForDay(dayCount: number): Season {
  const seasonIdx = Math.floor(dayCount / 5) % 4;
  switch (seasonIdx) {
    case 0:
      return 'spring';
    case 1:
      return 'summer';
    case 2:
      return 'autumn';
    case 3:
    default:
      return 'winter';
  }
}

/**
 * Calculates weather for a given day and season.
 */
export function getWeatherForDay(dayCount: number, season: Season, seed = 42): WeatherType {
  const hash = Math.sin(dayCount * 1337 + seed * 97) * 10000;
  const rand = hash - Math.floor(hash);

  switch (season) {
    case 'spring':
      if (rand < 0.45) return 'clear';
      if (rand < 0.80) return 'rain';
      if (rand < 0.95) return 'storm';
      return 'aurora';
    case 'summer':
      if (rand < 0.50) return 'clear';
      if (rand < 0.80) return 'heatwave';
      if (rand < 0.95) return 'storm';
      return 'aurora';
    case 'autumn':
      if (rand < 0.45) return 'clear';
      if (rand < 0.75) return 'rain';
      if (rand < 0.90) return 'ashfall';
      return 'aurora';
    case 'winter':
    default:
      if (rand < 0.40) return 'clear';
      if (rand < 0.70) return 'rain';
      if (rand < 0.88) return 'aurora';
      return 'ashfall';
  }
}

/**
 * Computes global world ambient temperature (0..1)
 * driven by season, day phase (diurnal cycle), and weather.
 */
export function getGlobalTemperature(
  season: Season,
  weather: WeatherType,
  dayPhase: number
): number {
  let baseSeasonTemp = 0.5;
  switch (season) {
    case 'spring':
      baseSeasonTemp = 0.52;
      break;
    case 'summer':
      baseSeasonTemp = 0.75;
      break;
    case 'autumn':
      baseSeasonTemp = 0.48;
      break;
    case 'winter':
      baseSeasonTemp = 0.22;
      break;
  }

  // Diurnal variation: peak at noon (phase 0.25), lowest at night (phase 0.85)
  const diurnalShift = Math.cos((dayPhase - 0.25) * Math.PI * 2) * 0.14;

  let weatherShift = 0.0;
  if (weather === 'heatwave') weatherShift = +0.22;
  else if (weather === 'rain') weatherShift = -0.06;
  else if (weather === 'storm') weatherShift = -0.12;
  else if (weather === 'ashfall') weatherShift = +0.05;

  return Math.max(0.05, Math.min(0.98, baseSeasonTemp + diurnalShift + weatherShift));
}

/**
 * Blends global temperature with local biome geothermal properties.
 */
export function getBiomeEffectiveTemperature(
  biomeId: BiomeId,
  globalTemp: number
): number {
  const biome = BIOME_MAP[biomeId];
  if (!biome) return globalTemp;

  // Ashlands stays warm even in bitter winter due to magma vents
  if (biomeId === 'ashlands') {
    return Math.max(0.65, globalTemp * 0.4 + biome.baseTemp * 0.6);
  }

  // Abyss is damp and cold
  if (biomeId === 'abyss') {
    return Math.min(0.38, globalTemp * 0.5 + biome.baseTemp * 0.5);
  }

  // Lagoon buffers extremes like deep water
  if (biomeId === 'lagoon') {
    return globalTemp * 0.6 + biome.baseTemp * 0.4;
  }

  return globalTemp * 0.7 + biome.baseTemp * 0.3;
}

/**
 * Calculates local biome fertility modifier accounting for season and weather.
 */
export function getBiomeFertility(
  biomeId: BiomeId,
  season: Season,
  weather: WeatherType
): number {
  const biome = BIOME_MAP[biomeId];
  if (!biome) return 0.5;

  let seasonMult = 1.0;
  if (season === 'spring') seasonMult = 1.4;
  else if (season === 'summer') seasonMult = 1.1;
  else if (season === 'autumn') seasonMult = 0.85;
  else if (season === 'winter') seasonMult = 0.35;

  let weatherMult = 1.0;
  if (weather === 'rain') weatherMult = 1.35;
  else if (weather === 'storm') weatherMult = 1.15;
  else if (weather === 'heatwave') weatherMult = 0.60;

  return Math.max(0.08, Math.min(1.0, biome.fertility * seasonMult * weatherMult));
}
