/**
 * UBERIS v2.0 — Canonical Shared Domain & Engine Contract
 *
 * Strictly shared between:
 *  - Engine Subagent (`engine/*` & `scripts/verify-simulation.ts`)
 *  - World/Renderer/UI Subagent (`world/*`, `audio/*`, `components/*`, `context/*`, `hooks/*`, `app/*`)
 */

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

export type BiomeId =
  | 'eden'       // Jardín Primordial (fértil, templado, árboles de néctar)
  | 'lagoon'     // Laguna Coralina (agua dulce, algas luminosas, hidratación)
  | 'steppe'     // Estepa Áurea (praderas amplias, madera, asentamientos)
  | 'archive'    // Ruinas del Archivo (cristales de memoria, impulsa intelecto y cultura)
  | 'ashlands'   // Tierras de Ceniza (geotermia cálida en invierno, minerales, alta mutación)
  | 'abyss';     // Velo Abisal (esporas estelares raras, visiones profundas, peligro)

export interface BiomeRegion {
  id: BiomeId;
  nameEs: string;
  subtitleEs: string;
  /** Normalized polygon or center+radius region in world coordinates (0..WORLD_WIDTH, 0..WORLD_HEIGHT) */
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  fertility: number;       // 0..1
  baseTemp: number;        // 0..1 (0 = freezing, 0.5 = temperate, 1 = scorching)
  mutationBoost: number;   // multiplier >= 1
  wisdomBoost: number;     // multiplier >= 1
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherType = 'clear' | 'rain' | 'storm' | 'aurora' | 'heatwave' | 'ashfall';
export type SimSpeed = 0 | 1 | 2 | 4;

export type DivinePowerId =
  | 'observe'
  | 'nourish'      // Lluvia de maná / néctar dorado
  | 'rain'         // Tormenta fértil localizada
  | 'solar_blessing' // Calor vital y curación
  | 'mutagen'      // Rayo cósmico evolutivo
  | 'monolith'     // Erigir monolito de sabiduría ancestral
  | 'spawn_life'   // Chispa de Génesis (nueva criatura)
  | 'lightning';   // Rayo cataclísmico

export interface DivineEffect {
  id: number;
  power: Exclude<DivinePowerId, 'observe'>;
  x: number;
  y: number;
  radius: number;
  createdAtMs: number;
  durationMs: number;
}

export interface Genome {
  curiosity: number;       // 0..1: rango de exploración, preguntas existenciales
  empathy: number;         // 0..1: compartir alimento, curar aliados, duelo
  aggression: number;      // 0..1: territorialidad, defensa/ataque, robo
  creativity: number;      // 0..1: invención tecnológica, construcción, símbolos
  survivalDrive: number;   // 0..1: eficiencia metabólica, huida oportuna
  sociability: number;     // 0..1: cohesión grupal, fundación de clanes, diálogo
  speedGene: number;       // 0..1: velocidad máxima vs mayor gasto energético
  sizeGene: number;        // 0..1: tamaño corporal y salud máxima vs mayor hambre
  senseGene: number;       // 0..1: alcance sensorial (comida, agua, depredadores)
  bioluminescence: number; // 0..1: luminiscencia nocturna, cortejo, aura
}

export type CrestStyle = 'none' | 'crown' | 'antlers' | 'halo' | 'fins' | 'horns';
export type TailStyle = 'none' | 'wispy' | 'twin' | 'segmented';
export type BodyPattern = 'solid' | 'spotted' | 'striped' | 'nebula';

export interface Morphology {
  bodyHue: number;         // 0..360
  accentHue: number;       // 0..360
  bodyScale: number;       // 0.72..1.42
  eyeCount: 1 | 2 | 3;
  crest: CrestStyle;
  tail: TailStyle;
  pattern: BodyPattern;
}

export type LifeStage = 'larva' | 'juvenile' | 'adult' | 'elder';

export type EmotionType =
  | 'wonder'
  | 'joy'
  | 'love'
  | 'calm'
  | 'hope'
  | 'curiosity'
  | 'contemplation'
  | 'loneliness'
  | 'sadness'
  | 'grief'
  | 'fear'
  | 'anger'
  | 'determination'
  | 'transcendence';

export type ActivityType =
  | 'wandering'
  | 'foraging'
  | 'drinking'
  | 'resting'
  | 'warming'
  | 'socializing'
  | 'courting'
  | 'building'
  | 'farming'
  | 'studying'
  | 'fleeing'
  | 'defending'
  | 'meditating';

export interface EmotionalState {
  emotion: EmotionType;
  intensity: number; // 0..1
}

export interface Inventory {
  food: number;
  water: number;
  wood: number;
  stone: number;
  crystal: number;
  herbs: number;
}

export interface RelationshipEntry {
  targetId: number;
  name: string;
  valence: 'kin' | 'mate' | 'friend' | 'mentor' | 'rival' | 'neutral';
  affinity: number;     // -1..1
  encounters: number;
  lastTick: number;
  keyMemory: string;
}

export interface FinalMessage {
  finalWords: string;
  lifeMeaning: string;
  giftToWorld: string;
  finalEmotion: EmotionType;
  causeOfDeath: string;
  atPeace: boolean;
}

export interface Entity {
  id: number;
  name: string;
  speciesId: string;
  speciesName: string;     // Ej: "Aurea luminis", "Sylva sapiens"
  tribeId: number | null;
  generation: number;
  ageTicks: number;
  maxAgeTicks: number;
  lifeStage: LifeStage;

