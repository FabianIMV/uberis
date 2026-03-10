import { useMemo } from 'react'

// Maps emotion strings to bioluminescent colors
const EMOTION_COLOR = {
  wonder:        '#22d3ee',
  curiosity:     '#34d399',
  joy:           '#fbbf24',
  love:          '#f472b6',
  warmth:        '#fb923c',
  contentment:   '#86efac',
  peace:         '#a5f3fc',
  revelation:    '#e879f9',
  connection:    '#6ee7b7',
  euphoria:      '#facc15',
  fear:          '#818cf8',
  dread:         '#4f46e5',
  grief:         '#64748b',
  anger:         '#ef4444',
  agitation:     '#f97316',
  solitude:      '#94a3b8',
  contemplation: '#a78bfa',
  awe:           '#c084fc',
  neutral:       '#475569',
  default:       '#334155',
}

const ZONES = ['Garden', 'Void', 'Archive', 'Storm']

const ZONE_STYLE = {
  Garden:  { label: 'Garden',  bg: 'zone-garden',  accent: '#22c55e', pos: 'top-0 left-0' },
  Void:    { label: 'Void',    bg: 'zone-void',    accent: '#6366f1', pos: 'top-0 right-0' },
  Archive: { label: 'Archive', bg: 'zone-archive',  accent: '#f59e0b', pos: 'bottom-0 left-0' },
  Storm:   { label: 'Storm',   bg: 'zone-storm',   accent: '#ef4444', pos: 'bottom-0 right-0' },
}

function getColor(entity) {
  const emotion = (entity.emotional_state?.emotion || 'neutral').toLowerCase()
  for (const [key, color] of Object.entries(EMOTION_COLOR)) {
    if (emotion.includes(key)) return color
  }
  return EMOTION_COLOR.default
}

function EntityNode({ entity, isSelected, onClick, index, total }) {
  const color = getColor(entity)
  const energy = entity.energy ?? 100
  const size = 20 + energy * 0.18  // 20–38px diameter

  return (
    <button
      onClick={onClick}
      title={`${entity.name}\n${entity.emotional_state?.emotion || ''}\nEnergy: ${Math.round(energy)}`}
      className="entity-node absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full
                 transition-all duration-500 cursor-pointer hover:scale-125 focus:outline-none"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: isSelected
          ? `0 0 0 3px white, 0 0 20px ${color}, 0 0 40px ${color}`
          : `0 0 8px ${color}, 0 0 20px ${color}55`,
        opacity: entity.is_alive ? 1 : 0.3,
        left: `${20 + (index % 3) * 25}%`,
        top:  `${20 + Math.floor(index / 3) * 30}%`,
      }}
    />
  )
}

export default function WorldView({ entities, selectedId, onSelect }) {
  const byZone = useMemo(() => {
    const groups = { Garden: [], Void: [], Archive: [], Storm: [] }
    for (const e of entities) {
      const z = e.current_zone || 'Garden'
      if (groups[z]) groups[z].push(e)
      else groups['Garden'].push(e)
    }
    return groups
  }, [entities])

  return (
    <div className="relative w-full h-full grid grid-cols-2 grid-rows-2">
      {ZONES.map(zone => {
        const style = ZONE_STYLE[zone]
        const zoneEntities = byZone[zone] || []

        return (
          <div key={zone} className={`relative ${style.bg} overflow-hidden border border-slate-800/40`}>
            {/* Zone label */}
            <div className="absolute top-3 left-3 z-10">
              <span
                className="text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded"
                style={{ color: style.accent, background: `${style.accent}18`, border: `1px solid ${style.accent}40` }}
              >
                {zone}
              </span>
              <span className="ml-2 text-xs text-slate-500">{zoneEntities.length} beings</span>
            </div>

            {/* Entity nodes */}
            {zoneEntities.map((entity, i) => (
              <EntityNode
                key={entity.id}
                entity={entity}
                isSelected={entity.id === selectedId}
                onClick={() => onSelect(entity.id)}
                index={i}
                total={zoneEntities.length}
              />
            ))}

            {/* Empty zone message */}
            {zoneEntities.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-slate-700 italic">empty</span>
              </div>
            )}

            {/* Active thoughts floating above entities */}
            {zoneEntities.slice(0, 2).map((entity, i) =>
              entity.last_thought ? (
                <div
                  key={`thought-${entity.id}`}
                  className="absolute bottom-3 left-2 right-2 text-xs text-slate-400 italic
                             bg-black/40 rounded px-2 py-1 backdrop-blur-sm line-clamp-2"
                  style={{ bottom: `${6 + i * 44}px` }}
                >
                  <span style={{ color: getColor(entity) }} className="font-medium not-italic">
                    {entity.name}:{' '}
                  </span>
                  {entity.last_thought?.slice(0, 120)}…
                </div>
              ) : null
            )}
          </div>
        )
      })}

      {/* Centre crosshair decoration */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-px h-full bg-slate-800/60 absolute" />
        <div className="h-px w-full bg-slate-800/60 absolute" />
        <div className="w-3 h-3 rounded-full bg-slate-700 border border-slate-600" />
      </div>
    </div>
  )
}
