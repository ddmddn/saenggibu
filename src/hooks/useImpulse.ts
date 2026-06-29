import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { ImpulseLog } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useImpulse(seasonId?: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ImpulseLog[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('impulse_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('datetime', `${today()}T00:00:00`)
      .order('datetime', { ascending: false })
    setLogs(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (category: string, note?: string) => {
    if (!user) return
    await supabase.from('impulse_logs').insert({
      user_id: user.id, datetime: new Date().toISOString(), category, note: note ?? null,
    })
    if (seasonId) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: -1, source_type: '충동', note: `충동 — ${category}`,
      })
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('impulse_logs').delete().eq('id', id)
    fetch()
  }

  return { logs, add, remove }
}
