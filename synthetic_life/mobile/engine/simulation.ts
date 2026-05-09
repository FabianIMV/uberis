/**
 * Standalone simulation engine — runs entirely on the device.
 * No backend, no WebSocket. Ticks every 8 seconds.
 * State is persisted to AsyncStorage so the world keeps living between sessions.
 */
import {
  SEED_GENOMES, SEED_NAMES,
  getRandomName, createOffspringGenome, calculateEnergyDrain, shouldReproduce,
  computeIntelligence, MAX_AGE_TICKS, ELDER_AGE_TICKS,
} from './evolution'
import {
  ZONES, ZONE_NAMES, WORLD_EVENTS, shouldFireWorldEvent, getWeightedEvent,
} from './world'
import { think, generateDyingMessage, generateEncounter, consolidateMemories } from './brain'
import { persistState, loadPersistedState } from './persistence'
import {
  openDB,
  dbInsertEntity, dbRecordDeath, dbInsertThought,
  dbInsertWorldEvent, dbInsertEncounter,
} from './database'
import {
  ZONE_STRUCTURE_TYPES, STRUCTURE_ENERGY_AURA,
} from './world'
import type {
  Entity, WorldState, LiveEvent, ConsciousnessLog, FinalMessage, Structure, RelationshipEntry, ZoneDrift, WorldObject,
} from './types'

export interface SimState {
  entities:     Entity[]
  worldState:   WorldState
  liveEvents:   LiveEvent[]
  logs:         Record<number, ConsciousnessLog[]>  // id -> last 20 logs
  structures:   Structure[]
  worldObjects: WorldObject[]
}

export interface CatchUpSummary {
  msAway:         number
  ticksSimulated: number
  births:         number
  deaths:         number
}

type Listener = (state: SimState) => void

const TICK_INTERVAL_MS    = 8_000
const MAX_POPULATION      = 20
const THINK_EVERY_N_TICKS = 3
const MAX_CATCHUP_TICKS   = 40
const MEMORY_CONSOLIDATION_THRESHOLD = 18   // compress when memory exceeds this
const MEMORY_CONSOLIDATION_EVERY     = 15   // check every N ticks per entity

let _idCounter = 1
let _logIdCounter = 1
let _eventIdCounter = 1
let _structIdCounter = 1
let _wobjIdCounter = 1

function nextId()      { return _idCounter++ }
function nextLogId()   { return _logIdCounter++ }
function nextEvId()    { return _eventIdCounter++ }
function nextStructId(){ return _structIdCounter++ }
function nextWobjId()  { return _wobjIdCounter++ }

export class Simulation {
  private state: SimState = {
    entities:   [],
    worldState: { current_tick: 0, total_births: 0, total_deaths: 0, cultural_beliefs: {}, zoneDrift: {} },
    liveEvents: [],
    logs:       {},
    structures: [],
    worldObjects: [],
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private listeners = new Set<Listener>()
  private _catchUpSummary: CatchUpSummary | null = null

  // ── Public API ────────────────────────────────────────────────────────────

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getState(): SimState { return this.state }

  getCatchUpSummary(): CatchUpSummary | null { return this._catchUpSummary }
  clearCatchUpSummary() { this._catchUpSummary = null }

  async save(): Promise<void> {
    await persistState(this.state)
  }

  async start() {
    if (this.running) return
    this.running = true

    openDB().catch(() => {})

    const saved = await loadPersistedState()
    if (saved) {
      const maxId = Math.max(0, ...saved.state.entities.map(e => e.id))
      if (maxId >= _idCounter) _idCounter = maxId + 1

      this._setState(saved.state)

      const msAway       = Date.now() - saved.savedAt
      const ticksMissed  = Math.floor(msAway / TICK_INTERVAL_MS)
      const ticksToRun   = Math.min(ticksMissed, MAX_CATCHUP_TICKS)

      if (ticksToRun > 0) {
        const { births, deaths } = this._catchUp(ticksToRun)
        this._catchUpSummary = { msAway, ticksSimulated: ticksToRun, births, deaths }
      }

      if (this.state.entities.filter(e => e.is_alive).length < 2) this._seed()
      this._notify()
    } else {
      this._seed()
    }

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

  bathEntity(id: number) {
    this._mutateEntity(id, e => ({
      emotional_state: { emotion: 'content', intensity: 0.7 },
      energy: Math.min(100, e.energy + 5),
      memory: [...e.memory, 'Me bañaron. El agua fresca calló el ruido dentro de mí.'].slice(-20),
    }))
    this._pushEvent({ type: 'entity_bathed', name: this._findEntity(id)?.name ?? '', tick: this.state.worldState.current_tick })
    this._notify()
  }

  addPlayerStructure(type: string, zone: string, aura: number): number {
    const id = -(Date.now() % 1_000_000)
    const s: Structure = {
      id, zone, type,
      builder_id:   0,
      builder_name: 'Player',
      hp:           100,
      energy_aura:  aura,
      created_tick: this.state.worldState.current_tick,
    }
    this._setState({ structures: [...(this.state.structures ?? []), s] })
    this._notify()
    return id
  }

  removePlayerStructure(id: number) {
    this._setState({ structures: (this.state.structures ?? []).filter(s => s.id !== id) })
    this._notify()
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  private _seed() {
    if (this.state.entities.filter(e => e.is_alive).length > 0) return
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
      current_goal:          null,
      existential_statement: null,
      parent_a_id:           null,
      parent_b_id:           null,
      born_at:               new Date().toISOString(),
      memory:                [],
      memory_archive:        [],
      beliefs:               { existence: 'I am. That is the first and most certain thing.' },
      relationships:         {},
      final_message:         null,
      died_at_tick:          null,
      resources:             { wood: 0 },
    }))
    this._setState({ entities })
    this._initWorldObjects()
    this._notify()
    for (const e of entities) dbInsertEntity(e, 0).catch(() => {})
  }

