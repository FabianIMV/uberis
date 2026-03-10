import { useEffect, useState } from 'react'
import { API_URL } from '../constants/api'

export interface Stats {
  living_count: number
  total_entities: number
  max_generation: number
  avg_traits: Record<string, number>
  zone_distribution: Record<string, number>
}

export function useStats(refreshKey: number = 0) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [refreshKey])

  return stats
}
