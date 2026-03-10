import { useEffect, useState } from 'react'

const TRAIT_COLOR = {
  curiosity:      '#22d3ee',
  empathy:        '#f472b6',
  aggression:     '#ef4444',
  creativity:     '#a78bfa',
  survival_drive: '#34d399',
}

const TRAIT_LABEL = {
  curiosity:      'Curiosity',
  empathy:        'Empathy',
  aggression:     'Aggression',
  creativity:     'Creativity',
  survival_drive: 'Survival Drive',
}

const EMOTION_BG = {
  joy:           'bg-yellow-900/30 text-yellow-300',
  love:          'bg-pink-900/30 text-pink-300',
  wonder:        'bg-cyan-900/30 text-cyan-300',
  fear:          'bg-indigo-900/30 text-indigo-300',
  grief:         'bg-slate-700/30 text-slate-400',
  anger:         'bg-red-900/30 text-red-300',
  contemplation: 'bg-purple-900/30 text-purple-300',
  revelation:    'bg-fuchsia-900/30 text-fuchsia-300',
  default:       'bg-slate-800/30 text-slate-400',
}

function emotionStyle(emotion) {
  const key = (emotion || '').toLowerCase()
  for (const [k, v] of Object.entries(EMOTION_BG)) {
    if (key.includes(k)) return v
  }
  return EMOTION_BG.default
}

function GenomeBar({ trait, value }) {
  const color = TRAIT_COLOR[trait] || '#94a3b8'
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{TRAIT_LABEL[trait] || trait}</span>
        <span style={{ color }} className="font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full genome-bar-fill transition-all"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}88` }}
        />
      </div>
    </div>
  )
}

export default function EntityPanel({ entityId, entitySummary, onFeed }) {
  const [fullEntity, setFullEntity] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityId) {
      setFullEntity(null)
      setLogs([])
      return
    }
    setLoading(true)
    Promise.all([
      fetch(`/entities/${entityId}`).then(r => r.json()),
      fetch(`/entities/${entityId}/log?limit=20`).then(r => r.json()),
    ]).then(([entity, log]) => {
      setFullEntity(entity)
      setLogs(log)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [entityId])

  if (!entityId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-sm gap-2 p-6">
        <span className="text-3xl">🫧</span>
        <p>Select an entity in the world to observe it</p>
      </div>
    )
  }

  const entity = fullEntity || entitySummary
  if (!entity) return <div className="p-4 text-slate-500 text-sm">{loading ? 'Loading…' : 'Entity not found'}</div>

  const emotion = entity.emotional_state?.emotion || 'neutral'
  const intensity = entity.emotional_state?.intensity ?? 0.5

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{entity.name}</h2>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-xs text-slate-500">Gen {entity.generation}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">Age {entity.age_ticks} ticks</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-medium">{entity.current_zone}</span>
          </div>
        </div>
        <button
          onClick={() => onFeed(entityId)}
          className="text-xs px-3 py-1.5 rounded bg-emerald-900/50 text-emerald-300
                     border border-emerald-800 hover:bg-emerald-800/60 transition-colors shrink-0"
        >
          + Feed
        </button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-2">
        {/* Energy */}
        <div className="bg-slate-800/40 rounded p-2.5">
          <div className="text-xs text-slate-500 mb-1">Energy</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${entity.energy ?? 0}%`,
                  background: entity.energy > 50 ? '#22c55e' : entity.energy > 20 ? '#f59e0b' : '#ef4444',
                  boxShadow: entity.energy > 50 ? '0 0 6px #22c55e88' : '0 0 6px #ef444488',
                }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300">{Math.round(entity.energy ?? 0)}</span>
          </div>
        </div>

        {/* Emotion */}
        <div className="bg-slate-800/40 rounded p-2.5">
          <div className="text-xs text-slate-500 mb-1">Emotion</div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${emotionStyle(emotion)}`}>
              {emotion}
            </span>
            <span className="text-xs text-slate-600 font-mono">{Math.round(intensity * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Genome */}
      <div className="bg-slate-800/20 rounded p-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Genome</h3>
        {Object.entries(entity.genome || {}).map(([trait, val]) => (
          <GenomeBar key={trait} trait={trait} value={val} />
        ))}
      </div>

      {/* Current thought */}
      {entity.last_thought && (
        <div className="bg-slate-800/20 rounded p-3 border-l-2 border-cyan-700">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Thought</h3>
          <p className="text-sm text-slate-300 italic leading-relaxed">{entity.last_thought}</p>
        </div>
      )}

      {/* Desire */}
      {entity.current_desire && (
        <div className="bg-slate-800/20 rounded p-3 border-l-2 border-amber-700">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Desire</h3>
          <p className="text-sm text-amber-200/80">{entity.current_desire}</p>
        </div>
      )}

      {/* Existential statement */}
      {entity.existential_statement && (
        <div className="bg-slate-800/20 rounded p-3 border-l-2 border-purple-700">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Existential View</h3>
          <p className="text-sm text-purple-200/80 italic">{entity.existential_statement}</p>
        </div>
      )}

      {/* Beliefs */}
      {fullEntity?.beliefs && Object.keys(fullEntity.beliefs).length > 0 && (
        <div className="bg-slate-800/20 rounded p-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Beliefs</h3>
          <ul className="space-y-1.5">
            {Object.entries(fullEntity.beliefs).map(([k, v]) => (
              <li key={k} className="text-xs">
                <span className="text-slate-500 font-mono">{k}: </span>
                <span className="text-slate-300">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Memory feed */}
      {fullEntity?.memory && fullEntity.memory.length > 0 && (
        <div className="bg-slate-800/20 rounded p-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Memory</h3>
          <ul className="space-y-1.5">
            {[...fullEntity.memory].reverse().map((mem, i) => (
              <li key={i} className="text-xs text-slate-400 border-l border-slate-700 pl-2">
                {mem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final message for dead entities */}
      {fullEntity?.final_message && (
        <div className="bg-slate-900 border border-slate-700 rounded p-3">
          <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Final Words</h3>
          <p className="text-sm text-slate-300 italic mb-2">{fullEntity.final_message.final_words}</p>
          <p className="text-xs text-slate-500">
            <span className="text-slate-400">Life meaning: </span>
            {fullEntity.final_message.life_meaning}
          </p>
          {fullEntity.final_message.gift_to_world && (
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-slate-400">Gift: </span>
              {fullEntity.final_message.gift_to_world}
            </p>
          )}
        </div>
      )}

      {/* Consciousness log */}
      {logs.length > 0 && (
        <div className="bg-slate-800/20 rounded p-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Consciousness Log</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="text-xs border-b border-slate-800 pb-2 last:border-0">
                <div className="flex gap-2 mb-0.5">
                  <span className="text-slate-600 font-mono">t{log.tick}</span>
                  <span className="text-slate-500">{log.action}</span>
                  {log.action_target && (
                    <span className="text-slate-600">→ {log.action_target}</span>
                  )}
                  <span className="text-slate-500 ml-auto">{log.emotion}</span>
                </div>
                <p className="text-slate-400 italic line-clamp-2">{log.thought}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
