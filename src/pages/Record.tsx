import { useState } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { useWorry } from '../hooks/useWorry'
import { useImpulse } from '../hooks/useImpulse'
import { useFocusSessions } from '../hooks/useFocusSessions'
import { useDiary } from '../hooks/useDiary'
import { useBooks } from '../hooks/useBooks'
import { useExercise } from '../hooks/useExercise'
import type { SessionTag } from '../lib/types'

type SubTab = 'timeline' | 'books' | 'exercise'
type ModalType = 'diary' | 'impulse' | 'focus' | 'book' | 'exercise' | 'focus-stop' | null

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Record() {
  const { season } = useSeason()
  const { todayCount, tap: tapWorry } = useWorry(season?.id)
  const { logs: impulseLogs, add: addImpulse } = useImpulse(season?.id)
  const { sessions, running, elapsed, activeTag, start: startFocus, stop: stopFocus, todayTotal, todayProd } = useFocusSessions(season?.id)
  const { entries: diaryEntries, add: addDiary, remove: removeDiary } = useDiary()
  const { books, add: addBook, complete: completeBook, remove: removeBook, addNote, getNotes } = useBooks(season?.id)
  const { logs: exerciseLogs, add: addExercise, remove: removeExercise } = useExercise(season?.id)

  const [sub, setSub] = useState<SubTab>('timeline')
  const [modal, setModal] = useState<ModalType>(null)

  // 다이어리 폼
  const [diaryText, setDiaryText] = useState('')
  // 충동 폼
  const [impulseCat, setImpulseCat] = useState('')
  // 몰입 타이머
  const [focusTag, setFocusTag] = useState<SessionTag>('생산')
  const [focusContent, setFocusContent] = useState('')
  const [focusRelated, setFocusRelated] = useState(false)
  // 책 폼
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  // 운동 폼
  const [exType, setExType] = useState('')
  const [exDur, setExDur] = useState('')
  // 책 노트
  const [noteBookId, setNoteBookId] = useState<string | null>(null)
  const [noteQuote, setNoteQuote] = useState('')
  const [noteReflection, setNoteReflection] = useState('')

  const prodRatio = todayTotal > 0 ? Math.round((todayProd / todayTotal) * 100) : 0

  // 타임라인: 오늘의 모든 기록 통합
  const timelineItems = [
    ...diaryEntries.map(e => ({
      id: e.id, time: new Date(e.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: 'diary', icon: '📝', text: e.text,
      onDelete: () => removeDiary(e.id),
    })),
    ...sessions.map(s => ({
      id: s.id, time: new Date(s.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: 'focus', icon: '⏱️',
      text: `${s.tag} · ${s.content_text || '기록 없음'} ${s.duration_minutes}분${s.coin_earned > 0 ? ` +${s.coin_earned}🪙` : ''}`,
      onDelete: undefined,
    })),
    ...impulseLogs.map(l => ({
      id: l.id, time: new Date(l.datetime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: 'impulse', icon: '⚠️', text: `충동 — ${l.category}`,
      onDelete: undefined,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time))

  const TYPE_COLOR: Record<string, string> = {
    diary: 'var(--text-muted)', focus: 'var(--accent)',
    impulse: 'var(--negative)', worry: 'var(--negative)',
  }

  return (
    <div className="page">
      {/* 빠른 기록 버튼 */}
      <div className="quick-btns">
        <button className="quick-btn" onClick={() => setModal('diary')}>
          <span>📝</span><span>다이어리</span>
        </button>
        <button className="quick-btn" onClick={() => running ? setModal('focus-stop') : setModal('focus')}>
          <span>{running ? '⏹️' : '⏱️'}</span>
          <span>{running ? fmt(elapsed) : '몰입'}</span>
        </button>
        <button className="quick-btn" onClick={() => setModal('impulse')}>
          <span>⚠️</span><span>충동</span>
        </button>
        <button className="quick-btn" onClick={tapWorry}>
          <span>😟</span><span>걱정+1{todayCount > 0 ? ` (${todayCount})` : ''}</span>
        </button>
      </div>

      {/* 오늘의 몰입 요약 */}
      <Card className="focus-summary-card">
        <div className="section-title">오늘의 몰입</div>
        <div className="focus-stat-row">
          <div className="focus-stat">
            <span className="focus-stat-num">{todayTotal}분</span>
            <span className="focus-stat-label">총 시간</span>
          </div>
          <div className="focus-divider" />
          <div className="focus-stat">
            <span className="focus-stat-num" style={{ color: 'var(--positive)' }}>{prodRatio}%</span>
            <span className="focus-stat-label">생산 비율</span>
          </div>
          <div className="focus-divider" />
          <div className="focus-stat">
            <span className="focus-stat-num">+{sessions.reduce((a, s) => a + Number(s.coin_earned), 0).toFixed(1)}🪙</span>
            <span className="focus-stat-label">코인 적립</span>
          </div>
        </div>
      </Card>

      {/* 서브탭 */}
      <div className="sub-tabs">
        {(['timeline', 'books', 'exercise'] as SubTab[]).map(t => (
          <button key={t} className={`sub-tab${sub === t ? ' active' : ''}`} onClick={() => setSub(t)}>
            {{ timeline: '타임라인', books: '책장', exercise: '운동' }[t]}
          </button>
        ))}
      </div>

      {/* 타임라인 */}
      {sub === 'timeline' && (
        <Card>
          {timelineItems.length === 0
            ? <p className="empty-msg">오늘 기록이 없어요. 위 버튼으로 기록을 시작해보세요!</p>
            : <ul className="timeline-list">
                {timelineItems.map(item => (
                  <li key={item.id} className="timeline-item">
                    <span className="tl-time">{item.time}</span>
                    <span className="tl-dot" style={{ background: TYPE_COLOR[item.type] }} />
                    <span className="tl-icon">{item.icon}</span>
                    <span className="tl-text" style={{ flex: 1 }}>{item.text}</span>
                    {item.onDelete && (
                      <button className="icon-btn" onClick={item.onDelete}>🗑️</button>
                    )}
                  </li>
                ))}
              </ul>
          }
        </Card>
      )}

      {/* 책장 */}
      {sub === 'books' && (
        <Card>
          <div className="section-header">
            <span className="section-title">책장</span>
            <button className="text-btn" onClick={() => setModal('book')}>+ 추가</button>
          </div>
          {books.length === 0
            ? <p className="empty-msg">읽은 책을 추가해보세요!</p>
            : <ul className="book-list">
                {books.map(b => (
                  <li key={b.id} className="book-item">
                    <div className="book-cover">{b.title[0]}</div>
                    <div className="book-info">
                      <div className="book-title">{b.title}</div>
                      {b.author && <div className="book-author">{b.author}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className={`book-status ${b.status}`}>
                        {b.status === '완독' ? '완독 ✓' : '읽는 중'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {b.status === 'reading' && (
                          <button className="text-btn" style={{ fontSize: 11 }} onClick={() => completeBook(b.id)}>완독</button>
                        )}
                        <button className="text-btn" style={{ fontSize: 11 }} onClick={() => { setNoteBookId(b.id); setNoteQuote(''); setNoteReflection('') }}>
                          기록
                        </button>
                        <button className="icon-btn" onClick={() => removeBook(b.id)}>🗑️</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
          }
        </Card>
      )}

      {/* 운동 */}
      {sub === 'exercise' && (
        <Card>
          <div className="section-header">
            <span className="section-title">운동기록</span>
            <button className="text-btn" onClick={() => setModal('exercise')}>+ 추가</button>
          </div>
          {exerciseLogs.length === 0
            ? <p className="empty-msg">운동 기록을 추가해보세요! (20분 이상 +5🪙)</p>
            : <ul className="exercise-list">
                {exerciseLogs.map(e => (
                  <li key={e.id} className="exercise-item">
                    <div className="ex-type">{e.type}</div>
                    <div className="ex-duration">{e.duration_minutes}분</div>
                    <div className="ex-date">{e.date}</div>
                    {e.coin_earned > 0 && <span style={{ fontSize: 12, color: 'var(--positive)' }}>+{e.coin_earned}🪙</span>}
                    <button className="icon-btn" onClick={() => removeExercise(e.id)}>🗑️</button>
                  </li>
                ))}
              </ul>
          }
        </Card>
      )}

      {/* ── 모달들 ── */}

      {modal === 'diary' && (
        <Modal title="다이어리" onClose={() => setModal(null)}>
          <textarea
            className="modal-textarea"
            placeholder="오늘 있었던 일, 느낀 것을 자유롭게..."
            value={diaryText}
            onChange={e => setDiaryText(e.target.value)}
            autoFocus
          />
          <button className="login-btn" onClick={async () => {
            await addDiary(diaryText)
            setDiaryText(''); setModal(null)
          }}>저장</button>
        </Modal>
      )}

      {modal === 'impulse' && (
        <Modal title="충동 기록 (-1🪙)" onClose={() => setModal(null)}>
          <div className="focus-cat-chips" style={{ marginBottom: 12 }}>
            {['연락하고 싶음', '사고 싶음', 'SNS 보고 싶음', '기타'].map(c => (
              <button key={c} className={`chip${impulseCat === c ? ' active' : ''}`} onClick={() => setImpulseCat(c)}>{c}</button>
            ))}
          </div>
          <input
            className="focus-desc-input"
            placeholder="직접 입력..."
            value={impulseCat}
            onChange={e => setImpulseCat(e.target.value)}
          />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={async () => {
            if (!impulseCat.trim()) return
            await addImpulse(impulseCat.trim())
            setImpulseCat(''); setModal(null)
          }}>기록</button>
        </Modal>
      )}

      {modal === 'focus' && (
        <Modal title="몰입 타이머 시작" onClose={() => setModal(null)}>
          <div className="section-title" style={{ marginBottom: 8 }}>태그</div>
          <div className="focus-cat-chips" style={{ marginBottom: 14 }}>
            {(['생산', '비생산'] as SessionTag[]).map(t => (
              <button key={t} className={`chip${focusTag === t ? ' active' : ''}`} onClick={() => setFocusTag(t)}>{t}</button>
            ))}
          </div>
          <input
            className="focus-desc-input"
            placeholder="무엇을 할 건가요? (선택)"
            value={focusContent}
            onChange={e => setFocusContent(e.target.value)}
          />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={() => {
            startFocus(focusTag)
            setModal(null)
          }}>시작</button>
        </Modal>
      )}

      {modal === 'focus-stop' && (
        <Modal title={`몰입 중 — ${fmt(elapsed)}`} onClose={() => setModal(null)}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            {activeTag === '생산' ? '🟢 생산 세션' : '🔴 비생산 세션'}
          </div>
          <input
            className="focus-desc-input"
            placeholder="무엇을 했나요? (선택)"
            value={focusContent}
            onChange={e => setFocusContent(e.target.value)}
          />
          <label className="checkbox-row" style={{ margin: '10px 0 14px' }}>
            <input type="checkbox" checked={focusRelated} onChange={e => setFocusRelated(e.target.checked)} />
            <span>오늘 집중대상과 관련됨 (×1.5 코인)</span>
          </label>
          <button className="login-btn" onClick={async () => {
            await stopFocus(focusRelated, focusContent)
            setFocusContent(''); setFocusRelated(false); setModal(null)
          }}>종료 & 저장</button>
        </Modal>
      )}

      {modal === 'book' && (
        <Modal title="책 추가" onClose={() => setModal(null)}>
          <input className="focus-desc-input" placeholder="책 제목" value={bookTitle} onChange={e => setBookTitle(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="저자 (선택)" value={bookAuthor} onChange={e => setBookAuthor(e.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={async () => {
            await addBook(bookTitle, bookAuthor)
            setBookTitle(''); setBookAuthor(''); setModal(null)
          }}>추가</button>
        </Modal>
      )}

      {modal === 'exercise' && (
        <Modal title="운동 기록" onClose={() => setModal(null)}>
          <div className="focus-cat-chips" style={{ marginBottom: 10 }}>
            {['러닝', '헬스', '요가', '수영', '자전거'].map(t => (
              <button key={t} className={`chip${exType === t ? ' active' : ''}`} onClick={() => setExType(t)}>{t}</button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="종류 직접 입력" value={exType} onChange={e => setExType(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} type="number" placeholder="시간 (분)" value={exDur} onChange={e => setExDur(e.target.value)} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 12px' }}>20분 이상 완료 시 +5🪙</p>
          <button className="login-btn" onClick={async () => {
            await addExercise(exType, parseInt(exDur))
            setExType(''); setExDur(''); setModal(null)
          }}>저장</button>
        </Modal>
      )}

      {noteBookId && (
        <Modal title="구절 / 느낀점 기록 (+5🪙)" onClose={() => setNoteBookId(null)}>
          <textarea className="modal-textarea" placeholder="인상 깊은 구절..." value={noteQuote} onChange={e => setNoteQuote(e.target.value)} />
          <textarea className="modal-textarea" style={{ marginTop: 8 }} placeholder="느낀점..." value={noteReflection} onChange={e => setNoteReflection(e.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={async () => {
            await addNote(noteBookId, noteQuote, noteReflection)
            setNoteBookId(null)
          }}>저장</button>
        </Modal>
      )}
    </div>
  )
}