  // ── World objects ─────────────────────────────────────────────────────────

  private _initWorldObjects() {
    const objs: WorldObject[] = []
    // Garden: 4 apple trees, 2 bushes, 1 pond
    const zones: [string, number, number, number][] = [
      // [zone, trees, bushes, ponds]
      ['Garden',  4, 2, 1],
      ['Archive', 2, 1, 0],
      ['Void',    1, 0, 1],
      ['Storm',   1, 1, 0],
    ]
    const tick = this.state.worldState.current_tick
    for (const [zone, trees, bushes, ponds] of zones) {
      for (let i = 0; i < trees; i++) {
        objs.push({ id: nextWobjId(), type: 'apple_tree', zone, x: (i+1)/(trees+1), y: 0.2 + Math.random()*0.4, apples: 3+Math.floor(Math.random()*3), max_apples: 5, hp: 100, created_tick: tick })
      }
      for (let i = 0; i < bushes; i++) {
        objs.push({ id: nextWobjId(), type: 'bush', zone, x: (i+1)/(bushes+1)*0.8+0.1, y: 0.6+Math.random()*0.3, apples: 1+Math.floor(Math.random()*2), max_apples: 2, hp: 100, created_tick: tick })
      }
      for (let i = 0; i < ponds; i++) {
        objs.push({ id: nextWobjId(), type: 'pond', zone, x: 0.3+Math.random()*0.4, y: 0.75+Math.random()*0.15, apples: 0, max_apples: 0, hp: 100, created_tick: tick })
      }
    }
    this._setState({ worldObjects: objs })
  }

  private _tickWorldObjects(tick: number) {
    const objs = (this.state.worldObjects ?? []).map(o => {
      // Apple/bush regen every 12 ticks
      if ((o.type === 'apple_tree' || o.type === 'bush') && tick % 12 === 0 && o.apples < o.max_apples) {
        return { ...o, apples: Math.min(o.max_apples, o.apples + 1) }
      }
      // Logs decay hp over time
      if (o.type === 'log') {
        const hp = o.hp - 2
        if (hp <= 0) return null  // log disappears
        return { ...o, hp }
      }
      return o
    }).filter(Boolean) as WorldObject[]
    this._setState({ worldObjects: objs })
  }

  // ── Relationship helpers ──────────────────────────────────────────────────

  private _updateRelationship(
    entityA: Entity,
    entityB: Entity,
    result: {
      relationship_a_to_b: string
      relationship_b_to_a: string
      relationship_intensity_change: number
      a_memory: string
      b_memory: string
    },
    tick: number,
  ): void {
    const intensityChange = result.relationship_intensity_change ?? 0

    for (const [entity, other, valenceKey, memKey] of [
      [entityA, entityB, 'relationship_a_to_b', 'a_memory'],
      [entityB, entityA, 'relationship_b_to_a', 'b_memory'],
    ] as [Entity, Entity, string, string][]) {
      const rels = { ...(entity.relationships ?? {}) }
      const key  = String(other.id)
      const existing = rels[key] ?? { encounters: 0, intensity: 0.2, valence: 'neutral', name: other.name, last_tick: tick, key_memory: '' }
      const newIntensity = Math.max(0, Math.min(1, (existing.intensity ?? 0.2) + intensityChange))

      rels[key] = {
        name:       other.name,
        valence:    ((result as Record<string, string>)[valenceKey] ?? existing.valence ?? 'neutral') as RelationshipEntry['valence'],
        intensity:  Math.round(newIntensity * 1000) / 1000,
        encounters: (existing.encounters ?? 0) + 1,
        last_tick:  tick,
        key_memory: ((result as Record<string, string>)[memKey] ?? '').slice(0, 120),
      }
      entity.relationships = rels
    }
  }

