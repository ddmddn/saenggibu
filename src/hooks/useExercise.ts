import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { ExerciseLog } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useExercise(seasonId?: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ExerciseLog[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20)
    setLogs(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (type: string, durationMin: number, photoUrl?: string) => {
    if (!user || !type.trim() || durationMin < 1) return
    const coin = durationMin >= 20 ? 5 : 0
    const { data: log, error } = await supabase.from('exercise_logs').insert({
      user_id: user.id, date: today(), type: type.trim(),
      duration_minutes: durationMin, photo_url: photoUrl ?? null, coin_earned: coin,
    }).select().single()
    if (error) throw error

    if (coin > 0 && seasonId && log) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: coin, source_type: '운동', source_id: log.id,
        note: `${type} ${durationMin}분`,
      })
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('exercise_logs').delete().eq('id', id)
    fetch()
  }

  return { logs, add, remove }
}
