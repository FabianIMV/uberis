const TRAIT_LABELS = {
  curiosity: '🔭',
  aggression: '⚔️',
  empathy: '💚',
  creativity: '🎨',
  survival_drive: '🛡',
}

function avgTrait(entities, trait) {
  if (!entities.length) return 0
  return entities.reduce((sum, e) => sum + (e.genome?.[trait] ?? 0.5), 0) / entities.length
}

function MiniSparkline({ data, color = '#06b6d4' }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.count)
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const range = max - min || 1
  const w = 120
  const h = 30
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  )
}

export default function StatsPanel({ worldState, entities }) {
  const alive = entities.filter(e => e.status !== 'dead')
  const generations = alive.length ? Math.max(...alive.map(e => e.generation ?? 1)) : 0

  const zoneCount = alive.reduce((acc, e) => {
    const z = e.zone || 'Unknown'
    acc[z] = (acc[z] || 0) + 1
    return acc
  }, {})

  const popHistory = worldState?.population_history ?? []

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Select an entity in the world view</h2>
        <p className="text-slate-600 text-xs">Click on a glowing node to inspect it.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Alive', value: alive.length, color: 'text-green-400' },
          { label: 'Max Gen', value: generations, color: 'text-purple-400' },
          { label: 'Total Born', value: worldState?.total_born ?? 0, color: 'text-cyan-400' },
          { label: 'Total Dead', value: worldState?.total_dead ?? 0, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-deep-800/50 rounded p-3 border border-slate-800">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Population sparkline */}
      {popHistory.length > 1 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Population Over Time</h3>
          <div className="bg-deep-800/40 rounded p-2 border border-slate-800">
            <MiniSparkline data={popHistory} color="#06b6d4" />
          </div>
        </div>
      )}

      {/* Zone distribution */}
      {Object.keys(zoneCount).length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Zone Distribution</h3>
          <div className="space-y-1.5">
            {Object.entries(zoneCount).map(([zone, count]) => (
              <div key={zone} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-400">{zone}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full"
                    style={{ width: `${(count / Math.max(alive.length, 1)) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Average genome traits */}
      {alive.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Avg Genome (Population)</h3>
          <div className="space-y-1.5">
            {Object.keys(TRAIT_LABELS).map(trait => {
              const avg = avgTrait(alive, trait)
              return (
                <div key={trait} className="flex items-center gap-2 text-xs">
                  <span className="w-6">{TRAIT_LABELS[trait]}</span>
                  <span className="w-24 text-slate-400 capitalize">{trait.replace('_', ' ')}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-700 to-purple-400 rounded-full"
                      style={{ width: `${avg * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500">{avg.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tick info */}
      <div className="text-xs text-slate-600 pt-2 border-t border-slate-800">
        Current tick: <span className="text-slate-400">{worldState?.current_tick ?? 0}</span>
      </div>
    </div>
  )
}
