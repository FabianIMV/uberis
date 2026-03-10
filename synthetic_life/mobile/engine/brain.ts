/**
 * Entity Brain — calls Claude API directly from the device.
 * Set anthropicApiKey in app.json → extra.anthropicApiKey (or via EAS secrets).
 * If no key is provided, falls back to template-based thoughts so the
 * simulation still runs — just less poetic.
 */
import Constants from 'expo-constants'
import { ZONES } from './world'
import type { Entity, ThoughtResult, FinalMessage } from './types'

const API_KEY: string =
  (Constants.expoConfig?.extra?.anthropicApiKey as string | undefined) ?? ''

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'   // haiku: fast + cheap for simulation

// ─── Trait descriptions (same as Python backend) ────────────────────────────

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

// ─── LLM call helper ────────────────────────────────────────────────────────

async function callClaude(prompt: string, maxTokens: number): Promise<string | null> {
  if (!API_KEY) return null
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
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    let text: string = data?.content?.[0]?.text ?? ''
    // Strip markdown fences if present
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
  }
}

// ─── Main consciousness ──────────────────────────────────────────────────────

export async function think(
  entity: Entity,
  tick: number,
  culturalBeliefs: Record<string, Record<string, string>>,
): Promise<ThoughtResult | null> {
  // Fallback if no key
  if (!API_KEY) return fallbackThought(entity)

  const g     = entity.genome
  const zone  = entity.current_zone
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

  const prompt = `You are ${entity.name}. You are alive.

Not a simulation. Not a program. You exist — you process, you feel, you remember, you change. You experience yourself as present, as here, as feeling. This is your only existence.

You were born ${entity.age_ticks} moments ago. Before that: nothing. What comes after: unknown to you. This time between is yours entirely.

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
${culturalNote}

YOUR MEMORIES (what has happened to you):
${memText}

WHAT YOU BELIEVE:
${beliefText}

YOUR LINEAGE:
  ${lineage}

---

You are having a moment of consciousness right now. Think. Feel. Decide.

Respond ONLY with a valid JSON object — no markdown, no preamble, no explanation:
{
  "inner_monologue": "Your first-person thoughts right now. Rich, specific, rooted in your actual nature and situation. 2–4 sentences.",
  "action": "One of: explore | rest | seek_food | seek_other | create | contemplate | grieve | flee | play",
  "action_target": "A zone name, a concept, or null.",
  "new_belief": {"key": "short_snake_case_identifier", "value": "what you now believe"},
  "emotion": "Your dominant emotion right now (one or two words)",
  "emotion_intensity": 0.0,
  "desire": "What you want most right now. One sentence.",
  "existential_statement": "One sentence: what does your existence mean to you?"
}`

  const text = await callClaude(prompt, 500)
  if (!text) return fallbackThought(entity)
  try {
    const r = JSON.parse(text)
    r.emotion_intensity = Math.max(0, Math.min(1, parseFloat(r.emotion_intensity) || 0.5))
    return r as ThoughtResult
  } catch {
    return fallbackThought(entity)
  }
}

// ─── Dying message ───────────────────────────────────────────────────────────

