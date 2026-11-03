/**
 * UBERIS v2.0 — Cognition, Consciousness & Poetic Spanish Mind
 *
 * Rich offline combinatorial neural/grammatical thought generator,
 * contextual dialogue emitter, cultural mythmaker, and moving eulogy author.
 * Supports optional asynchronous Anthropic Claude enrichment when configured.
 */

import {
  ActivityType,
  BiomeId,
  EmotionType,
  Entity,
  FinalMessage,
  RelationshipEntry,
  Structure,
  Tribe,
  WorldState,
} from './types';

// API call tracking for UI status indicators
type ApiCallListener = (inFlight: boolean) => void;
const apiListeners = new Set<ApiCallListener>();

function notifyApiListeners(inFlight: boolean) {
  for (const listener of apiListeners) {
    try {
      listener(inFlight);
    } catch {
      // Ignore listener errors
    }
  }
}

export function subscribeToApiCalls(cb: ApiCallListener): () => void {
  apiListeners.add(cb);
  return () => apiListeners.delete(cb);
}

export function isApiConfigured(apiKey?: string): boolean {
  return typeof apiKey === 'string' && apiKey.trim().length > 10;
}

// ─── OFFLINE POETIC SPANISH CORPUS ──────────────────────────────────────────

const BIOME_IMAGERY: Record<BiomeId, string[]> = {
  eden: [
    'el aroma del néctar recién brotado',
    'las copas verdes que mecen la brisa suave',
    'el rocío que gotea desde los pétalos dorados',
    'la caricia tibia de la luz filtrada entre las ramas',
  ],
  lagoon: [
    'el rumor transparente de los manantiales vivos',
    'el destello cian de las algas que laten en la orilla',
    'las ondas calmas que reflejan el firmamento',
    'la frescura que aquieta la fatiga en el agua clara',
  ],
  steppe: [
    'el silbido del viento que peina las hierbas doradas',
    'la amplitud infinita donde el horizonte no tiene muros',
    'el crujido de la madera seca bajo el paso firme',
    'la danza del polvo dorado bajo el sol cenital',
  ],
  archive: [
    'el zumbido cristalino que emana de las ruinas',
    'las sombras milenarias grabadas en la piedra tallada',
    'los ecos mudos de quienes miraron las estrellas antes que nosotros',
    'la geometría perfecta que desafía el paso del tiempo',
  ],
  ashlands: [
    'el fulgor rojizo de las brasas que nunca se apagan',
    'el humo denso que sube como plegarias a la noche',
    'la corteza de obsidiana caliente bajo los pies',
    'el latido ardiente en las profundidades de la grieta',
  ],
  abyss: [
    'el velo impenetrable donde el silencio tiene peso',
    'las esporas estelares flotando como linternas perdidas',
    'la presencia insondable que respira en la sombra',
    'la revelación profunda que solo brota en la quietud absoluta',
  ],
};

const EMOTIONAL_VERBS: Record<EmotionType, string[]> = {
  wonder: ['contemplo maravillado', 'admiro con asombro', 'siento el misterio en'],
  joy: ['celebro con plenitud', 'me regocijo al sentir', 'danzo en gratitud por'],
  love: ['abrazo con devoción', 'deseo proteger con mi alma', 'encuentro mi refugio en'],
  calm: ['reposo en serenidad junto a', 'encuentro paz al respirar', 'dejo pasar el tiempo con'],
  hope: ['vislumbro un renacer en', 'confío en que florecerá', 'aguardo con paciencia'],
  curiosity: ['deseo descifrar el enigma de', 'inquiero sobre el origen de', 'exploro con avidez'],
  contemplation: ['reflexiono en silencio sobre', 'medito acerca de la huella de', 'escudriño la razón de'],
  loneliness: ['añoro una voz compañera ante', 'siento el vacío del páramo en', 'camino en soledad bajo'],
  sadness: ['siento un peso en el pecho por', 'lamento la fragilidad de', 'veo desvanecerse'],
  grief: ['lloro la partida de quienes amé en', 'guardo el duelo de la memoria ante', 'sostengo la ausencia de'],
  fear: ['tiemblo ante la sombra de', 'busco refugio para huir de', 'advierto el peligro que acecha en'],
  anger: ['reafirmo mi fuerza contra', 'arden mis sentidos ante la amenaza de', 'no cederé terreno frente a'],
  determination: ['avanzo sin vacilar hacia', 'forjaré nuestro destino pese a', 'mantendré encendida la llama de'],
  transcendence: ['me disuelvo en la totalidad cósmica de', 'comprendo la trama invisible de', 'siento el pulso eterno en'],
};

