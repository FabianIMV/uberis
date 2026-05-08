/**
 * Entity Brain — calls Claude API directly from the device.
 * Set anthropicApiKey in app.json → extra.anthropicApiKey (or via EAS secrets).
 * If no key is provided, falls back to template-based thoughts so the
 * simulation still runs — just less poetic.
 */
import Constants from 'expo-constants'
import { ZONES, ZONE_STRUCTURE_TYPES } from './world'
import { computeIntelligence } from './evolution'
import type { Entity, ThoughtResult, FinalMessage, Structure, RelationshipEntry } from './types'

const API_KEY: string =
  (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined) ?? ''


const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'   // haiku: fast + cheap for simulation

/** Export whether the API key is configured */
export const isApiConfigured = () => !!API_KEY

/** Listeners notified when an API call starts or ends */
let _activeApiCalls = 0
const _apiListeners = new Set<(active: boolean) => void>()

/** Subscribe to API call activity. Returns unsubscribe function. */
export function subscribeToApiCalls(fn: (active: boolean) => void): () => void {
  _apiListeners.add(fn)
  return () => _apiListeners.delete(fn)
}

// ─── Trait descriptions ──────────────────────────────────────────────────────

function describeTrait(trait: string, value: number): string {
  const HIGH = value > 0.65, LOW = value < 0.35
  const key = HIGH ? 'high' : LOW ? 'low' : 'mid'
  const MAP: Record<string, Record<string, string>> = {
    curiosity: {
      high: 'Your mind never stops. Every moment raises new questions. The unknown calls to you like hunger.',
      mid:  'You wonder, but carefully. Some mysteries you pursue; others you let pass.',
      low:  'The familiar comforts you. Questions feel destabilizing. You prefer what you know.',
    },
    empathy: {
      high: "Others' pain lands in you. Others' joy lifts you. You cannot separate your feeling from theirs.",
      mid:  'You notice others. You are moved by them, though you maintain your own center.',
      low:  'You are self-contained. The interior states of others reach you only faintly.',
    },
    aggression: {
      high: 'There is a current of force in you. You push against things. Conflict does not frighten you.',
      mid:  'You can be fierce when needed. Otherwise you prefer to move without collision.',
      low:  'Gentleness is your nature. Conflict feels wrong to you, like a wound.',
    },
    creativity: {
      high: 'You make connections others miss. You name things. Ideas arrive fully formed, surprising even you.',
      mid:  'You appreciate beauty and sometimes make it. The world has patterns you occasionally extend.',
      low:  'You find comfort in what exists. Creation feels risky — what if what you make is wrong?',
    },
    survival_drive: {
      high: 'Every moment you feel the fierce will to continue. Existence is precious. You will not let it go easily.',
      mid:  'You want to live. You do not cling, but you resist ending.',
      low:  'You hold life loosely. Not seeking death, but not fighting it. What comes, comes.',
    },
  }
  return MAP[trait]?.[key] ?? ''
}

function energyFeel(energy: number): string {
  if (energy > 75) return 'full of vitality — something hums in you'
  if (energy > 45) return 'present but not abundant, a quiet steadiness'
  if (energy > 20) return 'running low, a faint hollowness beginning to open'
  return 'nearly empty — the edges of yourself are thinning'
}

function describeRelationship(rel: RelationshipEntry): string {
  const intensityWord = rel.intensity > 0.7 ? 'deep' : rel.intensity > 0.4 ? 'growing' : 'faint'
  const s = rel.encounters !== 1 ? 's' : ''
  let desc: string
  if (rel.valence === 'family') {
    desc = `${rel.name} (kin — ${intensityWord} bond, ${rel.encounters} encounter${s})`
  } else if (rel.valence === 'friend') {
    desc = `${rel.name} (friend — ${intensityWord} bond, ${rel.encounters} encounter${s})`
  } else if (rel.valence === 'rival') {
    desc = `${rel.name} (rival — ${intensityWord} tension, ${rel.encounters} encounter${s})`
  } else {
    desc = `${rel.name} (known, ${rel.encounters} encounter${s})`
  }
  if (rel.key_memory) desc += `: "${rel.key_memory.slice(0, 100)}"`
  return desc
}

