import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { simulation, type SimState, type CatchUpSummary } from '../engine/simulation'
import { subscribeToApiCalls, isApiConfigured } from '../engine/brain'
import type { Entity, ConsciousnessLog, LiveEvent, WorldState, Structure } from '../engine/types'
import {
  dbGetAllEntities, dbGetEntityThoughts, dbGetWorldTimeline,
  dbGetEncounters, dbGetStats,
  type EntityRecord,
} from '../engine/database'

// ─── Context shape ──────────────────────────────────────────────────────────

interface SimContextValue {
  entities:           Entity[]
  allEntities:        Entity[]
  worldState:         WorldState
  liveEvents:         LiveEvent[]
  logs:               Record<number, ConsciousnessLog[]>
  structures:         Structure[]
  connected:          true
  isThinking:         boolean
  apiEnabled:         boolean
  feedEntity:         (id: number) => void
  awaySummary:        CatchUpSummary | null   // set when app re-opens after absence
  dismissAwaySummary: () => void
}

const SimContext = createContext<SimContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simState, setSimState] = useState<SimState>(simulation.getState())
  const [isThinking, setIsThinking] = useState(false)
  const [awaySummary, setAwaySummary] = useState<CatchUpSummary | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const unsub    = simulation.subscribe(setSimState)
    const unsubApi = subscribeToApiCalls(setIsThinking)

    if (!startedRef.current) {
      startedRef.current = true
      simulation.start().then(() => {
        const summary = simulation.getCatchUpSummary()
        if (summary) {
          setAwaySummary(summary)
          simulation.clearCatchUpSummary()
        }
      })
    }

    // Save world state whenever app goes to background
    const appSub = AppState.addEventListener('change', appState => {
      if (appState === 'background' || appState === 'inactive') {
        simulation.save()
      }
    })

    return () => {
      unsub()
      unsubApi()
      appSub.remove()
    }
  }, [])

  const value: SimContextValue = {
    entities:           simState.entities.filter(e => e.is_alive),
    allEntities:        simState.entities,
    worldState:         simState.worldState,
    liveEvents:         simState.liveEvents,
    logs:               simState.logs,
    structures:         simState.structures ?? [],
    connected:          true,
    isThinking,
    apiEnabled:         isApiConfigured(),
    feedEntity:         (id) => simulation.feedEntity(id),
    awaySummary,
    dismissAwaySummary: () => setAwaySummary(null),
  }

  return (
    <SimContext.Provider value={value}>
      {children}
    </SimContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSimulation(): SimContextValue {
  const ctx = useContext(SimContext)
  if (!ctx) throw new Error('useSimulation must be used inside <SimulationProvider>')
  return ctx
}

/** Get one entity by id (includes dead entities). */
export function useEntityById(id: number | null): Entity | null {
  const { allEntities } = useSimulation()
  if (!id) return null
  return allEntities.find(e => e.id === id) ?? null
}

/** Get consciousness logs for an entity. */
export function useEntityLogs(id: number | null): ConsciousnessLog[] {
  const { logs } = useSimulation()
  if (!id) return []
  return (logs[id] ?? []).slice().reverse()   // newest first
}

// ─── DB-backed hooks ─────────────────────────────────────────────────────────

/** Full thought history for an entity from SQLite (not capped at 20). */
export function useFullEntityThoughts(id: number | null, limit = 100) {
  const [thoughts, setThoughts] = useState<ConsciousnessLog[]>([])
  useEffect(() => {
    if (!id) { setThoughts([]); return }
    dbGetEntityThoughts(id, limit).then(setThoughts).catch(() => {})
  }, [id, limit])
  const refresh = useCallback(() => {
    if (!id) return
    dbGetEntityThoughts(id, limit).then(setThoughts).catch(() => {})
  }, [id, limit])
  return { thoughts, refresh }
}

/** Genealogy tree — every entity ever born. */
export function useGenealogyTree() {
  const [tree, setTree] = useState<EntityRecord[]>([])
  useEffect(() => { dbGetAllEntities().then(setTree).catch(() => {}) }, [])
  const refresh = useCallback(() => { dbGetAllEntities().then(setTree).catch(() => {}) }, [])
  return { tree, refresh }
}

/** World timeline from SQLite. */
export function useWorldTimeline(limit = 200) {
  const [events, setEvents] = useState<Array<{ id: number; tick: number; type: string; description: string | null; zone: string | null; data_json: string }>>([])
  useEffect(() => { dbGetWorldTimeline(limit).then(setEvents).catch(() => {}) }, [limit])
  const refresh = useCallback(() => { dbGetWorldTimeline(limit).then(setEvents).catch(() => {}) }, [limit])
  return { events, refresh }
}

/** All-time encounter history. */
export function useEncounterHistory(limit = 100) {
  const [encounters, setEncounters] = useState<Array<{
    id: number; tick: number;
    entity_a_id: number; entity_b_id: number;
    entity_a_name: string; entity_b_name: string;
    outcome: string; dialogue: string | null; zone: string
  }>>([])
  useEffect(() => { dbGetEncounters(limit).then(setEncounters).catch(() => {}) }, [limit])
  const refresh = useCallback(() => { dbGetEncounters(limit).then(setEncounters).catch(() => {}) }, [limit])
  return { encounters, refresh }
}

/** Aggregate stats from the DB. */
export function useDBStats() {
  const [stats, setStats] = useState<{
    total_entities: number; total_thoughts: number;
    total_events: number; total_encounters: number; max_generation: number
  } | null>(null)
  useEffect(() => { dbGetStats().then(setStats).catch(() => {}) }, [])
  const refresh = useCallback(() => { dbGetStats().then(setStats).catch(() => {}) }, [])
  return { stats, refresh }
}

// ─── Stats derived from simulation state ─────────────────────────────────────

/** Stats derived from simulation state — no extra fetch needed. */
export function useSimStats() {
  const { entities, allEntities } = useSimulation()
  if (entities.length === 0) return null

  const avgTraits: Record<string, number> = {}
  for (const trait of ['curiosity', 'aggression', 'empathy', 'creativity', 'survival_drive']) {
    const sum = entities.reduce((s, e) => s + (e.genome as Record<string,number>)[trait], 0)
    avgTraits[trait] = sum / entities.length
  }

  const zoneDist: Record<string, number> = {}
  for (const e of entities) {
    zoneDist[e.current_zone] = (zoneDist[e.current_zone] ?? 0) + 1
  }

  return {
    living_count:     entities.length,
    total_entities:   allEntities.length,
    max_generation:   Math.max(...allEntities.map(e => e.generation), 0),
    avg_traits:       avgTraits,
    zone_distribution:zoneDist,
  }
}
