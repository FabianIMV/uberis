/**
 * Standalone simulation engine — runs entirely on the device.
 * No backend, no WebSocket. Ticks every 8 seconds.
 */
import {
  SEED_GENOMES, SEED_NAMES,
  getRandomName, createOffspringGenome, calculateEnergyDrain, shouldReproduce,
} from './evolution'
import {
  ZONES, ZONE_NAMES, WORLD_EVENTS, shouldFireWorldEvent, getWeightedEvent,
} from './world'
import { think, generateDyingMessage, generateEncounter } from './brain'
import type {
  Entity, WorldState, LiveEvent, ConsciousnessLog, FinalMessage,
} from './types'

export interface SimState {
  entities:     Entity[]
  worldState:   WorldState
  liveEvents:   LiveEvent[]
  logs:         Record<number, ConsciousnessLog[]>  // id -> last 20 logs
}

type Listener = (state: SimState) => void

const TICK_INTERVAL_MS    = 8_000
const MAX_POPULATION      = 20
const THINK_EVERY_N_TICKS = 3

let _idCounter = 1
let _logIdCounter = 1
let _eventIdCounter = 1

function nextId()    { return _idCounter++ }
function nextLogId() { return _logIdCounter++ }
function nextEvId()  { return _eventIdCounter++ }

export class Simulation {
  private state: SimState = {
    entities:   [],
    worldState: { current_tick: 0, total_births: 0, total_deaths: 0, cultural_beliefs: {} },
    liveEvents: [],
    logs:       {},
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private listeners = new Set<Listener>()

  // ── Public API ────────────────────────────────────────────────────────────

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): SimState { return this.state }

  start() {
    if (this.running) return
    this.running = true
    this._seed()
    this._scheduleNext(0)
  }

  stop() {
    this.running = false
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
  }