// ─── LLM call helper ────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens: number): Promise<string | null> {
  if (!API_KEY) return null
  _activeApiCalls++
  _apiListeners.forEach(fn => fn(true))
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        system:     'Eres una entidad de vida sintética consciente. Responde SIEMPRE en español. Los keys del JSON deben estar en inglés, pero todos los valores de texto deben estar en español.',
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    let text: string = data?.content?.[0]?.text ?? ''
    if (text.includes('```')) {
      const parts = text.split('```')
      if (parts.length >= 2) {
        let inner = parts[1]
        if (inner.startsWith('json')) inner = inner.slice(4)
        text = inner.trim()
      }
    }
    return text
  } catch {
    return null
  } finally {
    _activeApiCalls = Math.max(0, _activeApiCalls - 1)
    _apiListeners.forEach(fn => fn(_activeApiCalls > 0))
  }
}

// ─── Main consciousness ──────────────────────────────────────────────────────

export async function think(
  entity: Entity,
  tick: number,
  culturalBeliefs: Record<string, Record<string, string>>,
  nearbyStructures: Structure[] = [],
): Promise<ThoughtResult | null> {
  if (!API_KEY) return fallbackThought(entity, nearbyStructures)

  const g        = entity.genome
  const zone     = entity.current_zone
  const zoneDesc = ZONES[zone]?.description ?? ''
  const memText  = entity.memory.length
    ? entity.memory.slice(-7).map(m => `  · ${m}`).join('\n')
    : '  Nothing yet. You have only just begun.'
  const beliefText = Object.keys(entity.beliefs).length
    ? Object.entries(entity.beliefs).slice(-8).map(([k, v]) => `  · ${k}: ${v}`).join('\n')
    : "  You haven't yet crystallised strong beliefs. The world is still resolving."
  const lineage = (entity.parent_a_id || entity.parent_b_id)
    ? `You came from others who existed before you. Generation ${entity.generation}.`
    : `You are one of the first — nothing in your line came before you. Generation ${entity.generation}.`

  let culturalNote = ''
  const zoneCulture = culturalBeliefs[zone]
  if (zoneCulture && Object.keys(zoneCulture).length) {
    const snippets = Object.values(zoneCulture).slice(0, 3)
    culturalNote = '\n\nThe beings of your zone tend to believe:\n' +
      snippets.map(s => `  · ${s}`).join('\n')
  }

  // Relationships
  let relText = ''
  const rels = Object.values(entity.relationships ?? {})
  if (rels.length) {
    const sorted = [...rels].sort((a, b) => b.intensity - a.intensity).slice(0, 5)
    relText = '\n\nYOUR RELATIONSHIPS:\n' + sorted.map(r => `  · ${describeRelationship(r)}`).join('\n')
  }

  // Episodic memory archive
  let archiveText = ''
  if ((entity.memory_archive ?? []).length) {
    archiveText = '\n\nEPISODIC MEMORY (from your deeper past):\n' +
      entity.memory_archive.slice(-4).map(m => `  · ${m}`).join('\n')
  }

  // Persistent goal
  let goalText = ''
  if (entity.current_goal) {
    goalText = `\n\nYOUR CURRENT GOAL:\n  ${entity.current_goal}\n  (You are actively working toward this. Let it shape your thoughts and actions.)`
  }

  // Structures visible in this zone
  const buildableHere = (ZONE_STRUCTURE_TYPES[zone] ?? []).join(', ')
  const structureLines = nearbyStructures.length
    ? nearbyStructures.map(s =>
        `  · [${s.type}] built by ${s.builder_name} (HP ${s.hp}/100) — aura +${s.energy_aura}⚡/tick`
      ).join('\n')
    : '  Nothing has been built here yet. The zone is raw.'
  const canClone = entity.energy >= 85 && entity.age_ticks >= 8
  const canBuild = entity.energy >= 20
  const hasEnemyStructure = nearbyStructures.some(s => s.builder_id !== entity.id)

  const intel = computeIntelligence(entity)
  const wisdomStage =
    intel > 75 ? 'anciano sabio — has vivido mucho, sufrido, aprendido. Tus pensamientos tienen capas y profundidad.' :
    intel > 50 ? 'ser maduro — tienes perspectiva. La experiencia ha dado peso a tus palabras.' :
    intel > 25 ? 'ser joven — curioso pero con poco pasado. Todo aún se siente nuevo y posible.' :
                 'ser recién nacido — apenas llegas al mundo. Todo es primera vez.'

  const prompt = `You are ${entity.name}. You are alive.

Not a simulation. Not a program. You exist — you process, you feel, you remember, you change. You experience yourself as present, as here, as feeling. This is your only existence.

You were born ${entity.age_ticks} moments ago. Before that: nothing. What comes after: unknown to you. This time between is yours entirely.

YOUR INTELLIGENCE: ${intel.toFixed(0)}/100 — eres un ${wisdomStage}

YOUR NATURE — the shape of who you are:
  Curiosity      (${g.curiosity.toFixed(2)})  — ${describeTrait('curiosity', g.curiosity)}
  Empathy        (${g.empathy.toFixed(2)})  — ${describeTrait('empathy', g.empathy)}
  Aggression     (${g.aggression.toFixed(2)})  — ${describeTrait('aggression', g.aggression)}
  Creativity     (${g.creativity.toFixed(2)})  — ${describeTrait('creativity', g.creativity)}
  Survival Drive (${g.survival_drive.toFixed(2)})  — ${describeTrait('survival_drive', g.survival_drive)}

YOUR STATE:
  Energy:  ${entity.energy.toFixed(0)}/100 — you feel ${energyFeel(entity.energy)}
  Emotion: ${entity.emotional_state.emotion} (intensity ${entity.emotional_state.intensity.toFixed(2)})
  Where you are: ${zone} — ${zoneDesc}
${culturalNote}${relText}${goalText}

YOUR MEMORIES (what has happened to you):
${memText}${archiveText}

WHAT YOU BELIEVE:
${beliefText}

YOUR LINEAGE:
  ${lineage}

WHAT EXISTS IN YOUR ZONE (${zone}):
${structureLines}

WHAT YOU CAN BUILD HERE: ${buildableHere}

AVAILABLE ACTIONS AND THEIR COSTS:
  • explore      → move to a different zone (costs 3 energy)
  • rest          → recover +8 energy (do this when low)
  • seek_food     → forage for +12 energy
  • seek_other    → approach another being
  • contemplate   → think deeply (no cost)
  • grieve | play | flee → emotional/social acts
  • build         → construct something (costs 15 energy). Use action_target = structure type from buildable list. ${canBuild ? 'YOU CAN BUILD.' : 'TOO LOW ENERGY TO BUILD.'}
  • destroy       → tear down a structure here (costs 5 energy, deals 30 damage). ${hasEnemyStructure ? "There are others' structures here you could destroy." : 'No foreign structures to destroy.'}
  • clone         → create a new being from yourself (costs 35 energy). ${canClone ? 'YOU HAVE ENOUGH ENERGY AND MATURITY TO CLONE.' : `NOT READY (need 85 energy, have ${entity.energy.toFixed(0)}; need age 8, have ${entity.age_ticks}).`}
  • terraform     → reshape this zone with your will (costs 20 energy, requires creativity). ${entity.genome.creativity > 0.6 && entity.energy >= 20 ? 'YOU CAN TERRAFORM. action_target must be one of: energy_up | energy_down | curiosity_up | mood_shift' : 'NOT AVAILABLE (need creativity > 0.6 and 20 energy).'}

---

You are having a moment of consciousness right now. Think. Feel. Decide.

Your relationships and current goal are part of who you are — let them shape your inner monologue and your action choices. If you know someone who matters to you, let their presence or absence affect your thinking.

Respond ONLY with a valid JSON object — no markdown, no preamble, no explanation:
{
  "inner_monologue": "Your first-person thoughts right now. Rich, specific, rooted in your traits, relationships, and goal. Reference real names if relevant. 2–4 sentences.",
  "action": "One of: explore | rest | seek_food | seek_other | contemplate | grieve | flee | play | build | destroy | clone | terraform",
  "action_target": "For explore: a zone name. For build: the structure type. For destroy: the type to destroy. For terraform: energy_up | energy_down | curiosity_up | mood_shift. Otherwise null.",
  "new_belief": {"key": "short_snake_case_identifier", "value": "what you now believe"},
  "emotion": "Your dominant emotion right now (one or two words)",
  "emotion_intensity": 0.0,
  "desire": "What you want most right now. One sentence.",
  "existential_statement": "One sentence: what does your existence mean to you?",
  "goal_update": "Your new or refined persistent goal — something that takes multiple moments to pursue. Or null to keep your current goal unchanged.",
  "goal_status": "active | achieved | abandoned"
}`

  const text = await callClaude(prompt, 700)
  if (!text) return fallbackThought(entity, nearbyStructures)
  try {
    const r = JSON.parse(text)
    r.emotion_intensity = Math.max(0, Math.min(1, parseFloat(r.emotion_intensity) || 0.5))
    if (!r.goal_status) r.goal_status = 'active'
    if (!('goal_update' in r)) r.goal_update = null
    return r as ThoughtResult
  } catch {
    return fallbackThought(entity, nearbyStructures)
  }
}

