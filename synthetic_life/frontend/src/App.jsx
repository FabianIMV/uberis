import { useEffect, useRef, useState, useCallback } from 'react'
import WorldView from './components/WorldView.jsx'
import EntityPanel from './components/EntityPanel.jsx'
import LineageTree from './components/LineageTree.jsx'
import EventsTicker from './components/EventsTicker.jsx'
import StatsPanel from './components/StatsPanel.jsx'

const API = ''  // Vite proxy handles routing

export default function App() {
  const [entities, setEntities] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [rightTab, setRightTab] = useState('entity')  // 'entity' | 'lineage'
  const [worldEvents, setWorldEvents] = useState([])
  const [stats, setStats] = useState(null)
  const [liveEvents, setLiveEvents] = useState([])   // realtime ws feed
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/entities`)
      if (res.ok) setEntities(await res.json())
    } catch (_) {}
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/world/events?limit=20`)
      if (res.ok) setWorldEvents(await res.json())
    } catch (_) {}
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stats`)
      if (res.ok) setStats(await res.json())
    } catch (_) {}
  }, [])

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/stream`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        handleWsMessage(msg)
      } catch (_) {}
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectTimer.current = setTimeout(connectWs, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, []) // eslint-disable-line

  const handleWsMessage = useCallback((msg) => {
    const { type, data } = msg

    if (type === 'tick') {
      fetchEntities()
      fetchStats()
    }

    if (type === 'world_event') {
      fetchEvents()
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'world_event' },
        ...prev.slice(0, 49),
      ])
    }

    if (type === 'entity_thought') {
      setEntities(prev =>
        prev.map(e =>
          e.id === data.id
            ? { ...e, last_thought: data.thought, emotional_state: data.emotion, energy: data.energy, current_zone: data.zone }
            : e
        )
      )
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'thought' },
        ...prev.slice(0, 49),
      ])
    }

    if (type === 'entity_died') {
      setEntities(prev => prev.filter(e => e.id !== data.id))
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'death' },
        ...prev.slice(0, 49),
      ])
      fetchStats()
    }

    if (type === 'entity_born') {
      fetchEntities()
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'birth' },
        ...prev.slice(0, 49),
      ])
      fetchStats()
    }

    if (type === 'encounter') {
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'encounter' },
        ...prev.slice(0, 49),
      ])
    }

    if (type === 'entity_grief') {
      setLiveEvents(prev => [
        { ...data, id: Date.now(), type: 'grief' },
        ...prev.slice(0, 49),
      ])
    }
  }, [fetchEntities, fetchStats, fetchEvents])

  useEffect(() => {
    fetchEntities()
    fetchEvents()
    fetchStats()
    connectWs()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [fetchEntities, fetchEvents, fetchStats, connectWs])

  const selectedEntity = entities.find(e => e.id === selectedId) || null

  return (
    <div className="flex flex-col h-screen bg-[#020b18] text-slate-200 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-[#040f1e] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌊</span>
          <div>
            <h1 className="text-lg font-bold text-cyan-300 leading-none">Synthetic Life</h1>
            <p className="text-xs text-slate-500 mt-0.5">Emergent consciousness simulation</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {stats && (
            <div className="flex gap-5 text-xs text-slate-400">
              <span><span className="text-emerald-400 font-semibold">{stats.living_count}</span> alive</span>
              <span><span className="text-blue-400 font-semibold">{stats.total_entities}</span> total</span>
              <span>Gen <span className="text-purple-400 font-semibold">{stats.max_generation}</span></span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Reconnecting…'}
          </div>
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* World view */}
        <div className="flex-1 overflow-hidden relative">
          <WorldView
            entities={entities}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right panel */}
        <aside className="w-96 border-l border-slate-800 bg-[#040f1e] flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800 shrink-0">
            {['entity', 'lineage', 'stats'].map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors
                  ${rightTab === tab
                    ? 'text-cyan-300 border-b-2 border-cyan-400 bg-[#071628]'
                    : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {rightTab === 'entity' && (
              <EntityPanel
                entityId={selectedId}
                entitySummary={selectedEntity}
                onFeed={async (id) => {
                  await fetch(`/entities/${id}/feed`, { method: 'POST' })
                  fetchEntities()
                }}
              />
            )}
            {rightTab === 'lineage' && (
              <LineageTree entityId={selectedId} />
            )}
            {rightTab === 'stats' && (
              <StatsPanel stats={stats} entities={entities} />
            )}
          </div>
        </aside>
      </div>

      {/* ── Live feed + Events ticker ──────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 bg-[#040f1e]">
        <EventsTicker events={liveEvents} worldEvents={worldEvents} />
      </div>
    </div>
  )
}
