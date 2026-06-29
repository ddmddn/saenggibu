import { useState } from 'react'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { useRoutines } from '../hooks/useRoutines'
import { useChallenges } from '../hooks/useChallenges'
import type { ChallengeType } from '../lib/types'

const CHALLENGE_TYPES: ChallengeType[] = ['거리두기', '연결', '소비대기', '기타']

export default function Routine() {
  const { season } = useSeason()
  const { routines, logs, loading, toggleComplete, lockLog, addRoutine } = useRoutines(season?.id)
  const { active, completed, failed, add: addChallenge, checkDay, fail, promoteToRoutine, remove: removeChallenge } = useChallenges(season?.id)

  // 루틴 추가 폼
  const [showAddRoutine, setShowAddRoutine] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addPosition, setAddPosition] = useState<'before' | 'after'>('after')

  // 챌린지 추가 모달
  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [chType, setChType] = useState<ChallengeType>('거리두기')
  const [chTitle, setChTitle] = useState('')
  const [chDays, setChDays] = useState('7')

  const seasonDay = season
    ? Math.floor((Date.now() - new Date(season.start_date).getTime()) / 86400000) + 1
    : 0

  const handleAddRoutine = async () => {
    if (!newTitle.trim()) return
    const refIndex = addPosition === 'after' ? routines.length - 1 : 0
    await addRoutine(newTitle.trim(), addPosition, refIndex)
    setNewTitle('')
    setShowAddRoutine(false)
  }

  const handleAddChallenge = async () => {
    const days = parseInt(chDays)
    if (!chTitle.trim() || isNaN(days) || days < 1) return
    await addChallenge({ type: chType, title: chTitle.trim(), durationDays: days })
    setChTitle('')
    setChDays('7')
    setShowChallengeModal(false)
  }

  if (loading) return <div className="page"><p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p></div>

  return (
    <div className="page">
      {/* 시즌 진행률 */}
      {season && (
        <Card>
          <div className="section-header">
            <span className="section-title">시즌 {season.season_number} 진행률</span>
            <span className="section-sub">{seasonDay}/180일</span>
          </div>
          <ProgressBar value={(seasonDay / 180) * 100} height={8} />
        </Card>
      )}

      {/* 오늘의 루틴 체인 */}
      <Card>
        <div className="section-header">
          <span className="section-title">오늘의 루틴</span>
          <span className="section-sub">{routines.filter(r => logs[r.id]?.completed).length}/{routines.length} 완료</span>
        </div>

        {routines.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>
            아래 버튼으로 첫 루틴을 추가해보세요!
          </p>
        ) : (
          <ul className="routine-chain">
            {routines.map((r, i) => {
              const log = logs[r.id]
              const done = log?.completed ?? false
              const locked = log?.locked ?? false
              return (
                <li key={r.id} className={`chain-item${done ? ' done' : ''}`}>
                  <div className="chain-line-wrap">
                    <div className={`chain-dot${done ? ' filled' : ''}`} />
                    {i < routines.length - 1 && <div className="chain-line" />}
                  </div>
                  <div className="chain-content">
                    <div className="chain-title-row"
                      onClick={() => !locked && toggleComplete(r.id, season?.coin_rate ?? 100)}
                      style={{ cursor: locked ? 'default' : 'pointer' }}>
                      <span className="chain-title">{r.title}</span>
                      <span className="chain-streak">🔥{r.streak_current}일</span>
                    </div>
                    {done && !locked && (
                      <button className="lock-btn" onClick={() => lockLog(r.id)}>확정하기 🔒</button>
                    )}
                    {locked && <span className="locked-tag">확정됨 ✓</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!showAddRoutine ? (
          <button className="add-routine-btn" onClick={() => setShowAddRoutine(true)}>+ 루틴 추가하기</button>
        ) : (
          <div className="add-form">
            <div className="add-pos-chips">
              <button className={`chip${addPosition === 'after' ? ' active' : ''}`} onClick={() => setAddPosition('after')}>맨 뒤에</button>
              <button className={`chip${addPosition === 'before' ? ' active' : ''}`} onClick={() => setAddPosition('before')}>맨 앞에</button>
            </div>
            <input className="focus-desc-input" placeholder="루틴 이름..." value={newTitle}
              onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRoutine()} autoFocus />
            <div className="add-form-btns">
              <button className="login-btn" onClick={handleAddRoutine}>추가</button>
              <button className="text-btn" onClick={() => { setShowAddRoutine(false); setNewTitle('') }}>취소</button>
            </div>
          </div>
        )}
      </Card>

      {/* 진행중인 챌린지 */}
      <Card>
        <div className="section-header">
          <span className="section-title">챌린지</span>
          <button className="text-btn" onClick={() => setShowChallengeModal(true)}>+ 추가</button>
        </div>

        {active.length === 0 && completed.length === 0 && failed.length === 0 ? (
          <p className="empty-msg">챌린지를 추가해보세요! 완료 시 +30🪙</p>
        ) : (
          <>
            {active.map(ch => {
              const daysLeft = ch.duration_days - ch.progress_count
              return (
                <div key={ch.id} className="challenge-item">
                  <div className="section-header" style={{ marginBottom: 6 }}>
                    <div>
                      <span className="challenge-title" style={{ marginBottom: 0 }}>{ch.title}</span>
                      <span className="challenge-badge" style={{ marginLeft: 6 }}>{ch.type}</span>
                    </div>
                    <button className="icon-btn" onClick={() => { if (confirm('챌린지를 삭제할까요?')) removeChallenge(ch.id) }}>🗑️</button>
                  </div>
                  <div className="challenge-progress-row">
                    <ProgressBar value={(ch.progress_count / ch.duration_days) * 100} color="var(--positive)" />
                    <span className="challenge-count">{ch.progress_count}/{ch.duration_days}일</span>
                  </div>
                  {daysLeft <= 3 && daysLeft > 0 && (
                    <div className="promote-hint">🎉 {daysLeft}일 남음 — 거의 다 왔어요!</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="login-btn" style={{ flex: 1, padding: '8px 0', fontSize: 13 }}
                      onClick={() => checkDay(ch.id)}>오늘 완료 ✓</button>
                    {ch.status === 'completed' || ch.progress_count >= ch.duration_days ? (
                      !ch.promoted_to_routine && season && (
                        <button className="text-btn" style={{ fontSize: 13 }}
                          onClick={() => promoteToRoutine(ch.id, season.id)}>루틴으로 승격 →</button>
                      )
                    ) : (
                      <button className="text-btn" style={{ color: 'var(--negative)', fontSize: 13 }}
                        onClick={() => { if (confirm('챌린지를 실패 처리할까요?')) fail(ch.id) }}>포기</button>
                    )}
                  </div>
                </div>
              )
            })}

            {completed.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>완료된 챌린지</div>
                {completed.map(ch => (
                  <div key={ch.id} className="challenge-item" style={{ opacity: .7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-strong)' }}>✓ {ch.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--positive)' }}>+30🪙</span>
                    </div>
                    {!ch.promoted_to_routine && season && (
                      <button className="text-btn" style={{ fontSize: 12, marginTop: 4 }}
                        onClick={() => promoteToRoutine(ch.id, season.id)}>루틴으로 승격 →</button>
                    )}
                    {ch.promoted_to_routine && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>루틴 승격됨</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {failed.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>실패한 챌린지</div>
                {failed.map(ch => (
                  <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: .5, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{ch.title}</span>
                    <button className="icon-btn" onClick={() => removeChallenge(ch.id)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 챌린지 추가 모달 */}
      {showChallengeModal && (
        <Modal title="챌린지 추가 (+30🪙)" onClose={() => setShowChallengeModal(false)}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>종류</div>
          <div className="focus-cat-chips" style={{ marginBottom: 14 }}>
            {CHALLENGE_TYPES.map(t => (
              <button key={t} className={`chip${chType === t ? ' active' : ''}`} onClick={() => setChType(t)}>{t}</button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="챌린지 이름 (예: 인스타 끊기 7일)"
            value={chTitle} onChange={e => setChTitle(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input className="focus-desc-input" type="number" placeholder="목표 일수" style={{ flex: 1 }}
              value={chDays} onChange={e => setChDays(e.target.value)} />
            <span style={{ fontSize: 14, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>일 챌린지</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 14px' }}>
            매일 "오늘 완료" 버튼으로 진행 체크 → 완료 시 +30🪙
          </p>
          <button className="login-btn" onClick={handleAddChallenge}>추가</button>
        </Modal>
      )}
    </div>
  )
}