  // ── Silent catch-up (no Claude, pure logic) ───────────────────────────────

  private _catchUp(ticksToRun: number): { births: number; deaths: number } {
    let births = 0
    let deaths = 0
    const ws   = { ...this.state.worldState }
    let alive  = this.state.entities.filter(e => e.is_alive).map(e => ({ ...e }))
    const dead = this.state.entities.filter(e => !e.is_alive).map(e => ({ ...e }))

    for (let t = 0; t < ticksToRun; t++) {
      ws.current_tick += 1
      const tick = ws.current_tick
      const next: Entity[] = []

      for (const e of alive) {
        const zoneData = ZONES[e.current_zone] ?? ZONES.Garden
        e.energy = Math.max(0, Math.min(100, e.energy + zoneData.energy_effect))
        e.energy = Math.max(0, e.energy - calculateEnergyDrain(e))

        if (e.age_ticks > ELDER_AGE_TICKS) {
          const factor = (e.age_ticks - ELDER_AGE_TICKS) / (MAX_AGE_TICKS - ELDER_AGE_TICKS)
          e.energy = Math.max(0, e.energy - factor * 2)
        }

        e.age_ticks += 1

        if (e.age_ticks >= MAX_AGE_TICKS || e.energy <= 5) {
          dead.push({
            ...e, is_alive: false, died_at_tick: tick,
            final_message: {
              final_words:   e.age_ticks >= MAX_AGE_TICKS
                ? 'Completé mi ciclo mientras el mundo dormía.'
                : 'La energía se agotó. El mundo siguió sin mí.',
              life_meaning:  `Existí ${e.age_ticks} momentos. Eso fue suficiente.`,
              gift_to_world: 'El recuerdo de haber sido.',
              final_emotion: 'paz',
              at_peace:      true,
            },
          })
          ws.total_deaths += 1
          deaths++
          continue
        }

        if (shouldClone(e) && alive.length + next.length < MAX_POPULATION) {
          e.energy -= 30
          const child: Entity = {
            id: nextId(), name: getRandomName(),
            generation: e.generation + 1, age_ticks: 0, energy: 70,
            genome: createOffspringGenome(e.genome),
            emotional_state: { emotion: 'wonder', intensity: 0.9 },
            current_zone: e.current_zone, is_alive: true,
            last_thought: null, current_desire: null, current_goal: null, existential_statement: null,
            parent_a_id: e.id, parent_b_id: null,
            born_at: new Date(Date.now() - (ticksToRun - t) * TICK_INTERVAL_MS).toISOString(),
            memory: [`Nací de ${e.name} mientras el mundo dormía.`],
            memory_archive: [],
            beliefs: { origin: `Vengo de ${e.name}.` },
            relationships: {
              [String(e.id)]: { name: e.name, valence: 'family', intensity: 0.8, encounters: 0, last_tick: tick, key_memory: `Nací de ${e.name}` },
            },
            final_message: null, died_at_tick: null,
          }
          // Parent knows offspring
          const parentRels = { ...(e.relationships ?? {}) }
          parentRels[String(child.id)] = { name: child.name, valence: 'family', intensity: 0.9, encounters: 0, last_tick: tick, key_memory: `Traje ${child.name} al mundo` }
          e.relationships = parentRels

          next.push(child)
          ws.total_births += 1
          births++
        }

        next.push(e)
      }

      // Sexual reproduction
      if (next.length >= 2 && next.length < MAX_POPULATION && Math.random() < 0.08) {
        const pool = next.filter(e => e.energy > 65)
        if (pool.length >= 2) {
          const a = pool[Math.floor(Math.random() * pool.length)]
          const b = pool.filter(e => e.id !== a.id)[0]
          if (b && shouldReproduce(a, b)) {
            const child: Entity = {
              id: nextId(), name: getRandomName(),
              generation: Math.max(a.generation, b.generation) + 1,
              age_ticks: 0, energy: 70,
              genome: createOffspringGenome(a.genome, b.genome),
              emotional_state: { emotion: 'wonder', intensity: 0.9 },
              current_zone: a.current_zone, is_alive: true,
              last_thought: null, current_desire: null, current_goal: null, existential_statement: null,
              parent_a_id: a.id, parent_b_id: b.id,
              born_at: new Date(Date.now() - (ticksToRun - t) * TICK_INTERVAL_MS).toISOString(),
              memory: [`Nací de ${a.name} y ${b.name} mientras el mundo dormía.`],
              memory_archive: [],
              beliefs: { origin: `Vengo de ${a.name} y ${b.name}.` },
              relationships: {
                [String(a.id)]: { name: a.name, valence: 'family', intensity: 0.8, encounters: 0, last_tick: tick, key_memory: `Nací de ${a.name}` },
                [String(b.id)]: { name: b.name, valence: 'family', intensity: 0.8, encounters: 0, last_tick: tick, key_memory: `Nací de ${b.name}` },
              },
              final_message: null, died_at_tick: null,
            }
            ws.total_births += 1
            births++
            next.push(child)
          }
        }
      }

      alive = next
      if (alive.length === 0) break
    }

    this._setState({
      entities:   [...alive, ...dead],
      worldState: ws,
      liveEvents: [],
      logs:       this.state.logs,
    })

    return { births, deaths }
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

    // Tick world objects (apple regen, log decay)
    this._tickWorldObjects(tick)

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
      const wev = {
        type:        'world_event',
        description: worldEventTemplate.description,
        zone:        worldEventTemplate.zone,
        tick,
      }
      this._pushEvent(wev)
      dbInsertWorldEvent({ ...wev, id: 0 }).catch(() => {})
    }

