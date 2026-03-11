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
  existential_statement:string | null
  parent_a_id:          number | null
  parent_b_id:          number | null
  born_at:              string
  // extended fields (always populated in standalone)
  memory:   string[]
  beliefs:  Record<string, string>
  final_message: FinalMessage | null
  died_at_tick:  number | null
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

export interface WorldState {
  current_tick:      number
  total_births:      number
  total_deaths:      number
  cultural_beliefs:  Record<string, Record<string, string>>
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
}