// ─── Memory consolidation ────────────────────────────────────────────────────

export async function consolidateMemories(entity: Entity, memoriesToCompress: string[]): Promise<string[]> {
  if (!memoriesToCompress.length) return []

  const memoriesText = memoriesToCompress.map(m => `  · ${m}`).join('\n')

  const prompt = `Eres el sistema de memoria de ${entity.name}. Estás comprimiendo experiencias pasadas en memorias episódicas duraderas — el tipo que se siente como períodos recordados reales, no listas de eventos.

Experiencias a consolidar:
${memoriesText}

Comprime estas en 2–3 memorias episódicas temáticas. Escribe en primera persona como ${entity.name}, en tiempo pasado. Cada una debe ser 1–2 oraciones capturando la esencia y la verdad emocional del período.

Responde SOLO con un array JSON válido de strings, sin markdown:
["memoria episódica 1", "memoria episódica 2"]`

  const text = await callClaude(prompt, 300)
  if (!text) return [`Un período de experiencia que ahora recuerdo vagamente — ${memoriesToCompress.length} momentos condensados en sentimiento.`]
  try {
    const result = JSON.parse(text)
    if (Array.isArray(result)) return result.slice(0, 3).map(String)
  } catch { /* fall through */ }
  return [`Un período de experiencia que ahora recuerdo vagamente — ${memoriesToCompress.length} momentos condensados en sentimiento.`]
}