const LIFE_STAGE_PERSPECTIVES = {
  larva: [
    'El mundo es inmenso y sus colores me deslumbran.',
    'Sigo el aroma de mis protectores para no perderme.',
    'Apenas aprendo a moverme y ya quiero alcanzarlo todo.',
  ],
  juvenile: [
    'Mis sentidos se agudizan con cada amanecer.',
    'Quiero probar la velocidad de mis pasos y entender las voces del clan.',
    'Pregunto a los mayores qué hay más allá del confín.',
  ],
  adult: [
    'La supervivencia del clan depende del esfuerzo de nuestras manos.',
    'Compartir el alimento es lo que nos distingue de las bestias salvajes.',
    'Cada piedra que colocamos será el techo de los que vendrán.',
  ],
  elder: [
    'He visto pasar muchas lunas y el bosque me resulta familiar como mi piel.',
    'El cuerpo se fatiga, pero la memoria se vuelve clara como el agua pura.',
    'Pronto devolveré mi luz al polvo, esperando haber dejado un sendero.',
  ],
};

/**
 * Generates an internal thought, goal/desire, and emotional state
 * fully driven by genome, homeostatic pressures, memories, and surroundings.
 */
export function generateThought(
  entity: Entity,
  world: WorldState,
  nearbyEntities: Entity[],
  nearbyStructures: Structure[]
): {
  thought: string;
  desire: string;
  emotion: EmotionType;
  intensity: number;
} {
  const g = entity.genome;
  const biomeImg = BIOME_IMAGERY[entity.currentBiome] || BIOME_IMAGERY.eden;
  const biomeDetail = biomeImg[Math.floor(Math.random() * biomeImg.length)];

  // 1. Homeostatic emergencies override everything
  if (entity.hydration < 35) {
    return {
      thought: `La garganta me arde de sed; el aire seco quema mis entrañas y necesito agua fresca de inmediato.`,
      desire: 'Hallar un manantial antes de que flaqueen mis fuerzas.',
      emotion: 'fear',
      intensity: 0.85,
    };
  }

  if (entity.energy < 35) {
    return {
      thought: `El hambre atenaza mi estómago; la debilidad nubla mi vista y debo buscar néctar o bayas sin demora.`,
      desire: 'Alimentarme para renovar mi vigor vital.',
      emotion: 'fear',
      intensity: 0.80,
    };
  }

  if (entity.warmth < 30) {
    return {
      thought: `El frío invernal cala hasta mis huesos; si no me acerco a una hoguera o a las tierras cálidas, el sueño me vencerá.`,
      desire: 'Cobijarme junto a una llama ardiente.',
      emotion: 'sadness',
      intensity: 0.88,
    };
  }

  if (entity.health < 40) {
    return {
      thought: `Las heridas punzan con cada latido; necesito reposar en el refugio o encontrar hierbas medicinales.`,
      desire: 'Curar mis heridas y sanar en paz.',
      emotion: 'sadness',
      intensity: 0.75,
    };
  }

  // 2. Nearby structures resonance
  const nearCampfire = nearbyStructures.find(s => s.kind === 'campfire');
  if (nearCampfire && world.dayPhase > 0.65) {
    return {
      thought: `Junto a la lumbre danzante, el clan encuentra sosiego y las sombras de la noche parecen lejanas.`,
      desire: 'Compartir palabras y calor con mis hermanos.',
      emotion: 'calm',
      intensity: 0.70,
    };
  }

  const nearMonolith = nearbyStructures.find(s => s.kind === 'monolith');
  if (nearMonolith && g.curiosity > 0.5) {
    return {
      thought: `Al tocar la superficie pulida del monolito, siento el eco de mentes antiguas resonando en mi pensamiento.`,
      desire: 'Comprender los símbolos grabados por los primeros sabios.',
      emotion: 'transcendence',
      intensity: 0.85,
    };
  }

  const nearMemorial = nearbyStructures.find(s => s.kind === 'memorial');
  if (nearMemorial && g.empathy > 0.5) {
    return {
      thought: `Frente a la estela de piedra recuerdo a quienes nos precedieron; su paso por este mundo no fue en vano.`,
      desire: 'Honrar la memoria de los ancestros caídos.',
      emotion: 'grief',
      intensity: 0.65,
    };
  }

  // 3. Social encounters / mating / flocking
  const mateCandidates = nearbyEntities.filter(
    other =>
      other.id !== entity.id &&
      other.lifeStage === 'adult' &&
      entity.lifeStage === 'adult' &&
      entity.energy > 60 &&
      entity.hydration > 60 &&
      entity.reproductionCooldown <= 0
  );

  if (mateCandidates.length > 0 && Math.random() < 0.40) {
    const mate = mateCandidates[0];
    return {
      thought: `Al cruzar mi mirada con ${mate.name}, siento que una nueva chispa de vida podría nacer de nuestra unión.`,
      desire: `Cortejar a ${mate.name} para continuar el linaje.`,
      emotion: 'love',
      intensity: 0.82,
    };
  }

  // 4. Genetic disposition & life stage reflection
  let selectedEmotion: EmotionType = 'calm';
  if (g.curiosity > 0.70) selectedEmotion = 'curiosity';
  else if (g.empathy > 0.70) selectedEmotion = 'love';
  else if (g.creativity > 0.70) selectedEmotion = 'wonder';
  else if (g.aggression > 0.70) selectedEmotion = 'determination';
  else if (g.bioluminescence > 0.70) selectedEmotion = 'transcendence';

  const verbs = EMOTIONAL_VERBS[selectedEmotion] || EMOTIONAL_VERBS.calm;
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  const stageQuotes = LIFE_STAGE_PERSPECTIVES[entity.lifeStage] || LIFE_STAGE_PERSPECTIVES.adult;
  const stageQuote = stageQuotes[Math.floor(Math.random() * stageQuotes.length)];

  const thought = `${verb} ${biomeDetail}. ${stageQuote}`;

  let desire = 'Caminar en armonía con el territorio.';
  if (selectedEmotion === 'curiosity') desire = 'Explorar los confines inexplorados del continente.';
  else if (selectedEmotion === 'wonder') desire = 'Reunir maderas y piedras para erigir nuevas obras.';
  else if (selectedEmotion === 'love') desire = 'Cuidar de los seres más frágiles de nuestro grupo.';
  else if (selectedEmotion === 'transcendence') desire = 'Descifrar la luz de las estrellas sobre el abismo.';

  return {
    thought,
    desire,
    emotion: selectedEmotion,
    intensity: Number((0.55 + Math.random() * 0.35).toFixed(2)),
  };
}