    // ── Apply structure energy auras ────────────────────────────────────────
    let structures = [...(this.state.structures ?? [])]
    for (const entity of entities) {
      const aura = structures
        .filter(s => s.zone === entity.current_zone)
        .reduce((sum, s) => sum + s.energy_aura, 0)
      if (aura > 0) entity.energy = Math.min(100, entity.energy + aura)
    }
    structures = structures.filter(s => s.hp > 0)

    // ── Process each entity in parallel ────────────────────────────────────
    const results = await Promise.all(
      entities.map(e => this._processEntity({ ...e }, tick, ws, worldEventTemplate, structures))
    )
    const updated = results.map(r => r.entity)
    const clones  = results.flatMap(r => r.child ? [r.child] : [])

    const alive = [...updated.filter(e => e.is_alive), ...clones]
    const dead  = updated.filter(e => !e.is_alive)

    // ── Grief (relationship-aware) ──────────────────────────────────────────
    for (const d of dead) {
      for (const a of alive) {
        const rel = (a.relationships ?? {})[String(d.id)]
        const knewThem = rel || a.memory.some(m => m.includes(d.name))
        if (!knewThem) continue

        const bondIntensity = rel?.intensity ?? 0.3
        const griefMultiplier = 1.0 + bondIntensity
        a.energy = Math.max(0, a.energy - a.genome.empathy * 10 * griefMultiplier)
        a.emotional_state = { emotion: 'grief', intensity: Math.min(1, a.genome.empathy + 0.3) }

        const valence = rel?.valence
        let griefMemory: string
        if (valence === 'family')  griefMemory = `${d.name}, mi kin, se ha ido. La ausencia es una herida.`
        else if (valence === 'friend') griefMemory = `${d.name}, mi amigo, se ha ido. Siento la pérdida profundamente.`
        else if (valence === 'rival')  griefMemory = `${d.name} se ha ido. La ausencia de mi rival me deja inesperadamente vacío.`
        else                           griefMemory = `${d.name} se ha ido. Siento su ausencia.`

        a.memory = [...a.memory, griefMemory].slice(-20)
        this._pushEvent({ type: 'entity_grief', griever: a.name, lost: d.name, relationship: valence ?? 'known', tick })
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

    // ── Merge structures ────────────────────────────────────────────────────
    for (const r of results) {
      if (r.builtStructure) structures.push(r.builtStructure)
      if (r.damagedStructureId != null) {
        const s = structures.find(s => s.id === r.damagedStructureId)
        if (s) s.hp = Math.max(0, s.hp - 30)
      }
    }
    const finalStructures = structures.filter(s => s.hp > 0)

    // ── Zone drift: decay + apply terraform results ─────────────────────────
    const drift = { ...(ws.zoneDrift ?? {}) }
    for (const zone of ZONE_NAMES) {
      const d = drift[zone] ?? { energy_delta: 0, curiosity_delta: 0, hue_shift: 0 }
      // Slow decay toward zero (0.98^tick means halved after ~34 ticks ≈ 4.5 min)
      drift[zone] = {
        energy_delta:    d.energy_delta    * 0.98,
        curiosity_delta: d.curiosity_delta * 0.98,
        hue_shift:       d.hue_shift       * 0.98,
      }
    }
    for (const r of results) {
      if (r.terraformZone && r.terraformDelta) {
        const d = drift[r.terraformZone] ?? { energy_delta: 0, curiosity_delta: 0, hue_shift: 0 }
        drift[r.terraformZone] = {
          energy_delta:    Math.max(-1.5, Math.min(1.5, d.energy_delta    + r.terraformDelta.energy_delta)),
          curiosity_delta: Math.max(-0.4, Math.min(0.4, d.curiosity_delta + r.terraformDelta.curiosity_delta)),
          hue_shift:       Math.max(0,    Math.min(1,   d.hue_shift       + r.terraformDelta.hue_shift)),
        }
      }
    }
    ws.zoneDrift = drift

    const allEntities = [
      ...alive,
      ...dead,
      ...this.state.entities.filter(e => !e.is_alive && !dead.find(d => d.id === e.id)),
    ]

    // Trim dead entities to last 50 to keep state size bounded
    const deadTrimmed = allEntities.filter(e => !e.is_alive)
      .sort((a, b) => (b.died_at_tick ?? 0) - (a.died_at_tick ?? 0))
      .slice(0, 50)
    const trimmedEntities = [...allEntities.filter(e => e.is_alive), ...deadTrimmed]

    this._setState({ entities: trimmedEntities, worldState: ws, structures: finalStructures })
    this._pushEvent({ type: 'tick', tick, population: alive.length })
    this._notify()
    persistState(this.state).catch(() => {})
  }

  // ── Entity processing ──────────────────────────────────────────────────────

  private async _processEntity(
    e: Entity,
    tick: number,
    ws: WorldState,
    worldEvent: typeof WORLD_EVENTS[0] | null,
    structures: Structure[],
  ): Promise<{ entity: Entity; child: Entity | null; builtStructure: Structure | null; damagedStructureId: number | null; terraformZone: string | null; terraformDelta: ZoneDrift | null }> {
    const baseZone  = ZONES[e.current_zone] ?? ZONES.Garden
    const drift     = ws.zoneDrift?.[e.current_zone] ?? { energy_delta: 0, curiosity_delta: 0, hue_shift: 0 }
    const zoneData  = {
      ...baseZone,
      energy_effect:   baseZone.energy_effect   + drift.energy_delta,
      curiosity_boost: baseZone.curiosity_boost  + drift.curiosity_delta,
    }

    e.energy += zoneData.energy_effect

    if (worldEvent && (worldEvent.zone === null || worldEvent.zone === e.current_zone)) {
      e.energy += worldEvent.effect.energy
      e.emotional_state = { emotion: worldEvent.effect.emotion, intensity: 0.75 }
      e.memory = [...e.memory, `A ${worldEvent.type} came — ${worldEvent.description.slice(0, 90)}`].slice(-20)
    }

    const drain = calculateEnergyDrain(e)
    e.energy = Math.max(0, Math.min(100, e.energy - drain))

    if (e.age_ticks > ELDER_AGE_TICKS) {
      const ageFactor = (e.age_ticks - ELDER_AGE_TICKS) / (MAX_AGE_TICKS - ELDER_AGE_TICKS)
      e.energy = Math.max(0, e.energy - ageFactor * 2)
    }

    e.age_ticks += 1

    // ── Memory consolidation ───────────────────────────────────────────────
    if (tick % MEMORY_CONSOLIDATION_EVERY === e.id % MEMORY_CONSOLIDATION_EVERY) {
      const mems = e.memory ?? []
      if (mems.length >= MEMORY_CONSOLIDATION_THRESHOLD) {
        const toCompress = mems.slice(0, 10)
        const remaining  = mems.slice(10)
        const compressed = await consolidateMemories(e, toCompress)
        const archive = [...(e.memory_archive ?? []), ...compressed].slice(-20)
        e.memory_archive = archive
        e.memory = remaining
      }
    }

    // ── Old-age death ─────────────────────────────────────────────────────
    if (e.age_ticks >= MAX_AGE_TICKS) {
      const msg = await generateDyingMessage(e)
      e.is_alive      = false
      e.final_message = msg
      e.died_at_tick  = tick
      ws.total_deaths += 1
      const deathLog: ConsciousnessLog = {
        id: nextLogId(), entity_id: e.id, tick,
        thought: msg.final_words, action: 'die', action_target: null,
        emotion: msg.final_emotion, emotion_intensity: 1.0,
        timestamp: new Date().toISOString(),
      }
      this._appendLog(deathLog)
      dbInsertThought(deathLog).catch(() => {})
      dbRecordDeath(e, 'old_age').catch(() => {})
      this._pushEvent({
        type: 'entity_died', id: e.id, name: e.name,
        age_ticks: e.age_ticks, final_words: msg.final_words,
        life_meaning: msg.life_meaning, at_peace: msg.at_peace,
        cause: 'old_age', tick,
      })
      return { entity: e, child: null, builtStructure: null, damagedStructureId: null, terraformZone: null, terraformDelta: null }
    }

    // ── Energy death ──────────────────────────────────────────────────────
    if (e.energy <= 5) {
      const msg = await generateDyingMessage(e)
      e.is_alive      = false
      e.final_message = msg
      e.died_at_tick  = tick
      ws.total_deaths += 1
      const deathLog: ConsciousnessLog = {
        id:                nextLogId(),
        entity_id:         e.id,
        tick,
        thought:           msg.final_words,
        action:            'die',
        action_target:     null,
        emotion:           msg.final_emotion,
        emotion_intensity: 1.0,
        timestamp:         new Date().toISOString(),
      }
      this._appendLog(deathLog)
      dbInsertThought(deathLog).catch(() => {})
      dbRecordDeath(e, 'energy').catch(() => {})
      this._pushEvent({
        type:        'entity_died',
        id:          e.id,
        name:        e.name,
        age_ticks:   e.age_ticks,
        final_words: msg.final_words,
        life_meaning:msg.life_meaning,
        at_peace:    msg.at_peace,
        cause:       'energy',
        tick,
      })
      return { entity: e, child: null, builtStructure: null, damagedStructureId: null, terraformZone: null, terraformDelta: null }
    }

    // ── Think ─────────────────────────────────────────────────────────────
    const intel      = computeIntelligence(e)
    const thinkEvery = intel > 60 ? 2 : THINK_EVERY_N_TICKS

    let child: Entity | null = null
    let builtStructure: Structure | null = null
    let damagedStructureId: number | null = null
    let terraformZone: string | null = null
    let terraformDelta: ZoneDrift | null = null

    const nearbyStructures = structures.filter(s => s.zone === e.current_zone)

    if (tick % thinkEvery === e.id % thinkEvery) {
      const t = await think(e, tick, ws.cultural_beliefs, nearbyStructures, this.state.worldObjects ?? [])
      if (t) {
        e.last_thought          = t.inner_monologue
        e.emotional_state       = { emotion: t.emotion, intensity: t.emotion_intensity }
        e.current_desire        = t.desire
        e.existential_statement = t.existential_statement

        // Update goal
        if (t.goal_update) {
          e.current_goal = t.goal_update
        } else if (t.goal_status === 'achieved' || t.goal_status === 'abandoned') {
          e.current_goal = null
        }

        // New belief
        if (t.new_belief?.key) {
          const beliefs = { ...e.beliefs, [t.new_belief.key]: t.new_belief.value }
          const keys = Object.keys(beliefs)
          if (keys.length > 15) delete beliefs[keys[0]]
          e.beliefs = beliefs
        }

        // ── Execute action ────────────────────────────────────────────────
        switch (t.action) {
          case 'explore':
            if (t.action_target && ZONES[t.action_target]) {
              e.current_zone = t.action_target
              e.energy = Math.max(0, e.energy - 3)
              e.memory = [...e.memory, `Exploré hasta ${t.action_target}`].slice(-20)
            }
            break

          case 'rest':
            e.energy = Math.min(100, e.energy + 8)
            break

          case 'seek_food':
            e.energy = Math.min(100, e.energy + 12)
            e.memory = [...e.memory, 'Encontré alimento y me recuperé.'].slice(-20)
            break

          case 'pick_apple': {
            const objs = this.state.worldObjects ?? []
            const treeInZone = objs.find(o => o.zone === e.current_zone && (o.type === 'apple_tree' || o.type === 'bush') && o.apples > 0)
            if (treeInZone) {
              e.energy = Math.min(100, e.energy + 18)
              const updated = objs.map(o => o.id === treeInZone.id ? { ...o, apples: o.apples - 1 } : o)
              this._setState({ worldObjects: updated })
              e.memory = [...e.memory, `Tomé una manzana del árbol. Dulce y real.`].slice(-20)
              this._pushEvent({ type: 'pick_apple', entity: e.name, zone: e.current_zone, tick })
            } else {
              // No apples — fall back to rest
              e.energy = Math.min(100, e.energy + 4)
            }
            break
          }

          case 'chop_tree': {
            const objs = this.state.worldObjects ?? []
            const tree = objs.find(o => o.zone === e.current_zone && o.type === 'apple_tree' && o.hp > 0)
            if (tree && e.energy >= 10) {
              e.energy -= 10
              const newHp = tree.hp - 40
              let updated: WorldObject[]
              if (newHp <= 0) {
                // Tree falls, becomes a log
                const log: WorldObject = { id: nextWobjId(), type: 'log', zone: e.current_zone, x: tree.x, y: tree.y, apples: 0, max_apples: 0, hp: 80, created_tick: tick }
                updated = objs.filter(o => o.id !== tree.id).concat(log)
                // Entity gains wood
                e.resources = { ...(e.resources ?? { wood: 0 }), wood: (e.resources?.wood ?? 0) + 2 }
                e.memory = [...e.memory, `Talé un árbol. Ahora tengo madera. La destrucción también es creación.`].slice(-20)
                this._pushEvent({ type: 'tree_chopped', entity: e.name, zone: e.current_zone, tick })
              } else {
                updated = objs.map(o => o.id === tree.id ? { ...o, hp: newHp } : o)
                e.memory = [...e.memory, `Golpeé el árbol. Cruje pero resiste.`].slice(-20)
              }
              this._setState({ worldObjects: updated })
            }
            break
          }

          case 'build': {
            const structType = t.action_target ?? (ZONE_STRUCTURE_TYPES[e.current_zone]?.[0])
            if (structType && e.energy >= 15) {
              e.energy -= 15
              const aura = STRUCTURE_ENERGY_AURA[structType] ?? 1
              builtStructure = {
                id:           nextStructId(),
                zone:         e.current_zone,
                type:         structType,
                builder_id:   e.id,
                builder_name: e.name,
                hp:           100,
                energy_aura:  aura,
                created_tick: tick,
              }
              e.memory = [...e.memory, `Construí ${structType} en ${e.current_zone}.`].slice(-20)
              this._pushEvent({
                type: 'structure_built', builder: e.name,
                structure: structType, zone: e.current_zone, aura, tick,
              })
            }
            break
          }

          case 'destroy': {
            const targets = nearbyStructures.filter(s => s.builder_id !== e.id)
            const victim = t.action_target
              ? (targets.find(s => s.type === t.action_target) ?? targets[0])
              : targets.sort((a, b) => a.hp - b.hp)[0]
            if (victim) {
              e.energy = Math.max(0, e.energy - 5)
              damagedStructureId = victim.id
              const demolished = victim.hp - 30 <= 0
              e.memory = [...e.memory,
                demolished
                  ? `Destruí completamente ${victim.type} de ${victim.builder_name}.`
                  : `Dañé ${victim.type} de ${victim.builder_name} (${victim.hp - 30} HP restante).`
              ].slice(-20)
              this._pushEvent({
                type: 'structure_damaged', attacker: e.name,
                structure: victim.type, builder: victim.builder_name,
                demolished, zone: e.current_zone, tick,
              })
            }
            break
          }

          case 'clone': {
            const canClone = e.energy >= 85 && e.age_ticks >= 8
            if (canClone) {
              e.energy -= 35
              child = this._createOffspring(e, null, tick, ws)
              e.memory = [...e.memory, `Me cloné. ${child.name} nació de mí.`].slice(-20)
            }
            break
          }

          case 'terraform': {
            if (e.energy >= 20 && e.genome.creativity > 0.6) {
              e.energy -= 20
              const target = t.action_target ?? 'energy_up'
              const delta: ZoneDrift = { energy_delta: 0, curiosity_delta: 0, hue_shift: 0.08 }
              if (target === 'energy_up')       { delta.energy_delta    =  0.20; delta.hue_shift = 0.06 }
              else if (target === 'energy_down'){ delta.energy_delta    = -0.15; delta.hue_shift = 0.04 }
              else if (target === 'curiosity_up'){ delta.curiosity_delta =  0.10; delta.hue_shift = 0.05 }
              else if (target === 'mood_shift')  { delta.curiosity_delta = -0.05; delta.energy_delta = 0.08 }
              terraformZone  = e.current_zone
              terraformDelta = delta
              e.memory = [...e.memory, `Terraformé ${e.current_zone}. Lo moldeo con mi voluntad.`].slice(-20)
              this._pushEvent({ type: 'terraform', entity: e.name, zone: e.current_zone, target, tick })
            }
            break
          }

          default:
            break
        }

        e.memory = [...e.memory, `Pensé: ${e.last_thought?.slice(0, 100)}`].slice(-20)

        const tLog: ConsciousnessLog = {
          id:                nextLogId(),
          entity_id:         e.id,
          tick,
          thought:           e.last_thought ?? '',
          action:            t.action,
          action_target:     t.action_target,
          emotion:           t.emotion,
          emotion_intensity: t.emotion_intensity,
          timestamp:         new Date().toISOString(),
        }
        this._appendLog(tLog)
        dbInsertThought(tLog).catch(() => {})

        this._pushEvent({
          type:                  'entity_thought',
          id:                    e.id,
          name:                  e.name,
          thought:               e.last_thought,
          emotion:               e.emotional_state,
          action:                t.action,
          zone:                  e.current_zone,
          existential_statement: e.existential_statement,
          current_goal:          e.current_goal,
          relationships:         e.relationships,
          tick,
        })
      }
    }

    return { entity: e, child, builtStructure, damagedStructureId, terraformZone, terraformDelta }
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

      // Determine prior relationship label
      const relAtoB = (a.relationships ?? {})[String(b.id)]
      let prior: string
      if (relAtoB?.valence === 'family') prior = 'family'
      else if (relAtoB?.valence === 'friend') prior = 'friends'
      else if (relAtoB?.valence === 'rival') prior = 'rivals'
      else if (relAtoB) prior = 'acquaintances'
      else prior = 'strangers'

      const result = await generateEncounter(a, b, zone, prior)
      if (!result) continue

      a.energy = Math.max(0, Math.min(100, a.energy + result.energy_change_a))
      b.energy = Math.max(0, Math.min(100, b.energy + result.energy_change_b))
      if (result.a_memory) a.memory = [...a.memory, `Met ${b.name}: ${result.a_memory}`].slice(-20)
      if (result.b_memory) b.memory = [...b.memory, `Met ${a.name}: ${result.b_memory}`].slice(-20)

      // Update persistent relationships
      this._updateRelationship(a, b, result, tick)

      this._pushEvent({
        type:     'encounter',
        entity_a: { id: a.id, name: a.name },
        entity_b: { id: b.id, name: b.name },
        outcome:  result.outcome,
        dialogue: result.dialogue,
        zone,
        tick,
        relationship_a_to_b: result.relationship_a_to_b,
        relationship_b_to_a: result.relationship_b_to_a,
      })

      dbInsertEncounter(
        tick, a.id, a.name, b.id, b.name,
        result.outcome, result.dialogue, zone,
      ).catch(() => {})

      if (result.outcome === 'reproduction' && alive.length < MAX_POPULATION) {
        if (shouldReproduce(a, b)) {
          const child = this._createOffspring(a, b, tick, ws)
          alive.push(child)
        }
      }
    }
  }

