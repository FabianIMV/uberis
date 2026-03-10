import { useEffect, useState } from 'react'

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const e = node.entity
  const children = node.descendants || node.ancestors || []

  const color = e.is_alive ? '#22d3ee' : '#475569'

  return (
    <div className="pl-4 border-l border-slate-700 ml-2">
      <div
        className="flex items-center gap-2 py-1 cursor-pointer group"
        onClick={() => children.length > 0 && setExpanded(v => !v)}
      >
        {/* Node dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 -ml-[calc(0.625rem+1px)] border border-slate-700"
          style={{ background: color, boxShadow: e.is_alive ? `0 0 6px ${color}88` : 'none' }}
        />
        {/* Info */}
        <span className="text-sm font-medium" style={{ color }}>
          {e.name}
        </span>
        <span className="text-xs text-slate-600">Gen {e.generation}</span>
        {!e.is_alive && (
          <span className="text-xs text-slate-600 italic">†</span>
        )}
        {children.length > 0 && (
          <span className="text-xs text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {expanded ? '▾' : '▸'} {children.length}
          </span>
        )}
      </div>

      {/* Genome mini bars */}
      {e.genome && (
        <div className="flex gap-1 mb-1 ml-3">
          {Object.entries(e.genome).map(([trait, val]) => {
            const COLORS = {
              curiosity: '#22d3ee', empathy: '#f472b6', aggression: '#ef4444',
              creativity: '#a78bfa', survival_drive: '#34d399',
            }
            return (
              <div
                key={trait}
                title={`${trait}: ${Math.round(val * 100)}%`}
                className="h-1 rounded-full"
                style={{ width: `${Math.round(val * 20)}px`, background: COLORS[trait] || '#475569', opacity: 0.7 }}
              />
            )
          })}
        </div>
      )}

      {/* Children */}
      {expanded && children.map((child, i) => (
        <TreeNode key={child.entity.id ?? i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function LineageTree({ entityId }) {
  const [lineage, setLineage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!entityId) { setLineage(null); return }
    setLoading(true)
    fetch(`/lineage/${entityId}`)
      .then(r => r.json())
      .then(setLineage)
      .catch(() => setLineage(null))
      .finally(() => setLoading(false))
  }, [entityId])

  if (!entityId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-sm gap-2 p-6">
        <span className="text-3xl">🌿</span>
        <p>Select an entity to see its lineage</p>
      </div>
    )
  }

  if (loading) return <div className="p-4 text-slate-500 text-sm">Loading lineage…</div>
  if (!lineage) return <div className="p-4 text-slate-500 text-sm">No lineage data</div>

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Lineage of {lineage.entity?.name}
      </h3>

      {/* Ancestors */}
      {lineage.ancestors?.length > 0 && (
        <div>
          <p className="text-xs text-slate-600 mb-2">Ancestors</p>
          {lineage.ancestors.map((node, i) => (
            <TreeNode key={node.entity.id ?? i} node={node} depth={0} />
          ))}
        </div>
      )}

      {/* Self */}
      <div className="border border-cyan-800/50 rounded p-2 bg-cyan-900/10">
        <span className="text-sm font-bold text-cyan-300">{lineage.entity?.name}</span>
        <span className="ml-2 text-xs text-slate-500">← you are here</span>
      </div>

      {/* Descendants */}
      {lineage.descendants?.length > 0 ? (
        <div>
          <p className="text-xs text-slate-600 mb-2">Descendants</p>
          {lineage.descendants.map((node, i) => (
            <TreeNode key={node.entity.id ?? i} node={node} depth={0} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-700 italic">No descendants yet.</p>
      )}
    </div>
  )
}