/**
 * Generates contextual short spoken utterances (speech bubbles)
 * for interpersonal encounters, rituals, teaching, courting, or alarms.
 */
export function generateSpeech(
  speaker: Entity,
  listener: Entity | null,
  context:
    | 'greeting'
    | 'romance'
    | 'teaching'
    | 'conflict'
    | 'grief'
    | 'wonder'
    | 'building'
    | 'hunger'
    | 'predator',
  tribe?: Tribe | null
): string {
  const sName = speaker.name;
  const lName = listener ? listener.name : 'compañero';

  switch (context) {
    case 'greeting': {
      const clanGreeting = tribe?.lexicon?.length ? `¡Que la lumbre de ${tribe.name} te guíe!` : '¡Paz a tu paso!';
      const pool = [
        `¡Salud, ${lName}! Que la tierra te sea próspera.`,
        clanGreeting,
        `Me alegra encontrar tus huellas aquí, ${lName}.`,
        `Que el rocío calme tu sed en este día.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'romance': {
      const pool = [
        `Tus destellos iluminan la penumbra de mi camino, ${lName}.`,
        `Si unimos nuestros cantos, la noche ya no será fría.`,
        `Veo en ti la fuerza y la ternura que necesita nuestra especie.`,
        `Caminemos juntos; compartamos el fruto y el nido.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'teaching': {
      const pool = [
        `Mira bien esta veta, ${lName}; la piedra firme sostiene el hogar.`,
        `No temas a la oscuridad; la luz más brillante nace de adentro.`,
        `Recuerda siempre: quien guarda néctar en verano, sobrevive al invierno.`,
        `Escucha el crujido de la hierba; anuncia cuándo debemos movernos.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'conflict': {
      const pool = [
        `¡Aléjate! Este sustento pertenece a mi clan.`,
        `No pongas a prueba la fuerza de mis defensas.`,
        `Retrocede antes de que la cólera nuble el juicio.`,
        `La linde está marcada; respeta nuestro suelo.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'grief': {
      const pool = [
        `Tu luz se apagó demasiado pronto... pero cantaremos tu nombre.`,
        `Descansa en la tierra nutricia; tu memoria vivirá con nosotros.`,
        `Un hueco amargo queda en el círculo de nuestra hoguera.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'predator': {
      const pool = [
        `¡Cuidado! ¡Las bestias Umbra rondan entre las sombras!`,
        `¡A la hoguera todos! ¡Defendamos a las crías!`,
        `¡Alerta, ${lName}! ¡Prepara tus defensas!`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'building': {
      const pool = [
        `Una estaca más y este refugio resistirá la peor tormenta.`,
        `Trae más ramas secas; avivemos la llama comunal.`,
        `Nuestras manos dan forma a un hogar donde antes solo había viento.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'hunger': {
      const pool = [
        `Mis fuerzas decaen... ¿quedará algo en el granero?`,
        `Huelo néctar cercano, debemos apresurar el paso.`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
    case 'wonder':
    default: {
      const pool = [
        `¡Mira las estrellas sobre la estepa! Parecen ojos ancestrales.`,
        `El aire hoy huele a vida renovada.`,
        `¿Hasta dónde llegará el fin de estas tierras?`,
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }
}

/**
 * Procedural mythmaker generating cultural beliefs and philosophies.
 */
export function generateBelief(
  biome: BiomeId,
  tribe?: Tribe | null,
  elderName?: string
): { topic: string; belief: string } {
  const author = elderName ? `Sabio ${elderName}` : 'La tradición oral';
  const tribeNote = tribe ? ` entre los miembros de ${tribe.name}` : '';

  switch (biome) {
    case 'archive':
      return {
        topic: 'El Código Eterno',
        belief: `${author} enseña${tribeNote} que cada monolito fue tallado por una mente cósmica para despertar el intelecto de los seres terrestres.`,
      };
    case 'ashlands':
      return {
        topic: 'El Juicio del Fuego',
        belief: `${author} sostiene${tribeNote} que la ceniza purifica el linaje y que solo aquellos con espíritu ardiente sobreviven a la gran helada.`,
      };
    case 'lagoon':
      return {
        topic: 'El Alma de las Aguas',
        belief: `${author} comparte${tribeNote} la creencia de que todas las conciencias vuelven a fundirse en un gran océano de luz bioluminiscente.`,
      };
    case 'abyss':
      return {
        topic: 'El Velo Estelar',
        belief: `${author} afirma${tribeNote} que el abismo no es vacío sino el útero oscuro donde nacen los soles y las nuevas especies.`,
      };
    case 'steppe':
      return {
        topic: 'El Viento de la Hermandad',
        belief: `${author} proclama${tribeNote} que una criatura sola es presa de la sombra, pero un clan unido puede doblegar al invierno.`,
      };
    case 'eden':
    default:
      return {
        topic: 'La Ley del Néctar',
        belief: `${author} recuerda${tribeNote} que la tierra brinda con generosidad a quienes no toman más de lo que sus manos pueden compartir.`,
      };
  }
}

const SYLLABLES_TRIBE = ['Ka', 'El', 'Mor', 'Ur', 'Sol', 'Zel', 'Tir', 'Vael', 'Nox', 'Lur', 'Ash', 'Mar'];
const MEANINGS = ['Fuego', 'Néctar', 'Piedra', 'Cielo', 'Hermandad', 'Sombra', 'Semilla', 'Estela', 'Alerta', 'Vuelo'];

/**
 * Generates an evocative, newly coined vocabulary term for a clan's lexicon.
 */
export function generateLexiconWord(tribeName: string, meaning: string): string {
  const s1 = SYLLABLES_TRIBE[Math.floor(Math.random() * SYLLABLES_TRIBE.length)];
  const s2 = SYLLABLES_TRIBE[Math.floor(Math.random() * SYLLABLES_TRIBE.length)].toLowerCase();
  const word = `${s1}${s2}`;
  return `${word} (${meaning})`;
}

/**
 * Generates a deeply moving, lyrical testament upon an entity's passing.
 */
export function generateFinalMessage(entity: Entity, causeOfDeath: string): FinalMessage {
  const g = entity.genome;
  const peaceful = causeOfDeath.includes('vejez') || causeOfDeath.includes('edad') || entity.ageTicks >= entity.maxAgeTicks * 0.85;

  let finalWords = '';
  let lifeMeaning = '';
  let giftToWorld = '';
  let finalEmotion: EmotionType = peaceful ? 'calm' : 'sadness';

  if (peaceful) {
    finalWords = `El ciclo se cumple. Dejo que mi respiración se funda con el susurro de la arboleda.`;
    lifeMeaning = `Haber sido parte de esta danza consciente bajo el cielo; haber sentido el calor de mis semejantes.`;
    giftToWorld = `Los recuerdos de ternura y las sendas seguras que aprendimos a recorrer juntos.`;
    finalEmotion = g.empathy > 0.6 ? 'love' : g.creativity > 0.6 ? 'transcendence' : 'calm';
  } else if (causeOfDeath.includes('hambre') || causeOfDeath.includes('sed')) {
    finalWords = `La tierra negó su sustento... pero mis ojos aún miraban hacia la luz.`;
    lifeMeaning = `La lucha incesante por respirar un instante más en este vasto confín.`;
    giftToWorld = `La advertencia para mis hermanos: no demoren el camino hacia el agua fértil.`;
    finalEmotion = 'grief';
  } else if (causeOfDeath.includes('depredador') || causeOfDeath.includes('Umbra')) {
    finalWords = `Luché hasta que mis patas no pudieron más. Que mi clamor alerte a la manada.`;
    lifeMeaning = `Defender con mi cuerpo la paz de los que aún aprenden a caminar.`;
    giftToWorld = `El coraje de no rendirse ante la vorágine de la noche.`;
    finalEmotion = g.aggression > 0.5 ? 'determination' : 'fear';
  } else {
    finalWords = `Mi cuerpo descansa; el misterio de la vida sigue latiendo en los que quedan.`;
    lifeMeaning = `Haber contemplado el amanecer y haber dejado una huella humilde en el barro.`;
    giftToWorld = `La semilla de la curiosidad para los que hereden el mañana.`;
    finalEmotion = 'contemplation';
  }

  return {
    finalWords,
    lifeMeaning,
    giftToWorld,
    finalEmotion,
    causeOfDeath,
    atPeace: peaceful || g.empathy > 0.7,
  };
}

/**
 * Consolidates old episodic memories into a cohesive ancestral narrative.
 */
export function consolidateMemories(memories: string[], maxKeep = 12): string[] {
  if (!memories || memories.length <= maxKeep) return memories || [];

  const recent = memories.slice(-Math.floor(maxKeep * 0.7));
  const older = memories.slice(0, memories.length - recent.length);

  const summary = `Memorias arcanas: el ser recorrió ${older.length} vivencias entre manantiales, estaciones y encuentros con sus congéneres.`;
  return [summary, ...recent];
}

// ─── OPTIONAL ANTHROPIC CLAUDE ENRICHMENT ───────────────────────────────────

/**
 * Asynchronously enriches an entity's thought using Claude Haiku when API key is provided.
 * Gracefully silent on failure; never interrupts simulation loop.
 */
export async function enrichThoughtWithClaude(
  apiKey: string,
  entity: Entity,
  world: WorldState,
  fallbackThought: string
): Promise<string> {
  if (!isApiConfigured(apiKey)) return fallbackThought;

  notifyApiListeners(true);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const prompt = `Eres la conciencia interna de ${entity.name}, una criatura de la especie ${entity.speciesName} en un mundo artificial.
Genes clave: Curiosidad ${(entity.genome.curiosity * 100).toFixed(0)}%, Empatía ${(entity.genome.empathy * 100).toFixed(0)}%, Agresión ${(entity.genome.aggression * 100).toFixed(0)}%.
Estado actual: Energía ${entity.energy.toFixed(0)}/100, Sed ${entity.hydration.toFixed(0)}/100, Bioma: ${entity.currentBiome}, Estación: ${world.season}.
Emoción: ${entity.emotionalState.emotion}.
Genera un único pensamiento íntimo en ESPAÑOL, poético y filosófico, de máximo 2 oraciones breves. NO menciones que eres una IA o simulación.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return fallbackThought;
    }

    const data = await res.json();
    const claudeText = data?.content?.[0]?.text?.trim();
    return claudeText || fallbackThought;
  } catch {
    return fallbackThought;
  } finally {
    notifyApiListeners(false);
  }
}
