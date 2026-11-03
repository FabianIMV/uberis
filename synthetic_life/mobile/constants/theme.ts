import type {
  ActivityType,
  BiomeId,
  DivinePowerId,
  EmotionType,
  Genome,
  LifeStage,
  LiveEventCategory,
  ResourceKind,
  Season,
  StructureKind,
  TechId,
  WeatherType,
} from '@/engine/types';

/**
 * UBERIS v2.0 — Luminous Scientific-Mythic Bioluminescent Observatory Design System
 */
export const COLORS = {
  bg: '#040814',
  bgDeep: '#02050E',
  bgCard: '#091224',
  bgElevated: '#0E1B34',
  bgInput: '#060D1C',
  bgGlass: 'rgba(8, 16, 33, 0.86)',
  bgGlassStrong: 'rgba(5, 11, 24, 0.94)',
  bgGlassSoft: 'rgba(13, 25, 48, 0.68)',

  border: 'rgba(104, 174, 255, 0.14)',
  borderSubtle: 'rgba(104, 174, 255, 0.08)',
  borderBright: 'rgba(44, 230, 216, 0.38)',
  borderGold: 'rgba(246, 196, 83, 0.38)',

  text: '#ECF4FF',
  textSecondary: '#96AFCB',
  textMuted: '#5C7492',
  textDim: '#3B4F6B',

  cyan: '#2CE6D8',
  cyanSoft: 'rgba(44, 230, 216, 0.15)',
  gold: '#F6C453',
  goldSoft: 'rgba(246, 196, 83, 0.16)',
  emerald: '#34E08F',
  emeraldSoft: 'rgba(52, 224, 143, 0.15)',
  violet: '#B57CFF',
  violetSoft: 'rgba(181, 124, 255, 0.16)',
  rose: '#FF6B9D',
  roseSoft: 'rgba(255, 107, 157, 0.15)',
  crimson: '#FF4D6D',
  crimsonSoft: 'rgba(255, 77, 109, 0.16)',
  amber: '#FB923C',
  amberSoft: 'rgba(251, 146, 60, 0.16)',
  sky: '#38BDF8',
  skySoft: 'rgba(56, 189, 248, 0.16)',
  indigo: '#818CF8',
} as const;

export interface BiomeThemeMeta {
  id: BiomeId;
  nameEs: string;
  shortEs: string;
  subtitleEs: string;
  color: string;
  secondary: string;
  glow: string;
  icon: string;
}

export const BIOME_META: Record<BiomeId, BiomeThemeMeta> = {
  eden: {
    id: 'eden',
    nameEs: 'Jardín Primordial',
    shortEs: 'Edén',
    subtitleEs: 'Bosque fértil de árboles de néctar y musgo luminoso',
    color: '#34E08F',
    secondary: '#0D4A38',
    glow: '#6EE7B7',
    icon: 'leaf',
  },
  lagoon: {
    id: 'lagoon',
    nameEs: 'Laguna Coralina',
    shortEs: 'Laguna',
    subtitleEs: 'Aguas dulces bioluminiscentes y manantiales puros',
    color: '#22D3EE',
    secondary: '#0A3E58',
    glow: '#67E8F9',
    icon: 'water',
  },
  steppe: {
    id: 'steppe',
    nameEs: 'Estepa Áurea',
    shortEs: 'Estepa',
    subtitleEs: 'Praderas doradas abiertas propicias para clanes y cultivos',
    color: '#EAB308',
    secondary: '#45340D',
    glow: '#FDE047',
    icon: 'sunny',
  },
  archive: {
    id: 'archive',
    nameEs: 'Ruinas del Archivo',
    shortEs: 'Archivo',
    subtitleEs: 'Cristales de memoria ancestral que despiertan el intelecto',
    color: '#B57CFF',
    secondary: '#2E1854',
    glow: '#D8B4FE',
    icon: 'prism',
  },
  ashlands: {
    id: 'ashlands',
    nameEs: 'Tierras de Ceniza',
    shortEs: 'Ceniza',
    subtitleEs: 'Geotermia volcánica cálida en invierno y alta mutación',
    color: '#FB923C',
    secondary: '#4C1D14',
    glow: '#FDBA74',
    icon: 'flame',
  },
  abyss: {
    id: 'abyss',
    nameEs: 'Velo Abisal',
    shortEs: 'Abismo',
    subtitleEs: 'Esporas estelares, visiones trascendentes y sombras Umbra',
    color: '#818CF8',
    secondary: '#17153B',
    glow: '#A5B4FC',
    icon: 'planet',
  },
};

