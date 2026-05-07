import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const VALENCE_STYLE = {
  friend:  { color: '#34d399', icon: '◈', label: 'Friend' },
  rival:   { color: '#f87171', icon: '◉', label: 'Rival' },
  family:  { color: '#a78bfa', icon: '◆', label: 'Kin' },
  neutral: { color: '#9ca3af', icon: '◇', label: 'Known' },
}

function RelationshipBadge({ rel }) {
  const style = VALENCE_STYLE[rel.valence] || VALENCE_STYLE.neutral
  const bars = Math.round((rel.intensity || 0) * 5)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <span style={{ color: style.color, fontSize: 14, marginTop: 1 }}>{style.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#f3f4f6', fontSize: 13, fontWeight: 500 }}>{rel.name}</span>
          <span style={{
            fontSize: 10, padding: '1px 5px', borderRadius: 3,
            background: style.color + '22', color: style.color, fontWeight: 600,
          }}>
            {style.label}
          </span>
          <span style={{ color: '#6b7280', fontSize: 11 }}>
            {'█'.repeat(bars)}{'░'.repeat(5 - bars)}
          </span>
          <span style={{ color: '#4b5563', fontSize: 10 }}>{rel.encounters}×</span>
        </div>
        {rel.key_memory && (
          <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>
            "{rel.key_memory}"
          </div>
        )}
      </div>
    </div>
  )
}

