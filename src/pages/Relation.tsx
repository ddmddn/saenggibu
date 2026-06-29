import { useState } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { usePeople, usePersonDetail } from '../hooks/usePeople'
import type { EnergyTag, Person } from '../lib/types'

type Filter = 'all' | '채워주는' | '소모시키는'

const ENERGY_COLOR: Record<EnergyTag, string> = {
  '채워주는': 'var(--positive)',
  '소모시키는': 'var(--negative)',
  '중립': 'var(--text-muted)',
}

export default function Relation() {
  const { season } = useSeason()
  const { people, add, remove } = usePeople()
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Person | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [search, setSearch] = useState('')

  // 추가 폼
  const [newName, setNewName] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newEnergy, setNewEnergy] = useState<EnergyTag>('중립')

  const filtered = people.filter(p => {
    const matchFilter = filter === 'all' || p.energy_tag === filter
    const matchSearch = !search || p.name.includes(search) || (p.relationship_tag ?? '').includes(search)
    return matchFilter && matchSearch
  })

  if (selected) {
    return (
      <PersonProfile
        person={selected}
        seasonId={season?.id}
        onBack={() => setSelected(null)}
        onDelete={async () => { await remove(selected.id); setSelected(null) }}
      />
    )
  }

  return (
    <div className="page">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          placeholder="이름 또는 태그 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-chips">
        {(['all', '채워주는', '소모시키는'] as Filter[]).map(f => (
          <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? '전체' : f}
          </button>
        ))}
      </div>

      <div className="people-list">
        {filtered.length === 0
          ? <p className="empty-msg" style={{ padding: '24px 0', textAlign: 'center' }}>
              {people.length === 0 ? '아래 + 버튼으로 사람을 추가해보세요.' : '검색 결과가 없어요.'}
            </p>
          : filtered.map(p => (
              <Card key={p.id} className="person-card" onClick={() => setSelected(p)}>
                <div className="person-avatar" style={{ borderColor: ENERGY_COLOR[p.energy_tag] }}>
                  {p.name[0]}
                </div>
                <div className="person-info">
                  <div className="person-name">{p.name}</div>
                  {p.relationship_tag && <div className="person-tag">{p.relationship_tag}</div>}
                </div>
                <div className="person-right">
                  <span className="energy-dot" style={{ color: ENERGY_COLOR[p.energy_tag] }}>
                    {p.energy_tag === '채워주는' ? '↑' : p.energy_tag === '소모시키는' ? '↓' : '—'}
                  </span>
                  <span className="person-tag">{p.energy_tag}</span>
                </div>
              </Card>
            ))
        }
      </div>

      <button className="fab" onClick={() => setShowAddModal(true)}>+</button>

      {showAddModal && (
        <Modal title="사람 추가" onClose={() => setShowAddModal(false)}>
          <input className="focus-desc-input" placeholder="이름" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="관계 (친구, 직장, 가족...)" value={newTag} onChange={e => setNewTag(e.target.value)} />
          <div style={{ marginTop: 12, marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>에너지</div>
          <div className="focus-cat-chips">
            {(['채워주는', '중립', '소모시키는'] as EnergyTag[]).map(e => (
              <button key={e} className={`chip${newEnergy === e ? ' active' : ''}`} onClick={() => setNewEnergy(e)}>{e}</button>
            ))}
          </div>
          <button className="login-btn" style={{ marginTop: 16 }} onClick={async () => {
            await add(newName, newTag, newEnergy)
            setNewName(''); setNewTag(''); setNewEnergy('중립'); setShowAddModal(false)
          }}>추가</button>
        </Modal>
      )}
    </div>
  )
}

function PersonProfile({ person, seasonId, onBack, onDelete }: {
  person: Person; seasonId?: string; onBack: () => void; onDelete: () => void
}) {
  const { events, weeklyThoughts, thisWeekTotal, addThought, addEvent, removeEvent } = usePersonDetail(person.id)
  const [showEventModal, setShowEventModal] = useState(false)
  const [evText, setEvText] = useState('')
  const [evEmotion, setEvEmotion] = useState('')
  const [evLearned, setEvLearned] = useState('')

  const maxBar = Math.max(...weeklyThoughts, 1)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button className="back-btn" onClick={onBack}>← 뒤로</button>
        <button className="icon-btn" onClick={() => { if (confirm(`${person.name}을 삭제할까요?`)) onDelete() }}>🗑️</button>
      </div>

      <div className="profile-header">
        <div className="profile-avatar">{person.name[0]}</div>
        <div className="profile-name">{person.name}</div>
        <div className="profile-tags">
          {person.relationship_tag && <span className="chip">{person.relationship_tag}</span>}
          <span className="chip" style={{ color: ENERGY_COLOR[person.energy_tag] }}>{person.energy_tag}</span>
        </div>
      </div>

      <Card>
        <div className="section-header">
          <span className="section-title">생각 빈도</span>
          <span className="section-sub">이번 주 {thisWeekTotal}회</span>
        </div>
        <div className="thought-freq-row">
          {weeklyThoughts.map((v, i) => (
            <div key={i} className="freq-bar-wrap">
              <div className="freq-bar" style={{ height: `${Math.round((v / maxBar) * 48)}px` }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {['7일전','6','5','4','3','2','오늘'].map(d => <span key={d}>{d}</span>)}
        </div>
        <button className="thought-tap-btn" style={{ width: '100%', marginTop: 12 }}
          onClick={() => addThought(seasonId)}>
          생각났음 +1 (-1🪙)
        </button>
      </Card>

      <Card>
        <div className="section-header">
          <span className="section-title">기록</span>
          <button className="text-btn" onClick={() => setShowEventModal(true)}>+ 추가</button>
        </div>
        {events.length === 0
          ? <p className="empty-msg">아직 기록이 없어요.</p>
          : events.map(ev => (
              <div key={ev.id} className="event-item">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="event-date">{ev.date}</div>
                  <button className="icon-btn" onClick={() => removeEvent(ev.id)}>🗑️</button>
                </div>
                {ev.event_text   && <div className="event-text">{ev.event_text}</div>}
                {ev.emotion_text && <div className="event-emotion">감정: {ev.emotion_text}</div>}
                {ev.learned_text && <div className="event-learned">배운 점: {ev.learned_text}</div>}
              </div>
            ))
        }
      </Card>

      {showEventModal && (
        <Modal title="기록 추가" onClose={() => setShowEventModal(false)}>
          <textarea className="modal-textarea" placeholder="무슨 일이 있었나요?" value={evText} onChange={e => setEvText(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="감정" value={evEmotion} onChange={e => setEvEmotion(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="배운 점" value={evLearned} onChange={e => setEvLearned(e.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={async () => {
            await addEvent({ event_text: evText || undefined, emotion_text: evEmotion || undefined, learned_text: evLearned || undefined })
            setEvText(''); setEvEmotion(''); setEvLearned(''); setShowEventModal(false)
          }}>저장</button>
        </Modal>
      )}
    </div>
  )
}
