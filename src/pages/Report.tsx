import { useState } from 'react'
import Card from '../components/Card'
import Modal from '../components/Modal'
import { useSeason } from '../hooks/useSeason'
import { useCoins } from '../hooks/useCoins'
import { useMoney } from '../hooks/useMoney'
import { useAuth } from '../lib/auth'
import type { MoneyType } from '../lib/types'

type SubTab = 'weekly' | 'money' | 'summary'

function ScoreBar({ score, color = 'var(--accent)' }: { score: number; color?: string }) {
  return (
    <div className="score-bar-bg">
      <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}
function scoreColor(s: number) {
  if (s >= 80) return 'var(--positive)'
  if (s >= 50) return 'var(--accent)'
  return 'var(--negative)'
}

export default function Report() {
  const { user, signOut } = useAuth()
  const { season } = useSeason()
  const { total: coins } = useCoins(season?.id)
  const { transactions, add: addTx, remove: removeTx, income, expense, selfRatio } = useMoney(season?.id)

  const [sub, setSub] = useState<SubTab>('weekly')
  const [showMoneyModal, setShowMoneyModal] = useState(false)

  // 가계부 폼
  const [txType, setTxType] = useState<MoneyType>('지출')
  const [txAmount, setTxAmount] = useState('')
  const [txCategory, setTxCategory] = useState('')
  const [txMemo, setTxMemo] = useState('')
  const [txSelf, setTxSelf] = useState(false)
  const [txImpulse, setTxImpulse] = useState(false)
  const [txSelfDev, setTxSelfDev] = useState(false)

  const coinValue = Math.round(coins * (season?.coin_rate ?? 100))
  const seasonDay = season
    ? Math.floor((Date.now() - new Date(season.start_date).getTime()) / 86400000) + 1
    : 0

  const saveTx = async () => {
    const amt = parseInt(txAmount)
    if (!txCategory.trim() || isNaN(amt) || amt <= 0) return
    await addTx({ type: txType, amount: amt, category: txCategory.trim(), memo: txMemo || undefined, isSelf: txSelf, isImpulse: txImpulse, isSelfDev: txSelfDev })
    setTxAmount(''); setTxCategory(''); setTxMemo('')
    setTxSelf(false); setTxImpulse(false); setTxSelfDev(false)
    setShowMoneyModal(false)
  }

  return (
    <div className="page">
      <div className="sub-tabs">
        {([['weekly','주간 통지표'],['money','가계부'],['summary','생활기록부']] as [SubTab,string][]).map(([t,label]) => (
          <button key={t} className={`sub-tab${sub === t ? ' active' : ''}`} onClick={() => setSub(t)}>{label}</button>
        ))}
      </div>

      {/* 주간 통지표 — 코인 데이터만 실데이터, 나머지는 추후 확장 */}
      {sub === 'weekly' && (
        <>
          <Card className="coin-card">
            <div className="coin-card-label">시즌 {season?.season_number ?? 1} 누적 적립금</div>
            <div className="coin-row">
              <span className="coin-count">🪙 {Math.round(coins).toLocaleString()}</span>
              <span className="coin-value">{coinValue.toLocaleString()}원</span>
            </div>
            <div className="coin-rate">1코인 = {season?.coin_rate ?? 100}원 · 시즌 {seasonDay}일째</div>
          </Card>
          <Card>
            <div className="section-title" style={{ marginBottom: 12 }}>코인 내역</div>
            <CoinHistory seasonId={season?.id} />
          </Card>
        </>
      )}

      {/* 가계부 */}
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
            {transactions.length === 0
              ? <p className="empty-msg">수입/지출을 기록해보세요!</p>
              : <ul className="transaction-list">
                  {transactions.map(t => (
                    <li key={t.id} className="transaction-item">
                      <div className="tx-left">
                        <span className="tx-date">{t.date.slice(5).replace('-','/')}</span>
                        <span className="tx-category">{t.category}</span>
                        {t.is_impulse && <span className="impulse-tag">충동</span>}
                        {t.is_self_spending && !t.is_impulse && <span className="self-tag">나</span>}
                        {t.is_self_development && <span className="self-tag" style={{ background: '#ede9fe', color: 'var(--accent)' }}>자기계발</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`tx-amount ${t.type === '수입' ? 'positive' : 'negative'}`}>
                          {t.type === '수입' ? '+' : '-'}{Number(t.amount).toLocaleString()}원
                        </span>
                        <button className="icon-btn" onClick={() => removeTx(t.id)}>🗑️</button>
                      </div>
                    </li>
                  ))}
                </ul>
            }
          </Card>
        </>
      )}

      {/* 학기말 생활기록부 */}
      {sub === 'summary' && (
        <>
          <Card className="summary-header-card">
            <div className="summary-title">시즌 {season?.season_number ?? 1} 생활기록부</div>
            <div className="summary-coins">총 적립 🪙{Math.round(coins)} = {coinValue.toLocaleString()}원</div>
            {season && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                {season.start_date} ~ {season.end_date}
              </div>
            )}
          </Card>
          <Card>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              시즌이 진행되면 루틴 졸업, 완독 도서, 하이라이트 등이 여기 쌓입니다.
            </p>
          </Card>
          <Card>
            <div className="section-title" style={{ marginBottom: 12 }}>계정</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.email}</div>
            <button className="text-btn" style={{ color: 'var(--negative)' }} onClick={signOut}>로그아웃</button>
          </Card>
        </>
      )}

      {showMoneyModal && (
        <Modal title="거래 추가" onClose={() => setShowMoneyModal(false)}>
          <div className="focus-cat-chips" style={{ marginBottom: 10 }}>
            {(['수입','지출'] as MoneyType[]).map(t => (
              <button key={t} className={`chip${txType === t ? ' active' : ''}`} onClick={() => setTxType(t)}>{t}</button>
            ))}
          </div>
          <input className="focus-desc-input" type="number" placeholder="금액 (원)" value={txAmount} onChange={e => setTxAmount(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="카테고리 (식비, 교통, 도서...)" value={txCategory} onChange={e => setTxCategory(e.target.value)} />
          <input className="focus-desc-input" style={{ marginTop: 8 }} placeholder="메모 (선택)" value={txMemo} onChange={e => setTxMemo(e.target.value)} />
          {txType === '지출' && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="checkbox-row"><input type="checkbox" checked={txSelf} onChange={e => setTxSelf(e.target.checked)} /><span>나를 위한 지출</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={txImpulse} onChange={e => setTxImpulse(e.target.checked)} /><span>충동 소비</span></label>
              <label className="checkbox-row"><input type="checkbox" checked={txSelfDev} onChange={e => { setTxSelfDev(e.target.checked); if (e.target.checked) setTxSelf(true) }} /><span>자기계발 지출 (1% 코인 적립)</span></label>
            </div>
          )}
          <button className="login-btn" style={{ marginTop: 16 }} onClick={saveTx}>저장</button>
        </Modal>
      )}
    </div>
  )
}

function CoinHistory({ seasonId }: { seasonId?: string }) {
  const { user } = useAuth()
  const [rows, setRows] = useState<{id:string;date:string;amount:number;source_type:string;note:string|null}[]>([])
  useState(() => {
    if (!user || !seasonId) return
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('coin_transactions').select('id,date,amount,source_type,note')
        .eq('user_id', user.id).eq('season_id', seasonId)
        .order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setRows(data ?? []))
    })
  })

  if (rows.length === 0) return <p className="empty-msg">아직 코인 내역이 없어요.</p>

  return (
    <ul className="transaction-list">
      {rows.map(r => (
        <li key={r.id} className="transaction-item">
          <div className="tx-left">
            <span className="tx-date">{r.date.slice(5).replace('-','/')}</span>
            <span className="tx-category">{r.note ?? r.source_type}</span>
          </div>
          <span className={`tx-amount ${r.amount >= 0 ? 'positive' : 'negative'}`}>
            {r.amount >= 0 ? '+' : ''}{r.amount}🪙
          </span>
        </li>
      ))}
    </ul>
  )
}
