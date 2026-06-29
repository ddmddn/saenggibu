import { useState } from 'react'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { useCoins } from '../hooks/useCoins'
import { useRoutines } from '../hooks/useRoutines'
import { useFocusTarget } from '../hooks/useFocusTarget'
import { useChallenges } from '../hooks/useChallenges'
import type { FocusCategory } from '../lib/types'

const CATEGORY_EMOJI: Record<string, string> = {
  '일': '💼', '루틴': '✅', '독서·운동': '📚', '관계 회복': '🤝', '자기계발': '🚀',
}
const CATEGORIES: FocusCategory[] = ['일', '루틴', '독서·운동', '관계 회복', '자기계발']

export default function Home() {
  const { season } = useSeason()
  const { total: coins } = useCoins(season?.id)
  const { routines, logs, toggleComplete } = useRoutines(season?.id)
  const { target, set: setFocus, lock, rate } = useFocusTarget()
  const { active: activeChallenges } = useChallenges(season?.id)

  const [showFocusForm, setShowFocusForm] = useState(false)
  const [focusCat, setFocusCat] = useState<FocusCategory>('자기계발')
  const [focusDesc, setFocusDesc] = useState('')
  const [showRateModal, setShowRateModal] = useState(false)

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  const completedCount = routines.filter(r => logs[r.id]?.completed).length
  const coinValue = Math.round(coins * (season?.coin_rate ?? 100))

  const saveFocus = async () => {
    if (!focusDesc.trim()) return
    await setFocus(focusCat, focusDesc.trim())
    setShowFocusForm(false)
    setFocusDesc('')
  }

  return (
    <div className="page home-page">
      <header className="home-header">
        <span className="home-date">{today}</span>
        {season && <span className="home-season">시즌 {season.season_number}</span>}
      </header>

      {/* 오늘의 집중대상 */}
      {target ? (
        <Card className="focus-card">
          <div className="focus-card-label">오늘의 집중대상</div>
          <div className="focus-card-body">
            <span className="focus-emoji">{CATEGORY_EMOJI[target.category]}</span>
            <div style={{ flex: 1 }}>
              <div className="focus-category">{target.category}</div>
              <div className="focus-desc">{target.description}</div>
              {target.changed_count > 0 && (
                <div style={{ fontSize: 11, color: '#c4b5fd', marginTop: 2 }}>변경 {target.changed_count}회</div>
              )}
            </div>
            {target.locked
              ? <span className="lock-badge">🔒</span>
              : <button className="lock-btn" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)' }} onClick={lock}>잠금</button>
            }
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            {!target.locked && (
              <button className="text-btn" style={{ color: '#c4b5fd', fontSize: 12 }} onClick={() => setShowFocusForm(true)}>수정</button>
            )}
            {target.self_rating ? (
              <span style={{ fontSize: 12, color: '#c4b5fd' }}>오늘 평가: {'⭐'.repeat(target.self_rating)}</span>
            ) : (
              <button className="text-btn" style={{ color: '#c4b5fd', fontSize: 12 }} onClick={() => setShowRateModal(true)}>
                오늘 자가평가 →
              </button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="focus-card">
          <div className="focus-card-label">오늘의 집중대상</div>
          {showFocusForm ? (
            <div className="focus-form">
              <div className="focus-cat-chips">
                {CATEGORIES.map(c => (
                  <button key={c} className={`chip${focusCat === c ? ' active' : ''}`}
                    style={focusCat === c ? { background: 'rgba(255,255,255,.2)', borderColor: '#fff', color: '#fff' } : { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.2)', color: '#ddd6fe' }}
                    onClick={() => setFocusCat(c)}>{c}</button>
                ))}
              </div>
              <input
                className="focus-desc-input"
                style={{ background: 'rgba(255,255,255,.1)', borderColor: 'rgba(255,255,255,.2)', color: '#fff' }}
                placeholder="오늘 집중할 것을 한 줄로..."
                value={focusDesc}
                onChange={e => setFocusDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveFocus()}
                autoFocus
              />
              <button className="login-btn" style={{ marginTop: 8, background: 'rgba(255,255,255,.2)' }} onClick={saveFocus}>설정</button>
            </div>
          ) : (
            <button className="add-routine-btn"
              style={{ borderColor: 'rgba(255,255,255,.3)', color: '#ddd6fe' }}
              onClick={() => setShowFocusForm(true)}>
              + 오늘의 집중대상 설정하기
            </button>
          )}
        </Card>
      )}

      {/* 코인 현황 */}
      <Card className="coin-card">
        <div className="coin-card-label">이번 시즌 적립금</div>
        <div className="coin-row">
          <span className="coin-count">🪙 {Math.round(coins).toLocaleString()}</span>
          <span className="coin-value">{coinValue.toLocaleString()}원</span>
        </div>
      </Card>

      {/* 루틴 미니 체크리스트 */}
      {routines.length > 0 && (
        <Card>
          <div className="section-header">
            <span className="section-title">오늘의 루틴</span>
            <span className="section-sub">{completedCount}/{routines.length}</span>
          </div>
          <ProgressBar value={routines.length ? (completedCount / routines.length) * 100 : 0} />
          <ul className="routine-mini-list">
            {routines.slice(0, 5).map(r => {
              const log = logs[r.id]
              const done = log?.completed ?? false
              return (
                <li key={r.id} className={`routine-mini-item${done ? ' done' : ''}`}
                  onClick={() => !log?.locked && toggleComplete(r.id, season?.coin_rate ?? 100)}
                  style={{ cursor: log?.locked ? 'default' : 'pointer' }}>
                  <span className="routine-check">{done ? '✅' : '⬜'}</span>
                  <span className="routine-title">{r.title}</span>
                  <span className="routine-streak">🔥{r.streak_current}일</span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {routines.length === 0 && (
        <Card>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '8px 0' }}>
            루틴 탭에서 첫 루틴을 추가해보세요 ✨
          </p>
        </Card>
      )}

      {/* 진행중인 챌린지 */}
      {activeChallenges.length > 0 && (
        <Card>
          <div className="section-header">
            <span className="section-title">진행중인 챌린지</span>
            <span className="section-sub">{activeChallenges.length}개</span>
          </div>
          {activeChallenges.slice(0, 2).map(ch => (
            <div key={ch.id} style={{ marginBottom: 10 }}>
              <div className="challenge-title">{ch.title}</div>
              <div className="challenge-progress-row">
                <ProgressBar value={(ch.progress_count / ch.duration_days) * 100} color="var(--positive)" />
                <span className="challenge-count">{ch.progress_count}/{ch.duration_days}일</span>
              </div>
              {ch.duration_days - ch.progress_count <= 3 && (
                <div className="promote-hint">🎉 {ch.duration_days - ch.progress_count}일 남음!</div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* 자가평가 모달 */}
      {showRateModal && (
        <Modal title="오늘 집중대상 자가평가" onClose={() => setShowRateModal(false)}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            오늘 집중대상에 얼마나 집중했나요?
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={async () => { await rate(n); setShowRateModal(false) }}
                style={{ flex: 1, padding: '14px 0', fontSize: 22, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }}>
                {'⭐'.repeat(n)}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