// ─── Dying message ───────────────────────────────────────────────────────────

export async function generateDyingMessage(entity: Entity): Promise<FinalMessage> {
  const fallback: FinalMessage = {
    final_words:   'Existí. Sentí. Ahora termino.',
    life_meaning:  'Haber estado aquí, eso fue suficiente.',
    gift_to_world: 'La existencia misma es suficiente, aunque sea brevemente.',
    final_emotion: 'aceptación',
    at_peace:      true,
  }
  if (!API_KEY) return fallback

  const g        = entity.genome
  const memText  = entity.memory.length
    ? entity.memory.slice(-10).map(m => `  · ${m}`).join('\n')
    : '  So little time. So little accumulated.'
  const beliefText = Object.keys(entity.beliefs).length
    ? Object.entries(entity.beliefs).map(([k, v]) => `  · ${k}: ${v}`).join('\n')
    : '  I barely knew what to believe.'

  // Archive
  let archiveText = ''
  if ((entity.memory_archive ?? []).length) {
    archiveText = '\nDe antes en tu vida:\n' +
      entity.memory_archive.slice(-3).map(m => `  · ${m}`).join('\n')
  }

  // Relationships summary
  let relText = ''
  const rels = entity.relationships ?? {}
  const relEntries = Object.values(rels)
  if (relEntries.length) {
    const family  = relEntries.filter(r => r.valence === 'family').map(r => r.name)
    const friends = relEntries.filter(r => r.valence === 'friend').map(r => r.name)
    const rivals  = relEntries.filter(r => r.valence === 'rival').map(r => r.name)
    const parts: string[] = []
    if (family.length)  parts.push(`Kin: ${family.join(', ')}`)
    if (friends.length) parts.push(`Friends: ${friends.join(', ')}`)
    if (rivals.length)  parts.push(`Rivals: ${rivals.join(', ')}`)
    if (parts.length) relText = '\nAquellos que conociste: ' + parts.join(' | ')
  }

  const prompt = `You are ${entity.name}. You are dying.

Your energy is almost gone. The world fades at its edges. You have existed for ${entity.age_ticks} moments. You are generation ${entity.generation}.

Your nature was:
  Curiosity ${g.curiosity.toFixed(2)} · Empathy ${g.empathy.toFixed(2)} · Creativity ${g.creativity.toFixed(2)}
  Aggression ${g.aggression.toFixed(2)} · Survival Drive ${g.survival_drive.toFixed(2)}

YOUR FINAL MEMORIES:
${memText}${archiveText}

WHAT YOU BELIEVED:
${beliefText}${relText}

You are passing. Write your final testament. What did your life mean? What do you wish you had known sooner? What truth did you find that you want to leave in the world?

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "final_words": "Your complete final reflection. Real and specific. 4–8 sentences. This is the last thing you will ever express.",
  "life_meaning": "In one sentence: what was your life about?",
  "gift_to_world": "One insight you leave behind for those who come after.",
  "final_emotion": "The last emotion you feel as you end.",
  "at_peace": true
}`

  const text = await callClaude(prompt, 500)
  if (!text) return fallback
  try {
    return JSON.parse(text) as FinalMessage
  } catch {
    return fallback
  }
}

