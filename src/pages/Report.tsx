import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { useAuth } from '../lib/auth'
import { useSeason } from '../hooks/useSeason'
import { useCoins } from '../hooks/useCoins'
import { useMoney } from '../hooks/useMoney'
import { useTimeline } from '../hooks/useTimeline'
import type { MoneyType, TimelineItem } from '../lib/types'

type SubTab = 'calendar' | 'money' | 'summary'

const today = () => new Date().toISOString().slice(0, 10)

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getMonthDays(anchor: Date) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function timeLabel(at: string) {
  return new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function TimelineBlock({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <p className="empty-msg">이 날짜에는 기록이 없어요.</p>

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
              {item.coin ? <span className={`tl-coin${item.coin < 0 ? ' negative' : ''}`}>{item.coin > 0 ? '+' : ''}{item.coin}</span> : null}
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

export default function Report() {
  const { user, signOut } = useAuth()
  const { season } = useSeason()
  const { total: coins } = useCoins(season?.id)
  const { transactions, add: addTx, remove: removeTx, income, expense, selfRatio } = useMoney(season?.id)

  const [sub, setSub] = useState<SubTab>('calendar')
  const [selectedDate, setSelectedDate] = useState(today())
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())
  const { items: selectedItems } = useTimeline(selectedDate)
  const [showMoneyModal, setShowMoneyModal] = useState(false)

  const [txType, setTxType] = useState<MoneyType>('지출')
  const [txAmount, setTxAmount] = useState('')
  const [txCategory, setTxCategory] = useState('')
  const [txMemo, setTxMemo] = useState('')
  const [txSelf, setTxSelf] = useState(false)
  const [txImpulse, setTxImpulse] = useState(false)
  const [txSelfDev, setTxSelfDev] = useState(false)

  const monthDays = useMemo(() => getMonthDays(monthAnchor), [monthAnchor])
  const coinValue = Math.round(coins * (season?.coin_rate ?? 100))
  const monthTitle = monthAnchor.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  const saveTx = async () => {
    const amt = parseInt(txAmount)
    if (!txCategory.trim() || Number.isNaN(amt) || amt <= 0) return
    await addTx({
      type: txType,
      amount: amt,
      category: txCategory.trim(),
      memo: txMemo || undefined,
      isSelf: txSelf,
      isImpulse: txImpulse,
      isSelfDev: txSelfDev,
    })
    setTxAmount('')
    setTxCategory('')
    setTxMemo('')
    setTxSelf(false)
    setTxImpulse(false)
    setTxSelfDev(false)
    setShowMoneyModal(false)
  }

  return (
    <div className="page">
      <div className="sub-tabs">
        {([['calendar', '달력'], ['money', '가계부'], ['summary', '생활기록부']] as [SubTab, string][]).map(([tab, label]) => (
          <button key={tab} className={`sub-tab${sub === tab ? ' active' : ''}`} onClick={() => setSub(tab)}>{label}</button>
        ))}
      </div>

      {sub === 'calendar' && (
        <>
          <Card>
            <div className="calendar-header">
              <button className="icon-btn" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>‹</button>
              <span className="section-title">{monthTitle}</span>
              <button className="icon-btn" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>›</button>
            </div>
            <div className="calendar-weekdays">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="calendar-grid">
              {monthDays.map((date) => {
                const value = isoDate(date)
                const isCurrentMonth = date.getMonth() === monthAnchor.getMonth()
                return (
                  <button
                    key={value}
                    className={`calendar-day${value === selectedDate ? ' selected' : ''}${value === today() ? ' today' : ''}${!isCurrentMonth ? ' muted' : ''}`}
                    onClick={() => setSelectedDate(value)}
                  >
                    <span>{date.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card>
            <div className="section-header">
              <span className="section-title">{selectedDate} 기록</span>
              <span className="section-sub">{selectedItems.length}개</span>
            </div>
            <TimelineBlock items={selectedItems} />
          </Card>
        </>
      )}

      {sub === 'money' && (
        <>
          <Card>
            <div className="money-summary-row">
              <div className="money-stat">
                <span className="money-stat-label">수입</span>
                <span className="money-stat-num positive">+{income.toLocaleString()}원</span>
              </div>
              <div className="money-stat">
                <span className="money-stat-label">지출</span>
                <span className="money-stat-num negative">-{expense.toLocaleString()}원</span>
              </div>
            </div>
            {expense > 0 && (
              <div className="self-ratio-row">
                <span className="self-ratio-label">나에게 쓴 비율</span>
                <span className="self-ratio-num">{selfRatio}%</span>
              </div>
            )}
          </Card>
          <Card>
            <div className="section-header">
              <span className="section-title">내역</span>
              <button className="text-btn" onClick={() => setShowMoneyModal(true)}>+ 추가</button>
            </div>
            {transactions.length === 0 ? (
              <p className="empty-msg">수입/지출을 기록해보세요.</p>
            ) : (
              <ul className="transaction-list">
                {transactions.map((tx) => (
                  <li key={tx.id} className="transaction-item">
                    <div className="tx-left">
                      <span className="tx-date">{tx.date.slice(5).replace('-', '/')}</span>
                      <span className="tx-category">{tx.category}</span>
                      {tx.is_impulse && <span className="impulse-tag">충동</span>}
                      {tx.is_self_spending && !tx.is_impulse && <span className="self-tag">나</span>}
                      {tx.is_self_development && <span className="self-tag">자기계발</span>}
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${tx.type === '수입' ? 'positive' : 'negative'}`}>
                        {tx.type === '수입' ? '+' : '-'}{Number(tx.amount).toLocaleString()}원
                      </span>
                      <button className="icon-btn" onClick={() => removeTx(tx.id)}>삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {sub === 'summary' && (
        <>
          <Card className="summary-header-card">
            <div className="summary-title">시즌 {season?.season_number ?? 1} 생활기록부</div>
            <div className="summary-coins">총 적립 {Math.round(coins)}코인 = {coinValue.toLocaleString()}원</div>
            {season && <div className="section-sub" style={{ marginTop: 6 }}>{season.start_date} ~ {season.end_date}</div>}
          </Card>
          <Card>
            <div className="section-title" style={{ marginBottom: 12 }}>계정</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.email}</div>
            <button className="text-btn danger" onClick={signOut}>로그아웃</button>
          </Card>
        </>
      )}

      {showMoneyModal && (
        <Modal title="거래 추가" onClose={() => setShowMoneyModal(false)}>
          <div className="focus-cat-chips" style={{ marginBottom: 10 }}>
            {(['수입', '지출'] as MoneyType[]).map((type) => (
              <button key={type} className={`chip${txType === type ? ' active' : ''}`} onClick={() => setTxType(type)}>{type}</button>
            ))}
          </div>
          <input className="focus-desc-input" type="number" placeholder="금액 (원)" value={txAmount} onChange={(event) => setTxAmount(event.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="카테고리" value={txCategory} onChange={(event) => setTxCategory(event.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="메모 (선택)" value={txMemo} onChange={(event) => setTxMemo(event.target.value)} />
          {txType === '지출' && (
            <div className="stack">
              <label className="checkbox-row"><input type="checkbox" checked={txSelf} onChange={(event) => setTxSelf(event.target.checked)} /><span>나를 위한 지출</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={txImpulse} onChange={(event) => setTxImpulse(event.target.checked)} /><span>충동 소비</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={txSelfDev} onChange={(event) => { setTxSelfDev(event.target.checked); if (event.target.checked) setTxSelf(true) }} /><span>자기계발 지출 (1% 코인 적립)</span></label>
            </div>
          )}
          <button className="login-btn" style={{ marginTop: 16 }} onClick={saveTx}>저장</button>
        </Modal>
      )}
    </div>
  )
}
