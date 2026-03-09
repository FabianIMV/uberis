import { useState, useEffect } from 'react'

const API = ''

export default function LineageTree({ entityId, entityName }) {
  const [lineage, setLineage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    fetch(`${API}/lineage/${entityId}`)
      .then(r => r.json())
      .then(data => {
        setLineage(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entityId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm animate-pulse">
        Loading lineage...
      </div>
    )
  }

  if (!lineage) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        No lineage data
      </div>
    )
  }

  const ancestors = lineage.ancestors ?? []
  const descendants = lineage.descendants ?? []

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">
        Lineage of {entityName}
      </h2>

      {/* Ancestors */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Ancestors</h3>
        {ancestors.length === 0 ? (
          <p className="text-xs text-slate-600 italic">Seed entity — no ancestors</p>
        ) : (
          <div className="space-y-1">
            {ancestors.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-3 text-xs bg-deep-800/40 rounded px-2 py-1.5 border border-purple-900/30"
              >
                <div className="w-2 h-2 rounded-full bg-purple-500 opacity-70" />
                <span className="text-purple-300 font-medium">{a.name}</span>
                <span className="text-slate-500">Gen {a.generation}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current entity */}
      <div className="flex items-center gap-3 text-xs bg-cyan-900/20 rounded px-3 py-2 border border-cyan-700/40">
        <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
        <span className="text-cyan-200 font-bold">{entityName}</span>
        <span className="text-slate-400">Gen {lineage.generation}</span>
        <span className="text-slate-500 ml-auto">(current)</span>
      </div>

      {/* Descendants */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Descendants</h3>
        {descendants.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No descendants yet</p>
        ) : (
          <div className="space-y-1">
            {descendants.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 text-xs bg-deep-800/40 rounded px-2 py-1.5 border border-green-900/30"
              >
                <div className={`w-2 h-2 rounded-full ${
                  d.status === 'alive' ? 'bg-green-400' :
                  d.status === 'dying' ? 'bg-yellow-400 animate-pulse' :
                  'bg-slate-600'
                }`} />
                <span className="text-green-300 font-medium">{d.name}</span>
                <span className="text-slate-500">Gen {d.generation}</span>
                <span className={`ml-auto text-xs capitalize ${
                  d.status === 'alive' ? 'text-green-500' :
                  d.status === 'dying' ? 'text-yellow-500' :
                  'text-slate-600'
                }`}>{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual tree summary */}
      {(ancestors.length > 0 || descendants.length > 0) && (
        <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">
          <p>
            {ancestors.length} ancestor{ancestors.length !== 1 ? 's' : ''} ·{' '}
            {descendants.length} descendant{descendants.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