export default function EntityPanel({ entity: baseEntity, onFeed }) {
  const [entity, setEntity] = useState(baseEntity)
  const [logs, setLogs] = useState([])
  const [activeTab, setActiveTab] = useState('mind')

  useEffect(() => {
    setEntity(baseEntity)
    if (baseEntity?.id) {
      fetch(`${API}/entities/${baseEntity.id}`)
        .then(r => r.json()).then(setEntity).catch(() => {})
      fetch(`${API}/entities/${baseEntity.id}/log`)
        .then(r => r.json()).then(setLogs).catch(() => {})
    }
  }, [baseEntity?.id])

  if (!entity) {
    return (
      <div style={{ padding: 24, color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
        Select an entity to inspect its inner life
      </div>
    )
  }

  const genome = entity.genome || {}
  const emotional = entity.emotional_state || {}
  const beliefs = entity.beliefs || {}
  const memories = [...(entity.memory || [])].reverse()
  const memoryArchive = [...(entity.memory_archive || [])].reverse()
  const relationships = entity.relationships || {}
  const relEntries = Object.values(relationships).sort((a, b) => (b.intensity || 0) - (a.intensity || 0))

  const GENOME_COLORS = {
    curiosity: '#60a5fa', empathy: '#34d399', aggression: '#f87171',
    creativity: '#c084fc', survival_drive: '#fbbf24',
  }
  const GENOME_LABELS = {
    curiosity: 'Curiosity', empathy: 'Empathy', aggression: 'Aggression',
    creativity: 'Creativity', survival_drive: 'Will',
  }

  const tabs = [
    { id: 'mind', label: 'Mind' },
    { id: 'relations', label: `Relations${relEntries.length ? ` (${relEntries.length})` : ''}` },
    { id: 'memory', label: 'Memory' },
    { id: 'log', label: 'Log' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#f3f4f6', fontWeight: 700, fontSize: 16 }}>{entity.name}</span>
              {!entity.is_alive && (
                <span style={{ color: '#6b7280', fontSize: 12 }}>† deceased</span>
              )}
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: '#1f2937', color: '#9ca3af',
              }}>gen {entity.generation}</span>
            </div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
              {entity.current_zone} · age {entity.age_ticks}
            </div>
          </div>
          {entity.is_alive && (
            <button
              onClick={() => onFeed?.(entity.id)}
              style={{
                background: '#065f46', color: '#6ee7b7', border: 'none',
                borderRadius: 6, padding: '5px 10px', fontSize: 11,
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              + Feed
            </button>
          )}
        </div>

        {/* Energy + emotion */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, height: 4, background: '#1f2937', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width 0.5s',
              background: entity.energy > 50 ? '#34d399' : entity.energy > 25 ? '#fbbf24' : '#f87171',
              width: `${entity.energy}%`,
            }} />
          </div>
          <span style={{ color: '#9ca3af', fontSize: 11, minWidth: 30 }}>
            {Math.round(entity.energy)}%
          </span>
          <span style={{
            fontSize: 11, padding: '1px 6px', borderRadius: 3,
            background: '#1f2937', color: '#d1d5db',
          }}>
            {emotional.emotion || '—'}
          </span>
        </div>

        {/* Genome bars */}
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {Object.entries(GENOME_COLORS).map(([trait, color]) => (
            <div key={trait} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 3, background: '#1f2937', borderRadius: 1 }}>
                <div style={{
                  height: '100%', borderRadius: 1,
                  background: color, width: `${(genome[trait] || 0) * 100}%`,
                }} />
              </div>
              <div style={{ color: '#4b5563', fontSize: 9, marginTop: 2 }}>
                {GENOME_LABELS[trait].slice(0, 3)}
              </div>
            </div>
          ))}
        </div>

        {/* Current goal */}
        {entity.current_goal && (
          <div style={{
            marginTop: 8, padding: '5px 8px', borderRadius: 4,
            background: '#1e3a5f', borderLeft: '2px solid #3b82f6',
          }}>
            <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>
              GOAL
            </div>
            <div style={{ color: '#bfdbfe', fontSize: 12, fontStyle: 'italic' }}>
              {entity.current_goal}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '7px 4px', fontSize: 11, border: 'none',
              cursor: 'pointer', fontWeight: activeTab === tab.id ? 600 : 400,
              background: activeTab === tab.id ? '#111827' : 'transparent',
              color: activeTab === tab.id ? '#f3f4f6' : '#6b7280',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>

        {/* MIND TAB */}
        {activeTab === 'mind' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entity.last_thought && (
              <div>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
                  LAST THOUGHT
                </div>
                <div style={{
                  color: '#d1d5db', fontSize: 12, lineHeight: 1.5,
                  padding: '8px 10px', background: '#111827', borderRadius: 6,
                  borderLeft: '2px solid #6366f1',
                }}>
                  {entity.last_thought}
                </div>
              </div>
            )}

            {entity.current_desire && (
              <div>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
                  DESIRE
                </div>
                <div style={{ color: '#a78bfa', fontSize: 12, fontStyle: 'italic' }}>
                  {entity.current_desire}
                </div>
              </div>
            )}

            {entity.existential_statement && (
              <div>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
                  WHAT I AM
                </div>
                <div style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
                  "{entity.existential_statement}"
                </div>
              </div>
            )}

            {Object.keys(beliefs).length > 0 && (
              <div>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>
                  BELIEFS
                </div>
                {Object.entries(beliefs).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 5 }}>
                    <span style={{ color: '#4b5563', fontSize: 10 }}>{k}: </span>
                    <span style={{ color: '#d1d5db', fontSize: 12 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {entity.final_message && (
              <div style={{
                padding: 10, background: '#1c1917', borderRadius: 6,
                border: '1px solid #292524',
              }}>
                <div style={{ color: '#78716c', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>
                  FINAL TESTAMENT
                </div>
                <div style={{ color: '#d6d3d1', fontSize: 12, lineHeight: 1.6 }}>
                  {entity.final_message.final_words}
                </div>
                <div style={{ color: '#78716c', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                  "{entity.final_message.life_meaning}"
                </div>
                <div style={{ color: '#57534e', fontSize: 11, marginTop: 4 }}>
                  Gift: {entity.final_message.gift_to_world}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RELATIONS TAB */}
        {activeTab === 'relations' && (
          <div>
            {relEntries.length === 0 ? (
              <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>
                No relationships yet
              </div>
            ) : (
              <>
                {['family', 'friend', 'rival', 'neutral'].map(valence => {
                  const group = relEntries.filter(r => r.valence === valence)
                  if (!group.length) return null
                  const style = VALENCE_STYLE[valence]
                  return (
                    <div key={valence} style={{ marginBottom: 12 }}>
                      <div style={{
                        color: style.color, fontSize: 10, fontWeight: 600,
                        marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1,
                      }}>
                        {style.label}s
                      </div>
                      {group.map((rel, i) => (
                        <RelationshipBadge key={i} rel={rel} />
                      ))}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* MEMORY TAB */}
        {activeTab === 'memory' && (
          <div>
            {memories.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>
                  RECENT
                </div>
                {memories.map((m, i) => (
                  <div key={i} style={{
                    color: '#d1d5db', fontSize: 11, padding: '5px 0',
                    borderBottom: '1px solid #111827', lineHeight: 1.4,
                  }}>
                    {m}
                  </div>
                ))}
              </div>
            )}

            {memoryArchive.length > 0 && (
              <div>
                <div style={{ color: '#4b5563', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>
                  EPISODIC — DISTANT PAST
                </div>
                {memoryArchive.map((m, i) => (
                  <div key={i} style={{
                    color: '#6b7280', fontSize: 11, padding: '5px 0',
                    borderBottom: '1px solid #0f1117', lineHeight: 1.4,
                    fontStyle: 'italic',
                  }}>
                    {m}
                  </div>
                ))}
              </div>
            )}

            {memories.length === 0 && memoryArchive.length === 0 && (
              <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>
                No memories yet
              </div>
            )}
          </div>
        )}

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div>
            {logs.length === 0 ? (
              <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>
                No consciousness logs yet
              </div>
            ) : (
              logs.slice(0, 40).map((log, i) => (
                <div key={i} style={{
                  padding: '6px 0', borderBottom: '1px solid #111827',
                }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center' }}>
                    <span style={{ color: '#374151', fontSize: 10 }}>t{log.tick}</span>
                    <span style={{
                      color: '#6366f1', fontSize: 10, padding: '1px 4px',
                      background: '#1e1b4b', borderRadius: 2,
                    }}>
                      {log.action}
                    </span>
                    {log.action_target && (
                      <span style={{ color: '#4b5563', fontSize: 10 }}>→ {log.action_target}</span>
                    )}
                    <span style={{ color: '#374151', fontSize: 10, marginLeft: 'auto' }}>
                      {log.emotion}
                    </span>
                  </div>
                  {log.thought && (
                    <div style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.4 }}>
                      {log.thought}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
