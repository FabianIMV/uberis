const EVENT_ICON = {
  thought:     '💭',
  birth:       '✨',
  death:       '🌑',
  world_event: '🌍',
  encounter:   '⚡',
  grief:       '💔',
  bloom:       '🌸',
  meteor:      '☄️',
  silence:     '🤫',
  enlightenment: '🔮',
  storm_surge: '⛈️',
  convergence: '🔗',
}

const EVENT_COLOR = {
  thought:     'text-cyan-400',
  birth:       'text-emerald-400',
  death:       'text-slate-500',
  world_event: 'text-amber-400',
  encounter:   'text-purple-400',
  grief:       'text-slate-400',
}

function LiveEvent({ event }) {
  const icon = EVENT_ICON[event.type] || EVENT_ICON[event.type] || '·'
  const color = EVENT_COLOR[event.type] || 'text-slate-400'

  let text = ''
  switch (event.type) {
    case 'thought':
      text = `${event.name} (${event.zone}): ${(event.thought || '').slice(0, 90)}`
      break
    case 'birth':
      text = `${event.name} born — gen ${event.generation}${event.parent_a ? ` from ${event.parent_a}` : ''}${event.parent_b ? ` & ${event.parent_b}` : ''}`
      break
    case 'death':
      text = `${event.name} has ended — "${(event.final_words || event.life_meaning || '').slice(0, 80)}"`
      break
    case 'world_event':
      text = event.description?.slice(0, 100)
      break
    case 'encounter':
      text = `${event.entity_a?.name} & ${event.entity_b?.name} in ${event.zone} — ${event.outcome}`
      break
    case 'grief':
      text = `${event.griever} grieves for ${event.lost}`
      break
    default:
      text = JSON.stringify(event).slice(0, 80)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors shrink-0">
      <span className="text-sm shrink-0">{icon}</span>
      <span className={`text-xs ${color} truncate`}>{text}</span>
      <span className="text-xs text-slate-700 shrink-0 ml-auto font-mono">t{event.tick || ''}</span>
    </div>
  )
}

export default function EventsTicker({ events, worldEvents }) {
  return (
    <div className="flex h-32 divide-x divide-slate-800">
      {/* Live feed (left, scrollable) */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Feed</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-700 italic">
              Waiting for consciousness…
            </div>
          ) : (
            events.map(ev => <LiveEvent key={ev.id} event={ev} />)
          )}
        </div>
      </div>

      {/* World events history (right, scrollable) */}
      <div className="w-72 overflow-hidden flex flex-col">
        <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-800 shrink-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">World Events</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {worldEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-700 italic">
              None yet
            </div>
          ) : (
            worldEvents.map(ev => (
              <div key={ev.id} className="px-3 py-2 border-b border-slate-800/50 text-xs">
                <div className="flex items-center gap-2 mb-0.5">
                  <span>{EVENT_ICON[ev.type] || '🌍'}</span>
                  <span className="text-amber-400 font-medium capitalize">{ev.type.replace('_', ' ')}</span>
                  {ev.zone && <span className="text-slate-600">· {ev.zone}</span>}
                  <span className="ml-auto text-slate-700 font-mono">t{ev.tick}</span>
                </div>
                <p className="text-slate-400 line-clamp-2">{ev.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
