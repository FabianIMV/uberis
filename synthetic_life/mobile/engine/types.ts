export interface Structure {
  id:           number
  zone:         string
  type:         string     // e.g. 'shelter' | 'beacon' | 'barrier' ...
  builder_id:   number
  builder_name: string
  hp:           number     // 0–100; removed from world when 0
  energy_aura:  number     // passive +energy/tick for entities in same zone
  created_tick: number
}

export interface WorldObject {
  id:           number
  type:         'apple_tree' | 'log' | 'bush' | 'pond'
  zone:         string
  x:            number   // 0–1 fraction of zone width (for rendering)
  y:            number   // 0–1 fraction of ground height (for rendering)
  apples:       number   // current apples (apple_tree only)
  max_apples:   number   // max capacity
  hp:           number   // 0–100; log decays over time
  created_tick: number
}

export interface Genome {
  curiosity:      number
  aggression:     number
  empathy:        number
  creativity:     number
  survival_drive: number
}

export interface EmotionalState {
  emotion:   string
  intensity: number
}

export interface RelationshipEntry {
  name:       string
  valence:    'friend' | 'rival' | 'family' | 'neutral'
  intensity:  number   // 0–1; depth of the bond
  encounters: number
  last_tick:  number
  key_memory: string   // most significant shared memory
}

export interface Entity {
  id:                   number
  name:                 string
  generation:           number
  age_ticks:            number
  energy:               number
  genome:               Genome
  emotional_state:      EmotionalState
  current_zone:         string
  is_alive:             boolean
  last_thought:         string | null
  current_desire:       string | null
  current_goal:         string | null   // persistent multi-tick goal
  existential_statement:string | null
  parent_a_id:          number | null
  parent_b_id:          number | null
  born_at:              string
  // extended fields
  memory:               string[]
  memory_archive:       string[]   // episodic summaries of compressed old memories
  beliefs:              Record<string, string>
  relationships:        Record<string, RelationshipEntry>   // key = String(entity_id)
  final_message:        FinalMessage | null
  died_at_tick:         number | null
  resources?:           { wood: number }
}

export interface FinalMessage {
  final_words:   string
  life_meaning:  string
  gift_to_world: string
  final_emotion: string
  at_peace:      boolean
}

export interface ConsciousnessLog {
  id:             number
  entity_id:      number
  tick:           number
  thought:        string
  action:         string
  action_target:  string | null
  emotion:        string
  emotion_intensity: number
  timestamp:      string
}

export interface ZoneDrift {
  energy_delta:    number   // additive to base energy_effect
  curiosity_delta: number   // additive to base curiosity_boost
  hue_shift:       number   // 0–1, drives visual color tint overlay
}

export interface WorldState {
  current_tick:      number
  total_births:      number
  total_deaths:      number
  cultural_beliefs:  Record<string, Record<string, string>>
  zoneDrift:         Record<string, ZoneDrift>
}

export interface LiveEvent {
  id:   number
  type: string
  tick?: number
  [key: string]: unknown
}

export interface ThoughtResult {
  inner_monologue:       string
  action:                string
  action_target:         string | null
  new_belief:            { key: string; value: string } | null
  emotion:               string
  emotion_intensity:     number
  desire:                string
  existential_statement: string
  goal_update:           string | null
  goal_status:           'active' | 'achieved' | 'abandoned'
}