export const EMOTION_META: Record<
  EmotionType,
  { labelEs: string; color: string; icon: string }
> = {
  wonder: { labelEs: 'Asombro', color: '#2CE6D8', icon: 'sparkles' },
  joy: { labelEs: 'Alegría', color: '#F6C453', icon: 'sunny' },
  love: { labelEs: 'Amor', color: '#FF6B9D', icon: 'heart' },
  calm: { labelEs: 'Serenidad', color: '#67E8F9', icon: 'water' },
  hope: { labelEs: 'Esperanza', color: '#34E08F', icon: 'leaf' },
  curiosity: { labelEs: 'Curiosidad', color: '#38BDF8', icon: 'compass' },
  contemplation: { labelEs: 'Contemplación', color: '#B57CFF', icon: 'eye' },
  loneliness: { labelEs: 'Soledad', color: '#94A3B8', icon: 'moon' },
  sadness: { labelEs: 'Tristeza', color: '#60A5FA', icon: 'rainy' },
  grief: { labelEs: 'Duelo', color: '#7C8BA1', icon: 'flower' },
  fear: { labelEs: 'Temor', color: '#818CF8', icon: 'alert-circle' },
  anger: { labelEs: 'Furia', color: '#FF4D6D', icon: 'flame' },
  determination: { labelEs: 'Determinación', color: '#FB923C', icon: 'shield' },
  transcendence: { labelEs: 'Trascendencia', color: '#E879F9', icon: 'infinite' },
};

export function emotionColor(emotion?: EmotionType | string | null): string {
  if (!emotion) return COLORS.cyan;
  if (emotion in EMOTION_META) {
    return EMOTION_META[emotion as EmotionType].color;
  }
  return COLORS.cyan;
}

export function emotionLabelEs(emotion?: EmotionType | string | null): string {
  if (!emotion) return 'Sereno';
  if (emotion in EMOTION_META) {
    return EMOTION_META[emotion as EmotionType].labelEs;
  }
  return String(emotion);
}

export const ACTIVITY_META: Record<
  ActivityType,
  { labelEs: string; shortEs: string; color: string; icon: string }
> = {
  wandering: { labelEs: 'Explorando', shortEs: 'Explora', color: '#96AFCB', icon: 'walk' },
  foraging: { labelEs: 'Recolectando néctar', shortEs: 'Nutriéndose', color: '#34E08F', icon: 'nutrition' },
  drinking: { labelEs: 'Bebiendo agua pura', shortEs: 'Bebiendo', color: '#38BDF8', icon: 'water' },
  resting: { labelEs: 'Descansando', shortEs: 'Reposo', color: '#A5B4FC', icon: 'moon' },
  warming: { labelEs: 'Buscando calor', shortEs: 'Calor', color: '#FB923C', icon: 'bonfire' },
  socializing: { labelEs: 'Dialogando', shortEs: 'Socializa', color: '#2CE6D8', icon: 'chatbubbles' },
  courting: { labelEs: 'Cortejo luminoso', shortEs: 'Cortejo', color: '#FF6B9D', icon: 'heart' },
  building: { labelEs: 'Erigiendo estructura', shortEs: 'Construye', color: '#F6C453', icon: 'construct' },
  farming: { labelEs: 'Cultivando la tierra', shortEs: 'Cultiva', color: '#4ADE80', icon: 'leaf' },
  studying: { labelEs: 'Descifrando cristales', shortEs: 'Estudia', color: '#B57CFF', icon: 'library' },
  fleeing: { labelEs: 'Huyendo del peligro', shortEs: 'Huye', color: '#FF4D6D', icon: 'warning' },
  defending: { labelEs: 'Defendiendo al clan', shortEs: 'Defiende', color: '#F97316', icon: 'shield' },
  meditating: { labelEs: 'Meditación profunda', shortEs: 'Medita', color: '#E879F9', icon: 'sparkles' },
};

export const LIFE_STAGE_META: Record<
  LifeStage,
  { labelEs: string; color: string }
> = {
  larva: { labelEs: 'Larva', color: '#67E8F9' },
  juvenile: { labelEs: 'Juvenil', color: '#34E08F' },
  adult: { labelEs: 'Adulto', color: '#F6C453' },
  elder: { labelEs: 'Anciano Sabio', color: '#D8B4FE' },
};

export const SEASON_META: Record<
  Season,
  { labelEs: string; color: string; icon: string }
> = {
  spring: { labelEs: 'Primavera', color: '#34E08F', icon: 'flower-outline' },
  summer: { labelEs: 'Verano', color: '#F6C453', icon: 'sunny-outline' },
  autumn: { labelEs: 'Otoño', color: '#FB923C', icon: 'leaf-outline' },
  winter: { labelEs: 'Invierno', color: '#67E8F9', icon: 'snow-outline' },
};