  feedEntity(id: number) {
    this._mutateEntity(id, e => ({ energy: Math.min(100, e.energy + 25) }))
    this._pushEvent({ type: 'entity_fed', name: this._findEntity(id)?.name ?? '', tick: this.state.worldState.current_tick })
    this._notify()
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  private _seed() {
    if (this.state.entities.length > 0) return
    const zones = ZONE_NAMES
    const entities: Entity[] = SEED_GENOMES.map((genome, i) => ({
      id:                    nextId(),
      name:                  SEED_NAMES[i],
      generation:            0,
      age_ticks:             0,
      energy:                100,
      genome,
      emotional_state:       { emotion: 'wonder', intensity: 0.8 },
      current_zone:          zones[i % zones.length],
      is_alive:              true,
      last_thought:          null,
      current_desire:        null,
      existential_statement: null,
      parent_a_id:           null,
      parent_b_id:           null,
      born_at:               new Date().toISOString(),
      memory:                [],
      beliefs:               { existence: 'I am. That is the first and most certain thing.' },
      final_message:         null,
      died_at_tick:          null,
    }))
    this._setState({ entities })
    this._notify()
  }

  // ── Tick scheduling ───────────────────────────────────────────────────────

  private _scheduleNext(delay = TICK_INTERVAL_MS) {
    if (!this.running) return
    this.timer = setTimeout(() => {
      this._tick().finally(() => this._scheduleNext())
    }, delay)
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  private async _tick() {
    const ws = { ...this.state.worldState }
    ws.current_tick += 1
    const tick = ws.current_tick

    let entities = this.state.entities.filter(e => e.is_alive)

    if (entities.length === 0) {
      this._seed()
      this._setState({ worldState: ws })
      this._notify()
      return
    }

    // ── World event ─────────────────────────────────────────────────────────
    let worldEventTemplate: typeof WORLD_EVENTS[0] | null = null
    if (shouldFireWorldEvent()) {
      worldEventTemplate = getWeightedEvent()
      this._pushEvent({
        type:        'world_event',
        description: worldEventTemplate.description,
        zone:        worldEventTemplate.zone,
        tick,
      })
    }

    // ── Process each entity in parallel ────────────────────────────────────
    const updated: Entity[] = await Promise.all(
      entities.map(e => this._processEntity({ ...e }, tick, ws, worldEventTemplate))
    )

    // Partition alive / dead
    const alive = updated.filter(e => e.is_alive)
    const dead  = updated.filter(e => !e.is_alive)

    // Grief
    for (const d of dead) {
      for (const a of alive) {
        if (a.memory.some(m => m.includes(d.name))) {
          a.energy   = Math.max(0, a.energy - a.genome.empathy * 10)
          a.emotional_state = { emotion: 'grief', intensity: Math.min(1, a.genome.empathy + 0.2) }
          a.memory   = [...a.memory, `${d.name} is gone. I feel the absence.`].slice(-10)
          this._pushEvent({ type: 'entity_grief', griever: a.name, lost: d.name, tick })
        }
      }
    }

    // ── Encounters ──────────────────────────────────────────────────────────
    await this._handleEncounters(alive, tick, ws)

    // ── Cultural beliefs ────────────────────────────────────────────────────
    ws.cultural_beliefs = this._buildCulturalBeliefs(alive)

    // ── Reproduction ────────────────────────────────────────────────────────
    if (alive.length < MAX_POPULATION) {
      await this._handleReproduction(alive, tick, ws)
    }

    // ── Auto-reseed ─────────────────────────────────────────────────────────
    if (alive.length < 2) this._seed()

    // ── Merge and commit ────────────────────────────────────────────────────
    // Keep dead entities in state (for detail views) but not in the living list
    const allEntities = [
      ...alive,
      ...dead,
      ...this.state.entities.filter(e => !e.is_alive && !dead.find(d => d.id === e.id)),
    ]

    this._setState({ entities: allEntities, worldState: ws })
    this._pushEvent({ type: 'tick', tick, population: alive.length })
    this._notify()
  }

  // ── Entity processing ──────────────────────────────────────────────────────

  private async _processEntity(
    e: Entity,
    tick: number,
    ws: WorldState,
    worldEvent: typeof WORLD_EVENTS[0] | null,
  ): Promise<Entity> {
    const zoneData = ZONES[e.current_zone] ?? ZONES.Garden

    // Zone effect
    e.energy += zoneData.energy_effect

    // World event effect
    if (worldEvent && (worldEvent.zone === null || worldEvent.zone === e.current_zone)) {
      e.energy += worldEvent.effect.energy
      e.emotional_state = { emotion: worldEvent.effect.emotion, intensity: 0.75 }
      e.memory = [...e.memory, `A ${worldEvent.type} came — ${worldEvent.description.slice(0, 90)}`].slice(-10)
    }

    // Energy drain
    const drain = calculateEnergyDrain(e)
    e.energy = Math.max(0, Math.min(100, e.energy - drain))
    e.age_ticks += 1

    // Death
    if (e.energy <= 5) {
      const msg = await generateDyingMessage(e)
      e.is_alive      = false
      e.final_message = msg
      e.died_at_tick  = tick
      ws.total_deaths += 1
      this._appendLog({
        id:                nextLogId(),
        entity_id:         e.id,
        tick,
        thought:           msg.final_words,
        action:            'die',
        action_target:     null,
        emotion:           msg.final_emotion,
        emotion_intensity: 1.0,
        timestamp:         new Date().toISOString(),
      })
      this._pushEvent({
        type:        'entity_died',
        id:          e.id,
        name:        e.name,
        age_ticks:   e.age_ticks,
        final_words: msg.final_words,
        life_meaning:msg.life_meaning,
        at_peace:    msg.at_peace,
        tick,
      })
      return e
    }

    // Think (stagger entities so not all call at the same tick)
    if (tick % THINK_EVERY_N_TICKS === e.id % THINK_EVERY_N_TICKS) {
      const t = await think(e, tick, ws.cultural_beliefs)
      if (t) {
        e.last_thought          = t.inner_monologue
        e.emotional_state       = { emotion: t.emotion, intensity: t.emotion_intensity }
        e.current_desire        = t.desire
        e.existential_statement = t.existential_statement

        // New belief
        if (t.new_belief?.key) {
          const beliefs = { ...e.beliefs, [t.new_belief.key]: t.new_belief.value }
          const keys = Object.keys(beliefs)
          if (keys.length > 15) delete beliefs[keys[0]]
          e.beliefs = beliefs
        }

        // Act
        if (t.action === 'explore' && t.action_target && ZONES[t.action_target]) {
          e.current_zone = t.action_target
        } else if (t.action === 'rest') {
          e.energy = Math.min(100, e.energy + 5)
        } else if (t.action === 'seek_food') {
          e.energy = Math.min(100, e.energy + 8)
        }

        e.memory = [...e.memory, `Thought: ${e.last_thought?.slice(0, 110)}`].slice(-10)

        this._appendLog({
          id:                nextLogId(),
          entity_id:         e.id,
          tick,
          thought:           e.last_thought ?? '',
          action:            t.action,
          action_target:     t.action_target,
          emotion:           t.emotion,
          emotion_intensity: t.emotion_intensity,
          timestamp:         new Date().toISOString(),
        })

        this._pushEvent({
          type:                  'entity_thought',
          id:                    e.id,
          name:                  e.name,
          thought:               e.last_thought,
          emotion:               e.emotional_state,
          action:                t.action,
          zone:                  e.current_zone,
          existential_statement: e.existential_statement,
          tick,
        })
      }
    }

    return e
  }

  // ── Encounters ─────────────────────────────────────────────────────────────

  private async _handleEncounters(
    alive: Entity[],
    tick: number,
    ws: WorldState,
  ): Promise<void> {
    const byZone: Record<string, Entity[]> = {}
    for (const e of alive) {
      const z = e.current_zone || 'Garden'
      ;(byZone[z] ??= []).push(e)
    }

    for (const [zone, group] of Object.entries(byZone)) {
      if (group.length < 2 || Math.random() > 0.30) continue
      const idxA = Math.floor(Math.random() * group.length)
      let idxB = idxA
      while (idxB === idxA) idxB = Math.floor(Math.random() * group.length)
      const a = group[idxA], b = group[idxB]
      const prior = a.memory.some(m => m.includes(b.name)) ? 'acquaintances' : 'strangers'

      const result = await generateEncounter(a, b, zone, prior)
      if (!result) continue

      a.energy = Math.max(0, Math.min(100, a.energy + result.energy_change_a))
      b.energy = Math.max(0, Math.min(100, b.energy + result.energy_change_b))
      if (result.a_memory) a.memory = [...a.memory, `Met ${b.name}: ${result.a_memory}`].slice(-10)
      if (result.b_memory) b.memory = [...b.memory, `Met ${a.name}: ${result.b_memory}`].slice(-10)

      this._pushEvent({
        type:     'encounter',
        entity_a: { id: a.id, name: a.name },
        entity_b: { id: b.id, name: b.name },
        outcome:  result.outcome,
        dialogue: result.dialogue,
        zone,
        tick,
      })

      // Reproduction
      if (result.outcome === 'reproduction' && alive.length < MAX_POPULATION) {
        if (shouldReproduce(a, b)) {
          const child = this._createOffspring(a, b, tick, ws)
          alive.push(child)
        }
      }
    }
  }

  private _createOffspring(parentA: Entity, parentB: Entity | null, tick: number, ws: WorldState): Entity {
    const genome = createOffspringGenome(parentA.genome, parentB?.genome)
    const name   = getRandomName()
    const gen    = Math.max(parentA.generation, parentB?.generation ?? 0) + 1

    const child: Entity = {
      id:                    nextId(),
      name,
      generation:            gen,
      age_ticks:             0,
      energy:                70,
      genome,
      emotional_state:       { emotion: 'wonder', intensity: 0.9 },
      current_zone:          parentA.current_zone,
      is_alive:              true,
      last_thought:          null,
      current_desire:        null,
      existential_statement: null,
      parent_a_id:           parentA.id,
      parent_b_id:           parentB?.id ?? null,
      born_at:               new Date().toISOString(),
      memory:                [parentB ? `I was born of ${parentA.name} and ${parentB.name}` : `I emerged from ${parentA.name} alone`],
      beliefs:               { origin: parentB ? `I came from ${parentA.name} and ${parentB.name}` : `I came from ${parentA.name}` },
      final_message:         null,
      died_at_tick:          null,
    }
    ws.total_births += 1

    this._pushEvent({
      type:       'entity_born',
      name,
      generation: gen,
      parent_a:   parentA.name,
      parent_b:   parentB?.name ?? null,
      zone:       parentA.current_zone,
      tick,
    })

    return child
  }

  // ── Cultural beliefs ───────────────────────────────────────────────────────

  private _buildCulturalBeliefs(alive: Entity[]): Record<string, Record<string, string>> {
    const counts: Record<string, Record<string, number>> = {}
    const values: Record<string, Record<string, string>> = {}
    const pop:    Record<string, number> = {}

    for (const e of alive) {
      const z = e.current_zone || 'Garden'
      pop[z] = (pop[z] ?? 0) + 1
      for (const [k, v] of Object.entries(e.beliefs)) {
        ;(counts[z] ??= {})[k] = ((counts[z][k] ?? 0)) + 1
        ;(values[z] ??= {})[k] = String(v)
      }
    }

    const cultural: Record<string, Record<string, string>> = {}
    for (const [z, ks] of Object.entries(counts)) {
      const p = pop[z] ?? 1
      cultural[z] = {}
      for (const [k, cnt] of Object.entries(ks)) {
        if (cnt > p / 2) cultural[z][k] = values[z][k]
      }
    }
    return cultural
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _findEntity(id: number): Entity | undefined {
    return this.state.entities.find(e => e.id === id)
  }

  private _mutateEntity(id: number, fn: (e: Entity) => Partial<Entity>) {
    this._setState({
      entities: this.state.entities.map(e => e.id === id ? { ...e, ...fn(e) } : e),
    })
  }

  private _appendLog(log: ConsciousnessLog) {
    const prev = this.state.logs[log.entity_id] ?? []
    const next = [...prev, log].slice(-20)
    this._setState({ logs: { ...this.state.logs, [log.entity_id]: next } })
  }

  private _pushEvent(ev: Omit<LiveEvent, 'id'>) {
    const event = { ...ev, id: nextEvId() } as LiveEvent
    this._setState({ liveEvents: [event, ...this.state.liveEvents.slice(0, 59)] })
  }

  private _setState(partial: Partial<SimState>) {
    this.state = { ...this.state, ...partial }
  }

  private _notify() {
    const snap = this.state
    this.listeners.forEach(fn => fn(snap))
  }
}

// Singleton — one simulation for the whole app
export const simulation = new Simulation()
