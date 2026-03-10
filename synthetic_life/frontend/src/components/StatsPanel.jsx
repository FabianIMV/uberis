const TRAIT_COLOR = {
  curiosity:      '#22d3ee',
  empathy:        '#f472b6',
  aggression:     '#ef4444',
  creativity:     '#a78bfa',
  survival_drive: '#34d399',
}

const ZONE_COLOR = {
  Garden:  '#22c55e',
  Void:    '#6366f1',
  Archive: '#f59e0b',
  Storm:   '#ef4444',
}

function TraitBar({ trait, value }) {
  const color = TRAIT_COLOR[trait] || '#94a3b8'
  const pct = Math.round((value ?? 0) * 100)
  const label = trait.replace('_', ' ')
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400 capitalize">{label}</span>
        <span className="font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
    </div>
  )
}

export default function StatsPanel({ stats, entities }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        Loading stats…
      </div>
    )
  }

  const zone_dist = stats.zone_distribution || {}

  return (
    <div className="p-4 space-y-5">

      {/* Population overview */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Population</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/40 rounded p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.living_count}</div>
            <div className="text-xs text-slate-500 mt-0.5">Alive</div>
          </div>
          <div className="bg-slate-800/40 rounded p-3 text-center">
            <div className="text-2xl font-bold text-slate-400">{stats.total_entities}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total ever</div>
          </div>
          <div className="bg-slate-800/40 rounded p-3 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.max_generation}</div>
            <div className="text-xs text-slate-500 mt-0.5">Max gen</div>
          </div>
          <div className="bg-slate-800/40 rounded p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.total_entities - stats.living_count}</div>
            <div className="text-xs text-slate-500 mt-0.5">Deceased</div>
          </div>
        </div>
      </div>

      {/* Average genome traits */}
      {stats.avg_traits && Object.keys(stats.avg_traits).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Avg Genome (current gen)
          </h3>
          {Object.entries(stats.avg_traits).map(([trait, val]) => (
            <TraitBar key={trait} trait={trait} value={val} />
          ))}
        </div>
      )}

      {/* Zone distribution */}
      {Object.keys(zone_dist).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Zone Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(zone_dist).map(([zone, count]) => {
              const color = ZONE_COLOR[zone] || '#94a3b8'
              const pct = Math.round((count / (stats.living_count || 1)) * 100)
              return (
                <div key={zone}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color }}>{zone}</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Living entities list */}
      {entities.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Living Entities
          </h3>
          <div className="space-y-1">
            {entities.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs py-1 border-b border-slate-800/50">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: e.emotional_state?.emotion ? '#22d3ee' : '#475569',
                    boxShadow: '0 0 4px #22d3ee88',
                  }}
                />
                <span className="text-slate-300 font-medium">{e.name}</span>
                <span className="text-slate-600">g{e.generation}</span>
                <span className="text-slate-600 ml-auto">{e.current_zone}</span>
                <span className="text-slate-500 font-mono">{Math.round(e.energy)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