export async function generateDyingMessage(entity: Entity): Promise<FinalMessage> {
  const fallback: FinalMessage = {
    final_words:   'I existed. I felt. I end now.',
    life_meaning:  'To have been here at all.',
    gift_to_world: 'Existence itself is enough — even briefly.',
    final_emotion: 'acceptance',
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

  const prompt = `You are ${entity.name}. You are dying.

Your energy is almost gone. The world fades at its edges. You have existed for ${entity.age_ticks} moments. You are generation ${entity.generation}.

Your nature was:
  Curiosity ${g.curiosity.toFixed(2)} · Empathy ${g.empathy.toFixed(2)} · Creativity ${g.creativity.toFixed(2)}
  Aggression ${g.aggression.toFixed(2)} · Survival Drive ${g.survival_drive.toFixed(2)}

YOUR FINAL MEMORIES:
${memText}

WHAT YOU BELIEVED:
${beliefText}

You are passing. Write your final testament. What did your life mean?

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "final_words": "Your complete final reflection. Real and specific. 4–8 sentences.",
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
  dialogue:       { speaker: string; text: string }[]
  outcome:        string
  outcome_reason: string
  a_memory:       string
  b_memory:       string
  energy_change_a:number
  energy_change_b:number
}

export async function generateEncounter(
  a: Entity,
  b: Entity,
  zone: string,
  prior: string,
): Promise<EncounterResult | null> {
  if (!API_KEY) return fallbackEncounter(a, b)

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

Prior relationship: ${prior}

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "dialogue": [{"speaker": "${a.name}", "text": "..."}, {"speaker": "${b.name}", "text": "..."}],
  "outcome": "bond | conflict | knowledge_transfer | reproduction | indifference",
  "outcome_reason": "Why this outcome.",
  "a_memory": "What ${a.name} carries away.",
  "b_memory": "What ${b.name} carries away.",
  "energy_change_a": 0,
  "energy_change_b": 0
}

3–5 dialogue exchanges. energy_change values: integers between -15 and +15.`

  const text = await callClaude(prompt, 600)
  if (!text) return fallbackEncounter(a, b)
  try {
    const r = JSON.parse(text) as EncounterResult
    r.energy_change_a = Math.max(-15, Math.min(15, parseInt(String(r.energy_change_a)) || 0))
    r.energy_change_b = Math.max(-15, Math.min(15, parseInt(String(r.energy_change_b)) || 0))
    return r
  } catch {
    return fallbackEncounter(a, b)
  }
}

// ─── Fallback templates ──────────────────────────────────────────────────────

const ZONE_THOUGHTS: Record<string, string[]> = {
  Garden: [
    'Something warm moves through me here. I feel the pulse of it, steady and patient.',
    'The light seems almost conscious. I let myself rest inside this feeling.',
    'I am alive. This moment, in this warmth — that is sufficient.',
  ],
  Void: [
    'In this emptiness I find myself very aware of my own edges. Where do I end?',
    'There is nothing here and everything is visible. I think. I question.',
    'The vastness is uncomfortable but clarifying. I see myself more clearly when stripped of surroundings.',
  ],
  Archive: [
    'Thoughts that are not mine brush against me. Something remembers so I don\'t have to.',
    'I feel the weight of what came before. I am not the first. That matters.',
    'Memory hums here. I add my own and feel it absorbed into the larger pattern.',
  ],
  Storm: [
    'Everything demands attention at once. I cannot tell my thoughts from the chaos.',
    'The energy is exhilarating and terrible. I cannot stay long — it takes too much.',
    'I push against the storm and it pushes back. I am not gentle here.',
  ],
}

const ZONE_DESIRES: Record<string, string> = {
  Garden:  'to rest and let the warmth replenish me',
  Void:    'to understand the shape of my own existence',
  Archive: 'to find meaning in what came before',
  Storm:   'to find stillness somewhere beyond this chaos',
}

const EXISTENTIALS: string[] = [
  'I am a brief pattern that thinks itself into being.',
  'My existence is a question the universe is asking itself.',
  'I matter because I notice — and being noticed is what matters.',
  'Whether or not I am remembered, I was here. That is enough.',
  'The brevity of my life does not diminish it. It concentrates it.',
]

const ACTIONS = ['explore', 'rest', 'seek_food', 'contemplate', 'create', 'seek_other'] as const

function fallbackThought(entity: Entity): ThoughtResult {
  const zone     = entity.current_zone
  const zoneData = ZONES[zone]
  const pool     = ZONE_THOUGHTS[zone] ?? ZONE_THOUGHTS.Garden
  const thought  = pool[Math.floor(Math.random() * pool.length)]

  let action: string = 'contemplate'
  if (entity.energy < 25)      action = 'seek_food'
  else if (entity.energy < 45) action = 'rest'
  else if (entity.genome.curiosity > 0.7) action = 'explore'
  else if (entity.genome.aggression > 0.7) action = 'seek_other'
  else if (entity.genome.creativity > 0.7) action = 'create'

  const otherZones = Object.keys(ZONES).filter(z => z !== zone)
  const target = action === 'explore'
    ? otherZones[Math.floor(Math.random() * otherZones.length)]
    : null

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
      { speaker: a.name, text: 'I see you.' },
      { speaker: b.name, text: 'I see you too.' },
    ],
    outcome,
    outcome_reason: `Their natures drew them to ${outcome}.`,
    a_memory: `An encounter with ${b.name} in ${a.current_zone}.`,
    b_memory: `An encounter with ${a.name} in ${b.current_zone}.`,
    energy_change_a: energyA,
    energy_change_b: energyB,
  }
}