  // 2D Continuous World Position & Kinematics
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;         // radians
  targetX: number | null;
  targetY: number | null;
  currentBiome: BiomeId;
  activity: ActivityType;

  // Homeostasis (0..100)
  energy: number;          // nutrición / calorías
  hydration: number;       // sed / agua
  health: number;          // integridad física
  warmth: number;          // termorregulación
  stamina: number;         // vigor inmediato
  intelligence: number;    // 0..1 calculado por genoma + edad + cultura + monolitos

  // Genetics & Phenotype
  genome: Genome;
  morphology: Morphology;
  emotionalState: EmotionalState;
  inventory: Inventory;

  // Lifecycle & Reproduction
  isAlive: boolean;
  reproductionCooldown: number;
  gestationTicks: number;
  parentAId: number | null;
  parentBId: number | null;
  childrenIds: number[];
  bornAtTick: number;
  bornAtIso: string;
  diedAtTick: number | null;

  // Inner Mind, Speech & Culture (Spanish)
  lastThought: string | null;
  speechBubble: string | null;
  speechTimerMs: number;   // > 0 visible over creature head
  currentDesire: string | null;
  currentGoal: string | null;
  existentialStatement: string | null;
  memories: string[];
  memoryArchive: string[];
  beliefs: Record<string, string>;
  relationships: Record<string, RelationshipEntry>;
  finalMessage: FinalMessage | null;
}

export type ResourceKind =
  | 'nectar_tree'
  | 'berry_bush'
  | 'water_spring'
  | 'timber_grove'
  | 'stone_outcrop'
  | 'crystal_node'
  | 'healing_herb'
  | 'star_spore';

export interface WorldResource {
  id: number;
  kind: ResourceKind;
  biome: BiomeId;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  regrowRate: number;
  radius: number;
}

export type StructureKind =
  | 'campfire'     // Calor nocturno + punto de reunión y relatos
  | 'shelter'      // Refugio curativo + cuna segura
  | 'granary'      // Reserva comunal de alimento del clan
  | 'farm'         // Cultivo agrícola regenerativo
  | 'totem'        // Emblema cultural del clan
  | 'watchtower'   // Repele depredadores Umbra
  | 'monolith'     // Archivo de sabiduría ancestral
  | 'memorial';    // Tumba / estela de un ser caído relevante

export interface Structure {
  id: number;
  kind: StructureKind;
  biome: BiomeId;
  x: number;
  y: number;
  tribeId: number | null;
  builderId: number | null;
  builderName: string;
  hp: number;
  maxHp: number;
  storedFood: number;
  auraRadius: number;
  inscription: string | null; // Ej: epitafio o máxima cultural grabada
  createdTick: number;
}

export interface Predator {
  id: number;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  hp: number;
  maxHp: number;
  hunger: number;
  biome: BiomeId;
  state: 'prowling' | 'stalking' | 'resting' | 'repelled' | 'banished';
  targetEntityId: number | null;
  /** Seconds until the predator may strike / re-target again (set after attacks and repulsions) */
  cooldownSec?: number;
  /** Seconds until a banished (hp <= 0) predator re-coalesces from the shadows */
  respawnInSec?: number;
}

export type TechId =
  | 'fire_mastery'
  | 'shelter_craft'
  | 'agriculture'
  | 'herbal_medicine'
  | 'stone_masonry'
  | 'star_lore'
  | 'symbolic_script';

export interface Tribe {
  id: number;
  name: string;
  motto: string;
  color: string;
  founderId: number;
  leaderId: number | null;
  homeX: number;
  homeY: number;
  homeBiome: BiomeId;
  memberIds: number[];
  unlockedTechs: TechId[];
  sharedBeliefs: Record<string, string>;
  lexicon: string[];        // Palabras / símbolos propios creados por el clan
  createdTick: number;
}

export interface ConsciousnessLog {
  id: number;
  entityId: number;
  tick: number;
  thought: string;
  action: string;
  emotion: EmotionType;
  emotionIntensity: number;
  timestamp: string;
}

export type LiveEventCategory =
  | 'birth'
  | 'death'
  | 'speciation'
  | 'tribe_founded'
  | 'tech_discovered'
  | 'structure_built'
  | 'encounter'
  | 'romance'
  | 'conflict'
  | 'predator'
  | 'world_weather'
  | 'divine_intervention'
  | 'philosophy';

export interface LiveEvent {
  id: number;
  tick: number;
  category: LiveEventCategory;
  title: string;
  description: string;
  biome?: BiomeId;
  x?: number;
  y?: number;
  entityIds?: number[];
  important?: boolean;
  timestamp: string;
}

export interface GenerationSnapshot {
  tick: number;
  population: number;
  speciesCount: number;
  avgEnergy: number;
  avgIntelligence: number;
  avgGenome: Genome;
}

export interface WorldState {
  seed: number;
  eraName: string;
  currentTick: number;
  dayCount: number;
  dayPhase: number;        // 0..1 (0.0=amanecer, 0.25=mediodía, 0.55=ocaso, 0.8=medianoche)
  season: Season;
  weather: WeatherType;
  globalTemperature: number; // 0..1
  totalBirths: number;
  totalDeaths: number;
  totalSpeciations: number;
  culturalBeliefs: Record<BiomeId, Record<string, string>>;
  historySnapshots: GenerationSnapshot[];
}

export interface SimState {
  world: WorldState;
  biomes: BiomeRegion[];
  entities: Entity[];      // Incluye seres vivos + últimos ancestros fallecidos para linaje/memorial
  resources: WorldResource[];
  structures: Structure[];
  predators: Predator[];
  tribes: Tribe[];
  liveEvents: LiveEvent[];
  logs: Record<number, ConsciousnessLog[]>;
  divineEffects: DivineEffect[];
}

export interface CatchUpSummary {
  msAway: number;
  ticksSimulated: number;
  births: number;
  deaths: number;
  discoveries: number;
}

export interface SimSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  showSenseCones: boolean;
  showNames: boolean;
  showTrails: boolean;
  anthropicApiKey: string;
}

