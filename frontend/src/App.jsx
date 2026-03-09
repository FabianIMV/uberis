import { useState, useEffect, useRef, useCallback } from 'react'
import WorldView from './components/WorldView.jsx'
import EntityPanel from './components/EntityPanel.jsx'
import LineageTree from './components/LineageTree.jsx'
import EventsTicker from './components/EventsTicker.jsx'
import StatsPanel from './components/StatsPanel.jsx'

const API = ''

export default function App() {
  const [entities, setEntities] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [worldState, setWorldState] = useState(null)
  const [events, setEvents] = useState([])
  const [feed, setFeed] = useState([])
  const [activeTab, setActiveTab] = useState('entity') // 'entity' | 'lineage'
  const [isRunning, setIsRunning] = useState(false)
  const [tickInterval, setTickInterval] = useState(null)
  const wsRef = useRef(null)

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/entities`)
      const data = await res.json()
      setEntities(data)
    } catch {}
  }, [])

  const fetchWorldState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/world/state`)
      const data = await res.json()
      setWorldState(data)
    } catch {}
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/world/events?limit=30`)
      const data = await res.json()
      setEvents(data)
    } catch {}
  }, [])

  const fetchSelectedEntity = useCallback(async (id) => {
    try {
      const res = await fetch(`${API}/entities/${id}`)
      const data = await res.json()
      setSelectedEntity(data)
    } catch {}
  }, [])

  // WebSocket connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/stream`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setFeed(prev => [msg, ...prev].slice(0, 100))
        if (['thought', 'birth', 'dying', 'world_event', 'reseed'].includes(msg.type)) {
          fetchEntities()
          fetchWorldState()
        }
        if (msg.type === 'world_event') {
          fetchEvents()
        }
      } catch {}
    }

    ws.onopen = () => {
      // Ping every 30s to keep alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 30000)
      ws._pingInterval = ping
    }

    ws.onclose = () => {
      if (ws._pingInterval) clearInterval(ws._pingInterval)
    }

    return () => {
      ws.close()
    }
  }, [fetchEntities, fetchWorldState, fetchEvents])

  // Initial data load
  useEffect(() => {
    fetchEntities()
    fetchWorldState()
    fetchEvents()
  }, [fetchEntities, fetchWorldState, fetchEvents])

  // Auto-tick
  useEffect(() => {
    if (isRunning) {
      const id = setInterval(async () => {
        try {
          await fetch(`${API}/world/tick`, { method: 'POST' })
          fetchEntities()
          fetchWorldState()
          fetchEvents()
        } catch {}
      }, 4000)
      setTickInterval(id)
      return () => clearInterval(id)
    } else {
      if (tickInterval) clearInterval(tickInterval)
    }
  }, [isRunning])

  const handleEntitySelect = (entity) => {
    fetchSelectedEntity(entity.id)
    setActiveTab('entity')
  }

  const handleFeed = async (entityId) => {
    try {
      await fetch(`${API}/entities/${entityId}/feed`, { method: 'POST' })
      fetchEntities()
      if (selectedEntity?.id === entityId) fetchSelectedEntity(entityId)
    } catch {}
  }

  const handleManualTick = async () => {
    try {
      await fetch(`${API}/world/tick`, { method: 'POST' })
      fetchEntities()
      fetchWorldState()
      fetchEvents()
    } catch {}
  }

  const tick = worldState?.current_tick ?? 0
  const alive = worldState?.alive_count ?? entities.length
  const totalBorn = worldState?.total_born ?? 0
  const totalDead = worldState?.total_dead ?? 0

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-deep-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-900/40 bg-deep-800/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-xl font-bold text-glow-cyan tracking-widest uppercase text-cyan-300">
            Uberis
          </h1>
          <span className="text-xs text-slate-500 ml-2">Synthetic Life</span>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 text-xs text-slate-400">
          <span>Tick: <strong className="text-cyan-300">{tick}</strong></span>
          <span>Alive: <strong className="text-green-400">{alive}</strong></span>
          <span>Born: <strong className="text-purple-400">{totalBorn}</strong></span>
          <span>Dead: <strong className="text-red-400">{totalDead}</strong></span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleManualTick}
            className="px-3 py-1 text-xs rounded border border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/30 transition"
          >
            ⏭ Tick
          </button>
          <button
            onClick={() => setIsRunning(r => !r)}
            className={`px-3 py-1 text-xs rounded border transition ${
              isRunning
                ? 'border-red-500/50 text-red-400 hover:bg-red-900/20'
                : 'border-green-500/50 text-green-400 hover:bg-green-900/20'
            }`}
          >
            {isRunning ? '⏸ Pause' : '▶ Run'}
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: World view */}
        <div className="flex flex-col w-1/2 border-r border-cyan-900/30">
          <WorldView
            entities={entities}
            onSelectEntity={handleEntitySelect}
            selectedId={selectedEntity?.id}
          />
        </div>

        {/* Right: Panel */}
        <div className="flex flex-col w-1/2 overflow-hidden">
          {/* Tab bar */}
          {selectedEntity && (
            <div className="flex border-b border-cyan-900/30 bg-deep-800/50">
              <button
                onClick={() => setActiveTab('entity')}
                className={`px-4 py-2 text-xs uppercase tracking-wider transition ${
                  activeTab === 'entity' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Entity
              </button>
              <button
                onClick={() => setActiveTab('lineage')}
                className={`px-4 py-2 text-xs uppercase tracking-wider transition ${
                  activeTab === 'lineage' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Lineage
              </button>
            </div>
          )}

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {selectedEntity ? (
              activeTab === 'entity' ? (
                <EntityPanel entity={selectedEntity} onFeed={handleFeed} />
              ) : (
                <LineageTree entityId={selectedEntity.id} entityName={selectedEntity.name} />
              )
            ) : (
              <StatsPanel worldState={worldState} entities={entities} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Events ticker */}
      <EventsTicker events={events} feed={feed} />
    </div>
  )
}
