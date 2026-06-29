import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const today = () => new Date().toISOString().slice(0, 10)

export function useWorry(seasonId?: string) {
  const { user } = useAuth()
  const [todayCount, setTodayCount] = useState(0)

  const fetch = useCallback(async () => {
    if (!user) return
    const start = `${today()}T00:00:00`
    const end   = `${today()}T23:59:59`
    const { count } = await supabase
      .from('worry_counter')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('datetime', start)
      .lte('datetime', end)
    setTodayCount(count ?? 0)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const tap = async () => {
    if (!user) return
    await supabase.from('worry_counter').insert({ user_id: user.id, datetime: new Date().toISOString() })
    if (seasonId) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: -0.2, source_type: '걱정', note: '걱정 탭',
      })
    }
    fetch()
  }

  return { todayCount, tap }
}