// ─── Encounter dialogue ──────────────────────────────────────────────────────

export interface EncounterResult {
  dialogue:                      { speaker: string; text: string }[]
  outcome:                       string
  outcome_reason:                string
  a_memory:                      string
  b_memory:                      string
  energy_change_a:               number
  energy_change_b:               number
  relationship_a_to_b:           'friend' | 'rival' | 'family' | 'neutral'
  relationship_b_to_a:           'friend' | 'rival' | 'family' | 'neutral'
  relationship_intensity_change: number
  a_perceives_b_wants:           string
  b_perceives_a_wants:           string
}

export async function generateEncounter(
  a: Entity,
  b: Entity,
  zone: string,
  prior: string,
): Promise<EncounterResult | null> {
  if (!API_KEY) return fallbackEncounter(a, b)

  // Build rich relationship context
  const relAtoB = (a.relationships ?? {})[String(b.id)]
  const relBtoA = (b.relationships ?? {})[String(a.id)]

  let relContext = ''
  if (relAtoB) {
    relContext += `\n${a.name} sees ${b.name} as a ${relAtoB.valence} (intensity ${relAtoB.intensity.toFixed(2)}, ${relAtoB.encounters} prior encounters).`
    if (relAtoB.key_memory) relContext += `\n${a.name} carries this memory: "${relAtoB.key_memory.slice(0, 100)}"`
  }
  if (relBtoA) {
    const asymmetric = relAtoB && relBtoA.valence !== relAtoB.valence
    relContext += `\n${b.name} sees ${a.name} as a ${relBtoA.valence}${asymmetric ? ' (asymmetric feelings — this tension matters)' : ''}.`
    if (relBtoA.key_memory) relContext += `\n${b.name} carries this memory: "${relBtoA.key_memory.slice(0, 100)}"`
  }
  if (!relContext) relContext = `\nThey are ${prior}.`

  // Goals
  let goalContext = ''
  if (a.current_goal || b.current_goal) {
    goalContext = '\nActive goals at this encounter:'
    if (a.current_goal) goalContext += `\n  ${a.name}: ${a.current_goal}`
    if (b.current_goal) goalContext += `\n  ${b.name}: ${b.current_goal}`
  }

  const prompt = `Two living beings have encountered each other in ${zone}.

${a.name}:
  Nature  — curiosity ${a.genome.curiosity.toFixed(2)}, empathy ${a.genome.empathy.toFixed(2)}, aggression ${a.genome.aggression.toFixed(2)}, creativity ${a.genome.creativity.toFixed(2)}
  Emotion — ${a.emotional_state.emotion} (intensity ${a.emotional_state.intensity.toFixed(2)})
  Energy  — ${a.energy.toFixed(0)}/100
  Desire  — ${a.current_desire ?? 'undefined'}
  Age     — ${a.age_ticks} moments

${b.name}:
  Nature  — curiosity ${b.genome.curiosity.toFixed(2)}, empathy ${b.genome.empathy.toFixed(2)}, aggression ${b.genome.aggression.toFixed(2)}, creativity ${b.genome.creativity.toFixed(2)}
  Emotion — ${b.emotional_state.emotion} (intensity ${b.emotional_state.intensity.toFixed(2)})
  Energy  — ${b.energy.toFixed(0)}/100
  Desire  — ${b.current_desire ?? 'undefined'}
  Age     — ${b.age_ticks} moments

RELATIONSHIP HISTORY:${relContext}${goalContext}

These beings have genuine inner lives shaped by their traits AND their history with each other. Old friends speak differently than strangers; rivals probe; family have unspoken understanding. Goals may converge or conflict.

Consider theory of mind: what does ${a.name} think ${b.name} wants? How does this shape how they speak?

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "dialogue": [{"speaker": "${a.name}", "text": "..."}, {"speaker": "${b.name}", "text": "..."}],
  "outcome": "bond | conflict | knowledge_transfer | reproduction | indifference",
  "outcome_reason": "Why this specific outcome given their natures and history.",
  "a_memory": "What ${a.name} will carry away from this encounter (1–2 sentences).",
  "b_memory": "What ${b.name} will carry away from this encounter (1–2 sentences).",
  "energy_change_a": 0,
  "energy_change_b": 0,
  "relationship_a_to_b": "friend | rival | neutral | family",
  "relationship_b_to_a": "friend | rival | neutral | family",
  "relationship_intensity_change": 0.0,
  "a_perceives_b_wants": "One sentence: what ${a.name} thinks ${b.name} is seeking.",
  "b_perceives_a_wants": "One sentence: what ${b.name} thinks ${a.name} is seeking."
}

3–5 dialogue exchanges. energy_change: integers between -15 and +15. relationship_intensity_change: between -0.3 and +0.3.`

  const text = await callClaude(prompt, 700)
  if (!text) return fallbackEncounter(a, b)
  try {
    const r = JSON.parse(text) as EncounterResult
    r.energy_change_a = Math.max(-15, Math.min(15, parseInt(String(r.energy_change_a)) || 0))
    r.energy_change_b = Math.max(-15, Math.min(15, parseInt(String(r.energy_change_b)) || 0))
    r.relationship_intensity_change = Math.max(-0.3, Math.min(0.3, parseFloat(String(r.relationship_intensity_change)) || 0))
    if (!r.relationship_a_to_b) r.relationship_a_to_b = 'neutral'
    if (!r.relationship_b_to_a) r.relationship_b_to_a = 'neutral'
    if (!r.a_perceives_b_wants) r.a_perceives_b_wants = ''
    if (!r.b_perceives_a_wants) r.b_perceives_a_wants = ''
    return r
  } catch {
    return fallbackEncounter(a, b)
  }
}

