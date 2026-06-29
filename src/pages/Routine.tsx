import { useRef, useState } from 'react'
import Card from '../components/Card'
import ProgressBar from '../components/ProgressBar'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { useRoutines } from '../hooks/useRoutines'
import { useChallenges } from '../hooks/useChallenges'
import { useAuth } from '../lib/auth'
import { uploadPhoto } from '../lib/storage'
import type { ChallengeType, Routine } from '../lib/types'

const CHALLENGE_TYPES: ChallengeType[] = ['거리두기', '연결', '소비대기', '기타']
const ROUTINE_IDEAS = [
  '물 한 컵 마시기',
  '책 10분 읽기',
  '방 3분 정리',
  '스쿼트 20개',
  '영어 단어 5개',
  '오늘 지출 확인',
  '감정 한 줄 쓰기',
  '잠들기 전 폰 멀리 두기',
]

function move<T>(items: T[], from: number, to: number) {
  const copy = [...items]
  const [picked] = copy.splice(from, 1)
  copy.splice(to, 0, picked)
  return copy
}

export default function Routine() {
  const { user } = useAuth()
  const { season } = useSeason()
  const {
    routines,
    logs,
    loading,
    error,
    completeRoutine,
    uncompleteRoutine,
    lockLog,
    addRoutine,
    reorderRoutines,
    removeRoutine,
  } = useRoutines(season?.id)
  const {
    active,
    completed,
    failed,
    add: addChallenge,
    checkDay,
    fail,
    promoteToRoutine,
    remove: removeChallenge,
  } = useChallenges(season?.id)

  const [showAddRoutine, setShowAddRoutine] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [routineError, setRoutineError] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<Routine[] | null>(null)
  const [sortMode, setSortMode] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const longPressRef = useRef<number | null>(null)

  const [completeTarget, setCompleteTarget] = useState<Routine | null>(null)
  const [routineNote, setRoutineNote] = useState('')
  const [routinePhoto, setRoutinePhoto] = useState<File | null>(null)
  const [savingRoutineLog, setSavingRoutineLog] = useState(false)

  const [showChallengeModal, setShowChallengeModal] = useState(false)
  const [chType, setChType] = useState<ChallengeType>('거리두기')
  const [chTitle, setChTitle] = useState('')
  const [chDays, setChDays] = useState('7')

  const ordered = localOrder ?? routines
  const seasonDay = season
    ? Math.floor((Date.now() - new Date(season.start_date).getTime()) / 86400000) + 1
    : 0

  const startLongPress = () => {
    longPressRef.current = window.setTimeout(() => {
      setSortMode(true)
      setLocalOrder(routines)
    }, 450)
  }

  const cancelLongPress = () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current)
  }

  const saveOrder = async (items = ordered) => {
    setRoutineError(null)
    try {
      await reorderRoutines(items.map((routine) => routine.id))
      setLocalOrder(null)
      setSortMode(false)
    } catch (err) {
      setRoutineError(err instanceof Error ? err.message : '순서를 저장하지 못했어요.')
    }
  }

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length) return
    const next = move(ordered, from, to)
    setLocalOrder(next)
  }

  const handleAddRoutine = async (title = newTitle) => {
    if (!title.trim()) return
    setRoutineError(null)
    try {
      await addRoutine(title)
      setNewTitle('')
      setShowAddRoutine(false)
    } catch (err) {
      setRoutineError(err instanceof Error ? err.message : '루틴을 추가하지 못했어요.')
    }
  }

  const handleComplete = async () => {
    if (!completeTarget || !user) return
    setSavingRoutineLog(true)
    setRoutineError(null)
    try {
      const photos = routinePhoto ? [await uploadPhoto(routinePhoto, user.id, 'routine-logs')] : []
      await completeRoutine(completeTarget.id, { note: routineNote, photos })
      setCompleteTarget(null)
      setRoutineNote('')
      setRoutinePhoto(null)
    } catch (err) {
      setRoutineError(err instanceof Error ? err.message : '루틴 완료를 저장하지 못했어요.')
    } finally {
      setSavingRoutineLog(false)
    }
  }

  const handleAddChallenge = async () => {
    const days = parseInt(chDays)
    if (!chTitle.trim() || Number.isNaN(days) || days < 1) return
    await addChallenge({ type: chType, title: chTitle.trim(), durationDays: days })
    setChTitle('')
    setChDays('7')
    setShowChallengeModal(false)
  }

  if (loading) {
    return <div className="page"><p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p></div>
  }

  return (
    <div className="page">
      {season && (
        <Card>
          <div className="section-header">
            <span className="section-title">시즌 {season.season_number} 진행률</span>
            <span className="section-sub">{seasonDay}/180일</span>
          </div>
          <ProgressBar value={(seasonDay / 180) * 100} height={8} />
        </Card>
      )}

      <Card>
        <div className="section-header">
          <span className="section-title">오늘의 루틴</span>
          <span className="section-sub">{routines.filter((r) => logs[r.id]?.completed).length}/{routines.length} 완료</span>
        </div>

        {(error || routineError) && <p className="form-error">{error ?? routineError}</p>}

        {routines.length === 0 ? (
          <p className="empty-msg">아래 버튼으로 첫 루틴을 추가해보세요.</p>
        ) : (
          <>
            {sortMode && (
              <div className="sort-mode-bar">
                <span>순서 조정 중</span>
                <button className="text-btn" onClick={() => saveOrder()}>저장</button>
                <button className="text-btn" onClick={() => { setSortMode(false); setLocalOrder(null) }}>취소</button>
              </div>
            )}

            <ul className="routine-chain">
              {ordered.map((routine, index) => {
                const log = logs[routine.id]
                const done = log?.completed ?? false
                const locked = log?.locked ?? false

                return (
                  <li
                    key={routine.id}
                    className={`chain-item${done ? ' done' : ''}${sortMode ? ' sorting' : ''}`}
                    draggable={sortMode}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null || dragIndex === index) return
                      handleMove(dragIndex, index)
                      setDragIndex(null)
                    }}
                    onPointerDown={startLongPress}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                  >
                    <div className="chain-line-wrap">
                      <div className={`chain-dot${done ? ' filled' : ''}`} />
                      {index < ordered.length - 1 && <div className="chain-line" />}
                    </div>
                    <div className="chain-content">
                      <div className="chain-title-row">
                        <button
                          className="routine-check-button"
                          onClick={() => {
                            if (sortMode || locked) return
                            if (done) {
                              uncompleteRoutine(routine.id).catch((err) => setRoutineError(err.message))
                            } else {
                              setCompleteTarget(routine)
                            }
                          }}
                        >
                          {done ? '✓' : ''}
                        </button>
                        <span className="chain-title">{routine.title}</span>
                        <span className="chain-streak">🔥{routine.streak_current}일</span>
                      </div>

                      {log?.note && <div className="routine-note-preview">{log.note}</div>}
                      {log?.photos && log.photos.length > 0 && (
                        <div className="photo-strip">
                          {log.photos.map((photo) => <img key={photo} src={photo} alt="" />)}
                        </div>
                      )}

                      {sortMode ? (
                        <div className="sort-controls">
                          <button className="text-btn" onClick={() => handleMove(index, index - 1)}>위로</button>
                          <button className="text-btn" onClick={() => handleMove(index, index + 1)}>아래로</button>
                          <button
                            className="text-btn danger"
                            onClick={() => {
                              if (confirm('이 루틴을 삭제할까요?')) removeRoutine(routine.id).catch((err) => setRoutineError(err.message))
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      ) : (
                        <>
                          {done && !locked && (
                            <button className="lock-btn" onClick={() => lockLog(routine.id).catch((err) => setRoutineError(err.message))}>확정하기</button>
                          )}
                          {locked && <span className="locked-tag">확정됨</span>}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {!showAddRoutine ? (
          <button className="add-routine-btn" onClick={() => setShowAddRoutine(true)}>+ 루틴 추가하기</button>
        ) : (
          <div className="add-form">
            <input
              className="focus-desc-input"
              placeholder="루틴 이름..."
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAddRoutine()}
              autoFocus
            />
            <div className="add-form-btns">
              <button className="login-btn" onClick={() => handleAddRoutine()}>추가</button>
              <button className="text-btn" onClick={() => { setShowAddRoutine(false); setNewTitle('') }}>취소</button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="section-header">
          <span className="section-title">루틴 아이디어</span>
          <span className="section-sub">눌러서 바로 추가</span>
        </div>
        <div className="idea-grid">
          {ROUTINE_IDEAS.map((idea) => (
            <button key={idea} className="idea-chip" onClick={() => handleAddRoutine(idea)}>
              {idea}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-header">
          <span className="section-title">챌린지</span>
          <button className="text-btn" onClick={() => setShowChallengeModal(true)}>+ 추가</button>
        </div>

        {active.length === 0 && completed.length === 0 && failed.length === 0 ? (
          <p className="empty-msg">챌린지를 추가해보세요. 완료 시 +30코인</p>
        ) : (
          <>
            {active.map((challenge) => {
              const daysLeft = challenge.duration_days - challenge.progress_count
              return (
                <div key={challenge.id} className="challenge-item">
                  <div className="section-header" style={{ marginBottom: 6 }}>
                    <div>
                      <span className="challenge-title" style={{ marginBottom: 0 }}>{challenge.title}</span>
                      <span className="challenge-badge" style={{ marginLeft: 6 }}>{challenge.type}</span>
                    </div>
                    <button className="icon-btn" onClick={() => removeChallenge(challenge.id)}>삭제</button>
                  </div>
                  <div className="challenge-progress-row">
                    <ProgressBar value={(challenge.progress_count / challenge.duration_days) * 100} color="var(--positive)" />
                    <span className="challenge-count">{challenge.progress_count}/{challenge.duration_days}일</span>
                  </div>
                  {daysLeft <= 3 && daysLeft > 0 && (
                    <div className="promote-hint">{daysLeft}일 남음</div>
                  )}
                  <div className="row-actions">
                    <button className="login-btn compact" onClick={() => checkDay(challenge.id)}>오늘 완료</button>
                    <button className="text-btn danger" onClick={() => fail(challenge.id)}>포기</button>
                  </div>
                </div>
              )
            })}

            {completed.map((challenge) => (
              <div key={challenge.id} className="challenge-item muted">
                <div className="section-header">
                  <span className="challenge-title">완료: {challenge.title}</span>
                  {!challenge.promoted_to_routine && season && (
                    <button className="text-btn" onClick={() => promoteToRoutine(challenge.id, season.id)}>루틴으로 승격</button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </Card>

      {completeTarget && (
        <Modal title={`${completeTarget.title} 완료`} onClose={() => setCompleteTarget(null)}>
          <textarea
            className="modal-textarea"
            placeholder="메모를 남길까요? (선택)"
            value={routineNote}
            onChange={(event) => setRoutineNote(event.target.value)}
          />
          <label className="file-picker">
            <span>{routinePhoto ? routinePhoto.name : '사진 추가 (선택)'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setRoutinePhoto(event.target.files?.[0] ?? null)}
            />
          </label>
          <button className="login-btn" disabled={savingRoutineLog} onClick={handleComplete}>
            {savingRoutineLog ? '저장 중...' : '완료 저장'}
          </button>
        </Modal>
      )}

      {showChallengeModal && (
        <Modal title="챌린지 추가" onClose={() => setShowChallengeModal(false)}>
          <div className="focus-cat-chips" style={{ marginBottom: 14 }}>
            {CHALLENGE_TYPES.map((type) => (
              <button key={type} className={`chip${chType === type ? ' active' : ''}`} onClick={() => setChType(type)}>
                {type}
              </button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="챌린지 이름" value={chTitle} onChange={(event) => setChTitle(event.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} type="number" placeholder="목표 일수" value={chDays} onChange={(event) => setChDays(event.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={handleAddChallenge}>추가</button>
        </Modal>
      )}
    </div>
  )
}