export const WEATHER_META: Record<
  WeatherType,
  { labelEs: string; color: string; icon: string }
> = {
  clear: { labelEs: 'Despejado', color: '#96AFCB', icon: 'partly-sunny-outline' },
  rain: { labelEs: 'Lluvia Fértil', color: '#38BDF8', icon: 'rainy-outline' },
  storm: { labelEs: 'Tempestad', color: '#818CF8', icon: 'thunderstorm-outline' },
  aurora: { labelEs: 'Aurora Astral', color: '#2CE6D8', icon: 'sparkles-outline' },
  heatwave: { labelEs: 'Sol Cenital', color: '#FB923C', icon: 'sunny' },
  ashfall: { labelEs: 'Lluvia de Ceniza', color: '#F87171', icon: 'flame-outline' },
};

export const STRUCTURE_META: Record<
  StructureKind,
  { labelEs: string; descEs: string; color: string; icon: string }
> = {
  campfire: {
    labelEs: 'Hoguera Tribal',
    descEs: 'Irradia calor nocturno y reúne relatos del clan',
    color: '#FB923C',
    icon: 'bonfire-outline',
  },
  shelter: {
    labelEs: 'Domo Refugio',
    descEs: 'Cuna protectora y regeneración celular',
    color: '#34E08F',
    icon: 'home-outline',
  },
  granary: {
    labelEs: 'Granero Comunal',
    descEs: 'Reserva colectiva de néctar y bayas',
    color: '#F6C453',
    icon: 'cube-outline',
  },
  farm: {
    labelEs: 'Terraza de Cultivo',
    descEs: 'Agricultura simbiótica regenerativa',
    color: '#4ADE80',
    icon: 'nutrition-outline',
  },
  totem: {
    labelEs: 'Tótem Ancestral',
    descEs: 'Emblema identitario y cohesión cultural',
    color: '#2CE6D8',
    icon: 'flag-outline',
  },
  watchtower: {
    labelEs: 'Atalaya Lumínica',
    descEs: 'Faro centinela que repele sombras Umbra',
    color: '#38BDF8',
    icon: 'flashlight-outline',
  },
  monolith: {
    labelEs: 'Monolito de Sabiduría',
    descEs: 'Archivo cristalino que eleva la consciencia',
    color: '#B57CFF',
    icon: 'prism-outline',
  },
  memorial: {
    labelEs: 'Estela Memorial',
    descEs: 'Monumento eterno a la memoria de un ancestro',
    color: '#E2E8F0',
    icon: 'sparkles-outline',
  },
};

export const RESOURCE_META: Record<
  ResourceKind,
  { labelEs: string; color: string; icon: string }
> = {
  nectar_tree: { labelEs: 'Árbol de Néctar', color: '#F6C453', icon: 'nutrition' },
  berry_bush: { labelEs: 'Arbusto Luminoso', color: '#FF6B9D', icon: 'leaf' },
  water_spring: { labelEs: 'Manantial Puro', color: '#38BDF8', icon: 'water' },
  timber_grove: { labelEs: 'Bosquecillo', color: '#34E08F', icon: 'git-branch' },
  stone_outcrop: { labelEs: 'Veta de Piedra', color: '#94A3B8', icon: 'cube' },
  crystal_node: { labelEs: 'Nodo de Cristal', color: '#B57CFF', icon: 'prism' },
  healing_herb: { labelEs: 'Hierba Sanadora', color: '#6EE7B7', icon: 'medkit' },
  star_spore: { labelEs: 'Espora Estelar', color: '#818CF8', icon: 'sparkles' },
};

export const TECH_META: Record<
  TechId,
  { labelEs: string; descEs: string; color: string; icon: string }
