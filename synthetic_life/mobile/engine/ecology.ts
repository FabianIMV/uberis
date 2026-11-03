/**
 * UBERIS v2.0 — Ecology, Resources & Shadow Predators
 *
 * Spawns and manages ~65 organic resource nodes across the 6 biomes,
 * dynamic seasonal regrow algorithms, and autonomous Umbra shadow predators
 * that stalk prey, respect territorial light/watchtower auras, and clash with defenders.
 */

import {
  BiomeId,
  Entity,
  LiveEvent,
  Predator,
  ResourceKind,
  Season,
  Structure,
  WeatherType,
  WorldResource,
  WorldState,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './types';
import { BIOMES, BIOME_MAP, getBiomeAt } from './biomes';

let _resourceIdCounter = 1;
let _predatorIdCounter = 1;

interface ResourceBlueprint {
  kind: ResourceKind;
  biome: BiomeId;
  offsetX: number;
  offsetY: number;
  maxAmount: number;
  regrowRate: number;
  radius: number;
}

/**
 * Procedural distribution layout placing ~65 resources organically across the 6 biomes.
 */
const BLUEPRINTS: ResourceBlueprint[] = [
  // ── EDEN (~15 nodes) ──
  { kind: 'nectar_tree', biome: 'eden', offsetX: -160, offsetY: -120, maxAmount: 140, regrowRate: 1.8, radius: 36 },
  { kind: 'nectar_tree', biome: 'eden', offsetX: 120, offsetY: -140, maxAmount: 140, regrowRate: 1.8, radius: 36 },
  { kind: 'nectar_tree', biome: 'eden', offsetX: -80, offsetY: 130, maxAmount: 140, regrowRate: 1.8, radius: 36 },
  { kind: 'nectar_tree', biome: 'eden', offsetX: 150, offsetY: 120, maxAmount: 140, regrowRate: 1.8, radius: 36 },
  { kind: 'berry_bush', biome: 'eden', offsetX: -220, offsetY: 40, maxAmount: 90, regrowRate: 2.6, radius: 24 },
  { kind: 'berry_bush', biome: 'eden', offsetX: 60, offsetY: -60, maxAmount: 90, regrowRate: 2.6, radius: 24 },
  { kind: 'berry_bush', biome: 'eden', offsetX: 200, offsetY: 20, maxAmount: 90, regrowRate: 2.6, radius: 24 },
  { kind: 'water_spring', biome: 'eden', offsetX: -20, offsetY: -10, maxAmount: 200, regrowRate: 3.2, radius: 42 },
  { kind: 'water_spring', biome: 'eden', offsetX: -140, offsetY: 180, maxAmount: 180, regrowRate: 3.0, radius: 38 },
  { kind: 'timber_grove', biome: 'eden', offsetX: 220, offsetY: -180, maxAmount: 160, regrowRate: 1.2, radius: 40 },
  { kind: 'timber_grove', biome: 'eden', offsetX: -260, offsetY: -80, maxAmount: 160, regrowRate: 1.2, radius: 40 },
  { kind: 'healing_herb', biome: 'eden', offsetX: -70, offsetY: -90, maxAmount: 60, regrowRate: 1.5, radius: 20 },
  { kind: 'healing_herb', biome: 'eden', offsetX: 80, offsetY: 170, maxAmount: 60, regrowRate: 1.5, radius: 20 },
  { kind: 'stone_outcrop', biome: 'eden', offsetX: 250, offsetY: 190, maxAmount: 120, regrowRate: 0.6, radius: 32 },
  { kind: 'crystal_node', biome: 'eden', offsetX: 30, offsetY: 220, maxAmount: 80, regrowRate: 0.4, radius: 28 },

  // ── LAGOON (~13 nodes) ──
  { kind: 'water_spring', biome: 'lagoon', offsetX: -120, offsetY: -80, maxAmount: 220, regrowRate: 3.5, radius: 44 },
  { kind: 'water_spring', biome: 'lagoon', offsetX: 110, offsetY: -60, maxAmount: 220, regrowRate: 3.5, radius: 44 },
  { kind: 'water_spring', biome: 'lagoon', offsetX: 0, offsetY: 90, maxAmount: 240, regrowRate: 3.8, radius: 48 },
  { kind: 'berry_bush', biome: 'lagoon', offsetX: -180, offsetY: 120, maxAmount: 80, regrowRate: 2.2, radius: 24 },
  { kind: 'berry_bush', biome: 'lagoon', offsetX: 170, offsetY: 80, maxAmount: 80, regrowRate: 2.2, radius: 24 },
  { kind: 'healing_herb', biome: 'lagoon', offsetX: -90, offsetY: 150, maxAmount: 70, regrowRate: 1.6, radius: 22 },
  { kind: 'healing_herb', biome: 'lagoon', offsetX: 120, offsetY: 160, maxAmount: 70, regrowRate: 1.6, radius: 22 },
  { kind: 'star_spore', biome: 'lagoon', offsetX: -30, offsetY: -160, maxAmount: 50, regrowRate: 0.8, radius: 22 },
  { kind: 'star_spore', biome: 'lagoon', offsetX: 70, offsetY: -140, maxAmount: 50, regrowRate: 0.8, radius: 22 },
  { kind: 'timber_grove', biome: 'lagoon', offsetX: -220, offsetY: -140, maxAmount: 130, regrowRate: 1.0, radius: 38 },
  { kind: 'stone_outcrop', biome: 'lagoon', offsetX: 200, offsetY: -120, maxAmount: 110, regrowRate: 0.5, radius: 30 },
  { kind: 'nectar_tree', biome: 'lagoon', offsetX: -150, offsetY: 30, maxAmount: 100, regrowRate: 1.4, radius: 32 },
  { kind: 'crystal_node', biome: 'lagoon', offsetX: 140, offsetY: -10, maxAmount: 75, regrowRate: 0.45, radius: 26 },

  // ── STEPPE (~14 nodes) ──
  { kind: 'timber_grove', biome: 'steppe', offsetX: -200, offsetY: -120, maxAmount: 190, regrowRate: 1.4, radius: 42 },
  { kind: 'timber_grove', biome: 'steppe', offsetX: 180, offsetY: -140, maxAmount: 190, regrowRate: 1.4, radius: 42 },
  { kind: 'timber_grove', biome: 'steppe', offsetX: -140, offsetY: 160, maxAmount: 180, regrowRate: 1.4, radius: 42 },
  { kind: 'timber_grove', biome: 'steppe', offsetX: 160, offsetY: 150, maxAmount: 180, regrowRate: 1.4, radius: 42 },
  { kind: 'stone_outcrop', biome: 'steppe', offsetX: -240, offsetY: 20, maxAmount: 150, regrowRate: 0.6, radius: 35 },
  { kind: 'stone_outcrop', biome: 'steppe', offsetX: 230, offsetY: 10, maxAmount: 150, regrowRate: 0.6, radius: 35 },
  { kind: 'stone_outcrop', biome: 'steppe', offsetX: 0, offsetY: -190, maxAmount: 160, regrowRate: 0.6, radius: 36 },
  { kind: 'berry_bush', biome: 'steppe', offsetX: -80, offsetY: -70, maxAmount: 85, regrowRate: 2.1, radius: 24 },
  { kind: 'berry_bush', biome: 'steppe', offsetX: 90, offsetY: -50, maxAmount: 85, regrowRate: 2.1, radius: 24 },
  { kind: 'water_spring', biome: 'steppe', offsetX: 20, offsetY: 30, maxAmount: 170, regrowRate: 2.8, radius: 38 },
  { kind: 'water_spring', biome: 'steppe', offsetX: -70, offsetY: 120, maxAmount: 150, regrowRate: 2.6, radius: 36 },
  { kind: 'nectar_tree', biome: 'steppe', offsetX: 90, offsetY: 90, maxAmount: 120, regrowRate: 1.5, radius: 34 },
  { kind: 'healing_herb', biome: 'steppe', offsetX: -170, offsetY: -60, maxAmount: 55, regrowRate: 1.3, radius: 20 },
  { kind: 'crystal_node', biome: 'steppe', offsetX: 220, offsetY: 90, maxAmount: 70, regrowRate: 0.4, radius: 26 },

  // ── ARCHIVE (~10 nodes) ──
  { kind: 'crystal_node', biome: 'archive', offsetX: -140, offsetY: -90, maxAmount: 120, regrowRate: 0.7, radius: 32 },
  { kind: 'crystal_node', biome: 'archive', offsetX: 130, offsetY: -100, maxAmount: 120, regrowRate: 0.7, radius: 32 },
  { kind: 'crystal_node', biome: 'archive', offsetX: 0, offsetY: 0, maxAmount: 160, regrowRate: 0.9, radius: 38 },
  { kind: 'crystal_node', biome: 'archive', offsetX: -80, offsetY: 140, maxAmount: 110, regrowRate: 0.6, radius: 30 },
  { kind: 'stone_outcrop', biome: 'archive', offsetX: -200, offsetY: 40, maxAmount: 160, regrowRate: 0.5, radius: 35 },
  { kind: 'stone_outcrop', biome: 'archive', offsetX: 180, offsetY: 50, maxAmount: 160, regrowRate: 0.5, radius: 35 },
  { kind: 'star_spore', biome: 'archive', offsetX: 80, offsetY: -150, maxAmount: 65, regrowRate: 0.9, radius: 24 },
  { kind: 'star_spore', biome: 'archive', offsetX: -60, offsetY: -160, maxAmount: 65, regrowRate: 0.9, radius: 24 },
  { kind: 'timber_grove', biome: 'archive', offsetX: 150, offsetY: 150, maxAmount: 120, regrowRate: 0.9, radius: 34 },
  { kind: 'water_spring', biome: 'archive', offsetX: -30, offsetY: 80, maxAmount: 130, regrowRate: 2.2, radius: 32 },

  // ── ASHLANDS (~8 nodes) ──
  { kind: 'stone_outcrop', biome: 'ashlands', offsetX: -160, offsetY: -100, maxAmount: 180, regrowRate: 0.5, radius: 38 },
  { kind: 'stone_outcrop', biome: 'ashlands', offsetX: 150, offsetY: -80, maxAmount: 180, regrowRate: 0.5, radius: 38 },
  { kind: 'stone_outcrop', biome: 'ashlands', offsetX: 0, offsetY: 120, maxAmount: 200, regrowRate: 0.6, radius: 40 },
  { kind: 'crystal_node', biome: 'ashlands', offsetX: -110, offsetY: 60, maxAmount: 95, regrowRate: 0.5, radius: 28 },
  { kind: 'crystal_node', biome: 'ashlands', offsetX: 120, offsetY: 70, maxAmount: 95, regrowRate: 0.5, radius: 28 },
  { kind: 'healing_herb', biome: 'ashlands', offsetX: -60, offsetY: -140, maxAmount: 50, regrowRate: 1.1, radius: 20 },
  { kind: 'healing_herb', biome: 'ashlands', offsetX: 70, offsetY: -130, maxAmount: 50, regrowRate: 1.1, radius: 20 },
  { kind: 'timber_grove', biome: 'ashlands', offsetX: -180, offsetY: 130, maxAmount: 100, regrowRate: 0.7, radius: 32 },

  // ── ABYSS (~6 nodes) ──
  { kind: 'star_spore', biome: 'abyss', offsetX: -120, offsetY: -40, maxAmount: 90, regrowRate: 1.1, radius: 26 },
  { kind: 'star_spore', biome: 'abyss', offsetX: 110, offsetY: -30, maxAmount: 90, regrowRate: 1.1, radius: 26 },
  { kind: 'star_spore', biome: 'abyss', offsetX: 0, offsetY: 70, maxAmount: 120, regrowRate: 1.3, radius: 30 },
  { kind: 'crystal_node', biome: 'abyss', offsetX: -160, offsetY: 50, maxAmount: 90, regrowRate: 0.5, radius: 28 },
  { kind: 'crystal_node', biome: 'abyss', offsetX: 150, offsetY: 60, maxAmount: 90, regrowRate: 0.5, radius: 28 },
  { kind: 'stone_outcrop', biome: 'abyss', offsetX: 0, offsetY: -90, maxAmount: 130, regrowRate: 0.4, radius: 32 },
];

/**
 * Initializes world resources (~66 nodes across all biomes).
 */
export function createInitialResources(): WorldResource[] {
  const resources: WorldResource[] = [];
  const biomeCenters: Record<BiomeId, { x: number; y: number }> = {
    eden: { x: 620, y: 540 },
    lagoon: { x: 580, y: 1340 },
    steppe: { x: 1320, y: 1040 },
    archive: { x: 1860, y: 520 },
    ashlands: { x: 1920, y: 1360 },
    abyss: { x: 1260, y: 340 },
  };

  for (const bp of BLUEPRINTS) {
    const center = biomeCenters[bp.biome];
    const x = Math.max(60, Math.min(WORLD_WIDTH - 60, center.x + bp.offsetX));
    const y = Math.max(60, Math.min(WORLD_HEIGHT - 60, center.y + bp.offsetY));

    resources.push({
      id: _resourceIdCounter++,
      kind: bp.kind,
      biome: bp.biome,
      x,
      y,
      amount: bp.maxAmount,
      maxAmount: bp.maxAmount,
      regrowRate: bp.regrowRate,
      radius: bp.radius,
    });
  }

  return resources;
}

/**
 * Updates regenerative ecology: regrows nodes dynamically based on season and climate.
 */
export function updateResources(
  resources: WorldResource[],
  season: Season,
  weather: WeatherType,
  dtSeconds: number
): void {
  let seasonMult = 1.0;
  if (season === 'spring') seasonMult = 1.45;
  else if (season === 'summer') seasonMult = 1.0;
  else if (season === 'autumn') seasonMult = 0.8;
  else if (season === 'winter') seasonMult = 0.35;

  let weatherMult = 1.0;
  if (weather === 'rain') weatherMult = 1.35;
  else if (weather === 'storm') weatherMult = 1.15;
  else if (weather === 'heatwave') weatherMult = 0.50;

  const rateScale = seasonMult * weatherMult * dtSeconds;

  for (let i = 0; i < resources.length; i++) {
    const r = resources[i];
    if (r.amount < r.maxAmount) {
      r.amount = Math.min(r.maxAmount, r.amount + r.regrowRate * rateScale);
    }
  }
}

/**
 * Spawns 4 roaming Umbra shadow predators in their ancestral haunting territories.
 */
export function createInitialPredators(): Predator[] {
  return [
    {
      id: _predatorIdCounter++,
      name: 'Umbra Vorax I',
      x: 1850,
      y: 1250,
      vx: 0,
      vy: 0,
      heading: 0,
      hp: 120,
      maxHp: 120,
      hunger: 40,
      biome: 'ashlands',
      state: 'prowling',
      targetEntityId: null,
    },
    {
      id: _predatorIdCounter++,
      name: 'Umbra Noctis II',
      x: 1300,
      y: 380,
      vx: 0,
      vy: 0,
      heading: 0,
      hp: 110,
      maxHp: 110,
      hunger: 35,
      biome: 'abyss',
      state: 'prowling',
      targetEntityId: null,
    },
    {
      id: _predatorIdCounter++,
      name: 'Umbra Silens III',
      x: 1450,
      y: 900,
      vx: 0,
      vy: 0,
      heading: 0,
      hp: 115,
      maxHp: 115,
      hunger: 45,
      biome: 'steppe',
      state: 'prowling',
      targetEntityId: null,
    },
    {
      id: _predatorIdCounter++,
      name: 'Umbra Cineris IV',
      x: 1650,
      y: 1450,
      vx: 0,
      vy: 0,
      heading: 0,
      hp: 125,
      maxHp: 125,
      hunger: 30,
      biome: 'ashlands',
      state: 'prowling',
      targetEntityId: null,
    },
  ];
}

const PREDATOR_STRIKE_COOLDOWN_SEC = 2.4;
const PREDATOR_REPEL_COOLDOWN_SEC = 14;
const PREDATOR_RESPAWN_SEC = 240;
const PREDATOR_LAIRS: { x: number; y: number }[] = [
  { x: 1920, y: 1360 }, // Tierras de Ceniza
  { x: 1260, y: 340 }, // Velo Abisal
];

/**
 * Steers and updates Umbra shadow predators.
 * Stalks isolated creatures, flees campfire/watchtower defensive auras,
 * and clashes with vigilant defenders.
 */
export function updatePredators(
  predators: Predator[],
  entities: Entity[],
  structures: Structure[],
  dtSeconds: number,
  world: WorldState
): { liveEvents: LiveEvent[]; casualties: number[] } {
  const liveEvents: LiveEvent[] = [];
  const casualties: number[] = [];
  const isNight = world.dayPhase > 0.60;
  const livingEntities = entities.filter(e => e.isAlive);

  for (let i = 0; i < predators.length; i++) {
    const p = predators[i];

    // 0. Banishment & re-coalescence: a defeated Umbra dissolves and later returns from the shadow biomes
    if (p.state === 'banished') {
      p.vx = 0;
      p.vy = 0;
      p.respawnInSec = (p.respawnInSec ?? PREDATOR_RESPAWN_SEC) - dtSeconds;
      if (p.respawnInSec <= 0) {
        const lair = PREDATOR_LAIRS[Math.floor(Math.random() * PREDATOR_LAIRS.length)];
        p.x = lair.x + (Math.random() - 0.5) * 160;
        p.y = lair.y + (Math.random() - 0.5) * 160;
        p.hp = p.maxHp;
        p.hunger = 20;
        p.state = 'prowling';
        p.targetEntityId = null;
        p.cooldownSec = 8;
        p.respawnInSec = undefined;
        p.biome = getBiomeAt(p.x, p.y);
        liveEvents.push({
          id: Date.now() + Math.random(),
          tick: world.currentTick,
          category: 'predator',
          title: 'La sombra se recompone',
          description: `${p.name} volvió a tomar forma en las profundidades de ${BIOME_MAP[p.biome]?.nameEs ?? p.biome}.`,
          biome: p.biome,
          x: p.x,
          y: p.y,
          important: false,
          timestamp: new Date().toISOString(),
        });
      }
      continue;
    }

    if (p.hp <= 0) {
      p.hp = 0;
      p.state = 'banished';
      p.targetEntityId = null;
      p.respawnInSec = PREDATOR_RESPAWN_SEC;
      liveEvents.push({
        id: Date.now() + Math.random(),
        tick: world.currentTick,
        category: 'predator',
        title: 'Umbra disipada',
        description: `${p.name} se deshizo en humo negro. La región respira en paz por un tiempo.`,
        biome: p.biome,
        x: p.x,
        y: p.y,
        important: true,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (p.cooldownSec && p.cooldownSec > 0) {
      p.cooldownSec = Math.max(0, p.cooldownSec - dtSeconds);
    }
    const onCooldown = (p.cooldownSec ?? 0) > 0;

    // Gradually recover HP if resting, increase hunger
    p.hunger = Math.min(100, p.hunger + 0.35 * dtSeconds);
    if (p.hp < p.maxHp && p.state === 'resting') {
      p.hp = Math.min(p.maxHp, p.hp + 2 * dtSeconds);
    }

    // 1. Check defensive structure auras (campfire warmth / watchtowers repel predators)
    let repellingStructure: Structure | null = null;
    let repelDist = Number.MAX_VALUE;

    for (let s = 0; s < structures.length; s++) {
      const struct = structures[s];
      if (struct.kind === 'watchtower' || struct.kind === 'campfire') {
        const dx = p.x - struct.x;
        const dy = p.y - struct.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const aura = struct.kind === 'watchtower' ? 320 : 180;
        if (d < aura && d < repelDist) {
          repelDist = d;
          repellingStructure = struct;
        }
      }
    }

    if (repellingStructure) {
      p.state = 'repelled';
      p.targetEntityId = null;
      // Flee rapidly away from structure
      const fDx = p.x - repellingStructure.x;
      const fDy = p.y - repellingStructure.y;
      const fLen = Math.sqrt(fDx * fDx + fDy * fDy) || 1;
      const repelSpeed = 75;
      p.vx = (fDx / fLen) * repelSpeed;
      p.vy = (fDy / fLen) * repelSpeed;
    } else {
      // 2. Target selection: stalk vulnerable, isolated beings especially at night or high hunger
      if (!onCooldown && p.hunger > 35 && (!p.targetEntityId || Math.random() < 0.05)) {
        let bestTarget: Entity | null = null;
        let minScore = Number.MAX_VALUE;
        const senseRadius = isNight ? 340 : 220;

        for (let e = 0; e < livingEntities.length; e++) {
          const ent = livingEntities[e];
          const dx = ent.x - p.x;
          const dy = ent.y - p.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < senseRadius) {
            // Count nearby allies to measure isolation
            let allyCount = 0;
            for (let o = 0; o < livingEntities.length; o++) {
              if (livingEntities[o].id !== ent.id) {
                const adx = livingEntities[o].x - ent.x;
                const ady = livingEntities[o].y - ent.y;
                if (adx * adx + ady * ady < 120 * 120) allyCount++;
              }
            }

            // High preference for isolated, wounded, or young prey
            const isolationScore = d + allyCount * 180 - (100 - ent.health);
            if (isolationScore < minScore) {
              minScore = isolationScore;
              bestTarget = ent;
            }
          }
        }

        if (bestTarget) {
          p.targetEntityId = bestTarget.id;
          p.state = 'stalking';
        } else {
          p.state = 'prowling';
          p.targetEntityId = null;
        }
      }

      // 3. Movement kinematics
      if (p.state === 'stalking' && p.targetEntityId !== null) {
        const target = livingEntities.find(e => e.id === p.targetEntityId);
        if (!target) {
          p.state = 'prowling';
          p.targetEntityId = null;
        } else {
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 380) {
            // Lost sight
            p.state = 'prowling';
            p.targetEntityId = null;
          } else if (dist < 26 && !onCooldown) {
            // 4. Attack encounter!
            // Check if target or nearby allies can fend off predator
            const defenderAllies = livingEntities.filter(
              e => e.id !== target.id && Math.hypot(e.x - target.x, e.y - target.y) < 130
            );
            const totalAggression =
              target.genome.aggression +
              defenderAllies.reduce((sum, a) => sum + a.genome.aggression, 0);

            if (totalAggression >= 1.25 || (target.genome.aggression > 0.70 && target.lifeStage === 'adult')) {
              // Defenders successfully fend off predator!
              p.hp -= 35;
              p.state = 'repelled';
              p.targetEntityId = null;
              p.vx = -p.vx * 1.5;
              p.vy = -p.vy * 1.5;
              p.cooldownSec = PREDATOR_REPEL_COOLDOWN_SEC;
              target.health = Math.max(15, target.health - 12);
              target.speechBubble = '¡Atrás, bestia sombría!';
              target.speechTimerMs = 3500;

              liveEvents.push({
                id: Date.now() + Math.random(),
                tick: world.currentTick,
                category: 'conflict',
                title: 'Defensa heroica contra Umbra',
                description: `${target.name} y sus aliados repelieron con fiereza a ${p.name}.`,
                biome: p.biome,
                x: p.x,
                y: p.y,
                entityIds: [target.id, ...defenderAllies.map(a => a.id)],
                important: true,
                timestamp: new Date().toISOString(),
              });
            } else {
              // Predator strikes prey
              const damage = 35 + Math.random() * 20;
              target.health -= damage;
              p.cooldownSec = PREDATOR_STRIKE_COOLDOWN_SEC;
              // Recoil after the strike so the prey gets a chance to flee
              p.vx = -(dx / dist) * 40;
              p.vy = -(dy / dist) * 40;
              target.speechBubble = '¡Socorro! ¡La sombra me atrapa!';
              target.speechTimerMs = 3500;

              if (target.health <= 0) {
                target.isAlive = false;
                casualties.push(target.id);
                p.hunger = 0;
                p.state = 'resting';
                p.targetEntityId = null;

                liveEvents.push({
                  id: Date.now() + Math.random(),
                  tick: world.currentTick,
                  category: 'death',
                  title: 'Presa de la sombra',
                  description: `${target.name} sucumbió al acecho de ${p.name} en ${BIOME_MAP[p.biome]?.nameEs ?? p.biome}.`,
                  biome: p.biome,
                  x: p.x,
                  y: p.y,
                  entityIds: [target.id],
                  important: true,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          } else if (onCooldown) {
            // Circling at a distance while recovering from the last clash
            p.vx *= 0.98;
            p.vy *= 0.98;
          } else {
            // Chase target
            const stalkSpeed = isNight ? 68 : 50;
            p.vx = (dx / dist) * stalkSpeed;
            p.vy = (dy / dist) * stalkSpeed;
          }
        }
      } else {
        // Prowling wander
        if (Math.random() < 0.04) {
          const wanderAngle = Math.random() * Math.PI * 2;
          const wanderSpeed = 25;
          p.vx = Math.cos(wanderAngle) * wanderSpeed;
          p.vy = Math.sin(wanderAngle) * wanderSpeed;
        }
      }
    }

    // Integrate position & clamp to continent bounds
    p.x += p.vx * dtSeconds;
    p.y += p.vy * dtSeconds;

    if (p.x < 100) { p.x = 100; p.vx = Math.abs(p.vx); }
    if (p.x > WORLD_WIDTH - 100) { p.x = WORLD_WIDTH - 100; p.vx = -Math.abs(p.vx); }
    if (p.y < 100) { p.y = 100; p.vy = Math.abs(p.vy); }
    if (p.y > WORLD_HEIGHT - 100) { p.y = WORLD_HEIGHT - 100; p.vy = -Math.abs(p.vy); }

    if (p.vx !== 0 || p.vy !== 0) {
      p.heading = Math.atan2(p.vy, p.vx);
    }
    p.biome = getBiomeAt(p.x, p.y);
  }

  return { liveEvents, casualties };
}
