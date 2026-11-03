/**
 * UBERIS v2.0 — Autonomous Artificial Life Simulation Core
 *
 * Implements the continuous 60fps 2D steering kinematics loop,
 * scheduled ecological/cognitive ticks scaled by SimSpeed,
 * homeostatic dynamics, speciation detection, divine interventions,
 * and ancestral lineage tracking.
 */

import {
  ActivityType,
  BiomeId,
  CatchUpSummary,
  DivineEffect,
  DivinePowerId,
  Entity,
  GenerationSnapshot,
  Genome,
  ISimulationController,
  LiveEvent,
  Predator,
  SimSettings,
  SimSpeed,
  SimState,
  Structure,
  Tribe,
  WorldResource,
  WorldState,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './types';
import {
  BIOMES,
  ERA_NAMES,
  getBiomeAt,
  getBiomeEffectiveTemperature,
  getGlobalTemperature,
  getSeasonForDay,
  getWeatherForDay,
} from './biomes';
import {
  computeIntelligence,
  crossoverAndMutate,
  deriveMorphology,
  deriveSpeciesInfo,
  generateEntityName,
  SEED_ARCHETYPES,
} from './genome';
import {
  consolidateMemories,
  enrichThoughtWithClaude,
  generateFinalMessage,
  generateSpeech,
  generateThought,
} from './cognition';
import {
  createInitialPredators,
  createInitialResources,
  updatePredators,
  updateResources,
} from './ecology';
import {
  checkAutonomousBuilding,
  checkTechnologicalDiscovery,
  checkTribeFormation,
  erectMemorialStela,
} from './society';
import {
  DEFAULT_SETTINGS,
  loadPersistedSimSettings,
  loadPersistedSimState,
  persistSimSettings,
  persistSimState,
} from './persistence';

let _entityIdCounter = 1;
let _liveEventIdCounter = 1;

export class Simulation implements ISimulationController {
  private state!: SimState;
  private settings: SimSettings = { ...DEFAULT_SETTINGS };
  private speed: SimSpeed = 1;
  private running = false;
  private tickIntervalHandle: ReturnType<typeof setInterval> | null = null;
  private subscribers = new Set<(state: SimState) => void>();
  private eventListeners = new Set<(event: LiveEvent) => void>();
  private catchUpSummary: CatchUpSummary | null = null;
  private isProcessingTick = false;

  constructor() {
    this.initDefaultWorld();
  }

  // ─── INITIALIZATION & LIFECYCLE ───────────────────────────────────────────

  private initDefaultWorld(customSeed = 42): void {
    const eraName = ERA_NAMES[0];
    const season = 'spring';
    const weather = 'clear';
    const dayPhase = 0.20;
    const globalTemperature = getGlobalTemperature(season, weather, dayPhase);

    const world: WorldState = {
      seed: customSeed,
      eraName,
      currentTick: 0,
      dayCount: 0,
      dayPhase,
      season,
      weather,
      globalTemperature,
      totalBirths: 8,
      totalDeaths: 0,
      totalSpeciations: 8,
      culturalBeliefs: {
        eden: {},
        lagoon: {},
        steppe: {},
        archive: {},
        ashlands: {},
        abyss: {},
      },
      historySnapshots: [],
    };

    // Spawn 8 Genesis founding entities
    const entities: Entity[] = SEED_ARCHETYPES.map((arch, idx) => {
      const id = _entityIdCounter++;
      const biomeObj = BIOMES.find(b => b.id === arch.currentBiome) || BIOMES[0];
      // Organic spawn jitter near biome center
      const angle = (idx / SEED_ARCHETYPES.length) * Math.PI * 2;
      const dist = 70 + (idx % 3) * 40;
      const x = Math.round(biomeObj.centerX + Math.cos(angle) * dist);
      const y = Math.round(biomeObj.centerY + Math.sin(angle) * dist);

      const morphology = deriveMorphology(arch.genome);
      const ent: Entity = {
        id,
        name: arch.name,
        speciesId: arch.speciesId,
        speciesName: arch.speciesName,
        tribeId: null,
        generation: 0,
        ageTicks: 25,
        maxAgeTicks: 210 + Math.round(arch.genome.survivalDrive * 80),
        lifeStage: 'adult',

        x,
        y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        heading: Math.random() * Math.PI * 2,
        targetX: null,
        targetY: null,
        currentBiome: arch.currentBiome,
        activity: 'wandering',

        energy: 88,
        hydration: 88,
        health: 100,
        warmth: 85,
        stamina: 95,
        intelligence: 0.35,

        genome: arch.genome,
        morphology,
        emotionalState: {
          emotion: arch.emotion,
          intensity: 0.75,
        },
        inventory: {
          food: 10,
          water: 10,
          wood: 0,
          stone: 0,
          crystal: 0,
          herbs: 0,
        },

        isAlive: true,
        reproductionCooldown: 12,
        gestationTicks: 0,
        parentAId: null,
        parentBId: null,
        childrenIds: [],
        bornAtTick: 0,
        bornAtIso: new Date().toISOString(),
        diedAtTick: null,

        lastThought: arch.existentialStatement,
        speechBubble: null,
        speechTimerMs: 0,
        currentDesire: 'Explorar y afianzar la vida en este territorio.',
        currentGoal: 'foraging',
        existentialStatement: arch.existentialStatement,
        memories: [`Desperté en ${biomeObj.nameEs} bajo el cielo primordial.`],
        memoryArchive: [],
        beliefs: {},
        relationships: {},
        finalMessage: null,
      };

      ent.intelligence = computeIntelligence(ent, 0, false);
      return ent;
    });

    const resources = createInitialResources();
    const predators = createInitialPredators();
    const structures: Structure[] = [];
    const tribes: Tribe[] = [];
    const divineEffects: DivineEffect[] = [];

    const genesisEvent: LiveEvent = {
      id: _liveEventIdCounter++,
      tick: 0,
      category: 'birth',
      title: 'El Génesis Primordial',
      description: 'Ocho seres despiertan a través de los seis biomas del continente.',
      biome: 'eden',
      x: 1200,
      y: 900,
      important: true,
      timestamp: new Date().toISOString(),
    };

    const logs: Record<number, any[]> = {};
    for (const e of entities) {
      logs[e.id] = [
        {
          id: 1,
          entityId: e.id,
          tick: 0,
          thought: e.lastThought,
          action: 'wandering',
          emotion: e.emotionalState.emotion,
          emotionIntensity: e.emotionalState.intensity,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    this.state = {
      world,
      biomes: BIOMES,
      entities,
      resources,
      structures,
      predators,
      tribes,
      liveEvents: [genesisEvent],
      logs,
      divineEffects,
    };
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    // Load persisted settings
    this.settings = await loadPersistedSimSettings();

    // Try loading saved state
    const saved = await loadPersistedSimState();
    if (saved && saved.state) {
      this.state = saved.state;

      // Ensure biomes array is up to date
      this.state.biomes = BIOMES;

      // Calculate offline catch-up ticks
      const now = Date.now();
      const msAway = now - saved.savedAt;
      if (msAway > 12000) {
        // 1 tick per 4 seconds of away time, capped at 35 ticks
        const ticksToSimulate = Math.min(35, Math.floor(msAway / 4000));
        let birthsBefore = this.state.world.totalBirths;
        let deathsBefore = this.state.world.totalDeaths;
        let techsBefore = this.state.tribes.reduce((s, t) => s + t.unlockedTechs.length, 0);

        for (let i = 0; i < ticksToSimulate; i++) {
          await this.processDiscreteTick();
        }

        this.catchUpSummary = {
          msAway,
          ticksSimulated: ticksToSimulate,
          births: this.state.world.totalBirths - birthsBefore,
          deaths: this.state.world.totalDeaths - deathsBefore,
          discoveries:
            this.state.tribes.reduce((s, t) => s + t.unlockedTechs.length, 0) - techsBefore,
        };
      }
    }

    this.rescheduleTickLoop();
  }

  public stop(): void {
    this.running = false;
    if (this.tickIntervalHandle) {
      clearInterval(this.tickIntervalHandle);
      this.tickIntervalHandle = null;
    }
  }

  public async resetWorld(customSeed?: number): Promise<void> {
    this.initDefaultWorld(customSeed);
    await persistSimState(this.state);
    this.notifySubscribers();
  }

  public getState(): SimState {
    return this.state;
  }

  public getSpeed(): SimSpeed {
    return this.speed;
  }

  public setSpeed(speed: SimSpeed): void {
    this.speed = speed;
    this.rescheduleTickLoop();
  }

  private rescheduleTickLoop(): void {
    if (this.tickIntervalHandle) {
      clearInterval(this.tickIntervalHandle);
      this.tickIntervalHandle = null;
    }

    if (!this.running || this.speed === 0) return;

    // Base interval is 3500ms at 1x; scales with speed
    const ms = Math.max(800, Math.round(3500 / this.speed));
    this.tickIntervalHandle = setInterval(() => {
      this.triggerCognitiveTick().catch(() => {});
    }, ms);
  }

  public subscribe(listener: (state: SimState) => void): () => void {
    this.subscribers.add(listener);
    listener(this.state);
    return () => this.subscribers.delete(listener);
  }

  public onEvent(listener: (event: LiveEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifySubscribers(): void {
    for (const listener of this.subscribers) {
      try {
        listener(this.state);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  private emitEvent(event: LiveEvent): void {
    this.state.liveEvents.unshift(event);
    if (this.state.liveEvents.length > 80) {
      this.state.liveEvents.length = 80;
    }
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  // ─── 60FPS CONTINUOUS KINEMATICS & AUTONOMOUS STEERING ────────────────────

  public stepFrame(dtSeconds: number): void {
    if (this.speed === 0 || dtSeconds <= 0) return;

    // Limit dt to prevent tunneling after background sleep
    const effectiveDt = Math.min(dtSeconds, 0.1) * this.speed;
    const now = Date.now();
    const world = this.state.world;

    // 1. Advance diurnal cycle (120 seconds of real-time 1x = 1 full day)
    world.dayPhase += effectiveDt / 120;
    if (world.dayPhase >= 1.0) {
      world.dayPhase -= 1.0;
      world.dayCount++;
      world.season = getSeasonForDay(world.dayCount);
      world.weather = getWeatherForDay(world.dayCount, world.season, world.seed);
      const eraIdx = Math.min(ERA_NAMES.length - 1, Math.floor(world.dayCount / 4));
      world.eraName = ERA_NAMES[eraIdx];
    }
    world.globalTemperature = getGlobalTemperature(
      world.season,
      world.weather,
      world.dayPhase
    );

    // 2. Clear expired speech bubbles & divine effects
    for (const ent of this.state.entities) {
      if (ent.speechTimerMs > 0) {
        ent.speechTimerMs -= effectiveDt * 1000;
        if (ent.speechTimerMs <= 0) {
          ent.speechTimerMs = 0;
          ent.speechBubble = null;
        }
      }
    }

    if (this.state.divineEffects.length > 0) {
      this.state.divineEffects = this.state.divineEffects.filter(
        eff => now - eff.createdAtMs < eff.durationMs
      );
    }

    // 3. Autonomous Steering Kinematics for Living Entities
    const livingEntities = this.state.entities.filter(e => e.isAlive);
    const resources = this.state.resources;
    const structures = this.state.structures;
    const predators = this.state.predators;

    for (let i = 0; i < livingEntities.length; i++) {
      const e = livingEntities[i];
      const senseDist = 160 + e.genome.senseGene * 240;
      const baseMaxSpeed =
        (38 + e.genome.speedGene * 44) *
        (0.55 + 0.45 * (e.stamina / 100)) *
        (0.60 + 0.40 * (e.health / 100));

      let targetX = e.targetX;
      let targetY = e.targetY;
      let desiredSpeed = baseMaxSpeed;

      // ── Priority A: Threat Evasion (Predators) ──
      let nearestPredator: Predator | null = null;
      let nearestPredDist = Number.MAX_VALUE;

      for (let p = 0; p < predators.length; p++) {
        const pred = predators[p];
        const pdx = pred.x - e.x;
        const pdy = pred.y - e.y;
        const d = Math.sqrt(pdx * pdx + pdy * pdy);
        if (d < senseDist && d < nearestPredDist) {
          nearestPredDist = d;
          nearestPredator = pred;
        }
      }

      if (nearestPredator && nearestPredDist < 200) {
        if (e.genome.aggression > 0.72 && e.lifeStage === 'adult' && e.health > 70) {
          e.activity = 'defending';
          targetX = nearestPredator.x;
          targetY = nearestPredator.y;
        } else {
          // Flee in opposite direction
          e.activity = 'fleeing';
          const fleeX = e.x - (nearestPredator.x - e.x);
          const fleeY = e.y - (nearestPredator.y - e.y);
          targetX = fleeX;
          targetY = fleeY;
          desiredSpeed *= 1.35;
          e.stamina = Math.max(5, e.stamina - 2.5 * effectiveDt);
        }
      }

      // ── Priority B: Urgent Thirst ──
      else if (e.hydration < 52) {
        let bestSpring: WorldResource | null = null;
        let bestDist = Number.MAX_VALUE;

        for (let r = 0; r < resources.length; r++) {
          const res = resources[r];
          if (res.kind === 'water_spring' && res.amount > 5) {
            const d = Math.hypot(res.x - e.x, res.y - e.y);
            if (d < bestDist) {
              bestDist = d;
              bestSpring = res;
            }
          }
        }

        if (bestSpring) {
          targetX = bestSpring.x;
          targetY = bestSpring.y;
          e.activity = 'drinking';

          if (bestDist < 42) {
            // Drink
            e.hydration = Math.min(100, e.hydration + 26 * effectiveDt);
            bestSpring.amount = Math.max(0, bestSpring.amount - 1.5 * effectiveDt);
          }
        }
      }

      // ── Priority C: Urgent Hunger ──
      else if (e.energy < 58) {
        let bestFood: { x: number; y: number; isGranary: boolean; granaryRef?: Structure } | null = null;
        let bestDist = Number.MAX_VALUE;

        // Check granaries first if in tribe
        for (let s = 0; s < structures.length; s++) {
          const st = structures[s];
          if (st.kind === 'granary' && st.storedFood > 2) {
            const d = Math.hypot(st.x - e.x, st.y - e.y);
            if (d < bestDist) {
              bestDist = d;
              bestFood = { x: st.x, y: st.y, isGranary: true, granaryRef: st };
            }
          }
        }

        // Check trees/bushes/farms
        for (let r = 0; r < resources.length; r++) {
          const res = resources[r];
          if ((res.kind === 'nectar_tree' || res.kind === 'berry_bush') && res.amount > 5) {
            const d = Math.hypot(res.x - e.x, res.y - e.y);
            if (d < bestDist) {
              bestDist = d;
              bestFood = { x: res.x, y: res.y, isGranary: false };
            }
          }
        }

        if (bestFood) {
          targetX = bestFood.x;
          targetY = bestFood.y;
          e.activity = 'foraging';

          if (bestDist < 42) {
            e.energy = Math.min(100, e.energy + 22 * effectiveDt);
            if (bestFood.isGranary && bestFood.granaryRef) {
              bestFood.granaryRef.storedFood = Math.max(0, bestFood.granaryRef.storedFood - 1 * effectiveDt);
            }
          }
        }
      }

      // ── Priority D: Hypothermia & Cold ──
      else if (e.warmth < 44) {
        let bestWarmth: { x: number; y: number } | null = null;
        let bestDist = Number.MAX_VALUE;

        for (let s = 0; s < structures.length; s++) {
          const st = structures[s];
          if (st.kind === 'campfire') {
            const d = Math.hypot(st.x - e.x, st.y - e.y);
            if (d < bestDist) {
              bestDist = d;
              bestWarmth = { x: st.x, y: st.y };
            }
          }
        }

        if (bestWarmth) {
          targetX = bestWarmth.x;
          targetY = bestWarmth.y;
          e.activity = 'warming';
          if (bestDist < 160) {
            e.warmth = Math.min(100, e.warmth + 24 * effectiveDt);
          }
        }
      }

      // ── Priority E: Injury & Healing ──
      else if (e.health < 50) {
        const shelter = structures.find(s => s.kind === 'shelter');
        if (shelter) {
          targetX = shelter.x;
          targetY = shelter.y;
          e.activity = 'resting';
          if (Math.hypot(shelter.x - e.x, shelter.y - e.y) < 140) {
            e.health = Math.min(100, e.health + 12 * effectiveDt);
          }
        }
      }

      // ── Priority F: Courting Mates ──
      else if (
        e.lifeStage === 'adult' &&
        e.energy > 72 &&
        e.hydration > 72 &&
        e.reproductionCooldown <= 0
      ) {
        const mate = livingEntities.find(
          o =>
            o.id !== e.id &&
            o.lifeStage === 'adult' &&
            o.reproductionCooldown <= 0 &&
            Math.hypot(o.x - e.x, o.y - e.y) < senseDist
        );
        if (mate) {
          targetX = mate.x;
          targetY = mate.y;
          e.activity = 'courting';
        }
      }

      // ── Priority G: Tribal flocking or wandering ──
      else {
        const tribe = this.state.tribes.find(t => t.id === e.tribeId);
        if (tribe && Math.hypot(tribe.homeX - e.x, tribe.homeY - e.y) > 280) {
          targetX = tribe.homeX + (Math.random() - 0.5) * 80;
          targetY = tribe.homeY + (Math.random() - 0.5) * 80;
          e.activity = 'socializing';
        } else if (targetX === null || targetY === null || Math.hypot(targetX - e.x, targetY - e.y) < 40) {
          // Wander gently in current biome
          const wanderAngle = Math.random() * Math.PI * 2;
          const wanderDist = 80 + Math.random() * 120;
          targetX = Math.max(100, Math.min(WORLD_WIDTH - 100, e.x + Math.cos(wanderAngle) * wanderDist));
          targetY = Math.max(100, Math.min(WORLD_HEIGHT - 100, e.y + Math.sin(wanderAngle) * wanderDist));
          e.activity = 'wandering';
        }
      }

      e.targetX = targetX;
      e.targetY = targetY;

      // Kinematics integration toward target
      if (targetX !== null && targetY !== null) {
        const dx = targetX - e.x;
        const dy = targetY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
          const desiredVx = (dx / dist) * desiredSpeed;
          const desiredVy = (dy / dist) * desiredSpeed;

          // Gentle steering acceleration
          const steerX = desiredVx - e.vx;
          const steerY = desiredVy - e.vy;
          const maxForce = 90;
          const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);

          if (steerLen > maxForce) {
            e.vx += (steerX / steerLen) * maxForce * effectiveDt;
            e.vy += (steerY / steerLen) * maxForce * effectiveDt;
          } else {
            e.vx += steerX * effectiveDt;
            e.vy += steerY * effectiveDt;
          }
        }
      }

      // Damping friction
      e.vx *= 0.94;
      e.vy *= 0.94;

      // Soft-containment boundary repelling forces (continent 2400x1800)
      const margin = 100;
      const repelForce = 140 * effectiveDt;
      if (e.x < margin) e.vx += repelForce;
      if (e.x > WORLD_WIDTH - margin) e.vx -= repelForce;
      if (e.y < margin) e.vy += repelForce;
      if (e.y > WORLD_HEIGHT - margin) e.vy -= repelForce;

      // Position update
      e.x += e.vx * effectiveDt;
      e.y += e.vy * effectiveDt;

      // Hard clamp safely within continent
      e.x = Math.max(40, Math.min(WORLD_WIDTH - 40, e.x));
      e.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, e.y));

      if (e.vx !== 0 || e.vy !== 0) {
        e.heading = Math.atan2(e.vy, e.vx);
      }
      e.currentBiome = getBiomeAt(e.x, e.y);
    }

    // 4. Update shadow predators kinematics & clashes
    const predResult = updatePredators(
      predators,
      this.state.entities,
      structures,
      effectiveDt,
      world
    );

    for (const ev of predResult.liveEvents) {
      this.emitEvent(ev);
    }
  }

  // ─── DISCRETE ECOLOGICAL / COGNITIVE TICK ─────────────────────────────────

  public async triggerCognitiveTick(): Promise<void> {
    if (this.isProcessingTick) return;
    this.isProcessingTick = true;
    try {
      await this.processDiscreteTick();
      this.notifySubscribers();
    } finally {
      this.isProcessingTick = false;
    }
  }

  private async processDiscreteTick(): Promise<void> {
    const world = this.state.world;
    world.currentTick++;

    const living = this.state.entities.filter(e => e.isAlive);
    const tribes = this.state.tribes;
    const structures = this.state.structures;
    const resources = this.state.resources;

    // 1. Homeostatic Drain & Physical Aging
    for (let i = 0; i < living.length; i++) {
      const e = living[i];
      e.ageTicks++;

      if (e.reproductionCooldown > 0) {
        e.reproductionCooldown--;
      }

      // Life stage transition
      if (e.ageTicks <= 15) {
        e.lifeStage = 'larva';
      } else if (e.ageTicks <= 45) {
        e.lifeStage = 'juvenile';
      } else if (e.ageTicks <= 160) {
        e.lifeStage = 'adult';
      } else {
        e.lifeStage = 'elder';
      }

      // Energy metabolic drain
      const energyDrain =
        (0.48 + e.morphology.bodyScale * 0.35 + e.genome.speedGene * 0.25) *
        (1.15 - e.genome.survivalDrive * 0.32);
      e.energy = Math.max(0, e.energy - energyDrain);

      // Hydration drain
      const heatPenalty = world.globalTemperature > 0.60 ? (world.globalTemperature - 0.60) * 1.8 : 0;
      const hydrationDrain = 0.58 + heatPenalty;
      e.hydration = Math.max(0, e.hydration - hydrationDrain);

      // Warmth regulation
      const biomeTemp = getBiomeEffectiveTemperature(e.currentBiome, world.globalTemperature);
      const nearCampfire = structures.some(
        s => s.kind === 'campfire' && Math.hypot(s.x - e.x, s.y - e.y) < s.auraRadius
      );
      if (nearCampfire) {
        e.warmth = Math.min(100, e.warmth + 14);
      } else {
        const targetWarmth = biomeTemp * 100;
        e.warmth += (targetWarmth - e.warmth) * 0.12;
      }

      // Health consequences
      if (e.energy <= 0) e.health -= 8;
      if (e.hydration <= 0) e.health -= 12;
      if (e.warmth < 18) e.health -= 6;
      if (e.energy > 60 && e.hydration > 60 && e.warmth > 45 && e.health < 100) {
        e.health = Math.min(100, e.health + 4);
      }

      // Stamina regeneration
      e.stamina = Math.min(100, e.stamina + 8);

      // Intelligence recalculation
      const tribeTechCount = tribes.find(t => t.id === e.tribeId)?.unlockedTechs.length || 0;
      const nearMonolith = structures.some(
        s => s.kind === 'monolith' && Math.hypot(s.x - e.x, s.y - e.y) < s.auraRadius
      );
      e.intelligence = computeIntelligence(e, tribeTechCount, nearMonolith);

      // ── Natural & Deprivation Deaths ──
      if (e.health <= 0 || e.ageTicks >= e.maxAgeTicks) {
        e.isAlive = false;
        e.diedAtTick = world.currentTick;
        world.totalDeaths++;

        let cause = 'vejez y plenitud de ciclos';
        if (e.health <= 0) {
          if (e.hydration <= 0) cause = 'deshidratación severa';
          else if (e.energy <= 0) cause = 'inanición';
          else if (e.warmth < 18) cause = 'hipotermia en la helada';
          else cause = 'heridas graves y agotamiento';
        }

        e.finalMessage = generateFinalMessage(e, cause);

        // Erect memorial if elder or member of clan with writing
        const tribe = tribes.find(t => t.id === e.tribeId) || null;
        if (e.lifeStage === 'elder' || (tribe && tribe.unlockedTechs.includes('symbolic_script'))) {
          const memorial = erectMemorialStela(e, tribe, world);
          if (memorial) structures.push(memorial);
        }

        this.emitEvent({
          id: _liveEventIdCounter++,
          tick: world.currentTick,
          category: 'death',
          title: 'Trascendencia de un ser',
          description: `${e.name} (${e.speciesName}) partió a los ${e.ageTicks} ciclos por ${cause}.`,
          biome: e.currentBiome,
          x: e.x,
          y: e.y,
          entityIds: [e.id],
          important: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Gestation & Births with Genetic Speciation Check
    for (let i = 0; i < living.length; i++) {
      const e = living[i];
      if (!e.isAlive) continue;

      if (e.gestationTicks > 0) {
        e.gestationTicks--;
        if (e.gestationTicks === 0) {
          // Give birth!
          const parentA = e;
          const parentB = this.state.entities.find(o => o.id === e.parentBId) || parentA;
          const biomeObj = BIOMES.find(b => b.id === parentA.currentBiome) || BIOMES[0];

          const childGenome = crossoverAndMutate(
            parentA.genome,
            parentB.genome,
            biomeObj.mutationBoost
          );
          const morphology = deriveMorphology(childGenome, parentA.morphology.bodyHue);
          const speciesInfo = deriveSpeciesInfo(childGenome);

          // Speciation detection!
          const isNewSpecies =
            speciesInfo.speciesId !== parentA.speciesId &&
            speciesInfo.speciesId !== parentB.speciesId;
          if (isNewSpecies) {
            world.totalSpeciations++;
            this.emitEvent({
              id: _liveEventIdCounter++,
              tick: world.currentTick,
              category: 'speciation',
              title: `¡Especiación: ${speciesInfo.speciesName}!`,
              description: `Una nueva especie ha surgido por mutación y selección en ${biomeObj.nameEs}: ${speciesInfo.speciesName}.`,
              biome: parentA.currentBiome,
              x: parentA.x,
              y: parentA.y,
              important: true,
              timestamp: new Date().toISOString(),
            });
          }

          const childId = _entityIdCounter++;
          const childName = generateEntityName(childId);
          const child: Entity = {
            id: childId,
            name: childName,
            speciesId: speciesInfo.speciesId,
            speciesName: speciesInfo.speciesName,
            tribeId: parentA.tribeId,
            generation: Math.max(parentA.generation, parentB.generation) + 1,
            ageTicks: 0,
            maxAgeTicks: 200 + Math.round(childGenome.survivalDrive * 80),
            lifeStage: 'larva',

            x: Math.round(parentA.x + (Math.random() - 0.5) * 30),
            y: Math.round(parentA.y + (Math.random() - 0.5) * 30),
            vx: 0,
            vy: 0,
            heading: parentA.heading,
            targetX: null,
            targetY: null,
            currentBiome: parentA.currentBiome,
            activity: 'resting',

            energy: 90,
            hydration: 90,
            health: 100,
            warmth: 85,
            stamina: 90,
            intelligence: 0.15,

            genome: childGenome,
            morphology,
            emotionalState: { emotion: 'wonder', intensity: 0.8 },
            inventory: { food: 2, water: 2, wood: 0, stone: 0, crystal: 0, herbs: 0 },

            isAlive: true,
            reproductionCooldown: 50,
            gestationTicks: 0,
            parentAId: parentA.id,
            parentBId: parentB.id,
            childrenIds: [],
            bornAtTick: world.currentTick,
            bornAtIso: new Date().toISOString(),
            diedAtTick: null,

            lastThought: 'Abro los ojos a este mundo inmenso.',
            speechBubble: '...',
            speechTimerMs: 2500,
            currentDesire: 'Permanecer cerca de mis protectores.',
            currentGoal: 'resting',
            existentialStatement: 'La vida apenas comienza.',
            memories: [`Nací en ${biomeObj.nameEs} hijo de ${parentA.name} y ${parentB.name}.`],
            memoryArchive: [],
            beliefs: {},
            relationships: {
              [parentA.id]: {
                targetId: parentA.id,
                name: parentA.name,
                valence: 'kin',
                affinity: 0.9,
                encounters: 1,
                lastTick: world.currentTick,
                keyMemory: 'Me dio la vida.',
              },
            },
            finalMessage: null,
          };

          child.intelligence = computeIntelligence(child, 0, false);

          parentA.childrenIds.push(child.id);
          parentB.childrenIds.push(child.id);
          parentA.reproductionCooldown = 35;
          parentB.reproductionCooldown = 35;

          this.state.entities.push(child);
          world.totalBirths++;

          this.emitEvent({
            id: _liveEventIdCounter++,
            tick: world.currentTick,
            category: 'birth',
            title: `Nacimiento de ${child.name}`,
            description: `${parentA.name} y ${parentB.name} dieron a luz a ${child.name} (${child.speciesName}) en ${biomeObj.nameEs}.`,
            biome: parentA.currentBiome,
            x: child.x,
            y: child.y,
            entityIds: [child.id, parentA.id, parentB.id],
            important: isNewSpecies,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 3. Mating Courting Matches
    const eligibleLiving = this.state.entities.filter(
      e =>
        e.isAlive &&
        e.lifeStage === 'adult' &&
        e.reproductionCooldown <= 0 &&
        e.gestationTicks === 0 &&
        e.energy > 68 &&
        e.hydration > 68
    );

    for (let i = 0; i < eligibleLiving.length; i++) {
      const eA = eligibleLiving[i];
      if (eA.reproductionCooldown > 0 || eA.gestationTicks > 0) continue;

      for (let j = i + 1; j < eligibleLiving.length; j++) {
        const eB = eligibleLiving[j];
        if (eB.reproductionCooldown > 0 || eB.gestationTicks > 0) continue;

        const dist = Math.hypot(eA.x - eB.x, eA.y - eB.y);
        if (dist < 65) {
          // Initiate pregnancy
          eA.gestationTicks = 5;
          eA.parentBId = eB.id;
          eA.reproductionCooldown = 40;
          eB.reproductionCooldown = 40;

          eA.speechBubble = generateSpeech(eA, eB, 'romance');
          eA.speechTimerMs = 3500;
          eB.speechBubble = generateSpeech(eB, eA, 'romance');
          eB.speechTimerMs = 3500;

          this.emitEvent({
            id: _liveEventIdCounter++,
            tick: world.currentTick,
            category: 'romance',
            title: 'Cortejo Fértil',
            description: `${eA.name} y ${eB.name} iniciaron el ciclo de procreación.`,
            biome: eA.currentBiome,
            x: eA.x,
            y: eA.y,
            entityIds: [eA.id, eB.id],
            important: false,
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }
    }

    // 4. Social Encounters, Dialogue & Memory Consolidation
    for (let i = 0; i < living.length; i++) {
      const eA = living[i];
      if (!eA.isAlive) continue;

      for (let j = i + 1; j < living.length; j++) {
        const eB = living[j];
        if (!eB.isAlive) continue;

        const dist = Math.hypot(eA.x - eB.x, eA.y - eB.y);
        if (dist < 110) {
          // Record or reinforce relationship
          const relKeyA = eB.id.toString();
          if (!eA.relationships[relKeyA]) {
            eA.relationships[relKeyA] = {
              targetId: eB.id,
              name: eB.name,
              valence: eA.tribeId === eB.tribeId && eA.tribeId !== null ? 'kin' : 'friend',
              affinity: 0.5,
              encounters: 1,
              lastTick: world.currentTick,
              keyMemory: `Nos conocimos en ${eA.currentBiome}.`,
            };
          } else {
            eA.relationships[relKeyA].encounters++;
            eA.relationships[relKeyA].lastTick = world.currentTick;
          }

          // Spoken dialogue utterance
          if (eA.speechTimerMs <= 0 && Math.random() < 0.35) {
            const tribe = tribes.find(t => t.id === eA.tribeId) || null;
            if (eA.lifeStage === 'elder' && eB.lifeStage !== 'elder') {
              eA.speechBubble = generateSpeech(eA, eB, 'teaching', tribe);
              eB.intelligence = Math.min(1.0, eB.intelligence + 0.015);
            } else {
              eA.speechBubble = generateSpeech(eA, eB, 'greeting', tribe);
            }
            eA.speechTimerMs = 3800;
          }
        }
      }

      // Consolidate memories if growing large
      if (eA.memories.length > 15) {
        eA.memories = consolidateMemories(eA.memories, 10);
      }
    }

    // 5. Cognition & Internal Thought Logging
    for (let i = 0; i < living.length; i++) {
      const e = living[i];
      if (!e.isAlive) continue;

      // Generate a new thought every ~3 ticks per entity
      if (world.currentTick % 3 === (e.id % 3)) {
        const thoughtObj = generateThought(e, world, living, structures);
        e.lastThought = thoughtObj.thought;
        e.currentDesire = thoughtObj.desire;
        e.emotionalState = {
          emotion: thoughtObj.emotion,
          intensity: thoughtObj.intensity,
        };

        if (!this.state.logs[e.id]) {
          this.state.logs[e.id] = [];
        }
        this.state.logs[e.id].unshift({
          id: Date.now() + Math.random(),
          entityId: e.id,
          tick: world.currentTick,
          thought: thoughtObj.thought,
          action: e.activity,
          emotion: thoughtObj.emotion,
          emotionIntensity: thoughtObj.intensity,
          timestamp: new Date().toISOString(),
        });
        if (this.state.logs[e.id].length > 25) {
          this.state.logs[e.id].length = 25;
        }

        // Optional async Anthropic Claude enrichment
        if (this.settings.anthropicApiKey && Math.random() < 0.20) {
          enrichThoughtWithClaude(this.settings.anthropicApiKey, e, world, thoughtObj.thought).then(
            enriched => {
              if (enriched !== thoughtObj.thought) {
                e.lastThought = enriched;
              }
            }
          );
        }
      }
    }

    // 6. Society, Tribes, Technologies & Autonomous Structures
    const tribeFormation = checkTribeFormation(this.state.entities, tribes, world);
    for (const nt of tribeFormation.newTribes) {
      this.state.tribes.push(nt);
    }
    for (const ev of tribeFormation.liveEvents) {
      this.emitEvent(ev);
    }

    const techDiscovery = checkTechnologicalDiscovery(this.state.tribes, this.state.entities, world);
    for (const ev of techDiscovery.liveEvents) {
      this.emitEvent(ev);
    }

    const buildingResult = checkAutonomousBuilding(
      this.state.entities,
      this.state.tribes,
      this.state.structures,
      world
    );
    for (const ns of buildingResult.newStructures) {
      this.state.structures.push(ns);
    }
    for (const ev of buildingResult.liveEvents) {
      this.emitEvent(ev);
    }

    // 7. Ecology & Resources Regrow
    updateResources(resources, world.season, world.weather, 3.5);

    // 8. Farm harvest yields into granaries
    for (const st of structures) {
      if (st.kind === 'farm' && Math.random() < 0.35) {
        const granary = structures.find(
          s => s.kind === 'granary' && s.tribeId === st.tribeId
        );
        if (granary && granary.storedFood < 200) {
          granary.storedFood += 15;
        }
      }
    }

    // 9. World History Snapshot
    if (world.currentTick % 5 === 0) {
      const activeLiving = this.state.entities.filter(e => e.isAlive);
      const uniqueSpecies = new Set(activeLiving.map(e => e.speciesId)).size;
      const avgEnergy = activeLiving.length
        ? activeLiving.reduce((s, e) => s + e.energy, 0) / activeLiving.length
        : 0;
      const avgIntel = activeLiving.length
        ? activeLiving.reduce((s, e) => s + e.intelligence, 0) / activeLiving.length
        : 0;

      const avgGenome: any = {};
      if (activeLiving.length > 0) {
        const keys: (keyof Genome)[] = [
          'curiosity', 'empathy', 'aggression', 'creativity', 'survivalDrive',
          'sociability', 'speedGene', 'sizeGene', 'senseGene', 'bioluminescence',
        ];
        for (const k of keys) {
          avgGenome[k] =
            activeLiving.reduce((s, e) => s + e.genome[k], 0) / activeLiving.length;
        }
      }

      const snapshot: GenerationSnapshot = {
        tick: world.currentTick,
        population: activeLiving.length,
        speciesCount: uniqueSpecies,
        avgEnergy: Number(avgEnergy.toFixed(1)),
        avgIntelligence: Number(avgIntel.toFixed(2)),
        avgGenome,
      };

      world.historySnapshots.push(snapshot);
      if (world.historySnapshots.length > 80) {
        world.historySnapshots.shift();
      }
    }

    // 10. Clean entity registry: keep all living + up to 40 most recent deceased ancestors
    const livingSet = this.state.entities.filter(e => e.isAlive);
    const deceasedSet = this.state.entities
      .filter(e => !e.isAlive)
      .sort((a, b) => (b.diedAtTick || 0) - (a.diedAtTick || 0))
      .slice(0, 40);

    this.state.entities = [...livingSet, ...deceasedSet];

    // Autosave periodically
    if (world.currentTick % 20 === 0) {
      await persistSimState(this.state);
    }
  }

  // ─── DIVINE POWERS & INTERVENTIONS ────────────────────────────────────────

  public applyDivinePower(
    power: Exclude<DivinePowerId, 'observe'>,
    worldX: number,
    worldY: number
  ): LiveEvent | null {
    const x = Math.max(50, Math.min(WORLD_WIDTH - 50, worldX));
    const y = Math.max(50, Math.min(WORLD_HEIGHT - 50, worldY));
    const biome = getBiomeAt(x, y);
    const now = Date.now();
    const radius = 240;

    // Visual divine effect ripple
    this.state.divineEffects.push({
      id: now + Math.random(),
      power,
      x,
      y,
      radius,
      createdAtMs: now,
      durationMs: 2800,
    });

    let event: LiveEvent | null = null;
    const living = this.state.entities.filter(e => e.isAlive);

    switch (power) {
      case 'nourish': {
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.energy = Math.min(100, e.energy + 45);
            e.hydration = Math.min(100, e.hydration + 40);
            e.emotionalState = { emotion: 'joy', intensity: 0.95 };
            e.speechBubble = '¡Lluvia de maná divino!';
            e.speechTimerMs = 3500;
          }
        }
        for (const res of this.state.resources) {
          if (Math.hypot(res.x - x, res.y - y) <= radius) {
            res.amount = res.maxAmount;
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Lluvia de Maná Dorado',
          description: `Una bendición celeste colmó de sustento y vigor a las criaturas de ${biome}.`,
          biome,
          x,
          y,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'rain': {
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.hydration = 100;
            e.speechBubble = '¡El agua sagrada calma mi sed!';
            e.speechTimerMs = 3000;
          }
        }
        for (const res of this.state.resources) {
          if (res.kind === 'water_spring' && Math.hypot(res.x - x, res.y - y) <= radius) {
            res.amount = res.maxAmount;
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Tormenta Fértil',
          description: `Un aguacero vivificante refrescó los manantiales y colmó la sed en ${biome}.`,
          biome,
          x,
          y,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'solar_blessing': {
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.warmth = 100;
            e.health = Math.min(100, e.health + 45);
            e.emotionalState = { emotion: 'hope', intensity: 0.9 };
            e.speechBubble = '¡Siento el calor primordial!';
            e.speechTimerMs = 3000;
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Bendición Solar',
          description: `Un resplandor ardiente disipó el frío y sanó los cuerpos heridos en ${biome}.`,
          biome,
          x,
          y,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'mutagen': {
        const mutatedIds: number[] = [];
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.genome = crossoverAndMutate(e.genome, e.genome, 2.6);
            e.morphology = deriveMorphology(e.genome, e.morphology.bodyHue);
            const newSpecies = deriveSpeciesInfo(e.genome);
            if (newSpecies.speciesId !== e.speciesId) {
              e.speciesId = newSpecies.speciesId;
              e.speciesName = newSpecies.speciesName;
              this.state.world.totalSpeciations++;
            }
            e.emotionalState = { emotion: 'transcendence', intensity: 1.0 };
            e.speechBubble = '¡Mi ser se transforma!';
            e.speechTimerMs = 3500;
            mutatedIds.push(e.id);
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Rayo Cósmico Evolutivo',
          description: `Ondas mutágenas alteraron el código genético de ${mutatedIds.length} seres en ${biome}.`,
          biome,
          x,
          y,
          entityIds: mutatedIds,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'monolith': {
        const monolithStruct: Structure = {
          id: Date.now(),
          kind: 'monolith',
          biome,
          x,
          y,
          tribeId: null,
          builderId: null,
          builderName: 'La Presencia',
          hp: 600,
          maxHp: 600,
          storedFood: 0,
          auraRadius: 280,
          inscription: 'ERIGIDO POR EL OBSERVADOR: "LA CONCIENCIA ES LA FLOR DEL UNIVERSO"',
          createdTick: this.state.world.currentTick,
        };
        this.state.structures.push(monolithStruct);
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.intelligence = Math.min(1.0, e.intelligence + 0.22);
            e.emotionalState = { emotion: 'transcendence', intensity: 1.0 };
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Monolito Ancestral Erguido',
          description: `Un monolito resonante descendió en ${biome}, irradiando sabiduría arcana.`,
          biome,
          x,
          y,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'spawn_life': {
        const newGenome = crossoverAndMutate(SEED_ARCHETYPES[0].genome, SEED_ARCHETYPES[1].genome, 1.8);
        const morphology = deriveMorphology(newGenome);
        const species = deriveSpeciesInfo(newGenome);
        const childId = _entityIdCounter++;
        const childName = generateEntityName(childId);

        const newCreature: Entity = {
          id: childId,
          name: childName,
          speciesId: species.speciesId,
          speciesName: species.speciesName,
          tribeId: null,
          generation: 1,
          ageTicks: 10,
          maxAgeTicks: 230,
          lifeStage: 'juvenile',

          x,
          y,
          vx: 0,
          vy: 0,
          heading: Math.random() * Math.PI * 2,
          targetX: null,
          targetY: null,
          currentBiome: biome,
          activity: 'wandering',

          energy: 95,
          hydration: 95,
          health: 100,
          warmth: 90,
          stamina: 100,
          intelligence: 0.30,

          genome: newGenome,
          morphology,
          emotionalState: { emotion: 'wonder', intensity: 0.9 },
          inventory: { food: 5, water: 5, wood: 0, stone: 0, crystal: 0, herbs: 0 },

          isAlive: true,
          reproductionCooldown: 25,
          gestationTicks: 0,
          parentAId: null,
          parentBId: null,
          childrenIds: [],
          bornAtTick: this.state.world.currentTick,
          bornAtIso: new Date().toISOString(),
          diedAtTick: null,

          lastThought: 'Una chispa divina me dio forma en la tierra.',
          speechBubble: '¡Existo!',
          speechTimerMs: 3000,
          currentDesire: 'Conocer este mundo nuevo.',
          currentGoal: 'wandering',
          existentialStatement: 'Nací del aliento divino.',
          memories: [`Fui engendrado por la chispa divina en ${biome}.`],
          memoryArchive: [],
          beliefs: {},
          relationships: {},
          finalMessage: null,
        };

        this.state.entities.push(newCreature);
        this.state.world.totalBirths++;

        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Chispa de Génesis',
          description: `Una nueva criatura, ${childName} (${species.speciesName}), nació del poder creador en ${biome}.`,
          biome,
          x,
          y,
          entityIds: [childId],
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'lightning': {
        for (const e of living) {
          if (Math.hypot(e.x - x, e.y - y) <= radius) {
            e.health -= 45;
            e.emotionalState = { emotion: 'fear', intensity: 1.0 };
            e.speechBubble = '¡El cielo se quiebra!';
            e.speechTimerMs = 3000;
          }
        }
        for (const pred of this.state.predators) {
          if (Math.hypot(pred.x - x, pred.y - y) <= radius) {
            pred.hp -= 65;
            pred.state = 'repelled';
          }
        }
        event = {
          id: _liveEventIdCounter++,
          tick: this.state.world.currentTick,
          category: 'divine_intervention',
          title: 'Rayo Cataclísmico',
          description: `Un trueno sobrecogedor estremeció ${biome}, castigando la tierra con fuego celeste.`,
          biome,
          x,
          y,
          important: true,
          timestamp: new Date().toISOString(),
        };
        break;
      }
    }

    if (event) {
      this.emitEvent(event);
    }
    this.notifySubscribers();
    return event;
  }

  // ─── DIRECT PLAYER ENTITY INTERACTIONS ────────────────────────────────────

  public feedEntity(entityId: number): void {
    const e = this.state.entities.find(ent => ent.id === entityId && ent.isAlive);
    if (!e) return;
    e.energy = Math.min(100, e.energy + 40);
    e.speechBubble = '¡Qué manjar tan dulce!';
    e.speechTimerMs = 3000;
    this.notifySubscribers();
  }

  public healEntity(entityId: number): void {
    const e = this.state.entities.find(ent => ent.id === entityId && ent.isAlive);
    if (!e) return;
    e.health = Math.min(100, e.health + 40);
    e.speechBubble = 'Mis heridas sanan milagrosamente.';
    e.speechTimerMs = 3000;
    this.notifySubscribers();
  }

  public blessEntity(entityId: number): void {
    const e = this.state.entities.find(ent => ent.id === entityId && ent.isAlive);
    if (!e) return;
    e.stamina = 100;
    e.intelligence = Math.min(1.0, e.intelligence + 0.12);
    e.emotionalState = { emotion: 'transcendence', intensity: 1.0 };
    e.speechBubble = 'Una luz infinita inunda mi mente.';
    e.speechTimerMs = 3500;
    this.notifySubscribers();
  }

  public inspectLineage(entityId: number): {
    entity: Entity | null;
    parents: Entity[];
    children: Entity[];
    ancestors: Entity[];
  } {
    const entity = this.state.entities.find(e => e.id === entityId) || null;
    if (!entity) {
      return { entity: null, parents: [], children: [], ancestors: [] };
    }

    const all = this.state.entities;
    const parents = all.filter(e => e.id === entity.parentAId || e.id === entity.parentBId);
    const children = all.filter(e => e.parentAId === entity.id || e.parentBId === entity.id);

    const ancestors: Entity[] = [];
    const queue = [...parents];
    const visited = new Set<number>([entity.id]);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);
      ancestors.push(cur);

      const pA = all.find(e => e.id === cur.parentAId);
      const pB = all.find(e => e.id === cur.parentBId);
      if (pA && !visited.has(pA.id)) queue.push(pA);
      if (pB && !visited.has(pB.id)) queue.push(pB);
    }

    return { entity, parents, children, ancestors };
  }

  public getCatchUpSummary(): CatchUpSummary | null {
    return this.catchUpSummary;
  }

  public clearCatchUpSummary(): void {
    this.catchUpSummary = null;
  }

  public getSettings(): SimSettings {
    return { ...this.settings };
  }

  public async updateSettings(partial: Partial<SimSettings>): Promise<void> {
    this.settings = { ...this.settings, ...partial };
    await persistSimSettings(this.settings);
  }

  public async saveNow(): Promise<void> {
    await persistSimState(this.state);
  }
}

export const simulation = new Simulation();
