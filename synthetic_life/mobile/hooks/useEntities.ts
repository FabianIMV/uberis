import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL, WS_URL } from '../constants/api'

export interface Genome {
  curiosity: number
  aggression: number
  empathy: number
  creativity: number
  survival_drive: number
}

export interface EmotionalState {
  emotion: string
  intensity: number
}

export interface Entity {
  id: number
  name: string
  generation: number
  age_ticks: number
  energy: number
  genome: Genome
  emotional_state: EmotionalState
  current_zone: string
  is_alive: boolean
  last_thought: string | null
  current_desire: string | null
  existential_statement: string | null
  parent_a_id: number | null
  parent_b_id: number | null
  born_at: string | null
}

export interface EntityFull extends Entity {
  memory: string[]
  beliefs: Record<string, string>
  final_message: {
    final_words: string
    life_meaning: string
    gift_to_world: string
    final_emotion: string
    at_peace: boolean
  } | null
  died_at_tick: number | null
}

export interface WorldState {
  current_tick: number
  total_births: number
  total_deaths: number
  cultural_beliefs: Record<string, Record<string, string>>
}

export interface LiveEvent {
  id: number
  type: string
  [key: string]: unknown
}

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [worldState, setWorldState] = useState<WorldState | null>(null)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/entities`)
      if (res.ok) setEntities(await res.json())
    } catch (_) {}
  }, [])

  const fetchWorldState = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/world/state`)
      if (res.ok) setWorldState(await res.json())
    } catch (_) {}
  }, [])

  const pushEvent = (ev: Omit<LiveEvent, 'id'>) => {
    setLiveEvents(prev => [{ ...ev, id: Date.now() } as LiveEvent, ...prev.slice(0, 59)])
  }

  const connect = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}/stream`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        const { type, data } = msg

        if (type === 'tick') {
          fetchEntities()
          fetchWorldState()
        }
        if (type === 'entity_thought') {
          setEntities(prev =>
            prev.map(en =>
              en.id === data.id
                ? { ...en, last_thought: data.thought, emotional_state: data.emotion, energy: data.energy, current_zone: data.zone }
                : en
            )
          )
        }
        if (type === 'entity_died') {
          setEntities(prev => prev.filter(en => en.id !== data.id))
          fetchWorldState()
        }
        if (type === 'entity_born') {
          fetchEntities()
          fetchWorldState()
        }
        pushEvent({ type, ...data })
      } catch (_) {}
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }
    ws.onerror = () => ws.close()
  }, [fetchEntities, fetchWorldState])

  useEffect(() => {
    fetchEntities()
    fetchWorldState()
    connect()
    return () => {
      reconnectRef.current && clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [fetchEntities, fetchWorldState, connect])

  const feedEntity = useCallback(async (id: number) => {
    await fetch(`${API_URL}/entities/${id}/feed`, { method: 'POST' })
    fetchEntities()
  }, [fetchEntities])

  return { entities, worldState, liveEvents, connected, feedEntity, refetch: fetchEntities }
}
