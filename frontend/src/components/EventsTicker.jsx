import { useRef, useEffect } from 'react'

const EVENT_TYPE_STYLES = {
  world_event: 'text-yellow-400',
  thought: 'text-cyan-300',
  birth: 'text-green-400',
  dying: 'text-red-400',
  reseed: 'text-purple-400',
}

const EVENT_ICONS = {
  world_event: '🌍',
  thought: '💭',
  birth: '✨',
  dying: '💀',
  reseed: '🌱',
  bloom: '🌸',
  meteor: '☄️',
  silence: '🔇',
  storm_surge: '⛈️',
  memory_wave: '📚',
  void_call: '🌑',
}

function FeedItem({ item }) {
  const type = item.type
  const style = EVENT_TYPE_STYLES[type] ?? 'text-slate-400'

  let message = ''
  if (type === 'thought') {
    message = `${item.entity_name}: ${item.reflection || ''}`
    if (item.spoken_words) message += ` 💬 "${item.spoken_words}"`
  } else if (type === 'world_event') {
    message = item.event?.description ?? ''
  } else if (type === 'birth') {
    message = `${item.child_name} is born! Parents: ${item.parent_a} & ${item.parent_b}`
  } else if (type === 'dying') {
    message = `${item.entity_name} is dying: "${item.dying_message}"`
  } else if (type === 'reseed') {
    message = item.message ?? 'New life begins.'
  }

  const icon = EVENT_ICONS[type] ?? EVENT_ICONS[item.event?.event_type] ?? '·'
  const tick = item.tick ? `t${item.tick}` : ''

  return (
    <span className={`inline-flex items-baseline gap-1.5 mx-2 whitespace-nowrap ${style}`}>
      <span>{icon}</span>
      {tick && <span className="text-slate-600 text-xs">[{tick}]</span>}
      <span className="text-xs">{message}</span>
    </span>
  )
}

function WorldEventRow({ event }) {
  const icon = EVENT_ICONS[event.event_type] ?? '🌍'
  return (
    <span className="inline-flex items-baseline gap-1.5 mx-3 whitespace-nowrap text-yellow-400/80">
      <span>{icon}</span>
      <span className="text-xs text-slate-500">[t{event.tick}]</span>
      <span className="text-xs">{event.description}</span>
    </span>
  )
}

export default function EventsTicker({ events, feed }) {
  const scrollRef = useRef(null)
  const combined = [
    ...feed.slice(0, 50),
    ...events.slice(0, 20).map(e => ({ ...e, type: '_worldevent', _source: 'history' })),
  ]

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = 0
  }, [feed.length])

  return (
    <div className="border-t border-cyan-900/30 bg-deep-800/60 backdrop-blur">
      {/* World events row */}
      {events.length > 0 && (
        <div className="border-b border-slate-800/50 py-1 overflow-x-auto scrollbar-none flex items-center px-2">
          <span className="text-xs text-slate-600 uppercase tracking-wider mr-3 shrink-0">World</span>
          <div className="flex">
            {events.slice(0, 10).map((e) => (
              <WorldEventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {/* Live feed row */}
      <div
        ref={scrollRef}
        className="flex items-center py-1.5 overflow-x-auto whitespace-nowrap scrollbar-none"
        style={{ maxHeight: '40px' }}
      >
        <span className="text-xs text-slate-600 uppercase tracking-wider px-3 shrink-0">Live</span>
        {feed.length === 0 ? (
          <span className="text-xs text-slate-700 italic px-2">Waiting for activity...</span>
        ) : (
          feed.slice(0, 30).map((item, i) => (
            <FeedItem key={i} item={item} />
          ))
        )}
      </div>
    </div>
  )
}