/**
 * Public controller interface exposed by `Simulation` class (`engine/simulation.ts`)
 * and consumed by `SimulationContext` + Skia renderer (`world/*`).
 */
export interface ISimulationController {
  start(): Promise<void>;
  stop(): void;
  resetWorld(customSeed?: number): Promise<void>;
  getState(): SimState;
  getSpeed(): SimSpeed;
  setSpeed(speed: SimSpeed): void;
  /** Called at ~60fps from requestAnimationFrame / Skia loop for smooth 2D steering & animations */
  stepFrame(dtSeconds: number): void;
  /** Manual single ecological/cognitive tick trigger */
  triggerCognitiveTick(): Promise<void>;
  /** Subscribe to discrete state updates (cognitive ticks, divine actions, births/deaths) */
  subscribe(listener: (state: SimState) => void): () => void;
  /** Subscribe to notable discrete events for audio/haptic feedback */
  onEvent(listener: (event: LiveEvent) => void): () => void;

  // Direct player / God-mode interactions
  applyDivinePower(power: Exclude<DivinePowerId, 'observe'>, worldX: number, worldY: number): LiveEvent | null;
  feedEntity(entityId: number): void;
  healEntity(entityId: number): void;
  blessEntity(entityId: number): void;
  inspectLineage(entityId: number): {
    entity: Entity | null;
    parents: Entity[];
    children: Entity[];
    ancestors: Entity[];
  };

  getCatchUpSummary(): CatchUpSummary | null;
  clearCatchUpSummary(): void;
  getSettings(): SimSettings;
  updateSettings(partial: Partial<SimSettings>): Promise<void>;
  saveNow(): Promise<void>;
}
