/**
 * UBERIS v2.0 — Society, Tribes, Technology & Autonomous Architecture
 *
 * Emergent tribal foundation, progressive technological discovery,
 * communal granaries, and autonomous architectural construction
 * utilizing entity inventory resources.
 */

import {
  BiomeId,
  Entity,
  LiveEvent,
  Structure,
  StructureKind,
  TechId,
  Tribe,
  WorldState,
} from './types';
import { getBiomeAt } from './biomes';
import { generateBelief, generateLexiconWord } from './cognition';

let _tribeIdCounter = 1;
let _structureIdCounter = 1;

export interface StructureRecipe {
  kind: StructureKind;
  requiredTech: TechId | null;
  woodCost: number;
  stoneCost: number;
  crystalCost: number;
  herbCost: number;
  maxHp: number;
  auraRadius: number;
}

export const RECIPES: Record<StructureKind, StructureRecipe> = {
  campfire: {
    kind: 'campfire',
    requiredTech: 'fire_mastery',
    woodCost: 15,
    stoneCost: 5,
    crystalCost: 0,
    herbCost: 0,
    maxHp: 150,
    auraRadius: 190,
  },
  shelter: {
    kind: 'shelter',
    requiredTech: 'shelter_craft',
    woodCost: 30,
    stoneCost: 12,
    crystalCost: 0,
    herbCost: 0,
    maxHp: 240,
    auraRadius: 150,
  },
  granary: {
    kind: 'granary',
    requiredTech: 'stone_masonry',
    woodCost: 25,
    stoneCost: 20,
    crystalCost: 0,
    herbCost: 0,
    maxHp: 280,
    auraRadius: 100,
  },
  farm: {
    kind: 'farm',
    requiredTech: 'agriculture',
    woodCost: 20,
    stoneCost: 5,
    crystalCost: 0,
    herbCost: 6,
    maxHp: 180,
    auraRadius: 120,
  },
  totem: {
    kind: 'totem',
    requiredTech: 'symbolic_script',
    woodCost: 20,
    stoneCost: 15,
    crystalCost: 5,
    herbCost: 0,
    maxHp: 220,
    auraRadius: 210,
  },
  watchtower: {
    kind: 'watchtower',
    requiredTech: 'stone_masonry',
    woodCost: 35,
    stoneCost: 25,
    crystalCost: 0,
    herbCost: 0,
    maxHp: 320,
    auraRadius: 320,
  },
  monolith: {
    kind: 'monolith',
    requiredTech: 'star_lore',
    woodCost: 10,
    stoneCost: 50,
    crystalCost: 30,
    herbCost: 0,
    maxHp: 500,
    auraRadius: 260,
  },
  memorial: {
    kind: 'memorial',
    requiredTech: 'symbolic_script',
    woodCost: 0,
    stoneCost: 20,
    crystalCost: 5,
    herbCost: 0,
    maxHp: 300,
    auraRadius: 140,
  },
};

const CLAN_NAMES = [
  'Clan de la Llama Viva',
  'Hermandad del Rocío',
  'Linaje de las Estrellas',
  'Vanguardia del Viento Áureo',
  'Custodios del Archivo',
  'Hijos de la Raíz Profunda',
  'Círculo de la Ceniza Serena',
  'Vigías del Mar Cristalino',
];

const CLAN_MOTTOS = [
  'En la unión, la lumbre nunca cesa.',
  'Caminamos bajo la luz primera de la tierra.',
  'Sabiduría antes del silencio de la noche.',
  'La fuerza del roble y la ternura del manantial.',
  'Ni el invierno ni la sombra apagarán nuestra voz.',
  'Construimos hoy el alero de los que aún no nacen.',
];

const CLAN_COLORS = [
  '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4',
  '#EF4444', '#EC4899', '#3B82F6', '#14B8A6',
];

/**
 * Checks for emergent tribe formation among unallied adults in close proximity.
 */