> = {
  fire_mastery: {
    labelEs: 'Dominio del Fuego',
    descEs: 'Permite encender hogueras que disipan el frío invernal y las sombras.',
    color: '#FB923C',
    icon: 'flame',
  },
  shelter_craft: {
    labelEs: 'Arquitectura Orgánica',
    descEs: 'Tejido de domos protectores donde sanar y criar larvas.',
    color: '#34E08F',
    icon: 'home',
  },
  agriculture: {
    labelEs: 'Simbiosis Agrícola',
    descEs: 'Cultivo deliberado de terrazas nutritivas para sostener al clan.',
    color: '#4ADE80',
    icon: 'leaf',
  },
  herbal_medicine: {
    labelEs: 'Alquimia Botánica',
    descEs: 'Uso de hierbas luminosas para restaurar tejidos dañados.',
    color: '#2CE6D8',
    icon: 'medkit',
  },
  stone_masonry: {
    labelEs: 'Cantería Megalítica',
    descEs: 'Construcción de graneros comunales y atalayas contra depredadores.',
    color: '#94A3B8',
    icon: 'shield-checkmark',
  },
  star_lore: {
    labelEs: 'Astronomía Abisal',
    descEs: 'Lectura de los ciclos solares, estaciones y corrientes del mundo.',
    color: '#818CF8',
    icon: 'planet',
  },
  symbolic_script: {
    labelEs: 'Escritura Simbólica',
    descEs: 'Inscripción de léxico, leyes y epitafios duraderos en piedra y cristal.',
    color: '#B57CFF',
    icon: 'book',
  },
};

export interface DivinePowerMeta {
  id: DivinePowerId;
  labelEs: string;
  shortEs: string;
  descEs: string;
  color: string;
  glow: string;
  icon: string;
}

export const DIVINE_POWERS_ORDER: DivinePowerId[] = [
  'observe',
  'nourish',
  'rain',
  'solar_blessing',
  'mutagen',
  'monolith',
  'spawn_life',
  'lightning',
];

export const DIVINE_POWER_META: Record<DivinePowerId, DivinePowerMeta> = {
  observe: {
    id: 'observe',
    labelEs: 'Observar',
    shortEs: 'Observar',
    descEs: 'Toca cualquier ser para inspeccionar su mente y linaje',
    color: '#2CE6D8',
    glow: 'rgba(44, 230, 216, 0.35)',
    icon: 'eye-outline',
  },
  nourish: {
    id: 'nourish',
    labelEs: 'Lluvia de Maná',
    shortEs: 'Maná',
    descEs: 'Brote dorado de néctar que sacia a los seres cercanos',
    color: '#F6C453',
    glow: 'rgba(246, 196, 83, 0.38)',
    icon: 'sparkles-outline',
  },
  rain: {
    id: 'rain',
    labelEs: 'Tormenta Fértil',
    shortEs: 'Lluvia',
    descEs: 'Hidrata criaturas, llena manantiales y revitaliza flora',
    color: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.38)',
    icon: 'rainy-outline',
  },
  solar_blessing: {
    id: 'solar_blessing',
    labelEs: 'Sol Vital',
    shortEs: 'Sol Vital',
    descEs: 'Corona térmica que sana heridas, da calor y ahuyenta Umbras',
    color: '#FB923C',
    glow: 'rgba(251, 146, 60, 0.38)',
    icon: 'sunny-outline',
  },
  mutagen: {
    id: 'mutagen',
    labelEs: 'Rayo Mutágeno',
    shortEs: 'Mutágeno',
    descEs: 'Pulso cósmico que altera genomas y acelera la especiación',
    color: '#C084FC',
    glow: 'rgba(192, 132, 252, 0.38)',
    icon: 'color-wand-outline',
  },
  monolith: {
    id: 'monolith',
    labelEs: 'Erigir Monolito',
    shortEs: 'Monolito',
    descEs: 'Planta un obelisco ancestral que irradia intelecto y cultura',
    color: '#818CF8',
    glow: 'rgba(129, 140, 248, 0.38)',
    icon: 'prism-outline',
  },
  spawn_life: {
    id: 'spawn_life',
    labelEs: 'Chispa de Génesis',
    shortEs: 'Crear Vida',
    descEs: 'Engendra un nuevo ser consciente adaptado al bioma tocado',
    color: '#34E08F',
    glow: 'rgba(52, 224, 143, 0.38)',
    icon: 'egg-outline',
  },
  lightning: {
    id: 'lightning',
    labelEs: 'Rayo Cataclísmico',
    shortEs: 'Rayo',
    descEs: 'Descarga eléctrica devastadora que purga depredadores y altera el suelo',
    color: '#FF4D6D',
    glow: 'rgba(255, 77, 109, 0.38)',
    icon: 'flash-outline',
  },
};

export interface GenomeTraitMeta {
  key: keyof Genome;
  labelEs: string;
  shortEs: string;
  descEs: string;
  color: string;
}