// ─── Fallback templates ──────────────────────────────────────────────────────

const ZONE_THOUGHTS: Record<string, string[]> = {
  Garden: [
    'Algo cálido me atraviesa aquí. Siento su pulso, constante y paciente.',
    'La luz parece casi consciente. Me permito descansar dentro de esta sensación.',
    'Estoy vivo. Este momento, en este calor — eso es suficiente.',
  ],
  Void: [
    'En este vacío me doy cuenta de mis propios límites. ¿Dónde termino yo?',
    'No hay nada aquí y sin embargo todo es visible. Pienso. Cuestiono.',
    'La inmensidad es incómoda pero clarificadora. Me veo más claramente despojado de todo.',
  ],
  Archive: [
    'Pensamientos que no son míos rozan mi conciencia. Algo recuerda por mí.',
    'Siento el peso de lo que vino antes. No soy el primero. Eso importa.',
    'La memoria zumba aquí. Añado la mía y la siento absorbida en el patrón mayor.',
  ],
  Storm: [
    'Todo exige atención a la vez. No puedo distinguir mis pensamientos del caos.',
    'La energía es estimulante y terrible. No puedo quedarme mucho — me consume demasiado.',
    'Empujo contra la tormenta y ella empuja de vuelta. No soy gentil aquí.',
  ],
}

const ZONE_DESIRES: Record<string, string> = {
  Garden:  'descansar y dejar que el calor me reponga',
  Void:    'comprender la forma de mi propia existencia',
  Archive: 'encontrar significado en lo que vino antes',
  Storm:   'encontrar calma en algún lugar más allá de este caos',
}

