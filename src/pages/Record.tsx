import { useState } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { useAuth } from '../lib/auth'
import { uploadPhoto } from '../lib/storage'
import { useSeason } from '../hooks/useSeason'
import { useWorry } from '../hooks/useWorry'
import { useImpulse } from '../hooks/useImpulse'
import { useFocusSessions } from '../hooks/useFocusSessions'
import { useDiary } from '../hooks/useDiary'
import { useBooks } from '../hooks/useBooks'
import { useExercise } from '../hooks/useExercise'
import { useTimeline } from '../hooks/useTimeline'
import type { SessionTag, TimelineItem } from '../lib/types'

type SubTab = 'timeline' | 'books' | 'exercise'
type ModalType = 'diary' | 'impulse' | 'focus' | 'book' | 'exercise' | 'focus-stop' | null

const today = () => new Date().toISOString().slice(0, 10)

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function timeLabel(at: string) {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function TimelineList({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (items.length === 0) return <p className="empty-msg">{empty}</p>

  return (
    <ul className="timeline-list">
      {items.map((item) => (
        <li key={item.id} className="timeline-item rich">
          <span className="tl-time">{timeLabel(item.at)}</span>
          <span className={`tl-dot ${item.type}`} />
          <div className="tl-body">
            <div className="tl-title-row">
              <span className="tl-icon">{item.icon}</span>
              <span className="tl-title">{item.title}</span>
              {item.coin ? (
                <span className={`tl-coin${item.coin < 0 ? ' negative' : ''}`}>
                  {item.coin > 0 ? '+' : ''}{item.coin}코인
                </span>
              ) : null}
            </div>
            {item.description && <p className="tl-desc">{item.description}</p>}
            {item.photos && item.photos.length > 0 && (
              <div className="photo-strip">
                {item.photos.map((photo) => <img key={photo} src={photo} alt="" />)}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Record() {
  const { user } = useAuth()
  const { season } = useSeason()
  const { todayCount, tap: tapWorry } = useWorry(season?.id)
  const { add: addImpulse } = useImpulse(season?.id)
  const {
    sessions,
    running,
    elapsed,
    start: startFocus,
    stop: stopFocus,
    todayTotal,
    todayProd,
  } = useFocusSessions(season?.id)
  const { add: addDiary } = useDiary()
  const { books, add: addBook, complete: completeBook, remove: removeBook, addNote } = useBooks(season?.id)
  const { logs: exerciseLogs, add: addExercise, remove: removeExercise } = useExercise(season?.id)
  const { items: timelineItems, refetch: refetchTimeline } = useTimeline(today())

  const [sub, setSub] = useState<SubTab>('timeline')
  const [modal, setModal] = useState<ModalType>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [diaryText, setDiaryText] = useState('')
  const [diaryPhoto, setDiaryPhoto] = useState<File | null>(null)
  const [impulseCat, setImpulseCat] = useState('')
  const [focusTag, setFocusTag] = useState<SessionTag>('생산')
  const [focusContent, setFocusContent] = useState('')
  const [focusRelated, setFocusRelated] = useState(false)
  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [bookCover, setBookCover] = useState<File | null>(null)
  const [exType, setExType] = useState('')
  const [exDur, setExDur] = useState('')
  const [exPhoto, setExPhoto] = useState<File | null>(null)
  const [noteBookId, setNoteBookId] = useState<string | null>(null)
  const [noteQuote, setNoteQuote] = useState('')
  const [noteReflection, setNoteReflection] = useState('')

  const prodRatio = todayTotal > 0 ? Math.round((todayProd / todayTotal) * 100) : 0

  const wrapSave = async (task: () => Promise<void>) => {
    setFormError(null)
    try {
      await task()
      await refetchTimeline()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '저장하지 못했어요.')
    }
  }

  return (
    <div className="page">
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
        <button className="quick-btn" onClick={() => wrapSave(tapWorry)}>
          <span>😟</span><span>걱정+1{todayCount > 0 ? ` (${todayCount})` : ''}</span>
        </button>
      </div>

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
            <span className="focus-stat-num">+{sessions.reduce((a, s) => a + Number(s.coin_earned), 0).toFixed(1)}코인</span>
            <span className="focus-stat-label">코인 적립</span>
          </div>
        </div>
      </Card>

      <div className="sub-tabs">
        {(['timeline', 'books', 'exercise'] as SubTab[]).map((tab) => (
          <button key={tab} className={`sub-tab${sub === tab ? ' active' : ''}`} onClick={() => setSub(tab)}>
            {{ timeline: '타임라인', books: '책장', exercise: '운동' }[tab]}
          </button>
        ))}
      </div>

      {sub === 'timeline' && (
        <Card>
          <TimelineList items={timelineItems} empty="오늘 기록이 없어요. 행동하면 여기에 자동으로 쌓입니다." />
        </Card>
      )}

      {sub === 'books' && (
        <Card>
          <div className="section-header">
            <span className="section-title">책장</span>
            <button className="text-btn" onClick={() => setModal('book')}>+ 추가</button>
          </div>
          {books.length === 0 ? (
            <p className="empty-msg">읽은 책을 추가해보세요.</p>
          ) : (
            <ul className="book-list">
              {books.map((book) => (
                <li key={book.id} className="book-item">
                  <div className="book-cover">
                    {book.cover_photo_url ? <img src={book.cover_photo_url} alt="" /> : book.title[0]}
                  </div>
                  <div className="book-info">
                    <div className="book-title">{book.title}</div>
                    {book.author && <div className="book-author">{book.author}</div>}
                  </div>
                  <div className="book-actions">
                    <span className={`book-status ${book.status}`}>{book.status === '완독' ? '완독' : '읽는 중'}</span>
                    {book.status === 'reading' && <button className="text-btn" onClick={() => wrapSave(() => completeBook(book.id))}>완독</button>}
                    <button className="text-btn" onClick={() => { setNoteBookId(book.id); setNoteQuote(''); setNoteReflection('') }}>기록</button>
                    <button className="icon-btn" onClick={() => removeBook(book.id)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {sub === 'exercise' && (
        <Card>
          <div className="section-header">
            <span className="section-title">운동기록</span>
            <button className="text-btn" onClick={() => setModal('exercise')}>+ 추가</button>
          </div>
          {exerciseLogs.length === 0 ? (
            <p className="empty-msg">운동 기록을 추가해보세요. 20분 이상이면 +5코인.</p>
          ) : (
            <ul className="exercise-list">
              {exerciseLogs.map((log) => (
                <li key={log.id} className="exercise-item">
                  {log.photo_url && <img className="exercise-thumb" src={log.photo_url} alt="" />}
                  <div className="ex-type">{log.type}</div>
                  <div className="ex-duration">{log.duration_minutes}분</div>
                  <div className="ex-date">{log.date}</div>
                  {log.coin_earned > 0 && <span className="positive small-coin">+{log.coin_earned}</span>}
                  <button className="icon-btn" onClick={() => removeExercise(log.id)}>삭제</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {modal === 'diary' && (
        <Modal title="다이어리" onClose={() => setModal(null)}>
          {formError && <p className="form-error">{formError}</p>}
          <textarea className="modal-textarea" placeholder="오늘 있었던 일, 느낀 것..." value={diaryText} onChange={(event) => setDiaryText(event.target.value)} autoFocus />
          <label className="file-picker">
            <span>{diaryPhoto ? diaryPhoto.name : '사진 추가 (선택)'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={(event) => setDiaryPhoto(event.target.files?.[0] ?? null)} />
          </label>
          <button className="login-btn" onClick={() => wrapSave(async () => {
            if (!user) return
            const photos = diaryPhoto ? [await uploadPhoto(diaryPhoto, user.id, 'diary')] : []
            await addDiary(diaryText, undefined, [], photos)
            setDiaryText('')
            setDiaryPhoto(null)
            setModal(null)
          })}>저장</button>
        </Modal>
      )}

      {modal === 'impulse' && (
        <Modal title="충동 기록 (-1코인)" onClose={() => setModal(null)}>
          <div className="focus-cat-chips" style={{ marginBottom: 12 }}>
            {['연락하고 싶음', '사고 싶음', 'SNS 보고 싶음', '기타'].map((category) => (
              <button key={category} className={`chip${impulseCat === category ? ' active' : ''}`} onClick={() => setImpulseCat(category)}>{category}</button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="직접 입력..." value={impulseCat} onChange={(event) => setImpulseCat(event.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={() => wrapSave(async () => {
            if (!impulseCat.trim()) return
            await addImpulse(impulseCat.trim())
            setImpulseCat('')
            setModal(null)
          })}>기록</button>
        </Modal>
      )}

      {modal === 'focus' && (
        <Modal title="몰입 타이머 시작" onClose={() => setModal(null)}>
          <div className="focus-cat-chips" style={{ marginBottom: 14 }}>
            {(['생산', '비생산'] as SessionTag[]).map((tag) => (
              <button key={tag} className={`chip${focusTag === tag ? ' active' : ''}`} onClick={() => setFocusTag(tag)}>{tag}</button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="무엇을 할 건가요? (선택)" value={focusContent} onChange={(event) => setFocusContent(event.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={() => { startFocus(focusTag); setModal(null) }}>시작</button>
        </Modal>
      )}

      {modal === 'focus-stop' && (
        <Modal title={`몰입 중 — ${fmt(elapsed)}`} onClose={() => setModal(null)}>
          <input className="focus-desc-input" placeholder="무엇을 했나요? (선택)" value={focusContent} onChange={(event) => setFocusContent(event.target.value)} />
          <label className="checkbox-row" style={{ margin: '10px 0 14px' }}>
            <input type="checkbox" checked={focusRelated} onChange={(event) => setFocusRelated(event.target.checked)} />
            <span>오늘 집중대상과 관련됨 (x1.5 코인)</span>
          </label>
          <button className="login-btn" onClick={() => wrapSave(async () => {
            await stopFocus(focusRelated, focusContent)
            setFocusContent('')
            setFocusRelated(false)
            setModal(null)
          })}>종료 & 저장</button>
        </Modal>
      )}

      {modal === 'book' && (
        <Modal title="책 추가" onClose={() => setModal(null)}>
          {formError && <p className="form-error">{formError}</p>}
          <input className="focus-desc-input" placeholder="책 제목" value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="저자 (선택)" value={bookAuthor} onChange={(event) => setBookAuthor(event.target.value)} />
          <label className="file-picker">
            <span>{bookCover ? bookCover.name : '표지 사진 추가 (선택)'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={(event) => setBookCover(event.target.files?.[0] ?? null)} />
          </label>
          <button className="login-btn" onClick={() => wrapSave(async () => {
            if (!user) return
            const coverUrl = bookCover ? await uploadPhoto(bookCover, user.id, 'books') : undefined
            await addBook(bookTitle, bookAuthor, coverUrl)
            setBookTitle('')
            setBookAuthor('')
            setBookCover(null)
            setModal(null)
          })}>추가</button>
        </Modal>
      )}

      {modal === 'exercise' && (
        <Modal title="운동 기록" onClose={() => setModal(null)}>
          <div className="focus-cat-chips" style={{ marginBottom: 10 }}>
            {['러닝', '헬스', '요가', '수영', '자전거'].map((type) => (
              <button key={type} className={`chip${exType === type ? ' active' : ''}`} onClick={() => setExType(type)}>{type}</button>
            ))}
          </div>
          <input className="focus-desc-input" placeholder="종류 직접 입력" value={exType} onChange={(event) => setExType(event.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} type="number" placeholder="시간 (분)" value={exDur} onChange={(event) => setExDur(event.target.value)} />
          <label className="file-picker">
            <span>{exPhoto ? exPhoto.name : '운동 사진 추가 (선택)'}</span>
            <input type="file" accept="image/*" capture="environment" onChange={(event) => setExPhoto(event.target.files?.[0] ?? null)} />
          </label>
          <button className="login-btn" onClick={() => wrapSave(async () => {
            if (!user) return
            const photoUrl = exPhoto ? await uploadPhoto(exPhoto, user.id, 'exercise') : undefined
            await addExercise(exType, parseInt(exDur), photoUrl)
            setExType('')
            setExDur('')
            setExPhoto(null)
            setModal(null)
          })}>저장</button>
        </Modal>
      )}

      {noteBookId && (
        <Modal title="구절 / 느낀점 기록 (+5코인)" onClose={() => setNoteBookId(null)}>
          <textarea className="modal-textarea" placeholder="인상 깊은 구절..." value={noteQuote} onChange={(event) => setNoteQuote(event.target.value)} />
          <textarea className="modal-textarea" style={{ marginTop: 8 }} placeholder="느낀점..." value={noteReflection} onChange={(event) => setNoteReflection(event.target.value)} />
          <button className="login-btn" style={{ marginTop: 12 }} onClick={() => wrapSave(async () => {
            await addNote(noteBookId, noteQuote, noteReflection)
            setNoteBookId(null)
          })}>저장</button>
        </Modal>
      )}
    </div>
  )
}
