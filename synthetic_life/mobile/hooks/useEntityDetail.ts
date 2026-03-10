import { useEffect, useState } from 'react'
import { API_URL } from '../constants/api'
import type { EntityFull } from './useEntities'

export interface ConsciousnessLog {
  id: number
  tick: number
  thought: string
  action: string
  action_target: string | null
  emotion: string
  intensity: number
  timestamp: string
}

export function useEntityDetail(id: number | null) {
  const [entity, setEntity] = useState<EntityFull | null>(null)
  const [logs, setLogs] = useState<ConsciousnessLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) { setEntity(null); setLogs([]); return }
    setLoading(true)
    Promise.all([
      fetch(`${API_URL}/entities/${id}`).then(r => r.json()),
      fetch(`${API_URL}/entities/${id}/log?limit=20`).then(r => r.json()),
    ])
      .then(([e, l]) => { setEntity(e); setLogs(l) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { entity, logs, loading }
}