export function checkTribeFormation(
  entities: Entity[],
  existingTribes: Tribe[],
  world: WorldState
): { newTribes: Tribe[]; liveEvents: LiveEvent[] } {
  const newTribes: Tribe[] = [];
  const liveEvents: LiveEvent[] = [];

  const unassignedAdults = entities.filter(
    e => e.isAlive && e.tribeId === null && (e.lifeStage === 'adult' || e.lifeStage === 'elder')
  );

  if (unassignedAdults.length < 3) return { newTribes, liveEvents };

  // Spatial clustering
  for (let i = 0; i < unassignedAdults.length; i++) {
    const candidate = unassignedAdults[i];
    if (candidate.tribeId !== null) continue;

    const cluster: Entity[] = [candidate];
    for (let j = 0; j < unassignedAdults.length; j++) {
      if (i === j) continue;
      const other = unassignedAdults[j];
      if (other.tribeId !== null) continue;

      const dist = Math.hypot(candidate.x - other.x, candidate.y - other.y);
      if (dist < 220) {
        cluster.push(other);
      }
    }

    if (cluster.length >= 3) {
      // High enough sociability average
      const avgSociability =
        cluster.reduce((sum, e) => sum + e.genome.sociability, 0) / cluster.length;

      if (avgSociability >= 0.42) {
        const tribeId = _tribeIdCounter++;
        const nameIdx = (existingTribes.length + newTribes.length) % CLAN_NAMES.length;
        const mottoIdx = (existingTribes.length + newTribes.length) % CLAN_MOTTOS.length;
        const colorIdx = (existingTribes.length + newTribes.length) % CLAN_COLORS.length;

        // Centroid of founders
        const homeX = Math.round(cluster.reduce((s, e) => s + e.x, 0) / cluster.length);
        const homeY = Math.round(cluster.reduce((s, e) => s + e.y, 0) / cluster.length);
        const homeBiome = getBiomeAt(homeX, homeY);

        // Elect founder / leader (highest intelligence or age)
        const leader = cluster.reduce((best, cur) => (cur.intelligence > best.intelligence ? cur : best), cluster[0]);

        const initialBelief = generateBelief(homeBiome, null, leader.name);
        const initialWord = generateLexiconWord(CLAN_NAMES[nameIdx], 'Hogar y fuego');

        const newTribe: Tribe = {
          id: tribeId,
          name: CLAN_NAMES[nameIdx],
          motto: CLAN_MOTTOS[mottoIdx],
          color: CLAN_COLORS[colorIdx],
          founderId: leader.id,
          leaderId: leader.id,
          homeX,
          homeY,
          homeBiome,
          memberIds: cluster.map(e => e.id),
          unlockedTechs: [],
          sharedBeliefs: { [initialBelief.topic]: initialBelief.belief },
          lexicon: [initialWord],
          createdTick: world.currentTick,
        };

        // Assign tribe to entities
        for (const member of cluster) {
          member.tribeId = tribeId;
          member.speechBubble = `¡Larga vida al ${newTribe.name}!`;
          member.speechTimerMs = 4000;
        }

        newTribes.push(newTribe);

        liveEvents.push({
          id: Date.now() + Math.random(),
          tick: world.currentTick,
          category: 'tribe_founded',
          title: 'Nuevo Clan Fundado',
          description: `${leader.name} y sus compañeros fundaron el ${newTribe.name} en ${homeBiome}.`,
          biome: homeBiome,
          x: homeX,
          y: homeY,
          entityIds: cluster.map(e => e.id),
          important: true,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return { newTribes, liveEvents };
}

/**
 * Evaluates technological breakthroughs for active tribes.
 */
export function checkTechnologicalDiscovery(
  tribes: Tribe[],
  entities: Entity[],
  world: WorldState
): { liveEvents: LiveEvent[] } {
  const liveEvents: LiveEvent[] = [];

  const TECH_PROGRESSION: Array<{
    id: TechId;
    nameEs: string;
    description: string;
    prereq?: TechId;
    minAvgIntelligence: number;
    minAvgCreativity: number;
    checkCondition?: (members: Entity[], tribe: Tribe) => boolean;
  }> = [
    {
      id: 'fire_mastery',
      nameEs: 'Dominio del Fuego',
      description: 'El clan ha aprendido a frotar la madera y conservar las brasas de la noche.',
      minAvgIntelligence: 0.26,
      minAvgCreativity: 0.28,
    },
    {
      id: 'shelter_craft',
      nameEs: 'Arquitectura de Refugio',
      description: 'Entrelazan ramas gruesas y piedras para proteger a las crías de las heladas.',
      prereq: 'fire_mastery',
      minAvgIntelligence: 0.35,
      minAvgCreativity: 0.35,
    },
    {
      id: 'herbal_medicine',
      nameEs: 'Medicina de Hierbas',
      description: 'Reconocen los brotes sanadores que alivian la fiebre y cierran heridas.',
      minAvgIntelligence: 0.38,
      minAvgCreativity: 0.30,
      checkCondition: members => members.some(m => m.genome.empathy > 0.60),
    },
    {
      id: 'agriculture',
      nameEs: 'Cultivo Regenerativo',
      description: 'Siembran bayas y néctar alrededor del campamento asegurando alimento continuo.',
      prereq: 'shelter_craft',
      minAvgIntelligence: 0.45,
      minAvgCreativity: 0.40,
    },
    {
      id: 'stone_masonry',
      nameEs: 'Cantería y Graneros',
      description: 'Tallan la roca para erigir silos donde almacenar alimento para el invierno.',
      prereq: 'shelter_craft',
      minAvgIntelligence: 0.52,
      minAvgCreativity: 0.48,
    },
    {
      id: 'symbolic_script',
      nameEs: 'Escritura Simbólica',
      description: 'Graban relatos, advertencias y leyes en estelas de piedra para las generaciones futuras.',
      prereq: 'stone_masonry',
      minAvgIntelligence: 0.62,
      minAvgCreativity: 0.55,
    },
    {
      id: 'star_lore',
      nameEs: 'Cosmología Estelar',
      description: 'Alinean monolitos resonantes con los astros, canalizando sabiduría trascendente.',
      prereq: 'symbolic_script',
      minAvgIntelligence: 0.72,
      minAvgCreativity: 0.65,
    },
  ];

  for (const tribe of tribes) {
    const members = entities.filter(e => e.isAlive && e.tribeId === tribe.id);
    if (members.length === 0) continue;

    const avgIntel = members.reduce((s, m) => s + m.intelligence, 0) / members.length;
    const avgCreativity = members.reduce((s, m) => s + m.genome.creativity, 0) / members.length;

    for (const tech of TECH_PROGRESSION) {
      if (tribe.unlockedTechs.includes(tech.id)) continue;
      if (tech.prereq && !tribe.unlockedTechs.includes(tech.prereq)) continue;

      if (
        avgIntel >= tech.minAvgIntelligence &&
        avgCreativity >= tech.minAvgCreativity &&
        (!tech.checkCondition || tech.checkCondition(members, tribe))
      ) {
        tribe.unlockedTechs.push(tech.id);

        // Add to lexicon
        tribe.lexicon.push(generateLexiconWord(tribe.name, tech.nameEs));

        liveEvents.push({
          id: Date.now() + Math.random(),
          tick: world.currentTick,
          category: 'tech_discovered',
          title: `¡Descubrimiento: ${tech.nameEs}!`,
          description: `El ${tribe.name} descubrió ${tech.nameEs}: ${tech.description}`,
          biome: tribe.homeBiome,
          x: tribe.homeX,
          y: tribe.homeY,
          entityIds: members.map(m => m.id),
          important: true,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return { liveEvents };
}

/**
 * Autonomous construction of tribal and personal structures.
 */
export function checkAutonomousBuilding(
  entities: Entity[],
  tribes: Tribe[],
  structures: Structure[],
  world: WorldState
): { newStructures: Structure[]; liveEvents: LiveEvent[] } {
  const newStructures: Structure[] = [];
  const liveEvents: LiveEvent[] = [];

  for (const entity of entities) {
    if (!entity.isAlive || entity.lifeStage === 'larva') continue;

    const tribe = tribes.find(t => t.id === entity.tribeId) || null;
    const inv = entity.inventory;

    // Determine what structure the entity or tribe prioritizes
    let desiredKind: StructureKind | null = null;

    if (tribe) {
      const hasCampfire = structures.some(s => s.tribeId === tribe.id && s.kind === 'campfire');
      const hasShelter = structures.some(s => s.tribeId === tribe.id && s.kind === 'shelter');
      const hasGranary = structures.some(s => s.tribeId === tribe.id && s.kind === 'granary');
      const hasWatchtower = structures.some(s => s.tribeId === tribe.id && s.kind === 'watchtower');
      const hasTotem = structures.some(s => s.tribeId === tribe.id && s.kind === 'totem');
      const hasFarm = structures.some(s => s.tribeId === tribe.id && s.kind === 'farm');
      const hasMonolith = structures.some(s => s.tribeId === tribe.id && s.kind === 'monolith');

      if (!hasCampfire && tribe.unlockedTechs.includes('fire_mastery')) {
        desiredKind = 'campfire';
      } else if (!hasShelter && tribe.unlockedTechs.includes('shelter_craft')) {
        desiredKind = 'shelter';
      } else if (!hasGranary && tribe.unlockedTechs.includes('stone_masonry')) {
        desiredKind = 'granary';
      } else if (!hasWatchtower && tribe.unlockedTechs.includes('stone_masonry')) {
        desiredKind = 'watchtower';
      } else if (!hasTotem && tribe.unlockedTechs.includes('symbolic_script')) {
        desiredKind = 'totem';
      } else if (!hasFarm && tribe.unlockedTechs.includes('agriculture')) {
        desiredKind = 'farm';
      } else if (!hasMonolith && tribe.unlockedTechs.includes('star_lore')) {
        desiredKind = 'monolith';
      }
    } else if (entity.genome.creativity > 0.70 && inv.wood >= 15 && inv.stone >= 5) {
      // Independent hermit campfire
      const nearbyCamp = structures.find(s => s.kind === 'campfire' && Math.hypot(s.x - entity.x, s.y - entity.y) < 200);
      if (!nearbyCamp) desiredKind = 'campfire';
    }

    if (!desiredKind) continue;

    const recipe = RECIPES[desiredKind];
    if (
      inv.wood >= recipe.woodCost &&
      inv.stone >= recipe.stoneCost &&
      inv.crystal >= recipe.crystalCost &&
      inv.herbs >= recipe.herbCost
    ) {
      // Deduct resources
      inv.wood -= recipe.woodCost;
      inv.stone -= recipe.stoneCost;
      inv.crystal -= recipe.crystalCost;
      inv.herbs -= recipe.herbCost;

      // Position near entity or tribe home
      const posX = tribe ? tribe.homeX + (Math.random() - 0.5) * 120 : entity.x;
      const posY = tribe ? tribe.homeY + (Math.random() - 0.5) * 120 : entity.y;
      const biome = getBiomeAt(posX, posY);

      let inscription: string | null = null;
      if (desiredKind === 'totem' || desiredKind === 'monolith' || desiredKind === 'shelter') {
        inscription = tribe ? `${tribe.name} — "${tribe.motto}"` : `Erguido por la mano de ${entity.name}`;
      }

      const struct: Structure = {
        id: _structureIdCounter++,
        kind: desiredKind,
        biome,
        x: Math.round(posX),
        y: Math.round(posY),
        tribeId: tribe ? tribe.id : null,
        builderId: entity.id,
        builderName: entity.name,
        hp: recipe.maxHp,
        maxHp: recipe.maxHp,
        storedFood: desiredKind === 'granary' ? 40 : 0,
        auraRadius: recipe.auraRadius,
        inscription,
        createdTick: world.currentTick,
      };

      newStructures.push(struct);
      entity.activity = 'building';
      entity.speechBubble = `¡He erigido un ${desiredKind}!`;
      entity.speechTimerMs = 3500;

      liveEvents.push({
        id: Date.now() + Math.random(),
        tick: world.currentTick,
        category: 'structure_built',
        title: `Estructura erigida: ${desiredKind}`,
        description: `${entity.name} construyó un ${desiredKind} en ${biome}.`,
        biome,
        x: struct.x,
        y: struct.y,
        entityIds: [entity.id],
        important: desiredKind === 'monolith' || desiredKind === 'granary',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { newStructures, liveEvents };
}

/**
 * Erects an ancestral memorial stela when an elder or leader dies.
 */
export function erectMemorialStela(
  deceased: Entity,
  tribe: Tribe | null,
  world: WorldState
): Structure | null {
  const struct: Structure = {
    id: _structureIdCounter++,
    kind: 'memorial',
    biome: deceased.currentBiome,
    x: deceased.x,
    y: deceased.y,
    tribeId: tribe ? tribe.id : null,
    builderId: deceased.id,
    builderName: deceased.name,
    hp: 300,
    maxHp: 300,
    storedFood: 0,
    auraRadius: 140,
    inscription: `En memoria de ${deceased.name} (${deceased.speciesName}), quien partió a los ${deceased.ageTicks} ciclos. "${deceased.finalMessage?.finalWords || 'Paz a su alma.'}"`,
    createdTick: world.currentTick,
  };

  return struct;
}
