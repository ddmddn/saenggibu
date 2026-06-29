import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { MoneyTransaction, MoneyType } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useMoney(seasonId?: string) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('money_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50)
    setTransactions(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (params: {
    type: MoneyType; amount: number; category: string; memo?: string
    isSelf?: boolean; isImpulse?: boolean; isSelfDev?: boolean
  }) => {
    if (!user || params.amount <= 0) return
    await supabase.from('money_transactions').insert({
      user_id: user.id, date: today(),
      type: params.type, amount: params.amount,
      category: params.category, memo: params.memo ?? null,
      is_self_spending: params.isSelf ?? false,
      is_impulse: params.isImpulse ?? false,
      is_self_development: params.isSelfDev ?? false,
    })
    // 자기계발 지출 시 코인 1% 적립
    if (params.type === '지출' && params.isSelfDev && seasonId) {
      const coinAmt = Math.floor(params.amount / 100) * 0.01 * 100 // 지출액의 1%
      if (coinAmt >= 0.01) {
        await supabase.from('coin_transactions').insert({
          user_id: user.id, season_id: seasonId, date: today(),
          amount: coinAmt, source_type: '가계부',
          note: `자기계발 지출 1% — ${params.category}`,
        })
      }
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('money_transactions').delete().eq('id', id)
    fetch()
  }

  const income  = transactions.filter(t => t.type === '수입').reduce((a, t) => a + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === '지출').reduce((a, t) => a + Number(t.amount), 0)
  const selfExp = transactions.filter(t => t.type === '지출' && t.is_self_spending).reduce((a, t) => a + Number(t.amount), 0)
  const selfRatio = expense > 0 ? Math.round((selfExp / expense) * 100) : 0

  return { transactions, add, remove, income, expense, selfRatio }
}
