import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { simulation, type SimState } from '../engine/simulation'
import { subscribeToApiCalls, isApiConfigured } from '../engine/brain'
import type { Entity, ConsciousnessLog, LiveEvent, WorldState } from '../engine/types'

// ─── Context shape ──────────────────────────────────────────────────────────

interface SimContextValue {
  entities:   Entity[]                     // living only
  allEntities:Entity[]                     // living + dead (for detail views)
  worldState: WorldState
  liveEvents: LiveEvent[]
  logs:       Record<number, ConsciousnessLog[]>
  connected:  true                         // always true — no network needed
  isThinking: boolean                      // true while Claude API call is in progress
  apiEnabled: boolean                      // true if API key is configured
  feedEntity: (id: number) => void
}

const SimContext = createContext<SimContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [simState, setSimState] = useState<SimState>(simulation.getState())
  const [isThinking, setIsThinking] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    const unsub    = simulation.subscribe(setSimState)
    const unsubApi = subscribeToApiCalls(setIsThinking)

    if (!startedRef.current) {
      startedRef.current = true
      simulation.start()
    }

    return () => {
      unsub()
      unsubApi()
    }
  }, [])

  const value: SimContextValue = {
    entities:   simState.entities.filter(e => e.is_alive),
    allEntities:simState.entities,
    worldState: simState.worldState,
    liveEvents: simState.liveEvents,
    logs:       simState.logs,
    connected:  true,
    isThinking,
    apiEnabled: isApiConfigured(),
    feedEntity: (id) => simulation.feedEntity(id),
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
