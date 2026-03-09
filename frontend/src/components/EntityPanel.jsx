const EMOTION_COLORS = {
  peaceful: 'text-green-400',
  curious: 'text-cyan-400',
  anxious: 'text-yellow-400',
  introspective: 'text-purple-400',
  sad: 'text-indigo-400',
  angry: 'text-red-400',
  joyful: 'text-pink-300',
  fearful: 'text-purple-500',
  contemplative: 'text-sky-400',
  grieving: 'text-slate-400',
  excited: 'text-orange-400',
  neutral: 'text-cyan-300',
}

function TraitBar({ label, value }) {
  const pct = Math.round((value ?? 0.5) * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-slate-400 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-slate-500">{(value ?? 0.5).toFixed(2)}</span>
    </div>
  )
}

function EnergyBar({ energy }) {
  const color = energy > 60 ? 'from-green-700 to-green-400' : energy > 30 ? 'from-yellow-700 to-yellow-400' : 'from-red-800 to-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">Energy</span>
        <span className="text-slate-300 font-mono">{(energy ?? 0).toFixed(1)} / 100</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${Math.max(0, Math.min(100, energy ?? 0))}%` }}
        />
      </div>
    </div>
  )
}

export default function EntityPanel({ entity, onFeed }) {
  if (!entity) return null

  const genome = entity.genome ?? {}
  const emotion = entity.emotional_state ?? {}
  const memory = entity.memory ?? []
  const beliefs = entity.beliefs ?? {}
  const log = entity.consciousness_log ?? []
  const emColor = EMOTION_COLORS[emotion.name?.toLowerCase()] ?? 'text-cyan-300'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{entity.name}</h2>
          <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
            <span>Gen {entity.generation}</span>
            <span>Age {entity.age_ticks}</span>
            <span className="capitalize">
              Zone: <span className="text-slate-300">{entity.zone}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-sm font-semibold capitalize ${emColor}`}>
            {emotion.name ?? 'neutral'}
            <span className="text-xs text-slate-500 ml-1">
              ({((emotion.intensity ?? 0.5) * 100).toFixed(0)}%)
            </span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            entity.status === 'alive' ? 'border-green-700 text-green-400' :
            entity.status === 'dying' ? 'border-red-700 text-red-400 animate-pulse' :
            'border-slate-700 text-slate-500'
          }`}>
            {entity.status}
          </span>
        </div>
      </div>

      {/* Energy + Feed */}
      <div>
        <EnergyBar energy={entity.energy} />
        <button
          onClick={() => onFeed(entity.id)}
          disabled={entity.status === 'dead'}
          className="mt-2 px-3 py-1 text-xs rounded border border-green-700/50 text-green-400 hover:bg-green-900/20 transition disabled:opacity-30"
        >
          🌿 Feed (+20 energy)
        </button>
      </div>

      {/* Genome */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Genome</h3>
        <div className="space-y-1.5">
          {Object.entries(genome).map(([trait, value]) => (
            <TraitBar key={trait} label={trait.replace('_', ' ')} value={value} />
          ))}
        </div>
      </div>

      {/* Beliefs */}
      {Object.keys(beliefs).length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Beliefs</h3>
          <div className="space-y-1">
            {Object.entries(beliefs).slice(0, 8).map(([key, value]) => (
              <div key={key} className="text-xs flex gap-2">
                <span className="text-slate-400 italic">"{key}"</span>
                <span className="text-slate-300">→ {String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last thought */}
      {log.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Last Thought</h3>
          <p className="text-xs text-slate-300 italic bg-deep-800/60 rounded p-2 border border-cyan-900/20">
            {log[log.length - 1]}
          </p>
        </div>
      )}

      {/* Memory feed */}
      {memory.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Memory</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {[...memory].reverse().map((m, i) => (
              <div key={i} className="text-xs bg-deep-800/40 rounded p-1.5 border border-slate-800/60">
                {m.event ? (
                  <span className="text-red-400">{m.message}</span>
                ) : (
                  <>
                    <span className="text-slate-500">t{m.tick} </span>
                    <span className={`capitalize ${EMOTION_COLORS[m.emotion] ?? 'text-slate-300'}`}>[{m.emotion}] </span>
                    <span className="text-slate-300">{m.reflection}</span>
                    {m.spoken && (
                      <span className="text-cyan-400 block mt-0.5">💬 "{m.spoken}"</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parents */}
      {entity.parent_ids?.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Lineage</h3>
          <p className="text-xs text-slate-400">Parents: {entity.parent_ids.length} known</p>
        </div>
      )}
    </div>
  )
}