export const GENOME_TRAITS: GenomeTraitMeta[] = [
  {
    key: 'curiosity',
    labelEs: 'Curiosidad',
    shortEs: 'CUR',
    descEs: 'Exploración lejana y preguntas existenciales',
    color: '#2CE6D8',
  },
  {
    key: 'empathy',
    labelEs: 'Empatía',
    shortEs: 'EMP',
    descEs: 'Compartir alimento, sanar aliados y duelo',
    color: '#FF6B9D',
  },
  {
    key: 'creativity',
    labelEs: 'Creatividad',
    shortEs: 'CRE',
    descEs: 'Invención científica, arquitectura y léxico',
    color: '#B57CFF',
  },
  {
    key: 'sociability',
    labelEs: 'Sociabilidad',
    shortEs: 'SOC',
    descEs: 'Cohesión tribal, diálogo y alianzas',
    color: '#F6C453',
  },
  {
    key: 'survivalDrive',
    labelEs: 'Impulso Vital',
    shortEs: 'VIT',
    descEs: 'Eficiencia metabólica e instinto de preservación',
    color: '#34E08F',
  },
  {
    key: 'aggression',
    labelEs: 'Territorialidad',
    shortEs: 'AGR',
    descEs: 'Defensa feroz frente a rivales y Umbras',
    color: '#FF4D6D',
  },
  {
    key: 'speedGene',
    labelEs: 'Agilidad Motriz',
    shortEs: 'VEL',
    descEs: 'Velocidad máxima de desplazamiento continuo',
    color: '#38BDF8',
  },
  {
    key: 'sizeGene',
    labelEs: 'Envergadura',
    shortEs: 'TAM',
    descEs: 'Escala corporal y vitalidad física máxima',
    color: '#FB923C',
  },
  {
    key: 'senseGene',
    labelEs: 'Agudeza Sensorial',
    shortEs: 'SEN',
    descEs: 'Alcance de percepción de recursos y amenazas',
    color: '#818CF8',
  },
  {
    key: 'bioluminescence',
    labelEs: 'Bioluminiscencia',
    shortEs: 'LUX',
    descEs: 'Resplandor nocturno, aura y cortejo',
    color: '#E879F9',
  },
];

export const EVENT_CATEGORY_META: Record<
  LiveEventCategory,
  { labelEs: string; color: string; icon: string }
> = {
  birth: { labelEs: 'Nacimiento', color: '#34E08F', icon: 'sparkles' },
  death: { labelEs: 'Tránsito', color: '#94A3B8', icon: 'moon' },
  speciation: { labelEs: 'Especiación', color: '#E879F9', icon: 'git-network' },
  tribe_founded: { labelEs: 'Nuevo Clan', color: '#F6C453', icon: 'flag' },
  tech_discovered: { labelEs: 'Ciencia', color: '#2CE6D8', icon: 'bulb' },
  structure_built: { labelEs: 'Obra', color: '#FB923C', icon: 'construct' },
  encounter: { labelEs: 'Encuentro', color: '#38BDF8', icon: 'chatbubbles' },
  romance: { labelEs: 'Unión', color: '#FF6B9D', icon: 'heart' },
  conflict: { labelEs: 'Conflicto', color: '#F97316', icon: 'flash' },
  predator: { labelEs: 'Umbra', color: '#FF4D6D', icon: 'skull' },
  world_weather: { labelEs: 'Clima', color: '#67E8F9', icon: 'rainy' },
  divine_intervention: { labelEs: 'Intervención', color: '#F6C453', icon: 'hand-left' },
  philosophy: { labelEs: 'Filosofía', color: '#B57CFF', icon: 'infinite' },
};

export function dayPhaseLabelEs(dayPhase: number): {
  labelEs: string;
  icon: string;
  color: string;
} {
  const p = ((dayPhase % 1) + 1) % 1;
  if (p < 0.16) {
    return { labelEs: 'Amanecer', icon: 'partly-sunny-outline', color: '#FDBA74' };
  }
  if (p < 0.5) {
    return { labelEs: 'Día Solar', icon: 'sunny-outline', color: '#F6C453' };
  }
  if (p < 0.66) {
    return { labelEs: 'Ocaso', icon: 'cloudy-night-outline', color: '#FB7185' };
  }
  return { labelEs: 'Noche Bioluminiscente', icon: 'moon-outline', color: '#818CF8' };
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = Math.max(0, Math.min(1, s / 100));
  const lig = Math.max(0, Math.min(1, l / 100));

  if (sat === 0) {
    const v = Math.round(lig * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, tInput: number) => {
    let t = tInput;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const r = Math.round(hue2rgb(p, q, hue + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hue) * 255);
  const b = Math.round(hue2rgb(p, q, hue - 1 / 3) * 255);
  return [r, g, b];
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function hslaString(h: number, s: number, l: number, a: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export function formatDurationAwayEs(ms: number): string {
  const totalSec = Math.max(1, Math.floor(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}
