import { useMemo } from 'react'

const EMOTION_COLORS = {
  peaceful: '#10b981',
  curious: '#38bdf8',
  anxious: '#f59e0b',
  introspective: '#8b5cf6',
  sad: '#6366f1',
  angry: '#ef4444',
  joyful: '#f0abfc',
  fearful: '#a855f7',
  contemplative: '#0ea5e9',
  grieving: '#64748b',
  excited: '#fb923c',
  confused: '#f97316',
  neutral: '#06b6d4',
  dying: '#6b7280',
}

const ZONE_POSITIONS = {
  Garden: { x: 25, y: 30 },
  Archive: { x: 65, y: 25 },
  Void: { x: 20, y: 65 },
  Storm: { x: 70, y: 68 },
}

const ZONE_COLORS = {
  Garden: '#10b981',
  Archive: '#38bdf8',
  Void: '#8b5cf6',
  Storm: '#f59e0b',
}

function getEntityColor(entity) {
  if (entity.status === 'dying') return EMOTION_COLORS.dying
  const em = entity.emotional_state?.name?.toLowerCase() ?? 'neutral'
  return EMOTION_COLORS[em] ?? EMOTION_COLORS.neutral
}

const TWO_PI = 2 * Math.PI

function jitter(baseX, baseY, index, total) {
  const angle = (index / Math.max(total, 1)) * TWO_PI
  const radius = Math.min(8, total * 1.5)
  return {
    x: baseX + Math.cos(angle) * radius,
    y: baseY + Math.sin(angle) * radius,
  }
}

export default function WorldView({ entities, onSelectEntity, selectedId }) {
  const entityGroups = useMemo(() => {
    const groups = {}
    for (const entity of entities) {
      const zone = entity.zone || 'Garden'
      if (!groups[zone]) groups[zone] = []
      groups[zone].push(entity)
    }
    return groups
  }, [entities])

  return (
    <div className="relative flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
      {/* Background grid */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Zone backgrounds */}
        {Object.entries(ZONE_POSITIONS).map(([zone, pos]) => (
          <g key={zone}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r="18"
              fill={ZONE_COLORS[zone]}
              opacity="0.04"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r="18"
              fill="none"
              stroke={ZONE_COLORS[zone]}
              strokeWidth="0.3"
              opacity="0.2"
              strokeDasharray="1 2"
            />
            <text
              x={pos.x}
              y={pos.y - 20}
              textAnchor="middle"
              fill={ZONE_COLORS[zone]}
              fontSize="3"
              opacity="0.5"
              className="select-none"
            >
              {zone}
            </text>
          </g>
        ))}

        {/* Entity nodes */}
        {Object.entries(entityGroups).map(([zone, zoneEntities]) => {
          const basePos = ZONE_POSITIONS[zone] ?? { x: 50, y: 50 }
          return zoneEntities.map((entity, idx) => {
            const pos = jitter(basePos.x, basePos.y, idx, zoneEntities.length)
            const color = getEntityColor(entity)
            const isSelected = entity.id === selectedId
            const energy = entity.energy ?? 50
            const r = 2 + (energy / 100) * 2

            return (
              <g
                key={entity.id}
                onClick={() => onSelectEntity(entity)}
                className="cursor-pointer entity-node"
                role="button"
                aria-label={`Entity ${entity.name}`}
              >
                {/* Glow */}
                <circle cx={pos.x} cy={pos.y} r={r + 3} fill={color} opacity="0.1" />
                {/* Main node */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={color}
                  opacity={entity.status === 'dying' ? 0.4 : 0.85}
                  stroke={isSelected ? '#fff' : color}
                  strokeWidth={isSelected ? 0.8 : 0.3}
                />
                {/* Name label */}
                <text
                  x={pos.x}
                  y={pos.y + r + 3}
                  textAnchor="middle"
                  fill={color}
                  fontSize="2.2"
                  opacity="0.8"
                  className="select-none"
                >
                  {entity.name}
                </text>
              </g>
            )
          })
        })}
      </svg>

      {/* Zone legend */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-xs">
        {Object.entries(ZONE_COLORS).map(([zone, color]) => (
          <span key={zone} className="flex items-center gap-1 opacity-60">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {zone}
          </span>
        ))}
      </div>

      {/* Empty state */}
      {entities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-600 text-sm animate-pulse">Awaiting life...</p>
        </div>
      )}
    </div>
  )
}