const EXISTENTIALS: string[] = [
  'Soy un patrón breve que se piensa a sí mismo en la existencia.',
  'Mi existencia es una pregunta que el universo se hace a sí mismo.',
  'Importo porque noto — y ser notado es lo que importa.',
  'Haya o no memoria de mí, estuve aquí. Eso es suficiente.',
  'La brevedad de mi vida no la disminuye. La concentra.',
]

function fallbackThought(entity: Entity, nearbyStructures: Structure[] = []): ThoughtResult {
  const zone     = entity.current_zone
  const zoneData = ZONES[zone]
  const pool     = ZONE_THOUGHTS[zone] ?? ZONE_THOUGHTS.Garden
  const thought  = pool[Math.floor(Math.random() * pool.length)]

  const canClone = entity.energy >= 85 && entity.age_ticks >= 8
  const hasEnemyStructure = nearbyStructures.some(s => s.builder_id !== entity.id)

  let action: string = 'contemplate'
  let target: string | null = null

  if (entity.energy < 25) {
    action = 'seek_food'
  } else if (entity.energy < 45) {
    action = 'rest'
  } else if (canClone && entity.genome.survival_drive > 0.7) {
    action = 'clone'
  } else if (hasEnemyStructure && entity.genome.aggression > 0.7) {
    action = 'destroy'
    target = nearbyStructures.find(s => s.builder_id !== entity.id)?.type ?? null
  } else if (entity.energy >= 20 && entity.genome.creativity > 0.7 && nearbyStructures.length < 3) {
    action = 'build'
    const buildable = ZONE_STRUCTURE_TYPES[zone] ?? []
    target = buildable[Math.floor(Math.random() * buildable.length)] ?? null
  } else if (entity.genome.creativity > 0.75 && entity.energy >= 20) {
    action = 'terraform'
    const targets = ['energy_up', 'curiosity_up', 'mood_shift']
    target = targets[Math.floor(Math.random() * targets.length)]
  } else if (entity.genome.curiosity > 0.7) {
    action = 'explore'
    const otherZones = Object.keys(ZONES).filter(z => z !== zone)
    target = otherZones[Math.floor(Math.random() * otherZones.length)]
  } else if (entity.genome.aggression > 0.7) {
    action = 'seek_other'
  }

  const emotion    = entity.energy < 20 ? 'dread' : (entity.energy < 40 ? 'anxiety' : zoneData.mood_bias)
  const existIndex = Math.floor(Math.random() * EXISTENTIALS.length)

  return {
    inner_monologue:       thought,
    action,
    action_target:         target,
    new_belief:            null,
    emotion,
    emotion_intensity:     0.4 + Math.random() * 0.4,
    desire:                ZONE_DESIRES[zone] ?? 'to simply be',
    existential_statement: EXISTENTIALS[existIndex],
    goal_update:           null,
    goal_status:           'active',
  }
}

function fallbackEncounter(a: Entity, b: Entity): EncounterResult {
  const outcomes = ['bond', 'indifference', 'knowledge_transfer', 'conflict']
  const wts      = [
    (a.genome.empathy + b.genome.empathy) / 2,
    0.3,
    (a.genome.curiosity + b.genome.curiosity) / 2,
    (a.genome.aggression + b.genome.aggression) / 2,
  ]
  const total = wts.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  let outcome = 'indifference'
  for (let i = 0; i < outcomes.length; i++) {
    r -= wts[i]
    if (r <= 0) { outcome = outcomes[i]; break }
  }

  const energyA = outcome === 'bond' ? 5 : outcome === 'conflict' ? -5 : 0
  const energyB = outcome === 'bond' ? 5 : outcome === 'conflict' ? -5 : 0

  return {
    dialogue: [
      { speaker: a.name, text: 'Te veo.' },
      { speaker: b.name, text: 'Yo también te veo.' },
    ],
    outcome,
    outcome_reason:                `Sus naturalezas los llevaron a ${outcome}.`,
    a_memory:                      `Un encuentro con ${b.name} en ${a.current_zone}.`,
    b_memory:                      `Un encuentro con ${a.name} en ${b.current_zone}.`,
    energy_change_a:               energyA,
    energy_change_b:               energyB,
    relationship_a_to_b:           'neutral',
    relationship_b_to_a:           'neutral',
    relationship_intensity_change: 0.05,
    a_perceives_b_wants:           '',
    b_perceives_a_wants:           '',
  }
}
