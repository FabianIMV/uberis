/**
 * UBERIS v2.0 — Headless Simulation Verification Suite
 *
 * Validates autonomous kinematics, cognitive tick loops, homeostatic balance,
 * genetics & speciation, divine interventions, genealogical lineage inspection,
 * and Spanish consciousness synthesis under Node.js runtime.
 */

import { Simulation } from '../engine/simulation';
import {
  crossoverAndMutate,
  deriveMorphology,
  deriveSpeciesInfo,
  computeIntelligence,
} from '../engine/genome';
import {
  generateFinalMessage,
  generateSpeech,
  generateBelief,
  generateLexiconWord,
} from '../engine/cognition';
import { BIOMES, getBiomeAt } from '../engine/biomes';
import { WORLD_HEIGHT, WORLD_WIDTH, Genome, Entity } from '../engine/types';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runVerification() {
  console.log('🌌 [UBERIS v2.0] Starting Engine Verification Suite...\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Genesis Seeding & Archetypes
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 1: Genesis Seeding & World Initialization');
  const sim = new Simulation();
  const state = sim.getState();

  assert(state.world.currentTick === 0, 'World tick starts at 0');
  assert(state.entities.length === 8, `Expected 8 Genesis entities, got ${state.entities.length}`);
  assert(state.resources.length >= 60, `Expected ~65 resources, got ${state.resources.length}`);
  assert(state.predators.length === 4, `Expected 4 predators, got ${state.predators.length}`);
  assert(state.biomes.length === 6, `Expected 6 biomes, got ${state.biomes.length}`);

  // Validate morphology determinism & validity
  for (const ent of state.entities) {
    assert(ent.morphology.bodyScale >= 0.72 && ent.morphology.bodyScale <= 1.42, 'Scale within [0.72, 1.42]');
    assert([1, 2, 3].includes(ent.morphology.eyeCount), 'Eye count must be 1, 2, or 3');
    assert(typeof ent.morphology.bodyHue === 'number', 'Body hue is numeric');
    assert(ent.isAlive === true, 'Genesis beings are alive');
    assert(ent.energy > 80 && ent.hydration > 80, 'Genesis beings start well-nourished');
  }

  // Validate spatial biomes coverage
  assert(getBiomeAt(620, 540) === 'eden', 'Center of Eden resolves to eden');
  assert(getBiomeAt(580, 1340) === 'lagoon', 'Center of Lagoon resolves to lagoon');
  assert(getBiomeAt(1320, 1040) === 'steppe', 'Center of Steppe resolves to steppe');
  assert(getBiomeAt(1860, 520) === 'archive', 'Center of Archive resolves to archive');
  assert(getBiomeAt(1920, 1360) === 'ashlands', 'Center of Ashlands resolves to ashlands');
  assert(getBiomeAt(1260, 340) === 'abyss', 'Center of Abyss resolves to abyss');
  console.log('  ✅ Genesis seeding & biomes spatial mapping passed.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: 300 Frames of 60Hz Kinematics & Autonomous Steering
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 2: Continuous 60fps Kinematics (300 frames)');
  const initialX = state.entities[0].x;
  const initialY = state.entities[0].y;
  const initialPhase = state.world.dayPhase;

  for (let f = 0; f < 300; f++) {
    sim.stepFrame(1 / 60);
  }

  assert(state.world.dayPhase !== initialPhase, 'Diurnal dayPhase advanced smoothly');
  for (const ent of state.entities) {
    assert(!isNaN(ent.x) && !isNaN(ent.y), 'Coordinates must be valid numbers');
    assert(ent.x >= 20 && ent.x <= WORLD_WIDTH - 20, `Entity X (${ent.x}) within continent bounds`);
    assert(ent.y >= 20 && ent.y <= WORLD_HEIGHT - 20, `Entity Y (${ent.y}) within continent bounds`);
    assert(!isNaN(ent.vx) && !isNaN(ent.vy), 'Velocities must be valid numbers');
    assert(!isNaN(ent.heading), 'Heading must be a valid number');
  }

  for (const pred of state.predators) {
    assert(!isNaN(pred.x) && !isNaN(pred.y), 'Predator coordinates valid');
    assert(pred.x >= 50 && pred.x <= WORLD_WIDTH - 50, 'Predator X in bounds');
  }
  console.log('  ✅ 300 frames of smooth 2D kinematics & soft-containment passed.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Cognitive Ticks, Metabolism & Spanish Consciousness
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 3: 25 Discrete Cognitive/Ecological Ticks');
  const tickCount = 25;
  for (let t = 0; t < tickCount; t++) {
    await sim.triggerCognitiveTick();
  }

  assert(state.world.currentTick === 25, `Expected tick 25, got ${state.world.currentTick}`);
  for (const ent of state.entities) {
    if (ent.isAlive) {
      assert(ent.ageTicks >= 25, 'Entity aged with ticks');
      assert(ent.intelligence > 0.05, 'Intelligence computed');
    }
  }

  // Check thought logging & Spanish richness
  const firstId = state.entities[0].id;
  const logs = state.logs[firstId];
  assert(logs && logs.length > 0, 'Thoughts logged for entity');
  assert(typeof logs[0].thought === 'string' && logs[0].thought.length > 15, 'Evocative Spanish thought text');
  console.log(`  Sample Thought (${state.entities[0].name}): "${logs[0].thought}"`);
  console.log('  ✅ 25 cognitive ticks & Spanish consciousness passed.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Genetics, Crossover, Mutation & Speciation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 4: Genetics, Crossover & Speciation Thresholds');
  const parentA: Genome = {
    curiosity: 0.85,
    empathy: 0.90,
    aggression: 0.10,
    creativity: 0.70,
    survivalDrive: 0.60,
    sociability: 0.80,
    speedGene: 0.50,
    sizeGene: 0.40,
    senseGene: 0.70,
    bioluminescence: 0.65,
  };

  const parentB: Genome = {
    curiosity: 0.40,
    empathy: 0.80,
    aggression: 0.20,
    creativity: 0.50,
    survivalDrive: 0.80,
    sociability: 0.70,
    speedGene: 0.60,
    sizeGene: 0.60,
    senseGene: 0.50,
    bioluminescence: 0.85,
  };

  const childGenome = crossoverAndMutate(parentA, parentB, 1.2);
  const keys: (keyof Genome)[] = [
    'curiosity', 'empathy', 'aggression', 'creativity', 'survivalDrive',
    'sociability', 'speedGene', 'sizeGene', 'senseGene', 'bioluminescence',
  ];

  for (const k of keys) {
    assert(childGenome[k] >= 0.02 && childGenome[k] <= 0.98, `Gene ${k} clamped between 0.02 and 0.98`);
  }

  // Validate speciation clustering
  const luminaSpecies = deriveSpeciesInfo(parentA);
  assert(luminaSpecies.speciesId.includes('lumina'), `Expected Lumina genus, got ${luminaSpecies.speciesName}`);

  const voraxGenome: Genome = { ...parentA, empathy: 0.1, aggression: 0.95 };
  const voraxSpecies = deriveSpeciesInfo(voraxGenome);
  assert(voraxSpecies.speciesId.includes('vorax'), `Expected Vorax genus, got ${voraxSpecies.speciesName}`);

  const morph = deriveMorphology(voraxGenome);
  assert(morph.crest === 'horns', `Expected horns for high aggression, got ${morph.crest}`);
  console.log(`  Species Cluster: ${luminaSpecies.speciesName} vs ${voraxSpecies.speciesName}`);
  console.log('  ✅ Genetic crossover, morphology derivation & speciation passed.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: All 7 Divine Powers
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 5: All 7 Divine Interventions');
  const powers = [
    'nourish',
    'rain',
    'solar_blessing',
    'mutagen',
    'monolith',
    'spawn_life',
    'lightning',
  ] as const;

  const initialEntitiesCount = state.entities.length;
  const initialStructuresCount = state.structures.length;

  for (const p of powers) {
    const ev = sim.applyDivinePower(p, 1200, 900);
    assert(ev !== null, `Divine power ${p} returned an event`);
    assert(ev!.category === 'divine_intervention', `Event category is divine_intervention`);
  }

  assert(state.entities.length > initialEntitiesCount, 'spawn_life increased entity count');
  assert(state.structures.length > initialStructuresCount, 'monolith power created monolith structure');
  assert(state.divineEffects.length > 0, 'Active divine visual effects created');
  console.log('  ✅ All 7 divine powers executed with tangible effects.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Lineage & Genealogy Inspection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 6: Lineage & Ancestry Inspection');
  const spawnedEnt = state.entities[state.entities.length - 1];
  const lineage = sim.inspectLineage(spawnedEnt.id);
  assert(lineage.entity !== null, 'Found target entity');
  assert(Array.isArray(lineage.parents), 'Parents array returned');
  assert(Array.isArray(lineage.children), 'Children array returned');
  assert(Array.isArray(lineage.ancestors), 'Ancestors array returned');
  console.log(`  Lineage inspected for ${spawnedEnt.name} (${spawnedEnt.speciesName})`);
  console.log('  ✅ Lineage inspection passed.\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Spanish Eulogies, Cultural Myths & Lexicon
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔹 Test 7: Poetic Eulogies, Myths & Lexicon');
  const finalMsg = generateFinalMessage(state.entities[0], 'vejez y plenitud de ciclos');
  assert(finalMsg.finalWords.length > 10, 'Final words generated in Spanish');
  assert(finalMsg.lifeMeaning.length > 10, 'Life meaning generated in Spanish');
  assert(finalMsg.atPeace === true, 'Peaceful transition for aged being');

  const speech = generateSpeech(state.entities[0], state.entities[1], 'greeting');
  assert(typeof speech === 'string' && speech.length > 5, 'Spoken dialogue string generated');

  const myth = generateBelief('eden', null, state.entities[0].name);
  assert(myth.topic.length > 3 && myth.belief.length > 20, 'Mythology generated in Spanish');

  const word = generateLexiconWord('Clan del Néctar', 'Alimento sagrado');
  assert(word.includes('('), 'Lexicon word includes meaning');

  console.log(`  Sample Final Testament: "${finalMsg.finalWords}"`);
  console.log(`  Sample Life Meaning: "${finalMsg.lifeMeaning}"`);
  console.log(`  Sample Myth: [${myth.topic}] "${myth.belief}"`);
  console.log('  ✅ Poetic Spanish synthesis verified.\n');

  console.log('✨ [ALL VERIFICATION CHECKS PASSED - 100% GREEN] ✨\n');
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