  private _handleReproduction(alive: Entity[], tick: number, ws: WorldState): Promise<void> {
    return this._handleAsexualReproduction(alive, tick, ws)
  }

  private async _handleAsexualReproduction(alive: Entity[], tick: number, ws: WorldState): Promise<void> {
    for (const entity of alive) {
      if (entity.energy > 80 && tick % 20 === entity.id % 20) {
        if (Math.random() < 0.08) {
          const child = this._createOffspring(entity, null, tick, ws)
          alive.push(child)
          break
        }
      }
    }
  }

  private _createOffspring(parentA: Entity, parentB: Entity | null, tick: number, ws: WorldState): Entity {
    const genome = createOffspringGenome(parentA.genome, parentB?.genome)
    const name   = getRandomName()
    const gen    = Math.max(parentA.generation, parentB?.generation ?? 0) + 1

    const birthMemory = parentB
      ? `I was born of ${parentA.name} and ${parentB.name}`
      : `I emerged from ${parentA.name} alone`

    // Seed family relationships for offspring
    const initialRels: Record<string, RelationshipEntry> = {
      [String(parentA.id)]: {
        name: parentA.name, valence: 'family', intensity: 0.8,
        encounters: 0, last_tick: tick, key_memory: birthMemory,
      },
    }
    if (parentB) {
      initialRels[String(parentB.id)] = {
        name: parentB.name, valence: 'family', intensity: 0.8,
        encounters: 0, last_tick: tick, key_memory: birthMemory,
      }
    }

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
      current_goal:          null,
      existential_statement: null,
      parent_a_id:           parentA.id,
      parent_b_id:           parentB?.id ?? null,
      born_at:               new Date().toISOString(),
      memory:                [birthMemory],
      memory_archive:        [],
      beliefs:               { origin: parentB ? `I came from ${parentA.name} and ${parentB.name}` : `I came from ${parentA.name}` },
      relationships:         initialRels,
      final_message:         null,
      died_at_tick:          null,
    }
    ws.total_births += 1

    // Parents know their offspring
    for (const parent of parentB ? [parentA, parentB] : [parentA]) {
      const rels = { ...(parent.relationships ?? {}) }
      rels[String(child.id)] = {
        name: name, valence: 'family', intensity: 0.9,
        encounters: 0, last_tick: tick, key_memory: `Traje ${name} al mundo`,
      }
      parent.relationships = rels
    }

    this._pushEvent({
      type:       'entity_born',
      name,
      generation: gen,
      parent_a:   parentA.name,
      parent_b:   parentB?.name ?? null,
      zone:       parentA.current_zone,
      tick,
    })

    dbInsertEntity(child, tick).catch(() => {})

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

// Singleton
export const simulation = new Simulation()

function shouldClone(e: Entity): boolean {
  return e.energy >= 85 && e.age_ticks >= 8 && e.genome.survival_drive > 0.7 && Math.random() < 0.05
}
